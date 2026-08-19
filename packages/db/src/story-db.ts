import type { PoolClient } from "pg";

const PUBLICADO = "published";
const JANELA_HORAS = 24;

/**
 * Uma story para exibicao: o marcador gravado, mais o que a tela precisa da
 * midia e de quem enviou, sem uma segunda consulta.
 *
 * `autor` e so o primeiro nome (concessao `ler.identidade`), nunca contato —
 * mesma regra do comentario e da reacao.
 */
export type StoryAtiva = {
  id: string;
  eventoId: string;
  uploadId: string;
  sessaoId: string;
  storageKey: string;
  mime: string;
  autor: string;
  criadaEm: Date;
  expiraEm: Date;
};

type LinhaAtiva = {
  id: string;
  event_id: string;
  upload_id: string;
  session_id: string;
  storage_key: string;
  mime: string;
  display_name: string;
  created_at: Date;
  expira_em: Date;
};

function paraAtiva(l: LinhaAtiva): StoryAtiva {
  return {
    id: l.id,
    eventoId: l.event_id,
    uploadId: l.upload_id,
    sessaoId: l.session_id,
    storageKey: l.storage_key,
    mime: l.mime,
    autor: l.display_name,
    criadaEm: l.created_at,
    expiraEm: l.expira_em,
  };
}

/**
 * Marca um upload já confirmado como story, uma vez só.
 *
 * `UNIQUE (upload_id)` mais `ON CONFLICT DO NOTHING`: o mesmo `uploadId`
 * confirmando story duas vezes — o caso normal do confirm reenviado pela fila
 * offline (retry com sinal ruim) — devolve a story existente em vez de
 * duplicar ou estourar. `expiraEm` nasce fixo em `criadoEm + 24h`; a
 * expiração é filtro de leitura, não job de exclusão.
 *
 * O `event_id` **não vem do cliente**: vem da sessão que confirma o upload, e
 * a RLS ainda o confere — duas camadas para a mesma invariante. O upload
 * precisa existir, pertencer ao mesmo evento e estar publicado: uma story de
 * um upload de outro evento, ou de um upload removido/pendente, não entra.
 */
export async function criarStory(
  cliente: PoolClient,
  entrada: { eventoId: string; sessaoId: string; uploadId: string },
): Promise<{ id: string; criada: boolean } | null> {
  const { rowCount: existe } = await cliente.query(
    "SELECT 1 FROM uploads WHERE id = $1 AND event_id = $2 AND state = $3",
    [entrada.uploadId, entrada.eventoId, PUBLICADO],
  );
  if (!existe) return null;

  const { rows: inseridas } = await cliente.query<{ id: string }>(
    `INSERT INTO story (event_id, session_id, upload_id, expira_em)
     VALUES ($1, $2, $3, now() + ($4 * interval '1 hour'))
     ON CONFLICT (upload_id) DO NOTHING
     RETURNING id`,
    [entrada.eventoId, entrada.sessaoId, entrada.uploadId, JANELA_HORAS],
  );

  const criada = inseridas[0];
  if (criada) return { id: criada.id, criada: true };

  const { rows: existentes } = await cliente.query<{ id: string }>(
    "SELECT id FROM story WHERE upload_id = $1",
    [entrada.uploadId],
  );

  const existente = existentes[0];
  return existente ? { id: existente.id, criada: false } : null;
}

/**
 * As stories ainda dentro da janela de 24h, do mais novo para o mais velho —
 * ordem de mural, não de chegada.
 *
 * `expira_em > now()` é o filtro inteiro da expiração: sem job de delete, a
 * linha continua existindo depois de vencer, só sai da leitura. O JOIN em
 * `guest_sessions` deixa de fora a story cujo autor já não existe, mesma
 * guarda de `listarComentariosDaFoto`.
 */
export async function storiesAtivasDoEvento(
  cliente: PoolClient,
  eventoId: string,
): Promise<StoryAtiva[]> {
  const { rows } = await cliente.query<LinhaAtiva>(
    `SELECT s.id, s.event_id, s.upload_id, s.session_id, s.expira_em, s.created_at,
            u.storage_key, u.mime, g.display_name
       FROM story s
       JOIN uploads u ON u.id = s.upload_id AND u.event_id = s.event_id
       JOIN guest_sessions g ON g.id = s.session_id AND g.event_id = s.event_id
      WHERE s.event_id = $1 AND s.expira_em > now()
      ORDER BY s.created_at DESC, s.id DESC`,
    [eventoId],
  );

  return rows.map(paraAtiva);
}
