-- 0076 — até quando o anfitrião já viu o álbum (painel, fase Depois)
--
-- Migrations são forward-only em produção. Nunca reescreva este arquivo depois
-- de ele ter rodado em qualquer ambiente real — escreva outro.
--
-- Depois da festa o álbum continua crescendo: convidado que dormiu com fila
-- offline pendente sobe no dia seguinte, e quem ficou até o fim sobe de
-- madrugada. Sem marca de leitura, a Home só sabe dizer "1.284 fotos" — um
-- número que não muda de cara e não convida a voltar.
--
-- Coluna em `events` e não tabela nova: o dado é 1:1 com o evento e herda a
-- política de isolamento que `events` já tem. NULL = nunca abriu o álbum.

ALTER TABLE events
  ADD COLUMN host_seen_album_at timestamptz;

COMMENT ON COLUMN events.host_seen_album_at IS
  'Última vez que o anfitrião abriu o álbum. Alimenta o "novas para você" da fase Depois. NULL = nunca abriu.';
