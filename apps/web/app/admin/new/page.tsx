import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { CreateEventWizard } from "@/features/admin/components/client/create-event-wizard";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { UUID_RE } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Criar evento — só para quem entrou. Tema neutro: aqui é a conta, não o evento. */
export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{
    plano?: string;
    vendor?: string;
    vendorSlug?: string;
    vendorPlan?: string;
  }>;
}) {
  const { plano, vendor, vendorSlug, vendorPlan } = await searchParams;
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) {
    const params = new URLSearchParams();
    if (plano === "celebration" || plano === "free") params.set("plano", plano);
    if (vendor && UUID_RE.test(vendor)) params.set("vendor", vendor);
    if (vendorSlug) params.set("vendorSlug", vendorSlug);
    if (vendorPlan === "starter" || vendorPlan === "studio" || vendorPlan === "agency") {
      params.set("vendorPlan", vendorPlan);
    }
    const dest = `/admin/new${params.size > 0 ? `?${params.toString()}` : ""}`;
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
