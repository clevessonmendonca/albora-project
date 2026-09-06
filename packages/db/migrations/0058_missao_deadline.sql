-- 0058 — deadline opcional nas missões personalizadas
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Fecha o gap I8: além de emoji (0051) e texto livre (0049), a missão
-- personalizada agora pode carregar um prazo opcional ("essa missão só
-- vale até a sobremesa"). Nullable: sem prazo, comportamento atual.
-- Vale para qualquer challenge, não só personalizada — o schema não
-- distingue, e não há motivo pra travar a coluna a title_key IS NULL.

ALTER TABLE challenges ADD COLUMN deadline timestamptz;
