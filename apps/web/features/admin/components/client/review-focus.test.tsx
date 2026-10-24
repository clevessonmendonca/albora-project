import React from "react";
import fs from "node:fs";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminVars } from "../server/admin-shell";
import { ModerationCountProvider } from "./moderation-count-context";
import { ReviewQueue } from "./review-queue";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const data = "2026-10-18T20:00:00.000Z";

function montar() {
  let midias = [1, 2, 3].map((n) => ({
    id: `m${n}`,
    autor: ["Ana", "João", "Maria"][n - 1]!,
    denuncias: n === 1 ? 1 : 0,
    motivo: "endurecido",
    criadaEm: data,
    thumb: `/onboarding/photo-0${n + 4}.webp`,
  }));
  const patches: { id: string; acao: string; tipo: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "PATCH") {
        const corpo = JSON.parse(init.body!) as { id: string; acao: string; tipo: string };
        patches.push(corpo);
        midias = midias.filter((m) => m.id !== corpo.id);
        return new Response("{}");
      }
      return new Response(JSON.stringify({ midias, comentarios: [] }));
    }),
  );
  return patches;
}

async function abrir() {
  render(
    <ModerationCountProvider>
      <ReviewQueue eventoId="ev-1" />
    </ModerationCountProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /Revisar uma a uma \(3\)/ }));
  await screen.findByRole("group", { name: "Revisão foto a foto" });
}

describe("revisão foto a foto por teclado", () => {
  it("A aprova a foto atual pela mesma rota de revisão e avisa por região live", async () => {
    const patches = montar();
    await abrir();
    expect(screen.getByText("Foto 1 de 3")).toBeTruthy();
    fireEvent.keyDown(window, { key: "a" });
    await waitFor(() => expect(patches).toEqual([{ tipo: "midia", id: "m1", acao: "liberar" }]));
    expect(await screen.findByText("Foto aprovada. 2 restantes.")).toBeTruthy();
    expect(screen.getByText("Foto 1 de 2")).toBeTruthy();
  });

  it("R oculta; setas e J/K navegam sem decidir", async () => {
    const patches = montar();
    await abrir();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Foto 2 de 3")).toBeTruthy();
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByText("Foto 3 de 3")).toBeTruthy();
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByText("Foto 2 de 3")).toBeTruthy();
    expect(patches).toEqual([]);
    fireEvent.keyDown(window, { key: "r" });
    await waitFor(() => expect(patches).toEqual([{ tipo: "midia", id: "m2", acao: "ocultar" }]));
  });

  it("Esc volta à fila em cartões, que continua existindo", async () => {
    montar();
    await abrir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(await screen.findByRole("button", { name: "Aprovar todas (3)" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Revisão foto a foto" })).toBeNull();
  });

  it("atalhos com modificador ou dentro de campo de texto não decidem", async () => {
    const patches = montar();
    await abrir();
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    const campo = document.createElement("input");
    document.body.appendChild(campo);
    fireEvent.keyDown(campo, { key: "a" });
    campo.remove();
    expect(patches).toEqual([]);
  });

  it("ao decidir a última foto, a fila limpa e a tela sai do modo foco", async () => {
    const patches = montar();
    await abrir();
    for (let i = 0; i < 3; i++) {
      fireEvent.keyDown(window, { key: "a" });
      await screen.findByText(i === 2 ? "Foto aprovada. Fila limpa." : `Foto aprovada. ${2 - i} ${i === 1 ? "restante" : "restantes"}.`).catch(() => null);
      await waitFor(() => expect(patches).toHaveLength(i + 1));
    }
    expect(await screen.findByText("Fila limpa")).toBeTruthy();
  });

  it.runIf(process.env.PREVIEW === "1")("captura a revisão foto a foto", async () => {
    montar();
    await abrir();
    const saida = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
    fs.mkdirSync(saida, { recursive: true });
    const vars = Object.entries(adminVars()).map(([k, v]) => `${k}:${v}`).join(";");
    fs.writeFileSync(
      `${saida}/body-revisao-foco.html`,
      `<style>:root{${vars}}</style><main class="mx-auto min-h-dvh max-w-[48rem] bg-bg p-4 font-corpo text-ink sm:p-8">${document.body.innerHTML}</main>`,
    );
  });
});
