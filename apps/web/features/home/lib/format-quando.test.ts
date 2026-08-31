import { describe, expect, it } from "vitest";
import { formatQuando } from "./format-quando";

describe("formatQuando", () => {
  it("formata hora e minuto", () => {
    expect(formatQuando("2026-08-17T23:05:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("data inválida devolve vazio, nunca 'Invalid Date'", () => {
    expect(formatQuando("não-é-uma-data")).toBe("");
  });

  it("string vazia devolve vazio", () => {
    expect(formatQuando("")).toBe("");
  });
});
