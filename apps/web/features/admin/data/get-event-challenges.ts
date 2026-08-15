import { comEvento, listarDesafios } from "@albora/db";
import { getPool } from "@/lib/db";

export async function getEventChallenges(eventId: string) {
  return comEvento(getPool(), eventId, (c) => listarDesafios(c, eventId, null));
}
