"use client";

import { isVideoMime, type ModoInteracao } from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { isExpired, mediaUrls, type MediaUrl } from "@/lib/media";

/** Feed do convidado no cliente — a regra do gate mora no servidor; repetir aqui criaria segunda fonte de verdade que diverge no primeiro botão de pânico. */

/** `chaveFull`/`criadaEm` entram (evita segundo round-trip); `reacoes`/`minhaReacao` em qualquer modo; `sessaoAutor`/`minha` só pós-gate (identidade do autor). */
export type ItemVisivel = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  autor: string;
  legenda: string | null;
  lugar: string | null;
  /** Instante do JSON, não `Date`: quem agrupa por hora converte. */
  criadaEm: string;
  largura?: number;
  altura?: number;
  reacoes?: number;
  minhaReacao?: string | null;
  sessaoAutor?: string;
  minha?: boolean;
};

/** O cliente ramifica no motivo, nunca no texto da mensagem. */
export type FalhaFeed = "rede" | "cursor" | "sessao";

export type EstadoFeed = {
  itens: ItemVisivel[];
  cursor: string | null;
  fim: boolean;
  carregando: boolean;
  jaCarregou: boolean;
  falha: FalhaFeed | null;
  urls: Map<string, MediaUrl>;
  midiaIndisponivel: boolean;
  interacao: ModoInteracao;
};

export type PaginaVisivel = {
  itens: ItemVisivel[];
  proximoCursor: string | null;
  interacao: ModoInteracao;
};

/** Próxima página faz sentido: não é fim nem falha pendente (falha exige toque do convidado; `carregando` é guardado por `carregarMais`). */
export function podeCarregarMais(estado: EstadoFeed): boolean {
  return !estado.fim && estado.falha === null;
}

/** Nasce `carregando: true` — estado do servidor, primeira tela com molduras no lugar sem piscar vazio (3G lento: essa diferença é a tela inteira). */
export function estadoInicial(): EstadoFeed {
  return {
    itens: [],
    cursor: null,
    fim: false,
    carregando: true,
    jaCarregou: false,
    falha: null,
    urls: new Map(),
    midiaIndisponivel: false,
    interacao: "espelho",
  };
}

/** Junta página nova sem repetir item — cursor `(created_at, id)` impede repetição; deduplicação cobre retentativa. */
export function comPagina(estado: EstadoFeed, pagina: PaginaVisivel): EstadoFeed {
  const vistos = new Set(estado.itens.map((i) => i.id));
  const novos = pagina.itens.filter((i) => !vistos.has(i.id));

  return {
    ...estado,
    itens: novos.length > 0 ? [...estado.itens, ...novos] : estado.itens,
    cursor: pagina.proximoCursor,
    fim: pagina.proximoCursor === null,
    carregando: false,
    jaCarregou: true,
    falha: null,
    interacao: pagina.interacao,
  };
}

/** Guarda o motivo preservando o que está na tela — descartar jogaria a rolagem ao topo, pior que o erro; quem volta é o convidado por toque. */
export function comFalha(estado: EstadoFeed, falha: FalhaFeed): EstadoFeed {
  return { ...estado, carregando: false, jaCarregou: true, falha };
}

/** Volta ao início mantendo cache de URLs (troca de filtro não repede mídia); nasce `carregando` para não piscar vazio. */
export function reiniciado(estado: EstadoFeed): EstadoFeed {
  return {
    ...estado,
    itens: [],
    cursor: null,
    fim: false,
    carregando: true,
    jaCarregou: false,
    falha: null,
  };
}

/** Chaves sem URL viva em lote (`extras` inclui janela do visualizador tela cheia) — uma requisição por foto travaria a rolagem. */
export function chavesSemUrl(
  estado: EstadoFeed,
  agora: number,
  extras: readonly string[] = [],
): string[] {
  const faltando = new Set<string>();

  const conferir = (chave: string) => {
    const url = estado.urls.get(chave);
    if (!url || isExpired(url, agora)) faltando.add(chave);
  };

  for (const item of estado.itens) {
    conferir(item.chaveThumb);
    if (isVideoMime(item.mime)) conferir(item.chaveFull);
  }
  for (const chave of extras) conferir(chave);

  return [...faltando];
}

/** Devolve o mesmo objeto quando não há URL nova — objeto novo a cada volta faria o efeito buscar sem parar. */
export function comUrls(estado: EstadoFeed, novas: Map<string, MediaUrl>): EstadoFeed {
  const urls = new Map(estado.urls);
  let mudou = false;

  for (const [chave, nova] of novas) {
    const atual = urls.get(chave);
    if (atual && atual.url === nova.url && atual.expiraEm === nova.expiraEm) continue;
    urls.set(chave, nova);
    mudou = true;
  }

  if (!mudou) return estado.midiaIndisponivel ? { ...estado, midiaIndisponivel: false } : estado;

  return { ...estado, urls, midiaIndisponivel: false };
}

