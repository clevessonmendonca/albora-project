import { describe, expect, it } from "vitest";
import { confirmUploadSchema } from "./upload-schemas";

/**
 * O corpo que `transport.confirm` monta para a foto sem legenda, sem lugar e
 * sem missão — o caminho padrão do convidado ("Ou fotografe o que quiser").
 * Os `?? null` são do cliente de produção, não deste teste.
 */
const CORPO_DO_CLIENTE = {
  uploadId: "00000000-0000-4000-8000-000000000001",
  chave: "events/00000000-0000-4000-8000-0000000000ff/2026/08/abc/full",
  mime: "image/jpeg",
  desafioId: null,
  promptKey: null,
  legenda: null,
  lugar: null,
};

describe("confirmUploadSchema", () => {
  it("aceita o corpo que o cliente realmente envia sem legenda, lugar ou missão", () => {
    const r = confirmUploadSchema.safeParse(CORPO_DO_CLIENTE);
    expect(r.success ? null : r.error.issues[0]).toBe(null);
  });

  it("continua recusando tipo errado nos opcionais", () => {
    expect(
      confirmUploadSchema.safeParse({ ...CORPO_DO_CLIENTE, legenda: 42 }).success,
    ).toBe(false);
    expect(
      confirmUploadSchema.safeParse({ ...CORPO_DO_CLIENTE, desafioId: "nao-e-uuid" })
        .success,
    ).toBe(false);
  });

  it("continua exigindo os obrigatórios", () => {
    const { mime: _mime, ...semMime } = CORPO_DO_CLIENTE;
    expect(confirmUploadSchema.safeParse(semMime).success).toBe(false);
  });
});
