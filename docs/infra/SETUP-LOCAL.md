# Setup local

## Pré-requisitos

- Node 20.9+ (ver `.nvmrc`) e pnpm 10 (`packageManager` no `package.json`)
- Docker, se for usar Postgres local em vez de Neon `dev`
- Conta R2 de desenvolvimento (PUT real; sem isso o presign falha — é um resultado legítimo)

## Passos

```bash
git clone <repo>
cd albora-project
pnpm install
cp .env.example .env.local
```

Preencha `.env.local` **sem** copiar secrets de staging/prod. Mínimo: `DATABASE_URL`, `SESSION_SECRET` (≥32 chars), `APP_ROOT_DOMAIN=localhost:3000`. R2 se for exercitar upload.

```bash
pnpm db:up          # Postgres local na 55432
# DATABASE_URL=postgres://albora:albora@localhost:55432/albora
pnpm db:semear      # festa-demo
pnpm dev
```

Abrir `http://localhost:3000`. Evento de seed: slug `festa-demo` (ver `tools/db`).

## Checagens

```bash
pnpm test
pnpm guards
curl -s http://localhost:3000/api/health/live
CARGA_PERFIL=fumaca pnpm carga
```

## Regras que o setup local não relaxa

- EXIF sai no cliente mesmo em dev
- Sem hex hardcodado; tokens do evento
- `.env.local` gitignored; nunca colar secret em issue/PR
