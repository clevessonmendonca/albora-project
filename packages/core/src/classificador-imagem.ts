import { detectarTipo } from "./midia";
import type { VeredictoDoClassificador } from "./moderacao";

/** Fora do caminho crítico — provedor silencioso vira `sem-resposta`; galeria publica, telão segura. */

export type EntradaDeImagem = {
  bytes: Uint8Array;
  mime: string;
};

export type ProvedorDeClassificadorDeImagem = {
  classificar(entrada: EntradaDeImagem): Promise<VeredictoDoClassificador>;
};

export const TEMPO_MAXIMO_MS = 2_500;

export async function classificarImagem(
  entrada: EntradaDeImagem,
  provedor: ProvedorDeClassificadorDeImagem,
  tempoMaximoMs: number = TEMPO_MAXIMO_MS,
): Promise<VeredictoDoClassificador> {
  try {
    return await comTempo(provedor.classificar(entrada), tempoMaximoMs);
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

export type NomeDoProvedorDeImagem = "heuristico" | "silencio" | "stub";

/** `stub` só com `CLASSIFICADOR_IMAGEM_PROVEDOR=stub`; `silencio` força sem-resposta. */
export function provedorDeImagemDoAmbiente(
  env: Record<string, string | undefined> = process.env,
): ProvedorDeClassificadorDeImagem {
  const nome = (env.CLASSIFICADOR_IMAGEM_PROVEDOR ?? "heuristico").trim();
  if (nome === "stub") return provedorStub(env.CLASSIFICADOR_IMAGEM_STUB);
  if (nome === "silencio") {
    return { async classificar() { return "sem-resposta"; } };
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

function comTempo<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, recusar) => {
    const id = setTimeout(() => recusar(new Error("classificador.tempo_esgotado")), ms);
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
