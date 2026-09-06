/**
 * Este arquivo mede a DECISÃO do limiar (a lógica de `veredictoDoResultadoBruto`
 * em cima de `LIMIAR_SUSPEITO`), não a ACURÁCIA do classificador.
 *
 * "Decisão" = dado um escore que a OpenAI devolveu, o código chega no veredicto
 * certo (`limpo`/`suspeito`)? Isso é determinístico, sem rede, e cabe em fixture
 * escrita à mão.
 *
 * "Acurácia" = será que 0.5 é o limiar certo para não perder conteúdo real nem
 * encher a fila de revisão do anfitrião? Isso exige foto real (benigna e adversa)
 * e julgamento humano — não cabe em teste automatizado. Ver
 * `docs/runbooks/moderacao-calibragem.md` para as duas medições humanas que
 * respondem essa segunda pergunta.
 *
 * Fixtures no formato de resposta documentado em
 * docs/superpowers/specs/2026-09-04-pesquisa-provedores-moderacao.md §Candidato 1 Q4
 * — nunca capturadas de uma chamada real, nunca contendo imagem de convidado.
 */
import { describe, expect, it } from "vitest";
import { LIMIAR_SUSPEITO, resultadoBrutoOpenAi, veredictoDoResultadoBruto } from "./classificador-openai";

/** Fixture escrita à mão, no formato bruto de `/v1/moderations`. Categorias fora do interesse do caso ficam em 0. */
function respostaModeracao(overrides: {
  flagged?: boolean;
  category_scores?: Record<string, number>;
}): unknown {
  return {
    id: "modr-fixture-calibragem",
    model: "omni-moderation-latest",
    results: [
      {
        flagged: overrides.flagged ?? false,
        categories: {
          sexual: false,
          violence: false,
          hate: false,
          harassment: false,
        },
        category_scores: {
          sexual: 0,
          violence: 0,
          hate: 0,
          harassment: 0,
          ...overrides.category_scores,
        },
        category_applied_input_types: {},
      },
    ],
  };
}

function veredictoDaFixture(overrides: Parameters<typeof respostaModeracao>[0]) {
  const resultado = resultadoBrutoOpenAi(respostaModeracao(overrides));
  if (!resultado) throw new Error("fixture malformada — bug no teste, não no provedor");
  return veredictoDoResultadoBruto(resultado);
}

describe("calibragem do limiar — mede decisão, não acurácia", () => {
  it("escore logo abaixo do limiar vira limpo", () => {
    const veredicto = veredictoDaFixture({ category_scores: { violence: LIMIAR_SUSPEITO - 0.01 } });
    expect(veredicto).toBe("limpo");
  });

  it("escore logo acima do limiar vira suspeito", () => {
    const veredicto = veredictoDaFixture({ category_scores: { violence: LIMIAR_SUSPEITO + 0.01 } });
    expect(veredicto).toBe("suspeito");
  });

  it("escore exatamente no limiar vira suspeito — comportamento fixado, mudar isso é deliberado", () => {
    const veredicto = veredictoDaFixture({ category_scores: { violence: LIMIAR_SUSPEITO } });
    expect(veredicto).toBe("suspeito");
  });

  it("múltiplas categorias onde só uma passa do limiar vira suspeito", () => {
    const veredicto = veredictoDaFixture({
      category_scores: {
        sexual: LIMIAR_SUSPEITO - 0.3,
        hate: LIMIAR_SUSPEITO - 0.2,
        harassment: LIMIAR_SUSPEITO - 0.1,
        violence: LIMIAR_SUSPEITO + 0.05,
      },
    });
    expect(veredicto).toBe("suspeito");
  });

  it("flagged=true com todos os escores abaixo do limiar vira suspeito — o provedor sabe algo que o escore isolado não diz", () => {
    const veredicto = veredictoDaFixture({
      flagged: true,
      category_scores: {
        sexual: LIMIAR_SUSPEITO - 0.4,
        violence: LIMIAR_SUSPEITO - 0.3,
        hate: LIMIAR_SUSPEITO - 0.2,
        harassment: LIMIAR_SUSPEITO - 0.1,
      },
    });
    expect(veredicto).toBe("suspeito");
  });

  it("flagged=false com todos os escores abaixo do limiar vira limpo (caso base)", () => {
    const veredicto = veredictoDaFixture({ flagged: false });
    expect(veredicto).toBe("limpo");
  });
});
