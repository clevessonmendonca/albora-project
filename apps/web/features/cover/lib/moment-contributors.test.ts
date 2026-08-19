import { describe, expect, it } from "vitest";
import { contributorsLabel } from "./moment-contributors";

describe("contributorsLabel", () => {
  it("devolve null quando ninguém fotografou o momento", () => {
    expect(contributorsLabel([])).toBeNull();
  });

  it("singular quando é uma única pessoa", () => {
    expect(contributorsLabel([{ name: "Ana", fotos: 3 }])).toBe(
      "Ana fotografou esse momento",
    );
  });

  it("junta com 'e' quando são exatamente duas pessoas", () => {
    expect(
      contributorsLabel([
        { name: "Ana", fotos: 4 },
        { name: "João", fotos: 2 },
      ]),
    ).toBe("Ana e João fotografaram esse momento");
  });

  it("mostra os dois que mais contribuíram e agrega o resto em +N", () => {
    expect(
      contributorsLabel([
        { name: "Ana", fotos: 5 },
        { name: "João", fotos: 4 },
        { name: "Maria", fotos: 2 },
        { name: "Pedro", fotos: 1 },
        { name: "Rita", fotos: 1 },
      ]),
    ).toBe("Ana, João e +3 fotografaram esse momento");
  });

  it("nunca lista mais de dois nomes mesmo com apenas três contribuintes", () => {
    expect(
      contributorsLabel([
        { name: "Ana", fotos: 2 },
        { name: "João", fotos: 1 },
        { name: "Maria", fotos: 1 },
      ]),
    ).toBe("Ana, João e +1 fotografaram esse momento");
  });
});
