import { resolverSlug } from "@albora/db";
import { getPool } from "@/lib/db";
import { resolvePublicEventIdentity } from "../lib/resolve-identity";

export type PublicEventMetadata = {
  nomeDoEvento: string;
};

/**
 * Só o nome, para `generateMetadata`. Não faz a leitura agregada nem assina
 * URL — a `<head>` não precisa da vitrine, e duplicar aquele custo a cada
 * crawler seria caro de propósito nenhum. A página em si (`getPublicEventPage`)
 * resolve o slug de novo, a mesma duplicação que `/e/[slug]/page.tsx` já
 * aceita entre `generateMetadata` e o corpo da rota.
 */
export async function getPublicEventMetadata(slug: string): Promise<PublicEventMetadata | null> {
  const resolucao = await resolverSlug(getPool(), slug, new Date());

  if (resolucao.estado === "desconhecido" || resolucao.estado === "slug_rotacionado") {
    return null;
  }

  const { nomeDoEvento } = resolvePublicEventIdentity(slug, resolucao.evento);
  return { nomeDoEvento };
}
