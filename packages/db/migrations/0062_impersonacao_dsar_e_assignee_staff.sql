-- 0062 — impersonação, DSAR e assignee de staff em tickets (Onda C — mutações)
--
-- `assignee_account_id` (migration 0030) referenciava accounts(id), mas staff
-- vive em staff_users desde a migration 0059 (tabela isolada de propósito —
-- comprometer auth de cliente nunca deve virar acesso interno). A coluna
-- antiga nunca foi lida em código nenhum (grep confirma) — fica como está,
-- forward-only; assignee_staff_id é a que os casos de uso da mesa de
-- suporte (Onda C, T4) de fato usam.
ALTER TABLE support_tickets
  ADD COLUMN assignee_staff_id uuid REFERENCES staff_users(id) ON DELETE SET NULL;

CREATE INDEX support_tickets_por_assignee ON support_tickets (assignee_staff_id)
  WHERE assignee_staff_id IS NOT NULL;

-- audit_log.target_kind (migration 0060) ganha os alvos que esta onda passa
-- a auditar. 'payment' é distinto de 'subscription': um reembolso mira um
-- pagamento específico (billing_payments), não a assinatura — rotular como
-- 'subscription' seria auditoria enganosa sobre o que de fato mudou.
ALTER TABLE audit_log DROP CONSTRAINT audit_log_target_kind_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_target_kind_check
  CHECK (target_kind IN ('account', 'event', 'ticket', 'subscription', 'staff_user', 'platform', 'dsar_request', 'impersonation_request', 'payment'));

-- Impersonação: request -> approve -> active -> ended, TTL curto, uso único
-- (spec §11). approver_staff_id fica NULL enquanto pending; expires_at só é
-- preenchido na aprovação (o TTL começa a contar dali, não da criação).
CREATE TABLE impersonation_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_staff_id  uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  approver_staff_id   uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  target_account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason              text NOT NULL CHECK (length(btrim(reason)) > 0),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'active', 'ended', 'denied', 'expired')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  approved_at         timestamptz,
  started_at          timestamptz,
  expires_at          timestamptz,
  ended_at            timestamptz
);
CREATE INDEX impersonation_requests_por_status ON impersonation_requests (status, created_at DESC);
CREATE INDEX impersonation_requests_por_alvo ON impersonation_requests (target_account_id, created_at DESC);

-- Sessão de host "marcada" (spec §11): toda ação na janela sabe que é
-- impersonada porque a própria sessão carrega o pedido que a originou.
ALTER TABLE host_sessions
  ADD COLUMN impersonation_id uuid REFERENCES impersonation_requests(id) ON DELETE SET NULL;

-- DSAR: pedido do titular, com prazo legal e responsável. legal_due_at é
-- NOT NULL sem DEFAULT de propósito — nenhuma fonte no produto define um
-- número de dias por tipo de pedido; quem registra o pedido informa o
-- prazo explicitamente (Lacunas).
CREATE TABLE dsar_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                text NOT NULL CHECK (kind IN ('access', 'portability', 'rectification', 'deletion')),
  subject_account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  received_at         timestamptz NOT NULL DEFAULT now(),
  legal_due_at        timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'completed', 'refused')),
  assignee_staff_id   uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  evidence_url        text,
  completed_at        timestamptz,
  notes               text
);
CREATE INDEX dsar_requests_por_status ON dsar_requests (status, legal_due_at);
CREATE INDEX dsar_requests_por_prazo ON dsar_requests (legal_due_at) WHERE status IN ('open', 'in_progress');
