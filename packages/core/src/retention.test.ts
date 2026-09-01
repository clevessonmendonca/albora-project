import { describe, expect, it } from "vitest";
import {
  diasRestantesAteD365,
  GRACE_MINUTOS_DELETE,
  mayDeleteAtD365,
  planRetention,
  podeProcessarAgora,
} from "./retention";

describe("planRetention", () => {
  it("agenda +48h, D330, D358 e D365 a partir do fim do evento", () => {
    const ends = new Date("2026-08-10T06:00:00Z");
    const items = planRetention(ends, new Date("2026-08-10T07:00:00Z"));
    expect(items.map((i) => i.kind)).toEqual(["plus_48h", "d330_drive", "d358_warn", "d365_delete"]);
    expect(items[0]!.dueAt.toISOString()).toBe("2026-08-12T06:00:00.000Z");
    expect(items[1]!.dueAt.toISOString()).toBe("2027-07-06T06:00:00.000Z");
    expect(items[2]!.dueAt.toISOString()).toBe("2027-08-03T06:00:00.000Z");
    expect(items[3]!.dueAt.toISOString()).toBe("2027-08-10T06:00:00.000Z");
  });

  it("soma milissegundos a um instante absoluto — nunca aritmética de calendário local", () => {
    // Instante que cruza troca de horário de verão em fusos que a têm — a soma em ms nunca desliza um dia por causa disso.
    const ends = new Date("2026-10-17T23:30:00Z");
    const items = planRetention(ends, new Date(ends.getTime() - 1));
    const d365 = items.find((i) => i.kind === "d365_delete")!;
    expect(d365.dueAt.getTime() - ends.getTime()).toBe(365 * 24 * 3600 * 1000);
  });
});

describe("mayDeleteAtD365 — o gate que protege a deleção irreversível", () => {
  it("sem export nenhum: export_missing", () => {
    expect(mayDeleteAtD365({ bestExport: null, publishedAgora: 10 })).toEqual({
      ok: false,
      reason: "export_missing",
    });
  });

  it("export parcial nunca libera, mesmo cobrindo o snapshot inteiro", () => {
    expect(
      mayDeleteAtD365({
        bestExport: { estado: "parcial", publishedSnapshot: 10 },
        publishedAgora: 10,
      }),
    ).toEqual({ ok: false, reason: "export_parcial" });
  });

  it("export vazio nunca libera", () => {
    expect(
      mayDeleteAtD365({
        bestExport: { estado: "vazio", publishedSnapshot: 0 },
        publishedAgora: 0,
      }),
    ).toEqual({ ok: false, reason: "export_parcial" });
  });

  it("export pronto mas desatualizado (publicou mídia nova depois) não libera", () => {
    expect(
      mayDeleteAtD365({
        bestExport: { estado: "pronto", publishedSnapshot: 2998 },
        publishedAgora: 3000,
      }),
    ).toEqual({ ok: false, reason: "export_desatualizado" });
  });

  it("export pronto e publishedSnapshot igual ao publicado agora: libera", () => {
    expect(
      mayDeleteAtD365({
        bestExport: { estado: "pronto", publishedSnapshot: 3000 },
        publishedAgora: 3000,
      }),
    ).toEqual({ ok: true });
  });

  it("publishedSnapshot maior que o publicado agora (mídia removida depois) ainda cobre — libera", () => {
    expect(
      mayDeleteAtD365({
        bestExport: { estado: "pronto", publishedSnapshot: 3000 },
        publishedAgora: 2990,
      }),
    ).toEqual({ ok: true });
  });

  it("evento sem nenhuma mídia publicada, nunca (publishedAgora=0) — export vazio pronto libera", () => {
    expect(
      mayDeleteAtD365({
        bestExport: { estado: "pronto", publishedSnapshot: 0 },
        publishedAgora: 0,
      }),
    ).toEqual({ ok: true });
  });
});

