import { resolverSlug } from "@albora/db";
import { getPool } from "@/lib/db";
import { resolvePublicEventIdentity } from "../lib/resolve-identity";

export type PublicEventMetadata = {
  nomeDoEvento: string;
};

/** Só o nome para `generateMetadata` — sem leitura agregada nem assinatura de URL (crawler não merece esse custo). */
export async function getPublicEventMetadata(slug: string): Promise<PublicEventMetadata | null> {
  const resolucao = await resolverSlug(getPool(), slug, new Date());

  if (resolucao.estado === "desconhecido" || resolucao.estado === "slug_rotacionado") {
    return null;
  }

  const { nomeDoEvento } = resolvePublicEventIdentity(slug, resolucao.evento);
  return { nomeDoEvento };
}
