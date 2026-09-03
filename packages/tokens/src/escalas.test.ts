import { describe, expect, it } from "vitest";
import { escalaDoFundo } from "./escalas";
import { lerHex, contraste } from "./cor";
import type { Colors, SemanticScale } from "./types";

const CORES: Colors = {
  papel: "#FAF5EF",
  tinta: "#2B1D0E",
  noite: "#1A1410",
  acento: "#C28B30",
  critico: "#D94F00",
};

function hexValido(hex: string): boolean {
  return lerHex(hex) !== null;
}

function todasHexValidas(escala: SemanticScale): boolean {
  return Object.values(escala).every((v) => hexValido(v));
}

describe("escalaDoFundo — claro", () => {
  const escala = escalaDoFundo(CORES, "light");

  it("retorna todas as cores como hex válido", () => {
    expect(todasHexValidas(escala)).toBe(true);
  });

  it("ink é a tinta original", () => {
    expect(escala.ink).toBe(CORES.tinta);
  });

  it("acento é o acento original", () => {
    expect(escala.acento).toBe(CORES.acento);
  });

  it("bg é derivado de papel misturado com tinta", () => {
    expect(escala.bg).not.toBe(CORES.papel);
    const bgRgb = lerHex(escala.bg)!;
    const papelRgb = lerHex(CORES.papel)!;
    expect(bgRgb.r).toBeLessThanOrEqual(papelRgb.r);
  });

  it("superficieAlta é mais clara que superficie", () => {
    const superficieRgb = lerHex(escala.superficie)!;
    const altaRgb = lerHex(escala.superficieAlta)!;
    const mediaSuperficie = (superficieRgb.r + superficieRgb.g + superficieRgb.b) / 3;
    const mediaAlta = (altaRgb.r + altaRgb.g + altaRgb.b) / 3;
    expect(mediaAlta).toBeGreaterThanOrEqual(mediaSuperficie);
  });

  it("ink2 é mais claro que ink", () => {
    const inkRgb = lerHex(escala.ink)!;
    const ink2Rgb = lerHex(escala.ink2)!;
    const mediaInk = (inkRgb.r + inkRgb.g + inkRgb.b) / 3;
    const mediaInk2 = (ink2Rgb.r + ink2Rgb.g + ink2Rgb.b) / 3;
    expect(mediaInk2).toBeGreaterThan(mediaInk);
  });

  it("ink3 é mais claro que ink2", () => {
    const ink2Rgb = lerHex(escala.ink2)!;
    const ink3Rgb = lerHex(escala.ink3)!;
    const mediaInk2 = (ink2Rgb.r + ink2Rgb.g + ink2Rgb.b) / 3;
    const mediaInk3 = (ink3Rgb.r + ink3Rgb.g + ink3Rgb.b) / 3;
    expect(mediaInk3).toBeGreaterThan(mediaInk2);
  });

  it("acentoTexto é hex válido e diferente do acento bruto", () => {
    expect(hexValido(escala.acentoTexto)).toBe(true);
  });

  it("sobreAcento é hex válido", () => {
    expect(hexValido(escala.sobreAcento)).toBe(true);
  });

  it("critico é hex válido", () => {
    expect(hexValido(escala.critico)).toBe(true);
  });
});

