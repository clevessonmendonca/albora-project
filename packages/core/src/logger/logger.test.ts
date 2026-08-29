import { describe, expect, it } from "vitest";
import { maskPii } from "./index";

describe("maskPii", () => {
  it("mascara e-mail mantendo domínio visível o suficiente para debug", () => {
    expect(maskPii("ana@example.com")).toBe("an***@example.com");
  });

  it("mascara telefone", () => {
    expect(maskPii("+5511987654321")).toBe("+551****21");
  });

  it("mascara nomes curtos por completo", () => {
    expect(maskPii("Jo")).toBe("***");
  });
});
