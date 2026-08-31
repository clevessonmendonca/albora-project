import { describe, expect, it } from "vitest";
import { faixasVotadas } from "./editor-musica";

describe("faixasVotadas", () => {
  it("nem array vira lista vazia", () => {
    expect(faixasVotadas(null)).toEqual([]);
    expect(faixasVotadas(undefined)).toEqual([]);
    expect(faixasVotadas("nope")).toEqual([]);
  });

  it("lê id e monta o rótulo com título e artista", () => {
    const lista = faixasVotadas([
      { id: "id-1", provedor: "spotify", tipo: "faixa", titulo: "Perfect", artista: "Ed Sheeran", votos: 2 },
    ]);

    expect(lista).toEqual([{ id: "id-1", rotulo: "Perfect — Ed Sheeran" }]);
  });

  it("sem título, o rótulo cai para provedor + tipo", () => {
    const lista = faixasVotadas([{ id: "id-2", provedor: "spotify", tipo: "faixa", votos: 1 }]);
    expect(lista).toEqual([{ id: "id-2", rotulo: "Spotify · faixa" }]);
  });

  it("item sem id some da lista, o resto fica", () => {
    const lista = faixasVotadas([
      { provedor: "spotify", tipo: "faixa", titulo: "X" },
      { id: "id-3", provedor: "youtube", tipo: "faixa", titulo: "Y" },
      null,
    ]);

    expect(lista).toEqual([{ id: "id-3", rotulo: "Y" }]);
  });
});
