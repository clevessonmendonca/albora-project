import { describe, expect, it } from "vitest";
import {
  chaveProgressoMissoes,
  marcoMissao,
  photoPathForMission,
  proximaMissao,
  rotuloCtaAposEnvio,
} from "./missions-utils";

describe("proximaMissao", () => {
  it("devolve a primeira missão ainda aberta", () => {
    const missions = [
      { id: "a", title: "Chegada", done: true },
      { id: "b", title: "Pista", done: false },
      { id: "c", title: "Brinde", done: false },
    ];
    expect(proximaMissao(missions)?.id).toBe("b");
  });

  it("devolve null quando todas estão completas", () => {
    expect(proximaMissao([{ id: "a", title: "Chegada", done: true }])).toBeNull();
  });
});

describe("rotuloCtaAposEnvio", () => {
  it("prioriza a próxima missão no CTA primário", () => {
    expect(rotuloCtaAposEnvio({ title: "Pista" })).toBe("Próxima: Pista");
  });

  it("volta para continuar tirando quando o giro acabou", () => {
    expect(rotuloCtaAposEnvio(null)).toBe("Continuar tirando");
  });
});

describe("marcoMissao", () => {
  it("marca metade só a partir de 4 missões", () => {
    expect(marcoMissao(1, 2)).toBe("individual");
    expect(marcoMissao(2, 4)).toBe("halfway");
    expect(marcoMissao(4, 4)).toBe("all");
  });
});

describe("photoPathForMission", () => {
  it("encaminha para a câmera com a missão no query", () => {
    expect(photoPathForMission("festa", "m-1")).toBe("/e/festa/photo?missao=m-1");
  });
});

describe("chaveProgressoMissoes", () => {
  it("serializa id e done na ordem do pack", () => {
    expect(chaveProgressoMissoes([{ id: "a", done: true }, { id: "b", done: false }])).toBe(
      "a:true|b:false",
    );
  });
});
