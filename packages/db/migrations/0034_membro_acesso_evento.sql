-- 0034 — membro (couple|planner) lê e atualiza o evento sob app.account_id
--
-- Fotos e billing continuam em events.account_id. Quem está em event_members
-- opera o painel (pânico, moderação) sem ser dono da fatura. DELETE e INSERT
-- seguem só na política conta_evento (dono). ACL fina (ZIP, haMenores, plano)
-- fica na aplicação.

CREATE POLICY conta_membro_evento_leitura ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members m
       WHERE m.event_id = events.id
         AND m.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  );

CREATE POLICY conta_membro_evento_escrita ON events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM event_members m
       WHERE m.event_id = events.id
         AND m.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members m
       WHERE m.event_id = events.id
         AND m.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  );
