import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminResource } from "./use-admin-resource";

type Dado = { n: number };

function respostaOk(dado: unknown) {
  return { ok: true, json: async () => dado } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useAdminResource", () => {
  it("começa carregando e entrega o dado", async () => {
    fetchMock.mockResolvedValue(respostaOk({ n: 1 }));

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));

    expect(result.current.carregando).toBe(true);
    expect(result.current.dado).toBeNull();

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dado).toEqual({ n: 1 });
    expect(result.current.erro).toBe(false);
    expect(result.current.atualizadoEm).toBeInstanceOf(Date);
  });

  it("resposta não-ok vira erro", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));

    await waitFor(() => expect(result.current.erro).toBe(true));
    expect(result.current.dado).toBeNull();
  });

  it("recarga que falha preserva o dado que já estava na tela", async () => {
    fetchMock.mockResolvedValueOnce(respostaOk({ n: 1 }));

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));
    await waitFor(() => expect(result.current.dado).toEqual({ n: 1 }));

    fetchMock.mockRejectedValueOnce(new Error("rede caiu"));
    await act(async () => {
      await result.current.recarregar();
    });

    expect(result.current.erro).toBe(true);
    expect(result.current.dado).toEqual({ n: 1 });
  });

  it("resposta atrasada de uma leitura velha não sobrescreve a mais nova", async () => {
    let liberaPrimeira: (r: Response) => void = () => undefined;
    const primeira = new Promise<Response>((resolve) => {
      liberaPrimeira = resolve;
    });

    fetchMock.mockReturnValueOnce(primeira);
    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));

    fetchMock.mockResolvedValueOnce(respostaOk({ n: 2 }));
    await act(async () => {
      await result.current.recarregar();
    });
    expect(result.current.dado).toEqual({ n: 2 });

    await act(async () => {
      liberaPrimeira(respostaOk({ n: 1 }));
      await primeira;
    });

    expect(result.current.dado).toEqual({ n: 2 });
  });

  it("avisa quem pediu, a cada carga bem-sucedida", async () => {
    fetchMock.mockResolvedValue(respostaOk({ n: 7 }));
    const aoCarregar = vi.fn();

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x", { aoCarregar }));
    await waitFor(() => expect(result.current.dado).toEqual({ n: 7 }));

    expect(aoCarregar).toHaveBeenCalledWith({ n: 7 });
  });

  it("sem intervalo, lê uma vez só", async () => {
    fetchMock.mockResolvedValue(respostaOk({ n: 1 }));

    const { result } = renderHook(() => useAdminResource<Dado>("/api/x"));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("com intervalo, relê sozinho", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue(respostaOk({ n: 1 }));

    const { result } = renderHook(() =>
      useAdminResource<Dado>("/api/x", { intervaloMs: 30_000 }),
    );
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("desmontado, não tenta mais escrever estado", async () => {
    let libera: (r: Response) => void = () => undefined;
    const pendente = new Promise<Response>((resolve) => {
      libera = resolve;
    });
    fetchMock.mockReturnValueOnce(pendente);

    const { unmount } = renderHook(() => useAdminResource<Dado>("/api/x"));
    unmount();

    const avisos = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await act(async () => {
      libera(respostaOk({ n: 1 }));
      await pendente;
    });

    expect(avisos).not.toHaveBeenCalled();
    avisos.mockRestore();
  });
});
