import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@albora/core";

vi.mock("next/navigation", () => ({
  usePathname: () => "/console",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/features/console/actions", () => ({ signOutAction: vi.fn() }));

import { ConsoleNav, groupedVisibleNavItems, navBadgeFor, visibleNavItems } from "./console-nav";

function actor(roles: Actor["roles"]): Actor {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("visibleNavItems", () => {
  it("nav de support não mostra Auditoria nem Equipe", () => {
    const labels = visibleNavItems(actor(["support"])).map((i) => i.label);
    expect(labels).not.toContain("Auditoria");
    expect(labels).not.toContain("Equipe");
  });

  it("nav de owner mostra tudo", () => {
    const labels = visibleNavItems(actor(["owner"])).map((i) => i.label);
    expect(labels.length).toBe(9);
  });

  it("nav de engineering não mostra Contas nem Assinaturas", () => {
    const labels = visibleNavItems(actor(["engineering"])).map((i) => i.label);
    expect(labels).not.toContain("Contas");
    expect(labels).not.toContain("Assinaturas");
  });
});

describe("groupedVisibleNavItems", () => {
  it("grupo cujos itens todos sumiram não renderiza o rótulo do grupo", () => {
    // support não tem audit.read, security.read nem staff.manage — Governança fica vazio inteiro.
    const groups = groupedVisibleNavItems(actor(["support"]));
    expect(groups.map((g) => g.label)).not.toContain("Governança");
  });

  it("grupo com pelo menos um item continua aparecendo, com o rótulo", () => {
    const groups = groupedVisibleNavItems(actor(["owner"]));
    expect(groups.map((g) => g.label)).toEqual(["Negócio", "Operação", "Governança"]);
  });
});

describe("navBadgeFor", () => {
  it("contador com valor 0 não renderiza a pílula", () => {
    expect(navBadgeFor({ "/console/support": { count: 0 } }, "/console/support")).toBeNull();
  });

  it("sem contador para o item também não renderiza a pílula", () => {
    expect(navBadgeFor(undefined, "/console/support")).toBeNull();
    expect(navBadgeFor({}, "/console/support")).toBeNull();
  });

  it("contador positivo renderiza a pílula com o valor", () => {
    expect(navBadgeFor({ "/console/support": { count: 3, critico: true } }, "/console/support")).toEqual({
      count: 3,
      critico: true,
    });
  });
});

describe("ConsoleNav — lista", () => {
  it("recolhida esconde o rótulo do grupo e o label do item sem tirá-los do acessível", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConsoleNav, { actor: actor(["support"]), recolhida: true }),
    );
    expect(html).toContain("Contas");
    expect(html).toContain("sr-only");
  });

  it("expandida mostra o rótulo do grupo sem sr-only", () => {
    const html = renderToStaticMarkup(React.createElement(ConsoleNav, { actor: actor(["support"]) }));
    expect(html).toContain("Negócio");
  });
});
