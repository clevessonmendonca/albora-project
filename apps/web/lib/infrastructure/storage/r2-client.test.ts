import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PREFIXO_MAGIC_BYTES } from "@albora/core";
import {
  metadadosDaInspecao,
  rangeDoPrefixoMagic,
  signPut,
  signGet,
  inspectObject,
  streamObject,
  readThumb,
  deleteObject,
  bufferObject,
} from "./r2-client";

/**
 * `config()` (`@/lib/config`) lê `process.env` uma vez e guarda em memória —
 * seta aqui, antes de qualquer chamada que assine ou busque no R2, credencial
 * de mentira (assinatura AWS SigV4 é matemática pura sobre a chave, não bate
 * num servidor de verdade pra validar). `APP_ROOT_DOMAIN`/`MEDIA_DOMAIN` ficam
 * de fora para não disparar o guard de separação de origem (§4.3) com
 * variáveis que podem estar setadas no ambiente do CI para outro propósito.
 */
beforeAll(() => {
  process.env.SESSION_SECRET = "s".repeat(32);
  process.env.R2_ACCOUNT_ID = "conta-teste";
  process.env.R2_ACCESS_KEY_ID = "chave-de-acesso-teste";
  process.env.R2_SECRET_ACCESS_KEY = "segredo-de-teste-bem-longo-o-bastante";
  process.env.R2_BUCKET = "bucket-teste";
  process.env.DATABASE_URL = "postgresql://user:pass@host/db";
  delete process.env.APP_ROOT_DOMAIN;
  delete process.env.MEDIA_DOMAIN;
});

function jpegPrefixo(tamanho = PREFIXO_MAGIC_BYTES): Uint8Array {
  const corpo = new Uint8Array(tamanho);
  corpo[0] = 0xff;
  corpo[1] = 0xd8;
  corpo[2] = 0xff;
  return corpo;
}

describe("Range do prefixo — o confirm não puxa a foto", () => {
  it("pede exatamente os bytes que o magic precisa", () => {
    expect(rangeDoPrefixoMagic()).toBe(`bytes=0-${PREFIXO_MAGIC_BYTES - 1}`);
  });
});

