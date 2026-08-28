-- 0037 — canal do fornecedor (V1): vendors estendida, RLS por vendor_id,
-- events.is_demo, e a tabela de assinatura do fornecedor (Modelo A, billing).
--
-- Migrations são forward-only: nunca reescreva esta depois de aplicada em
-- qualquer ambiente real — escreva outra.

ALTER TABLE vendors
  ADD COLUMN slug            text UNIQUE,
  ADD COLUMN custom_domain   text UNIQUE,
  ADD COLUMN brand_tokens    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN plan            text NOT NULL DEFAULT 'starter'
                               CHECK (plan IN ('starter', 'studio', 'agency')),
  ADD COLUMN default_pack_id text REFERENCES packs(id),
  ADD COLUMN commission_bps  integer NOT NULL DEFAULT 0
                               CHECK (commission_bps >= 0 AND commission_bps <= 10000),
  ADD COLUMN status          text NOT NULL DEFAULT 'trial'
                               CHECK (status IN ('trial', 'active', 'suspended', 'churned'));

-- vendors não é tabela de evento — não tem event_id, e a política de
-- isolamento por evento não se aplica aqui. Ganha a mesma disciplina: RLS
-- FORÇADA, por vendor_id, casando vendor_members contra o GUC app.account_id
-- que já existe (ADR 0013). Zero mecanismo novo de sessão.
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;

CREATE POLICY vendor_membro ON vendors
  USING (
    EXISTS (
      SELECT 1 FROM vendor_members m
       WHERE m.vendor_id = vendors.id
         AND m.account_id = NULLIF(current_setting('app.account_id', true), '')::uuid
    )
  );

-- Evento de demo do kit de venda (B2, fase seguinte): é um events real, sob
-- a mesma RLS por event_id de qualquer outro evento — "demo" não é um estado
-- especial no schema, é só uma flag de exibição para o portal não contar o
-- evento demo nas métricas de negócio do fornecedor.
ALTER TABLE events ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- eventosDoFornecedor (packages/db/src/vendor-portal.ts) filtra sempre por
-- vendor_id — este índice é o que faz esse filtro não varrer a tabela.
CREATE INDEX events_por_vendor ON events (vendor_id, starts_at DESC)
  WHERE vendor_id IS NOT NULL;

-- Assinatura do fornecedor (Modelo A, tipo Gathmo — plano fixo mensal,
-- sem split de gateway; ver spec §4.1). Mapeia asaas_subscription_id →
-- vendor_id, para o webhook achar quem ativar sem precisar de contexto de
-- conta. Sem event_id: não é dado de evento, não carrega PII de convidado.
-- Sem RLS — mesma disciplina de billing_customers/billing_payments (0031):
-- o servidor só chama estas funções depois de já ter confirmado, sob
-- app.account_id, que a conta é admin em vendor_members daquele vendor_id.
CREATE TABLE vendor_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id              uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  account_id             uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  asaas_subscription_id  text NOT NULL UNIQUE,
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'overdue', 'canceled')),
  plan                   text NOT NULL CHECK (plan IN ('starter', 'studio', 'agency')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendor_subscriptions_por_vendor ON vendor_subscriptions (vendor_id, created_at DESC);

-- ativarPlanoDoFornecedor (billing.ts) é a única escrita de vendors.status/
-- plan pago, via webhook — sem contexto de conta, então sem como passar pela
-- política vendor_membro (ela exige pertencimento em vendor_members). Só
-- escreve através de comAgregacao (BYPASSRLS, motivo obrigatório, auditado),
-- e o papel agregador (migration 0002) até aqui só tinha SELECT.
--
-- 🔴 Este GRANT é column-scoped (status, plan) e nada além: a contenção
-- continua sendo "a query nunca sai sem WHERE id = $1", exatamente como já
-- vale para o SELECT cross-vendor — só que agora cobre UPDATE, não SELECT.
-- Não é GRANT em ALL TABLES; é UPDATE só destas duas colunas, só em vendors.
GRANT UPDATE (status, plan) ON vendors TO albora_agregador;
