import { MAX_ATTEMPTS, shouldGiveUp } from "@albora/core";
import type { Queue, QueueItem } from "@albora/core";
import { apiOrigin, cookieHeader, type GuestSession } from "./session";
import { signMediaUrls } from "./sign-urls";

export type MinhaFotoEnviada = {
  tipo: "enviada";
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  criadaEm: string;
  autor: string;
  legenda?: string | null;
  lugar?: string | null;
  reacoes?: number;
  thumbUrl?: string;
};

export type MinhaFotoPendente = {
  tipo: "pendente";
  id: string;
  mime: string;
  criadoEm: number;
  tentativas: number;
};

export type MinhaFotoFalhou = {
  tipo: "falhou";
  id: string;
  mime: string;
  criadoEm: number;
};

export type MinhaFoto = MinhaFotoEnviada | MinhaFotoPendente | MinhaFotoFalhou;

export type MinhasFotosResult = {
  fotos: MinhaFoto[];
  interacao: string;
};

type ServidorEnviada = {
  id: string;
  chaveThumb: string;
  chaveFull: string;
  mime: string;
  criadaEm: string;
  autor: string;
  legenda?: string | null;
  lugar?: string | null;
  reacoes?: number;
};

type ServidorResposta = {
  interacao?: string;
  enviadas?: ServidorEnviada[];
};

export async function fetchMinhasDoServidor(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<{ interacao: string; enviadas: MinhaFotoEnviada[] }> {
  const url = new URL(`${apiOrigin()}/api/my-photos`);
  url.searchParams.set("eventoId", session.eventoId);

  const res = await fetchFn(url.toString(), {
    headers: { cookie: cookieHeader(session.token) },
  });
  if (!res.ok) throw new Error(`my-photos ${res.status}`);

  const data = (await res.json()) as ServidorResposta;
  const enviadas = data.enviadas ?? [];
  const chaves = enviadas.map((m) => m.chaveThumb).filter(Boolean);
  const urls = await signMediaUrls(session, chaves, fetchFn);
  const byKey = new Map(urls.map((u) => [u.chave, u.url]));

  return {
    interacao: data.interacao ?? "espelho",
    enviadas: enviadas.map((m) => {
      const thumbUrl = byKey.get(m.chaveThumb);
      return {
        tipo: "enviada" as const,
        ...m,
        ...(thumbUrl !== undefined ? { thumbUrl } : {}),
      };
    }),
  };
}

export function itemDaFilaParaFoto(item: QueueItem): MinhaFotoPendente | MinhaFotoFalhou {
  if (shouldGiveUp(item)) {
    return { tipo: "falhou", id: item.id, mime: item.mime, criadoEm: item.criadoEm };
  }
  return {
    tipo: "pendente",
    id: item.id,
    mime: item.mime,
    criadoEm: item.criadoEm,
    tentativas: item.tentativas,
  };
}

/**
 * Busca as fotos do servidor e mescla com os itens pendentes/falhos da fila
 * local. Os itens da fila que o servidor já confirma são excluídos da lista
 * local para evitar duplicatas.
 */
export async function carregarMinhasFotos(
  session: GuestSession,
  queue: Queue,
  fetchFn: typeof fetch = fetch,
): Promise<MinhasFotosResult> {
  const [{ interacao, enviadas }, filaItens] = await Promise.all([
    fetchMinhasDoServidor(session, fetchFn),
    queue.list(),
  ]);

  const idsConfirmados = new Set(enviadas.map((e) => e.id));

  const locais = filaItens
    .filter((item) => !idsConfirmados.has(item.id))
    .map(itemDaFilaParaFoto);

  // Pendentes e falhos aparecem antes (mais recentes por criadoEm desc)
  const locaisOrdenados = [...locais].sort((a, b) => b.criadoEm - a.criadoEm);
  const enviadasOrdenadas = [...enviadas].sort(
    (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
  );

  return {
    fotos: [...locaisOrdenados, ...enviadasOrdenadas],
    interacao,
  };
}

/**
 * Remove uma foto já confirmada no servidor.
 * Espelha o que a web faz em `use-gallery.ts → remover`.
 */
export async function deletarFotoEnviada(
  session: GuestSession,
  uploadId: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean }> {
  const res = await fetchFn(`${apiOrigin()}/api/uploads`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader(session.token),
    },
    body: JSON.stringify({ uploadId }),
  });
  return { ok: res.ok };
}

export { MAX_ATTEMPTS };
