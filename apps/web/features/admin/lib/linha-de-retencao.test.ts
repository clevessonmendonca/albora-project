import { describe, expect, it } from "vitest";
import { linhaDeRetencao, type MarcoCru } from "./linha-de-retencao";

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date(Date.UTC(2026, 8, 20));

function fimHa(dias: number): Date {
  return new Date(AGORA.getTime() - dias * DIA_MS);
}

function job(kind: string, p: Partial<MarcoCru> = {}): MarcoCru {
  return {
    kind,
    status: "pending",
    dueAt: new Date(Date.UTC(2027, 0, 1)).toISOString(),
    completedAt: null,
    ...p,
  };
}

describe("linhaDeRetencao", () => {
  it("sem job agendado, calcula os marcos a partir do fim do evento", () => {
    const linha = linhaDeRetencao(fimHa(30), [], AGORA);

    expect(linha.nos.map((n) => n.chave)).toEqual([
      "agora",
      "d330_drive",
      "d358_warn",
      "d365_delete",
    ]);
    expect(linha.diasAteApagar).toBe(335);
    expect(linha.urgente).toBe(false);
  });

  it("usa a data do job real em vez da calculada", () => {
    const real = new Date(Date.UTC(2026, 11, 25)).toISOString();
    const linha = linhaDeRetencao(fimHa(30), [job("d365_delete", { dueAt: real })], AGORA);

    expect(linha.d365.toISOString()).toBe(real);
  });

  it("job concluído vira marco já acontecido, não promessa futura", () => {
    const linha = linhaDeRetencao(
      fimHa(340),
      [job("d330_drive", { status: "done", completedAt: AGORA.toISOString() })],
      AGORA,
    );

    const drive = linha.nos.find((n) => n.chave === "d330_drive");
    expect(drive?.estado).toBe("feito");
    expect(drive?.detalhe).toBe("Já aconteceu.");
  });

  it("job pendente continua como futuro", () => {
    const linha = linhaDeRetencao(fimHa(340), [job("d330_drive")], AGORA);
    expect(linha.nos.find((n) => n.chave === "d330_drive")?.estado).toBe("futuro");
  });

  it("vira urgente a 35 dias do apagamento e só o nó do delete é crítico", () => {
    expect(linhaDeRetencao(fimHa(330), [], AGORA).urgente).toBe(true);
    expect(linhaDeRetencao(fimHa(329), [], AGORA).urgente).toBe(false);

    const criticos = linhaDeRetencao(fimHa(330), [], AGORA).nos.filter((n) => n.critico);
    expect(criticos.map((n) => n.chave)).toEqual(["d365_delete"]);
  });

  it("não deixa o prazo virar negativo depois de vencido", () => {
    expect(linhaDeRetencao(fimHa(400), [], AGORA).diasAteApagar).toBe(0);
  });

  it("plus_48h é operação interna e não entra na linha", () => {
    const linha = linhaDeRetencao(fimHa(1), [job("plus_48h", { status: "done" })], AGORA);
    expect(linha.nos.some((n) => String(n.chave).includes("48h"))).toBe(false);
  });
});
