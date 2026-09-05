import type { EntradaDeImagem, ProvedorDeClassificadorDeImagem } from "./classificador-imagem";
import type { VeredictoDoClassificador } from "./moderacao";

/**
 * Provedor real: OpenAI Moderation API (`omni-moderation-latest`).
 * Decisão, placar da matriz e política de retenção estão em docs/adr/0017-provedor-de-moderacao.md.
 * `fetch` é injetado — sem SDK novo, sem rede nos testes.
 */

const ENDPOINT = "https://api.openai.com/v1/moderations";
const MODELO_PADRAO = "omni-moderation-latest";

/** Limiar de confiança acima do qual uma categoria vira `suspeito`. */
export const LIMIAR_SUSPEITO = 0.5;

export type ConfigDoProvedorOpenAi = {
  apiKey: string | undefined;
  modelo?: string;
  fetch?: typeof fetch;
};

/**
 * O que sobra do resultado bruto da OpenAI depois de recortado para persistência —
 * só categorias e escores, nunca a imagem enviada (que só existe no corpo da *requisição*,
 * nunca no da resposta; `resultadoBrutoOpenAi` é uma extração por lista de permissão,
 * não um passthrough do corpo inteiro, então nenhum campo além destes três sobrevive).
 */
export type ResultadoBrutoOpenAi = {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
};

/**
 * Extrai de forma segura o resultado bruto do corpo de resposta da OpenAI, para o que
 * for persistido em `photo_moderation.result`. Lista de permissão, não passthrough:
 * qualquer campo fora de `flagged`/`categories`/`category_scores` do primeiro item de
 * `results` é descartado, mesmo que o corpo traga outros campos.
 * Retorna `null` quando o formato não bate com o documentado — o chamador trata isso
 * como `sem-resposta`.
 */
export function resultadoBrutoOpenAi(corpo: unknown): ResultadoBrutoOpenAi | null {
  if (typeof corpo !== "object" || corpo === null || !("results" in corpo)) return null;
  const resultados = (corpo as { results?: unknown }).results;
  if (!Array.isArray(resultados) || resultados.length === 0) return null;

  const primeiro = resultados[0];
  if (typeof primeiro !== "object" || primeiro === null) return null;

  const { flagged, categories, category_scores } = primeiro as Record<string, unknown>;
  if (typeof flagged !== "boolean") return null;
  if (typeof categories !== "object" || categories === null) return null;
  if (typeof category_scores !== "object" || category_scores === null) return null;

  return {
    flagged,
    categories: { ...(categories as Record<string, boolean>) },
    category_scores: { ...(category_scores as Record<string, number>) },
  };
}

/** Suspeito se qualquer categoria cruzar o limiar, ou se a API já marcou `flagged`. */
export function veredictoDoResultadoBruto(resultado: ResultadoBrutoOpenAi): VeredictoDoClassificador {
  for (const escore of Object.values(resultado.category_scores)) {
    if (typeof escore === "number" && escore >= LIMIAR_SUSPEITO) return "suspeito";
  }
  return resultado.flagged ? "suspeito" : "limpo";
}

/**
 * Provedor OpenAI Moderation. Chave ausente vira `sem-resposta` sem tocar a rede —
 * mesma regra de "silêncio, nunca limpo" que cobre HTTP 4xx/5xx e corpo malformado.
 * Envia sempre o thumb (quem decide isso é o chamador, via `chaveThumbDeFull`) —
 * este provedor não lê nem sabe onde está o arquivo original.
 */
export function provedorOpenAi(config: ConfigDoProvedorOpenAi): ProvedorDeClassificadorDeImagem {
  const chave = config.apiKey?.trim();
  const modelo = config.modelo?.trim() || MODELO_PADRAO;
  const requisitar = config.fetch ?? fetch;

  return {
    async classificar(
      entrada: EntradaDeImagem,
      opcoes?: { signal?: AbortSignal },
    ): Promise<VeredictoDoClassificador> {
      if (!chave) return "sem-resposta";

      let resposta: Response;
      try {
        resposta = await requisitar(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${chave}`,
          },
          body: JSON.stringify({
            model: modelo,
            input: [
              {
                type: "image_url",
                image_url: { url: dataUriDoThumb(entrada) },
              },
            ],
          }),
          signal: opcoes?.signal ?? null,
        });
      } catch {
        return "sem-resposta";
      }

      if (!resposta.ok) return "sem-resposta";

      let corpo: unknown;
      try {
        corpo = await resposta.json();
      } catch {
        return "sem-resposta";
      }

      const resultado = resultadoBrutoOpenAi(corpo);
      if (!resultado) return "sem-resposta";

      return veredictoDoResultadoBruto(resultado);
    },
  };
}

function dataUriDoThumb(entrada: EntradaDeImagem): string {
  const base64 = Buffer.from(entrada.bytes).toString("base64");
  return `data:${entrada.mime};base64,${base64}`;
}
