import { describe, expect, it, vi } from "vitest";
import { VERSAO_DO_CONSENTIMENTO_EXTERNO } from "@albora/core";

vi.mock("expo-file-system", () => ({
  cacheDirectory: "/tmp/",
  EncodingType: { Base64: "base64" },
  downloadAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => undefined),
}));

import {
  compartilharFotoPropria,
  fetchShareContext,
  registrarConsentimentoExterno,
} from "./share";
import type { GuestSession } from "./session";

const session: GuestSession = {
  token: "t.ok",
  slug: "festa-demo",
  sessaoId: "11111111-1111-1111-1111-111111111111",
  eventoId: "22222222-2222-2222-2222-222222222222",
};

const uploadId = "33333333-3333-3333-3333-333333333333";

function apiCtx() {
  return {
    chaveFull: "e/x/full",
    chaveThumb: "e/x/thumb",
    mime: "image/jpeg",
    legenda: null,
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
  };
}

describe("fetchShareContext", () => {
  it("parseia contexto válido", async () => {
    const fetchFn = vi.fn(async () => Response.json(apiCtx()));
    const ctx = await fetchShareContext(session, uploadId, fetchFn);
    expect(ctx?.chaveFull).toBe("e/x/full");
    expect(ctx?.evento.packId).toBe("casamento");
  });

  it("retorna null em 404", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 404 }));
    expect(await fetchShareContext(session, uploadId, fetchFn)).toBeNull();
  });
});

describe("registrarConsentimentoExterno", () => {
  it("true em 200", async () => {
    const fetchFn = vi.fn(async () => Response.json({ registrado: true }));
    expect(await registrarConsentimentoExterno(session, true, fetchFn)).toBe(true);
  });
});

describe("compartilharFotoPropria", () => {
  it("compõe moldura e chama shareAsync", async () => {
    const shareAsync = vi.fn(async () => undefined);
    const writeBase64 = vi.fn(async () => undefined);
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).includes("/api/share")) return Response.json(apiCtx());
      if (String(url).includes("/api/media/urls")) {
        return Response.json({ urls: [{ chave: "e/x/full", url: "https://cdn/x.jpg" }] });
      }
      return new Response("no", { status: 404 });
    });

    const r = await compartilharFotoPropria({
      session,
      uploadId,
      fetchFn: fetchFn as unknown as typeof fetch,
      downloadAsync: (async () => ({
        uri: "/tmp/raw.jpg",
        status: 200,
        headers: {},
        md5: null,
        mimeType: "image/jpeg",
      })) as never,
      readBase64: async () => "AAAA",
      writeBase64,
      measureImage: () => ({ largura: 1200, altura: 1600 }),
      renderFrame: async () => new Uint8Array([1, 2, 3]),
      shareAsync: shareAsync as never,
      isAvailableAsync: async () => true,
    });

    expect(r).toEqual({ ok: true, moldura: true });
    expect(writeBase64).toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalledWith(
      expect.stringContaining("albora-share-"),
      expect.objectContaining({ mimeType: "image/jpeg" }),
    );
  });

  it("faz fallback raw quando renderFrame falha", async () => {
    const shareAsync = vi.fn(async () => undefined);
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).includes("/api/share")) return Response.json(apiCtx());
      if (String(url).includes("/api/media/urls")) {
        return Response.json({ urls: [{ chave: "e/x/full", url: "https://cdn/x.jpg" }] });
      }
      return new Response("no", { status: 404 });
    });

    const r = await compartilharFotoPropria({
      session,
      uploadId,
      fetchFn: fetchFn as unknown as typeof fetch,
      downloadAsync: (async () => ({
        uri: "/tmp/raw.jpg",
        status: 200,
        headers: {},
        md5: null,
        mimeType: "image/jpeg",
      })) as never,
      readBase64: async () => "AAAA",
      measureImage: () => ({ largura: 1200, altura: 1600 }),
      renderFrame: async () => {
        throw new Error("skia down");
      },
      shareAsync: shareAsync as never,
      isAvailableAsync: async () => true,
    });

    expect(r).toEqual({ ok: true, moldura: false });
    expect(shareAsync).toHaveBeenCalledWith(
      "/tmp/raw.jpg",
      expect.objectContaining({ mimeType: "image/jpeg" }),
    );
  });
});
