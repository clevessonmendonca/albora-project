import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WallLinkClient } from "./wall-link-client";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("WallLinkClient", () => {
  it("troca o fragmento por cookie, limpa a URL e vai ao telão", async () => {
    window.history.replaceState(null, "", "/wall-link#tok.sig");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, hash: "#tok.sig", pathname: "/wall-link", replace });

    const limpar = vi.spyOn(window.history, "replaceState");

    render(<WallLinkClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/wall-display"));
    const init = (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1];
    expect(JSON.parse(init.body)).toEqual({ token: "tok.sig" });
    expect(limpar).toHaveBeenCalledWith(null, "", "/wall-link");
  });

  it("sem fragmento: link inválido e nenhuma chamada", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<WallLinkClient />);
    expect(await screen.findByText("Este link não vale mais")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("410 do servidor: mostra link inválido", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 410 })));
    vi.stubGlobal("location", { ...window.location, hash: "#velho.sig", pathname: "/wall-link", replace: vi.fn() });
    render(<WallLinkClient />);
    expect(await screen.findByText("Este link não vale mais")).toBeTruthy();
  });
});
