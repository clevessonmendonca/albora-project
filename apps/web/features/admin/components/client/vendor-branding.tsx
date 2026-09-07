"use client";

import React from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { VendorBrandTokensEditor } from "@/features/vendor-portal/components/client/vendor-brand-tokens-editor";

type Props = {
  vendorId: string;
  initialBrandTokens: Record<string, unknown>;
};

/** Reaproveita o editor do portal do fornecedor (`/f/[vendorSlug]`) — mesmo `resolveTokens()`, mesma rota `PATCH /api/vendors/[vendorId]/brand-tokens`, única fonte de verdade para cores + logo do fornecedor. */
export function VendorBranding({ vendorId, initialBrandTokens }: Props) {
  return (
    <AdminSection>
      <VendorBrandTokensEditor vendorId={vendorId} initialBrandTokens={initialBrandTokens} />
    </AdminSection>
  );
}
