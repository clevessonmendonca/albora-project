import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { getAggregatorPool, getPool } from "@/lib/db";
import { processRetentionJobs } from "@/lib/application/use-cases/admin";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Runner LGPD (spec §6): listagem via `getAggregatorPool()` (BYPASSRLS, cruza eventos); processamento via `getPool()` com `SET LOCAL`; purge R2 e revogação Drive pós-commit (idempotentes, try/catch para não parar o sweep). */
export async function postOpsRetencao(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  try {
    const resultado = await processRetentionJobs(getPool(), getAggregatorPool());
    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("ops.retencao", e);
  }
}
