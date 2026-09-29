-- 0079 — comunidade entre anfitrioes e inspiracao editorial (ADR 0023)
--
-- Migrations sao forward-only em producao. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Estas tabelas NAO tem event_id, e isso e deliberado. Post de comunidade nao
-- e dado de evento: nasce de quem organiza um evento, e lido por quem organiza
-- OUTROS, e continua valendo depois que o evento de quem escreveu acabou.
-- Forcar event_id aqui produziria um forum onde ninguem ve post de ninguem.
--
-- Sao dado de CONTA, e usam a segunda porta de RLS (app.account_id, ADR 0013),
-- nao a primeira (app.event_id, 0001).
--
-- Sem GRANT explicito: o ALTER DEFAULT PRIVILEGES da migration 0002 ja concede
-- SELECT/INSERT/UPDATE/DELETE a albora_app em toda tabela criada depois dela.

CREATE TABLE community_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  topic       text NOT NULL CHECK (topic IN ('duvida', 'ideia', 'experiencia', 'indicacao')),
  title       text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  body        text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Acervo editorial: nao tem dono, nao e escrito pela aplicacao. Entra por
-- migration e sai por migration.
CREATE TABLE inspiration_ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  theme       text NOT NULL CHECK (theme IN ('fotos', 'decoracao', 'experiencia')),
  title       text NOT NULL,
  body        text NOT NULL,
  image_key   text,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inspiration_saves (
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  idea_id     uuid NOT NULL REFERENCES inspiration_ideas(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, idea_id)
);

-- O feed pagina por chave (created_at, id), nao por OFFSET: linha nova entra no
-- topo o tempo todo, e OFFSET nessa condicao pula ou repete conversa entre uma
-- pagina e a seguinte. Os indices carregam o `id` pelo mesmo motivo.
CREATE INDEX community_posts_recentes ON community_posts (created_at DESC, id DESC);
CREATE INDEX community_posts_por_topico ON community_posts (topic, created_at DESC, id DESC);
CREATE INDEX community_replies_do_post ON community_replies (post_id, created_at);
CREATE INDEX inspiration_ideas_ordem ON inspiration_ideas (theme, position);

-- ─────────────────────────────────────────────────────────────
-- RLS. FORCADA, nao so habilitada — ENABLE sozinho nao vale para o dono da
-- tabela, e a aplicacao costuma conectar como dono.
--
-- Duas politicas por tabela de post, e elas somam por OR:
--   1. autor  — a linha e sua: le, escreve, edita e apaga.
--   2. leitura — acervo compartilhado: qualquer ANFITRIAO le.
--
-- 🔴 A politica de leitura NAO e `USING (true)`. A sessao do convidado roda com
-- app.event_id setado e SEM app.account_id; com `true`, o convidado leria o
-- forum inteiro dos anfitrioes. Exigir que o GUC de conta esteja PRESENTE faz a
-- porta fechar sozinha para quem nao e anfitriao — falha fechado, como o NULLIF
-- da 0001.
--
-- 🔴 O WITH CHECK da politica de autor e o que impede uma conta de criar ou
-- editar post no nome de outra.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts FORCE  ROW LEVEL SECURITY;
CREATE POLICY comunidade_autor ON community_posts
  USING      (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);
CREATE POLICY comunidade_leitura ON community_posts
  FOR SELECT
  USING (NULLIF(current_setting('app.account_id', true), '') IS NOT NULL);

ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies FORCE  ROW LEVEL SECURITY;
CREATE POLICY resposta_autor ON community_replies
  USING      (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);
CREATE POLICY resposta_leitura ON community_replies
  FOR SELECT
  USING (NULLIF(current_setting('app.account_id', true), '') IS NOT NULL);

-- Acervo editorial: so leitura, e so para anfitriao. Sem politica de escrita,
-- a aplicacao nao consegue inserir nem apagar ideia — de proposito.
ALTER TABLE inspiration_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_ideas FORCE  ROW LEVEL SECURITY;
CREATE POLICY inspiracao_leitura ON inspiration_ideas
  FOR SELECT
  USING (NULLIF(current_setting('app.account_id', true), '') IS NOT NULL);

-- Salvos sao dado proprio: ninguem ve o que o outro salvou.
ALTER TABLE inspiration_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_saves FORCE  ROW LEVEL SECURITY;
CREATE POLICY salvo_proprio ON inspiration_saves
  USING      (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.account_id', true), '')::uuid);
