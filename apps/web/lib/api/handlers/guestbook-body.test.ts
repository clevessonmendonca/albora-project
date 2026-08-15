import { describe, expect, it } from "vitest";
import { clientSentStorageKey } from "./guestbook-body";

describe("a chave de storage nao vem do cliente", () => {
  it("rascunho so com texto passa", () => {
    expect(clientSentStorageKey({ texto: "oi", publicaEm: null })).toBe(false);
  });

  it("chave no topo e recusada", () => {
    expect(clientSentStorageKey({ texto: "oi", chave: "events/x/recado/y" })).toBe(true);
    expect(clientSentStorageKey({ texto: "oi", storageKey: "events/x/recado/y" })).toBe(true);
    expect(clientSentStorageKey({ texto: "oi", storage_key: "events/x/recado/y" })).toBe(true);
    expect(clientSentStorageKey({ texto: "oi", audioKey: "events/x/recado/y" })).toBe(true);
  });

  it("chave dentro de audio e recusada", () => {
    expect(
      clientSentStorageKey({
        texto: "oi",
        audio: { duracaoSegundos: 20, chave: "events/x/recado/y" },
      }),
    ).toBe(true);
  });

  it("audio sem chave nao e esta recusa — a gravacao e outro corte", () => {
    expect(clientSentStorageKey({ texto: "oi", audio: { duracaoSegundos: 20 } })).toBe(false);
    expect(clientSentStorageKey({ texto: "oi", audio: null })).toBe(false);
  });
});
