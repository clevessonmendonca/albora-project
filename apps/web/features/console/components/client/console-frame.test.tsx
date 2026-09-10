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
  it("lê a preferência do cookie", () => {
    expect(lerPreferenciaRecolhida("albora_console_sidebar=recolhida")).toBe(true);
    expect(lerPreferenciaRecolhida("albora_console_sidebar=expandida")).toBe(false);
  });

  it("acha a chave no meio de outros cookies, e não confunde com prefixo alheio", () => {
    expect(lerPreferenciaRecolhida("a=1; albora_console_sidebar=recolhida; b=2")).toBe(true);
    expect(lerPreferenciaRecolhida("x_albora_console_sidebar=recolhida")).toBe(false);
    expect(lerPreferenciaRecolhida("albora_console_sidebar=recolhida_nao")).toBe(false);
  });

  it("sem cookie começa expandida", () => {
    expect(lerPreferenciaRecolhida(undefined)).toBe(false);
    expect(lerPreferenciaRecolhida("")).toBe(false);
  });

  it("a chave é estável — mudar o nome perde a preferência de todo operador", () => {
    expect(CHAVE_SIDEBAR).toBe("albora_console_sidebar");
  });
});

describe("ConsoleFrame — sem piscada de largura", () => {
  it("renderiza já recolhida quando o servidor diz que é a preferência", () => {
    const html = renderToStaticMarkup(
      <ConsoleFrame actor={actor(["owner"])} recolhidaInicial>
        {null}
      </ConsoleFrame>,
    );
    expect(html).toContain("Expandir menu");
    expect(html).toContain('aria-pressed="true"');
  });

  it("renderiza expandida por padrão", () => {
    const html = renderToStaticMarkup(<ConsoleFrame actor={actor(["owner"])}>{null}</ConsoleFrame>);
    expect(html).toContain("Recolher menu");
    expect(html).toContain('aria-pressed="false"');
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
