import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PaginaInsights({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  redirect(`/admin/e/${eventId}/guests`);
}
