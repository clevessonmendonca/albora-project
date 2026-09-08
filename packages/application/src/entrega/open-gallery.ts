import type { Pool } from "pg";
import { listarMinhasDoEvento, resolveDeliveryToken, signableKeys, withEvent } from "@albora/db";

const TTL_SEGUNDOS = 3600;

export type FotoEntrega = {
  id: string;
  url: string;
  thumbUrl: string;
  mime: string;
  criadaEm: Date;
  legenda: string | null;
};

export type OpenGuestGalleryDeps = {
  pool: Pool;
  segredo: string;
  signGet: (key: string, ttl: number) => Promise<string>;
};

/**
 * Token → galeria da própria sessão. `signableKeys` é quem decide o que
 * sobrevive (`panic`/`published`) — uma chave fora desse conjunto some da
 * resposta, não vira erro. Token inválido/expirado propaga
 * `ErroTokenDeEntrega` para o chamador renderizar "link expirado", em vez
 * de devolver uma galeria vazia que parece válida.
 */
export async function openGuestGallery(
  deps: OpenGuestGalleryDeps,
  token: string,
): Promise<{ eventId: string; fotos: FotoEntrega[] }> {
  const { eventId, sessionId } = await resolveDeliveryToken(deps.pool, deps.segredo, token);

  const fotos = await withEvent(deps.pool, eventId, async (cliente) => {
    const minhas = await listarMinhasDoEvento(cliente, sessionId);
    if (minhas.length === 0) return [];

    const permitidas = await signableKeys(
      cliente,
      eventId,
      minhas.map((m) => m.chaveFull),
    );

    const visiveis = minhas.filter((m) => permitidas.has(m.chaveFull));

    return Promise.all(
      visiveis.map(async (m) => ({
        id: m.id,
        url: await deps.signGet(m.chaveFull, TTL_SEGUNDOS),
        thumbUrl: await deps.signGet(m.chaveThumb, TTL_SEGUNDOS),
        mime: m.mime,
        criadaEm: m.criadaEm,
        legenda: m.legenda,
      })),
    );
  });

  return { eventId, fotos };
}
