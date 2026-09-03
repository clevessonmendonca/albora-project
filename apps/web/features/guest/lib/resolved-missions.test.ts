import { describe, expect, it } from "vitest";
import { resolveMissions, resolveMissionsWithStatus } from "./resolved-missions";

const PACK_ID = "casamento";

describe("resolveMissions", () => {
  it("usa tituloCustom quando presente", () => {
    const resultado = resolveMissions(PACK_ID, [
      { id: "m1", chaveTitulo: "missoes.titulo.selfie", tituloCustom: "Selfie Personalizado" },
    ]);
    expect(resultado).toEqual([
      { id: "m1", title: "Selfie Personalizado", emoji: null },
    ]);
  });

  it("resolve via pack quando não há tituloCustom", () => {
    const resultado = resolveMissions(PACK_ID, [
      { id: "m1", chaveTitulo: "missoes.titulo.selfie", tituloCustom: null },
    ]);
    expect(resultado[0]!.title).toBeTruthy();
    expect(resultado[0]!.id).toBe("m1");
  });

  it("fallback para chaveTitulo quando pack desconhecido", () => {
    const resultado = resolveMissions("desconhecido", [
      { id: "m1", chaveTitulo: "missoes.titulo.selfie", tituloCustom: null },
    ]);
    expect(resultado[0]!.title).toBe("missoes.titulo.selfie");
  });

  it("preserva emoji quando presente", () => {
    const resultado = resolveMissions(PACK_ID, [
      { id: "m1", chaveTitulo: null, tituloCustom: "Teste", emoji: "📸" },
    ]);
    expect(resultado[0]!.emoji).toBe("📸");
  });

  it("normaliza emoji undefined para null", () => {
    const resultado = resolveMissions(PACK_ID, [
      { id: "m1", chaveTitulo: null, tituloCustom: "Teste" },
    ]);
    expect(resultado[0]!.emoji).toBeNull();
  });

  it("lista vazia retorna lista vazia", () => {
    expect(resolveMissions(PACK_ID, [])).toEqual([]);
  });
});

describe("resolveMissionsWithStatus", () => {
  it("inclui campo done de cada desafio", () => {
    const resultado = resolveMissionsWithStatus(PACK_ID, [
      { id: "m1", chaveTitulo: null, tituloCustom: "A", emoji: null, feito: false },
      { id: "m2", chaveTitulo: null, tituloCustom: "B", emoji: null, feito: true },
    ]);
    expect(resultado[0]!.done).toBe(false);
    expect(resultado[1]!.done).toBe(true);
  });
});
