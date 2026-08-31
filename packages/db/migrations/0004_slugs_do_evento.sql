-- 0004 — slugs do evento
--
-- Segunda e ultima porta fora da RLS, pelo mesmo motivo da primeira: achar o
-- evento pelo slug exige o event_id, e descobrir o event_id exige achar o
-- evento. Circular.
--
-- Aqui a porta e menos delicada que a de token, porque o slug NAO e segredo:
-- ele esta impresso na placa da mesa e escaneado por 200 pessoas. O que a
-- tabela revela — que existe um evento com aquele slug — ja esta no QR.
--
-- Uma linha por slug, e nao uma coluna em events, porque a rotacao precisa
-- que o slug ANTIGO continue existindo: o material impresso ja saiu da
-- grafica, e quem escanear a placa velha tem de cair numa pagina de
-- orientacao, nunca num erro seco (N1.5).

CREATE TABLE event_slugs (
  slug        text PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- false = rotacionado. Nao abre sessao nova, mas ainda diz de qual evento
  -- era, que e o que permite orientar em vez de dar 404.
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_slugs_por_evento ON event_slugs (event_id);

INSERT INTO event_slugs (slug, event_id)
SELECT slug, id FROM events;
