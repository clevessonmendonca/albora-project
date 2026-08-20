import { withEvent, listChallenges } from "@albora/db";
import { getPool } from "@/lib/db";

export async function getEventChallenges(eventId: string) {
  return withEvent(getPool(), eventId, (c) => listChallenges(c, eventId, null));
}
