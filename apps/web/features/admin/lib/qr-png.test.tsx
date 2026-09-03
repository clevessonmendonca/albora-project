import { describe, it, expect, vi, afterEach } from "vitest";
import { svgToPngBlob } from "./qr-png";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class FailingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

// jsdom não implementa URL.createObjectURL/revokeObjectURL — atribuição direta,
// não vi.spyOn (que exige a propriedade já existir no objeto).
function stubObjectUrl(): { createObjectURL: ReturnType<typeof vi.fn>; revokeObjectURL: ReturnType<typeof vi.fn> } {
  const createObjectURL = vi.fn(() => "blob:fake-url");
  const revokeObjectURL = vi.fn();
  URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  return { createObjectURL, revokeObjectURL };
}

describe("svgToPngBlob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("converte o SVG do QR num Blob PNG, revogando a URL temporária", async () => {
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    const { createObjectURL, revokeObjectURL } = stubObjectUrl();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
      (cb as (b: Blob | null) => void)(new Blob(["png"], { type: "image/png" }));
    });

    const blob = await svgToPngBlob("<svg></svg>", 512);

    expect(blob.type).toBe("image/png");
    expect(drawImage).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("rejeita quando o navegador não expõe contexto 2D", async () => {
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    stubObjectUrl();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    await expect(svgToPngBlob("<svg></svg>")).rejects.toThrow(
      "Este navegador não suporta exportar PNG.",
    );
  });

  it("rejeita quando o SVG não carrega", async () => {
    vi.stubGlobal("Image", FailingImage as unknown as typeof Image);
    stubObjectUrl();

    await expect(svgToPngBlob("<svg></svg>")).rejects.toThrow(
      "Não carregou o QR para exportar.",
    );
  });
});
