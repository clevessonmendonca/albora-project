import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { VendorTeamAccessError } from "@albora/db";
import { UUID_RE } from "@/lib/api";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { loadVendorTeam, vendorTeamDependencies } from "@/lib/application/use-cases/vendor-team";
import { AdminSection, AdminShell } from "@/features/admin/components/server/admin-shell";
import { VendorTeamManager } from "@/features/vendor-portal/components/client/vendor-team-manager";

export const dynamic = "force-dynamic";

export default async function VendorTeamPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) notFound();
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect(`/admin/sign-in?next=${encodeURIComponent(`/admin/vendor/${vendorId}/team`)}`);

  let result: Awaited<ReturnType<typeof loadVendorTeam>>;
  try {
    result = await loadVendorTeam(vendorTeamDependencies(), host, vendorId);
  } catch (error) {
    if (error instanceof VendorTeamAccessError) notFound();
    throw error;
  }

  return (
    <AdminShell
      title={`Equipe de ${result.vendor.name}`}
      subtitle="Defina quem pode operar eventos e quem administra a conta."
      back={{ label: "Painel", href: result.vendor.slug ? `/f/${result.vendor.slug}` : "/admin" }}
    >
      <AdminSection>
        <VendorTeamManager
          vendorId={vendorId}
          actorAccountId={host.accountId}
          initialMembers={result.members}
          teamLimit={result.teamLimit}
        />
      </AdminSection>
    </AdminShell>
  );
}
