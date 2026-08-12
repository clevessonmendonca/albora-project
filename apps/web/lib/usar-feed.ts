"use client";

import type { ModoInteracao } from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { expirou, urlsDeMidia, type UrlDeMidia } from "./midia";

/**
 * O feed do convidado, do lado do cliente.
 *
 * Ele existe para o convidado ver o que os outros mandaram e, por isso, mandar
 * mais (ADR 0009). Nada aqui premia ficar: a página é curta, a próxima só vem
 * quando alguém pede, e não há laço que se realimente sozinho.
 *
 * 🔴 A regra do gate **não** mora aqui. Quem decide o que é visível é o
 * servidor; repetir a decisão no cliente criaria uma segunda fonte de verdade,
 * e ela divergiria no primeiro botão de pânico.
 */

/**
 * A projeção que a tela enxerga.
 *
 * 🔴 Sem `reacoes`, e isso não muda: a contagem nem é calculada antes do gate, e
 * mantê-la fora do tipo é o lugar mais barato de torná-la inalcançável na tela.
 *
 * `chaveFull` e `criadaEm` **entram**, porque o visualizador em tela cheia e a
 * tira de horas passaram a viver nesta mesma tela: o arquivo cheio é o que a
 * tela cheia mostra, e o instante é o que forma a hora. Buscá-los por um segundo
 * caminho seria pedir a mesma página do feed duas vezes por aparelho.
 *
 * `reacoes` e `minhaReacao` só existem depois do gate — o servidor omite antes.
 */
export type ItemVisivel = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  autor: string;
  legenda: string | null;
  lugar: string | null;
  /** Instante do JSON, não `Date`: quem agrupa por hora converte. */
  criadaEm: string;
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
  urls: Map<string, UrlDeMidia>;
  midiaIndisponivel: boolean;
  interacao: ModoInteracao;
};

export type PaginaVisivel = {
  itens: ItemVisivel[];
  proximoCursor: string | null;
  interacao: ModoInteracao;
};

/**
 * Já nasce carregando: é o estado que o servidor renderiza, e por isso a
 * primeira tela chega com as molduras no lugar em vez de um vazio que pisca
 * até o efeito rodar. Em 3G lento essa diferença é a tela inteira.
 */
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

/**
 * Junta a página nova ao que já está na tela, sem repetir item.
 *
 * O cursor `(created_at, id)` já impede a repetição entre páginas seguidas; a
 * deduplicação cobre a retentativa, em que a mesma página chega duas vezes.
 */
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

/**
 * Guarda o motivo e **preserva o que já está na tela**.
 *
 * Vale para o cursor recusado com 422: descartar os itens jogaria a rolagem
 * para o topo sozinha, que é pior que o erro. Quem volta ao começo é o
 * convidado, por toque próprio.
 */
export function comFalha(estado: EstadoFeed, falha: FalhaFeed): EstadoFeed {
  return { ...estado, carregando: false, jaCarregou: true, falha };
}

/**
 * Volta ao começo mantendo o cache de URLs — trocar o filtro e voltar não
 * repete o pedido de mídia das mesmas fotos.
 *
 * Sai daqui já carregando porque a busca da primeira página vem logo atrás;
 * sem isso a grade pisca vazia entre a troca de filtro e a resposta.
 */
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

/**
 * As chaves da tela que ainda não têm URL viva, em lote e sem repetição.
 *
 * Uma requisição por foto no meio de uma rolagem é a própria travada — daí o
 * lote. `expirou` conta a folga de renovação: pedir no instante da expiração
 * já chega tarde.
 *
 * `extras` é a janela do visualizador em tela cheia — o arquivo cheio da foto
 * aberta e das próximas. Entra no mesmo lote de propósito: são as mesmas chaves,
 * do mesmo evento, e dois lotes seriam duas requisições para a mesma resposta.
 */
export function chavesSemUrl(
  estado: EstadoFeed,
  agora: number,
  extras: readonly string[] = [],
): string[] {
  const faltando = new Set<string>();

  const conferir = (chave: string) => {
    const url = estado.urls.get(chave);
    if (!url || expirou(url, agora)) faltando.add(chave);
  };

  for (const item of estado.itens) conferir(item.chaveThumb);
  for (const chave of extras) conferir(chave);

  return [...faltando];
}

