import { MissionsEditor } from "@/features/admin/components/client/missions-editor";
import { getEventChallenges } from "@/features/admin/data/get-event-challenges";

export async function MissionsEditorLoader({
  eventId,
  packId,
  identityTokens,
}: {
  eventId: string;
  packId: string;
  identityTokens: Record<string, unknown>;
}) {
  const challenges = await getEventChallenges(eventId);

  return (
    <MissionsEditor
      eventId={eventId}
      packId={packId}
      identityTokens={identityTokens}
      initialTitleKeys={challenges.map((d) => d.chaveTitulo)}
    />
  );
}
