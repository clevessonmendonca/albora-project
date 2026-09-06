-- 0056 — draft/publish gate para eventos
--
-- Evento nasce em rascunho: o convidado não tem como chegar nele até o
-- anfitrião publicar de propósito (task 6, gap I1). `resolverSlug` passa a
-- checar este campo antes de qualquer checagem de horário.
--
-- Eventos existentes já passaram por essa decisão informalmente — o QR já
-- estava na placa. O DEFAULT 'draft' preenche a coluna nova com 'draft' em
-- toda linha (inclusive as existentes); o UPDATE abaixo reverte isso pros
-- eventos que já existiam, deixando só quem nasce depois desta migration
-- sujeito ao gate.

ALTER TABLE events
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
  CONSTRAINT events_status_check CHECK (status IN ('draft', 'active', 'ended'));

UPDATE events SET status = 'active' WHERE TRUE;

COMMENT ON COLUMN events.status IS
  'draft = ainda não publicado, convidado não acessa; active = publicado; ended = encerrado.';
