-- 0007 — cracha da parede (telao)
--
-- Mesmo problema circular da 0003, e mesma saida: o telao apresenta um token e
-- o servidor precisa resolver o event_id ANTES de poder `SET LOCAL
-- app.event_id`. A tabela de mapeamento fica fora da RLS, e minima.
--
-- 🔴 Por que nao reusar `session_tokens`:
--
-- A sessao do convidado autoriza SUBIR foto. O telao e uma TV pendurada num
-- salao, ligada sozinha a noite inteira, ao alcance de qualquer pessoa da
-- festa — e por isso e a credencial mais facil de furtar do produto. Dar a ela
-- um token que escreve seria entregar o upload do evento junto com a parede.
--
-- Daqui sai apenas leitura. As concessoes vivem em `packages/core/src/parede.ts`
-- e nenhuma delas escreve.

CREATE TABLE wall_tokens (
  token_hash  bytea PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Nao ha `session_id`, e a ausencia e a decisao: a parede nao e uma pessoa.
-- Nenhuma acao dela pertence a um convidado, e inventar uma sessao para ela
-- faria a auditoria atribuir a alguem o que uma TV fez sozinha.

-- Revogar a parede de um evento sem varredura e sem tocar em outro: o cabo sai
-- da TV no meio da festa e o cracha morre, com as sessoes dos convidados
-- intactas.
CREATE INDEX wall_tokens_por_evento ON wall_tokens (event_id);
