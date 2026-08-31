-- 0014 — packs disponíveis (spec 009)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- events.pack_id referencia packs(id). Os packs sao um conjunto fechado, e esta
-- tabela e o registro deles do lado do banco. Semeia os que existem hoje; um
-- pack novo entra por outra migration. Idempotente para conviver com bancos que
-- ja tenham semeado em dev.

INSERT INTO packs (id) VALUES ('casamento'), ('quinze-anos')
  ON CONFLICT (id) DO NOTHING;
