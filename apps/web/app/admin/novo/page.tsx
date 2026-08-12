import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { COOKIE_HOST, hostDoToken } from "@/lib/host-sessao";
import { NovoEvento } from "./novo-cliente";

export const dynamic = "force-dynamic";

/** Criar evento — só para quem entrou. Tema neutro: aqui é a conta, não o evento. */
export default async function Pagina() {
  const token = (await cookies()).get(COOKIE_HOST)?.value;
  const host = await hostDoToken(token);
  if (!host) redirect("/admin/entrar");

  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;

  return (
    <div style={vars}>
      <NovoEvento />
    </div>
  );
}
