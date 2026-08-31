-- 0043 — fecha a corrida de assinatura dupla do fornecedor (follow-up da
-- migration 0037, tarefa deixada pendente)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Sem este índice, duas chamadas concorrentes de "assinar" para o mesmo
-- vendor_id (duplo clique, retry de rede) podem criar duas linhas
-- `pending`/`active` em `vendor_subscriptions` antes do webhook do Asaas
-- confirmar qualquer uma — o vendor ficaria com duas assinaturas
-- simultâneas cobrando em paralelo. Parcial (só nos dois status abertos)
-- porque `canceled`/`overdue` de tentativas antigas não podem bloquear uma
-- nova assinatura.
CREATE UNIQUE INDEX vendor_subscriptions_pendente_unica
  ON vendor_subscriptions (vendor_id)
  WHERE status IN ('pending', 'active');
