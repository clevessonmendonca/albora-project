import { describe, expect, it } from "vitest";
import {
  chaveDaFaixa,
  votos,
  podeSugerir,
  sugestoesDaSessao,
  registrarSugestao,
  ordenarSugestoes,
} from "./sugestao";
import type { FaixaSugerida, LinkDeMusica } from "./types";
import type { GateDeInteracao } from "../interacao";

const LINK: LinkDeMusica = {
  provedor: "spotify",
  tipo: "faixa",
  identificador: "abc123",
  regiao: null,
  url: "https://open.spotify.com/track/abc123",
};

const AGORA = new Date("2026-09-01T23:00:00Z");

const EVENTO_ABERTO: GateDeInteracao = {
  interacaoAbreEm: new Date("2026-09-01T20:00:00Z"),
};

const EVENTO_FECHADO: GateDeInteracao = {
  interacaoAbreEm: new Date("2026-09-02T10:00:00Z"),
};

function faixa(overrides: Partial<FaixaSugerida> = {}): FaixaSugerida {
  return {
    chave: chaveDaFaixa(LINK),
    link: LINK,
    sessoes: ["s1"],
    primeiroEm: AGORA.getTime(),
    ...overrides,
  };
}

describe("chaveDaFaixa", () => {
  it("combina provedor, tipo e identificador", () => {
    expect(chaveDaFaixa(LINK)).toBe("spotify:faixa:abc123");
  });
});

describe("votos", () => {
  it("conta sessões como votos", () => {
    expect(votos(faixa({ sessoes: ["s1", "s2", "s3"] }))).toBe(3);
  });

  it("retorna 1 para sessão única", () => {
    expect(votos(faixa())).toBe(1);
  });
});

describe("podeSugerir", () => {
  it("true quando interação aberta", () => {
    expect(podeSugerir(EVENTO_ABERTO, AGORA)).toBe(true);
  });

  it("false quando interação fechada", () => {
    expect(podeSugerir(EVENTO_FECHADO, AGORA)).toBe(false);
  });

  it("false quando interacaoAbreEm é null", () => {
    expect(podeSugerir({ interacaoAbreEm: null }, AGORA)).toBe(false);
  });
});

describe("sugestoesDaSessao", () => {
  it("conta faixas onde sessão é primeira", () => {
    const fila = [
      faixa({ chave: "a", sessoes: ["s1"] }),
      faixa({ chave: "b", sessoes: ["s2"] }),
      faixa({ chave: "c", sessoes: ["s1"] }),
    ];
    expect(sugestoesDaSessao(fila, "s1")).toBe(2);
  });

  it("retorna 0 quando sessão não sugeriu nada", () => {
    expect(sugestoesDaSessao([faixa()], "s99")).toBe(0);
  });
});

describe("registrarSugestao", () => {
  it("adiciona nova faixa à fila", () => {
    const resultado = registrarSugestao(
      [],
      { sessaoId: "s1", link: LINK },
      EVENTO_ABERTO,
      AGORA,
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.fila).toHaveLength(1);
      expect(resultado.fila[0]!.chave).toBe(chaveDaFaixa(LINK));
      expect(resultado.fila[0]!.sessoes).toEqual(["s1"]);
    }
  });

  it("adiciona voto a faixa existente", () => {
    const filaExistente = [faixa({ sessoes: ["s1"] })];
    const resultado = registrarSugestao(
      filaExistente,
      { sessaoId: "s2", link: LINK },
      EVENTO_ABERTO,
      AGORA,
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.fila[0]!.sessoes).toEqual(["s1", "s2"]);
    }
  });

  it("idempotente quando sessão já votou na faixa", () => {
    const filaExistente = [faixa({ sessoes: ["s1"] })];
    const resultado = registrarSugestao(
      filaExistente,
      { sessaoId: "s1", link: LINK },
      EVENTO_ABERTO,
      AGORA,
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.fila[0]!.sessoes).toEqual(["s1"]);
    }
  });

  it("recusa quando interação fechada", () => {
    const resultado = registrarSugestao(
      [],
      { sessaoId: "s1", link: LINK },
      EVENTO_FECHADO,
      AGORA,
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro.code).toBe("musica.interacao_fechada");
    }
  });

  it("recusa quando sessão atingiu teto de sugestões", () => {
    const fila = [
      faixa({ chave: "x:faixa:1", sessoes: ["s1"] }),
      faixa({ chave: "x:faixa:2", sessoes: ["s1"] }),
      faixa({ chave: "x:faixa:3", sessoes: ["s1"] }),
    ];
    const novoLink: LinkDeMusica = { ...LINK, identificador: "novo" };
    const resultado = registrarSugestao(
      fila,
      { sessaoId: "s1", link: novoLink },
      EVENTO_ABERTO,
      AGORA,
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro.code).toBe("musica.teto_de_sugestoes");
    }
  });

  it("permite votar em existente mesmo no teto de sugestões", () => {
    const fila = [
      faixa({ chave: chaveDaFaixa(LINK), sessoes: ["s2"] }),
      faixa({ chave: "x:faixa:1", sessoes: ["s1"] }),
      faixa({ chave: "x:faixa:2", sessoes: ["s1"] }),
      faixa({ chave: "x:faixa:3", sessoes: ["s1"] }),
    ];
    const resultado = registrarSugestao(
      fila,
      { sessaoId: "s1", link: LINK },
      EVENTO_ABERTO,
      AGORA,
    );
    expect(resultado.ok).toBe(true);
  });
});

describe("ordenarSugestoes", () => {
  it("ordena por votos decrescentes", () => {
    const fila = [
      faixa({ chave: "a", sessoes: ["s1"], primeiroEm: 100 }),
      faixa({ chave: "b", sessoes: ["s1", "s2", "s3"], primeiroEm: 200 }),
    ];
    const ordenada = ordenarSugestoes(fila);
    expect(ordenada[0]!.chave).toBe("b");
  });

  it("desempata por primeiroEm crescente", () => {
    const fila = [
      faixa({ chave: "a", sessoes: ["s1"], primeiroEm: 200 }),
      faixa({ chave: "b", sessoes: ["s2"], primeiroEm: 100 }),
    ];
    const ordenada = ordenarSugestoes(fila);
    expect(ordenada[0]!.chave).toBe("b");
  });

  it("não modifica a fila original", () => {
    const fila = [faixa({ chave: "a" })];
    const ordenada = ordenarSugestoes(fila);
    expect(ordenada).not.toBe(fila);
  });
});
