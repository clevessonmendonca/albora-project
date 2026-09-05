import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DrainSummary, QueueBody, QueueItem } from "@albora/core";
import { drainAndReport } from "@/features/guest/lib/funnel-from-drain";
import { webQueue } from "@/lib/queue";
import { useEventQueue } from "./use-event-queue";

vi.mock("@/lib/queue", () => ({
  webQueue: { list: vi.fn() },
}));

vi.mock("@/lib/transport", () => ({
  webTransport: {},
}));

vi.mock("@/features/guest/lib/funnel-from-drain", () => ({
  drainAndReport: vi.fn(),
}));

function item(id: string, eventoId: string, corpo?: QueueBody): QueueItem {
  return {
    id,
    eventoId,
    corpo: corpo ?? { tipo: "arquivo", caminho: `/tmp/${id}`, bytes: 100 },
    mime: "image/jpeg",
    criadoEm: Date.now(),
    tentativas: 0,
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

const RESUMO_VAZIO: DrainSummary = { enviados: 0, retentar: 0, desistiram: 0, resultados: [] };

describe("useEventQueue — pílula global de fila offline", () => {
  beforeEach(() => {
    vi.mocked(webQueue.list).mockResolvedValue([]);
    vi.mocked(drainAndReport).mockResolvedValue(RESUMO_VAZIO);
    setOnline(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("conta só os itens do evento pedido, ignorando os de outros eventos", async () => {
    vi.mocked(webQueue.list).mockResolvedValue([
      item("1", "e1"),
      item("2", "e2"),
      item("3", "e1"),
    ]);

    const { result } = renderHook(() => useEventQueue("e1"));

    await waitFor(() => expect(result.current.pendentes).toBe(2));
  });

  it("bytesPendentes soma as duas formas de corpo (blob.size e bytes)", async () => {
    vi.mocked(webQueue.list).mockResolvedValue([
      item("1", "e1", { tipo: "blob", blob: new Blob([new Uint8Array(500)]) }),
      item("2", "e1", { tipo: "arquivo", caminho: "/tmp/2", bytes: 300 }),
    ]);

    const { result } = renderHook(() => useEventQueue("e1"));

    await waitFor(() => expect(result.current.bytesPendentes).toBe(800));
  });

  it("drenarAgora não faz nada quando offline e devolve null", async () => {
    setOnline(false);

    const { result } = renderHook(() => useEventQueue("e1"));
    await waitFor(() => expect(webQueue.list).toHaveBeenCalled());

    let resumo: DrainSummary | null = RESUMO_VAZIO;
    await act(async () => {
      resumo = await result.current.drenarAgora();
    });

    expect(resumo).toBeNull();
    expect(drainAndReport).not.toHaveBeenCalled();
  });

  it("duas chamadas concorrentes a drenarAgora disparam um único dreno", async () => {
    let liberar!: (v: DrainSummary) => void;
    vi.mocked(drainAndReport).mockReturnValue(
      new Promise((resolve) => {
        liberar = resolve;
      }),
    );

    const { result } = renderHook(() => useEventQueue("e1"));
    await waitFor(() => expect(webQueue.list).toHaveBeenCalled());

    let p1: Promise<DrainSummary | null> = Promise.resolve(null);
    let p2: Promise<DrainSummary | null> = Promise.resolve(null);
    act(() => {
      p1 = result.current.drenarAgora();
      p2 = result.current.drenarAgora();
    });

    expect(drainAndReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      liberar(RESUMO_VAZIO);
      await Promise.all([p1, p2]);
    });

    expect(await p1).toEqual(RESUMO_VAZIO);
    expect(await p2).toBeNull();
  });

  it("evento online dispara dreno; evento offline só marca estado", async () => {
    const { result } = renderHook(() => useEventQueue("e1"));
    await waitFor(() => expect(webQueue.list).toHaveBeenCalled());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);
    expect(drainAndReport).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.online).toBe(true);
    expect(drainAndReport).toHaveBeenCalledTimes(1);
  });

  it("visibilitychange com documento visível: drena se online, só atualiza se offline", async () => {
    renderHook(() => useEventQueue("e1"));
    await waitFor(() => expect(webQueue.list).toHaveBeenCalled());

    vi.mocked(webQueue.list).mockClear();
    vi.mocked(drainAndReport).mockClear();

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(drainAndReport).toHaveBeenCalledTimes(1);

    setOnline(false);
    vi.mocked(webQueue.list).mockClear();
    vi.mocked(drainAndReport).mockClear();

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(drainAndReport).not.toHaveBeenCalled();
    expect(webQueue.list).toHaveBeenCalled();
  });

  it("pageshow com persisted=true age como retorno; persisted=false não dispara nada", async () => {
    renderHook(() => useEventQueue("e1"));
    await waitFor(() => expect(webQueue.list).toHaveBeenCalled());

    vi.mocked(drainAndReport).mockClear();

    await act(async () => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
    });
    expect(drainAndReport).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect(drainAndReport).toHaveBeenCalledTimes(1);
  });

  it("o intervalo de 1500ms atualiza contagens; para de rodar após o unmount", async () => {
    vi.useFakeTimers();
    vi.mocked(webQueue.list).mockResolvedValue([item("1", "e1")]);

    const { result, unmount } = renderHook(() => useEventQueue("e1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.pendentes).toBe(1);

    const chamadasAntes = vi.mocked(webQueue.list).mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(vi.mocked(webQueue.list).mock.calls.length).toBeGreaterThan(chamadasAntes);

    unmount();
    const chamadasNoUnmount = vi.mocked(webQueue.list).mock.calls.length;

    await vi.advanceTimersByTimeAsync(4500);
    expect(vi.mocked(webQueue.list).mock.calls.length).toBe(chamadasNoUnmount);
  });

  it("no unmount, remove os listeners de online/offline/visibilitychange/pageshow e o setInterval", async () => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDoc = vi.spyOn(document, "removeEventListener");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() => useEventQueue("e1"));
    await waitFor(() => expect(webQueue.list).toHaveBeenCalled());

    unmount();

    expect(removeWindow).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith("offline", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith("pageshow", expect.any(Function));
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
