import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@albora/core";

vi.mock("@/features/console/actions", () => ({ signOutAction: vi.fn() }));

import { ConsoleProfileMenu, iniciaisDoOperador, papeisLegiveis } from "./console-profile-menu";

function actor(roles: Actor["roles"]): Actor {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("papeisLegiveis", () => {
  it("traduz e junta os papéis", () => {
    expect(papeisLegiveis(["owner", "finance"])).toBe("Owner · Financeiro");
  });
});

describe("iniciaisDoOperador", () => {
  it("usa duas letras maiúsculas do identificador", () => {
    expect(iniciaisDoOperador("ab12")).toBe("AB");
  });
});

describe("ConsoleProfileMenu", () => {
  const html = (props: Partial<React.ComponentProps<typeof ConsoleProfileMenu>> = {}) =>
    renderToStaticMarkup(React.createElement(ConsoleProfileMenu, { actor: actor(["owner"]), ...props }));

  it("oferece sair do console", () => {
    expect(html()).toContain("Sair do console");
  });

  it("não desenha item para página que não existe — link morto é pior que ausência", () => {
    const marcado = html();
    expect(marcado).not.toContain("Meu perfil");
    expect(marcado).not.toContain("Preferências");
  });

  it("recolhida esconde o texto e mantém as iniciais", () => {
    const marcado = html({ recolhida: true });
    expect(marcado).toContain("S1");
    expect(marcado).not.toContain("Owner</span>");
  });
});
