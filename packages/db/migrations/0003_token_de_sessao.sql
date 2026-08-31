-- 0003 — token opaco da sessao do convidado
--
-- 🔴 O problema que esta migration resolve, e que nao e obvio:
--
-- Toda consulta de evento exige `SET LOCAL app.event_id`. Mas o servidor
-- descobre o event_id resolvendo o token do convidado — e a tabela onde o
-- token mora esta sob RLS, que exige o event_id. Circular.
--
-- A saida e uma porta deliberadamente pequena: uma tabela de mapeamento FORA
-- da RLS, contendo apenas hash opaco -> (event_id, session_id). Sem PII, sem
-- conteudo de evento, sem nome de convidado. Se alguem ler esta tabela
-- inteira, sabe que existem sessoes e a quais eventos pertencem — e nada mais.
--
-- A disciplina e manter essa porta minima. Toda coluna que alguem quiser
-- acrescentar aqui esta pedindo para sair de tras da RLS.

CREATE TABLE session_tokens (
  token_hash  bytea PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Guarda o HASH, nunca o token. Um dump do banco nao entrega acesso as
-- sessoes ativas: o token so existe no cookie do aparelho do convidado. E a
-- mesma razao de nao guardar senha em claro, valendo com forca maior — este
-- token e a UNICA credencial daquele plano, porque o convidado nao tem login.

-- Revogar um evento inteiro sem varredura: e o que o ADR 0004 chama de
-- revogacao por evento sem derrubar quem esta subindo foto em outro.
CREATE INDEX session_tokens_por_evento ON session_tokens (event_id);

-- Rotacao de slug nao derruba sessao ativa (N1.5): o que expira e o
-- expires_at daqui, nao o slug do evento.
ALTER TABLE guest_sessions
  ADD COLUMN last_seen_at timestamptz;
