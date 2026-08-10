import { beforeEach, describe, expect, it } from "vitest";
import { drenar, enviarItem, type Transporte } from "./envio";
import { MAX_TENTATIVAS, type Fila, type ItemFila } from "./fila";
import type { RespostaPresign } from "./upload";

function filaEmMemoria(iniciais: ItemFila[] = []) {
  const itens = new Map(iniciais.map((i) => [i.id, { ...i }]));

  const fila: Fila = {
    async enfileirar(i) {
      itens.set(i.id, { ...i });
    },
    async listar() {
      return [...itens.values()].sort((a, b) => a.criadoEm - b.criadoEm);
    },
    async remover(id) {
      itens.delete(id);
    },
    async marcarTentativa(id) {
      const i = itens.get(id);
      if (i) i.tentativas += 1;
    },
  };

  return { fila, itens };
}

const item = (id: string, tentativas = 0): ItemFila => ({
  id,
  eventoId: "11111111-1111-1111-1111-111111111111",
  corpo: { tipo: "arquivo", caminho: `/tmp/${id}`, bytes: 800_000 },
  mime: "image/jpeg",
  criadoEm: Number(id.replace(/\D/g, "")) || 1,
  tentativas,
});

const presign = (id: string): RespostaPresign => ({
  uploadId: id,
  chave: `events/e/2026/08/${id}`,
  full: `https://storage.test/${id}/full?assinado`,
  thumb: `https://storage.test/${id}/thumb?assinado`,
  expiraEm: Date.now() + 600_000,
});

type Falha = "presign" | "bytes" | "confirm" | null;

function transporteFalso(falharEm: Falha = null) {
  const chamadas: string[] = [];

  const transporte: Transporte = {
    async presign(i) {
      chamadas.push(`presign:${i.id}`);
      if (falharEm === "presign") throw new Error("presign 503");
      return presign(i.id);
    },
    async enviarBytes(url, i) {
      chamadas.push(`bytes:${i.id}`);
      if (falharEm === "bytes") throw new Error("rede caiu");
      expect(url).toContain("assinado");
    },
    async confirmar(i) {
      chamadas.push(`confirm:${i.id}`);
      if (falharEm === "confirm") throw new Error("confirm 500");
    },
  };

  return { transporte, chamadas };
}

let ctx: ReturnType<typeof filaEmMemoria>;
beforeEach(() => {
  ctx = filaEmMemoria();
});

describe("caminho feliz", () => {
  it("presign, bytes e confirm — nesta ordem", async () => {
    await ctx.fila.enfileirar(item("a1"));
    const { transporte, chamadas } = transporteFalso();

    const r = await enviarItem(item("a1"), transporte, ctx.fila);

    expect(r.estado).toBe("enviado");
    // Confirm antes dos bytes criaria linha apontando para objeto que não
    // existe — foto na galeria que não abre.
    expect(chamadas).toEqual(["presign:a1", "bytes:a1", "confirm:a1"]);
  });

  it("só remove da fila depois do confirm aceito", async () => {
    await ctx.fila.enfileirar(item("a1"));
    const { transporte } = transporteFalso();

    await enviarItem(item("a1"), transporte, ctx.fila);

    expect(await ctx.fila.listar()).toHaveLength(0);
  });
});

describe("a foto não se perde quando algo falha", () => {
  it.each(["presign", "bytes", "confirm"] as const)("falha em %s mantém o item na fila", async (onde) => {
    await ctx.fila.enfileirar(item("a1"));
    const { transporte } = transporteFalso(onde);

    const r = await enviarItem(item("a1"), transporte, ctx.fila);

    expect(r.estado).toBe("retentar");
    expect(await ctx.fila.listar()).toHaveLength(1);
    expect(ctx.itens.get("a1")?.tentativas).toBe(1);
  });

  it("falha depois do PUT não remove — o confirm é idempotente para isso", async () => {
    await ctx.fila.enfileirar(item("a1"));
    const { transporte } = transporteFalso("confirm");

    await enviarItem(item("a1"), transporte, ctx.fila);

    // Remover antes do confirm perderia a foto; o confirm tolera a segunda
    // chamada justamente para esta remoção poder não acontecer.
    expect(await ctx.fila.listar()).toHaveLength(1);
  });

  it("nunca lança — o erro é valor, para o laço continuar", async () => {
    const { transporte } = transporteFalso("bytes");

    await expect(enviarItem(item("a1"), transporte, ctx.fila)).resolves.toMatchObject({
      estado: "retentar",
    });
  });

  it("a espera cresce com a tentativa", async () => {
    const { transporte } = transporteFalso("bytes");

    const primeira = await enviarItem(item("a1", 0), transporte, ctx.fila);
    const quarta = await enviarItem(item("a1", 3), transporte, ctx.fila);

    expect(primeira).toMatchObject({ esperaSegundos: 2 });
    expect(quarta).toMatchObject({ esperaSegundos: 16 });
  });
});

