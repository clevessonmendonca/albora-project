import { comEvento } from "@albora/db";
import { getPool } from "@/lib/db";

export async function POST(req: Request) {
  const corpo = (await req.json()) as { eventoId?: string };
  await comEvento(getPool(), corpo.eventoId!, () => null);
  return new Response("ok");
}
