#!/usr/bin/env bash
set -euo pipefail

dump="${1:-}"
if [[ -z "$dump" || ! -f "$dump" ]]; then
  echo "verify-dump: informe um arquivo .dump" >&2
  exit 1
fi

pg_restore --list "$dump" >/dev/null
echo "verify-dump: ok ${dump}"
