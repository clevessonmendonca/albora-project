import React from "react";
import fs from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminVars } from "../server/admin-shell";
import { AoVivoTela } from "./ao-vivo-tela";
import { ModerationCountProvider } from "./moderation-count-context";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const data = "2026-10-18T20:00:00.000Z";

const resumo = {
  expectedGuests: 120,
  origemDoDenominador: "estimado",
  sessoesTotais: 83,
  sessoesComUpload: 41,
  totalFotos: 247,
  filaRevisao: 3,
  denunciadas: 1,
  participacao: 0.34,
  veredito: "funil.mexe_em_friccao",
  ultimas: [1, 2, 3, 4].map((n) => ({ id: String(n), thumb: `/onboarding/photo-0${n}.webp`, criadaEm: data })),
};

const revisao = {
  midias: [1, 2, 3].map((n) => ({
    id: `m${n}`,
    autor: ["Ana", "João", "Maria"][n - 1]!,
    denuncias: n === 1 ? 1 : 0,
    motivo: n === 2 ? "classificador" : "endurecido",
    criadaEm: data,
    thumb: `/onboarding/photo-0${n + 4}.webp`,
  })),
  comentarios: [],
};

function stub(chamadas: string[] = []) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      chamadas.push(url);
      return new Response(JSON.stringify(url.endsWith("/review") ? revisao : resumo));
    }),
  );
}

const controls = {
  eventId: "ev-1",
  slug: "festa",
  plan: "celebration" as const,
  initial: { panico: false, modoEndurecido: false, haMenores: false },
  initialInteractionOpensAt: null,
  initialDeliveryOpensAt: null,
  initialStatus: "active" as const,
};

function tela() {
  return (
    <ModerationCountProvider>
      <AoVivoTela eventId="ev-1" name="Ana e João" controls={controls} />
    </ModerationCountProvider>
  );
}

function salvar(container: HTMLElement) {
  const saida = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
  fs.mkdirSync(saida, { recursive: true });
  const vars = Object.entries(adminVars()).map(([k, v]) => `${k}:${v}`).join(";");
  fs.writeFileSync(
    `${saida}/body-ao-vivo.html`,
    `<style>:root{${vars}}</style><main class="mx-auto min-h-dvh max-w-[90rem] bg-bg p-4 font-corpo text-ink sm:p-8">${container.innerHTML}</main>`,
  );
}

describe("AoVivoTela", () => {
  it("coloca alerta, fila de revisão e Abrir telão antes do resumo completo", async () => {
    stub();
    const { container } = render(tela());
    await screen.findByText("Fotos que chegaram");
    await screen.findByText("247 fotos · 83 pessoas");
    await screen.findByText("Chegando agora");

    const texto = container.textContent ?? "";
    const posicao = (t: string) => texto.indexOf(t);
    expect(posicao("Abrir telão")).toBeGreaterThanOrEqual(0);
    expect(posicao("Abrir telão")).toBeLessThan(posicao("Fotos que chegaram"));
    expect(posicao("publicação")).toBeGreaterThanOrEqual(0);
    expect(posicao("publicação")).toBeLessThan(posicao("Fotos que chegaram"));
    expect(posicao("Fotos que chegaram")).toBeLessThan(posicao("Chegando agora"));
    expect(posicao("247 fotos · 83 pessoas")).toBeLessThan(posicao("Fotos que chegaram"));
  });

  it("tem um único Abrir telão e uma única busca do resumo", async () => {
    const chamadas: string[] = [];
    stub(chamadas);
    render(tela());
    await screen.findByText("Chegando agora");
    expect(screen.getAllByRole("link", { name: /Abrir telão/ })).toHaveLength(1);
    expect(chamadas.filter((u) => u === "/api/admin/events/ev-1")).toHaveLength(1);
  });

  it.runIf(process.env.PREVIEW === "1")("captura a tela Ao vivo na nova ordem", async () => {
    stub();
    const { container } = render(tela());
    await screen.findByText("Chegando agora");
    await screen.findByText("Ana");
    salvar(container);
  });
});
