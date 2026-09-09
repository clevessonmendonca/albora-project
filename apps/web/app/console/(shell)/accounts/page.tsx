import React from "react";
import { redirect } from "next/navigation";
import { listAccounts } from "@albora/application";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { AccountsTable } from "@/features/console/components/client/accounts-table";
import { TituloDaTela } from "@/features/console/components/server/console-primitivos";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; plan?: string; status?: string; cursor?: string }>;
}) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { search, type, plan, status, cursor } = await searchParams;
  const { rows, nextCursor } = await listAccounts(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    {
      actor,
      reason: "abrir /console/accounts",
      limit: 20,
      ...(search ? { search } : {}),
      ...(type === "host" || type === "vendor" ? { type } : {}),
      ...(plan ? { plan } : {}),
      ...(status === "trial" || status === "active" || status === "suspended" || status === "churned"
        ? { status }
        : {}),
      ...(cursor ? { cursor } : {}),
    },
  );

  return (
    <>
      <TituloDaTela
        titulo="Contas"
        descricao="Anfitriões e fornecedores da plataforma — contato mascarado por padrão."
      />
      <AccountsTable rows={rows} nextCursor={nextCursor} />
    </>
  );
}
