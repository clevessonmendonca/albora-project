import { describe, expect, it } from "vitest";
import { ABAS_FOTOS, abaAtiva } from "./abas-fotos";

describe("facetas da tela de Fotos", () => {
  it("são três, na ordem de quem chega para olhar antes de agir", () => {
    expect(ABAS_FOTOS.map((a) => a.id)).toEqual(["todas", "revisar", "destaques"]);
  });

  it("a URL limpa é a tela padrão", () => {
    expect(ABAS_FOTOS[0]?.suffix).toBe("");
  });

  it("toda aba tem rótulo", () => {
    for (const aba of ABAS_FOTOS) {
      expect(aba.rotulo.length).toBeGreaterThan(0);
    }
  });

  it("nenhuma aba divide sufixo com outra", () => {
    const sufixos = ABAS_FOTOS.map((a) => a.suffix);
    expect(new Set(sufixos).size).toBe(sufixos.length);
  });
});

describe("aba ativa", () => {
  it("sem query, é Todas", () => {
    expect(abaAtiva(undefined)).toBe("todas");
    expect(abaAtiva("")).toBe("todas");
  });

  it("reconhece as três", () => {
    expect(abaAtiva("todas")).toBe("todas");
    expect(abaAtiva("revisar")).toBe("revisar");
    expect(abaAtiva("destaques")).toBe("destaques");
  });

  it("valor desconhecido cai em Todas em vez de quebrar a tela", () => {
    expect(abaAtiva("lixo")).toBe("todas");
    expect(abaAtiva("../../etc/passwd")).toBe("todas");
  });
});