/**
 * Devolve o **mesmo objeto** quando a resposta não traz informação nova.
 *
 * Uma resposta parcial — chaves que o servidor não soube assinar — voltaria
 * igual na tentativa seguinte, e um objeto novo a cada volta faria o efeito que
 * busca URLs pedir sem parar no meio da rolagem.
 */
export function comUrls(estado: EstadoFeed, novas: Map<string, UrlDeMidia>): EstadoFeed {
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

/**
 * Devolve o **mesmo objeto** quando a falha já estava marcada.
 *
 * É o que encerra o ciclo: o efeito que busca URLs reage à mudança de estado,
 * e um objeto novo a cada falha o faria pedir de novo sem parar.
 */
export function comFalhaDeMidia(estado: EstadoFeed): EstadoFeed {
  return estado.midiaIndisponivel ? estado : { ...estado, midiaIndisponivel: true };
}

export type RespostaFeed = { ok: true; pagina: PaginaVisivel } | { ok: false; falha: FalhaFeed };

type ItemDaRede = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  autor: string;
  legenda: string | null;
  lugar: string | null;
  criadaEm: string;
  reacoes?: number;
  minhaReacao?: string | null;
  sessaoAutor?: string;
  minha?: boolean;
};

/**
 * Uma página do feed. O cursor volta como veio — **nunca** um deslocamento
 * calculado aqui: numa festa chegam fotos enquanto a pessoa rola, e o
 * deslocamento repete um item e engole outro a cada foto nova.
 */
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
      itens: (corpo.itens ?? []).map((i) => ({
        id: i.id,
        chaveThumb: i.chaveThumb,
        chaveFull: typeof i.chaveFull === "string" ? i.chaveFull : "",
        autor: i.autor,
        legenda: i.legenda ?? null,
        lugar: i.lugar ?? null,
        criadaEm: typeof i.criadaEm === "string" ? i.criadaEm : "",
        ...(typeof i.reacoes === "number" ? { reacoes: i.reacoes } : {}),
        ...(i.minhaReacao !== undefined ? { minhaReacao: i.minhaReacao } : {}),
        ...(typeof i.sessaoAutor === "string" ? { sessaoAutor: i.sessaoAutor } : {}),
        ...(typeof i.minha === "boolean" ? { minha: i.minha } : {}),
      })),
      proximoCursor: corpo.proximoCursor ?? null,
      interacao,
    },
  };
}

async function codigoDoErro(res: Response): Promise<string | null> {
  try {
    const corpo = (await res.json()) as { code?: string };
    return corpo.code ?? null;
  } catch {
    return null;
  }
}

/** Uma tentativa a cada meio minuto renova o que expirou sem virar tráfego de fundo. */
const INTERVALO_DE_RENOVACAO_MS = 30_000;

/** Enquanto o gate está fechado, confere se a interação abriu (spec 007). */
const INTERVALO_DO_GATE_MS = 30_000;

/**
 * Mescla a primeira página do servidor no topo do feed.
 *
 * Fotos retiradas por pânico ou moderação somem da janela recente sem
 * reiniciar a rolagem inteira — o convidado só perde o que o telão já perdeu.
 */
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

export function usarFeed(missaoId: string | null) {
  const [estado, setEstado] = useState<EstadoFeed>(estadoInicial);
  const geracao = useRef(0);
  const buscandoPagina = useRef(false);
  const buscandoUrls = useRef(false);
  const ultimoLote = useRef("");
  const refazer = useRef(false);

  /**
   * A janela do visualizador em tela cheia, pedida pela tela em vez de recebida
   * por parâmetro: ela é derivada dos itens que este mesmo gancho devolve, e
   * passá-la de volta como argumento fecharia um ciclo em cima do render.
   *
   * A assinatura mora no estado para reabrir o efeito; a lista mora numa ref
   * porque o relógio de renovação vive dentro dele — sem isso, o tique de 30s
   * continuaria pedindo a janela de uma foto que a pessoa já passou.
   */
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
        const novas = await urlsDeMidia(faltando);
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
