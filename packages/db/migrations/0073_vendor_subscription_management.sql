-- 0073 — estado explícito para autosserviço de assinatura do fornecedor.
-- O provedor confirma a mutação; o webhook continua sendo quem efetiva o
-- plano na tabela vendors e encerra o estado pendente local.

ALTER TABLE vendor_subscriptions
  ADD COLUMN pending_plan text
    CHECK (pending_plan IN ('starter', 'studio', 'agency')),
  ADD COLUMN cancel_requested_at timestamptz;
