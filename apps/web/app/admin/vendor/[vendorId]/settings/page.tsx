import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { fornecedorParaConta } from "@albora/db";
import { UUID_RE } from "@/lib/api";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { AdminShell, AdminSection } from "@/features/admin/components/server/admin-shell";
import { VendorBranding } from "@/features/admin/components/client/vendor-branding";
import { VendorForm } from "@/features/admin/components/client/vendor-form";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  staff: "Equipe",
};

export default async function VendorSettingsPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) notFound();

  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) {
    redirect(
      `/admin/sign-in?next=${encodeURIComponent(`/admin/vendor/${vendorId}/settings`)}`,
    );
  }

  const vendor = await fornecedorParaConta(getPool(), host.accountId, vendorId);
  if (!vendor) notFound();

  return (
    <AdminShell
      title={vendor.name}
      subtitle={`${ROLE_LABEL[vendor.role] ?? vendor.role} · plano ${vendor.plan}`}
      back={{ label: "Painel", href: "/admin" }}
    >
      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">Dados do fornecedor</h2>
        {vendor.role === "admin" ? (
          <VendorForm
            mode="edit"
            vendorId={vendor.id}
            initialName={vendor.name}
            initialSlug={vendor.slug ?? ""}
          />
        ) : (
          <p className="tipo-body m-0 text-ink-2">
            Só o administrador do fornecedor pode alterar nome e identificador.
          </p>
        )}
      </AdminSection>

      {vendor.role === "admin" && (
        <VendorBranding vendorId={vendor.id} initialBrandTokens={vendor.brandTokens} />
      )}
    </AdminShell>
  );
}
