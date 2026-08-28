import { describe, expect, it } from "vitest";
import { groupByHour, hourLabel } from "./group-by-hour";

/** Datas com construtor local (não ISO `Z`) — agrupamento é no fuso do aparelho; `Z` faria o teste falhar no CI em UTC. */
function em(hora: number, minuto: number, dia = 9): Date {
  return new Date(2026, 7, dia, hora, minuto, 0, 0);
}

function item(id: string, criadaEm: Date | string) {
  return { id, criadaEm };
}

describe("agrupar por hora", () => {
  it("junta o que caiu na mesma hora e separa o que não caiu", () => {
    const grupos = groupByHour(
      [item("a", em(23, 5)), item("b", em(23, 58)), item("c", em(22, 10))],
      { temMais: false },
    );

    expect(grupos.map((g) => g.hora)).toEqual([23, 22]);
    expect(grupos[0]?.itens.map((i) => i.id)).toEqual(["a", "b"]);
    expect(grupos[1]?.itens.map((i) => i.id)).toEqual(["c"]);
  });

  it("entrega os grupos do mais recente para o mais antigo", () => {
    const grupos = groupByHour([item("a", em(21, 0)), item("b", em(23, 0)), item("c", em(22, 0))], {
      temMais: false,
    });

    expect(grupos.map((g) => g.hora)).toEqual([23, 22, 21]);
  });

  it("dentro do grupo a hora corre para frente, mesmo com a entrada fora de ordem", () => {
    const grupos = groupByHour([item("c", em(23, 50)), item("a", em(23, 1)), item("b", em(23, 30))], {
      temMais: false,
    });

    expect(grupos[0]?.itens.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("23h de dois dias são duas horas diferentes", () => {
    const grupos = groupByHour([item("sabado", em(23, 10, 9)), item("domingo", em(23, 10, 10))], {
      temMais: false,
    });

    expect(grupos).toHaveLength(2);
    expect(grupos.map((g) => g.itens[0]?.id)).toEqual(["domingo", "sabado"]);
  });

  it("aceita o instante como string, que é o que chega pela rede", () => {
    const grupos = groupByHour([item("a", em(20, 15).toISOString())], { temMais: false });

    expect(grupos[0]?.itens.map((i) => i.id)).toEqual(["a"]);
    expect(grupos[0]?.hora).toBe(20);
  });

  it("descarta instante ilegível em vez de criar um grupo inválido", () => {
    const grupos = groupByHour([item("bom", em(21, 0)), item("torto", "nem data é")], {
      temMais: false,
    });

    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.itens.map((i) => i.id)).toEqual(["bom"]);
  });

  it("com página pendente, só a hora mais antiga fica incompleta", () => {
    const grupos = groupByHour([item("a", em(23, 0)), item("b", em(22, 0)), item("c", em(21, 0))], {
      temMais: true,
    });

    expect(grupos.map((g) => g.completo)).toEqual([true, true, false]);
  });

  it("sem página pendente, toda hora está fechada", () => {
    const grupos = groupByHour([item("a", em(23, 0)), item("b", em(22, 0))], { temMais: false });

    expect(grupos.every((g) => g.completo)).toBe(true);
  });

  it("o início da hora zera minuto, segundo e milissegundo", () => {
    const grupos = groupByHour([item("a", em(23, 47))], { temMais: false });
    const inicio = grupos[0]?.inicio;

    expect(inicio?.getHours()).toBe(23);
    expect(inicio?.getMinutes()).toBe(0);
    expect(inicio?.getSeconds()).toBe(0);
    expect(inicio?.getMilliseconds()).toBe(0);
  });

  it("lista vazia não vira grupo vazio", () => {
    expect(groupByHour([], { temMais: false })).toEqual([]);
    expect(groupByHour([], { temMais: true })).toEqual([]);
  });

  it("não muta a lista recebida", () => {
    const entrada = [item("a", em(21, 0)), item("b", em(23, 0))];
    groupByHour(entrada, { temMais: false });

    expect(entrada.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("rótulo da hora", () => {
  it("é numeral arábico com dois dígitos", () => {
    expect(hourLabel(23)).toBe("23h");
    expect(hourLabel(9)).toBe("09h");
    expect(hourLabel(0)).toBe("00h");
  });
});
