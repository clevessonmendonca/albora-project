-- 0030 — papéis, suporte e operadores da plataforma
--
-- Fotos ficam com o casal (events.account_id). Cerimonialista opera via
-- event_members.planner. Owner vê agregados e tickets em /ops.

CREATE TABLE platform_operators (
  account_id  uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_members (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('couple', 'planner')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, account_id)
);

CREATE INDEX event_members_por_conta ON event_members (account_id);

CREATE TABLE vendor_members (
  vendor_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, account_id)
);

CREATE INDEX vendor_members_por_conta ON vendor_members (account_id);

-- Tickets de suporte (fora do caminho crítico de upload). Sem PII de convidado.
CREATE TABLE support_tickets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_id              uuid REFERENCES events(id) ON DELETE SET NULL,
  source                text NOT NULL CHECK (source IN ('admin', 'email', 'ops')),
  subject               text NOT NULL,
  status                text NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority              text NOT NULL DEFAULT 'p2'
                          CHECK (priority IN ('p0', 'p1', 'p2')),
  sla_due_at            timestamptz,
  assignee_account_id   uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_por_status ON support_tickets (status, priority, created_at DESC);
CREATE INDEX support_tickets_por_conta ON support_tickets (account_id, created_at DESC);

CREATE TABLE support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_kind text NOT NULL CHECK (author_kind IN ('host', 'operator')),
  author_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_por_ticket ON support_messages (ticket_id, created_at ASC);

-- event_members: acesso por conta (segunda porta), não por event_id GUC do convidado.
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members FORCE ROW LEVEL SECURITY;
CREATE POLICY conta_membro ON event_members
  USING (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);

-- Tickets: o host vê os seus via account_id.
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY conta_ticket ON support_tickets
  USING (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);

-- Operadores da plataforma listam a fila inteira (inbox /ops) sob a própria conta.
CREATE POLICY ops_ticket_lista ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_operators po
       WHERE po.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  );

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY conta_mensagem ON support_messages
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
       WHERE t.id = support_messages.ticket_id
         AND t.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t
       WHERE t.id = support_messages.ticket_id
         AND t.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  );

-- platform_operators / vendor_members: lidos por caminhos de app com conta;
-- agregação cross-event usa albora_agregador (BYPASSRLS) + audit log.
ALTER TABLE platform_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_operators FORCE ROW LEVEL SECURITY;
CREATE POLICY conta_operator ON platform_operators
  USING (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);

ALTER TABLE vendor_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_members FORCE ROW LEVEL SECURITY;
CREATE POLICY conta_vendor_member ON vendor_members
  USING (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);
