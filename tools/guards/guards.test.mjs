import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { verificar as isolamento } from "./isolamento.mjs";
import { verificar as tokens } from "./tokens.mjs";
import { verificar as dominio } from "./dominio.mjs";
import { verificar as packs } from "./packs.mjs";
import { verificar as sessao } from "./sessao.mjs";

/**
 * O auto-teste de cada guard.
 *
 * Guard sem auto-teste pode parar de verificar e continuar verde — e verde é
 * exatamente como ele parece quando funciona. Por isso cada um roda duas
 * vezes: contra uma fixture que viola de mentira, onde precisa reprovar, e
 * contra o código real, onde precisa passar.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raizReal = join(aqui, "..", "..");
const fixture = (nome) => join(aqui, "fixtures", nome);

const GUARDS = [
  ["isolamento", isolamento],
  ["tokens", tokens],
  ["dominio", dominio],
  ["packs", packs],
  ["sessao", sessao],
];

describe.each(GUARDS)("guard %s", (nome, verificar) => {
  it("reprova a fixture violadora", () => {
    const violacoes = verificar(fixture(nome));
    expect(violacoes.length).toBeGreaterThan(0);
  });

  it("aponta arquivo, linha e motivo em cada violação", () => {
    for (const v of verificar(fixture(nome))) {
      expect(v.arquivo).toBeTruthy();
      expect(v.linha).toBeGreaterThan(0);
      expect(v.motivo).toBeTruthy();
    }
  });

  it("passa contra o código real do repositório", () => {
    expect(verificar(raizReal)).toEqual([]);
  });
});

describe("cobertura das fixtures", () => {
  it("a fixture de tokens pega as três formas de burlar", () => {
    const motivos = tokens(fixture("tokens")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("hex"))).toBe(true);
    expect(motivos.some((m) => m.includes("arbitrária"))).toBe(true);
    expect(motivos.some((m) => m.includes("Tailwind"))).toBe(true);
  });

  it("a fixture de isolamento pega SET de sessão e lock de sessão", () => {
    const motivos = isolamento(fixture("isolamento")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("SET LOCAL"))).toBe(true);
    expect(motivos.some((m) => m.includes("xact"))).toBe(true);
  });

  it("a fixture de sessão pega token em log, token em querystring e PII", () => {
    const motivos = sessao(fixture("sessao")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("log"))).toBe(true);
    expect(motivos.some((m) => m.includes("querystring"))).toBe(true);
    expect(motivos.some((m) => m.includes("PII"))).toBe(true);
  });

  it("a fixture de packs pega import invertido e string de domínio", () => {
    const motivos = packs(fixture("packs")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("pack → core"))).toBe(true);
    expect(motivos.some((m) => m.includes("vocabulário"))).toBe(true);
  });
});
