-- 0045 — host_step_up ganha a ação de conectar o Drive (spec drive-export
-- §1.3) — reusa o mesmo segundo fator do ZIP (spec 009), ação distinta.
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.

ALTER TABLE host_step_up DROP CONSTRAINT host_step_up_action;
ALTER TABLE host_step_up ADD CONSTRAINT host_step_up_action
  CHECK (action IN ('export_acervo', 'drive_connect'));
