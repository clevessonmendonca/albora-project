-- 0061_migrar_operadores_para_staff.sql
--
-- MIGRAÇÃO DE LEGADO (ADR 0016 §4): owner é ponto de partida da migração de
-- platform_operators, não desenho final. Não remove nem altera
-- platform_operators — /ops segue no ar até a Onda D.

-- Insere operadores como staff_users. Idempotente via ON CONFLICT.
-- accounts.email é NOT NULL UNIQUE, então todo operador ligado gera uma entrada.
INSERT INTO staff_users (email, name)
SELECT a.email, a.email
  FROM platform_operators po
  JOIN accounts a ON a.id = po.account_id
ON CONFLICT (email) DO NOTHING;

-- Atribui role='owner' aos staff criados acima. Idempotente.
INSERT INTO staff_role_assignments (staff_user_id, role)
SELECT su.id, 'owner'
  FROM platform_operators po
  JOIN accounts a ON a.id = po.account_id
  JOIN staff_users su ON su.email = a.email
ON CONFLICT (staff_user_id, role) DO NOTHING;
