-- 0025 — baixar o acervo da noite (spec 016 leftover)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O ZIP nao nasce no request: o POST abre um job, o GET do arquivo e quem
-- transmite os bytes. A lista de chaves e um recorte de uploads published
-- deste evento — nunca um list no bucket.
--
-- host_step_up vive na camada de CONTA, como magic_links: nao tem event_id.
-- Comprometer a sessao longa nao basta para exportar; precisa de um token
-- de uso unico, emitido na hora (spec 009, docs/security.md §4.8).

CREATE TABLE host_step_up (
  token_hash  bytea PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  action      text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT host_step_up_action CHECK (action = 'export_acervo')
);

CREATE INDEX host_step_up_por_conta ON host_step_up (account_id);

CREATE TABLE export_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  state        text NOT NULL,
  photo_count  integer NOT NULL,
  items        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  ready_at     timestamptz,
  CONSTRAINT export_jobs_state CHECK (state IN ('pronto', 'vazio', 'falhou')),
  CONSTRAINT export_jobs_count CHECK (photo_count >= 0)
);

CREATE INDEX export_jobs_por_evento ON export_jobs (event_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADO, nao so habilitado — mesma disciplina de 0001. O NULLIF
-- nao e defensivo, e obrigatorio: apos um SET LOCAL, ao commitar, o GUC
-- volta a '' (nao a NULL) e ''::uuid estoura em vez de nao casar.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON export_jobs
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
