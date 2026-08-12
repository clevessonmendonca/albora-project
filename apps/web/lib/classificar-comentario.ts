import { classificarTexto } from "@albora/core";
import { comEvento, gravarVeredictoComentario } from "@albora/db";
import { banco } from "@/lib/banco";

/** Classifica texto depois da resposta — fora do caminho crítico (spec 014). */
export function classificarComentarioDepois(
  eventoId: string,
  comentarioId: string,
  texto: string,
): void {
  void (async () => {
    try {
      const veredicto = classificarTexto(texto);
      await comEvento(banco(), eventoId, (c) =>
        gravarVeredictoComentario(c, comentarioId, veredicto),
      );
    } catch {
      console.warn("comentarios.classificador_falhou", { eventoId, comentarioId });
    }
  })();
}
