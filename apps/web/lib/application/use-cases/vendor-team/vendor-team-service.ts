import { VENDOR_PLAN_TEAM_LIMIT } from "@albora/core";
import {
  emitirMagicLink,
  fornecedorParaConta,
  listVendorTeam,
  removeVendorTeamMember,
  updateVendorTeamMemberRole as updateVendorTeamMemberRoleInDb,
  upsertVendorTeamMember,
  VALIDADE_MAGIC_LINK_MINUTOS,
  VendorTeamAccessError,
  VendorTeamLimitError,
  VendorTeamSelfManagementError,
  type VendorRole,
  type VendorTeamMember,
} from "@albora/db";
import type { Pool } from "pg";
import type { HostEmail } from "@/lib/email";
import { auditarAcaoDoFornecedor } from "@/features/vendor-portal/lib/audit";

export type VendorTeamDependencies = {
  pool: Pool;
  aggregatorPool: Pool;
  sessionSecret: string;
  sendEmail: (mail: HostEmail) => Promise<{ enviado: boolean }>;
};

export type VendorTeamActor = { accountId: string; email: string | null };

const aggregationAuditAlreadyPersisted = () => undefined;

async function requireAdminVendor(
  deps: VendorTeamDependencies,
  actor: VendorTeamActor,
  vendorId: string,
) {
  const vendor = await fornecedorParaConta(deps.pool, actor.accountId, vendorId);
  if (!vendor || vendor.role !== "admin") throw new VendorTeamAccessError();
  return vendor;
}

async function audit(
  deps: VendorTeamDependencies,
  actor: VendorTeamActor,
  vendorId: string,
  action: string,
  reason: string,
  metadata?: Record<string, unknown>,
) {
  await auditarAcaoDoFornecedor(deps.pool, {
    actorId: actor.accountId,
    actorEmail: actor.email,
    action,
    vendorId,
    reason,
    ...(metadata ? { metadata } : {}),
  });
}

export async function loadVendorTeam(
  deps: VendorTeamDependencies,
  actor: VendorTeamActor,
  vendorId: string,
) {
  const vendor = await requireAdminVendor(deps, actor, vendorId);
  await audit(deps, actor, vendorId, "vendor.team.read", "listar equipe do fornecedor");
  const members = await listVendorTeam(
    deps.pool,
    deps.aggregatorPool,
    actor.accountId,
    vendorId,
    aggregationAuditAlreadyPersisted,
  );
  return {
    vendor,
    members,
    teamLimit: VENDOR_PLAN_TEAM_LIMIT[vendor.plan],
  };
}

export async function inviteVendorTeamMember(
  deps: VendorTeamDependencies,
  actor: VendorTeamActor,
  input: { vendorId: string; email: string; role: VendorRole; origin: string },
): Promise<VendorTeamMember[]> {
  const vendor = await requireAdminVendor(deps, actor, input.vendorId);
  await audit(deps, actor, input.vendorId, "vendor.team.read", "verificar limite antes de convidar");
  const currentMembers = await listVendorTeam(
    deps.pool,
    deps.aggregatorPool,
    actor.accountId,
    input.vendorId,
    aggregationAuditAlreadyPersisted,
  );
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = currentMembers.find((member) => member.email.toLowerCase() === normalizedEmail);
  if (existing?.accountId === actor.accountId) throw new VendorTeamSelfManagementError();
  const teamLimit = VENDOR_PLAN_TEAM_LIMIT[vendor.plan];
  if (!existing && teamLimit !== null && currentMembers.length >= teamLimit) {
    throw new VendorTeamLimitError(teamLimit);
  }

  await audit(deps, actor, input.vendorId, "vendor.team.member.invite", "convidar membro", {
    role: input.role,
  });
  const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
  const { token, accountId } = await emitirMagicLink(
    deps.pool,
    deps.sessionSecret,
    normalizedEmail,
    expiresAt,
  );
  const members = await upsertVendorTeamMember(
    deps.pool,
    deps.aggregatorPool,
    {
      actorAccountId: actor.accountId,
      vendorId: input.vendorId,
      targetAccountId: accountId,
      role: input.role,
    },
    aggregationAuditAlreadyPersisted,
  );

  const next = vendor.slug ? `/f/${vendor.slug}` : "/admin";
  const link = `${input.origin}/admin/sign-in?m=${token}&next=${encodeURIComponent(next)}`;
  await deps.sendEmail({
    to: normalizedEmail,
    subject: `Convite para a equipe de ${vendor.name}`,
    text: [
      `Você foi convidado para trabalhar na equipe de ${vendor.name} na Albora.`,
      "",
      "Acesse pelo link abaixo. Ele é válido por poucos minutos:",
      "",
      link,
      "",
      "Se você não esperava este convite, ignore este e-mail.",
    ].join("\n"),
  });
  return members;
}

export async function updateVendorTeamMemberRole(
  deps: VendorTeamDependencies,
  actor: VendorTeamActor,
  input: { vendorId: string; accountId: string; role: VendorRole },
) {
  await requireAdminVendor(deps, actor, input.vendorId);
  await audit(deps, actor, input.vendorId, "vendor.team.member.role.update", "alterar papel", {
    targetAccountId: input.accountId,
    role: input.role,
  });
  const members = await updateVendorTeamMemberRoleInDb(
    deps.pool,
    deps.aggregatorPool,
    {
      actorAccountId: actor.accountId,
      vendorId: input.vendorId,
      targetAccountId: input.accountId,
      role: input.role,
    },
    aggregationAuditAlreadyPersisted,
  );
  if (!members) throw new VendorTeamAccessError();
  return members;
}

export async function deleteVendorTeamMember(
  deps: VendorTeamDependencies,
  actor: VendorTeamActor,
  input: { vendorId: string; accountId: string },
) {
  await requireAdminVendor(deps, actor, input.vendorId);
  await audit(deps, actor, input.vendorId, "vendor.team.member.remove", "remover membro", {
    targetAccountId: input.accountId,
  });
  return removeVendorTeamMember(
    deps.pool,
    deps.aggregatorPool,
    {
      actorAccountId: actor.accountId,
      vendorId: input.vendorId,
      targetAccountId: input.accountId,
    },
    aggregationAuditAlreadyPersisted,
  );
}
