import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWallDisplay } from "./use-wall-display";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

function stubFetch(corpo: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => responder(corpo, status)));
}

const BASE = { itens: [] as unknown[], expiraEm: Date.now() + 900_000, panico: false };

describe("useWallDisplay — contadores do A4", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("reflete a dupla fotos/convidados quando /api/wall a inclui", async () => {
    stubFetch({ ...BASE, contadores: { fotos: 847, convidados: 63 } });

    const { result } = renderHook(() => useWallDisplay("exibindo", vi.fn()));

    await waitFor(() => expect(result.current.contadores).toEqual({ fotos: 847, convidados: 63 }));
  });

  it("some (null) quando o payload não traz o campo — nunca inventa a partir da janela de rotação", async () => {
    stubFetch(BASE);

    const { result } = renderHook(() => useWallDisplay("exibindo", vi.fn()));

    await waitFor(() => expect(result.current.carregou).toBe(true));
    expect(result.current.contadores).toBeNull();
  });

  it("some (null) quando o payload traz uma forma inválida — não repassa lixo pra UI", async () => {
    stubFetch({ ...BASE, contadores: { fotos: "847" } });

    const { result } = renderHook(() => useWallDisplay("exibindo", vi.fn()));

    await waitFor(() => expect(result.current.carregou).toBe(true));
    expect(result.current.contadores).toBeNull();
  });

  it("crachá inválido (401) não afeta o estado dos contadores", async () => {
    stubFetch({ message: "expirado" }, 401);
    const onNaoAutorizado = vi.fn();

    const { result } = renderHook(() => useWallDisplay("exibindo", onNaoAutorizado));

    await waitFor(() => expect(onNaoAutorizado).toHaveBeenCalled());
    expect(result.current.contadores).toBeNull();
  });
});
