import { afterEach, describe, expect, it, vi } from "vitest";
import {
  abrirJob,
  comJob,
  comReauth,
  estadoInicial,
  pedirConfirmacao,
  tokenDoLink,
} from "./use-host-export";

const JOB = {
  id: "11111111-2222-3333-4444-555555555555",
  estado: "pronto" as const,
  fotos: 3,
  criadoEm: "2026-08-15T20:00:00.000Z",
  baixar: "/api/admin/events/aaa/export/arquivo?job=11111111-2222-3333-4444-555555555555",
};

describe("baixar tudo no painel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("nasce parado, sem pedir nada", () => {
    expect(estadoInicial()).toEqual({ fase: "idle" });
  });

  it("pedir confirmação devolve o link só quando a API manda", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ enviado: true, link: "http://x/a?exportar=tok" }), { status: 200 })),
    );

    const r = await pedirConfirmacao("evt");
    expect(r).toEqual({ ok: true, link: "http://x/a?exportar=tok" });
    expect(fetch).toHaveBeenCalledWith("/api/admin/events/evt/export/reauth", {
      method: "POST",
      credentials: "same-origin",
    });
  });

  it("abrir o job manda o token de confirmação", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ job: JOB }), { status: 202 })),
    );

    const r = await abrirJob("evt", "tok");
    expect(r).toEqual({ ok: true, job: JOB });
    expect(fetch).toHaveBeenCalledWith("/api/admin/events/evt/export", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "tok" }),
    });
  });

  it("o token sai da query do link, nunca de um campo digitável", () => {
    expect(tokenDoLink("http://localhost:3000/admin/e/x/album?exportar=abc")).toBe("abc");
    expect(tokenDoLink("nao-e-url")).toBeNull();
  });

  it("job vazio e job pronto viram fases distintas", () => {
    expect(comJob({ ...JOB, estado: "vazio", baixar: null })).toEqual({ fase: "vazio" });
    expect(comJob(JOB)).toEqual({ fase: "pronto", job: JOB });
    expect(comReauth("http://x").fase).toBe("reauth");
  });
});
