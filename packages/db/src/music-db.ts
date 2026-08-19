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

/**
 * Persistencia da musica do casal (spec 018, camada 1 do ADR 0011): metadado e
 * link, nunca bytes de audio.
 *
 * O `event_id` **nao vem do cliente**: vem da transacao ja escopada por
 * `comEvento`, e a politica de RLS ainda o confere — duas camadas para a mesma
 * invariante. O `provider` gravado e conferido contra o conjunto fechado do
 * nucleo antes de qualquer escrita: o que nao esta em `PROVEDORES` nao entra.
 */

function provedorNoConjunto(provedor: string): provedor is Provedor {
  return (PROVEDORES as readonly string[]).includes(provedor);
}

/**
 * Recusa provedor fora do conjunto fechado antes do INSERT.
 *
 * O `link` chega ja parseado por `lerLinkDeMusica`, que valida o host — esta e
 * a segunda barreira, na fronteira da escrita, para o caso de o chamador montar
 * um `LinkDeMusica` a mao.
 */
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

/**
 * Grava (ou substitui) a faixa escolhida pelo casal. Uma por evento — o
 * `ON CONFLICT (event_id) DO UPDATE` troca a escolha sem criar uma segunda.
 *
 * O metadado e opcional: sem titulo, a exibicao cai para o link cru. Resolver
 * capa e titulo e enriquecimento e mora fora deste caminho.
 */
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

/**
 * A musica do casal, de dentro de uma transacao ja escopada. Devolve `null`
 * quando o evento nao tem musica configurada — todas as telas funcionam sem
 * buraco de layout, que e a verificacao 5 da spec.
 */
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

/**
 * Enfileira a sugestao de um convidado, uma vez so.
 *
 * `ON CONFLICT DO NOTHING` sobre `(event_id, session_id, provider,
 * content_type, identifier)`: a mesma sessao sugerindo a mesma faixa duas vezes
 * continua valendo um voto — como a reacao, sobrevive a toque duplo e a retry
 * de rede. `inserida` distingue voto novo de repetido para o log.
 *
 * O teto por sessao e o gate de interacao sao regra de dominio e ficam em
 * `registrarSugestao` do nucleo, avaliados antes desta chamada.
 */
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

/**
 * A fila de sugestoes do evento, reconstruida como `FaixaSugerida[]` para
 * `ordenarSugestoes` do nucleo consumir.
 *
 * Uma linha por faixa: as sessoes distintas viram os votos, e a primeira a
 * chegar fixa `primeiroEm` — o desempate estavel que impede a lista de se
 * reordenar sozinha no telao. A ordenacao final e do nucleo, nao daqui; a
 * clausula `ORDER BY` existe so para o primeiro a sugerir sair primeiro.
 */
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
      // A primeira linha a chegar pra esta faixa fixa `id` junto com
      // `primeiroEm` — o mesmo desempate estável, e o `id` que `criarStory`
      // valida quando a story anexa esta faixa.
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
