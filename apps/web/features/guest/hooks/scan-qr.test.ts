import { afterEach, describe, expect, it, vi } from "vitest";
import { goToEvent } from "./scan-qr";

/**
 * `goToEvent` gravava `via="qr"` sempre, mesmo para código digitado —
 * inflando `entradasPorVia.qr` no funil com gente que nunca abriu a câmera
 * (A3, spec-a1-share-a3-resgate.md §2.1). Cada chamador passa o `via` certo.
 */
describe("goToEvent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("câmera lida o QR — via=qr", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { location });

    goToEvent("anaejoao", "qr");

    expect(location.href).toBe("/e/anaejoao?via=qr");
  });

  it("código digitado à mão — via=code, nunca via=qr", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { location });

    goToEvent("anaejoao", "code");

    expect(location.href).toBe("/e/anaejoao?via=code");
  });
});
