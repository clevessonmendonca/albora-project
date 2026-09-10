import { loadVendorPortal } from "@/features/vendor-portal/data/load-vendor-portal";
import { VendorPortalScreen } from "@/features/vendor-portal/components/server/vendor-portal-screen";

export const dynamic = "force-dynamic";

export default async function VendorPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorSlug: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { vendorSlug } = await params;
  const { plan } = await searchParams;
  const context = await loadVendorPortal(vendorSlug);
  const requestedPlan = plan === "starter" || plan === "studio" || plan === "agency" ? plan : undefined;
  return <VendorPortalScreen {...context} {...(requestedPlan ? { requestedPlan } : {})} />;
}
