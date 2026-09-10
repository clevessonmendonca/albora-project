import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { VendorTeamAccessError } from "@albora/db";
import { AdminSection, AdminShell } from "@/features/admin/components/server/admin-shell";
import { VendorBillingManager } from "@/features/vendor-portal/components/client/vendor-billing-manager";
import { UUID_RE } from "@/lib/api";
import { loadVendorBilling, vendorBillingDependencies } from "@/lib/application/use-cases/vendor-billing";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

export const dynamic = "force-dynamic";

export default async function VendorBillingPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) notFound();
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect(`/admin/sign-in?next=${encodeURIComponent(`/admin/vendor/${vendorId}/billing`)}`);

  let billing: Awaited<ReturnType<typeof loadVendorBilling>>;
  try {
    billing = await loadVendorBilling(vendorBillingDependencies(), host, vendorId);
  } catch (error) {
    if (error instanceof VendorTeamAccessError) notFound();
    throw error;
  }
  const backHref = billing.vendor.slug ? `/f/${billing.vendor.slug}` : "/admin";
  return (
    <AdminShell
      title="Plano e cobranças"
      subtitle={`${billing.vendor.name} · valores, recibos e renovação em um só lugar`}
      back={{ label: "Portal do fornecedor", href: backHref }}
    >
      <AdminSection>
        <VendorBillingManager
          vendorId={vendorId}
          vendorPlan={billing.vendor.plan}
          subscription={billing.subscription}
          payments={billing.payments}
          providerAvailable={billing.providerAvailable}
          paymentsAvailable={billing.paymentsAvailable}
        />
      </AdminSection>
    </AdminShell>
  );
}
