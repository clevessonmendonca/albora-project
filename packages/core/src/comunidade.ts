/**
 * O vocabulário da comunidade e da inspiração (ADR 0017).
 *
 * Mora no núcleo, e não em `@albora/db`, porque o formulário do painel é
 * componente client: importar a lista de `@albora/db` arrastaria `node:crypto`
 * para o bundle do navegador.
 */

export const TOPICOS_DA_COMUNIDADE = ["duvida", "ideia", "experiencia", "indicacao"] as const;
export type TopicoDaComunidade = (typeof TOPICOS_DA_COMUNIDADE)[number];

export const TEMAS_DE_INSPIRACAO = ["fotos", "decoracao", "experiencia"] as const;
export type TemaDeInspiracao = (typeof TEMAS_DE_INSPIRACAO)[number];

export function ehTopicoDaComunidade(valor: unknown): valor is TopicoDaComunidade {
  return (
    typeof valor === "string" && (TOPICOS_DA_COMUNIDADE as readonly string[]).includes(valor)
  );
}

export function ehTemaDeInspiracao(valor: unknown): valor is TemaDeInspiracao {
  return typeof valor === "string" && (TEMAS_DE_INSPIRACAO as readonly string[]).includes(valor);
}
