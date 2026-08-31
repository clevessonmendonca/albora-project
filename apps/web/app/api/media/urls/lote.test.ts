import { describe, expect, it } from "vitest";
import { validateBatch, isRejected, KEY_CAP } from "./lote";

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UPLOAD_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const VALID_FULL = `events/${EVENT_ID}/2026/01/${UPLOAD_ID}/full`;
const VALID_THUMB = `events/${EVENT_ID}/2026/01/${UPLOAD_ID}/thumb`;

describe("validateBatch", () => {
  it("aceita lote vazio", () => {
    const result = validateBatch([], EVENT_ID);
    expect(isRejected(result)).toBe(false);
    if (!isRejected(result)) expect(result.chaves).toHaveLength(0);
  });

  it("aceita chave /full válida", () => {
    const result = validateBatch([VALID_FULL], EVENT_ID);
    expect(isRejected(result)).toBe(false);
    if (!isRejected(result)) expect(result.chaves).toContain(VALID_FULL);
  });

  it("aceita chave /thumb válida", () => {
    const result = validateBatch([VALID_THUMB], EVENT_ID);
    expect(isRejected(result)).toBe(false);
    if (!isRejected(result)) expect(result.chaves).toContain(VALID_THUMB);
  });

  it("deduplicação: chave repetida conta uma vez", () => {
    const result = validateBatch([VALID_FULL, VALID_FULL], EVENT_ID);
    expect(isRejected(result)).toBe(false);
    if (!isRejected(result)) expect(result.chaves).toHaveLength(1);
  });

  it("422 quando chaves não é array", () => {
    const result = validateBatch("nao-e-array", EVENT_ID);
    expect(isRejected(result)).toBe(true);
    if (isRejected(result)) {
      expect(result.status).toBe(422);
      expect(result.code).toBe("validation_error");
    }
  });

  it("422 quando elemento não é string", () => {
    const result = validateBatch([42], EVENT_ID);
    expect(isRejected(result)).toBe(true);
    if (isRejected(result)) expect(result.status).toBe(422);
  });

  it(`422 quando lote supera ${KEY_CAP}`, () => {
    const chaves = Array.from({ length: KEY_CAP + 1 }, (_, i) => {
      const uid = i.toString(16).padStart(8, "0") + "-0000-0000-0000-000000000000";
      return `events/${EVENT_ID}/2026/01/${uid}/full`;
    });
    const result = validateBatch(chaves, EVENT_ID);
    expect(isRejected(result)).toBe(true);
    if (isRejected(result)) {
      expect(result.status).toBe(422);
      expect(result.code).toBe("midia.lote_excedido");
    }
  });

  it("403 para chave de outro evento (mesmo oráculo que malformada)", () => {
    const outroEvento = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    const chaveAlheia = `events/${outroEvento}/2026/01/${UPLOAD_ID}/full`;
    const result = validateBatch([chaveAlheia], EVENT_ID);
    expect(isRejected(result)).toBe(true);
    if (isRejected(result)) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("midia.chave_invalida");
    }
  });

  it("403 para chave malformada (mesmo oráculo que evento alheio)", () => {
    const result = validateBatch(["nao/e/chave/valida"], EVENT_ID);
    expect(isRejected(result)).toBe(true);
    if (isRejected(result)) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("midia.chave_invalida");
    }
  });
});
