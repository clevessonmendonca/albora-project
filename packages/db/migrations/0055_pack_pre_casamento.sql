-- 0055 — pack pre-casamento (noivado, chá, despedida, ensaio)
--
-- O pack já existe no código (packages/packs/src/pre-casamento.ts) desde a
-- discovery de agosto/2026, mas faltava a linha na tabela packs — qualquer
-- evento criado com esse pack_id violaria o FK.
--
-- Idempotente: ON CONFLICT DO NOTHING.

INSERT INTO packs (id) VALUES ('pre-casamento')
  ON CONFLICT (id) DO NOTHING;
