import { loadVendorPortal } from "@/features/vendor-portal/data/load-vendor-portal";
import { VendorPortalScreen } from "@/features/vendor-portal/components/server/vendor-portal-screen";

export const dynamic = "force-dynamic";

/** Leitura só — billing, wizard e criação de evento são V2b. */
export default async function VendorPortalPage({
  params,
}: {
  params: Promise<{ vendorSlug: string }>;
}) {
  const { vendorSlug } = await params;
  const context = await loadVendorPortal(vendorSlug);
  return <VendorPortalScreen {...context} />;
}
