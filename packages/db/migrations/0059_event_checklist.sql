-- 0059 — checklist de preparo do evento, no servidor
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O checklist vivia em localStorage: trocar de celular, limpar o navegador ou
-- entrar pelo computador do cerimonialista apagava o preparo da festa. Preparo
-- de evento e trabalho de varias pessoas em varios aparelhos.
--
-- Presenca da linha = item feito. Desmarcar apaga a linha, em vez de gravar
-- `false`: nao existe diferenca util entre "nunca marcou" e "desmarcou", e a
-- ausencia mantem a tabela pequena.
--
-- Os itens derivaveis do proprio dado (missoes, identidade, convidados
-- esperados, plano, gate) NAO entram aqui — sao calculados na leitura. Gravar
-- copia de algo que o banco ja sabe e criar duas verdades.
--
-- Sem GRANT explicito: o ALTER DEFAULT PRIVILEGES da migration 0002 ja concede
-- SELECT/INSERT/UPDATE/DELETE a albora_app em toda tabela criada depois dela.

CREATE TABLE event_checklist (
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_key   text NOT NULL,
  done_at    timestamptz NOT NULL DEFAULT now(),
  done_by    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  PRIMARY KEY (event_id, item_key)
);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — ENABLE sozinho nao vale para o dono da
-- tabela, e a aplicacao costuma conectar como dono.
--
-- 🔴 O NULLIF e obrigatorio: apos um SET LOCAL, ao commitar, o GUC customizado
-- volta a string vazia (nao a NULL), e ''::uuid ESTOURA. Ver 0001.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE event_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checklist FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON event_checklist
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

COMMENT ON TABLE event_checklist IS
  'Itens de preparo marcados a mao. Os derivaveis do proprio evento sao calculados na leitura, nao gravados aqui.';
