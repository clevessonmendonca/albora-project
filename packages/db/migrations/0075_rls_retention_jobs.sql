-- 0075 — RLS em retention_jobs
--
-- Migrations são forward-only em produção. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `retention_jobs` guarda dado por evento (`event_id uuid NOT NULL`) e estava
-- sem RLS desde a 0033, ao contrário de `uploads`, `events` e de todas as
-- outras tabelas com escopo de evento. É o não-negociável do CLAUDE.md:
-- "Toda tabela com dado de evento tem event_id. RLS FORÇADO".
--
-- O guard `isolamento` não pega isto: ele é estático sobre texto (SET vs SET
-- LOCAL, advisory locks) e não verifica se toda tabela com event_id tem
-- política. O próprio docstring dele diz que o teste contra banco real ficou
-- para depois.
--
-- Os dois leitores que cruzam eventos continuam funcionando porque já usam o
-- papel `albora_agregador` (BYPASSRLS, migration 0002): `listDueRetentionJobs`
-- em ops-retencao.ts e `listRetentionJobsAdmin` no console.
--
-- 🔴 O NULLIF é obrigatório: depois de um SET LOCAL, ao commitar, o GUC volta
-- à string vazia (não a NULL), e ''::uuid ESTOURA em vez de falhar fechado.

ALTER TABLE retention_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_jobs FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON retention_jobs
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
