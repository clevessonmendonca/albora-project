-- 0077 — cápsula de memória (painel, fase Depois)
--
-- Migrations são forward-only em produção. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- O CLAUDE.md permite memórias automáticas desde que sejam opt-in e desligáveis
-- em um toque. A cápsula é a exceção ao apagamento do dia 365: um punhado de
-- destaques sobrevive para a lembrança anual.
--
-- ── Por que só a mídia do próprio casal ─────────────────────────────────────
-- A foto é de quem a tirou. O convidado consentiu com um prazo anunciado; o
-- casal ligar um toggle não estende o consentimento de terceiro — e o STJ
-- (REsp 1.628.700/MG) trata dano à imagem de menor publicada sem autorização
-- do representante legal como `in re ipsa`, sem exigir finalidade comercial.
-- Então a cápsula só alcança mídia enviada por uma sessão cujo contato de
-- e-mail VERIFICADO (Google/magic link, migration 0069) é o e-mail da conta
-- dona do evento. Foto de convidado segue a exclusão normal, com toggle ligado
-- ou não.

ALTER TABLE events
  ADD COLUMN memory_capsule boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN events.memory_capsule IS
  'Opt-in do casal para guardar os próprios destaques além do dia 365. Nunca alcança mídia de convidado: consentimento de terceiro não é do casal para dar.';

COMMENT ON COLUMN events.host_seen_album_at IS
  'Última vez que o anfitrião abriu o álbum. Alimenta o "novas para você" da fase Depois. NULL = nunca abriu.';
