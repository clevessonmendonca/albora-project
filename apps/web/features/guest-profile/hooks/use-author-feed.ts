"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrls } from "@/lib/media";
import {
  chavesSemUrl,
  codigoDoErro,
  comFalha,
  comPagina,
  comUrls,
  estadoInicial,
  itemDeRede,
  type EstadoFeed,
  type FalhaFeed,
  type ItemDaRede,
  type ItemVisivel,
  type PaginaVisivel,
} from "@/features/feed/hooks/use-feed";

/**
 * O perfil de um convidado, do lado do cliente — as fotos publicadas por uma
 * sessão, dentro deste evento.
 *
 * Reaproveita o reducer do feed principal (`comPagina`, `comFalha`,
 * `chavesSemUrl`, `comUrls`, `estadoInicial`): cursor, deduplicação e lote de
 * URLs assinadas são a mesma regra, e duplicar essa lógica aqui divergiria no
 * primeiro ajuste feito só de um lado. O que muda é a rota (`/api/guests/:id`
 * em vez de `/api/feed`) e a ausência do polling de gate — o perfil só existe
 * depois que a interação abriu, então não há "abriu agora" para vigiar.
 */

/** Além dos motivos do feed: o id não corresponde a ninguém que este leitor possa ver. */
export type FalhaPerfil = FalhaFeed | "nao_encontrado";

export type EstadoPerfil = {
  nome: string | null;
  /**
   * Terminal, não motivo de "tentar de novo": id de outro evento, sessão
   * bloqueada ou perfil que ainda não existe (antes do gate) chegam aqui do
   * mesmo jeito — quem lê não tem como distinguir os três, e não deveria.
   */
  naoEncontrado: boolean;
  feed: EstadoFeed;
};

export function estadoInicialPerfil(): EstadoPerfil {
  return { nome: null, naoEncontrado: false, feed: estadoInicial() };
}

export type RespostaPerfil =
  | { ok: true; nome: string; pagina: PaginaVisivel }
  | { ok: false; falha: FalhaPerfil };

export async function buscarPaginaDoAutor(
  autorId: string,
  cursor: string | null,
): Promise<RespostaPerfil> {
  const parametros = new URLSearchParams();
  if (cursor !== null) parametros.set("cursor", cursor);
  const consulta = parametros.toString();

  let res: Response;
  try {
    res = await fetch(consulta ? `/api/guests/${autorId}?${consulta}` : `/api/guests/${autorId}`, {
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };
  if (res.status === 404) return { ok: false, falha: "nao_encontrado" };

  if (!res.ok) {
    const code = await codigoDoErro(res);
    return { ok: false, falha: code === "feed.cursor_invalido" ? "cursor" : "rede" };
  }

  let corpo: { nome?: unknown; itens?: ItemDaRede[]; proximoCursor?: string | null };
  try {
    corpo = (await res.json()) as typeof corpo;
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (typeof corpo.nome !== "string") return { ok: false, falha: "nao_encontrado" };

  const itens: ItemVisivel[] = (corpo.itens ?? []).map(itemDeRede);

  return {
    ok: true,
    nome: corpo.nome,
    pagina: {
      itens,
      proximoCursor: corpo.proximoCursor ?? null,
      interacao: "completo",
    },
  };
}

const INTERVALO_DE_RENOVACAO_MS = 30_000;

export function useAuthorFeed(autorId: string) {
  const [estado, setEstado] = useState<EstadoPerfil>(estadoInicialPerfil);
  const geracao = useRef(0);
  const buscandoPagina = useRef(false);
  const buscandoUrls = useRef(false);

  const carregar = useCallback(
    async (cursor: string | null) => {
      if (buscandoPagina.current) return;

      const minha = geracao.current;
      buscandoPagina.current = true;
      setEstado((e) => ({ ...e, feed: { ...e.feed, carregando: true, falha: null } }));

      const r = await buscarPaginaDoAutor(autorId, cursor);

      // Resposta de um perfil que o convidado já trocou não entra na tela — e
      // sai sem liberar a trava, que já pertence à busca que a substituiu.
      if (minha !== geracao.current) return;

      buscandoPagina.current = false;
      setEstado((e) => {
        if (r.ok) return { nome: r.nome, naoEncontrado: false, feed: comPagina(e.feed, r.pagina) };
        if (r.falha === "nao_encontrado") {
          return {
            ...e,
            naoEncontrado: true,
            feed: { ...e.feed, carregando: false, jaCarregou: true, falha: null },
          };
        }
        return { ...e, feed: comFalha(e.feed, r.falha) };
      });
    },
    [autorId],
  );

  useEffect(() => {
    geracao.current += 1;
    setEstado(estadoInicialPerfil());
    buscandoPagina.current = false;
    void carregar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia quando o id do autor muda, `carregar` já depende dele
  }, [autorId]);

  useEffect(() => {
    let vivo = true;

    async function renovar() {
      if (buscandoUrls.current) return;
      const faltando = chavesSemUrl(estado.feed, Date.now());
      if (faltando.length === 0) return;

      buscandoUrls.current = true;
      try {
        const novas = await mediaUrls(faltando);
        if (vivo) setEstado((e) => ({ ...e, feed: comUrls(e.feed, novas) }));
      } catch {
        // Mídia é enriquecimento — a grade fica com a moldura vazia e segue.
      } finally {
        buscandoUrls.current = false;
      }
    }

    void renovar();
    const relogio = setInterval(() => void renovar(), INTERVALO_DE_RENOVACAO_MS);
    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, [estado.feed]);

  const carregarMais = useCallback(() => {
    if (estado.feed.fim || estado.feed.cursor === null || estado.feed.carregando) return;
    void carregar(estado.feed.cursor);
  }, [carregar, estado.feed.fim, estado.feed.cursor, estado.feed.carregando]);

  return { estado, carregarMais };
}
