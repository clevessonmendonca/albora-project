-- 0046 — musica na story (composer pos-captura, sub-etapa b do ADR 0009)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- `music_track_id` REUSA `music_suggestions` (as faixas que os convidados ja
-- votam, spec 018) — nao inventa uma segunda tabela de faixas. Nullable: uma
-- story sem musica continua uma story valida, e anexar musica e enriquecimento
-- (CLAUDE.md — "IA/musica degrada, nunca falha"), nunca condicao para a foto
-- ou a story existirem. `ON DELETE SET NULL`: perder a linha de sugestao (o
-- evento inteiro sendo apagado, por exemplo) tira a musica da story, nunca a
-- story em si.
--
-- Sem ALTER em 0036_story.sql, que ja rodou — esta e a migration nova que
-- aquele comentario previa.

ALTER TABLE story
  ADD COLUMN music_track_id uuid NULL REFERENCES music_suggestions(id) ON DELETE SET NULL;
