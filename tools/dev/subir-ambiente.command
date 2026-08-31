#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use
cd /Users/clevesson-mendonca/orca/workspaces/albora-project/merganser

echo "=== Albora: subindo ambiente local ==="

start_with_docker() {
  echo "Tentando Docker Desktop..."
  open /Applications/Docker.app >/dev/null 2>&1 || true
  for i in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      echo "Docker OK"
      pnpm db:up
      # Prefer compose default URL for seed
      unset DATABASE_URL_DEV || true
      export DATABASE_URL_DEV="${DATABASE_URL_DEV:-postgres://albora:albora@127.0.0.1:55432/albora}"
      # Clear Neon override if present
      cat > .env.local <<'EOF'
DATABASE_URL=postgres://albora:albora@127.0.0.1:55432/albora
DATABASE_URL_DIRECT=postgres://albora:albora@127.0.0.1:55432/albora
DATABASE_URL_DEV=postgres://albora:albora@127.0.0.1:55432/albora
EOF
      pnpm db:semear
      echo "DB semeado. Convidado: http://localhost:3000/e/festa-demo"
      exec pnpm dev
    fi
    sleep 2
  done
  return 1
}

start_with_brew_pg() {
  echo "Docker indisponível — usando PostgreSQL do Homebrew (porta 5432)"
  export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
  brew services start postgresql@15 || pg_ctl -D /opt/homebrew/var/postgresql@15 -l /tmp/albora-pg.log start || true
  for i in $(seq 1 30); do
    pg_isready -h 127.0.0.1 -p 5432 && break
    sleep 1
  done
  pg_isready -h 127.0.0.1 -p 5432

  psql -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'albora') THEN
    CREATE ROLE albora LOGIN PASSWORD 'albora' CREATEDB;
  ELSE
    ALTER ROLE albora WITH LOGIN PASSWORD 'albora' CREATEDB;
  END IF;
END $$;
SQL
  if ! psql -h 127.0.0.1 -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='albora'" | grep -q 1; then
    createdb -h 127.0.0.1 -O albora albora
  fi

  cat > .env.local <<'EOF'
DATABASE_URL=postgres://albora:albora@127.0.0.1:5432/albora
DATABASE_URL_DIRECT=postgres://albora:albora@127.0.0.1:5432/albora
DATABASE_URL_DEV=postgres://albora:albora@127.0.0.1:5432/albora
EOF
  export DATABASE_URL_DEV=postgres://albora:albora@127.0.0.1:5432/albora
  pnpm db:semear
  echo "DB semeado. Convidado: http://localhost:3000/e/festa-demo"
  exec pnpm dev
}

if start_with_docker; then
  exit 0
fi
start_with_brew_pg
