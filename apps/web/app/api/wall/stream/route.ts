import { getWallFeed, type GetWallFeedOutput } from "@/lib/application/use-cases/wall";
import { requireConfig } from "@/lib/api";
import { getPool } from "@/lib/db";
import { wallFromRequest } from "@/lib/wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TICK_MS = 2_000;

/** Assinatura barata do que muda a tela: id+reações de cada item, pânico e os contadores públicos. Não cobre `telaoModelos` (raramente muda no meio do evento) para não invalidar a cada tick à toa. */
function hashDaPagina(pagina: GetWallFeedOutput): string {
  return JSON.stringify({
    panico: pagina.panico,
    contadores: pagina.contadores,
    itens: pagina.itens.map((item) => `${item.id}:${item.reacoes}`),
  });
}

/** Parede via SSE: mesmo crachá do polling (`GET /api/wall`), mesma forma de payload — só a cadência muda. Servidor re-consulta o Postgres a cada 2s sob RLS (`getWallFeed` → `withEvent`) e só empurra quando o hash muda; heartbeat mantém a conexão viva atrás de proxy sem revelar dado nenhum. */
export async function GET(req: Request) {
  const configError = requireConfig("parede.stream", { mediaOrigin: true });
  if (configError) return configError;

  const wall = await wallFromRequest(req);
  if (!wall) return new Response(null, { status: 401 });

  const eventoId = wall.eventoId;
  const encoder = new TextEncoder();
  let ultimoHash = "";
  let encerrado = false;

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = () => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          /* controller já fechado por abort concorrente */
        }
      };

      const tick = async () => {
        if (encerrado) return;
        try {
          const pagina = await getWallFeed({ eventoId }, getPool());
          const hash = hashDaPagina(pagina);
          if (hash !== ultimoHash) {
            ultimoHash = hash;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(pagina)}\n\n`));
          } else {
            heartbeat();
          }
        } catch (e) {
          console.error("parede.stream.erro", e);
          heartbeat();
        }
      };

      await tick();
      const interval = setInterval(() => void tick(), TICK_MS);

      const encerrar = () => {
        if (encerrado) return;
        encerrado = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      req.signal.addEventListener("abort", encerrar);
    },
    cancel() {
      encerrado = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
