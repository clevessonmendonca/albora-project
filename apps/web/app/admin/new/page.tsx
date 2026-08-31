import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { CreateEventWizard } from "@/features/admin/components/client/create-event-wizard";
import { adminVars } from "@/features/admin/components/server/admin-shell";

export const dynamic = "force-dynamic";

/** Criar evento — só para quem entrou. Tema neutro: aqui é a conta, não o evento. */
export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) {
    const dest =
      plano === "celebration" || plano === "free"
        ? `/admin/new?plano=${plano}`
        : "/admin/new";
    redirect(`/admin/sign-in?next=${encodeURIComponent(dest)}`);
  }

  return (
    <div style={adminVars()}>
      <Suspense fallback={<p className="p-8 text-ink-2">Carregando…</p>}>
        <CreateEventWizard />
      </Suspense>
    </div>
  );
}
