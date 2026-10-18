import { describe, expect, it } from "vitest";
import { erroDeCriacao } from "./erro-de-criacao";

describe("erroDeCriacao", () => {
  it("sessão expirada pede para entrar de novo", () => {
    expect(erroDeCriacao(401)).toMatchObject({ precisaEntrar: true });
  });

  it("cada causa tem texto próprio, nenhum é o genérico antigo", () => {
    const textos = [403, 422, 429, 500, null].map((s) => erroDeCriacao(s).texto);
    expect(new Set(textos).size).toBe(textos.length);
    for (const t of textos) expect(t).not.toContain("Confira os dados e tente de novo");
  });

  it("422 usa a mensagem do servidor quando existe", () => {
    expect(erroDeCriacao(422, "Datas inválidas").texto).toContain("Datas inválidas");
  });
});
