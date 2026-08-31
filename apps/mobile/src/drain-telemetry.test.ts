import { describe, expect, it } from "vitest";
import { telemetryFromSummary, resumoDrainTexto, formatarHorarioDrain } from "./drain-telemetry";

describe("drain-telemetry", () => {
  it("monta telemetria a partir do summary", () => {
    const t = telemetryFromSummary(
      { enviados: 2, retentar: 1, desistiram: 0, resultados: [] },
      "background",
      "2026-08-22T12:00:00.000Z",
    );
    expect(t).toMatchObject({ origem: "background", enviados: 2, retentar: 1 });
  });

  it("texto PT para envio", () => {
    const txt = resumoDrainTexto(
      telemetryFromSummary(
        { enviados: 1, retentar: 0, desistiram: 0, resultados: [] },
        "foreground",
        "2026-08-22T15:30:00.000Z",
      ),
    );
    expect(txt).toContain("enviada");
    expect(txt).toContain("ao voltar");
  });

  it("formata horário local", () => {
    expect(formatarHorarioDrain("invalid")).toBe("invalid");
  });
});
