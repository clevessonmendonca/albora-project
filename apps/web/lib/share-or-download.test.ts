import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baixado,
  cancelado,
  compartilhado,
  shareOrDownload,
  shareWasAborted,
} from "./share-or-download";

function arquivoShare() {
  return {
    share: vi.fn(async () => undefined),
    canShare: vi.fn(() => true),
  };
}

describe("shareWasAborted", () => {
  it("reconhece o cancelamento da folha nativa", () => {
    expect(shareWasAborted({ name: "AbortError" })).toBe(true);
    expect(shareWasAborted({ name: "NotAllowedError" })).toBe(false);
    expect(shareWasAborted("nope")).toBe(false);
  });
});

describe("aliases em PT", () => {
  it("apontam para os outcomes em inglês", () => {
    expect(compartilhado).toBe("shared");
    expect(baixado).toBe("downloaded");
    expect(cancelado).toBe("cancelled");
  });
});

describe("shareOrDownload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("abre a folha nativa com o arquivo, não com um link", async () => {
    const nav = arquivoShare();
    vi.stubGlobal("navigator", nav);

    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    await expect(shareOrDownload(blob, "albora-festa.jpg")).resolves.toBe("shared");

    expect(nav.canShare).toHaveBeenCalledOnce();
    expect(nav.share).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: "albora-festa.jpg", type: "image/jpeg" })],
    });
  });

  it("cancelar a folha não é erro", async () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(async () => {
        throw { name: "AbortError" };
      }),
      canShare: vi.fn(() => true),
    });

    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    await expect(shareOrDownload(blob, "albora-festa.jpg")).resolves.toBe("cancelled");
  });

  it("sem share com arquivo, baixa o composto", async () => {
    const click = vi.fn();
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ href: "", download: "", click })),
    });

    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    await expect(shareOrDownload(blob, "albora-festa.jpg")).resolves.toBe("downloaded");
    expect(click).toHaveBeenCalledOnce();
  });
});
