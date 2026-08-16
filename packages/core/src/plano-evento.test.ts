import { describe, expect, it } from "vitest";
import {
  limiteVideosPorConvidado,
  parsePlanoDoEvento,
  planoParaRedimensionamento,
  podeBaixarZip,
  podeEnviarVideo,
  podeUsarTelao,
} from "./plano-evento";

describe("plano-evento", () => {
  it("free permite um vídeo por convidado", () => {
    expect(limiteVideosPorConvidado("free")).toBe(1);
    expect(podeEnviarVideo("free", 0)).toBe(true);
    expect(podeEnviarVideo("free", 1)).toBe(false);
  });

  it("celebration e vendor não limitam vídeo", () => {
    for (const plano of ["celebration", "vendor"] as const) {
      expect(limiteVideosPorConvidado(plano)).toBeNull();
      expect(podeEnviarVideo(plano, 99)).toBe(true);
    }
  });

  it("mapeia resolução de imagem", () => {
    expect(planoParaRedimensionamento("free")).toBe("gratis");
    expect(planoParaRedimensionamento("celebration")).toBe("pago");
  });

  it("parse desconhecido cai em free", () => {
    expect(parsePlanoDoEvento("x")).toBe("free");
    expect(parsePlanoDoEvento("vendor")).toBe("vendor");
  });

  it("telão e ZIP só nos planos pagos", () => {
    expect(podeUsarTelao("free")).toBe(false);
    expect(podeBaixarZip("free")).toBe(false);
    expect(podeUsarTelao("celebration")).toBe(true);
    expect(podeBaixarZip("vendor")).toBe(true);
  });
});
