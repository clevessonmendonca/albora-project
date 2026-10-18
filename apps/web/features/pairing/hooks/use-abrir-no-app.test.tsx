import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ESPERA_ABRIR_APP_MS, useAbrirNoApp } from "./use-abrir-no-app";

describe("useAbrirNoApp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("avisa que o app pode não estar instalado quando a página continua visível", () => {
    const { result } = renderHook(() => useAbrirNoApp("albora://parear?x=1"));
    act(() => result.current.abrir());
    expect(result.current.semApp).toBe(false);
    act(() => {
      vi.advanceTimersByTime(ESPERA_ABRIR_APP_MS + 10);
    });
    expect(result.current.semApp).toBe(true);
  });

  it("não avisa se a página saiu de cena porque o app abriu", () => {
    const { result } = renderHook(() => useAbrirNoApp("albora://parear?x=1"));
    act(() => result.current.abrir());
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(ESPERA_ABRIR_APP_MS + 10);
    });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    expect(result.current.semApp).toBe(false);
  });
});
