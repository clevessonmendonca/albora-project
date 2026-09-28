import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * O hub existia para agrupar identidade, missões e recado atrás de um destino
 * só. Com os onze destinos do ADR 0016 cada um tem entrada própria, e a música
 * do evento passou a morar em Configurações — o hub virou caminho a mais para
 * o mesmo lugar. A rota fica viva porque link antigo não pode morrer.
 */
export default async function PaginaExperiencia({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  redirect(`/admin/e/${eventId}/missions`);
}
