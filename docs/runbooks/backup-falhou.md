# RUNBOOK: Backup falhou

## Sintoma

Workflow **Backup do banco** vermelho; dump < 1 KB abortado pelo script; artefato ausente no domingo.

## Severidade

SEV2 — RPO de 24 h passa a depender **só** do PITR Neon. Se o Neon também falhar, perda > 24 h.

## Diagnóstico

1. Actions → Backup do banco → log (não deve conter a URL)
2. `STAGING_DATABASE_URL` / `PROD_DATABASE_URL` ainda válidos? Rotação recente?
3. Endpoint é o **direto**, não o pooler? `pg_dump` no pooler falha ou corrompe
4. Neon suspenso no horário do cron (03:00 UTC)

## Resolução imediata

1. Acordar o Neon, rerodar `workflow_dispatch`
2. Dump local: `DATABASE_URL="$DATABASE_URL_DIRECT" pnpm db:backup`
3. Confirmar PITR ainda dentro da janela do plano

## Prevenção

Secret de backup = connection string direta. Teste mensal de restore (`docs/infra/BACKUP-RESTORE.md`).
