import { listEvents } from "@albora/application";
import { PageHeader } from "@albora/ui-web";
import { redirect } from "next/navigation";
import React from "react";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { EventsTable } from "@/features/console/components/client/events-table";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; cursor?: string }>;
}) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { search, status, cursor } = await searchParams;
  const { rows, nextCursor } = await listEvents(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    {
      actor,
      reason: "abrir /console/events",
      limit: 20,
      ...(search ? { search } : {}),
      ...(status === "draft" || status === "active" || status === "ended" ? { status } : {}),
      ...(cursor ? { cursor } : {}),
    },
  );

  return (
    <>
      <PageHeader title="Eventos" description="H1 por evento — ordene para achar quais festas funcionaram." />
      <EventsTable rows={rows} nextCursor={nextCursor} />
    </>
  );
}
