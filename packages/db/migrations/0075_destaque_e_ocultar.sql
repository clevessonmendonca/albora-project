-- 0075 — destaque do anfitrião e ocultar reversível (painel, tela de Fotos)
--
-- Migrations são forward-only em produção. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- ── Destacar ────────────────────────────────────────────────────────────────
-- `packages/curation` já pontua qualidade técnica (nitidez, exposição, dedup),
-- mas isso é o palpite da máquina. `starred_at` é a escolha do casal, que o
-- telão, o Reviver e o álbum impresso priorizam. São sinais diferentes e não
-- podem morar na mesma coluna.
--
-- Timestamp e não boolean: "quando destacaram" ordena a aba Destaques sem
-- coluna extra, e `NULL` já significa "não destacada".

ALTER TABLE uploads
  ADD COLUMN starred_at timestamptz;

-- Parcial: a aba Destaques lê só as destacadas, que são poucas por evento.
CREATE INDEX uploads_destaques
  ON uploads (event_id, starred_at DESC)
  WHERE starred_at IS NOT NULL;

COMMENT ON COLUMN uploads.starred_at IS
  'Quando o anfitrião destacou a foto. Escolha humana — não confundir com os escores de curation, que são palpite do classificador.';

-- ── Ocultar reversível ──────────────────────────────────────────────────────
-- Até aqui "ocultar" e "remover" gravavam o mesmo `state = 'removed'`: o
-- anfitrião não tinha como desfazer, e o protótipo pede desfazer com um toque.
--
-- Estado novo em vez de coluna booleana porque a leitura de mídia no repo é
-- `state = 'published'`: um estado desconhecido **some sozinho** de feed,
-- álbum, telão e export. Uma coluna `hidden` falharia aberto — bastaria
-- esquecer um AND em uma consulta para a foto oculta reaparecer no telão.
--
-- `state` não ganha CHECK: a coluna é texto livre desde 0001 e a tabela pode
-- ter valores históricos que um CHECK derrubaria na migration.

COMMENT ON COLUMN uploads.state IS
  'published = visível. hidden = o anfitrião tirou do álbum, reversível. removed = saiu de vez (autor ou anfitrião). purged = bytes apagados pela retenção. Toda leitura de mídia filtra por published.';
