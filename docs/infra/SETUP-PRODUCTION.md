# Setup production

Produção = tag `v*` em `main` + Neon `main` + bucket `albora-production` + Worker prod + domínio (`albora.social.br` quando o DNS estiver no ar).

## GitHub

1. Environment `production` com **required reviewers**
2. Secrets `PROD_*` (nunca os mesmos valores de staging)
3. Variables `PROD_URL`, `PROD_ROOT_DOMAIN`
4. Tag dispara `.github/workflows/deploy-production.yml`

## Neon e R2

- PITR ligado; connection pooler no Worker; direto para dump/migration
- Bucket com versionamento / object lock (`docs/infra/R2-BUCKETS.md`)
- Custom domain + SSL na Cloudflare (`docs/runbooks/ssl-expirando.md`)

## Ritual do primeiro evento

1. Portão de carga: `CARGA_PERFIL=gate` contra um ambiente **parecido** com prod (staging com R2 real)
2. Dump + PITR conferidos (`docs/infra/BACKUP-RESTORE.md`)
3. Não deployar na janela sexta/sábado 18h–23h
4. Smoke ready + um upload humano (QR impresso)

Rollback: `docs/infra/ROLLBACK.md`. Custo: `docs/infra/COST.md`.
