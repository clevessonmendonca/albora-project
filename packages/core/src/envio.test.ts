import { beforeEach, describe, expect, it } from "vitest";
import { drain, sendItem, type Transport } from "./envio";
import { MAX_ATTEMPTS, type Queue, type QueueItem } from "./fila";
import type { RespostaPresign } from "./upload";

function memoryQueue(initial: QueueItem[] = []) {
  const items = new Map(initial.map((i) => [i.id, { ...i }]));

  const queue: Queue = {
    async enqueue(i) {
      items.set(i.id, { ...i });
    },
    async list() {
      return [...items.values()].sort((a, b) => a.criadoEm - b.criadoEm);
    },
    async remove(id) {
      items.delete(id);
    },
    async markAttempt(id) {
      const i = items.get(id);
      if (i) i.tentativas += 1;
    },
    async annotate(id, details) {
      const i = items.get(id);
      if (!i) return false;
      items.set(id, { ...i, ...details });
      return true;
    },
  };

  return { queue, items };
}

const item = (id: string, tentativas = 0): QueueItem => ({
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

function fakeTransport(failAt: Falha = null) {
  const chamadas: string[] = [];

  const transport: Transport = {
    async presign(i) {
      chamadas.push(`presign:${i.id}`);
      if (failAt === "presign") throw new Error("presign 503");
      return presign(i.id);
    },
    async sendBytes(url, i) {
      chamadas.push(`bytes:${i.id}`);
      if (failAt === "bytes") throw new Error("rede caiu");
      expect(url).toContain("assinado");
    },
    async confirm(i) {
      chamadas.push(`confirm:${i.id}`);
      if (failAt === "confirm") throw new Error("confirm 500");
    },
  };

  return { transport, chamadas };
}

let ctx: ReturnType<typeof memoryQueue>;
beforeEach(() => {
  ctx = memoryQueue();
});

describe("caminho feliz", () => {
  it("presign, bytes e confirm — nesta ordem", async () => {
    await ctx.queue.enqueue(item("a1"));
    const { transport, chamadas } = fakeTransport();

    const r = await sendItem(item("a1"), transport, ctx.queue);

    expect(r.estado).toBe("enviado");
    // Confirm antes dos bytes criaria linha apontando para objeto que não existe — foto na galeria que não abre.
    expect(chamadas).toEqual(["presign:a1", "bytes:a1", "confirm:a1"]);
  });

  it("vídeo com poster sobe thumb depois do full", async () => {
    const video: QueueItem = {
      ...item("v1"),
      mime: "video/mp4",
      thumb: { tipo: "blob", blob: new Blob(["frame"], { type: "image/jpeg" }) },
    };
    await ctx.queue.enqueue(video);
    const chamadas: string[] = [];
    const transport: Transport = {
      async presign(i) {
        chamadas.push(`presign:${i.id}`);
        return presign(i.id);
      },
      async sendBytes(url, i) {
        chamadas.push(`bytes:${i.id}`);
        expect(url).toContain("full");
      },
      async sendPoster(url) {
        chamadas.push("poster");
        expect(url).toContain("thumb");
      },
      async confirm(i) {
        chamadas.push(`confirm:${i.id}`);
      },
    };

    const r = await sendItem(video, transport, ctx.queue);

    expect(r.estado).toBe("enviado");
    expect(chamadas).toEqual(["presign:v1", "bytes:v1", "poster", "confirm:v1"]);
  });

  it("foto com thumb sobe miniatura depois do full", async () => {
    const foto: QueueItem = {
      ...item("f1"),
      thumb: { tipo: "blob", blob: new Blob(["mini"], { type: "image/jpeg" }) },
    };
    await ctx.queue.enqueue(foto);
    const chamadas: string[] = [];
    const transport: Transport = {
      async presign(i) {
        chamadas.push(`presign:${i.id}`);
        return presign(i.id);
      },
      async sendBytes(url, i) {
        chamadas.push(`bytes:${i.id}`);
        expect(url).toContain("full");
      },
      async sendPoster(url) {
        chamadas.push("thumb");
        expect(url).toContain("thumb");
      },
      async confirm(i) {
        chamadas.push(`confirm:${i.id}`);
      },
    };

    const r = await sendItem(foto, transport, ctx.queue);

    expect(r.estado).toBe("enviado");
    expect(chamadas).toEqual(["presign:f1", "bytes:f1", "thumb", "confirm:f1"]);
  });

  it("só remove da fila depois do confirm aceito", async () => {
    await ctx.queue.enqueue(item("a1"));
    const { transport } = fakeTransport();

    await sendItem(item("a1"), transport, ctx.queue);

    expect(await ctx.queue.list()).toHaveLength(0);
  });
});

describe("a foto não se perde quando algo falha", () => {
  it.each(["presign", "bytes", "confirm"] as const)("falha em %s mantém o item na fila", async (onde) => {
    await ctx.queue.enqueue(item("a1"));
    const { transport } = fakeTransport(onde);

    const r = await sendItem(item("a1"), transport, ctx.queue);

    expect(r.estado).toBe("retentar");
    expect(await ctx.queue.list()).toHaveLength(1);
    expect(ctx.items.get("a1")?.tentativas).toBe(1);
  });

  it("falha depois do PUT não remove — o confirm é idempotente para isso", async () => {
    await ctx.queue.enqueue(item("a1"));
    const { transport } = fakeTransport("confirm");

    await sendItem(item("a1"), transport, ctx.queue);

    // Remover antes do confirm perderia a foto; o confirm tolera a segunda chamada justamente para esta remoção poder não acontecer.
    expect(await ctx.queue.list()).toHaveLength(1);
  });

  it("nunca lança — o erro é valor, para o laço continuar", async () => {
    const { transport } = fakeTransport("bytes");

    await expect(sendItem(item("a1"), transport, ctx.queue)).resolves.toMatchObject({
      estado: "retentar",
    });
  });

  it("a espera cresce com a tentativa", async () => {
    const { transport } = fakeTransport("bytes");

    const primeira = await sendItem(item("a1", 0), transport, ctx.queue);
    const quarta = await sendItem(item("a1", 3), transport, ctx.queue);

    expect(primeira).toMatchObject({ esperaSegundos: 2 });
    expect(quarta).toMatchObject({ esperaSegundos: 16 });
  });
});

describe("erro definitivo não vira retry", () => {
  it("sessão recusada não queima as seis tentativas", async () => {
    await ctx.queue.enqueue(item("a1"));
    const transport: Transport = {
      async presign() {
        throw Object.assign(new Error("presign 401"), { definitivo: true });
      },
      async sendBytes() {},
      async confirm() {},
    };

    const r = await sendItem(item("a1"), transport, ctx.queue);

    // Insistir contra uma parede atrasa as fotos seguintes e esconde do convidado que aquela precisa da atenção dele.
    expect(r.estado).toBe("desistiu");
    expect(ctx.items.get("a1")?.tentativas).toBe(0);
    expect(await ctx.queue.list()).toHaveLength(1);
  });

  it("erro comum continua sendo retry", async () => {
    await ctx.queue.enqueue(item("a1"));
    const { transport } = fakeTransport("bytes");

    expect((await sendItem(item("a1"), transport, ctx.queue)).estado).toBe("retentar");
  });
});

describe("desistir não é apagar", () => {
  it("item no teto de tentativas vira falha visível, e continua na fila", async () => {
    await ctx.queue.enqueue(item("a1", MAX_ATTEMPTS));
    const { transport, chamadas } = fakeTransport();

    const r = await sendItem(item("a1", MAX_ATTEMPTS), transport, ctx.queue);

    expect(r.estado).toBe("desistiu");
    // Apagar em silêncio é a foto sumindo sem explicação — o pior modo de falha deste produto.
    expect(await ctx.queue.list()).toHaveLength(1);
    expect(chamadas).toEqual([]);
  });
});

describe("drenagem", () => {
  it("envia em série, na ordem da fila", async () => {
    ctx = memoryQueue([item("a1"), item("b2"), item("c3")]);
    const { transport, chamadas } = fakeTransport();

    const resumo = await drain(ctx.queue, transport);

    expect(resumo.enviados).toBe(3);
    expect(chamadas.filter((c) => c.startsWith("presign"))).toEqual([
      "presign:a1",
      "presign:b2",
      "presign:c3",
    ]);
  });

  it("um item que falha não derruba os outros", async () => {
    ctx = memoryQueue([item("a1"), item("b2")]);
    let chamou = 0;
    const transport: Transport = {
      async presign(i) {
        chamou += 1;
        if (i.id === "a1") throw new Error("essa falhou");
        return presign(i.id);
      },
      async sendBytes() {},
      async confirm() {},
    };

    const resumo = await drain(ctx.queue, transport);

    expect(chamou).toBe(2);
    expect(resumo).toMatchObject({ enviados: 1, retentar: 1 });
  });

  it("para de tentar quando o sinal cai no meio", async () => {
    ctx = memoryQueue([item("a1"), item("b2"), item("c3")]);
    const { transport, chamadas } = fakeTransport();
    let online = true;

    const resumo = await drain(ctx.queue, transport, {
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
    ctx = memoryQueue([item("a1")]);
    const { transport, chamadas } = fakeTransport();

    const resumo = await drain(ctx.queue, transport, { online: () => false });

    expect(resumo.enviados).toBe(0);
    expect(chamadas).toEqual([]);
    expect(ctx.items.get("a1")?.tentativas).toBe(0);
  });

  it("respeita o máximo por rodada", async () => {
    ctx = memoryQueue([item("a1"), item("b2"), item("c3")]);
    const { transport } = fakeTransport();

    const resumo = await drain(ctx.queue, transport, { online: () => true, limit: 2 });

    expect(resumo.enviados).toBe(2);
    expect(await ctx.queue.list()).toHaveLength(1);
  });
});
