import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWallPairing } from "./use-wall-pairing";

describe("useWallPairing — falha de rede", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("avisa semConexao quando abrir o código falha e tenta de novo no próximo tick", async () => {
    let chamadas = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/wall/pair") {
          chamadas += 1;
          return chamadas === 1
            ? new Response("{}", { status: 503 })
            : new Response(JSON.stringify({ code: "123456" }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: "pendente" }), { status: 200 });
      }),
    );

    const onPronto = vi.fn();
    const { result } = renderHook(() => useWallPairing("pareando", onPronto));

    await waitFor(() => expect(result.current.semConexao).toBe(true));
    expect(result.current.codigo).toBeNull();
    await waitFor(() => expect(result.current.codigo).toBe("123456"), { timeout: 6000 });
    expect(result.current.semConexao).toBe(false);
  });
});