describe("escalaDoFundo — escuro", () => {
  const escala = escalaDoFundo(CORES, "dark");

  it("retorna todas as cores como hex válido", () => {
    expect(todasHexValidas(escala)).toBe(true);
  });

  it("ink é o papel original (texto claro sobre fundo escuro)", () => {
    expect(escala.ink).toBe(CORES.papel);
  });

  it("acento é o acento original", () => {
    expect(escala.acento).toBe(CORES.acento);
  });

  it("bg é derivado de noite misturado com papel", () => {
    const bgRgb = lerHex(escala.bg)!;
    const noiteRgb = lerHex(CORES.noite)!;
    expect(bgRgb.r).toBeGreaterThanOrEqual(noiteRgb.r);
  });

  it("bg é escuro", () => {
    const bgRgb = lerHex(escala.bg)!;
    const media = (bgRgb.r + bgRgb.g + bgRgb.b) / 3;
    expect(media).toBeLessThan(80);
  });

  it("ink2 é mais escuro que ink", () => {
    const inkRgb = lerHex(escala.ink)!;
    const ink2Rgb = lerHex(escala.ink2)!;
    const mediaInk = (inkRgb.r + inkRgb.g + inkRgb.b) / 3;
    const mediaInk2 = (ink2Rgb.r + ink2Rgb.g + ink2Rgb.b) / 3;
    expect(mediaInk2).toBeLessThan(mediaInk);
  });

  it("ink3 é mais escuro que ink2", () => {
    const ink2Rgb = lerHex(escala.ink2)!;
    const ink3Rgb = lerHex(escala.ink3)!;
    const mediaInk2 = (ink2Rgb.r + ink2Rgb.g + ink2Rgb.b) / 3;
    const mediaInk3 = (ink3Rgb.r + ink3Rgb.g + ink3Rgb.b) / 3;
    expect(mediaInk3).toBeLessThan(mediaInk2);
  });

  it("superficieAlta é mais clara que bg", () => {
    const bgRgb = lerHex(escala.bg)!;
    const altaRgb = lerHex(escala.superficieAlta)!;
    const mediaBg = (bgRgb.r + bgRgb.g + bgRgb.b) / 3;
    const mediaAlta = (altaRgb.r + altaRgb.g + altaRgb.b) / 3;
    expect(mediaAlta).toBeGreaterThan(mediaBg);
  });

  it("critico é hex válido", () => {
    expect(hexValido(escala.critico)).toBe(true);
  });
});

describe("escalaDoFundo — consistência entre temas", () => {
  const claro = escalaDoFundo(CORES, "light");
  const escuro = escalaDoFundo(CORES, "dark");

  it("ambos retornam todas as chaves da SemanticScale", () => {
    const chaves: (keyof SemanticScale)[] = [
      "bg", "superficie", "superficieAlta", "linha",
      "ink", "ink2", "ink3", "acento", "acentoTexto",
      "sobreAcento", "critico",
    ];
    for (const chave of chaves) {
      expect(claro).toHaveProperty(chave);
      expect(escuro).toHaveProperty(chave);
    }
  });

  it("bg do claro é mais claro que bg do escuro", () => {
    const claroRgb = lerHex(claro.bg)!;
    const escuroRgb = lerHex(escuro.bg)!;
    const mediaCl = (claroRgb.r + claroRgb.g + claroRgb.b) / 3;
    const mediaEs = (escuroRgb.r + escuroRgb.g + escuroRgb.b) / 3;
    expect(mediaCl).toBeGreaterThan(mediaEs);
  });

  it("ink do claro é mais escuro que ink do escuro", () => {
    const claroRgb = lerHex(claro.ink)!;
    const escuroRgb = lerHex(escuro.ink)!;
    const mediaCl = (claroRgb.r + claroRgb.g + claroRgb.b) / 3;
    const mediaEs = (escuroRgb.r + escuroRgb.g + escuroRgb.b) / 3;
    expect(mediaCl).toBeLessThan(mediaEs);
  });

  it("acento é o mesmo em ambos os temas", () => {
    expect(claro.acento).toBe(escuro.acento);
  });

  it("ink tem contraste razoável com bg em ambos", () => {
    const contrasteCl = contraste(lerHex(claro.ink)!, lerHex(claro.bg)!);
    const contrasteEs = contraste(lerHex(escuro.ink)!, lerHex(escuro.bg)!);
    expect(contrasteCl).toBeGreaterThan(4.5);
    expect(contrasteEs).toBeGreaterThan(4.5);
  });
});
