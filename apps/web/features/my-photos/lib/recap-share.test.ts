import { afterEach, describe, expect, it, vi } from "vitest";
import { compartilharRecap } from "./recap-share";

function blob(conteudo: string) {
  return new Blob([conteudo], { type: "image/jpeg" });
}

describe("compartilharRecap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem quadro nenhum, não chama nada e cancela", async () => {
    const share = vi.fn();
    vi.stubGlobal("navigator", { share, canShare: vi.fn(() => true) });

    await expect(compartilharRecap([], "albora-festa-recap")).resolves.toBe("cancelled");
    expect(share).not.toHaveBeenCalled();
  });

  it("aparelho que aceita vários arquivos: uma folha só, com todos os quadros juntos", async () => {
    const share = vi.fn(async (_dados: { files: File[] }) => undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", { share, canShare });

    const blobs = [blob("um"), blob("dois"), blob("três")];
    await expect(compartilharRecap(blobs, "albora-festa-recap")).resolves.toBe("shared");

    expect(canShare).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();
    const arquivos = share.mock.calls[0]![0].files;
    expect(arquivos).toHaveLength(3);
    expect(arquivos.map((a) => a.name)).toEqual([
      "albora-festa-recap-1.jpg",
      "albora-festa-recap-2.jpg",
      "albora-festa-recap-3.jpg",
    ]);
  });

  it("cancelar a folha nativa não é erro", async () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(async () => {
        throw { name: "AbortError" };
      }),
      canShare: vi.fn(() => true),
    });

    await expect(compartilharRecap([blob("um")], "albora-festa-recap")).resolves.toBe("cancelled");
  });

  it("erro real da folha nativa propaga, não vira 'cancelled' silencioso", async () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(async () => {
        throw new Error("boom");
      }),
      canShare: vi.fn(() => true),
    });

    await expect(compartilharRecap([blob("um")], "albora-festa-recap")).rejects.toThrow("boom");
  });

  it("sem canShare para vários arquivos, cai para compartilhar um a um (mesma folha do share simples)", async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn((opts: { files: File[] }) => opts.files.length === 1);
    vi.stubGlobal("navigator", { share, canShare });

    const blobs = [blob("um"), blob("dois")];
    await expect(compartilharRecap(blobs, "albora-festa-recap")).resolves.toBe("shared");

    expect(share).toHaveBeenCalledTimes(2);
  });

  it("sem share nenhum, baixa cada quadro e reporta 'downloaded'", async () => {
    const click = vi.fn();
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ href: "", download: "", click })),
    });

    const blobs = [blob("um"), blob("dois"), blob("três")];
    await expect(compartilharRecap(blobs, "albora-festa-recap")).resolves.toBe("downloaded");
    expect(click).toHaveBeenCalledTimes(3);
  });
});
