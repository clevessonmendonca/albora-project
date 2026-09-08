-- 0071 — delivery_tokens e guest_magic_links saem da RLS (porta de entrada)
--
-- A 0070 pôs RLS FORCED nessas duas, mas elas são PORTA DE ENTRADA:
-- resolveDeliveryToken/consumeGuestMagicLink leem por token_hash ANTES de
-- haver contexto de evento, no pool real (albora_app, sem BYPASSRLS) e sem
-- app.event_id. Com RLS, a política casava event_id = NULLIF('','')::uuid →
-- NULL → zero linhas SEMPRE, quebrando a galeria e o magic link em produção.
-- São da família de session_tokens/oidc_states: o token_hash indevassável é a
-- capability, um hash pertence a um único evento, não há query de listagem.
-- Forward-only: corrige a 0070 sem reescrevê-la.
DROP POLICY IF EXISTS isolamento_evento ON delivery_tokens;
ALTER TABLE delivery_tokens   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE delivery_tokens   DISABLE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS isolamento_evento ON guest_magic_links;
ALTER TABLE guest_magic_links NO FORCE ROW LEVEL SECURITY;
ALTER TABLE guest_magic_links DISABLE  ROW LEVEL SECURITY;
