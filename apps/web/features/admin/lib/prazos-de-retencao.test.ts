import { describe, expect, it } from "vitest";
import { prazosDeRetencao, type JobLido } from "./prazos-de-retencao";

const em = (iso: string) => new Date(iso);

const pendente = (kind: JobLido["kind"], dueAt: string): JobLido => ({
  kind,
  status: "pending",
  dueAt: em(dueAt),
  completedAt: null,
});

describe("prazos de retenção", () => {
  it("sem job agendado, não promete prazo nenhum", () => {
    const p = prazosDeRetencao([]);

    expect(p.exportaEm).toBeNull();
    expect(p.apagaEm).toBeNull();
    expect(p.jaExportou).toBe(false);
  });

  it("lê a data do envio para a nuvem e a da exclusão", () => {
    const p = prazosDeRetencao([
      pendente("d330_drive", "2027-05-01T00:00:00Z"),
      pendente("d365_delete", "2027-06-05T00:00:00Z"),
    ]);

    expect(p.exportaEm).toEqual(em("2027-05-01T00:00:00Z"));
    expect(p.apagaEm).toEqual(em("2027-06-05T00:00:00Z"));
  });

  it("exportação concluída é dito como feito, não como promessa futura", () => {
    const p = prazosDeRetencao([
      {
        kind: "d330_drive",
        status: "done",
        dueAt: em("2027-05-01T00:00:00Z"),
        completedAt: em("2027-05-01T03:00:00Z"),
      },
    ]);

    expect(p.jaExportou).toBe(true);
    expect(p.exportouEm).toEqual(em("2027-05-01T03:00:00Z"));
  });

  it("job que o runner pulou não vira promessa de exclusão", () => {
    const p = prazosDeRetencao([
      { kind: "d365_delete", status: "skipped", dueAt: em("2027-06-05T00:00:00Z"), completedAt: null },
    ]);

    expect(p.apagaEm).toBeNull();
  });

  it("ignora job que não é sobre o casal, como o aviso interno", () => {
    const p = prazosDeRetencao([pendente("plus_48h", "2026-06-03T00:00:00Z")]);

    expect(p.exportaEm).toBeNull();
    expect(p.apagaEm).toBeNull();
  });
});
