# Setup staging

Staging = branch git `stable` + Neon branch `staging` + bucket `albora-staging` + Worker de staging.

## GitHub

1. Environment `staging` (Settings → Environments)
2. Secrets com prefixo `STAGING_` listados em `docs/infra/AMBIENTES.md`
3. `CLOUDFLARE_API_TOKEN` com permissão de deploy do Worker
4. Variable `STAGING_URL` (https do Worker/Pages) para o smoke

## Neon e R2

- Branch `staging` a partir de `main` (`docs/infra/NEON-BRANCHES.md`)
- Bucket `albora-staging`, CORS com a origem de staging (`docs/infra/R2-BUCKETS.md`)
- `STAGING_DATABASE_URL` = **pooler** para o app; dump usa endpoint direto se precisar

## Como sobe

Push/merge em `stable` → `.github/workflows/deploy-staging.yml` → smoke `scripts/ci/smoke-test.sh`.

Validar upload de ponta a ponta com `CARGA_PERFIL=fumaca` e `CARGA_CONFIRMO_ALVO=<host>`.
