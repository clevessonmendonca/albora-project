-- 0018 — plano do evento (precificação §5.2)

ALTER TABLE events
  ADD COLUMN plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'celebration', 'vendor'));

COMMENT ON COLUMN events.plan IS
  'Plano comercial do evento. Controla resolução, telão, ZIP e cota de vídeo por convidado.';
