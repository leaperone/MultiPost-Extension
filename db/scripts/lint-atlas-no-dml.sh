#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d db/atlas/migrations ]; then
  echo "db/atlas/migrations missing; skipping DML lint"
  exit 0
fi

offenders=""
files_list="$(mktemp)"
trap 'rm -f "$files_list"' EXIT HUP INT TERM

find db/atlas/migrations -type f -name '*.sql' -print > "$files_list"

while IFS= read -r file; do
  [ -n "$file" ] || continue
  stripped="$(sed -E 's/--.*$//g' "$file" | perl -0pe 's#/\\*.*?\\*/##gs')"
  if printf '%s\n' "$stripped" | grep -Eiq '(^|;)[[:space:]]*(INSERT|UPDATE|DELETE|TRUNCATE)[[:space:]]'; then
    offenders="${offenders}${file}
"
  fi
done < "$files_list"

if [ -n "$offenders" ]; then
  echo "DML detected in Atlas migrations. Move data changes to scripts/data-migrations/."
  printf '%s' "$offenders"
  exit 1
fi

echo "OK: no DML found in Atlas migrations"
