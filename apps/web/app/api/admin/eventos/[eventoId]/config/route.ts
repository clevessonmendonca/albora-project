import {
  atualizarConfigDoEvento,
  buscarEventoDoHost,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

type Corpo = {
  expectedGuests?: unknown;
  identityTokens?: unknown;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(_req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;
  const evento = await buscarEventoDoHost(banco(), host.accountId, eventoId);
  if (!evento) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

  return ok({
    expectedGuests: evento.expectedGuests,
    identityTokens: evento.identityTokens,
    packId: evento.packId,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;

  const limite = consumir(`admin_config:${host.accountId}`, 30, 60, Date.now());
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

  const atualizacao: { expectedGuests?: number; identityTokens?: Record<string, unknown> } = {};

  if (corpo.expectedGuests !== undefined) {
    if (typeof corpo.expectedGuests !== "number" || !Number.isFinite(corpo.expectedGuests)) {
      return erro(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    const n = Math.trunc(corpo.expectedGuests);
    if (n <= 0) {
      return erro(422, "validation_error", "Convidados esperados inválido", {
        campos: ["expectedGuests"],
      });
    }
    atualizacao.expectedGuests = n;
  }

  if (corpo.identityTokens !== undefined) {
    if (
      typeof corpo.identityTokens !== "object" ||
      corpo.identityTokens === null ||
      Array.isArray(corpo.identityTokens)
    ) {
      return erro(422, "validation_error", "Identidade inválida", { campos: ["identityTokens"] });
    }
    atualizacao.identityTokens = corpo.identityTokens as Record<string, unknown>;
  }

  if (Object.keys(atualizacao).length === 0) {
    return erro(422, "validation_error", "Nada para atualizar", {
      campos: ["expectedGuests", "identityTokens"],
    });
  }

  try {
    const ok_ = await atualizarConfigDoEvento(
      banco(),
      host.accountId,
      eventoId,
      atualizacao,
    );
    if (!ok_) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

    const evento = await buscarEventoDoHost(banco(), host.accountId, eventoId);
    return ok({
      expectedGuests: evento?.expectedGuests,
      identityTokens: evento?.identityTokens,
    });
  } catch (e) {
    return erroInesperado("admin.config", e);
  }
}
