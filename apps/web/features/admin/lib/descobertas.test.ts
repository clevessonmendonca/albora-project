import { describe, expect, it } from "vitest";
import { descobertasDaFesta, ordenarPessoas, type Pessoa } from "./descobertas";

function pessoa(p: Partial<Pessoa> & { id: string; nome: string }): Pessoa {
  return {
    fotos: 0,
    entrouEm: "2026-09-20T20:00:00.000Z",
    primeiraFotoEm: null,
    ultimaFotoEm: null,
    ...p,
  };
}

describe("descobertasDaFesta", () => {
  it("não inventa destaque quando ninguém fotografou", () => {
    const so_entraram = [pessoa({ id: "1", nome: "Ana" }), pessoa({ id: "2", nome: "Bia" })];
    expect(descobertasDaFesta(so_entraram)).toEqual([]);
  });

  it("não dá medalha de topo para quem tirou uma foto só", () => {
    const uma = [
      pessoa({
        id: "1",
        nome: "Ana",
        fotos: 1,
        primeiraFotoEm: "2026-09-20T21:00:00.000Z",
        ultimaFotoEm: "2026-09-20T21:00:00.000Z",
      }),
    ];
    expect(descobertasDaFesta(uma).map((d) => d.chave)).toEqual(["primeira"]);
  });

  it("aponta quem mais registrou, a primeira foto e quem ficou até o fim", () => {
    const pessoas = [
      pessoa({
        id: "1",
        nome: "Ana",
        fotos: 9,
        primeiraFotoEm: "2026-09-20T22:00:00.000Z",
        ultimaFotoEm: "2026-09-20T23:00:00.000Z",
      }),
      pessoa({
        id: "2",
        nome: "Bia",
        fotos: 2,
        primeiraFotoEm: "2026-09-20T21:00:00.000Z",
        ultimaFotoEm: "2026-09-20T21:30:00.000Z",
      }),
      pessoa({
        id: "3",
        nome: "Caio",
        fotos: 3,
        primeiraFotoEm: "2026-09-20T22:30:00.000Z",
        ultimaFotoEm: "2026-09-21T02:00:00.000Z",
      }),
    ];

    const achado = descobertasDaFesta(pessoas);
    expect(achado.map((d) => [d.chave, d.pessoa.nome])).toEqual([
      ["top", "Ana"],
      ["primeira", "Bia"],
      ["fim", "Caio"],
    ]);
  });

  it("dá uma medalha por pessoa — sozinha na festa, um card só", () => {
    const sozinha = [
      pessoa({
        id: "1",
        nome: "Ana",
        fotos: 4,
        primeiraFotoEm: "2026-09-20T21:00:00.000Z",
        ultimaFotoEm: "2026-09-21T01:00:00.000Z",
      }),
    ];
    expect(descobertasDaFesta(sozinha).map((d) => d.chave)).toEqual(["top"]);
  });
});

describe("ordenarPessoas", () => {
  const pessoas = [
    pessoa({ id: "1", nome: "Ana Paula", fotos: 2, entrouEm: "2026-09-20T21:00:00.000Z" }),
    pessoa({ id: "2", nome: "Bia", fotos: 7, entrouEm: "2026-09-20T20:00:00.000Z" }),
    pessoa({ id: "3", nome: "Caio", fotos: 0, entrouEm: "2026-09-20T19:00:00.000Z" }),
    pessoa({ id: "4", nome: "João", fotos: 1, entrouEm: "2026-09-20T18:00:00.000Z" }),
  ];

  it("ordena por mais e por menos fotos", () => {
    expect(ordenarPessoas(pessoas, "", true).map((p) => p.nome)).toEqual([
      "Bia",
      "Ana Paula",
      "João",
      "Caio",
    ]);
    expect(ordenarPessoas(pessoas, "", false).map((p) => p.nome)).toEqual([
      "Caio",
      "João",
      "Ana Paula",
      "Bia",
    ]);
  });

  it("mantém quem não fotografou na lista — é quem o anfitrião precisa ver", () => {
    expect(ordenarPessoas(pessoas, "", true).some((p) => p.fotos === 0)).toBe(true);
  });

  it("busca ignora caixa e acento do que foi digitado", () => {
    expect(ordenarPessoas(pessoas, "ANA", true).map((p) => p.nome)).toEqual(["Ana Paula"]);
    expect(ordenarPessoas(pessoas, "  bia ", true).map((p) => p.nome)).toEqual(["Bia"]);
    // O convidado digita sem acento; o nome no banco tem.
    expect(ordenarPessoas(pessoas, "joao", true).map((p) => p.nome)).toEqual(["João"]);
    expect(ordenarPessoas(pessoas, "JOÃO", true).map((p) => p.nome)).toEqual(["João"]);
  });

  it("empate de fotos desempata por quem entrou antes", () => {
    const empate = [
      pessoa({ id: "1", nome: "Tarde", fotos: 3, entrouEm: "2026-09-20T22:00:00.000Z" }),
      pessoa({ id: "2", nome: "Cedo", fotos: 3, entrouEm: "2026-09-20T20:00:00.000Z" }),
    ];
    expect(ordenarPessoas(empate, "", true).map((p) => p.nome)).toEqual(["Cedo", "Tarde"]);
  });
});