describe("metadadosDaInspecao — resposta do GET no /full", () => {
  it("206 usa o total do Content-Range, não o tamanho do prefixo", () => {
    const meta = metadadosDaInspecao(
      206,
      new Headers({ "content-range": "bytes 0-15/819200" }),
      jpegPrefixo(),
    );

    expect(meta?.bytes).toBe(819200);
    expect(meta?.inicio.byteLength).toBe(PREFIXO_MAGIC_BYTES);
    expect([...meta!.inicio.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("404 é objeto ausente, não erro", () => {
    expect(metadadosDaInspecao(404, new Headers(), new Uint8Array())).toBeNull();
  });

  it("200 com o objeto inteiro copia só o prefixo — o buffer grande não fica preso", () => {
    const corpo = jpegPrefixo(1024 * 1024);
    const meta = metadadosDaInspecao(
      200,
      new Headers({ "content-length": String(corpo.byteLength) }),
      corpo,
    );

    expect(meta?.bytes).toBe(1024 * 1024);
    expect(meta?.inicio.byteLength).toBe(PREFIXO_MAGIC_BYTES);
    expect(meta?.inicio.buffer.byteLength).toBe(PREFIXO_MAGIC_BYTES);
  });

  it("status inesperado falha alto", () => {
    expect(() => metadadosDaInspecao(403, new Headers(), jpegPrefixo())).toThrow(/inspeção falhou: 403/);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signPut — URL presignada de escrita, sem o servidor tocar o byte", () => {
  it("assina PUT com expiração e aponta pro bucket/chave certos", async () => {
    const url = await signPut("events/e1/2026/01/foto/full", "image/jpeg", 600);
    const assinada = new URL(url);

    expect(assinada.hostname).toBe("conta-teste.r2.cloudflarestorage.com");
    expect(assinada.pathname).toBe("/bucket-teste/events/e1/2026/01/foto/full");
    expect(assinada.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(assinada.searchParams.get("X-Amz-Signature")).toBeTruthy();
  });
});

describe("signGet — URL presignada de leitura", () => {
  it("força content-disposition inline (§4.3: a resposta declara o que é)", async () => {
    const url = await signGet("events/e1/2026/01/foto/full", 60);
    const assinada = new URL(url);

    expect(assinada.searchParams.get("response-content-disposition")).toBe("inline");
    expect(assinada.searchParams.get("X-Amz-Expires")).toBe("60");
    expect(assinada.searchParams.get("X-Amz-Signature")).toBeTruthy();
  });
});

describe("inspectObject — GET com Range no confirm", () => {
  it("404 é objeto ausente, não erro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    expect(await inspectObject("events/e1/full")).toBeNull();
  });

  it("206 devolve prefixo e total do Content-Range", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(jpegPrefixo() as BodyInit, {
            status: 206,
            headers: { "content-range": "bytes 0-15/500000" },
          }),
      ),
    );

    const meta = await inspectObject("events/e1/full");

    expect(meta?.bytes).toBe(500000);
    expect([...meta!.inicio.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("pede exatamente o Range do prefixo magic, numa requisição assinada", async () => {
    const fetchFalso = vi.fn(async (_req: Request) => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchFalso);

    await inspectObject("events/e1/full");

    const [requisicao] = fetchFalso.mock.calls[0] as [Request];
    expect(requisicao.method).toBe("GET");
    expect(requisicao.headers.get("range")).toBe(rangeDoPrefixoMagic());
    // client().fetch() assina por header (Authorization), não por query —
    // signQuery:true é só para as URLs de signPut/signGet, feitas pra ir num
    // <img>/<video src> sem poder carregar header nenhum.
    expect(requisicao.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256/);
  });

  it("status inesperado (403) falha alto — não vira null silencioso", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));

    await expect(inspectObject("events/e1/full")).rejects.toThrow(/inspeção falhou: 403/);
  });
});

describe("streamObject — leitura em stream, sem materializar em memória", () => {
  it("404 é objeto ausente", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    expect(await streamObject("events/e1/full")).toBeNull();
  });

  it("devolve o body como stream", async () => {
    const resposta = new Response("conteúdo", { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async () => resposta));

    expect(await streamObject("events/e1/full")).toBe(resposta.body);
  });

  it("erro de leitura falha alto", async () => {
    // aws4fetch tenta de novo (até 10×, com backoff) qualquer 5xx dentro de
    // `client().fetch()` — comportamento real e desejado contra falha
    // transitória do R2. `Math.random` a 0 zera o jitter do backoff
    // (`Math.random() * initRetryMs * 2^i`) sem trocar o motor de timer —
    // `vi.useFakeTimers` trava aqui porque o `setTimeout` do retry roda
    // dentro de uma Promise que o próprio fetch (mockado) já resolveu, e o
    // fake timer perde a re-entrada.
    const semJitter = vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(streamObject("events/e1/full")).rejects.toThrow(/leitura falhou: 500/);

    semJitter.mockRestore();
  }, 15_000);
});

describe("readThumb — leitura para o classificador (spec 011), fora do crítico", () => {
  it("404 é objeto ausente", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    expect(await readThumb("events/e1/thumb")).toBeNull();
  });

  it("206 devolve os bytes lidos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 206 })),
    );

    expect([...(await readThumb("events/e1/thumb"))!]).toEqual([1, 2, 3]);
  });

  it("pede o teto de 512 KiB, não a thumb inteira sem limite", async () => {
    const fetchFalso = vi.fn(async (_req: Request) => new Response(new Uint8Array([1]) as BodyInit, { status: 206 }));
    vi.stubGlobal("fetch", fetchFalso);

    await readThumb("events/e1/thumb");

    const [requisicao] = fetchFalso.mock.calls[0] as [Request];
    expect(requisicao.headers.get("range")).toBe(`bytes=0-${512 * 1024 - 1}`);
  });

  it("status que não é ok nem 206 falha alto", async () => {
    // mesmo motivo do teste equivalente em streamObject: 5xx dispara retry
    // real do aws4fetch — zera o jitter do backoff em vez de mockar timer.
    const semJitter = vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(readThumb("events/e1/thumb")).rejects.toThrow(/leitura da thumb falhou: 500/);

    semJitter.mockRestore();
  }, 15_000);
});

describe("deleteObject — só o D365 (retention.mjs) chama isto", () => {
  it("200 é sucesso", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await expect(deleteObject("events/e1/full")).resolves.toBeUndefined();
  });

  it("404 conta como sucesso — idempotente por desenho", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    await expect(deleteObject("events/e1/full")).resolves.toBeUndefined();
  });

  it("outro erro falha alto", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(deleteObject("events/e1/full")).rejects.toThrow(/purge falhou: 500/);
  });
});

describe("bufferObject — stopgap síncrono do export (spec §9, fase 4)", () => {
  it("objeto ausente devolve null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    expect(await bufferObject("events/e1/full")).toBeNull();
  });

  it("concatena os chunks do stream na ordem, sem perder byte", async () => {
    const resposta = new Response(new Uint8Array([1, 2, 3, 4, 5]), { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async () => resposta));

    expect([...(await bufferObject("events/e1/full"))!]).toEqual([1, 2, 3, 4, 5]);
  });
});
