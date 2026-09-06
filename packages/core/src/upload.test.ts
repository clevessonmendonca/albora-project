import { describe, expect, it } from "vitest";
import { presignExpirou, VALIDADE_PRESIGN_SEGUNDOS } from "./upload";
import type { RespostaPresign } from "./upload";

const resposta = (expiraEm: number): RespostaPresign => ({
  uploadId: "11111111-2222-3333-4444-555555555555",
  chave: "events/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/2026/08/uuid/full",
  full: "https://storage.example/full",
  thumb: "https://storage.example/thumb",
  expiraEm,
});

describe("presignExpirou decide se a URL assinada de upload ainda vale", () => {
  it("não expirou quando `agora` é anterior a `expiraEm`", () => {
    expect(presignExpirou(resposta(1_000), 999)).toBe(false);
  });

  it("expirou quando `agora` já passou de `expiraEm`", () => {
    expect(presignExpirou(resposta(1_000), 1_001)).toBe(true);
  });

  it("no limite exato (agora === expiraEm) já considera expirado", () => {
    expect(presignExpirou(resposta(1_000), 1_000)).toBe(true);
  });

  it("VALIDADE_PRESIGN_SEGUNDOS é 600 (10 min)", () => {
    expect(VALIDADE_PRESIGN_SEGUNDOS).toBe(600);
  });
});
