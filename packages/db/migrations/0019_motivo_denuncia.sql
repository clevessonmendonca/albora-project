-- 0019 — motivo opcional na denuncia de foto (spec 011)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.

ALTER TABLE reports ADD COLUMN reason text;
