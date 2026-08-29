# Deploy

Fluxo: `feature` → PR → `stable` (staging) → tag `v*` em `main` (produção, com approval no Environment `production`).

## Staging (automático)

1. Push em `stable` dispara `.github/workflows/deploy-staging.yml`
2. `pnpm --filter @albora/web cf:deploy` (OpenNext + Cloudflare Workers)
3. Smoke: `scripts/ci/smoke-test.sh $STAGING_URL` (se `vars.STAGING_URL` existir)

Secrets: prefixo `STAGING_` + `CLOUDFLARE_API_TOKEN`. Ver `docs/infra/AMBIENTES.md`.

## Produção (tag + approval)

1. CI verde em `stable`
2. Tag `v1.2.3` em `main`
3. Environment `production` exige reviewer
4. `.github/workflows/deploy-production.yml`
5. Smoke + `GET /api/health/ready`

Não deployar sexta/sábado 18h–23h (caminho crítico de evento).

## GitHub Environments

Criar `staging` e `production` em Settings → Environments. Production: required reviewers. Variables: `STAGING_URL`, `PROD_URL`, `STAGING_ROOT_DOMAIN`, `PROD_ROOT_DOMAIN`.
