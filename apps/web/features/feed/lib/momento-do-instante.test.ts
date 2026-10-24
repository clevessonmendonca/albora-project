import { describe, expect, it } from "vitest";
import { momentoDoInstante, type MomentoDoFeed } from "./momento-do-instante";

const momentos: MomentoDoFeed[] = [
  { id: "a", titulo: "A cerimônia", comecaEm: "2026-10-12T19:00:00.000Z" },
  { id: "b", titulo: "A recepção", comecaEm: "2026-10-12T21:00:00.000Z" },
  { id: "c", titulo: "A festa", comecaEm: "2026-10-12T23:00:00.000Z" },
];

describe("momentoDoInstante", () => {
  it("devolve o momento em curso no instante da foto", () => {
    expect(momentoDoInstante(momentos, "2026-10-12T21:30:00.000Z")).toBe("A recepção");
    expect(momentoDoInstante(momentos, "2026-10-13T03:00:00.000Z")).toBe("A festa");
  });

  it("não mostra nada antes do primeiro momento", () => {
    expect(momentoDoInstante(momentos, "2026-10-12T18:00:00.000Z")).toBeNull();
  });

  it("não mostra nada sem momentos, sem horário ou com horário ilegível", () => {
    expect(momentoDoInstante([], "2026-10-12T21:30:00.000Z")).toBeNull();
    expect(momentoDoInstante(momentos, undefined)).toBeNull();
    expect(momentoDoInstante(momentos, "ontem")).toBeNull();
  });
});
