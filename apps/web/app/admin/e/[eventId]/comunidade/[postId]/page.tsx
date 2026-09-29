import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { Conversa } from "@/features/admin/components/server/descobrir";

export const dynamic = "force-dynamic";

export default async function Pagina({
  params,
}: {
  params: Promise<{ eventId: string; postId: string }>;
}) {
  const { eventId, postId } = await params;

  return (
    <EventPageLayout eventId={eventId} section="Comunidade" nav="primary">
      <Conversa eventId={eventId} postId={postId} />
    </EventPageLayout>
  );
}
