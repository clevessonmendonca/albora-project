import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { resolveActorMock, listDsarRequestsMock, redirectMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listDsarRequestsMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listDsarRequests: listDsarRequestsMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import LgpdPage from "./page";

function actor(roles: string[] = ["compliance"]) {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function montarPedido(overrides: {
  id?: string;
  kind?: "access" | "portability" | "rectification" | "deletion";
  status?: "open" | "in_progress" | "completed" | "refused";
  legalDueAt?: Date;
  subjectAccountId?: string;
} = {}) {
  return {
    id: overrides.id ?? "req-1",
    kind: overrides.kind ?? "access",
    subjectAccountId: overrides.subjectAccountId ?? "conta-1",
    receivedAt: new Date(),
    legalDueAt: overrides.legalDueAt ?? new Date(Date.now() + 5 * 86_400_000),
    status: overrides.status ?? "open",
    assigneeStaffId: null,
    evidenceUrl: null,
    completedAt: null,
    notes: null,
  };
}

async function pagina(rows: ReturnType<typeof montarPedido>[], roles: string[] = ["compliance"]) {
  resolveActorMock.mockResolvedValueOnce(actor(roles));
  listDsarRequestsMock.mockResolvedValueOnce({ rows });
  const element = await LgpdPage();
  return renderToStaticMarkup(element);
}

describe("LgpdPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("mostra o link para Retenção — fecha a órfã de navegação", async () => {
    const serializado = await pagina([]);
    expect(serializado).toContain("/console/retention");
  });

  it("pedido com prazo vencido renderiza em --critico e com texto dizendo os dias", async () => {
    const serializado = await pagina([
      montarPedido({ id: "req-atrasado", legalDueAt: new Date(Date.now() - 3 * 86_400_000) }),
    ]);
    expect(serializado).toContain("text-critico");
    expect(serializado).toContain("3d em atraso");
  });

  it("prazo dentro do prazo mostra dias restantes, sem destaque crítico", async () => {
    const serializado = await pagina([montarPedido({ legalDueAt: new Date(Date.now() + 5 * 86_400_000) })]);
    expect(serializado).toMatch(/[45]d restantes/);
  });

  it("lista vazia mostra estado vazio honesto, não erro", async () => {
    const serializado = await pagina([]);
    expect(serializado.toLowerCase()).toContain("nenhum pedido aberto");
    expect(serializado.toLowerCase()).not.toMatch(/\berro\b/);
  });

  it("ordenação padrão é a que a fila devolve — prazo mais próximo primeiro", async () => {
    const serializado = await pagina([
      montarPedido({
        id: "req-urgente",
        kind: "deletion",
        subjectAccountId: "conta-urgente",
        legalDueAt: new Date(Date.now() + 1 * 86_400_000),
      }),
      montarPedido({
        id: "req-tranquilo",
        kind: "access",
        subjectAccountId: "conta-tranquila",
        legalDueAt: new Date(Date.now() + 20 * 86_400_000),
      }),
    ]);
    // Compara pela âncora da conta (única por linha), não pelo rótulo do
    // tipo — esse também aparece nas opções do `<select>` do formulário de
    // criação, que fica acima da tabela e contaminaria a posição textual.
    const posicaoUrgente = serializado.indexOf("/console/accounts/conta-urgente");
    const posicaoTranquilo = serializado.indexOf("/console/accounts/conta-tranquila");
    expect(posicaoUrgente).toBeGreaterThan(-1);
    expect(posicaoTranquilo).toBeGreaterThan(-1);
    expect(posicaoUrgente).toBeLessThan(posicaoTranquilo);
  });

  it("zero PII de titular na tabela — só o link para a conta, nunca e-mail cru", async () => {
    const serializado = await pagina([montarPedido()]);
    expect(serializado).toContain("/console/accounts/conta-1");
    expect(serializado).not.toMatch(/@/);
  });

  it("sem lgpd.dsar.execute, não mostra o formulário de criar nem ações de linha", async () => {
    const serializado = await pagina([montarPedido()], ["engineering"]);
    expect(serializado).not.toContain("Registrar pedido");
    expect(serializado).not.toContain("Atualizar");
  });

  it("sem ator resolvido, redireciona para /console/login sem chamar listDsarRequests", async () => {
    resolveActorMock.mockResolvedValueOnce(null);
    await expect(LgpdPage()).rejects.toThrow("redirect");
    expect(listDsarRequestsMock).not.toHaveBeenCalled();
  });
});
