import { prefixoDoEvento, validarConteudo } from "@albora/core";
import { comEvento, confirmarUpload, ErroUploadDeOutroEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { inspecionarObjeto } from "@/lib/r2";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

type Corpo = { uploadId?: unknown; chave?: unknown; mime?: unknown; legenda?: unknown };

/**
 * Persiste o upload — **validando, não confiando**.
 *
 * Tudo que o cliente manda aqui já passou pelas mãos dele: a chave, o tipo, o
 * tamanho. O único fato confiável é o objeto que está no bucket, e é ele que
 * este endpoint lê.
 */
export async function POST(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("confirm.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return erro(401, "sessao.invalida", "Sessão inválida");

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const { uploadId, chave, mime, legenda } = corpo;
  if (typeof uploadId !== "string" || typeof chave !== "string" || typeof mime !== "string") {
    return erro(422, "validation_error", "Dados incompletos", {
      campos: ["uploadId", "chave", "mime"],
    });
  }

  // 🔴 A chave pertence a este evento, ou não existe para nós. Sem esta
  // checagem, um convidado do evento A confirmaria contra um objeto do B e
  // traria a foto de outra festa para dentro da sua.
  if (!chave.startsWith(prefixoDoEvento(sessao.eventoId))) {
    console.warn("confirm.chave_de_outro_evento", {
      eventoId: sessao.eventoId,
      sessaoId: sessao.sessaoId,
    });
    return erro(403, "upload.chave_invalida", "Chave não pertence a este evento");
  }

  try {
    // O objeto precisa existir. Confirmar antes do PUT terminar criaria linha
    // apontando para nada — e uma galeria com foto que não abre.
    const objeto = await inspecionarObjeto(`${chave}/full`);
    if (!objeto) {
      return erro(409, "upload.objeto_ausente", "O arquivo ainda não chegou", {
        chave: `${chave}/full`,
      });
    }

    // Magic bytes. O `Content-Type` foi declarado pelo cliente e não vale
    // nada: um "JPEG" que é HTML servido da origem do app é XSS armazenado
    // com alcance de festa inteira.
    const conteudoInvalido = validarConteudo(mime, objeto.inicio);
    if (conteudoInvalido) {
      console.warn("confirm.conteudo_recusado", {
        eventoId: sessao.eventoId,
        ...conteudoInvalido.details,
      });
      return erro(422, conteudoInvalido.code, "Arquivo recusado", conteudoInvalido.details);
    }

    const resultado = await comEvento(banco(), sessao.eventoId, (c) =>
      confirmarUpload(c, {
        uploadId,
        eventId: sessao.eventoId,
        sessionId: sessao.sessaoId,
        challengeId: null,
        storageKey: `${chave}/full`,
        mime,
        bytes: objeto.bytes,
        caption: typeof legenda === "string" ? legenda.slice(0, 280) : null,
      }),
    );

    console.log("confirm.ok", {
      eventoId: sessao.eventoId,
      uploadId,
      estado: resultado.estado,
      bytes: objeto.bytes,
    });

    // 200 nos dois casos: retry é o caminho normal, não a exceção, e o
    // cliente que reenvia depois de perder a resposta precisa poder tirar o
    // item da fila com tranquilidade.
    return ok({ uploadId, estado: resultado.estado });
  } catch (e) {
    if (e instanceof ErroUploadDeOutroEvento) {
      // Mesma resposta de chave inválida: distinguir contaria ao convidado
      // que aquele id existe em outra festa.
      return erro(403, "upload.chave_invalida", "Chave não pertence a este evento");
    }
    return erroInesperado("confirm", e);
  }
}
