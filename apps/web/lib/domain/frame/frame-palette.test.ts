import { PACKS } from "@albora/packs";
import { IDENTITY_MODELS } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { paletteForFrame } from "./frame-palette";

describe("paletteForFrame", () => {
  it("trocar o modelo de identidade muda a paleta da moldura", () => {
    const pack = PACKS.casamento;
    const amanhecer = IDENTITY_MODELS.find((m) => m.id === "amanhecer")!;
    const linho = IDENTITY_MODELS.find((m) => m.id === "linho")!;

    const noite = paletteForFrame({ ...amanhecer.camada, presetId: amanhecer.id }, pack);
    const papel = paletteForFrame({ ...linho.camada, presetId: linho.id }, pack);

    expect(noite.acento).not.toBe(papel.acento);
    expect(noite.bg).not.toBe(papel.bg);
    expect(noite.fonteTitulo.length).toBeGreaterThan(0);
    expect(papel.fonteCorpo.length).toBeGreaterThan(0);
  });

  it("sem tokens do evento cai na marca, não inventa cor", () => {
    const paleta = paletteForFrame({}, undefined);
    expect(paleta.acento).toMatch(/^#/);
    expect(paleta.fonteTitulo).not.toContain("var(");
  });

  it("Meia-noite resolve o título para a fonte do corpo, canvas não lê var()", () => {
    const meiaNoite = IDENTITY_MODELS.find((m) => m.id === "meia-noite")!;
    const paleta = paletteForFrame(meiaNoite.camada, PACKS.casamento);
    expect(paleta.fonteTitulo).not.toContain("var(");
    expect(paleta.fonteTitulo).toBe(paleta.fonteCorpo);
  });
});