describe("podeProcessarAgora — grace window: nunca cedo, atraso é seguro", () => {
  it("avisos (plus_48h, d330_drive, d358_warn) processam exatamente no vencimento", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    expect(podeProcessarAgora({ kind: "plus_48h", dueAt }, dueAt)).toBe(true);
    expect(podeProcessarAgora({ kind: "d330_drive", dueAt }, dueAt)).toBe(true);
    expect(podeProcessarAgora({ kind: "d358_warn", dueAt }, dueAt)).toBe(true);
  });

  it("avisos não processam antes do vencimento — even 1ms antes", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    const antes = new Date(dueAt.getTime() - 1);
    expect(podeProcessarAgora({ kind: "d358_warn", dueAt }, antes)).toBe(false);
  });

  it("d365_delete NUNCA processa exatamente no vencimento — precisa da folga inteira", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    expect(podeProcessarAgora({ kind: "d365_delete", dueAt }, dueAt)).toBe(false);
  });

  it("d365_delete não processa 1s antes do fim da folga de 60min", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    const quaseLa = new Date(dueAt.getTime() + GRACE_MINUTOS_DELETE * 60_000 - 1000);
    expect(podeProcessarAgora({ kind: "d365_delete", dueAt }, quaseLa)).toBe(false);
  });

  it("d365_delete processa exatamente ao fim da folga de 60min — limite inclusivo", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    const fimDaFolga = new Date(dueAt.getTime() + GRACE_MINUTOS_DELETE * 60_000);
    expect(podeProcessarAgora({ kind: "d365_delete", dueAt }, fimDaFolga)).toBe(true);
  });

  it("d365_delete processa depois da folga — atraso nunca bloqueia, só antecipação", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    const bemDepois = new Date(dueAt.getTime() + 30 * 24 * 3600 * 1000);
    expect(podeProcessarAgora({ kind: "d365_delete", dueAt }, bemDepois)).toBe(true);
  });

  it("365d − 1s (due_at ainda não chegou) nunca processa, nem como aviso nem como delete", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    const umSegundoAntes = new Date(dueAt.getTime() - 1000);
    expect(podeProcessarAgora({ kind: "d365_delete", dueAt }, umSegundoAntes)).toBe(false);
  });

  it("365d + 1s sem a folga de 60min continua bloqueado — a folga é sobre o dueAt, não sobre 'já passou o dia'", () => {
    const dueAt = new Date("2026-08-10T00:00:00Z");
    const umSegundoDepois = new Date(dueAt.getTime() + 1000);
    expect(podeProcessarAgora({ kind: "d365_delete", dueAt }, umSegundoDepois)).toBe(false);
  });

  it("dois eventos com due_at idêntico ao segundo avaliam de forma independente e consistente", () => {
    const dueAt = new Date("2026-12-31T23:59:59Z");
    const jobEventoX = { kind: "d365_delete" as const, dueAt };
    const jobEventoY = { kind: "d365_delete" as const, dueAt };
    const agora = new Date(dueAt.getTime() + GRACE_MINUTOS_DELETE * 60_000 + 5_000);

    // A função é pura: o mesmo dueAt produz a mesma decisão para os dois eventos — a exclusão mútua real (não processar o mesmo job duas vezes em runners concorrentes) é do pg_advisory_xact_lock em `retention-jobs.ts`, não desta função.
    expect(podeProcessarAgora(jobEventoX, agora)).toBe(true);
    expect(podeProcessarAgora(jobEventoY, agora)).toBe(true);
  });
});

describe("diasRestantesAteD365 — o aviso final nunca hardcoda 'faltam 7 dias'", () => {
  it("arredonda para cima — 6.1 dias restantes mostra 7", () => {
    const due = new Date("2026-08-17T00:00:00Z");
    const agora = new Date("2026-08-10T21:00:00Z");
    expect(diasRestantesAteD365(due, agora)).toBe(7);
  });

  it("runner atrasado: já venceu, mostra 0 — nunca negativo", () => {
    const due = new Date("2026-08-10T00:00:00Z");
    const agora = new Date("2026-08-15T00:00:00Z");
    expect(diasRestantesAteD365(due, agora)).toBe(0);
  });

  it("exatamente no vencimento: 0 dias", () => {
    const due = new Date("2026-08-10T00:00:00Z");
    expect(diasRestantesAteD365(due, due)).toBe(0);
  });
});
