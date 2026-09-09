import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { AdminShell, AdminSection } from "@/features/admin/components/server/admin-shell";
import { VendorForm } from "@/features/admin/components/client/vendor-form";

export const dynamic = "force-dynamic";

const VENDOR_PLANS = ["starter", "studio", "agency"] as const;

function isVendorPlan(value: string | undefined): value is (typeof VENDOR_PLANS)[number] {
  return VENDOR_PLANS.some((plan) => plan === value);
}

export default async function NewVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string }>;
}) {
  const query = await searchParams;
  const afterCreate = query.next === "event" ? "event" : "settings";
  const requestedPlan = isVendorPlan(query.plan) ? query.plan : undefined;
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) {
    const params = new URLSearchParams();
    if (afterCreate === "event") params.set("next", "event");
    if (requestedPlan) params.set("plan", requestedPlan);
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    redirect(`/admin/sign-in?next=${encodeURIComponent(`/admin/vendor/new${suffix}`)}`);
  }

  return (
    <AdminShell
      title="Novo fornecedor"
      subtitle="Sua conta vira administradora — convite de equipe chega em breve"
      back={{ label: "Painel", href: "/admin" }}
    >
      <AdminSection>
        <p className="tipo-body mb-6 mt-0 text-ink-2">
          Depois de criar, configure cores e logo na tela de identidade — a mesma marca aparece
          em todas as festas que este fornecedor gerenciar.
        </p>
        <VendorForm
          mode="create"
          afterCreate={afterCreate}
          {...(requestedPlan ? { requestedPlan } : {})}
        />
      </AdminSection>
    </AdminShell>
  );
}
