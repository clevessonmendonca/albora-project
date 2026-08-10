import { describe, expect, it } from "vitest";
import { MARCA_ALBORA } from "./marca";
import { acentoLegivel, resolverTokens } from "./resolvedor";
import { paraVariaveis } from "./saidas";

describe("cadeia marca → pack → evento", () => {
  it("resolve para a marca quando não há nada por cima", () => {
    expect(resolverTokens({ marca: MARCA_ALBORA })).toEqual(MARCA_ALBORA);
  });

  it("o evento ganha do pack, que ganha da marca", () => {
    const r = resolverTokens({
      marca: MARCA_ALBORA,
      pack: { cores: { acento: "#111111" }, fontes: { titulo: "Pack" } },
      evento: { cores: { acento: "#222222" } },
    });

    expect(r.cores.acento).toBe("#222222");
    expect(r.fontes.titulo).toBe("Pack");
    expect(r.cores.papel).toBe(MARCA_ALBORA.cores.papel);
  });

  it("sobrepõe campo a campo, não camada inteira", () => {
    const r = resolverTokens({
      marca: MARCA_ALBORA,
      evento: { cores: { tinta: "#000000" } },
    });

    // Trocar a tinta não pode zerar as outras quatro cores.
    expect(r.cores.acento).toBe(MARCA_ALBORA.cores.acento);
    expect(r.cores.realce).toBe(MARCA_ALBORA.cores.realce);
  });
});

describe("acento legível", () => {
  it("re-deriva o acento quando o casal escolhe fundo claro", () => {
    const claro = resolverTokens({ marca: MARCA_ALBORA, evento: { fundo: "claro" } });

    expect(acentoLegivel(claro)).toBe(MARCA_ALBORA.cores.acentoSobreClaro);
    expect(acentoLegivel(claro)).not.toBe(MARCA_ALBORA.cores.acento);
  });

  it("a saída já entrega o acento certo, sem o componente escolher", () => {
    const claro = resolverTokens({ marca: MARCA_ALBORA, evento: { fundo: "claro" } });

    expect(paraVariaveis(claro)["--acento"]).toBe(MARCA_ALBORA.cores.acentoSobreClaro);
    expect(paraVariaveis(claro)["--fundo"]).toBe(MARCA_ALBORA.cores.papel);
    expect(paraVariaveis(claro)["--frente"]).toBe(MARCA_ALBORA.cores.tinta);
  });
});
