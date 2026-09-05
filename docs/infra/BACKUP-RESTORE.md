# Backup e restore do banco

> Referenciado por [`RPO-RTO.md`](./RPO-RTO.md) (cenário "banco corrompido /
> drop acidental") e [`../runbooks/backup-falhou.md`](../runbooks/backup-falhou.md).

Dois mecanismos independentes, não um substituindo o outro.

## 1. Neon PITR / branching — primeira linha, mais rápido

O Neon mantém *point-in-time recovery* nativo. Para a maioria dos incidentes
(drop acidental, migration ruim, dado corrompido por bug) isto é mais rápido
que restaurar um dump:

1. Console Neon → projeto → **Branches** → **Create branch** → escolher
   "a specific time in the past" (timestamp antes do incidente).
2. Isso cria um branch novo, isolado, com os dados daquele instante — **não
   mexe no branch de produção atual**. Confirmar os dados no branch novo
   antes de decidir o próximo passo.
3. Duas saídas a partir daqui:
   - **Promover o branch** a `primary` (Neon console → branch → "Set as
     primary") se o incidente exige voltar todo o banco para aquele ponto.
   - **Copiar só as linhas afetadas** do branch de recuperação para o
     primary via `psql`/`pg_dump --table` se o incidente for localizado
     (ex.: um evento específico), preservando o resto do banco intacto.
4. Apontar `DATABASE_URL`/`DATABASE_URL_DIRECT` (`wrangler secret put`) para
   o branch promovido só se a opção 3a foi escolhida.

RPO efetivo aqui é o intervalo de retenção de PITR do plano Neon (ver
console — normalmente algumas horas a poucos dias), não os 24h do dump
semanal abaixo.

## 2. Dump manual (`scripts/backup/`) — segunda linha, fora do Neon

`.github/workflows/backup.yml` já roda isso: dump semanal de homol (cron
domingo 03:00 UTC) e dump de produção sob `workflow_dispatch` com approval do
Environment `production`. O artefato fica retido 30 dias no GitHub Actions.
Existe para o caso em que o PITR do Neon não é suficiente (retenção expirou,
ou é preciso um dump portável fora da conta Neon).

### Restaurar um dump

```bash
# 1. Baixar o artefato do run do workflow "Backup do banco"
#    (Actions → Backup do banco → run → Artifacts) ou:
gh run download <run-id> -n db-production-<run-id>

# 2. Confirmar que o dump não está corrompido antes de restaurar
bash scripts/backup/verify-dump.sh albora-production.dump

# 3. Restaurar — NUNCA direto no primary de produção sem passo intermediário.
#    Restaurar primeiro num branch Neon de rascunho (Console → Create branch
#    → branch vazio) e só then apontar produção pra lá se validado.
export RESTORE_DATABASE_URL="postgresql://.../branch-de-rascunho?sslmode=require"
export CONFIRM_RESTORE="$(node --input-type=module -e 'console.log(new URL(process.env.RESTORE_DATABASE_URL).hostname)')"
bash scripts/backup/database-restore.sh albora-production.dump
```

`database-restore.sh` (já existe em `scripts/backup/`) exige `CONFIRM_RESTORE`
igual ao **hostname** exato de `RESTORE_DATABASE_URL` antes de rodar — mesmo
padrão de confirmação de `CARGA_CONFIRMO_ALVO` em `docs/runbooks/carga-producao.md`
— para que um
`RESTORE_DATABASE_URL` errado no ambiente nunca restaure em cima do banco
errado silenciosamente. Roda `pg_restore --clean --if-exists
--single-transaction`: apaga o schema do alvo antes de recriar — por isso o
alvo intermediário, nunca o primary direto.

### O que nunca fazer

- Nunca restaurar usando o endpoint **pooler** (`-pooler` na URL) — mesmo
  aviso de `docs/runbooks/backup-falhou.md`: `pg_restore` no pooler falha ou
  corrompe. Sempre o endpoint direto.
- Nunca logar `DATABASE_URL`/`RESTORE_DATABASE_URL` — nenhum dos dois scripts
  imprime a connection string; não adicionar `echo`/`set -x` que exponha.
- Nunca restaurar sem antes rodar `verify-dump.sh` — um dump truncado
  (< 1 KB) já é rejeitado no próprio `database-export.sh`, mas um dump
  antigo baixado manualmente pode não ter passado por lá.

## Teste mensal de restore

`RPO-RTO.md` cobra isso na tabela "Última medição de restore" — hoje só tem
`_pendente_`. Procedimento mínimo para preenchê-la sem tocar produção:

1. Pegar o dump de homol mais recente (artefato do cron semanal).
2. Restaurar num branch Neon de rascunho (nunca em homol nem prod), medindo
   o tempo do passo 3 acima.
3. Rodar `pnpm --filter @albora/db typecheck` ou uma query de sanidade
   (contagem de linhas em `events`) contra o branch restaurado.
4. Preencher a linha na tabela de `RPO-RTO.md`: data, ambiente de origem do
   dump, duração, notas (o que passou/faltou).

## Referências

- `scripts/backup/database-export.sh` — dump (`pg_dump --format=custom`,
  aborta se < 1 KB).
- `scripts/backup/verify-dump.sh` — `pg_restore --list` antes de confiar no
  arquivo.
- `scripts/backup/database-restore.sh` — restore com confirmação de host.
- `.github/workflows/backup.yml` — agendamento e Environment `production`.
- `docs/runbooks/backup-falhou.md` — o que fazer quando o workflow falha.
