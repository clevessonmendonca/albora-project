import { comEvento, buscarContextoCompartilhar, registrarConsentimentoExterno } from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Contexto para compor e autorizar compartilhamento (spec 015). */
export async function GET(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const uploadId = new URL(req.url).searchParams.get("uploadId");
  if (!uploadId || !UUID.test(uploadId)) {
    return erro(422, "validation_error", "Foto inválida", { campo: "uploadId" });
  }

  const limite = consumir(identidadeParaLimite(req, sessao), 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const ctx = await comEvento(banco(), sessao.eventoId, (c) =>
      buscarContextoCompartilhar(c, sessao.sessaoId, uploadId),
    );

    if (!ctx) return erro(404, "upload.nao_encontrado", "Foto não encontrada");

    return ok({
      chaveFull: ctx.midia.chaveFull,
      legenda: ctx.midia.legenda,
      sessao: {
        nome: ctx.sessao.nome,
        consentimentoExterno: ctx.sessao.consentimentoExterno
          ? {
              versao: ctx.sessao.consentimentoExterno.versao,
              em: ctx.sessao.consentimentoExterno.em.toISOString(),
              revogadoEm: ctx.sessao.consentimentoExterno.revogadoEm?.toISOString() ?? null,
              nomeNaMoldura: ctx.sessao.consentimentoExterno.nomeNaMoldura,
            }
          : null,
      },
      evento: {
        slug: ctx.evento.slug,
        packId: ctx.evento.packId,
        comecaEm: ctx.evento.comecaEm.toISOString(),
        identityTokens: ctx.evento.identityTokens,
        panico: ctx.evento.panico,
        modoEndurecido: ctx.evento.modoEndurecido,
        compartilhamentoExternoLiberado: ctx.evento.compartilhamentoExternoLiberado,
      },
      midia: {
        removida: ctx.midia.removida,
        liberadaPeloAnfitriao: ctx.midia.liberadaPeloAnfitriao,
        denuncias: ctx.midia.denuncias,
        classificador:
          ctx.midia.classificador === "suspeito" || ctx.midia.classificador === "sem-resposta"
            ? ctx.midia.classificador
            : "limpo",
      },
    });
  } catch (e) {
    return erroInesperado("compartilhar.contexto", e);
  }
}

type Corpo = { nomeNaMoldura?: unknown };

/** Segundo consentimento antes de sair do perímetro (spec 015, ADR 0009). */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 20, 60, Date.now());
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

  const nomeNaMoldura = corpo.nomeNaMoldura === true;

  try {
    const gravou = await comEvento(banco(), sessao.eventoId, (c) =>
      registrarConsentimentoExterno(c, sessao.sessaoId, nomeNaMoldura),
    );

    if (!gravou) return erro(404, "sessao.nao_encontrada", "Sessão não encontrada");

    return ok({ registrado: true, nomeNaMoldura });
  } catch (e) {
    return erroInesperado("compartilhar.consentimento", e);
  }
}
