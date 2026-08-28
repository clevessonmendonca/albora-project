import { afterEach, describe, expect, it, vi } from "vitest";
import { goToEvent } from "./scan-qr";

/** `goToEvent` gravava `via="qr"` para código digitado — inflava `entradasPorVia.qr` com gente que nunca abriu câmera; cada chamador passa o `via` certo. */
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
