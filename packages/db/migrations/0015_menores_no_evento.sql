-- 0015 — interruptor "ha menores nesta festa" (ADR 0012, roadmap A2)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Controle de evento, nao de pessoa: ninguem e marcado, nenhuma idade e
-- guardada. O anfitriao liga quando sabe que ha menor na festa; o limiar de
-- denuncia e os padroes derivados sao calculados no core (menores.ts).

ALTER TABLE events ADD COLUMN has_minors boolean NOT NULL DEFAULT false;
