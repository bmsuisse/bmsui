#!/usr/bin/env bash
# Idempotent: downloads a local Meilisearch binary into ./bin/meilisearch if
# it isn't already there. Safe to run on every `playwright test` invocation
# (see packages/datagrid/playwright.config.ts's webServer entry for this) —
# a machine that already has the binary just no-ops.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$SERVER_DIR/bin"
BIN_PATH="$BIN_DIR/meilisearch"

if [ -x "$BIN_PATH" ]; then
  echo "meilisearch already present at $BIN_PATH, skipping download"
  exit 0
fi

mkdir -p "$BIN_DIR"

echo "downloading meilisearch into $BIN_DIR ..."
# Official install script; downloads a `./meilisearch` binary into the
# current directory for the host OS/arch.
(cd "$BIN_DIR" && curl -sL https://install.meilisearch.com | sh)

chmod +x "$BIN_PATH"
echo "meilisearch installed at $BIN_PATH"
"$BIN_PATH" --version
