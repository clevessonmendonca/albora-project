import { detectarTipo } from "./midia";
import { provedorOpenAi } from "./classificador-openai";
import type { VeredictoDoClassificador } from "./moderacao";

/** Fora do caminho crítico — provedor silencioso vira `sem-resposta`; galeria publica, telão segura. */

/**
 * Vídeo não tem classificador próprio: reusa este mesmo provedor sobre o
 * quadro-poster (JPEG) que o cliente extrai antes do upload — ver
 * `posterFromVideo` em `apps/web/lib/domain/image/image.ts` e o invariante em
 * `apps/web/lib/domain/media/classify.ts`. Cobertura de UM quadro, não do
 * vídeo inteiro (task 7).
 */

export type EntradaDeImagem = {
  bytes: Uint8Array;
  mime: string;
};

export type OpcoesDeClassificacao = {
  /** Abortado quando o teto de tempo estoura — o provedor deve repassar ao `fetch` para não seguir pagando por um veredito já descartado. */
  signal?: AbortSignal;
};

export type ProvedorDeClassificadorDeImagem = {
  classificar(
    entrada: EntradaDeImagem,
    opcoes?: OpcoesDeClassificacao,
  ): Promise<VeredictoDoClassificador>;
};

export const TEMPO_MAXIMO_MS = 2_500;

export async function classificarImagem(
  entrada: EntradaDeImagem,
  provedor: ProvedorDeClassificadorDeImagem,
  tempoMaximoMs: number = TEMPO_MAXIMO_MS,
): Promise<VeredictoDoClassificador> {
  const controlador = new AbortController();
  try {
    return await comTempo(
      provedor.classificar(entrada, { signal: controlador.signal }),
      tempoMaximoMs,
      controlador,
    );
  } catch {
    return "sem-resposta";
  }
}

/** Foto com assinatura reconhecida: limpa. Bytes ilegíveis: silêncio. */
export const provedorHeuristico: ProvedorDeClassificadorDeImagem = {
  async classificar({ bytes }) {
    if (bytes.byteLength < 16) return "sem-resposta";
    return detectarTipo(bytes) === null ? "sem-resposta" : "limpo";
  },
};

export type NomeDoProvedorDeImagem = "heuristico" | "silencio" | "stub" | "openai";

/** `stub` só com `CLASSIFICADOR_IMAGEM_PROVEDOR=stub`; `silencio` força sem-resposta. */
export function provedorDeImagemDoAmbiente(
  env: Record<string, string | undefined> = process.env,
): ProvedorDeClassificadorDeImagem {
  const nome = (env.CLASSIFICADOR_IMAGEM_PROVEDOR ?? "heuristico").trim();
  if (nome === "stub") return provedorStub(env.CLASSIFICADOR_IMAGEM_STUB);
  if (nome === "silencio") {
    return { async classificar() { return "sem-resposta"; } };
  }
  if (nome === "openai") {
    const modelo = env.CLASSIFICADOR_IMAGEM_OPENAI_MODELO;
    return provedorOpenAi({
      apiKey: env.CLASSIFICADOR_IMAGEM_OPENAI_API_KEY,
      ...(modelo !== undefined && { modelo }),
    });
  }
  return provedorHeuristico;
}

function provedorStub(veredictoBruto: string | undefined): ProvedorDeClassificadorDeImagem {
  const veredicto = veredictoBruto?.trim() ?? "limpo";
  if (veredicto === "erro") {
    return { async classificar() { throw new Error("classificador.stub_erro"); } };
  }
  if (veredicto === "limpo" || veredicto === "suspeito" || veredicto === "sem-resposta") {
    return { async classificar() { return veredicto; } };
  }
  return { async classificar() { return "sem-resposta"; } };
}

/** No timeout, aborta o `controlador` além de rejeitar — sem isso o `fetch` do provedor segue até o fim e é cobrado mesmo com o veredito já descartado. */
function comTempo<T>(promessa: Promise<T>, ms: number, controlador: AbortController): Promise<T> {
  return new Promise((resolver, recusar) => {
    const id = setTimeout(() => {
      controlador.abort();
      recusar(new Error("classificador.tempo_esgotado"));
    }, ms);
    promessa.then(
      (valor) => {
        clearTimeout(id);
        resolver(valor);
      },
      (erro: unknown) => {
        clearTimeout(id);
        recusar(erro);
      },
    );
  });
}
