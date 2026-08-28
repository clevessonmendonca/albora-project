import { resolverSlug, type Resolucao } from "@albora/db";
import { getPool } from "@/lib/db";

export async function resolveOpenEvent(slug: string): Promise<Resolucao> {
  return resolverSlug(getPool(), slug, new Date());
}
