import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContadorAoVivo } from "./use-animated-counter";

function stubMatchMedia(reduzido: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: reduzido }) as unknown as typeof window.matchMedia,
  );
}

describe("useContadorAoVivo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sem preferência de menos movimento, sobe em tiques até o alvo", () => {
    stubMatchMedia(false);
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ alvo }) => useContadorAoVivo(alvo), {
      initialProps: { alvo: 0 },
    });
    expect(result.current).toBe(0);

    rerender({ alvo: 10 });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(10);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(10);
  });

  it("sob prefers-reduced-motion: reduce, pula direto para o alvo", () => {
    stubMatchMedia(true);
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ alvo }) => useContadorAoVivo(alvo), {
      initialProps: { alvo: 0 },
    });

    rerender({ alvo: 847 });
    expect(result.current).toBe(847);
  });

  it("sem matchMedia no ambiente, ainda converge — nunca quebra por ausência de API", () => {
    vi.stubGlobal("matchMedia", undefined);
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ alvo }) => useContadorAoVivo(alvo), {
      initialProps: { alvo: 0 },
    });

    rerender({ alvo: 5 });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(5);
  });
});
