import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { AdminShell, AdminSection } from "@/features/admin/components/server/admin-shell";
import { VendorForm } from "@/features/admin/components/client/vendor-form";

export const dynamic = "force-dynamic";

export default async function NewVendorPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/admin/vendor/new");

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
        <VendorForm mode="create" />
      </AdminSection>
    </AdminShell>
  );
}
