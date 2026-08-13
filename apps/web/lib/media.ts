"use client";

/**
 * De onde a tela busca os bytes de uma foto.
 *
 * O servidor **nunca** serve mídia: o navegador busca direto no object
 * storage, do mesmo jeito que o upload escreve direto nele. Proxy pelo app
 * poria o servidor no caminho dos bytes, que o `CLAUDE.md` trata como falha de
 * arquitetura — e no sábado às 22h ele é o gargalo que ninguém consegue tirar.
 *
 * A URL é assinada e tem validade curta, então não dá para guardá-la junto do
 * item: ela é pedida em lote, para a página que está na tela, e revalidada
 * quando expira.
 */

export type MediaUrl = { chave: string; url: string; expiraEm: number };

/**
 * Pede URLs para um lote de chaves. Em lote, e não uma por foto, porque uma
 * página de feed são vinte imagens e vinte requisições ao servidor no meio de
 * uma rolagem é a própria travada.
 *
 * As chaves são **conferidas contra o evento da sessão** no servidor. O
 * cliente pede pelo que o feed devolveu; pedir por chave arbitrária não
 * resolve nada.
 */
export async function mediaUrls(chaves: string[]): Promise<Map<string, MediaUrl>> {
  if (chaves.length === 0) return new Map();

  const res = await fetch("/api/media/urls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ chaves }),
  });

  if (!res.ok) throw new MediaError(res.status);

  const corpo = (await res.json()) as { urls: MediaUrl[] };
  return new Map(corpo.urls.map((u) => [u.chave, u]));
}

/** Com folga: renovar só no instante da expiração já chega tarde. */
export const RENEWAL_BUFFER_MS = 60_000;

export function isExpired(url: MediaUrl, agora: number): boolean {
  return agora >= url.expiraEm - RENEWAL_BUFFER_MS;
}

export class MediaError extends Error {
  readonly code = "midia.indisponivel";
  constructor(readonly status: number) {
    super(`não consegui as URLs de mídia (${status})`);
  }
}
