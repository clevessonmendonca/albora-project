import { describe, expect, it } from "vitest";
import { eventColorVariables, eventOnContrast } from "./event-color";

describe("eventColorVariables", () => {
  it("deriva o par completo da cor 1", () => {
    const vars = eventColorVariables("#7A2E3A");
    expect(vars["--ev"]).toBe("#7A2E3A");
    // Hover é a cor 16% para o preto — mais escura, nunca a mesma.
    expect(vars["--ev-hover"]).not.toBe(vars["--ev"]);
    expect(vars["--ev-soft"]).toBe("#7A2E3A1F");
    expect(vars["--ev-tint"]).toBe("#7A2E3A0D");
    expect(vars["--ev-border"]).toBe("#7A2E3A3D");
  });

  it("aceita hex de 3 dígitos e sem #", () => {
    expect(eventColorVariables("f00")["--ev"]).toBe("#FF0000");
    expect(eventColorVariables("7A2E3A")["--ev"]).toBe("#7A2E3A");
  });

  it("hex inválido devolve vazio — chamador cai no âmbar do produto", () => {
    expect(eventColorVariables("não-é-cor")).toEqual({});
    expect(eventColorVariables("#12")).toEqual({});
  });

  it("cor escura recebe texto claro; cor clara recebe texto escuro", () => {
    const escura = eventColorVariables("#22415F");
    const clara = eventColorVariables("#F2D8B0");
    // --ev-on nunca é branco cego: adapta por contraste (design-system-v3 §2).
    expect(escura["--ev-on"]?.toUpperCase()).not.toBe(clara["--ev-on"]?.toUpperCase());
  });

  it("cor 2 adiciona só suas variáveis; sem cor 2 elas somem", () => {
    const com = eventColorVariables("#7A2E3A", "#22415F");
    expect(com["--ev-2"]).toBe("#22415F");
    expect(com["--ev-2-soft"]).toBe("#22415F29");
    expect(com["--ev-2-border"]).toBe("#22415F52");

    const sem = eventColorVariables("#7A2E3A");
    expect(sem["--ev-2"]).toBeUndefined();
  });

  it("cor 2 inválida é ignorada, cor 1 permanece", () => {
    const vars = eventColorVariables("#7A2E3A", "xyz");
    expect(vars["--ev"]).toBe("#7A2E3A");
    expect(vars["--ev-2"]).toBeUndefined();
  });
});

describe("eventOnContrast", () => {
  it("reporta a razão real do texto sobre a cor 1, sempre AA", () => {
    const razao = eventOnContrast("#7A2E3A");
    expect(razao).not.toBeNull();
    expect(razao!).toBeGreaterThanOrEqual(4.5);
  });

  it("hex inválido devolve null", () => {
    expect(eventOnContrast("nope")).toBeNull();
  });
});
