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

  const titleKeys = challenges
    .filter((d) => d.chaveTitulo !== null)
    .map((d) => d.chaveTitulo!);

  const customMissions = challenges
    .filter((d) => d.tituloCustom !== null)
    .map((d) => ({
      id: d.id,
      titulo: d.tituloCustom!,
      posicao: d.ordem,
      emoji: d.emoji,
      deadline: d.deadline,
    }));

  return (
    <MissionsEditor
      eventId={eventId}
      packId={packId}
      identityTokens={identityTokens}
      initialTitleKeys={titleKeys}
      initialCustomMissions={customMissions}
    />
  );
}
