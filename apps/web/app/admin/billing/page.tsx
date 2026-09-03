import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { AdminShell, AdminSection } from "@/features/admin/components/server/admin-shell";
import { BillingHistory } from "@/features/admin/components/client/billing-history";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/admin/billing");

  return (
    <AdminShell
      title="Cobranças"
      subtitle="Histórico de pagamentos da sua conta"
      back={{ label: "Painel", href: "/admin" }}
    >
      <AdminSection>
        <p className="m-0 leading-relaxed text-ink-2">
          Cada evento pago aparece aqui com valor, forma de pagamento e status — direto do
          Asaas, sem precisar abrir outra ferramenta.
        </p>
      </AdminSection>
      <BillingHistory />
    </AdminShell>
  );
}
