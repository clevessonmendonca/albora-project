#!/usr/bin/env bash
set -euo pipefail

# Restaura um dump custom gerado por database-export.sh.
# Recusa o alvo até CONFIRM_RESTORE ser o host exato da URL (não "sim").
#
# Uso:
#   RESTORE_DATABASE_URL=postgres://... \
#   CONFIRM_RESTORE=ep-xxx.region.aws.neon.tech \
#   bash scripts/backup/database-restore.sh artifacts/backups/albora-....dump

dump="${1:-}"
if [[ -z "$dump" || ! -f "$dump" ]]; then
  echo "database-restore: informe um arquivo .dump existente" >&2
  exit 1
fi

if [[ -z "${RESTORE_DATABASE_URL:-}" ]]; then
  echo "database-restore: RESTORE_DATABASE_URL ausente" >&2
  exit 1
fi

host="$(
  node --input-type=module -e 'console.log(new URL(process.env.RESTORE_DATABASE_URL).hostname)'
)"

if [[ "${CONFIRM_RESTORE:-}" != "$host" ]]; then
  echo "database-restore: alvo não confirmado." >&2
  echo "Exporte CONFIRM_RESTORE com o host exato da URL (nunca a senha)." >&2
  exit 1
fi

pg_restore \
  --dbname="$RESTORE_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --single-transaction \
  "$dump"

echo "database-restore: ok"
