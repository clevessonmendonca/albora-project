import { describe, expect, it } from "vitest";
import { chaveRecadoValida, derivarChaveRecado, prefixoDoEvento } from "./chaves";

const EVENTO = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OUTRO = "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee";
const UUID = "11111111-2222-3333-4444-555555555555";

describe("a chave do recado é derivada no servidor", () => {
  it("mora em events/{id}/recado/{uuid}", () => {
    expect(derivarChaveRecado(EVENTO, UUID)).toBe(`events/${EVENTO}/recado/${UUID}`);
  });

  it("aceita só a forma que derivarChaveRecado produz", () => {
    expect(chaveRecadoValida(EVENTO, derivarChaveRecado(EVENTO, UUID))).toBe(true);
  });

  it("recusa chave de outro evento e chave de foto de convidado", () => {
    expect(chaveRecadoValida(EVENTO, derivarChaveRecado(OUTRO, UUID))).toBe(false);
    expect(chaveRecadoValida(EVENTO, `${prefixoDoEvento(EVENTO)}2026/08/${UUID}/full`)).toBe(false);
    expect(chaveRecadoValida(EVENTO, `events/${EVENTO}/recado/nao-e-uuid`)).toBe(false);
    expect(chaveRecadoValida(EVENTO, `events/${EVENTO}/recado/${UUID}/extra`)).toBe(false);
  });
});
