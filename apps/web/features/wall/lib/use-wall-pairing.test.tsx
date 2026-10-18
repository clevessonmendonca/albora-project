import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWallPairing } from "./use-wall-pairing";

afterEach(() => vi.unstubAllGlobals());

describe("useWallPairing", () => {
  it("cookie de link já autorizado: entra direto, sem abrir um novo código", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "pronto", variaveis: { "--x": "1" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onPronto = vi.fn();
    renderHook(() => useWallPairing("pareando", onPronto));
    await waitFor(() => expect(onPronto).toHaveBeenCalledWith({ "--x": "1" }));
    const urls = fetchMock.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(urls).not.toContain("/api/wall/pair");
  });

  it("sem pareamento prévio: abre o código como sempre", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === "/api/wall/pair"
        ? new Response(JSON.stringify({ code: "ABC234" }), { status: 201 })
        : new Response(JSON.stringify({ status: "expirado" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useWallPairing("pareando", vi.fn()));
    await waitFor(() => expect(result.current.codigo).toBe("ABC234"));
  });
});
