import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { CreateEventWizard } from "@/features/admin/components/client/create-event-wizard";

export const dynamic = "force-dynamic";

/** Criar evento — só para quem entrou. Tema neutro: aqui é a conta, não o evento. */
export default async function Pagina() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;

  return (
    <div style={vars}>
      <CreateEventWizard />
    </div>
  );
}
