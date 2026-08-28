import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

import { subscribeForegroundDrain } from "./foreground-drain";

type Handler = (state: string) => void;

function fakeAppState() {
  let handler: Handler | null = null;
  const remove = vi.fn();
  const addEventListener = vi.fn((_event: string, h: Handler) => {
    handler = h;
    return { remove };
  });
  const emit = (state: string) => handler?.(state);
  return { addEventListener, remove, emit };
}

describe("subscribeForegroundDrain", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("chama drain quando AppState transita para active", async () => {
    const drain = vi.fn(async () => undefined);
    const appState = fakeAppState();

    subscribeForegroundDrain(drain, appState);
    appState.emit("active");

    await vi.waitFor(() => expect(drain).toHaveBeenCalledTimes(1));
  });

  it("ignora transições para background e inactive", async () => {
    const drain = vi.fn(async () => undefined);
    const appState = fakeAppState();

    subscribeForegroundDrain(drain, appState);
    appState.emit("background");
    appState.emit("inactive");

    await new Promise((r) => setTimeout(r, 20));
    expect(drain).not.toHaveBeenCalled();
  });

  it("guard de reentrância: segunda chamada active enquanto drain está em curso é ignorada", async () => {
    let resolve!: () => void;
    const drain = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const appState = fakeAppState();

    subscribeForegroundDrain(drain, appState);
    appState.emit("active"); // inicia drain lento
    appState.emit("active"); // deve ser descartado

    resolve();
    await new Promise((r) => setTimeout(r, 20));

    expect(drain).toHaveBeenCalledTimes(1);
  });

  it("após o drain concluir, nova transição active dispara nova drenagem", async () => {
    let resolve!: () => void;
    const drain = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const appState = fakeAppState();

    subscribeForegroundDrain(drain, appState);
    appState.emit("active"); // 1ª drenagem

    resolve();
    await new Promise((r) => setTimeout(r, 20)); // aguarda finallyR

    drain.mockImplementation(async () => undefined);
    appState.emit("active"); // 2ª drenagem

    await vi.waitFor(() => expect(drain).toHaveBeenCalledTimes(2));
  });

  it("remove o listener ao cancelar a assinatura", () => {
    const drain = vi.fn(async () => undefined);
    const appState = fakeAppState();

    const unsubscribe = subscribeForegroundDrain(drain, appState);
    unsubscribe();

    expect(appState.remove).toHaveBeenCalledTimes(1);
  });

  it("drain que lança não impede drenagem futura", async () => {
    let call = 0;
    const drain = vi.fn(async () => {
      if (call++ === 0) throw new Error("falha");
    });
    const appState = fakeAppState();

    subscribeForegroundDrain(drain, appState);
    appState.emit("active"); // falha

    await new Promise((r) => setTimeout(r, 20));

    appState.emit("active"); // deve funcionar normalmente
    await vi.waitFor(() => expect(drain).toHaveBeenCalledTimes(2));
  });
});
