import { describe, expect, it } from "vitest";
import type { DsarRequestRow, RetentionJobAdminRow, SecurityEventRow, SupportTicketAdmin } from "@albora/db";
import {
  atrasoLegivel,
  ordenarPendencias,
  pendenciaDeInadimplencia,
  pendenciaDeLgpd,
  pendenciaDeRetencao,
  pendenciaDeSeguranca,
  pendenciaDeSuporte,
} from "./console-attention";

const AGORA = new Date("2026-09-08T20:00:00Z");
const hAtras = (h: number) => new Date(AGORA.getTime() - h * 3_600_000);
const hFrente = (h: number) => new Date(AGORA.getTime() + h * 3_600_000);

function ticket(over: Partial<SupportTicketAdmin>): SupportTicketAdmin {
  return {
    id: "t1",
    accountId: "c1",
    eventId: null,
    subject: "assunto",
    status: "open",
    priority: "normal",
    slaDueAt: null,
    createdAt: AGORA,
    assigneeStaffId: null,
    ...over,
  } as SupportTicketAdmin;
}

function dsar(over: Partial<DsarRequestRow>): DsarRequestRow {
  return {
    id: "d1",
    kind: "delete",
    subjectAccountId: "c1",
    receivedAt: hAtras(72),
    legalDueAt: hFrente(24),
    status: "open",
    assigneeStaffId: null,
    evidenceUrl: null,
    completedAt: null,
    notes: null,
    ...over,
  } as DsarRequestRow;
}

function job(over: Partial<RetentionJobAdminRow>): RetentionJobAdminRow {
  return { id: "j1", eventId: "e1", kind: "d330_drive", status: "failed", dueAt: AGORA, attempts: 3, lastError: null, ...over };
}

function evento(kind: SecurityEventRow["kind"]): SecurityEventRow {
  return { kind } as SecurityEventRow;
}

describe("atrasoLegivel", () => {
  it("abaixo de uma hora fala em minutos", () => {
    expect(atrasoLegivel(20 * 60_000)).toBe("20min");
  });

  it("acima de uma hora fala em horas e minutos com dois dígitos", () => {
    expect(atrasoLegivel(6 * 3_600_000 + 20 * 60_000)).toBe("6h20");
    expect(atrasoLegivel(6 * 3_600_000 + 5 * 60_000)).toBe("6h05");
  });
});

describe("pendenciaDeSuporte", () => {
  it("ticket dentro do SLA não é pendência", () => {
    expect(pendenciaDeSuporte([ticket({ slaDueAt: hFrente(2) })], AGORA)).toBeNull();
  });

  it("ticket sem SLA definido não vira pendência inventada", () => {
    expect(pendenciaDeSuporte([ticket({ slaDueAt: null })], AGORA)).toBeNull();
  });

  it("SLA estourado é crítico e conta pelo mais antigo", () => {
    const item = pendenciaDeSuporte(
      [ticket({ id: "a", slaDueAt: hAtras(1) }), ticket({ id: "b", slaDueAt: hAtras(6.5) })],
      AGORA,
    );
    expect(item?.severidade).toBe("critico");
    expect(item?.titulo).toContain("2 ticket(s)");
    expect(item?.detalhe).toContain("6h30");
  });
});

describe("pendenciaDeLgpd", () => {
  it("prazo legal ainda no futuro não é pendência", () => {
    expect(pendenciaDeLgpd([dsar({})], AGORA)).toBeNull();
  });

  it("pedido já concluído não conta, mesmo com prazo vencido", () => {
    expect(pendenciaDeLgpd([dsar({ legalDueAt: hAtras(48), completedAt: hAtras(1) })], AGORA)).toBeNull();
  });

  it("prazo legal vencido é crítico", () => {
    const item = pendenciaDeLgpd([dsar({ legalDueAt: hAtras(48) })], AGORA);
    expect(item?.severidade).toBe("critico");
    expect(item?.href).toBe("/console/lgpd");
  });
});

describe("pendenciaDeRetencao", () => {
  it("sem job falhado não há pendência", () => {
    expect(pendenciaDeRetencao([job({ status: "done" })])).toBeNull();
  });

  it("falha que não é exclusão do dia 365 é atenção, não crítico", () => {
    expect(pendenciaDeRetencao([job({ kind: "d330_drive" })])?.severidade).toBe("atencao");
  });

  it("exclusão do dia 365 falhada é crítica — é prazo de retenção, não atraso de entrega", () => {
    const item = pendenciaDeRetencao([job({ kind: "d365_delete" })]);
    expect(item?.severidade).toBe("critico");
    expect(item?.detalhe).toContain("dia 365");
  });

  it("a linha nunca oferece reprocessar — retenção é só-leitura", () => {
    expect(pendenciaDeRetencao([job({})])?.href).toBe("/console/retention");
  });
});

describe("pendenciaDeSeguranca", () => {
  it("login.failed sozinho não vira 'pico' — sem linha de base, não há pico a afirmar", () => {
    expect(pendenciaDeSeguranca([evento("login.failed"), evento("login.failed")])).toBeNull();
  });

  it("qualquer reuso de sessão é crítico", () => {
    const item = pendenciaDeSeguranca([evento("session.reuse")]);
    expect(item?.severidade).toBe("critico");
    expect(item?.titulo).toContain("1 reuso(s)");
  });
});

describe("pendenciaDeInadimplencia", () => {
  it("zero em atraso não vira linha", () => {
    expect(pendenciaDeInadimplencia(0)).toBeNull();
  });

  it("em atraso é atenção", () => {
    expect(pendenciaDeInadimplencia(2)?.severidade).toBe("atencao");
  });
});

describe("ordenarPendencias", () => {
  it("crítico antes de atenção", () => {
    const itens = ordenarPendencias([
      pendenciaDeInadimplencia(1)!,
      pendenciaDeSeguranca([evento("session.reuse")])!,
    ]);
    expect(itens.map((i) => i.severidade)).toEqual(["critico", "atencao"]);
  });
});
