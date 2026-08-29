#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-${SMOKE_BASE_URL:-http://localhost:3000}}"

live="$(curl -fsS "${BASE}/api/health/live")"
echo "${live}" | grep -q '"status":"alive"'

health="$(curl -fsS "${BASE}/api/health")"
echo "${health}" | grep -q '"status":"alive"'

echo "smoke ok: ${BASE}"
