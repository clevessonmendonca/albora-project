import React from "react";
import type { VendorPortalContext } from "../../data/load-vendor-portal";
import { VendorEventsList } from "./vendor-events-list";
import { VendorShell } from "./vendor-shell";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  staff: "Equipe",
};

export function VendorPortalScreen({ vendor, role, eventos }: VendorPortalContext) {
  return (
    <VendorShell
      vendorName={vendor.name}
      whiteLabelFull={vendor.plan === "agency"}
      brandTokens={vendor.brandTokens}
      title="Meus eventos"
      subtitle={`${ROLE_LABEL[role] ?? role} · plano ${vendor.plan}`}
    >
      <VendorEventsList eventos={eventos} />
    </VendorShell>
  );
}
