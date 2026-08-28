"use client";

/** Servidor nunca serve mídia: navegador busca direto no storage — URL assinada, pedida em lote por página e revalidada quando expira. */

export type MediaUrl = { chave: string; url: string; expiraEm: number };

/** Pede URLs em lote (uma requisição por página, não por foto); chaves conferidas contra o evento da sessão no servidor. */
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
