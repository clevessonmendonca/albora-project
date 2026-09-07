import { describe, expect, it } from "vitest";
import { paletteFromImage } from "./photo-palette";

/** Roda em `node` (sem DOM): a extração de cor precisa de canvas, então o caminho SSR-safe tem de
 *  falhar fechado — devolver `[]`, nunca estourar, para o passo de aparência cair nas sugestões. */
describe("paletteFromImage", () => {
  it("sem document (SSR/node) devolve [] em vez de estourar", async () => {
    expect(typeof document).toBe("undefined");
    await expect(paletteFromImage("data:image/png;base64,AAAA")).resolves.toEqual([]);
  });
});
