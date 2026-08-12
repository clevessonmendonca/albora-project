import { criarEvento } from "@albora/db";
import { PACKS } from "@albora/packs";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

type Corpo = { packId?: unknown; comecaEm?: unknown; terminaEm?: unknown };

function comoData(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * O anfitrião cria um evento (spec 009).
 *
 * 🔴 A conta vem da **sessão de host**, nunca do corpo — é `comConta` dentro de
 * `criarEvento` que prende a linha a ela. O `packId` é conferido contra o
 * conjunto fechado do registro de packs antes de tocar no banco: pack inválido
 * é 422, não um 500 de violação de FK.
 */
export async function POST(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("admin.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para criar um evento");

  const limite = consumir(`admin_eventos:${host.accountId}`, 20, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const packId = typeof corpo.packId === "string" ? corpo.packId : "";
  if (!(packId in PACKS)) {
    return erro(422, "validation_error", "Pack inválido", { campos: ["packId"] });
  }

  const comecaEm = comoData(corpo.comecaEm);
  const terminaEm = comoData(corpo.terminaEm);
  if (!comecaEm || !terminaEm || terminaEm <= comecaEm) {
    return erro(422, "validation_error", "Datas inválidas", { campos: ["comecaEm", "terminaEm"] });
  }

  try {
    const { eventoId, slug } = await criarEvento(banco(), {
      accountId: host.accountId,
      packId,
      comecaEm,
      terminaEm,
    });

    console.log("admin.evento_criado", { accountId: host.accountId, eventoId });

    return ok({ eventoId, slug });
  } catch (e) {
    return erroInesperado("admin.eventos", e);
  }
}
