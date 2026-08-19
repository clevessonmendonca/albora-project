-- 0042 — novo kind de retenção: aviso final antes do D365 (spec drive-export
-- §3.3/§6.4)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Nenhuma linha existente perde sentido: `d330_drive` continua existindo
-- (só muda de comportamento no runner — vira nudge, nunca export automático).
-- `ALTER ... DROP/ADD CONSTRAINT` é migration nova, não reescrita da 0033.

ALTER TABLE retention_jobs DROP CONSTRAINT retention_jobs_kind_check;
ALTER TABLE retention_jobs ADD CONSTRAINT retention_jobs_kind_check
  CHECK (kind IN ('plus_48h', 'd330_drive', 'd358_warn', 'd365_delete'));
