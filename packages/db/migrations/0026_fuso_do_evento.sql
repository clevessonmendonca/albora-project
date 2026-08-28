-- 0026 — fuso IANA do evento (taken_at, capitulos, amanhecer)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Sem coluna, o album ancorava em Brasilia (−180). Uma festa em Manaus ou
-- Noronha deslocava a faixa 5h–7h e o taken_at do EXIF. Default cobre as
-- linhas ja existentes: America/Sao_Paulo, o fuso do MVP.

ALTER TABLE events
  ADD COLUMN timezone text NOT NULL DEFAULT 'America/Sao_Paulo';

COMMENT ON COLUMN events.timezone IS
  'IANA do salao. Ancora taken_at, capitulos e a faixa 5h–7h. Default America/Sao_Paulo.';
