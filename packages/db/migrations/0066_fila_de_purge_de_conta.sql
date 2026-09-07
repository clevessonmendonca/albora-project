-- 0066_fila_de_purge_de_conta.sql
-- Fila durável para o purge de bytes no R2 pós-commit da exclusão de conta a
-- pedido (LGPD). Hoje `deleteAccountAction` apaga cada key do R2 com um
-- try/catch que só faz console.warn na falha — como a conta já foi apagada
-- na transação, uma falha ali deixa bytes órfãos e nenhuma fila acionável.
--
-- Sem event_id e sem RLS: a conta e os eventos são apagados dentro da MESMA
-- transação (purgeAccountDataOnClient, packages/db/src/retention-jobs.ts),
-- então a fila precisa sobreviver a ambos — mesmo desenho de audit_log
-- (migration 0060), que também não tem event_id nem RLS.
--
-- Só as keys do R2, nunca os tokens do Drive: keys são caminho, não
-- credencial; enfileirar token criaria nova superfície de exposição. A
-- revogação do refresh token do Drive continua best-effort pós-commit, como
-- já é hoje — token expira sozinho, byte órfão é permanente.
CREATE TABLE account_purge_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL,            -- SEM FK: a conta é apagada; a fila sobrevive a ela, igual audit_log
  storage_key text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','purged','failed')),
  attempts    int NOT NULL DEFAULT 0,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  purged_at   timestamptz
);

CREATE INDEX account_purge_jobs_pendentes ON account_purge_jobs (status, created_at) WHERE status <> 'purged';
