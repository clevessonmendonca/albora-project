import { describe, expect, it } from "vitest";
import { statusPedido } from "./event-status";

describe("status pedido no corpo do PATCH", () => {
  it("aceita publicar e encerrar", () => {
    expect(statusPedido("active")).toBe("active");
    expect(statusPedido("ended")).toBe("ended");
  });

  it("recusa rascunho: voltar para draft reabriria um evento já público", () => {
    expect(statusPedido("draft")).toBeNull();
  });

  it("recusa lixo", () => {
    expect(statusPedido("")).toBeNull();
    expect(statusPedido(3)).toBeNull();
    expect(statusPedido(null)).toBeNull();
    expect(statusPedido({ status: "active" })).toBeNull();
  });
});
