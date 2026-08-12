import { randomUUID } from "node:crypto";
import {
  type CodigoDeComentario,
  modoInteracao,
  montarThread,
  publicarComentario,
  validarTexto,
} from "@albora/core";
import {
  type ComentarioComAutor,
  type ComentarioGravado,
  comEvento,
  ErroComentarioDeOutroEvento,
  gateDoEvento,
  gravarComentario,
  listarComentariosDaFoto,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Corpo = {
  uploadId?: unknown;
  texto?: unknown;
  respostaA?: unknown;
};

type Saida =
  | { ok: true; comentario: ComentarioGravado }
  | { ok: false; status: number; code: string; message: string };

function mapearFalha(codigo: CodigoDeComentario): Saida {
  switch (codigo) {
    case "comentario.gate_fechado":
    case "comentario.outro_evento":
      return { ok: false, status: 403, code: codigo, message: "Comentário recusado" };
    case "comentario.texto_vazio":
    case "comentario.texto_longo":
    case "comentario.resposta_ausente":
      return { ok: false, status: 422, code: codigo, message: "Comentário inválido" };
  }
}

/** Nunca o `sessaoId` alheio: `meu` deixa o autor ver o botão de remover sem expor de quem é cada comentário. */
function paraJson(c: ComentarioComAutor, sessaoAtual: string) {
  return {
    id: c.id,
    autor: c.autor,
    texto: c.texto,
    respostaA: c.respostaA,
    criadaEm: c.criadoEm.toISOString(),
    meu: c.sessaoId === sessaoAtual,
  };
}

/**
 * Os comentários de uma foto — a legenda coletiva da festa (spec 014, ADR 0009).
 *
 * As mesmas três regras do feed valem aqui, e nenhuma é negociável:
 *
 * 1. **O evento vem da sessão, nunca da URL.** O `evento` da querystring, se
 *    vier, é conferido contra a sessão — divergência é 403, nunca "usa o da URL".
 * 2. **O gate é regra de servidor.** Antes de a interação abrir, a leitura
 *    devolve vazio — do mesmo jeito que o feed esconde a contagem —, e não a
 *    thread por baixo do CSS, que qualquer devtools abriria.
 * 3. **A moderação é a única fonte de verdade.** A lista só lê `published`.
 */
export async function GET(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  const parametros = new URL(req.url).searchParams;
  const eventoPedido = parametros.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    console.warn("comentarios.evento_divergente", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });
    return erro(403, "comentarios.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const uploadId = parametros.get("upload_id");
  if (uploadId === null || !UUID.test(uploadId)) {
    return erro(422, "validation_error", "Foto inválida", { campos: ["upload_id"] });
  }

  try {
    const threads = await comEvento(banco(), sessao.eventoId, async (c) => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      // Sessão de um evento que não é visível recebe vazio, não erro: um 404
      // aqui confirmaria quais ids existem. Antes do gate, o mesmo vazio.
      if (!gate || modoInteracao(gate, new Date()) !== "completo") return [];

      const comentarios = await listarComentariosDaFoto(c, sessao.eventoId, uploadId);
      const porId = new Map(comentarios.map((k) => [k.id, k]));

      return montarThread(comentarios, uploadId).map((t) => ({
        ...paraJson(porId.get(t.raiz.id)!, sessao.sessaoId),
        respostas: t.respostas.map((r) => paraJson(porId.get(r.id)!, sessao.sessaoId)),
      }));
    });

    console.log("comentarios.lista", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      threads: threads.length,
    });

    return ok({ threads });
  } catch (e) {
    return erroInesperado("comentarios", e);
  }
}

/**
 * Publica um comentário, com resposta.
 *
 * O texto é validado no servidor (422) **antes** de qualquer trabalho, e o gate
 * é conferido no banco: antes de a interação abrir, comentar é 403. A âncora da
 * resposta e a revalidação do gate/texto ficam em `publicarComentario` do
 * `@albora/core` — este handler traduz o resultado em envelope, não reimplementa
 * a regra.
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  const limite = consumir(identidadeParaLimite(req, sessao), 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  const parametros = new URL(req.url).searchParams;
  const eventoPedido = parametros.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    console.warn("comentarios.evento_divergente", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });
    return erro(403, "comentarios.evento_divergente", "Esta sessão não pertence a este evento");
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const { uploadId, texto, respostaA } = corpo;
  if (typeof uploadId !== "string" || !UUID.test(uploadId)) {
    return erro(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });
  }

  if (typeof texto !== "string") {
    return erro(422, "validation_error", "Texto inválido", { campos: ["texto"] });
  }

  const validado = validarTexto(texto);
  if (!validado.ok) {
    return erro(422, validado.codigo, "Comentário inválido", { campos: ["texto"] });
  }

  let respostaAlvo: string | null = null;
  if (respostaA !== undefined && respostaA !== null) {
    if (typeof respostaA !== "string" || !UUID.test(respostaA)) {
      return erro(422, "validation_error", "Resposta inválida", { campos: ["respostaA"] });
    }
    respostaAlvo = respostaA;
  }

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, async (c): Promise<Saida> => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      // Antes do gate, comentar não publica — 403, igual ao resto da interação.
      if (!gate || modoInteracao(gate, new Date()) !== "completo") {
        return {
          ok: false,
          status: 403,
          code: "comentario.gate_fechado",
          message: "A interação ainda não abriu",
        };
      }

      const existentes = await listarComentariosDaFoto(c, sessao.eventoId, uploadId);

      const publicado = publicarComentario(
        {
          id: randomUUID(),
          eventoId: sessao.eventoId,
          midiaId: uploadId,
          sessaoId: sessao.sessaoId,
          texto: validado.texto,
          respostaA: respostaAlvo,
        },
        { id: sessao.eventoId, interacaoAbreEm: gate.interacaoAbreEm },
        existentes,
        new Date(),
      );

      if (!publicado.ok) return mapearFalha(publicado.codigo);

      const gravado = await gravarComentario(c, {
        id: publicado.comentario.id,
        eventoId: publicado.comentario.eventoId,
        midiaId: publicado.comentario.midiaId,
        sessaoId: publicado.comentario.sessaoId,
        respostaA: publicado.comentario.respostaA,
        texto: publicado.comentario.texto,
      });

      return { ok: true, comentario: gravado };
    });

    if (!resultado.ok) return erro(resultado.status, resultado.code, resultado.message);

    // Sem o texto no log: comentário de festa cita nome de gente que nunca
    // abriu o produto, e o log guarda ids e decisões, não a frase.
    console.log("comentarios.publicado", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
      comentarioId: resultado.comentario.id,
      resposta: resultado.comentario.respostaA !== null,
    });

    return ok(
      {
        id: resultado.comentario.id,
        texto: resultado.comentario.texto,
        respostaA: resultado.comentario.respostaA,
        criadaEm: resultado.comentario.criadoEm.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ErroComentarioDeOutroEvento) {
      // Mesma resposta de recusa: distinguir contaria que aquele id existe em
      // outra festa.
      return erro(403, "comentario.outro_evento", "Comentário recusado");
    }
    return erroInesperado("comentarios", e);
  }
}
