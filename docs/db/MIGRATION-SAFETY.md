# Migration safety

Migrations em `packages/db/migrations/` são **forward-only** em produção (CLAUDE.md).

## Antes de aplicar

1. Testar local (`pnpm db:up` + aplicar o SQL)
2. Aplicar em staging e exercitar o fluxo afetado
3. Backup Neon (ponto de restauração) se a migration for destrutiva
4. Deploy de código **compatível com o schema antigo e o novo** quando houver rename/drop

## Seguras (em geral)

- `ADD COLUMN` nullable ou com default
- `CREATE INDEX CONCURRENTLY`
- `CREATE TABLE`

## Perigosas

- `DROP COLUMN` / `DROP TABLE` — só depois que o código parou de ler
- `RENAME` — exige janela coordenada
- `ALTER TYPE` em tabela grande — lock

## Rollback de schema

Não há down migration. Recuperação = restore do branch/backup Neon para o ponto anterior, ou migration de compensação. Nunca reescrever arquivo já aplicado.
