import { describe, expect, it } from "vitest";
import { cookieParaEscolha, escolhaDoDataset } from "./tema-do-painel";

describe("escolha de tema do painel", () => {
  it("sem atributo, segue o sistema", () => {
    expect(escolhaDoDataset(undefined)).toBe("system");
    expect(escolhaDoDataset("")).toBe("system");
  });

  it("valor estranho no dataset não vira tema: cai no sistema", () => {
    expect(escolhaDoDataset("roxo")).toBe("system");
    expect(escolhaDoDataset("DARK")).toBe("system");
  });

  it("reconhece as duas escolhas explícitas", () => {
    expect(escolhaDoDataset("light")).toBe("light");
    expect(escolhaDoDataset("dark")).toBe("dark");
  });

  it("voltar ao sistema apaga o cookie, não grava 'system'", () => {
    const c = cookieParaEscolha("system");

    expect(c).toContain("max-age=0");
    expect(c).not.toContain("system");
  });

  it("escolha explícita dura um ano e não viaja para outro site", () => {
    const c = cookieParaEscolha("dark");

    expect(c).toContain("albora_tema=dark");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
  });
});