/** Mesmo objeto quando falha já estava marcada — objeto novo a cada falha faria o efeito de URL pedir sem parar. */
export function comFalhaDeMidia(estado: EstadoFeed): EstadoFeed {
  return estado.midiaIndisponivel ? estado : { ...estado, midiaIndisponivel: true };
}

export type RespostaFeed = { ok: true; pagina: PaginaVisivel } | { ok: false; falha: FalhaFeed };

/** Formato de item da rede (`/api/feed` e `/api/guests/:id`); exportado com `itemDeRede` para que os dois lados concordem na desserialização. */
export type ItemDaRede = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  autor: string;
  legenda: string | null;
  lugar: string | null;
  criadaEm: string;
  largura?: number;
  altura?: number;
  reacoes?: number;
  minhaReacao?: string | null;
  sessaoAutor?: string;
  minha?: boolean;
};

export function itemDeRede(i: ItemDaRede): ItemVisivel {
  return {
    id: i.id,
    chaveThumb: i.chaveThumb,
    chaveFull: typeof i.chaveFull === "string" ? i.chaveFull : "",
    mime: typeof i.mime === "string" ? i.mime : "image/jpeg",
    autor: i.autor,
    legenda: i.legenda ?? null,
    lugar: i.lugar ?? null,
    criadaEm: typeof i.criadaEm === "string" ? i.criadaEm : "",
    ...(typeof i.largura === "number" && typeof i.altura === "number"
      ? { largura: i.largura, altura: i.altura }
      : {}),
    ...(typeof i.reacoes === "number" ? { reacoes: i.reacoes } : {}),
    ...(i.minhaReacao !== undefined ? { minhaReacao: i.minhaReacao } : {}),
    ...(typeof i.sessaoAutor === "string" ? { sessaoAutor: i.sessaoAutor } : {}),
    ...(typeof i.minha === "boolean" ? { minha: i.minha } : {}),
  };
}

