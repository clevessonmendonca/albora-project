import type { PoolClient } from "pg";
import {
  chaveDaFaixa,
  PROVEDORES,
  type FaixaSugerida,
  type LinkDeMusica,
  type MetadadoDaMusica,
  type MusicaDoEvento,
  type Provedor,
  type TipoDeConteudo,
} from "@albora/core";

/** 🔴 event_id vem da transação comEvento, não do cliente. provider conferido contra PROVEDORES antes de qualquer escrita. */

function provedorNoConjunto(provedor: string): provedor is Provedor {
  return (PROVEDORES as readonly string[]).includes(provedor);
}

/** Segunda barreira no INSERT: provider deve estar em PROVEDORES do núcleo. */
export class ErroProvedorForaDoConjunto extends Error {
  readonly code = "musica.provedor_fora_da_lista";
  constructor(readonly provedor: string) {
    super("provedor fora do conjunto fechado");
  }
}

type LinhaMusica = {
  provider: string;
  content_type: string;
  identifier: string;
  region: string | null;
  url: string;
  title: string | null;
  artist: string | null;
  cover_url: string | null;
};

export function linkDaLinha(l: {
  provider: string;
  content_type: string;
  identifier: string;
  region: string | null;
  url: string;
}): LinkDeMusica {
  return {
    provedor: l.provider as Provedor,
    tipo: l.content_type as TipoDeConteudo,
    identificador: l.identifier,
    regiao: l.region,
    url: l.url,
  };
}

export async function definirMusicaDoCasal(
  cliente: PoolClient,
  entrada: { eventoId: string; link: LinkDeMusica; metadado: MetadadoDaMusica | null },
): Promise<void> {
  if (!provedorNoConjunto(entrada.link.provedor)) {
    throw new ErroProvedorForaDoConjunto(entrada.link.provedor);
  }

  const { link, metadado } = entrada;
  await cliente.query(
    `INSERT INTO event_music
       (event_id, provider, content_type, identifier, region, url, title, artist, cover_url, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (event_id) DO UPDATE SET
       provider     = EXCLUDED.provider,
       content_type = EXCLUDED.content_type,
       identifier   = EXCLUDED.identifier,
       region       = EXCLUDED.region,
       url          = EXCLUDED.url,
       title        = EXCLUDED.title,
       artist       = EXCLUDED.artist,
       cover_url    = EXCLUDED.cover_url,
       updated_at   = now()`,
    [
      entrada.eventoId,
      link.provedor,
      link.tipo,
      link.identificador,
      link.regiao,
      link.url,
      metadado?.titulo ?? null,
      metadado?.artista ?? null,
      metadado?.capaUrl ?? null,
    ],
  );
}

export async function musicaDoCasal(
  cliente: PoolClient,
  eventoId: string,
): Promise<MusicaDoEvento | null> {
  const { rows } = await cliente.query<LinhaMusica>(
    `SELECT provider, content_type, identifier, region, url, title, artist, cover_url
       FROM event_music WHERE event_id = $1`,
    [eventoId],
  );

  const l = rows[0];
  if (!l) return null;

  const metadado: MetadadoDaMusica | null =
    l.title === null ? null : { titulo: l.title, artista: l.artist, capaUrl: l.cover_url };

  return { link: linkDaLinha(l), metadado };
}

/** ON CONFLICT (event_id, session_id, provider, content_type, identifier) DO NOTHING — retry idempotente, mesmo voto vale um. */
export async function adicionarSugestao(
  cliente: PoolClient,
  entrada: {
    eventoId: string;
    sessaoId: string;
    link: LinkDeMusica;
    metadado?: MetadadoDaMusica | null;
  },
): Promise<{ inserida: boolean }> {
  if (!provedorNoConjunto(entrada.link.provedor)) {
    throw new ErroProvedorForaDoConjunto(entrada.link.provedor);
  }

  const { link, metadado } = entrada;
  const { rowCount } = await cliente.query(
    `INSERT INTO music_suggestions
       (event_id, session_id, provider, content_type, identifier, region, url, title, artist)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (event_id, session_id, provider, content_type, identifier) DO NOTHING`,
    [
      entrada.eventoId,
      entrada.sessaoId,
      link.provedor,
      link.tipo,
      link.identificador,
      link.regiao,
      link.url,
      metadado?.titulo ?? null,
      metadado?.artista ?? null,
    ],
  );

  return { inserida: (rowCount ?? 0) > 0 };
}

type LinhaSugestao = {
  id: string;
  provider: string;
  content_type: string;
  identifier: string;
  region: string | null;
  url: string;
  title: string | null;
  artist: string | null;
  session_id: string;
  primeiro_ms: string;
};

export function metadadoDaSugestao(l: { title: string | null; artist: string | null }): MetadadoDaMusica | null {
  if (l.title === null || l.title.trim() === "") return null;
  return { titulo: l.title, artista: l.artist, capaUrl: null };
}

/** Uma linha por faixa; sessões distintas viram votos; primeira a chegar fixa primeiroEm — desempate estável. */
export async function listarSugestoes(
  cliente: PoolClient,
  eventoId: string,
): Promise<FaixaSugerida[]> {
  const { rows } = await cliente.query<LinhaSugestao>(
    `SELECT id, provider, content_type, identifier, region, url, title, artist, session_id,
            (extract(epoch from created_at) * 1000)::bigint AS primeiro_ms
       FROM music_suggestions
      WHERE event_id = $1
      ORDER BY created_at ASC, id ASC`,
    [eventoId],
  );

  const porChave = new Map<
    string,
    {
      chave: string;
      link: LinkDeMusica;
      sessoes: string[];
      primeiroEm: number;
      metadado: MetadadoDaMusica | null;
      id: string;
    }
  >();

  for (const l of rows) {
    const link = linkDaLinha(l);
    const chave = chaveDaFaixa(link);
    const existente = porChave.get(chave);
    const metadado = metadadoDaSugestao(l);

    if (existente === undefined) {
      // Fixa id e primeiroEm na primeira linha — desempate estável; id validado por criarStory.
      porChave.set(chave, {
        chave,
        link,
        sessoes: [l.session_id],
        primeiroEm: Number(l.primeiro_ms),
        metadado,
        id: l.id,
      });
    } else {
      if (!existente.sessoes.includes(l.session_id)) {
        existente.sessoes.push(l.session_id);
      }
      if (existente.metadado === null && metadado !== null) {
        existente.metadado = metadado;
      }
    }
  }

  return [...porChave.values()];
}
