# Segurança de migration

> Referenciado por [`../runbooks/deploy-quebrado.md`](../runbooks/deploy-quebrado.md)
> ("Migration aplicada sem código compatível?") e por
> [`../infra/ROLLBACK.md`](../infra/ROLLBACK.md).

## A regra, sem exceção

**Migrations são forward-only em produção.** Nunca reescreva uma migration já
aplicada — escreva outra. Isso está no `CLAUDE.md` do repositório, é um dos
guards que rodam bloqueantes desde o primeiro commit (junto com isolamento
entre eventos), e este documento explica o porquê e como aplicar isso na
prática, não repete a regra.

Por quê: uma migration já aplicada em produção já rodou contra dado real.
Editá-la não desfaz o que já rodou — só faz o arquivo no repositório mentir
sobre o que o banco de produção realmente tem. Um ambiente novo (ou um dev
rodando `pnpm db:up` do zero) aplicaria a versão editada e teria um schema
diferente do de produção, sem nenhum sintoma até um bug aparecer só lá.

## Como as migrations rodam hoje

- Arquivos SQL numerados sequencialmente em `packages/db/migrations/`
  (`0001_...sql` até `0055_...sql` nesta revisão), cada um um passo forward
  único.
- Tabela `_migrations (nome text PRIMARY KEY, aplicada_em timestamptz)`
  rastreia o que já rodou — `tools/db/semear-dev.mjs` é a referência de como
  o runner funciona: lê o diretório em ordem, pula o que já está em
  `_migrations`, aplica o resto **cada um dentro de uma transação própria**
  (`BEGIN` → roda o arquivo → `INSERT INTO _migrations` → `COMMIT`).
- **Não existe hoje um script `migrate:prod` dedicado.** `deploy-producao.md`
  já documentava isso: "se script existir; senão psql + arquivos em
  migrations/". Até esse script existir, aplicar em produção é manual:
  conectar com `DATABASE_URL_DIRECT` (nunca o pooler — mesmo motivo de
  `backup-falhou.md`: DDL no pooler é instável) e rodar, em ordem, só os
  arquivos que a tabela `_migrations` de produção ainda não tem.
- **Numeração é serial e reservada por stream** — não escolha o próximo
  número sem checar `docs/superpowers/specs/2026-09-04-paralelismo-contrato.md`;
  na revisão deste documento, 0059–0069 já estão reservados para outros
  sub-projetos ativos.

## Escrever uma migration segura forward-only

Cada migration precisa ser seura por si — não existe "e se der errado eu
edito depois".

1. **Idempotência defensiva.** `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF
   NOT EXISTS`, `CREATE INDEX CONCURRENTLY IF NOT EXISTS` quando aplicável —
   protege contra reaplicação parcial se a transação falhar no meio (embora o
   runner só marque `_migrations` após sucesso, um DBA rodando manualmente
   pode reexecutar por engano).
2. **Expand antes de contract.** Adicionar coluna nova como nullable +
   backfill numa migration; só tornar `NOT NULL` numa migration **seguinte**,
   depois que o backfill já rodou e o código novo já escreve o campo. Nunca
   `ALTER TABLE ... ADD COLUMN ... NOT NULL` sem default numa tabela com
   linha — trava a tabela e quebra o path de upload de sábado se rodar na
   hora errada.
3. **Compatível com o código antigo por um ciclo.** Entre o deploy da
   migration e o deploy do código que a usa, existe uma janela — e depois de
   um rollback de código (`docs/infra/ROLLBACK.md`), o código **antigo** roda
   de novo contra o schema **novo**. Por isso: nunca remova uma coluna ou
   renomeie algo que o código em produção agora mesmo ainda lê. Remover é
   sempre a migration N+2, depois que o código que a lia já saiu do ar.
4. **RLS nunca fica sem política no meio do caminho.** Toda tabela nova com
   dado de evento entra na mesma migration com `event_id uuid not null
   references events(id)`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`,
   `ALTER TABLE ... FORCE ROW LEVEL SECURITY` e a política com o `NULLIF`
   (`event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`) —
   as quatro linhas na mesma migration, nunca uma tabela criada numa
   migration e protegida só na próxima. Ver `CLAUDE.md` §"Isolamento entre
   eventos".
5. **Migration não é lugar de dado de teste.** `INSERT`/`UPDATE` em massa
   contra produção é job (`tools/jobs/`), não migration — migration muda
   estrutura; job muda dado, roda com throttle e é observável.

## Testar antes de produção

```bash
pnpm db:up                 # sobe Postgres local (docker-compose.yml)
node tools/db/semear-dev.mjs   # aplica as pendentes + evento de exemplo
```

Rodar a suíte de isolamento (`pnpm test:isolamento`) depois de qualquer
migration que toque RLS ou `event_id` — é o guard bloqueante que existe
desde o primeiro commit por causa exatamente disso.

## "Desfazer" uma migration

Não existe `down.sql`. Se uma migration aplicada em produção precisa ser
revertida:

1. Escreva a **próxima** migration numerada que desfaz o efeito (dropar a
   coluna que a anterior criou, por exemplo) — nunca edite nem apague o
   arquivo já aplicado.
2. Se o efeito não for reversível sem perder dado (ex.: a coluna já recebeu
   escrita real), pare e trate como incidente de dado, não de schema — ver
   `docs/infra/BACKUP-RESTORE.md`.
3. Isso é ortogonal a rollback de **código** (`docs/infra/ROLLBACK.md`):
   `wrangler rollback` volta o Worker; uma migration ruim só volta com outra
   migration.

## Checklist antes de mergear uma migration

- [ ] Numeração é a próxima livre (checar o contrato de paralelismo)
- [ ] `IF NOT EXISTS` / guards de idempotência onde faz sentido
- [ ] Se cria tabela com dado de evento: `event_id` + RLS + `FORCE` + política
      `NULLIF`, tudo na mesma migration
- [ ] Se altera coluna existente: expand/contract, não um `ALTER` só que
      quebra o código em produção agora
- [ ] Testado local com `tools/db/semear-dev.mjs` + `pnpm test:isolamento`
- [ ] Nenhum `INSERT`/`UPDATE` de dado real — isso é job, não migration
