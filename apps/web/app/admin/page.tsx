import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { COOKIE_HOST, hostDoToken } from "@/lib/host-sessao";
import { raio } from "../landing/pecas";
import { SairBotao } from "./sair-botao";

export const dynamic = "force-dynamic";

/**
 * O painel do anfitrião (spec 009).
 *
 * Sem sessão de host, redireciona para a entrada — o painel nunca aparece a
 * quem não entrou. Tema neutro da marca: aqui é a conta, não um evento.
 *
 * Este é o marco do login (fase 2a). Criar evento, gerar peças e o painel ao
 * vivo entram sobre a base de acesso por conta (fase 2b).
 */
export default async function Pagina() {
  const token = (await cookies()).get(COOKIE_HOST)?.value;
  const host = await hostDoToken(token);
  if (!host) redirect("/admin/entrar");

  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;

  return (
    <main
      style={{
        ...vars,
        minHeight: "100dvh",
        padding: "clamp(1.5rem, 5vw, 4rem)",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.75rem" }}>
            Seu painel
          </h1>
          <p style={{ margin: "0.35rem 0 0", color: "var(--ink-3)", fontSize: "0.9rem" }}>
            {host.email}
          </p>
        </div>
        <SairBotao />
      </header>

      <section
        style={{
          padding: "1.5rem",
          backgroundColor: "var(--superficie)",
          border: "1px solid var(--linha)",
          ...raio("var(--raio-superficie)"),
        }}
      >
        <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Você entrou. Criar o evento, gerar as peças com o QR e acompanhar a
          participação chegam aqui em seguida.
        </p>
      </section>
    </main>
  );
}
