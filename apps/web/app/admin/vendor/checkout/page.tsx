import { fornecedorParaConta, type VendorPlan } from "@albora/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/features/admin/components/server/admin-shell";
import { VendorCheckoutForm } from "@/features/vendor-portal/components/client/vendor-checkout-form";
import { latestVendorSubscriptionStatus } from "@/features/vendor-portal/data/load-vendor-portal";
import { UUID_RE } from "@/lib/api";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

export const dynamic = "force-dynamic";

const VENDOR_PLANS: readonly VendorPlan[] = ["starter", "studio", "agency"];

function isVendorPlan(value: string | undefined): value is VendorPlan {
  return value !== undefined && (VENDOR_PLANS as readonly string[]).includes(value);
}

export default async function VendorCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; plan?: string }>;
}) {
  const query = await searchParams;
  const vendorId = query.vendor;
  if (!vendorId || !UUID_RE.test(vendorId)) notFound();

  const requestedPlan = isVendorPlan(query.plan) ? query.plan : undefined;
  const checkoutPath = `/admin/vendor/checkout?vendor=${encodeURIComponent(vendorId)}${requestedPlan ? `&plan=${requestedPlan}` : ""}`;
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect(`/admin/sign-in?next=${encodeURIComponent(checkoutPath)}`);

  const vendor = await fornecedorParaConta(getPool(), host.accountId, vendorId);
  if (!vendor || vendor.role !== "admin") notFound();

  const subscriptionStatus = await latestVendorSubscriptionStatus(vendor.id);
  const returnHref = vendor.slug
    ? `/f/${encodeURIComponent(vendor.slug)}`
    : `/admin/vendor/${vendor.id}/settings`;

  if (subscriptionStatus === "active" || subscriptionStatus === "pending" || subscriptionStatus === "overdue") {
    redirect(`/admin/vendor/${vendor.id}/billing`);
  }

  return (
    <AdminShell
      title="Revise sua assinatura"
      subtitle={`${vendor.name} · cobrança mensal`}
      back={{ label: "Portal do fornecedor", href: returnHref }}
    >
      <VendorCheckoutForm
        vendorId={vendor.id}
        vendorName={vendor.name}
        initialPlan={requestedPlan ?? vendor.plan}
        returnHref={returnHref}
      />
    </AdminShell>
  );
}
