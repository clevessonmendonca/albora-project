import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@albora/core";

vi.mock("next/navigation", () => ({ usePathname: () => "/console", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/console/actions", () => ({ signOutAction: vi.fn(), searchConsoleAction: vi.fn() }));

import { ConsoleShell } from "./console-shell";

function actor(roles: Actor["roles"]): Actor {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function render(props: Partial<Omit<React.ComponentProps<typeof ConsoleShell>, "children">> = {}) {
  return renderToStaticMarkup(
    <ConsoleShell actor={actor(["owner"])} {...props}>
      {null}
    </ConsoleShell>,
  );
}

describe("ConsoleShell", () => {
  it("mostra o banner de impersonação quando há uma ativa", () => {
    const html = render({
      activeImpersonation: { id: "imp-1", targetAccountId: "c1", expiresAt: new Date() },
    });
    expect(html).toContain("Você está vendo como");
  });

  it("sem impersonação ativa o banner não existe", () => {
    expect(render()).not.toContain("Você está vendo como");
  });

  it("sem slot de período, nenhum seletor de período aparece — filtro que não filtra ensina a desconfiar", () => {
    const html = render();
    expect(html).not.toContain("Período");
  });

  it("com slot de período, o controle da tela aparece no cabeçalho", () => {
    const html = render({ periodo: <div>Período: 30 dias</div> });
    expect(html).toContain("Período: 30 dias");
  });

  it("a marca do console aparece no topo da barra", () => {
    expect(render()).toContain("Álbora");
  });
});
