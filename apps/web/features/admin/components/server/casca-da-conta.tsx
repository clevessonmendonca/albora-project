import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { HostResolvida } from "@albora/db";
import { RaizDoPainel } from "@/features/admin/components/server/raiz-do-painel";
import { CascaDoPainel } from "@/features/admin/components/client/casca-do-painel";
import { ModerationCountProvider } from "@/features/admin/components/client/moderation-count-context";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

/**
 * A casca das telas que são da **conta**, não de um evento (ADR 0017):
 * Comunidade e Inspiração.
 *
 * Mesma casca do evento, com a sidebar em modo conta — sem seletor de evento e
 * sem os grupos que só fazem sentido dentro de um. O escopo que a URL promete é
 * o escopo que a navegação mostra.
 */
export async function CascaDaConta({
  children,
}: {
  children: ReactNode | ((host: HostResolvida) => ReactNode);
}) {
  const host = await hostFromToken((await cookies()).get(HOST_COOKIE)?.value);
  if (!host) redirect("/admin/sign-in");

  return (
    <ModerationCountProvider>
      <RaizDoPainel>
        <CascaDoPainel
          evento={null}
          perfil={{ nome: host.email, plano: "Sua conta" }}
          hoje={new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          raiz="Meu espaço"
        >
          {typeof children === "function" ? children(host) : children}
        </CascaDoPainel>
      </RaizDoPainel>
    </ModerationCountProvider>
  );
}
