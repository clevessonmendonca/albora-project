import type { Pool } from "pg";
import { insertAuditLog } from "@albora/db";

export type AgregacaoDoPortalRegistro = { motivo: string; em: Date };

/**
 * Mascara e-mail para `actorLabel` — mesma lógica de `maskPii`
 * (`packages/core/src/structured-logging.ts`), reimplementada aqui em vez
 * de importada: `@albora/core` só expõe `./src/index.ts` (`exports: {"."
 * : "./src/index.ts"}` no `package.json`), que não reexporta `maskPii`, e
 * abrir esse export é mudança de pacote fora do escopo desta task.
 */
function actorLabelMascarado(email: string | null): string | null {
  if (!email) return null;
  const [local = "", domain = ""] = email.split("@");
  const maskedLocal = local.length > 0 ? `${local[0]}***` : "***";
  const maskedDomain = domain.length > 0 ? `${domain[0]}***` : "***";
  return `${maskedLocal}@${maskedDomain}`;
}

export type AcaoDoFornecedor = {
  actorId: string;
  actorEmail: string | null;
  action: string;
  vendorId: string;
  reason: string;
  metadata?: Record<string, unknown>;
};

/** Registra uma ação administrativa do fornecedor antes da operação privilegiada. */
export async function auditarAcaoDoFornecedor(
  pool: Pool,
  input: AcaoDoFornecedor,
): Promise<void> {
  if (!input.reason.trim()) throw new Error("auditoria de fornecedor exige motivo");
  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "host",
      actorId: input.actorId,
      actorLabel: actorLabelMascarado(input.actorEmail),
      action: input.action,
      targetKind: "vendor",
      targetId: input.vendorId,
      reason: input.reason,
      metadata: input.metadata ?? {},
    });
  } finally {
    client.release();
  }
}

/**
 * Audita agregação cross-evento do portal do fornecedor — grava em
 * `audit_log`, não mais só `console.log` (CLAUDE.md: "quem cruzou eventos,
 * quando e por quê tem que ser consulta SQL, não grep").
 *
 * `withPlatformAggregation` (`packages/application/src/platform/aggregation.ts`)
 * NÃO serve aqui: exige um `Actor` de staff (`staffUserId` + `roles:
 * StaffRole[]`), e quem cruza evento pelo portal é um MEMBRO DE
 * FORNECEDOR (`accounts`/`vendor_members`), nunca staff — por isso
 * `actorKind: "host"` (valor válido em `audit_log` desde a migration
 * 0060, criado exatamente para isto).
 *
 * `comAgregacao` (`packages/db/src/event.ts`) chama o `auditar` que
 * recebe de forma SÍNCRONA, sem `PoolClient`, ANTES do `BEGIN` — não dá
 * para `await` uma escrita real ali dentro sem alterar essa assinatura, e
 * `comAgregacao` é primitivo compartilhado por outras cinco funções
 * (`marcaPublicaDoFornecedor`, `eventosDoFornecedor`, `resumoDoFornecedor`,
 * `criarFornecedor`, `ativarPlanoDoFornecedor`) — mudar isso é refactor
 * fora do escopo desta task.
 *
 * A saída — e é a mesma que `withPlatformAggregation` já usa (Onda A T7):
 * NÃO auditar dentro do callback síncrono. Esta fábrica devolve uma
 * função ASSÍNCRONA que cada call site AGUARDA antes de sequer chamar a
 * função do portal que embrulha `comAgregacao` (`marcaPublicaDoFornecedor`
 * etc.) — se a escrita falhar, a exceção sobe e a agregação cross-evento
 * nunca roda. É a mesma garantia do ADR 0016 §2 ("auditoria é
 * pré-condição, não efeito colateral"): cruzar tenant pelo portal é a
 * leitura mais sensível que o produto tem, e o custo é um INSERT antes de
 * carregar uma página — pequeno perto do risco de "quebramos RLS mas não
 * sobrou rastro". O callback que de fato chega a `comAgregacao`, no call
 * site, fica vazio, só com comentário explicando por quê (auditoria já
 * rodou acima).
 *
 * Fábrica: cada chamador amarra o `pool` (papel `albora_app`, dono do
 * GRANT em `audit_log` — diferente do pool de agregação, que usa
 * `albora_agregador`, sem esse GRANT) e o `actorId`/`actorEmail`
 * conhecidos NAQUELE ponto da chamada. `actorId` pode ser `null` — ver
 * `load-vendor-portal.ts`, onde o slug do fornecedor resolve ANTES da
 * sessão do host.
 */
export function auditarAgregacaoDoPortal(
  pool: Pool,
  actorId: string | null,
  actorEmail: string | null = null,
): (registro: AgregacaoDoPortalRegistro) => Promise<void> {
  const actorLabel = actorLabelMascarado(actorEmail);

  return async (registro) => {
    if (!registro.motivo.trim()) {
      // Mesma exigência de `comAgregacao` ("agregação exige motivo") — rejeita
      // antes de sequer abrir conexão, não depois de gastar um `pool.connect()`.
      throw new Error("auditoria de agregação exige motivo");
    }

    const client = await pool.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "host",
        actorId,
        actorLabel,
        action: "vendor_portal.aggregation.read",
        targetKind: "platform",
        targetId: null,
        reason: registro.motivo,
      });
    } finally {
      client.release();
    }
  };
}
