import { resolveBilling } from "@albora/integrations";
import { getPool } from "@/lib/db";
import type { VendorBillingDependencies } from "./vendor-billing-service";

export function vendorBillingDependencies(): VendorBillingDependencies {
  const billing = resolveBilling();
  return { pool: getPool(), billing: billing.mode === "unavailable" ? null : billing.provider };
}
