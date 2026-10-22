#!/usr/bin/env bash
# Read-only: is the recorded verify stack worth driving? Exits non-zero on the first problem.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
RUN="$ROOT/.verify/run"
fail() { echo "DOCTOR FAIL: $*" >&2; exit 1; }

[[ -f "$RUN/env" ]] || fail "no stack recorded in $RUN; run up.sh"
# shellcheck disable=SC1091
source "$RUN/env"
api_port=${VERIFY_API_URL#http://127.0.0.1:}; api_port=${api_port%%/*}
web_port=${VERIFY_WEB_URL##*:}

for name in api web; do
  pid=$(cat "$RUN/$name.pid" 2>/dev/null) || fail "$name.pid missing"
  kill -0 "$pid" 2>/dev/null || fail "$name process $pid is not running (see $RUN/$name.log)"
done
[[ "$(lsof -nP -t -iTCP:"$api_port" -sTCP:LISTEN 2>/dev/null)" == *"$(cat "$RUN/api.pid")"* ]] || fail "port $api_port is not owned by our API process"
[[ "$(lsof -nP -t -iTCP:"$web_port" -sTCP:LISTEN 2>/dev/null)" == *"$(cat "$RUN/web.pid")"* ]] || fail "port $web_port is not owned by our Vite process"

cd "$ROOT/apps/backend"
status=$(supabase --workdir . status -o env 2>/dev/null) || fail "local Supabase is not running"
[[ "$status" == *"API_URL=\"$VERIFY_SUPABASE_URL\""* ]] || fail "local Supabase URL changed since up.sh"

expected=$(ls supabase/migrations/*.sql | wc -l | tr -d ' ')
applied=$(docker exec supabase_db_policies-client psql -U postgres -tAc 'select count(*) from supabase_migrations.schema_migrations' 2>/dev/null) || fail "cannot query local database"
[[ "$applied" == "$expected" ]] || fail "local DB has $applied/$expected migrations; run 'supabase --workdir apps/backend migration up --local'"

[[ "$(curl -s -o /dev/null -w '%{http_code}' "$VERIFY_API_URL/auth/me")" == "401" ]] || fail "API at $VERIFY_API_URL is not answering auth routes"
# Vite inlines import.meta.env into served modules, so this reads the client's real runtime config.
module=$(curl -s "$VERIFY_WEB_URL/src/stores/runtime-mode-store.ts") || fail "Vite at $VERIFY_WEB_URL is not serving"
[[ "$module" == *'"VITE_DATA_MODE": "production"'* ]] || fail "client is not in production data mode (mock mode would bypass the API)"
[[ "$module" == *"\"VITE_API_BASE_URL\": \"$VERIFY_API_URL\""* ]] || fail "client is not pointed at $VERIFY_API_URL"

echo "DOCTOR OK api=$VERIFY_API_URL web=$VERIFY_WEB_URL supabase=$VERIFY_SUPABASE_URL migrations=$applied/$expected"
