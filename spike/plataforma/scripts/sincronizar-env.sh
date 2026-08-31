#!/usr/bin/env bash
# Copia do .env da raiz apenas o que o spike precisa.
#
# Dois destinos porque são dois runtimes: `next dev` lê .env.local,
# `wrangler dev` e o preview do OpenNext leem .dev.vars. Ambos gitignorados.
set -euo pipefail

aqui="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
raiz="$(cd "$aqui/../.." && pwd)"
origem="$raiz/.env"

[ -f "$origem" ] || { echo "✗ $origem não existe"; exit 1; }

chaves="R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET"

faltando=""
tmp="$(mktemp)"
for k in $chaves; do
  v="$(grep -E "^${k}=" "$origem" | head -1 | cut -d= -f2- || true)"
  v="${v%\"}"; v="${v#\"}"
  if [ -z "$v" ]; then faltando="$faltando $k"; fi
  printf '%s=%s\n' "$k" "$v" >> "$tmp"
done

cp "$tmp" "$aqui/.dev.vars"
cp "$tmp" "$aqui/.env.local"
rm -f "$tmp"
chmod 600 "$aqui/.dev.vars" "$aqui/.env.local"

echo "✓ .dev.vars e .env.local escritos"
if [ -n "$faltando" ]; then
  echo "⚠ vazias no .env da raiz:$faltando"
  echo "  As provas 5 e 6 vão devolver 503 config.missing até serem preenchidas."
fi
