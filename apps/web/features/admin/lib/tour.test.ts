import { describe, expect, it } from "vitest";
import { passoDoTour } from "./tour";

describe("passoDoTour", () => {
  it("evento novo começa do primeiro passo", () => {
    expect(passoDoTour({}, false)).toBe(0);
  });

  it("retoma de onde parou", () => {
    expect(passoDoTour({ tour: 3 }, false)).toBe(3);
  });

  it("descartado não volta nunca mais", () => {
    expect(passoDoTour({ tour: true }, false)).toBeNull();
  });

  it("não abre na fase Depois, nem para quem nunca viu", () => {
    expect(passoDoTour({}, true)).toBeNull();
    expect(passoDoTour({ tour: 2 }, true)).toBeNull();
  });

  it("valor estranho no jsonb não quebra a Home — recomeça do zero", () => {
    expect(passoDoTour({ tour: -1 as unknown as number }, false)).toBe(0);
    expect(passoDoTour({ tour: 1.5 as unknown as number }, false)).toBe(0);
  });

  it("convive com os marcos de preparo sem confundir os dois", () => {
    expect(passoDoTour({ qr: true, identidade: true }, false)).toBe(0);
    expect(passoDoTour({ qr: true, tour: true }, false)).toBeNull();
  });
});
