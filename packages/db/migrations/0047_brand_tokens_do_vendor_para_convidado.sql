-- 0047 — white-label do convidado: leitura pública de brand_tokens do vendor
-- escopada ao evento corrente (app.event_id).
--
-- Problema: `vendors` tem RLS forçada por `vendor_membro` (0037), que exige
-- pertencimento em `vendor_members` via `app.account_id`. O convidado roda
-- sob `comEvento`, que seta `app.event_id` mas nunca `app.account_id` — logo
-- a query de JOIN direto com vendors falha silenciosamente (zero linhas).
--
-- Solução escolhida: política adicional FOR SELECT fechada por evento.
-- A política `vendor_marca_do_evento` permite leitura de vendors.brand_tokens
-- quando `vendors.id = events.vendor_id` do evento em `app.event_id`.
-- Garantias de isolamento:
--   · Se `app.event_id` for '' (fora de `comEvento`), `NULLIF` devolve NULL
--     e a subconsulta retorna zero linhas — a política não abre nada.
--   · O convidado do evento A nunca enxerga o vendor do evento B: a subconsulta
--     é fixada pelo `app.event_id` que `comEvento` setou NESTA transação, com
--     `SET LOCAL` (nunca `SET`).
--   · A política é FOR SELECT e apenas nas colunas lidas pelo resolvedor;
--     nenhuma escrita passa por aqui.
--   · `vendor_membro` (0037) continua ativa para o caminho de conta — as duas
--     políticas coexistem sem conflito (OR implícito entre políticas).
--
-- Migrations são forward-only: nunca reescreva esta depois de aplicada.

CREATE POLICY vendor_marca_do_evento ON vendors
  FOR SELECT
  USING (
    id = (
      SELECT vendor_id
        FROM events
       WHERE id = NULLIF(current_setting('app.event_id', true), '')::uuid
         AND vendor_id IS NOT NULL
    )
  );
