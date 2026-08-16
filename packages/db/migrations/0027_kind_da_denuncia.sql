-- 0027 — kind da denuncia: ofensivo vs aparece_na_foto (flows.md §12 buraco 2)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `reason` (0019) continua texto livre opcional. `kind` e o enum que cresce:
-- ofensivo conta no limiar que segura o telao; aparece_na_foto so entra na
-- fila do anfitriao. Nao ha auto-remocao — o anfitriao decide.

ALTER TABLE reports
  ADD COLUMN kind text NOT NULL DEFAULT 'ofensivo';

ALTER TABLE reports
  ADD CONSTRAINT reports_kind_check
  CHECK (kind IN ('ofensivo', 'aparece_na_foto'));

COMMENT ON COLUMN reports.kind IS
  'ofensivo segura o telao no limiar; aparece_na_foto so entra na fila. Sem auto-remocao.';
