-- 0039 — atribuição de origem do compartilhamento (spec A1)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `share` ja e medido (`funnel_events.name = 'share'`, migration 0001). O que
-- falta e (1) indice para contar isso por evento sem varrer a tabela toda, e
-- (2) a ponte pra fora do evento: "quantas visitas na landing genérica
-- (`/?ref=`) vieram de alguem que viu o album de outro casamento".
--
-- `event_share_refs` NAO e uma sexta porta: e uma tabela sob RLS comum, com o
-- MESMO padrao de politica de sempre (app.event_id via NULLIF). So o job de
-- reconciliacao cruza evento (ref_token -> event_id), e via `comAgregacao`
-- (BYPASSRLS, auditado) — o segundo escopo que ja existe em `event.ts`.
--
-- `product_events` continua sem event_id, por desenho (cookie anonimo,
-- migration 0032). `origin_ref` e so um rotulo opaco — nao reintroduz event_id
-- nem PII.

CREATE INDEX IF NOT EXISTS funnel_events_por_evento_e_nome
  ON funnel_events (event_id, name);

CREATE TABLE event_share_refs (
  event_id    uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  ref_token   text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma disciplina de 0001/0036. O NULLIF
-- nao e defensivo, e obrigatorio: apos um SET LOCAL, ao commitar, o GUC volta
-- a '' (nao a NULL) e ''::uuid estoura em vez de nao casar.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE event_share_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_share_refs FORCE  ROW LEVEL SECURITY;
CREATE POLICY event_share_refs_por_evento ON event_share_refs
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);

ALTER TABLE product_events ADD COLUMN origin_ref text;
