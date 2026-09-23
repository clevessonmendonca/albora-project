import { describe, expect, it } from "vitest";
import { proximosPassos, type SinaisDoEvento } from "./proximos-passos";

const base = "/admin/e/abc";

const tudoFeito: SinaisDoEvento = {
  fase: "antes",
  temCapa: true,
  temIdentidade: true,
  missoes: 8,
  convidadosEsperados: 80,
  gateDefinido: true,
};

const nadaFeito: SinaisDoEvento = {
  fase: "antes",
  temCapa: false,
  temIdentidade: false,
  missoes: 0,
  convidadosEsperados: 0,
  gateDefinido: false,
};

describe("próximos passos", () => {
  it("com tudo pronto, não sobra passo nenhum", () => {
    expect(proximosPassos(tudoFeito, base)).toEqual([]);
  });

  it("no máximo três, para continuar sendo prioridade", () => {
    expect(proximosPassos(nadaFeito, base)).toHaveLength(3);
  });

  it("missões vêm antes de tudo: é o que move participação", () => {
    expect(proximosPassos(nadaFeito, base)[0]?.id).toBe("missoes");
  });

  it("a ordem é fixa e por impacto", () => {
    expect(proximosPassos(nadaFeito, base).map((p) => p.id)).toEqual([
      "missoes",
      "capa",
      "identidade",
    ]);
  });

  it("o que já está feito não é cobrado", () => {
    const comMissoes = { ...nadaFeito, missoes: 8 };

    expect(proximosPassos(comMissoes, base).map((p) => p.id)).toEqual([
      "capa",
      "identidade",
      "convidados",
    ]);
  });

  it("o gate entra por último, porque tem padrão sensato", () => {
    const soGate = { ...tudoFeito, gateDefinido: false };

    expect(proximosPassos(soGate, base).map((p) => p.id)).toEqual(["gate"]);
  });

  it("evento em rascunho também prepara", () => {
    expect(proximosPassos({ ...nadaFeito, fase: "rascunho" }, base).length).toBeGreaterThan(0);
  });

  it("depois que a festa começou, preparar não é conselho útil", () => {
    expect(proximosPassos({ ...nadaFeito, fase: "durante" }, base)).toEqual([]);
    expect(proximosPassos({ ...nadaFeito, fase: "depois" }, base)).toEqual([]);
  });

  it("cada passo leva direto à tela que resolve, e diz o porquê", () => {
    for (const passo of proximosPassos(nadaFeito, base)) {
      expect(passo.href.startsWith(base)).toBe(true);
      expect(passo.rotulo.length).toBeGreaterThan(0);
      expect(passo.porque.length).toBeGreaterThan(0);
    }
  });

  it("o rótulo é verbo específico, nunca 'Gerenciar'", () => {
    for (const passo of proximosPassos(nadaFeito, base)) {
      expect(passo.rotulo).not.toMatch(/Gerenciar/i);
    }
  });
});
