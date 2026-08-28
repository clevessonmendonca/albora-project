-- 0051 — emoji opcional nas missões personalizadas
--
-- Cada missão personalizada pode ter um emoji que aparece no app do convidado
-- ao lado do título, tornando a lista mais visual. Missões do pack continuam
-- sem emoji — o vocabulário do pack controla a apresentação delas.
--
-- Nullable: missões sem emoji mantêm o comportamento atual.

ALTER TABLE challenges ADD COLUMN emoji text;
