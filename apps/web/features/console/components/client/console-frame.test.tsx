import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@albora/core";

vi.mock("next/navigation", () => ({ usePathname: () => "/console", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/console/actions", () => ({ signOutAction: vi.fn(), searchConsoleAction: vi.fn() }));

import { CHAVE_SIDEBAR, ConsoleFrame, lerPreferenciaRecolhida } from "./console-frame";

function actor(roles: Actor["roles"]): Actor {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("lerPreferenciaRecolhida", () => {
  it("lê a preferência guardada", () => {
    expect(lerPreferenciaRecolhida({ getItem: () => "recolhida" })).toBe(true);
    expect(lerPreferenciaRecolhida({ getItem: () => "expandida" })).toBe(false);
  });

  it("sem storage começa expandida", () => {
    expect(lerPreferenciaRecolhida(undefined)).toBe(false);
  });

  it("storage que lança (janela privativa, site data bloqueado) não derruba a tela", () => {
    expect(
      lerPreferenciaRecolhida({
        getItem: () => {
          throw new Error("SecurityError");
        },
      }),
    ).toBe(false);
  });

  it("a chave é estável — mudar o nome perde a preferência de todo operador", () => {
    expect(CHAVE_SIDEBAR).toBe("albora-console-sidebar");
  });
});

describe("ConsoleFrame", () => {
  const html = () =>
    renderToStaticMarkup(<ConsoleFrame actor={actor(["owner"])}>{null}</ConsoleFrame>);

  it("o botão de recolher diz o que faz, para leitor de tela e no hover", () => {
    expect(html()).toContain("Recolher menu");
  });

  it("a gaveta mobile tem botão nomeado", () => {
    expect(html()).toContain("Abrir menu");
  });

  it("não oferece alternância de tema — console é claro fixo", () => {
    const marcado = html();
    expect(marcado).not.toContain("tema escuro");
    expect(marcado).not.toContain("data-theme");
  });
});
