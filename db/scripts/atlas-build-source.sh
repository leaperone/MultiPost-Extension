#!/usr/bin/env bash
# Rebuild db/atlas/_source.sql from drizzle-kit export.
# Foreign keys are moved to the end so referenced unique/PK indexes exist
# before they are referenced when Atlas parses the composed source.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

DRIZZLE_KIT="${DRIZZLE_KIT:-./node_modules/.bin/drizzle-kit}"
TMP_EXPORT="$(mktemp)"

"$DRIZZLE_KIT" export --config=db/drizzle.config.ts > "$TMP_EXPORT"

python3 - "$TMP_EXPORT" "db/atlas/_unmanaged.sql" "db/atlas/_source.sql" <<'PY'
import sys

export_path, unmanaged_path, out_path = sys.argv[1:4]

with open(export_path) as f:
    lines = f.readlines()

fk = []
other = []
for line in lines:
    if line.startswith("ALTER TABLE") and "ADD CONSTRAINT" in line and "FOREIGN KEY" in line:
        fk.append(line)
    else:
        other.append(line)

with open(out_path, "w") as f:
    f.writelines(other)
    if fk:
        f.write("\n-- Foreign keys (moved here so referenced unique/PK indexes exist first)\n")
        f.writelines(fk)
    try:
        with open(unmanaged_path) as unmanaged:
            content = unmanaged.read().strip()
            if content:
                f.write("\n-- Unmanaged objects\n")
                f.write(content + "\n")
    except FileNotFoundError:
        pass
PY

rm -f "$TMP_EXPORT"
echo "Built db/atlas/_source.sql"
