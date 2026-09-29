import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";
const OUTRA_CONTA = "33333333-3333-3333-3333-333333333333";
const POST_ID = "44444444-4444-4444-4444-444444444444";

const { requireConfig, requireHostSession } = vi.hoisted(() => ({
  requireConfig: vi.fn(() => null),
  requireHostSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireConfig, requireHostSession };
});

const {
  comConta,
  criarPostDaComunidade,
  responderPost,
  lerPostDaComunidade,
  apagarPostDaComunidade,
  apagarResposta,
} = vi.hoisted(() => ({
  comConta: vi.fn(),
  criarPostDaComunidade: vi.fn(),
  responderPost: vi.fn(),
  lerPostDaComunidade: vi.fn(),
  apagarPostDaComunidade: vi.fn(),
  apagarResposta: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  comConta,
  criarPostDaComunidade,
  responderPost,
  lerPostDaComunidade,
  apagarPostDaComunidade,
  apagarResposta,
  ehTopicoDaComunidade: (v: unknown) =>
    typeof v === "string" && ["duvida", "ideia", "experiencia", "indicacao"].includes(v),
}));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { POST, DELETE, RESPONDER } = await import("./admin-comunidade");

function pedido(corpo: unknown) {
  return new Request("https://exemplo.test/api/admin/comunidade", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

const VALIDO = { topico: "duvida", titulo: "Quantas missões?", corpo: "Entre três e seis." };

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({ host: { accountId: ACCOUNT_ID, email: "a@b.test" } });
  consume.mockReturnValue({ allowed: true, resetInSeconds: 0 });
  comConta.mockImplementation(async (_pool: unknown, _conta: string, fn: (c: unknown) => unknown) =>
    fn({}),
  );
  criarPostDaComunidade.mockResolvedValue(POST_ID);
  responderPost.mockResolvedValue("resposta-1");
  lerPostDaComunidade.mockResolvedValue({ id: POST_ID });
  apagarPostDaComunidade.mockResolvedValue(true);
  apagarResposta.mockResolvedValue(true);
});

describe("publicar na comunidade", () => {
  it("🔴 a conta vem da sessão, nunca do corpo da requisição", async () => {
    const resposta = await POST(pedido({ ...VALIDO, contaId: OUTRA_CONTA, accountId: OUTRA_CONTA }));

    expect(resposta.status).toBe(201);
    expect(comConta).toHaveBeenCalledWith(expect.anything(), ACCOUNT_ID, expect.any(Function));
    expect(criarPostDaComunidade).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contaId: ACCOUNT_ID }),
    );
  });

  it("sem sessão de host, não publica", async () => {
    requireHostSession.mockResolvedValue(new Response(null, { status: 401 }));

    const resposta = await POST(pedido(VALIDO));

    expect(resposta.status).toBe(401);
    expect(criarPostDaComunidade).not.toHaveBeenCalled();
  });

  it("assunto fora da lista é recusado antes do banco", async () => {
    const resposta = await POST(pedido({ ...VALIDO, topico: "qualquer-coisa" }));

    expect(resposta.status).toBe(422);
    expect(criarPostDaComunidade).not.toHaveBeenCalled();
  });

  it("título e corpo só de espaço são recusados", async () => {
    for (const corpo of [{ ...VALIDO, titulo: "   " }, { ...VALIDO, corpo: "\n\t " }]) {
      expect((await POST(pedido(corpo))).status).toBe(422);
    }
    expect(criarPostDaComunidade).not.toHaveBeenCalled();
  });

  it("título longo demais não chega ao CHECK do banco", async () => {
    const resposta = await POST(pedido({ ...VALIDO, titulo: "x".repeat(161) }));

    expect(resposta.status).toBe(422);
    expect(criarPostDaComunidade).not.toHaveBeenCalled();
  });

  it("o texto é gravado aparado", async () => {
    await POST(pedido({ ...VALIDO, titulo: "  Com folga  ", corpo: "  e aqui também  " }));

    expect(criarPostDaComunidade).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ titulo: "Com folga", corpo: "e aqui também" }),
    );
  });

  it("estourar o limite devolve 429 e não escreve", async () => {
    consume.mockReturnValue({ allowed: false, resetInSeconds: 42 });

    const resposta = await POST(pedido(VALIDO));

    expect(resposta.status).toBe(429);
    expect(criarPostDaComunidade).not.toHaveBeenCalled();
  });
});

describe("responder", () => {
  const ctx = { params: Promise.resolve({ postId: POST_ID }) };

  it("responder conversa que não existe dá 404, não 500", async () => {
    lerPostDaComunidade.mockResolvedValue(null);

    const resposta = await RESPONDER(pedido({ corpo: "oi" }), {
      params: Promise.resolve({ postId: POST_ID }),
    });

    expect(resposta.status).toBe(404);
    expect(responderPost).not.toHaveBeenCalled();
  });

  it("id que não é UUID é recusado antes do banco", async () => {
    const resposta = await RESPONDER(pedido({ corpo: "oi" }), {
      params: Promise.resolve({ postId: "../../etc/passwd" }),
    });

    expect(resposta.status).toBe(422);
    expect(comConta).not.toHaveBeenCalled();
  });

  it("a resposta também sai na conta da sessão", async () => {
    await RESPONDER(pedido({ corpo: "Deixei quatro." }), ctx);

    expect(responderPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contaId: ACCOUNT_ID, postId: POST_ID }),
    );
  });
});

describe("apagar", () => {
  it("apagar linha alheia devolve 404, sem dizer que ela existe", async () => {
    apagarPostDaComunidade.mockResolvedValue(false);

    const resposta = await DELETE(new Request("https://exemplo.test", { method: "DELETE" }), {
      params: Promise.resolve({ postId: POST_ID }),
    });

    expect(resposta.status).toBe(404);
  });

  it("🔴 o DELETE filtra pela conta da sessão, além da política", async () => {
    await DELETE(new Request("https://exemplo.test", { method: "DELETE" }), {
      params: Promise.resolve({ postId: POST_ID }),
    });

    expect(apagarPostDaComunidade).toHaveBeenCalledWith(expect.anything(), ACCOUNT_ID, POST_ID);
  });
});
