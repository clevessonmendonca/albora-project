# RUNBOOK: Banco indisponível

## Sintoma

`/api/health/ready` → 503 `database.indisponivel` ou `database.url_ausente`. Uploads falham no confirm.

## Diagnóstico

1. Neon console: compute suspenso? quota?
2. Secret `DATABASE_URL` / `PROD_DATABASE_URL` intacto (não logar a string)
3. Pool: free tier = poucas conexões; saturação aparece como timeout

## Resolução imediata

1. Acordar o compute no Neon (primeiro request pode levar segundos)
2. Conferir connection string pooled (`-pooler`)
3. Se restore: backup Neon → branch pontual (RPO ≤ 24h)

## Prevenção

Monitorar storage/compute. Upgrade para Scale antes de 80% do free tier.
