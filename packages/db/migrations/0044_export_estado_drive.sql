-- 0044 — export_jobs.state ganha os estados do fluxo de Drive (spec
-- drive-export §5) que a migration 0041 (colunas de destino) não cobria.
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- ZIP nunca usa os estados novos — continua tudo-ou-nada, sempre
-- pronto/vazio/falhou. Drive é resumível (§7): 'enviando' enquanto a fila
-- processa, 'parcial' quando o Drive do casal esvazia no meio do lote
-- (estado final, nunca conta para o gate do D365 —
-- packages/core/src/retention.ts, mayDeleteAtD365), 'quota_insuficiente'
-- quando o job nem começa por falta de espaço (§5.1).

ALTER TABLE export_jobs DROP CONSTRAINT export_jobs_state;
ALTER TABLE export_jobs ADD CONSTRAINT export_jobs_state
  CHECK (state IN ('pronto', 'vazio', 'falhou', 'enviando', 'parcial', 'quota_insuficiente'));
