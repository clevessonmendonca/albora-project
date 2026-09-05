import { describe, expect, it, vi } from "vitest";
import { classificarImagem } from "./classificador-imagem";
import {
  provedorOpenAi,
  resultadoBrutoOpenAi,
  veredictoDoResultadoBruto,
  type ResultadoBrutoOpenAi,
} from "./classificador-openai";

function thumbMinimo(): { bytes: Uint8Array; mime: string } {
  const bytes = new Uint8Array(32);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return { bytes, mime: "image/jpeg" };
}

/** Fixture escrita à mão, no formato documentado em docs/superpowers/specs/2026-09-04-pesquisa-provedores-moderacao.md §Candidato 1 Q4 — nunca capturada de chamada real. */
function respostaModeracao(overrides: {
  flagged?: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
}): unknown {
  return {
    id: "modr-fixture",
    model: "omni-moderation-latest",
    results: [
      {
        flagged: overrides.flagged ?? false,
        categories: {
          sexual: false,
          "sexual/minors": false,
          harassment: false,
          "harassment/threatening": false,
          hate: false,
          "hate/threatening": false,
          illicit: false,
          "illicit/violent": false,
          "self-harm": false,
          "self-harm/intent": false,
          "self-harm/instructions": false,
          violence: false,
          "violence/graphic": false,
          ...overrides.categories,
        },
        category_scores: {
          sexual: 0.001,
          "sexual/minors": 0,
          harassment: 0.001,
          "harassment/threatening": 0,
          hate: 0.001,
          "hate/threatening": 0,
          illicit: 0,
          "illicit/violent": 0,
          "self-harm": 0.001,
          "self-harm/intent": 0,
          "self-harm/instructions": 0,
          violence: 0.001,
          "violence/graphic": 0,
          ...overrides.category_scores,
        },
        category_applied_input_types: {},
      },
    ],
  };
}

function fetchQueRetorna(status: number, corpo: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  })) as unknown as typeof fetch;
}

describe("provedorOpenAi — resposta com categoria acima do limiar", () => {
  it("vira suspeito", async () => {
    const fetchFalso = fetchQueRetorna(
      200,
      respostaModeracao({ category_scores: { violence: 0.87 } }),
    );
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("suspeito");
  });

  it("flagged=true também vira suspeito, mesmo com escores baixos", async () => {
    const fetchFalso = fetchQueRetorna(200, respostaModeracao({ flagged: true }));
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("suspeito");
  });
});

describe("provedorOpenAi — resposta limpa", () => {
  it("vira limpo", async () => {
    const fetchFalso = fetchQueRetorna(200, respostaModeracao({}));
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("limpo");
  });
});

describe("provedorOpenAi — falhas viram sem-resposta, nunca limpo", () => {
  it("HTTP 429 vira sem-resposta", async () => {
    const fetchFalso = fetchQueRetorna(429, { error: { message: "rate limit" } });
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
  });

  it("HTTP 500 vira sem-resposta", async () => {
    const fetchFalso = fetchQueRetorna(500, { error: { message: "internal" } });
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
  });

  it("corpo malformado (JSON não faz parse) vira sem-resposta", async () => {
    const fetchFalso = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    })) as unknown as typeof fetch;
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
  });

  it("JSON inesperado (sem o formato documentado) vira sem-resposta", async () => {
    const fetchFalso = fetchQueRetorna(200, { ok: true, mensagem: "formato diferente" });
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
  });

  it("results vazio vira sem-resposta", async () => {
    const fetchFalso = fetchQueRetorna(200, { id: "modr-fixture", results: [] });
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
  });

  it("erro de rede (fetch rejeita) vira sem-resposta", async () => {
    const fetchFalso = vi.fn(async () => {
      throw new Error("rede indisponível");
    }) as unknown as typeof fetch;
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchFalso });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
  });

  it("timeout respeita o limite passado a classificarImagem e vira sem-resposta", async () => {
    const fetchQueNuncaResponde = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const provedor = provedorOpenAi({ apiKey: "sk-fixture", fetch: fetchQueNuncaResponde });
    await expect(classificarImagem(thumbMinimo(), provedor, 20)).resolves.toBe("sem-resposta");
  });
});

describe("provedorOpenAi — chave ausente", () => {
  it("vira sem-resposta sem nenhuma chamada de rede", async () => {
    const fetchQueNaoDeveSerChamado = vi.fn() as unknown as typeof fetch;
    const provedor = provedorOpenAi({ apiKey: undefined, fetch: fetchQueNaoDeveSerChamado });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
    expect(fetchQueNaoDeveSerChamado).not.toHaveBeenCalled();
  });

  it("chave em branco também conta como ausente", async () => {
    const fetchQueNaoDeveSerChamado = vi.fn() as unknown as typeof fetch;
    const provedor = provedorOpenAi({ apiKey: "   ", fetch: fetchQueNaoDeveSerChamado });
    await expect(provedor.classificar(thumbMinimo())).resolves.toBe("sem-resposta");
    expect(fetchQueNaoDeveSerChamado).not.toHaveBeenCalled();
  });
});

describe("resultadoBrutoOpenAi — o que vai para persistência nunca contém a imagem", () => {
  it("extrai só flagged/categories/category_scores, descartando qualquer outro campo", () => {
    const base64Fake = Buffer.from(thumbMinimo().bytes).toString("base64");
    const corpoComEcoSuspeito = {
      id: "modr-fixture",
      model: "omni-moderation-latest",
      // Campo hipotético que ecoaria a imagem enviada — a API real nunca faz isso,
      // mas o teste garante que, mesmo se algo assim aparecesse, seria descartado.
      input_echo: `data:image/jpeg;base64,${base64Fake}`,
      results: [
        {
          flagged: false,
          categories: { sexual: false },
          category_scores: { sexual: 0.01 },
          category_applied_input_types: {},
        },
      ],
    };

    const resultado = resultadoBrutoOpenAi(corpoComEcoSuspeito);

    expect(resultado).toEqual<ResultadoBrutoOpenAi>({
      flagged: false,
      categories: { sexual: false },
      category_scores: { sexual: 0.01 },
    });
    const serializado = JSON.stringify(resultado);
    expect(serializado).not.toContain(base64Fake);
    expect(serializado).not.toContain("input_echo");
    expect(serializado).not.toContain("data:image");
  });

  it("corpo sem o formato documentado retorna null", () => {
    expect(resultadoBrutoOpenAi({ nada_a_ver: true })).toBeNull();
    expect(resultadoBrutoOpenAi(null)).toBeNull();
    expect(resultadoBrutoOpenAi("string qualquer")).toBeNull();
  });
});

describe("veredictoDoResultadoBruto", () => {
  it("limiar exato (0.5) já conta como suspeito", () => {
    const resultado: ResultadoBrutoOpenAi = {
      flagged: false,
      categories: { violence: false },
      category_scores: { violence: 0.5 },
    };
    expect(veredictoDoResultadoBruto(resultado)).toBe("suspeito");
  });

  it("abaixo do limiar e não flagged é limpo", () => {
    const resultado: ResultadoBrutoOpenAi = {
      flagged: false,
      categories: { violence: false },
      category_scores: { violence: 0.49 },
    };
    expect(veredictoDoResultadoBruto(resultado)).toBe("limpo");
  });
});