describe("erro definitivo não vira retry", () => {
  it("sessão recusada não queima as seis tentativas", async () => {
    await ctx.fila.enfileirar(item("a1"));
    const transporte: Transporte = {
      async presign() {
        throw Object.assign(new Error("presign 401"), { definitivo: true });
      },
      async enviarBytes() {},
      async confirmar() {},
    };

    const r = await enviarItem(item("a1"), transporte, ctx.fila);

    // Insistir contra uma parede atrasa as fotos seguintes e esconde do
    // convidado que aquela precisa da atenção dele.
    expect(r.estado).toBe("desistiu");
    expect(ctx.itens.get("a1")?.tentativas).toBe(0);
    expect(await ctx.fila.listar()).toHaveLength(1);
  });

  it("erro comum continua sendo retry", async () => {
    await ctx.fila.enfileirar(item("a1"));
    const { transporte } = transporteFalso("bytes");

    expect((await enviarItem(item("a1"), transporte, ctx.fila)).estado).toBe("retentar");
  });
});

describe("desistir não é apagar", () => {
  it("item no teto de tentativas vira falha visível, e continua na fila", async () => {
    await ctx.fila.enfileirar(item("a1", MAX_TENTATIVAS));
    const { transporte, chamadas } = transporteFalso();

    const r = await enviarItem(item("a1", MAX_TENTATIVAS), transporte, ctx.fila);

    expect(r.estado).toBe("desistiu");
    // Apagar em silêncio é a foto sumindo sem explicação — o pior modo de
    // falha deste produto.
    expect(await ctx.fila.listar()).toHaveLength(1);
    expect(chamadas).toEqual([]);
  });
});

describe("drenagem", () => {
  it("envia em série, na ordem da fila", async () => {
    ctx = filaEmMemoria([item("a1"), item("b2"), item("c3")]);
    const { transporte, chamadas } = transporteFalso();

    const resumo = await drenar(ctx.fila, transporte);

    expect(resumo.enviados).toBe(3);
    expect(chamadas.filter((c) => c.startsWith("presign"))).toEqual([
      "presign:a1",
      "presign:b2",
      "presign:c3",
    ]);
  });

  it("um item que falha não derruba os outros", async () => {
    ctx = filaEmMemoria([item("a1"), item("b2")]);
    let chamou = 0;
    const transporte: Transporte = {
      async presign(i) {
        chamou += 1;
        if (i.id === "a1") throw new Error("essa falhou");
        return presign(i.id);
      },
      async enviarBytes() {},
      async confirmar() {},
    };

    const resumo = await drenar(ctx.fila, transporte);

    expect(chamou).toBe(2);
    expect(resumo).toMatchObject({ enviados: 1, retentar: 1 });
  });

  it("para de tentar quando o sinal cai no meio", async () => {
    ctx = filaEmMemoria([item("a1"), item("b2"), item("c3")]);
    const { transporte, chamadas } = transporteFalso();
    let online = true;

    const resumo = await drenar(ctx.fila, transporte, {
      online: () => {
        const agora = online;
        online = false;
        return agora;
      },
    });

    // Insistir offline só queima tentativas de itens que ainda não falharam.
    expect(resumo.enviados).toBe(1);
    expect(chamadas.filter((c) => c.startsWith("presign"))).toEqual(["presign:a1"]);
  });

  it("offline desde o início não consome tentativa nenhuma", async () => {
    ctx = filaEmMemoria([item("a1")]);
    const { transporte, chamadas } = transporteFalso();

    const resumo = await drenar(ctx.fila, transporte, { online: () => false });

    expect(resumo.enviados).toBe(0);
    expect(chamadas).toEqual([]);
    expect(ctx.itens.get("a1")?.tentativas).toBe(0);
  });

  it("respeita o máximo por rodada", async () => {
    ctx = filaEmMemoria([item("a1"), item("b2"), item("c3")]);
    const { transporte } = transporteFalso();

    const resumo = await drenar(ctx.fila, transporte, { online: () => true, maximo: 2 });

    expect(resumo.enviados).toBe(2);
    expect(await ctx.fila.listar()).toHaveLength(1);
  });
});
