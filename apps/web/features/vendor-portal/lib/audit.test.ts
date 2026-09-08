import { describe, expect, it, vi, beforeEach } from "vitest";

const { insertAuditLog } = vi.hoisted(() => ({ insertAuditLog: vi.fn().mockResolvedValue("audit-id") }));
vi.mock("@albora/db", () => ({ insertAuditLog }));

const { auditarAgregacaoDoPortal } = await import("./audit");

function poolFalso() {
  const client = { query: vi.fn(), release: vi.fn() };
  return { connect: vi.fn().mockResolvedValue(client) };
}

beforeEach(() => {
  insertAuditLog.mockClear();
  insertAuditLog.mockResolvedValue("audit-id");
});

describe("auditarAgregacaoDoPortal", () => {
  it("grava em audit_log com actor_kind 'host', action do portal e o motivo recebido, ANTES de qualquer agregação — aguardada", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-1", "host@exemplo.test");

    let agregacaoRodou = false;
    await auditar({ motivo: "vendor_dashboard:vendor-1", em: new Date("2026-09-06T10:00:00Z") });
    agregacaoRodou = true; // só chega aqui se o await acima não lançou

    expect(insertAuditLog).toHaveBeenCalledTimes(1);
    expect(insertAuditLog).toHaveBeenCalledWith(expect.anything(), {
      actorKind: "host",
      actorId: "conta-1",
      actorLabel: "h***@e***",
      action: "vendor_portal.aggregation.read",
      targetKind: "platform",
      targetId: null,
      reason: "vendor_dashboard:vendor-1",
    });
    expect(agregacaoRodou).toBe(true);
  });

  it("actorId nulo quando o host ainda não foi resolvido — resolução pública do slug, antes da sessão", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, null);

    await auditar({ motivo: "vendor_public_resolve:studio-x", em: new Date() });

    expect(insertAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorId: null, actorLabel: null }),
    );
  });

  it("nunca grava o e-mail cru — actorLabel sempre mascarado", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-2", "fulano.completo@dominio-longo.test");

    await auditar({ motivo: "vendor_insights:vendor-2", em: new Date() });

    const [, entry] = insertAuditLog.mock.calls[0] as [unknown, { actorLabel: string | null }];
    expect(entry.actorLabel).not.toContain("fulano");
    expect(entry.actorLabel).not.toContain("dominio-longo");
    expect(entry.actorLabel).toBe("f***@d***");
  });

  it("metadata não é enviado — nada de PII em metadata pois não há metadata", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-3", "conta3@exemplo.test");

    await auditar({ motivo: "vendor_onboarding:criar:conta-3", em: new Date() });

    const [, entry] = insertAuditLog.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(entry.metadata).toBeUndefined();
  });

  it("reason vazio rejeita ANTES de conectar — pool.connect nunca é chamado", async () => {
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-4");

    await expect(auditar({ motivo: "   ", em: new Date() })).rejects.toThrow();

    expect(pool.connect).not.toHaveBeenCalled();
    expect(insertAuditLog).not.toHaveBeenCalled();
  });

  it("falha de insertAuditLog propaga — quem chama e aguarda não segue para a agregação (fire-and-forget foi recusado)", async () => {
    insertAuditLog.mockRejectedValueOnce(new Error("conexão caiu"));
    const pool = poolFalso();
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-5");

    let agregacaoRodou = false;
    await expect(
      (async () => {
        await auditar({ motivo: "vendor_dashboard:vendor-5", em: new Date() });
        agregacaoRodou = true; // não deve ser alcançado
      })(),
    ).rejects.toThrow("conexão caiu");

    expect(agregacaoRodou).toBe(false);
  });

  it("libera o client mesmo quando insertAuditLog falha", async () => {
    insertAuditLog.mockRejectedValueOnce(new Error("conexão caiu"));
    const pool = poolFalso();
    const client = { query: vi.fn(), release: vi.fn() };
    pool.connect = vi.fn().mockResolvedValue(client);
    const auditar = auditarAgregacaoDoPortal(pool as never, "conta-6");

    await expect(auditar({ motivo: "vendor_dashboard:vendor-6", em: new Date() })).rejects.toThrow();

    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
