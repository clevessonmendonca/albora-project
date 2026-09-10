import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  emitirMagicLink: vi.fn(),
  fornecedorParaConta: vi.fn(),
  listVendorTeam: vi.fn(),
  removeVendorTeamMember: vi.fn(),
  updateVendorTeamMemberRole: vi.fn(),
  upsertVendorTeamMember: vi.fn(),
}));
const audit = vi.hoisted(() => ({ auditarAcaoDoFornecedor: vi.fn() }));
vi.mock("@albora/db", () => ({
  ...db,
  VALIDADE_MAGIC_LINK_MINUTOS: 15,
  VendorTeamAccessError: class VendorTeamAccessError extends Error {},
  VendorTeamLimitError: class VendorTeamLimitError extends Error { constructor(public limit: number) { super(); } },
  VendorTeamSelfManagementError: class VendorTeamSelfManagementError extends Error {},
}));
vi.mock("@/features/vendor-portal/lib/audit", () => audit);

const { inviteVendorTeamMember, loadVendorTeam, updateVendorTeamMemberRole } = await import("./vendor-team-service");
const actor = { accountId: "11111111-1111-1111-1111-111111111111", email: "Admin@Aurora.test" };
const vendor = { id: "22222222-2222-2222-2222-222222222222", name: "Studio Aurora", slug: "aurora", plan: "studio", role: "admin", status: "active", brandTokens: {} } as const;
const admin = { accountId: actor.accountId, email: "admin@aurora.test", role: "admin", createdAt: new Date() } as const;
const deps = { pool: {} as never, aggregatorPool: {} as never, sessionSecret: "segredo", sendEmail: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  db.fornecedorParaConta.mockResolvedValue(vendor);
  db.listVendorTeam.mockResolvedValue([admin]);
  audit.auditarAcaoDoFornecedor.mockResolvedValue(undefined);
  deps.sendEmail.mockResolvedValue({ enviado: true });
});

describe("vendor team service", () => {
  it("carrega limite do domínio e audita antes de cruzar membros", async () => {
    const order: string[] = [];
    audit.auditarAcaoDoFornecedor.mockImplementation(async () => { order.push("audit"); });
    db.listVendorTeam.mockImplementation(async () => { order.push("list"); return [admin]; });
    const result = await loadVendorTeam(deps, actor, vendor.id);
    expect(result.teamLimit).toBe(5);
    expect(order).toEqual(["audit", "list"]);
  });

  it("no limite recusa antes de criar conta ou magic link", async () => {
    db.fornecedorParaConta.mockResolvedValue({ ...vendor, plan: "starter" });
    await expect(inviteVendorTeamMember(deps, actor, { vendorId: vendor.id, email: "nova@aurora.test", role: "staff", origin: "https://albora.test" })).rejects.toThrow();
    expect(db.emitirMagicLink).not.toHaveBeenCalled();
    expect(db.upsertVendorTeamMember).not.toHaveBeenCalled();
  });

  it("normaliza o e-mail, persiste o vínculo e só então envia o convite", async () => {
    const nextMembers = [admin, { ...admin, accountId: "33333333-3333-3333-3333-333333333333", email: "foto@aurora.test", role: "staff" }];
    db.emitirMagicLink.mockResolvedValue({ token: "token.assinado", accountId: nextMembers[1]!.accountId });
    db.upsertVendorTeamMember.mockResolvedValue(nextMembers);
    const members = await inviteVendorTeamMember(deps, actor, { vendorId: vendor.id, email: " Foto@Aurora.Test ", role: "staff", origin: "https://albora.test" });
    expect(members).toEqual(nextMembers);
    expect(db.emitirMagicLink).toHaveBeenCalledWith({}, "segredo", "foto@aurora.test", expect.any(Date));
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "foto@aurora.test", text: expect.stringContaining("%2Ff%2Faurora") }));
  });

  it("alterar papel usa UPDATE estrito e não o upsert de convite", async () => {
    db.updateVendorTeamMemberRole.mockResolvedValue([admin]);
    await updateVendorTeamMemberRole(deps, actor, { vendorId: vendor.id, accountId: "33333333-3333-3333-3333-333333333333", role: "admin" });
    expect(db.updateVendorTeamMemberRole).toHaveBeenCalledOnce();
    expect(db.upsertVendorTeamMember).not.toHaveBeenCalled();
  });
});
