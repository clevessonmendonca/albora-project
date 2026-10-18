import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EventControls } from "./event-controls";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const props = {
  eventId: "e1",
  slug: "festa",
  plan: "free" as const,
  initial: { panico: false, modoEndurecido: false, haMenores: false },
  initialInteractionOpensAt: null,
  initialDeliveryOpensAt: null,
};

it("Ajustes agrupa os controles em quatro seções e abre a da fase", () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}))));
  const { container } = render(<EventControls {...props} initialStatus="active" />);
  const grupos = Array.from(container.querySelectorAll("details"));
  expect(grupos.map((d) => d.querySelector("summary")?.textContent?.replace("⌄", ""))).toEqual([
    "Publicação e conviteLinks, música e peças para imprimir",
    "Durante a festaTelão, proteções, interação e moderação",
    "Depois da festaEntrega das fotos",
    "Conta e planoPlano e ajuda",
  ]);
  expect(grupos.map((d) => d.open)).toEqual([false, true, false, false]);
});

it("com secoes (Home, Ao vivo) não agrupa nada", () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}))));
  const { container } = render(<EventControls {...props} initialStatus="active" secoes={["telao"]} />);
  expect(container.querySelector("details")).toBeNull();
});
