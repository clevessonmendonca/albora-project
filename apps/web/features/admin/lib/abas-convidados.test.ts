import { describe, expect, it } from "vitest";
import { ABAS_CONVIDADOS, abaConvidadosAtiva } from "./abas-convidados";

describe("facetas da tela de Convidados", () => {
  it("são duas: como foi, e quem veio", () => {
    expect(ABAS_CONVIDADOS.map((a) => a.id)).toEqual(["participacao", "pessoas"]);
  });

  it("a URL limpa é a tela padrão", () => {
    expect(ABAS_CONVIDADOS[0]?.suffix).toBe("");
  });

  it("nenhuma faceta divide sufixo com outra", () => {
    const sufixos = ABAS_CONVIDADOS.map((a) => a.suffix);
    expect(new Set(sufixos).size).toBe(sufixos.length);
  });
});

describe("faceta ativa", () => {
  it("sem query, é Participação", () => {
    expect(abaConvidadosAtiva(undefined)).toBe("participacao");
    expect(abaConvidadosAtiva("")).toBe("participacao");
  });

  it("reconhece as duas", () => {
    expect(abaConvidadosAtiva("participacao")).toBe("participacao");
    expect(abaConvidadosAtiva("pessoas")).toBe("pessoas");
  });

  it("valor desconhecido não quebra a tela", () => {
    expect(abaConvidadosAtiva("lixo")).toBe("participacao");
    expect(abaConvidadosAtiva("../../etc/passwd")).toBe("participacao");
  });
});
