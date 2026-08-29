# Backup e restore

RPO ≤ 24 h, RTO ≤ 4 h (`docs/infra/RPO-RTO.md`). Backup que nunca foi restaurado é hipótese.

## O que é fonte da verdade

| Dado | Primário | Cópia |
|---|---|---|
| Postgres | Neon PITR (branch `main`) | `pg_dump` semanal (Actions + artefato 30 dias) |
| Objetos de mídia | R2 (durável) + versionamento no bucket de produção | Sem réplica S3 no MVP (custo) |
| Código | Git | — |
| Cache / logs / métricas | reconstruível | não backupar |

## Neon PITR

No plano gratuito a janela de PITR é curta (confira no console; costuma ser ~24 h). Isso **casa** com o RPO de 24 h só se o plano não for rebaixado. Upgrade para Scale amplia a janela — é o primeiro gasto se o RPO precisar ser menor.

Restore pontual: Console Neon → Branch → Restore / PITR → novo branch → apontar `DATABASE_URL` de emergência **ou** promover depois de validar. Nunca PITR direto em `main` sem branch de teste.

Use o **endpoint direto** (`DATABASE_URL_DIRECT`), não o pooler, para dump e restore.

## Dump lógico

```bash
# nunca imprime a URL
DATABASE_URL="$DATABASE_URL_DIRECT" pnpm db:backup
# ou
DATABASE_URL="$DATABASE_URL_DIRECT" bash scripts/backup/database-export.sh
bash scripts/backup/verify-dump.sh artifacts/backups/albora-….dump
```

CI: `.github/workflows/backup.yml` — domingo 03:00 UTC dumpa **staging**; produção só com `workflow_dispatch` + Environment `production`.

## Restore

```bash
RESTORE_DATABASE_URL="$URL_DO_BRANCH_DE_TESTE" \
CONFIRM_RESTORE="<host-exato-da-url>" \
pnpm db:restore artifacts/backups/albora-….dump
```

`CONFIRM_RESTORE` tem de ser o hostname, não "sim". Restore em produção só depois de restore bem-sucedido num branch Neon de teste e com o anfitrião avisado.

`--clean --if-exists --single-transaction`: ou aplica inteiro ou não aplica. Objetos R2 **não** voltam com o dump.

## Teste mensal (obrigatório)

1. Dump de staging (ou artefato da semana)
2. Branch Neon novo a partir de `main` (vazio ou cópia)
3. Restore
4. `SELECT count(*) FROM uploads` vs. origem (ordem de grandeza)
5. Smoke: `bash scripts/ci/smoke-test.sh`
6. Anotar duração em `docs/infra/RPO-RTO.md` (última medição)

## R2

Versionamento no bucket de produção (`docs/infra/R2-BUCKETS.md`). Recuperar objeto apagado = restaurar versão, não dump. Job de retenção D365 precisa de permissão de bypass de object lock — se o backup "sumir" foto no dia 365, é o job, não desastre.
