#!/usr/bin/env bash
# Start an isolated Policy Desk stack for verification: local Supabase (Docker),
# FastAPI on $VERIFY_API_PORT, Vite in production mode on $VERIFY_WEB_PORT.
# Never touches the hosted Supabase in apps/backend/.env: every setting is overridden by env vars.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
RUN="$ROOT/.verify/run"
API_PORT=${VERIFY_API_PORT:-8100}
WEB_PORT=${VERIFY_WEB_PORT:-5273}
WEB_ORIGIN="http://127.0.0.1:$WEB_PORT"

if [[ -f "$RUN/api.pid" || -f "$RUN/web.pid" ]]; then
  echo "A verify stack is already recorded in $RUN. Run doctor.sh, or down.sh first." >&2
  exit 1
fi
for port in "$API_PORT" "$WEB_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use by something this script did not start. Set VERIFY_API_PORT / VERIFY_WEB_PORT." >&2
    exit 1
  fi
done
mkdir -p "$RUN" "$ROOT/.verify/evidence"

cd "$ROOT/apps/backend"
if ! supabase --workdir . status >/dev/null 2>&1; then
  echo "Starting local Supabase (applies supabase/migrations on first start)…"
  supabase --workdir . start
  touch "$RUN/started-supabase"
fi
if [[ "${1:-}" == "--reset" ]]; then
  echo "Resetting local database and re-applying migrations…"
  supabase --workdir . db reset --local
fi
eval "$(supabase --workdir . status -o env | sed -n 's/^\([A-Z_]*\)=/SB_\1=/p')"
: "${SB_API_URL:?supabase status did not report API_URL}"

POLICYDESK_SUPABASE_URL="$SB_API_URL" \
POLICYDESK_SUPABASE_ANON_KEY="$SB_ANON_KEY" \
POLICYDESK_SUPABASE_SERVICE_ROLE_KEY="$SB_SERVICE_ROLE_KEY" \
POLICYDESK_JOIN_CODE_ENCRYPTION_KEY="policydesk-verify-local-only" \
POLICYDESK_CORS_ORIGINS="[\"$WEB_ORIGIN\"]" \
POLICYDESK_APP_BASE_URL="$WEB_ORIGIN" \
  nohup .venv/bin/python -m uvicorn policydesk_api.main:app --app-dir src \
    --host 127.0.0.1 --port "$API_PORT" >"$RUN/api.log" 2>&1 &
echo $! >"$RUN/api.pid"

cd "$ROOT/apps/client"
VITE_DATA_MODE=production \
VITE_API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1" \
  nohup node_modules/.bin/vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort >"$RUN/web.log" 2>&1 &
echo $! >"$RUN/web.pid"

cat >"$RUN/env" <<EOF
VERIFY_API_URL=http://127.0.0.1:$API_PORT/api/v1
VERIFY_WEB_URL=$WEB_ORIGIN
VERIFY_SUPABASE_URL=$SB_API_URL
EOF

# Ready = usable: Supabase Auth is healthy, the API enforces auth, and Vite serves the app shell.
for _ in $(seq 1 60); do
  auth=$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $SB_ANON_KEY" "$SB_API_URL/auth/v1/health" || true)
  api=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$API_PORT/api/v1/auth/me" || true)
  web=$(curl -s -o /dev/null -w '%{http_code}' "$WEB_ORIGIN/login" || true)
  if [[ "$auth" == "200" && "$api" == "401" && "$web" == "200" ]]; then
    echo "READY api=http://127.0.0.1:$API_PORT web=$WEB_ORIGIN supabase=$SB_API_URL"
    exit 0
  fi
  sleep 1
done
echo "Stack did not become ready (auth=$auth api=$api web=$web). Logs: $RUN/api.log $RUN/web.log" >&2
exit 1
