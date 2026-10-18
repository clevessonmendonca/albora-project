import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WallPairClient } from "./wall-pair-client";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const EVENTO = "11111111-1111-1111-1111-111111111111";

function responder(status: number) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function ligar() {
  fireEvent.click(screen.getByRole("button", { name: "Ligar o telão" }));
}

describe("WallPairClient", () => {
  it("plano free: diz o motivo e leva o anfitrião a subir de plano, não a checar a conexão", async () => {
    responder(403);
    render(<WallPairClient initialCode="A2C4E6" eventoId={EVENTO} />);
    await ligar();
    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toContain("O telão entra no plano Completo");
    expect(aviso.textContent).not.toContain("conexão");
    expect(screen.getByRole("link", { name: "Suba de plano no painel" }).getAttribute("href")).toBe(
      `/admin/e/${EVENTO}/evento#controle-plano`,
    );
  });

  it("plano free para o convidado: motivo sem link de cobrança", async () => {
    responder(403);
    render(<WallPairClient initialCode="A2C4E6" />);
    await ligar();
    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toContain("O telão entra no plano Completo");
    expect(aviso.textContent).toContain("quem organiza");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("erro de rede continua sendo verifique sua conexão", async () => {
    responder(500);
    render(<WallPairClient initialCode="A2C4E6" />);
    await ligar();
    expect((await screen.findByText(/Verifique sua conexão/)).textContent).toContain("conexão");
  });

  it("anfitrião envia o evento e, ligado, volta ao painel", async () => {
    const fetchMock = responder(200);
    render(<WallPairClient initialCode="A2C4E6" eventoId={EVENTO} />);
    await ligar();
    expect(await screen.findByText("Telão ligado")).toBeTruthy();
    const corpo = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(corpo).toEqual({ codigo: "A2C4E6", eventoId: EVENTO });
    expect(screen.getByRole("link", { name: "Voltar ao painel" }).getAttribute("href")).toBe(
      `/admin/e/${EVENTO}/ao-vivo`,
    );
  });

  it("anfitrião com sessão expirada é levado ao login de volta ao ao-vivo", async () => {
    responder(401);
    render(<WallPairClient initialCode="A2C4E6" eventoId={EVENTO} />);
    await ligar();
    expect((await screen.findByRole("link", { name: /Entre no painel de novo/ })).getAttribute("href")).toBe(
      `/admin/sign-in?next=/admin/e/${EVENTO}/ao-vivo`,
    );
  });
});
