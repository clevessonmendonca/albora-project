#!/usr/bin/env bash
set -euo pipefail

# Dump lógico do Postgres. A connection string nunca é impressa.
# Uso: DATABASE_URL=... bash scripts/backup/database-export.sh [arquivo.dump]
# Neon: prefira o endpoint direto (não o pooler) — pg_dump precisa de sessão.

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "database-export: DATABASE_URL ausente" >&2
  exit 1
fi

saida="${1:-}"
if [[ -z "$saida" ]]; then
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p artifacts/backups
  saida="artifacts/backups/albora-${stamp}.dump"
fi

mkdir -p "$(dirname "$saida")"

pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$saida"

bytes="$(wc -c < "$saida" | tr -d ' ')"
if [[ "$bytes" -lt 1024 ]]; then
  echo "database-export: dump pequeno demais (${bytes} bytes) — abortando" >&2
  rm -f "$saida"
  exit 1
fi

echo "database-export: ok ${saida} (${bytes} bytes)"
