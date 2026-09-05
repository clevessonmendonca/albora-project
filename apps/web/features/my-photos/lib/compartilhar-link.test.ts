// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { compartilharLink } from "./compartilhar-link";

describe("compartilharLink", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa navigator.share quando existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ url: "https://x/p/festa" });
  });

  it("cancelamento do share devolve cancelled", async () => {
    const abort = Object.assign(new Error("abort"), { name: "AbortError" });
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(abort) });
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("cancelled");
  });

  it("sem share, copia para o clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://x/p/festa");
  });

  it("sem share nem clipboard devolve cancelled", async () => {
    vi.stubGlobal("navigator", {});
    await expect(compartilharLink("https://x/p/festa")).resolves.toBe("cancelled");
  });
});
