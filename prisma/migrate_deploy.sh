#!/bin/sh
set -eu

: "${MULTIPOST_DATABASE_URL:?MULTIPOST_DATABASE_URL is required}"

ATLAS_VERSION="${ATLAS_VERSION:-1.2.2}"
ATLAS_ARTIFACT="atlas-community-linux-amd64-v${ATLAS_VERSION}"
ATLAS_SHA256="a38e34e886cd0b9d2d625fe0046fed107785b1562bd2d07dbd96fadfc57dec62"
ATLAS_URL="https://release.ariga.io/atlas/${ATLAS_ARTIFACT}"

case "$(uname -s)/$(uname -m)" in
  Linux/x86_64 | Linux/amd64)
    ;;
  *)
    echo "Unsupported platform for pinned Atlas download: $(uname -s)/$(uname -m)" >&2
    exit 1
    ;;
esac

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

curl -fsSL "$ATLAS_URL" -o "$tmp_dir/atlas"
printf '%s  %s\n' "$ATLAS_SHA256" "$tmp_dir/atlas" | sha256sum -c -
chmod +x "$tmp_dir/atlas"

PATH="$tmp_dir:$PATH"
export PATH

atlas migrate apply --env production --config file://db/atlas/atlas.hcl
