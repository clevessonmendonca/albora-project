-- 0038 — via 'code' para entrada por código de resgate digitado
--
-- `goToEvent` gravava `via='qr'` mesmo quando o convidado digitou o código
-- a mão (bug de instrumentacao ja distorcendo o funil). O codigo curto e
-- legivel ja existe — e o `event_slugs.slug` — entao esta migration nao cria
-- tabela nova, so abre a CHECK de `via` para o valor que faltava: 'code'
-- distingue "digitou/`?codigo=`" de 'qr' (camera) e de 'link' (URL colada
-- sem prefill). Forward-only: nunca reescrever a 0024 ja aplicada.
ALTER TABLE guest_sessions DROP CONSTRAINT guest_sessions_via_check;
ALTER TABLE guest_sessions
  ADD CONSTRAINT guest_sessions_via_check
    CHECK (via IN ('qr', 'wa', 'link', 'code'));
