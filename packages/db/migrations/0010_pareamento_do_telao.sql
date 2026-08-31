-- 0010 — pareamento do telao
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Como a TV entra num evento sem ninguem logado nela:
--
-- 1. A TV abre /telao e pede um pareamento. O servidor devolve um CODIGO curto
--    (mostrado na tela) e guarda um TOKEN DE POLL secreto no cookie da TV.
-- 2. Alguem que ja esta no evento — convidado OU anfitriao — digita o codigo
--    (ou escaneia o QR) e autoriza. O event_id vem da SESSAO de quem autoriza,
--    nunca da TV: e isso que mantem o isolamento.
-- 3. A TV faz poll com o token secreto; quando autorizado, recebe o cracha de
--    leitura (spec 010) num cookie e comeca a mostrar as fotos.
--
-- 🔴 Por que fica FORA da RLS, como a sessao e o cracha:
--
-- O pareamento nasce SEM evento — o event_id so aparece quando alguem autoriza.
-- Resolve-se por codigo e por token de poll ANTES de existir contexto de
-- evento, o mesmo circular de `session_tokens` e `wall_tokens`. Daqui nao sai
-- dado de evento: sai um event_id para emitir um cracha que so le.

CREATE TABLE wall_pairings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  poll_token_hash  bytea NOT NULL UNIQUE,
  event_id         uuid REFERENCES events(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pendente',
  consent_version  text,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- O event_id e anulavel de proposito: a linha existe antes de qualquer evento,
-- e ganha um quando alguem com sessao autoriza. Nenhuma linha aqui carrega nome
-- de convidado nem conteudo — so o mapeamento codigo/token → evento.
