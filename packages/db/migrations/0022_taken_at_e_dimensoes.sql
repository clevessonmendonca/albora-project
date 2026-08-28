-- 0022 — instante de captura e dimensoes reais (spec 016)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo
-- depois de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O EXIF sai no cliente antes do upload. taken_at e o unico campo que
-- sobrevive: o confirm o declara a partir da leitura feita ANTES do
-- reencode. Sem ele o album cai no created_at e agrupa pela hora da
-- chegada, nao da noite.
--
-- width/height alimentam a diagramacao por slots. Ausentes, a leitura
-- assume retrato — tres de cada quatro fotos de festa.

ALTER TABLE uploads ADD COLUMN taken_at timestamptz;
ALTER TABLE uploads ADD COLUMN width integer;
ALTER TABLE uploads ADD COLUMN height integer;
