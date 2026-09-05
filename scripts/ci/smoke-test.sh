#!/usr/bin/env bash
# Smoke pós-deploy — health checks reais (liveness + banco).
#
# Referenciado por docs/runbooks/deploy-quebrado.md e usado por
# .github/workflows/deploy.yml logo após publicar homol/prod.
# Complementa tools/deploy/smoke.mjs (que cobre as páginas públicas,
# landing/admin/telão): este script cobre só /api/health/{live,ready} —
# o que prova que o processo subiu e que o banco responde.
#
# Uso:
#   bash scripts/ci/smoke-test.sh https://stable.albora.app
#
# Não cria sessão, não escreve nada, não precisa de secret.

set -euo pipefail

alvo="${1:-${ALVO:-}}"
alvo="${alvo%/}"

if [[ -z "$alvo" ]]; then
  echo "uso: bash scripts/ci/smoke-test.sh <https://host>" >&2
  exit 1
fi

falhas=0

checar() {
  local caminho="$1"
  local rotulo="$2"
  local url="${alvo}${caminho}"
  local corpo status

  if ! corpo="$(curl -sS --max-time 10 -w '\n%{http_code}' "$url")"; then
    echo "✗ ${rotulo}  ${url}  → curl falhou (rede ou timeout)" >&2
    falhas=$((falhas + 1))
    return
  fi

  status="${corpo##*$'\n'}"
  corpo="${corpo%$'\n'*}"

  if [[ "$status" != "200" ]]; then
    echo "✗ ${rotulo}  ${url}  → ${status} (esperado 200)" >&2
    echo "  corpo: ${corpo}" >&2
    falhas=$((falhas + 1))
  else
    echo "✓ ${rotulo}  ${status}"
  fi
}

checar "/api/health/live" "health live"
checar "/api/health/ready" "health ready (banco)"

if [[ "$falhas" -gt 0 ]]; then
  echo "" >&2
  echo "smoke-test: ${falhas} checagem(ns) falharam" >&2
  exit 1
fi

echo ""
echo "smoke-test OK — página pública e caminho de upload exigem tools/deploy/smoke.mjs e teste manual."
