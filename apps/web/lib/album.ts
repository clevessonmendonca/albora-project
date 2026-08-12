import { montarAlbum, type PlanoDoAlbum, TETO_DE_PAGINAS_PADRAO } from "@albora/core";
import { comEvento, janelaDoAlbum, listarMidiaDoAlbum } from "@albora/db";
import { banco } from "./banco";
import { assinarGet } from "./r2";

/**
 * A montagem servida do álbum da noite (spec 016).
 *
 * O servidor **nunca serve mídia**: assina URLs de leitura e o navegador busca
 * os bytes direto no object storage. A montagem é derivada — corre
 * `montarAlbum()` do `@albora/core` sobre a mídia publicada do evento, e o
 * núcleo é a única fonte da diagramação por slots.
 *
 * O que sai daqui não carrega contagem de reação (verificação 5 da spec: sem
 * contagem visível), nem a chave de storage, nem nome de convidado. O que o
 * cliente recebe é onde cada foto entra na página e a URL para buscá-la.
 */

/** Sem coluna de fuso no schema; ancora no fuso do evento, como o núcleo pede. */
const OFFSET_DO_EVENTO_MINUTOS = -180;

/**
 * Validade da URL de leitura, igual à do lote da mídia. O cliente renova o
 * álbum inteiro de uma vez quando `expiraEm` passa.
 */
export const VALIDADE_GET_SEGUNDOS = 900;

export type SlotServido = { id: string; proporcao: string; fracao: number };

export type FotoServida = {
  id: string;
  url: string;
  urlThumb: string;
  slot: SlotServido;
};

export type PaginaServida = {
  layoutId: string;
  amanhecer: boolean;
  hora: number | null;
  inicioDaHora: string | null;
  lugarId: string | null;
  fotos: FotoServida[];
};

export type CapituloServido = {
  id: string;
  comecaEm: string | null;
  paginas: PaginaServida[];
};

export type AlbumServido = {
  capitulos: CapituloServido[];
  totalDePaginas: number;
  contadores: { fotos: number; convidados: number; missoes: number };
  expiraEm: number;
};

const VAZIO = (expiraEm: number): AlbumServido => ({
  capitulos: [],
  totalDePaginas: 0,
  contadores: { fotos: 0, convidados: 0, missoes: 0 },
  expiraEm,
});

export async function montarAlbumServido(eventoId: string): Promise<AlbumServido> {
  const expiraEm = Date.now() + VALIDADE_GET_SEGUNDOS * 1000;

  const dados = await comEvento(banco(), eventoId, async (c) => {
    const midias = await listarMidiaDoAlbum(c, eventoId);
    const janela = await janelaDoAlbum(c, eventoId);
    return { midias, janela };
  });

  if (!dados.janela || dados.midias.length === 0) return VAZIO(expiraEm);

  const plano: PlanoDoAlbum = {
    janela: {
      comecaEm: dados.janela.comecaEm,
      terminaEm: dados.janela.terminaEm,
      offsetMinutos: OFFSET_DO_EVENTO_MINUTOS,
    },
    capitulos: [],
    tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
  };

  const album = montarAlbum(dados.midias, plano);

  // A chave nunca sai do servidor; o mapa liga o id da foto montada à chave que
  // será assinada, sem confiar em campo que o núcleo não declara no seu tipo.
  const chavePorId = new Map(
    dados.midias.map((m) => [m.id, { full: m.chaveFull, thumb: m.chaveThumb }] as const),
  );

  const capitulos = await Promise.all(
    album.capitulos.map(async (capitulo) => ({
      id: capitulo.id,
      comecaEm: capitulo.comecaEm?.toISOString() ?? null,
      paginas: await Promise.all(
        capitulo.paginas.map(async (pagina) => ({
          layoutId: pagina.layoutId,
          amanhecer: pagina.amanhecer,
          hora: pagina.hora,
          inicioDaHora: pagina.inicioDaHora?.toISOString() ?? null,
          lugarId: pagina.lugarId,
          fotos: await Promise.all(
            pagina.fotos.map(async (foto) => {
              const chave = chavePorId.get(foto.midia.id);
              const [url, urlThumb] = await Promise.all([
                chave ? assinarGet(chave.full, VALIDADE_GET_SEGUNDOS) : Promise.resolve(""),
                chave ? assinarGet(chave.thumb, VALIDADE_GET_SEGUNDOS) : Promise.resolve(""),
              ]);
              return {
                id: foto.midia.id,
                url,
                urlThumb,
                slot: {
                  id: foto.slot.id,
                  proporcao: foto.slot.proporcao,
                  fracao: foto.slot.fracao,
                },
              };
            }),
          ),
        })),
      ),
    })),
  );

  return {
    capitulos,
    totalDePaginas: album.totalDePaginas,
    contadores: album.contadores,
    expiraEm,
  };
}
