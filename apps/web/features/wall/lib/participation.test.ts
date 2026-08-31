import { describe, expect, it } from "vitest";
import { paraContadoresDaParede, rotuloDosContadores } from "./participation";

describe("paraContadoresDaParede não inventa número", () => {
  it("aceita o par válido e trunca fração", () => {
    expect(paraContadoresDaParede({ fotos: 847.9, convidados: 63 })).toEqual({
      fotos: 847,
      convidados: 63,
    });
  });

  it("some quando o campo não vem no payload", () => {
    expect(paraContadoresDaParede(undefined)).toBeNull();
  });

  it("some para qualquer forma que não seja o par esperado", () => {
    expect(paraContadoresDaParede(null)).toBeNull();
    expect(paraContadoresDaParede("847")).toBeNull();
    expect(paraContadoresDaParede(847)).toBeNull();
    expect(paraContadoresDaParede([])).toBeNull();
    expect(paraContadoresDaParede({ fotos: 847 })).toBeNull();
    expect(paraContadoresDaParede({ fotos: 847, convidados: "63" })).toBeNull();
  });

  it("some para número negativo ou não finito — nunca mostra contagem inválida", () => {
    expect(paraContadoresDaParede({ fotos: -1, convidados: 0 })).toBeNull();
    expect(paraContadoresDaParede({ fotos: 0, convidados: Number.NaN })).toBeNull();
    expect(paraContadoresDaParede({ fotos: Number.POSITIVE_INFINITY, convidados: 0 })).toBeNull();
  });

  it("zero fotos e zero convidados é válido — quem decide esconder é a UI", () => {
    expect(paraContadoresDaParede({ fotos: 0, convidados: 0 })).toEqual({
      fotos: 0,
      convidados: 0,
    });
  });
});

describe("rotuloDosContadores flexiona singular e plural", () => {
  it("plural nos dois lados", () => {
    expect(rotuloDosContadores({ fotos: 847, convidados: 63 })).toBe(
      "847 fotos · 63 pessoas",
    );
  });

  it("singular em cada lado, independente do outro", () => {
    expect(rotuloDosContadores({ fotos: 1, convidados: 63 })).toBe("1 foto · 63 pessoas");
    expect(rotuloDosContadores({ fotos: 847, convidados: 1 })).toBe("847 fotos · 1 pessoa");
  });
});
