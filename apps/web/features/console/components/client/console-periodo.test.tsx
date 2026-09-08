import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn(() => "/console") }));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import { ConsolePeriodo, diasDoPeriodo, mostraPeriodo, PERIODO_PADRAO, periodoValido } from "./console-periodo";

describe("mostraPeriodo", () => {
  it("a Visão geral filtra por período", () => {
    expect(mostraPeriodo("/console")).toBe(true);
  });

  it("tela que não é série temporal não oferece o controle", () => {
    for (const rota of ["/console/audit", "/console/retention", "/console/lgpd", "/console/accounts"]) {
      expect(mostraPeriodo(rota)).toBe(false);
    }
  });
});

describe("periodoValido / diasDoPeriodo", () => {
  it("valor da URL fora da lista cai no padrão — janela não sai de query string arbitrária", () => {
    expect(periodoValido("1000d")).toBe(PERIODO_PADRAO);
    expect(diasDoPeriodo("1000d")).toBe(30);
  });

  it("ausente também cai no padrão", () => {
    expect(diasDoPeriodo(undefined)).toBe(30);
  });

  it("cada valor tem a janela que o rótulo promete", () => {
    expect(diasDoPeriodo("hoje")).toBe(1);
    expect(diasDoPeriodo("7d")).toBe(7);
    expect(diasDoPeriodo("30d")).toBe(30);
  });
});

describe("ConsolePeriodo", () => {
  it("na Visão geral renderiza o grupo com os três períodos", () => {
    usePathnameMock.mockReturnValue("/console");
    const html = renderToStaticMarkup(<ConsolePeriodo />);
    expect(html).toContain("Período dos dados");
    expect(html).toContain("7 dias");
  });

  it("fora dela não renderiza nada", () => {
    usePathnameMock.mockReturnValue("/console/audit");
    expect(renderToStaticMarkup(<ConsolePeriodo />)).toBe("");
  });
});
