import type { PoolClient } from "pg";
import type { LinkDeMusica, MetadadoDaMusica } from "@albora/core";
import { linkDaLinha, metadadoDaSugestao } from "./music-db";

const PUBLICADO = "published";
const JANELA_HORAS = 24;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A faixa anexada à story pelo sticker de música (spec 020, sub-etapa b) —
 * `link`/`metadado` no mesmo formato de `MusicaDoEvento`, para a tela usar
 * `exibirMusica` do núcleo sem um segundo formato.
 */
export type FaixaDaStory = {
  id: string;
  link: LinkDeMusica;
  metadado: MetadadoDaMusica | null;
};

/**
 * Uma story para exibicao: o marcador gravado, mais o que a tela precisa da
 * midia e de quem enviou, sem uma segunda consulta.
 *
 * `autor` e so o primeiro nome (concessao `ler.identidade`), nunca contato —
 * mesma regra do comentario e da reacao. `musica` e `null` quando o convidado
 * nao anexou nenhuma faixa, ou quando a faixa anexada nao existe mais no
 * evento — enriquecimento, nunca condicao para a story aparecer.
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
  musica: FaixaDaStory | null;
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
  music_id: string | null;
  music_provider: string | null;
  music_content_type: string | null;
  music_identifier: string | null;
  music_region: string | null;
  music_url: string | null;
  music_title: string | null;
  music_artist: string | null;
};

function musicaDaLinha(l: LinhaAtiva): FaixaDaStory | null {
  if (l.music_id === null || l.music_provider === null || l.music_content_type === null) {
    return null;
  }
  return {
    id: l.music_id,
    link: linkDaLinha({
      provider: l.music_provider,
      content_type: l.music_content_type,
      identifier: l.music_identifier ?? "",
      region: l.music_region,
      url: l.music_url ?? "",
    }),
    metadado: metadadoDaSugestao({ title: l.music_title, artist: l.music_artist }),
  };
}

/**
 * `null` quando o id não é sequer um uuid, ou quando não é uma sugestão do
 * mesmo evento — os dois casos tratados igual, sem lançar. Ver o porquê no
 * docstring de `criarStory`.
 */
async function faixaValidaNoEvento(
  cliente: PoolClient,
  eventoId: string,
  musicTrackId: string | null | undefined,
): Promise<string | null> {
  if (!musicTrackId || !UUID_RE.test(musicTrackId)) return null;

  const { rowCount } = await cliente.query(
    "SELECT 1 FROM music_suggestions WHERE id = $1 AND event_id = $2",
    [musicTrackId, eventoId],
  );
  return (rowCount ?? 0) > 0 ? musicTrackId : null;
}

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
    musica: musicaDaLinha(l),
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
 *
 * `musicTrackId` (sticker de música, sub-etapa b) é enriquecimento dentro do
 * enriquecimento: nunca derruba a criação da story. Um id malformado, de
 * outro evento, ou de uma sugestão que não existe mais vira `null` em vez de
 * estourar — a foto e a story sobem sem música em vez de sumirem (CLAUDE.md,
 * "música degrada, nunca falha"). Por isso a checagem vive aqui, ANTES do
 * INSERT: um FK inválido faria o INSERT inteiro falhar, e o confirm só tem um
 * SAVEPOINT em volta de `criarStory` inteiro, não um por campo.
 */
export async function criarStory(
  cliente: PoolClient,
  entrada: { eventoId: string; sessaoId: string; uploadId: string; musicTrackId?: string | null },
): Promise<{ id: string; criada: boolean } | null> {
  const { rowCount: existe } = await cliente.query(
    "SELECT 1 FROM uploads WHERE id = $1 AND event_id = $2 AND state = $3",
    [entrada.uploadId, entrada.eventoId, PUBLICADO],
  );
  if (!existe) return null;

  const musicTrackId = await faixaValidaNoEvento(cliente, entrada.eventoId, entrada.musicTrackId);

  const { rows: inseridas } = await cliente.query<{ id: string }>(
    `INSERT INTO story (event_id, session_id, upload_id, music_track_id, expira_em)
     VALUES ($1, $2, $3, $4, now() + ($5 * interval '1 hour'))
     ON CONFLICT (upload_id) DO NOTHING
     RETURNING id`,
    [entrada.eventoId, entrada.sessaoId, entrada.uploadId, musicTrackId, JANELA_HORAS],
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
            u.storage_key, u.mime, g.display_name,
            ms.id AS music_id, ms.provider AS music_provider, ms.content_type AS music_content_type,
            ms.identifier AS music_identifier, ms.region AS music_region, ms.url AS music_url,
            ms.title AS music_title, ms.artist AS music_artist
       FROM story s
       JOIN uploads u ON u.id = s.upload_id AND u.event_id = s.event_id
       JOIN guest_sessions g ON g.id = s.session_id AND g.event_id = s.event_id
       LEFT JOIN music_suggestions ms ON ms.id = s.music_track_id AND ms.event_id = s.event_id
      WHERE s.event_id = $1 AND s.expira_em > now()
      ORDER BY s.created_at DESC, s.id DESC`,
    [eventoId],
  );

  return rows.map(paraAtiva);
}
