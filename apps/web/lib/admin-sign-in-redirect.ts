import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const HEADER_CAMINHO_ADMIN = "x-albora-admin-path";

/** Só caminho interno do painel: começa com /admin, nunca //, esquema ou barra invertida. */
export function caminhoSeguroDoAdmin(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const next = raw.trim();
  if (next !== "/admin" && !/^\/admin[/?#]/.test(next)) return null;
  if (next.startsWith("//") || next.includes("://") || next.includes("\\")) return null;
  return next;
}

export function urlDeEntrada(caminho: string | null | undefined): string {
  const next = caminhoSeguroDoAdmin(caminho);
  return next ? `/admin/sign-in?next=${encodeURIComponent(next)}` : "/admin/sign-in";
}

/** Sessão do painel ausente ou expirada: vai ao login levando o destino pedido, que o login devolve depois. */
export async function redirecionarParaEntrar(fallback?: string): Promise<never> {
  const pedido = (await headers()).get(HEADER_CAMINHO_ADMIN);
  redirect(urlDeEntrada(caminhoSeguroDoAdmin(pedido) ?? fallback));
}
