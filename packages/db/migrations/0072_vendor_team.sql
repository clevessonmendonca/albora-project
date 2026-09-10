-- 0072 — equipe do fornecedor e auditoria do próprio fornecedor.
--
-- `vendor_members` tem RLS que só deixa cada conta ver a própria linha. A
-- gestão de equipe precisa ler e alterar outras contas do mesmo fornecedor;
-- esse caminho usa exclusivamente `albora_agregador`, depois de o serviço
-- confirmar que o ator é admin e gravar audit_log com actor_kind='host'.

GRANT UPDATE (role), DELETE ON vendor_members TO albora_agregador;

ALTER TABLE audit_log DROP CONSTRAINT audit_log_target_kind_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_target_kind_check
  CHECK (target_kind IN (
    'account', 'event', 'ticket', 'subscription', 'staff_user', 'platform',
    'dsar_request', 'impersonation_request', 'payment', 'vendor'
  ));
