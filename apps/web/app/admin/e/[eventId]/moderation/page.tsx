import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PaginaModeracao({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  redirect(`/admin/e/${eventId}/album?aba=revisar`);
}
