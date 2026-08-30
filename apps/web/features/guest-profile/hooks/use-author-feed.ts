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
  INTERVALO_DE_RENOVACAO_MS,
  itemDeRede,
  type EstadoFeed,
  type FalhaFeed,
  type ItemDaRede,
  type ItemVisivel,
  type PaginaVisivel,
} from "@/features/feed/hooks/use-feed";

/** Perfil do convidado no cliente — reusa reducer do feed (`comPagina`…`estadoInicial`); muda só a rota (`/api/guests/:id`) e ausência do gate-poll. */

/** Além dos motivos do feed: o id não corresponde a ninguém que este leitor possa ver. */
export type FalhaPerfil = FalhaFeed | "nao_encontrado";

export type StatsPerfil = {
  totalFotos: number;
  totalCurtidas: number;
};

export type EstadoPerfil = {
  nome: string | null;
  /** Terminal: id de outro evento, sessão bloqueada ou antes do gate chegam aqui do mesmo jeito — indistinguíveis por design. */
  naoEncontrado: boolean;
  stats: StatsPerfil | null;
  feed: EstadoFeed;
};

export function estadoInicialPerfil(): EstadoPerfil {
  return { nome: null, naoEncontrado: false, stats: null, feed: estadoInicial() };
}

export type RespostaPerfil =
  | { ok: true; nome: string; stats: StatsPerfil; pagina: PaginaVisivel }
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

  let corpo: {
    nome?: unknown;
    totalFotos?: unknown;
    totalCurtidas?: unknown;
    itens?: ItemDaRede[];
    proximoCursor?: string | null;
  };
  try {
    corpo = (await res.json()) as typeof corpo;
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (typeof corpo.nome !== "string") return { ok: false, falha: "nao_encontrado" };

  const totalFotos = typeof corpo.totalFotos === "number" && Number.isFinite(corpo.totalFotos) ? corpo.totalFotos : 0;
  const totalCurtidas =
    typeof corpo.totalCurtidas === "number" && Number.isFinite(corpo.totalCurtidas) ? corpo.totalCurtidas : 0;

  const itens: ItemVisivel[] = (corpo.itens ?? []).map(itemDeRede);

  return {
    ok: true,
    nome: corpo.nome,
    stats: { totalFotos, totalCurtidas },
    pagina: {
      itens,
      proximoCursor: corpo.proximoCursor ?? null,
      interacao: "completo",
    },
  };
}

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
        if (r.ok) {
          return {
            nome: r.nome,
            stats: r.stats,
            naoEncontrado: false,
            feed: comPagina(e.feed, r.pagina),
          };
        }
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
