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

describe("ConsoleNav — banner de impersonação no rodapé", () => {
  it("rodapé mostra o banner de impersonação quando ativo", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConsoleNav, {
        actor: actor(["support"]),
        activeImpersonation: { id: "imp-1", targetAccountId: "c1", expiresAt: new Date() },
      }),
    );
    expect(html).toContain("Você está vendo como");
  });

  it("rodapé não mostra o banner sem impersonação ativa", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConsoleNav, { actor: actor(["support"]), activeImpersonation: null }),
    );
    expect(html).not.toContain("Você está vendo como");
  });
});
