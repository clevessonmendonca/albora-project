import { describe, expect, it, vi } from "vitest";
import { enviarLote, LIMITE_LOTE, limitarLote, type ResultadoEnfileirar } from "./lote";

function arquivos(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File([`f${i}`], `f${i}.jpg`, { type: "image/jpeg" }));
}

describe("limitarLote", () => {
  it("corta em 8 e avisa que excedeu", () => {
    const r = limitarLote(arquivos(11));
    expect(LIMITE_LOTE).toBe(8);
    expect(r.arquivos).toHaveLength(8);
    expect(r.excedeu).toBe(true);
  });

  it("até 8 passa inteiro e sem aviso", () => {
    const r = limitarLote(arquivos(8));
    expect(r.arquivos).toHaveLength(8);
    expect(r.excedeu).toBe(false);
  });
});

describe("enviarLote", () => {
  it("cada arquivo vira um item da fila, com o mesmo desafio e a mesma chave de prompt", async () => {
    const enfileirar = vi.fn(async (): Promise<ResultadoEnfileirar> => ({ ok: true, id: crypto.randomUUID() }));
    const anotar = vi.fn(async () => undefined);
    const lote = arquivos(3);

    const r = await enviarLote({
      arquivos: lote,
      detalhes: { legenda: null, lugar: null },
      desafioId: "m1",
      promptKey: null,
      enfileirar,
      anotar,
    });

    expect(enfileirar).toHaveBeenCalledTimes(3);
    expect(enfileirar.mock.calls.map((c) => (c as unknown[])[0])).toEqual(
      lote.map((arquivo) => ({ arquivo, desafioId: "m1", promptKey: null })),
    );
    expect(r.enfileiradas).toEqual(lote);
    expect(r.falhas).toBe(0);
  });

  it("propaga o momento e a legenda a cada item enfileirado, pelo mesmo caminho de /api/uploads/detalhes", async () => {
    let n = 0;
    const enfileirar = vi.fn(async (): Promise<ResultadoEnfileirar> => ({ ok: true, id: `id-${(n += 1)}` }));
    const anotar = vi.fn(async () => undefined);

    await enviarLote({
      arquivos: arquivos(3),
      detalhes: { legenda: "brinde", lugar: "recepcao" },
      desafioId: null,
      promptKey: null,
      enfileirar,
      anotar,
    });

    expect(anotar.mock.calls).toEqual([
      ["id-1", { legenda: "brinde", lugar: "recepcao" }],
      ["id-2", { legenda: "brinde", lugar: "recepcao" }],
      ["id-3", { legenda: "brinde", lugar: "recepcao" }],
    ]);
  });

  it("momento Livre sem legenda não anota nada", async () => {
    const enfileirar = vi.fn(async (): Promise<ResultadoEnfileirar> => ({ ok: true, id: "x" }));
    const anotar = vi.fn(async () => undefined);

    await enviarLote({
      arquivos: arquivos(2),
      detalhes: { legenda: null, lugar: null },
      desafioId: null,
      promptKey: null,
      enfileirar,
      anotar,
    });

    expect(anotar).not.toHaveBeenCalled();
  });

  it("nunca passa de 8, mesmo que a tela entregue mais", async () => {
    const enfileirar = vi.fn(async (): Promise<ResultadoEnfileirar> => ({ ok: true, id: "x" }));

    await enviarLote({
      arquivos: arquivos(12),
      detalhes: { legenda: null, lugar: null },
      desafioId: null,
      promptKey: null,
      enfileirar,
      anotar: async () => undefined,
    });

    expect(enfileirar).toHaveBeenCalledTimes(8);
  });

  it("uma falha não derruba as outras: as demais entram na fila e só as ok são anotadas", async () => {
    const enfileirar = vi
      .fn<() => Promise<ResultadoEnfileirar>>()
      .mockResolvedValueOnce({ ok: true, id: "a" })
      .mockResolvedValueOnce({ ok: false, erro: "Sem espaço" })
      .mockResolvedValueOnce({ ok: true, id: "c" });
    const anotar = vi.fn(async () => undefined);
    const aoEnfileirar = vi.fn();

    const r = await enviarLote({
      arquivos: arquivos(3),
      detalhes: { legenda: null, lugar: "festa" },
      desafioId: null,
      promptKey: null,
      enfileirar,
      anotar,
      aoEnfileirar,
    });

    expect(r.enfileiradas).toHaveLength(2);
    expect(r.falhas).toBe(1);
    expect(r.ultimoErro).toBe("Sem espaço");
    expect(anotar.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["a", "c"]);
    expect(aoEnfileirar).toHaveBeenCalledTimes(2);
  });
});
