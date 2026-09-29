import { describe, expect, it } from "vitest";
import { autoria, escreverCursor, lerCursor, quando } from "./descobrir-tela";

describe("cursor do feed", () => {
  const post = { chave: "2026-09-27T18:04:05.123456Z", id: "8b1c0a5e-1f2d-4c3b-9a7e-2f5d6c7b8a90" };

  it("volta igual ao que saiu", () => {
    const lido = lerCursor(escreverCursor(post));

    expect(lido?.id).toBe(post.id);
    // 🔴 Texto, nunca `Date`: reconstruir perderia os microssegundos, e a linha
    // entre o truncado e o real sumiria de todas as páginas, sem erro nenhum.
    expect(lido?.chave).toBe(post.chave);
  });

  it("🔴 id que não é UUID é recusado — ele ia direto para um ::uuid da consulta", () => {
    // Sem isto, `?antes=2026-09-27T18:04:05.123Z_../../x` não devolve o topo do
    // feed: estoura no Postgres e a página inteira responde 500.
    expect(lerCursor(`${post.chave}_nao-e-uuid`)).toBeUndefined();
    expect(lerCursor(`${post.chave}_`)).toBeUndefined();
  });

  it("🔴 chave sem os seis dígitos é recusada — é o milissegundo que pula linha", () => {
    expect(lerCursor(`2026-09-27T18:04:05.123Z_${post.id}`)).toBeUndefined();
  });

  it("valor torto da URL vira 'sem cursor', não exceção", () => {
    for (const torto of [undefined, "", "_", "lixo", "nao-e-data_abc", "_só-id"]) {
      expect(lerCursor(torto)).toBeUndefined();
    }
  });
});

describe("autoria", () => {
  it("distingue quem lê de quem não é, e não diz mais que isso", () => {
    expect(autoria(true)).toBe("Você");
    expect(autoria(false)).toBe("Quem organiza");
  });
});

describe("quando", () => {
  const agora = new Date("2026-09-27T12:00:00.000Z");
  const atras = (ms: number) => new Date(agora.getTime() - ms).toISOString();

  it("conta nas unidades que a pessoa usa", () => {
    expect(quando(atras(10_000), agora)).toBe("agora");
    expect(quando(atras(5 * 60_000), agora)).toBe("há 5 min");
    expect(quando(atras(3 * 3_600_000), agora)).toBe("há 3 h");
    expect(quando(atras(2 * 86_400_000), agora)).toBe("há 2 d");
  });

  it("passada uma semana vira data — 'há 340 d' não situa ninguém", () => {
    expect(quando(atras(30 * 86_400_000), agora)).toMatch(/\d{2}/);
    expect(quando(atras(30 * 86_400_000), agora)).not.toContain("há");
  });
});
