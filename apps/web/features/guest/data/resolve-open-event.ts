import { resolverSlug, type Resolucao } from "@albora/db";
import { banco } from "@/lib/banco";

export async function resolveOpenEvent(slug: string): Promise<Resolucao> {
  return resolverSlug(banco(), slug, new Date());
}
