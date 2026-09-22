-- 0074 — marcos de preparação do evento (painel do anfitrião)
--
-- O painel precisa dizer honestamente "X de Y essenciais prontos". Capa, recado,
-- missões e equipe já têm sinal próprio; identidade, QR e "vi como convidado"
-- não tinham nenhum — o checklist vivia em localStorage, ou seja, morria ao
-- trocar de aparelho e nunca foi estado do evento.
--
-- Coluna no próprio `events` (e não tabela nova) porque o dado é 1:1 com o
-- evento e herda a política de isolamento que `events` já tem.

ALTER TABLE events
  ADD COLUMN setup_marks jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN events.setup_marks IS
  'Marcos de preparo que não têm sinal derivável (identidade revisada, QR preparado, prévia de convidado vista). Estado do evento, não do navegador.';
