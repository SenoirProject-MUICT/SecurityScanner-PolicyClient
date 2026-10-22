#!/usr/bin/env bash
# Tear down only what up.sh started. Evidence in .verify/evidence/ is kept.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
RUN="$ROOT/.verify/run"
[[ -d "$RUN" ]] || { echo "Nothing to tear down."; exit 0; }

for name in web api; do
  if [[ -f "$RUN/$name.pid" ]]; then
    pid=$(cat "$RUN/$name.pid")
    kill "$pid" 2>/dev/null && echo "Stopped $name ($pid)"
  fi
done

if [[ -f "$RUN/started-supabase" ]]; then
  (cd "$ROOT/apps/backend" && supabase --workdir . stop --no-backup) && echo "Stopped local Supabase and dropped its data"
else
  echo "Local Supabase was already running before up.sh; left it running."
fi

rm -rf "$RUN"
echo "Evidence kept in $ROOT/.verify/evidence/"