/** Página do feed — cursor volta como veio (nunca deslocamento calculado aqui; foto nova durante a rolagem repetiria/engolia item). */
export async function buscarPagina(missaoId: string | null, cursor: string | null): Promise<RespostaFeed> {
  const parametros = new URLSearchParams();
  if (missaoId !== null) parametros.set("missao", missaoId);
  if (cursor !== null) parametros.set("cursor", cursor);

  const consulta = parametros.toString();

  let res: Response;
  try {
    res = await fetch(consulta ? `/api/feed?${consulta}` : "/api/feed", {
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, falha: "rede" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, falha: "sessao" };

  if (!res.ok) {
    const code = await codigoDoErro(res);
    return { ok: false, falha: code === "feed.cursor_invalido" ? "cursor" : "rede" };
  }

  let corpo: {
    itens?: ItemDaRede[];
    proximoCursor?: string | null;
    interacao?: ModoInteracao;
  };
  try {
    corpo = (await res.json()) as {
      itens?: ItemDaRede[];
      proximoCursor?: string | null;
      interacao?: ModoInteracao;
    };
  } catch {
    return { ok: false, falha: "rede" };
  }

  const interacao = corpo.interacao === "completo" ? "completo" : "espelho";

  return {
    ok: true,
    pagina: {
      itens: (corpo.itens ?? []).map(itemDeRede),
      proximoCursor: corpo.proximoCursor ?? null,
      interacao,
    },
  };
}

/** Exportada porque `use-author-feed.ts` lê `/api/guests/:id` com a mesma forma e ramifica no mesmo `code` — duplicar divergiria. */
export async function codigoDoErro(res: Response): Promise<string | null> {
  try {
    const corpo = (await res.json()) as { code?: string };
    return corpo.code ?? null;
  } catch {
    return null;
  }
}

/** Exportada porque `use-author-feed.ts` renova URLs assinadas no mesmo ritmo — duplicar o valor divergiria. */
export const INTERVALO_DE_RENOVACAO_MS = 30_000;

/** Enquanto o gate está fechado, confere se a interação abriu (spec 007). */
const INTERVALO_DO_GATE_MS = 30_000;

/** Mescla a primeira página do servidor no topo do feed; fotos retiradas somem sem reiniciar a rolagem — convidado só perde o que o telão já perdeu. */
export function sincronizarTopo(estado: EstadoFeed, pagina: PaginaVisivel): EstadoFeed {
  if (pagina.itens.length === 0) return { ...estado, interacao: pagina.interacao };

  const novos = new Map(pagina.itens.map((i) => [i.id, i]));
  const novosIds = new Set(novos.keys());
  const janela = pagina.itens.length;
  const topoAntigo = new Set(estado.itens.slice(0, janela).map((i) => i.id));

  const cauda = estado.itens.filter((i) => {
    if (novosIds.has(i.id)) return false;
    if (topoAntigo.has(i.id)) return false;
    return true;
  });

  const mesclados = [...pagina.itens, ...cauda];
  const vistos = new Set<string>();
  const itens = mesclados.filter((i) => {
    if (vistos.has(i.id)) return false;
    vistos.add(i.id);
    return true;
  });

  return { ...estado, itens, interacao: pagina.interacao };
}

export function useFeed(missaoId: string | null) {
  const [estado, setEstado] = useState<EstadoFeed>(estadoInicial);
  const geracao = useRef(0);
  const buscandoPagina = useRef(false);
  const buscandoUrls = useRef(false);
  const ultimoLote = useRef("");
  const refazer = useRef(false);

  /** Janela do visualizador em tela cheia: pedida pela tela (não parâmetro) — seria ciclo; assinatura no estado reabre efeito; lista em ref para o relógio não pedir janela antiga. */
  const [janela, setJanela] = useState("");
  const janelaViva = useRef<readonly string[]>([]);

  const pedirChaves = useCallback((chaves: readonly string[]) => {
    janelaViva.current = chaves;
    const assinatura = chaves.join(" ");
    setJanela((antes) => (antes === assinatura ? antes : assinatura));
  }, []);

  const carregar = useCallback(
    async (cursor: string | null) => {
      if (buscandoPagina.current) return;

      const minha = geracao.current;
      buscandoPagina.current = true;
      setEstado((e) => ({ ...e, carregando: true, falha: null }));

      const r = await buscarPagina(missaoId, cursor);

      // Resposta de um filtro que o convidado já trocou não entra na tela — e
      // sai sem liberar a trava, que já pertence à busca que a substituiu.
      if (minha !== geracao.current) return;

      buscandoPagina.current = false;
      setEstado((e) => (r.ok ? comPagina(e, r.pagina) : comFalha(e, r.falha)));
    },
    [missaoId],
  );

  useEffect(() => {
    geracao.current += 1;
    buscandoPagina.current = false;
    setEstado(reiniciado);
    void carregar(null);
  }, [carregar]);

  useEffect(() => {
    let vivo = true;

    async function renovar(porRelogio: boolean) {
      // Um pedido em voo não é motivo para desistir da janela nova: ela chegou
      // depois, e sem esta marca a foto aberta ficaria sem o arquivo cheio até
      // o tique seguinte.
      if (buscandoUrls.current) {
        refazer.current = true;
        return;
      }

      const faltando = chavesSemUrl(estado, Date.now(), janelaViva.current);
      if (faltando.length === 0) return;

      // O mesmo lote só volta ao servidor no tique seguinte. Sem este teto, uma
      // chave que o servidor nunca assina viraria requisição em laço.
      const assinatura = faltando.join(",");
      if (!porRelogio && assinatura === ultimoLote.current) return;
      ultimoLote.current = assinatura;

      buscandoUrls.current = true;
      try {
        const novas = await mediaUrls(faltando);
        if (vivo) setEstado((e) => comUrls(e, novas));
      } catch {
        // Sem URL a grade mostra a moldura vazia e segue. A mídia é enriquecimento
        // da tela; derrubar o feed inteiro por causa dela seria pior que degradar.
        if (vivo) setEstado(comFalhaDeMidia);
      } finally {
        buscandoUrls.current = false;
        if (refazer.current && vivo) {
          refazer.current = false;
          void renovar(false);
        }
      }
    }

    void renovar(false);
    const relogio = setInterval(() => void renovar(true), INTERVALO_DE_RENOVACAO_MS);

    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, [estado, janela]);

  const carregarMais = useCallback(() => {
    if (estado.fim || estado.cursor === null || estado.carregando) return;
    void carregar(estado.cursor);
  }, [carregar, estado.fim, estado.cursor, estado.carregando]);

  const recomecar = useCallback(() => {
    geracao.current += 1;
    buscandoPagina.current = false;
    setEstado(reiniciado);
    void carregar(null);
  }, [carregar]);

  useEffect(() => {
    if (!estado.jaCarregou) return;

    const vigiar = async () => {
      const r = await buscarPagina(missaoId, null);
      if (!r.ok) return;

      if (estado.interacao === "espelho" && r.pagina.interacao === "completo") {
        recomecar();
        return;
      }

      if (estado.interacao === "completo") {
        setEstado((e) => sincronizarTopo(e, r.pagina));
      }
    };

    const relogio = setInterval(() => void vigiar(), INTERVALO_DO_GATE_MS);
    return () => clearInterval(relogio);
  }, [estado.interacao, estado.jaCarregou, missaoId, recomecar]);

  const atualizarReacoes = useCallback((uploadId: string, resultado: { reacoes: number; minha: string | null }) => {
    setEstado((e) => ({
      ...e,
      itens: e.itens.map((i) =>
        i.id === uploadId
          ? { ...i, reacoes: resultado.reacoes, minhaReacao: resultado.minha }
          : i,
      ),
    }));
  }, []);

  return { estado, carregarMais, recomecar, pedirChaves, atualizarReacoes };
}
