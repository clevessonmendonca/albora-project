import React from "react";
import fs from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminVars } from "../server/admin-shell";
import { WallLinkSender } from "./wall-link-sender";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const URL_GERADA = "https://albora.test/wall-link#tok.sig";

function salvar(nome: string, html: string) {
  const saida = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
  fs.mkdirSync(saida, { recursive: true });
  const vars = Object.entries(adminVars()).map(([k, v]) => `${k}:${v}`).join(";");
  fs.writeFileSync(
    `${saida}/body-${nome}.html`,
    `<style>:root{${vars}}</style><main class="mx-auto min-h-dvh max-w-[28rem] bg-bg p-4 font-corpo text-ink sm:p-8">${html}</main>`,
  );
}

function mockGerar(status = 201) {
  const fetchMock = vi.fn(async () =>
    status === 201
      ? new Response(JSON.stringify({ url: URL_GERADA, expiraEm: "2026-10-18T22:00:00.000Z" }), { status })
      : new Response(JSON.stringify({}), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("WallLinkSender", () => {
  it("gera o link pelo evento da rota e mostra para copiar", async () => {
    const fetchMock = mockGerar();
    render(<WallLinkSender eventId="ev-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar link do telão" }));
    const campo = await screen.findByLabelText("Link do telão");
    expect((campo as HTMLInputElement).value).toBe(URL_GERADA);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/events/ev-1/wall-link",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeTruthy();
  });

  it("copiar avisa por região live", async () => {
    mockGerar();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<WallLinkSender eventId="ev-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar link do telão" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copiar link" }));
    expect(await screen.findByText("Link copiado.")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(URL_GERADA);
  });

  it("plano sem telão: 403 explica sem abrir o link", async () => {
    mockGerar(403);
    render(<WallLinkSender eventId="ev-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar link do telão" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "O telão entra no plano Completo.");
    expect(screen.queryByLabelText("Link do telão")).toBeNull();
  });

  it("botão desabilitado quando o plano não permite", () => {
    render(<WallLinkSender eventId="ev-1" podeUsarTelao={false} />);
    expect((screen.getByRole("button", { name: "Gerar link do telão" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.runIf(process.env.PREVIEW === "1")("captura o cartão com link gerado", async () => {
    mockGerar();
    const { container } = render(<WallLinkSender eventId="ev-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar link do telão" }));
    await screen.findByLabelText("Link do telão");
    salvar("telao-link", container.innerHTML);
  });
});
