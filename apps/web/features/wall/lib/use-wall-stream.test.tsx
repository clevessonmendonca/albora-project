import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWallStream } from "./use-wall-stream";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

function instalarMock() {
  vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
}

describe("useWallStream", () => {
  afterEach(() => {
    MockEventSource.instances = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("começa desconectado, sem payload, antes de qualquer evento do servidor", () => {
    instalarMock();
    const { result } = renderHook(() => useWallStream(true));

    expect(result.current.connected).toBe(false);
    expect(result.current.payload).toBeNull();
  });

  it("não abre conexão quando desabilitado", () => {
    instalarMock();
    renderHook(() => useWallStream(false));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("marca connected=true quando o EventSource abre", async () => {
    instalarMock();
    const { result } = renderHook(() => useWallStream(true));
    const es = MockEventSource.instances[0]!;

    es.onopen?.();

    await waitFor(() => expect(result.current.connected).toBe(true));
  });

  it("expõe a página recebida em onmessage — mesma forma do polling", async () => {
    instalarMock();
    const { result } = renderHook(() => useWallStream(true));
    const es = MockEventSource.instances[0]!;
    const pagina = {
      itens: [{ id: "m1", autor: "Ana", mime: "image/jpeg", criadaEm: new Date().toISOString(), reacoes: 0, thumb: "t", full: "f" }],
      expiraEm: Date.now() + 900_000,
      panico: false,
      contadores: { fotos: 1, convidados: 1 },
    };

    es.onmessage?.({ data: JSON.stringify(pagina) });

    await waitFor(() => expect(result.current.payload).toEqual(pagina));
  });

  it("ignora mensagem malformada sem quebrar o hook", () => {
    instalarMock();
    const { result } = renderHook(() => useWallStream(true));
    const es = MockEventSource.instances[0]!;

    es.onmessage?.({ data: "{not json" });

    expect(result.current.payload).toBeNull();
  });

  it("volta connected=false e fecha a conexão em erro", async () => {
    instalarMock();
    const { result } = renderHook(() => useWallStream(true));
    const es = MockEventSource.instances[0]!;
    es.onopen?.();
    await waitFor(() => expect(result.current.connected).toBe(true));

    es.onerror?.();

    await waitFor(() => expect(result.current.connected).toBe(false));
    expect(es.closed).toBe(true);
  });

  it("tenta reconectar após o atraso de reconexão, sem antes disso", () => {
    vi.useFakeTimers();
    instalarMock();
    renderHook(() => useWallStream(true));
    const primeira = MockEventSource.instances[0]!;

    primeira.onerror?.();
    expect(MockEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(4_999);
    expect(MockEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("fecha a conexão e não reconecta ao desmontar", () => {
    vi.useFakeTimers();
    instalarMock();
    const { unmount } = renderHook(() => useWallStream(true));
    const es = MockEventSource.instances[0]!;

    unmount();
    expect(es.closed).toBe(true);

    es.onerror?.();
    vi.advanceTimersByTime(10_000);
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("degrada para desconectado quando EventSource não existe no ambiente", () => {
    vi.stubGlobal("EventSource", undefined);
    const { result } = renderHook(() => useWallStream(true));

    expect(result.current.connected).toBe(false);
    expect(result.current.payload).toBeNull();
  });
});
