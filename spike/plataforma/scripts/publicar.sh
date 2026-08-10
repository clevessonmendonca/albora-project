#!/usr/bin/env bash
# Publica o spike e injeta os segredos do .env da raiz.
#
# Os segredos vivem no Cloudflare, não no wrangler.jsonc — que é versionado.
# `wrangler secret put` lê do stdin justamente para o valor não aparecer na
# lista de processos nem no histórico do shell.
set -euo pipefail

aqui="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
raiz="$(cd "$aqui/../.." && pwd)"
cd "$aqui"

maior="$(node -p 'process.versions.node.split(".")[0]')"
[ "$maior" -ge 20 ] || { echo "✗ Node $maior; precisa de 20+. Rode: nvm use"; exit 1; }

# `wrangler whoami` sai 0 mesmo deslogado — o código de saída não serve de guard.
if npx wrangler whoami 2>&1 | grep -q "not authenticated"; then
  echo "✗ wrangler não autenticado. Rode: npx wrangler login"
  exit 1
fi

le() {
  local v
  v="$(grep -E "^$1=" "$raiz/.env" | head -1 | cut -d= -f2-)"
  v="${v%\"}"; v="${v#\"}"
  [ -n "$v" ] || { echo "✗ $1 vazia no .env da raiz"; exit 1; }
  printf '%s' "$v"
}

echo "→ build"
npx opennextjs-cloudflare build

echo "→ deploy"
npx opennextjs-cloudflare deploy

echo "→ segredos"
for k in R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  le "$k" | npx wrangler secret put "$k" >/dev/null
  echo "  $k ✓"
done

echo
echo "Falta um passo manual, e sem ele a prova 5 falha no celular:"
echo "  R2 → bucket → Settings → CORS Policy → acrescentar a origem do deploy"
echo "  (o https://...workers.dev impresso acima)"
