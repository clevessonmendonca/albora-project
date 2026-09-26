import { describe, expect, it } from "vitest";
import { ALBORA_BRAND } from "./marca";
import { MODELOS_DE_IDENTIDADE } from "./modelos";
import { camadaDoEvento } from "./camada-do-evento";
import { resolveTokens } from "./resolver";
import { toVariables } from "./outputs";

/**
 * §2 lista quatro campos, e só quatro, que a identidade do casal substitui:
 * `cores.acento`, `cores.critico`, `fontes.titulo` e `fundo`.
 *
 * `papel` e `tinta` ficam de fora por um motivo que o §7 trata como
 * bloqueante: eles são a base de onde TODA a rampa de neutros é derivada por
 * opacidade. Deixá-los passar tinge o chão, o cartão, o filete e a sombra —
 * e um casamento de jardim vira um painel verde sage de ponta a ponta, que é
 * exatamente a cor que a categoria inteira usa e que a marca recusa.
 *
 * O §1 diz a mesma coisa pelo outro lado: "todo neutro tem viés para o âmbar".
 */

const vars = (camada: Record<string, unknown>) =>
  toVariables(
    resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" }, evento: camada as never }),
  ) as Record<string, string>;

describe("a identidade do casal tinge o acento, não o chão", () => {
  const jardim = MODELOS_DE_IDENTIDADE.find((m) => m.id === "jardim")!.camada as Record<
    string,
    unknown
  >;

  it("o preset do catálogo traz papel e tinta próprios", () => {
    // Se isto mudar, o teste abaixo deixa de provar o que se propõe a provar.
    const cores = jardim["cores"] as Record<string, string>;
    expect(cores["papel"]).toBeTruthy();
    expect(cores["tinta"]).toBeTruthy();
  });

  it("filtra as bases da rampa, mantendo o que o casal escolhe", () => {
    const filtrada = camadaDoEvento(jardim) as Record<string, unknown>;
    const cores = (filtrada["cores"] ?? {}) as Record<string, string>;

    expect(cores["acento"]).toBe((jardim["cores"] as Record<string, string>)["acento"]);
    expect(cores["papel"]).toBeUndefined();
    expect(cores["tinta"]).toBeUndefined();
    expect(filtrada["fontes"]).toEqual(jardim["fontes"]);
    // Raio e tracking mudam a forma, não o chão — continuam passando.
    expect(filtrada["escala"]).toEqual(jardim["escala"]);
    expect(filtrada["tracking"]).toEqual(jardim["tracking"]);
  });

  it("o chão do painel continua sendo o da marca, não o do evento", () => {
    const comFiltro = vars(camadaDoEvento(jardim) as Record<string, unknown>);
    const soMarca = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }),
    ) as Record<string, string>;

    expect(comFiltro["--bg"]).toBe(soMarca["--bg"]);
    expect(comFiltro["--superficie"]).toBe(soMarca["--superficie"]);
    expect(comFiltro["--ink"]).toBe(soMarca["--ink"]);
  });

  it("mas o acento do casal continua chegando", () => {
    const comFiltro = vars(camadaDoEvento(jardim) as Record<string, unknown>);
    expect(comFiltro["--acento"]).toBe((jardim["cores"] as Record<string, string>)["acento"]);
  });

  it("nenhum preset do catálogo tinge o chão depois do filtro", () => {
    const daMarca = toVariables(
      resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } }),
    ) as Record<string, string>;

    for (const modelo of MODELOS_DE_IDENTIDADE) {
      const v = vars(camadaDoEvento(modelo.camada as Record<string, unknown>) as Record<string, unknown>);
      expect(v["--bg"], `${modelo.nome} tingiu o chão`).toBe(daMarca["--bg"]);
      expect(v["--ink"], `${modelo.nome} tingiu a tinta`).toBe(daMarca["--ink"]);
    }
  });

  it("camada vazia continua vazia", () => {
    expect(camadaDoEvento({})).toEqual({});
    expect(camadaDoEvento(undefined)).toBeUndefined();
  });
});
