import { ReauthForm } from "@/features/console/components/client/reauth-form";

export const dynamic = "force-dynamic";

export default async function ConsoleReauthPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; next?: string }>;
}) {
  const { m, next } = await searchParams;
  // next sempre relativo a /console — nunca redireciona pra fora do console
  // por um parâmetro de URL não confiável (open redirect).
  const destino = next && next.startsWith("/console") ? next : "/console";
  return <ReauthForm magic={m ?? null} next={destino} />;
}
