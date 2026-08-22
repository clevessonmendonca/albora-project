import { describe, expect, it } from "vitest";
import { VERSAO_DO_CONSENTIMENTO_EXTERNO } from "@albora/core";
import {
  chaveParaMoldura,
  composeShareFrame,
  parseShareContext,
  type ShareContext,
} from "./share-compose";
import type { GuestSession } from "./session";

const session: GuestSession = {
  token: "t.ok",
  slug: "festa-demo",
  sessaoId: "11111111-1111-1111-1111-111111111111",
  eventoId: "22222222-2222-2222-2222-222222222222",
};

function ctxBase(over: Partial<ShareContext> = {}): ShareContext {
  return {
    chaveFull: "e/x/full",
    chaveThumb: "e/x/thumb",
    mime: "image/jpeg",
    legenda: "oi",
    sessao: {
      nome: "Ana",
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: "2020-01-01T00:00:00.000Z",
        revogadoEm: null,
        nomeNaMoldura: true,
      },
    },
    evento: {
      slug: "festa-demo",
      packId: "casamento",
      comecaEm: "2025-06-01T18:00:00.000Z",
      identityTokens: { monograma: "AC", titulo: "Ana & Carlos" },
      panico: false,
      modoEndurecido: false,
      compartilhamentoExternoLiberado: true,
    },
    midia: {
      removida: false,
      liberadaPeloAnfitriao: true,
      denuncias: 0,
      classificador: "limpo",
    },
    ...over,
  };
}

describe("parseShareContext", () => {
  it("aceita payload completo da API", () => {
    const parsed = parseShareContext(ctxBase());
    expect(parsed?.chaveFull).toBe("e/x/full");
    expect(parsed?.evento.slug).toBe("festa-demo");
    expect(parsed?.sessao.consentimentoExterno?.nomeNaMoldura).toBe(true);
  });

  it("rejeita sem chaveFull", () => {
    expect(parseShareContext({ mime: "image/jpeg" })).toBeNull();
  });
});

describe("chaveParaMoldura", () => {
  it("usa thumb para vídeo", () => {
    expect(chaveParaMoldura(ctxBase({ mime: "video/mp4" }))).toBe("e/x/thumb");
  });

  it("usa full para imagem", () => {
    expect(chaveParaMoldura(ctxBase())).toBe("e/x/full");
  });
});

describe("composeShareFrame", () => {
  it("autoriza e monta composição 1080×1920", () => {
    const r = composeShareFrame({
      ctx: ctxBase(),
      session,
      largura: 1200,
      altura: 1600,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.composicao.largura).toBe(1080);
    expect(r.composicao.altura).toBe(1920);
    expect(r.composicao.conteudo.monograma).toBe("AC");
    expect(r.paleta.acento.length).toBeGreaterThan(0);
  });

  it("bloqueia com pânico", () => {
    const r = composeShareFrame({
      ctx: ctxBase({
        evento: {
          ...ctxBase().evento,
          panico: true,
        },
      }),
      session,
      largura: 1200,
      altura: 1600,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.codigo).toBe("compartilhar.bloqueado_pela_moderacao");
  });

  it("bloqueia sem liberação externa", () => {
    const r = composeShareFrame({
      ctx: ctxBase({
        evento: {
          ...ctxBase().evento,
          compartilhamentoExternoLiberado: false,
        },
      }),
      session,
      largura: 1200,
      altura: 1600,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.codigo).toBe("compartilhar.desligado_pelo_anfitriao");
  });
});
