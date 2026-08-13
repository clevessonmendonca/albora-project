import { classificarTexto } from "@albora/core";
import { comEvento, gravarVeredictoComentario } from "@albora/db";
import { getPool } from "@/lib/db";

/** Classifica texto depois da resposta — fora do caminho crítico (spec 014). */
export function classifyCommentAfter(
  eventoId: string,
  comentarioId: string,
  texto: string,
): void {
  void (async () => {
    try {
      const veredicto = classificarTexto(texto);
      await comEvento(getPool(), eventoId, (c) =>
        gravarVeredictoComentario(c, comentarioId, veredicto),
      );
    } catch {
      console.warn("comentarios.classificador_falhou", { eventoId, comentarioId });
    }
  })();
}
