# RUNBOOK: Deploy quebrado

## Sintoma

Após Actions verde (ou tag), health falha ou a UI quebra; anfitrião reporta logo depois de um push.

## Severidade

SEV1 em produção na janela de festa. SEV2 fora.

## Diagnóstico

1. Qual SHA está no Worker (Cloudflare dashboard → deployments)
2. `GET /api/health/live` vs `ready`
3. Migration aplicada sem código compatível? `docs/db/MIGRATION-SAFETY.md`
4. Secret errado no Environment (`STAGING_` vs `PROD_`)

## Resolução imediata

1. Actions → **Rollback production** → SHA/tag anterior (`docs/infra/ROLLBACK.md`)
2. Migration já aplicada **não** volta com rollback de código — restore Neon só se o schema novo for irrecuperável
3. Smoke: `bash scripts/ci/smoke-test.sh "$PROD_URL"`

## Prevenção

Não deployar sexta/sábado 18h–23h. Staging com o mesmo caminho de upload (R2 real).
