import { describe, expect, it } from "vitest";
import { contraste, CONTRASTE_DE_TEXTO, lerHex } from "./cor";
import { MARCA_ALBORA } from "./marca";
import { resolverEscala, resolverTokens } from "./resolvedor";
import { paraVariaveis } from "./saidas";

const cor = (hex: string) => lerHex(hex)!;
const razao = (a: string, b: string) => contraste(cor(a), cor(b));

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
    expect(r.cores.noite).toBe(MARCA_ALBORA.cores.noite);
  });
});

describe("o que o DESIGN.md afirma sobre contraste é verdade", () => {
  it("âmbar reprova para texto sobre papel", () => {
    // O DESIGN.md afirma que âmbar sobre papel não serve para texto. Este
    // teste existe para que a afirmação e a paleta não divirjam em silêncio —
    // e ele já pegou uma troca de base: com o âmbar do `brand/` a razão mudou
    // de 2,47 para 2,74, e continua reprovando.
    const r = razao(MARCA_ALBORA.cores.acento, MARCA_ALBORA.cores.papel);

    expect(r).toBeLessThan(CONTRASTE_DE_TEXTO);
  });

  it("âmbar é o acento pleno sobre noite, texto inclusive", () => {
    expect(razao(MARCA_ALBORA.cores.acento, MARCA_ALBORA.cores.noite)).toBeGreaterThan(
      CONTRASTE_DE_TEXTO,
    );
  });

  it("as duas escalas entregam texto legível sobre o próprio chão", () => {
    for (const fundo of ["escuro", "claro"] as const) {
        const e = resolverEscala({ ...MARCA_ALBORA, fundo });

      expect(razao(e.ink, e.bg), `ink/${fundo}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
      expect(razao(e.ink2, e.bg), `ink2/${fundo}`).toBeGreaterThan(3);
      expect(razao(e.acentoTexto, e.bg), `acento/${fundo}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
      expect(razao(e.critico, e.bg), `critico/${fundo}`).toBeGreaterThan(3);
    }
  });
});

describe("trocar o chão re-deriva o acento", () => {
  it("o casal escolhe claro e o acento de texto muda sozinho", () => {
    const escuro = resolverEscala(MARCA_ALBORA);
    const claro = resolverEscala({ ...MARCA_ALBORA, fundo: "claro" });

    expect(escuro.acentoTexto).toBe(MARCA_ALBORA.cores.acento);
    expect(claro.acentoTexto).not.toBe(MARCA_ALBORA.cores.acento);
  });

  it("acento próprio do casal também é re-derivado, não aceito cru", () => {
    // O amarelo é o caso que mais aparece e o que mais reprova: some sobre
    // papel e ninguém percebe até a festa.
    const claro = resolverEscala({
      ...MARCA_ALBORA,
      fundo: "claro",
      cores: { ...MARCA_ALBORA.cores, acento: "#F2C744" },
    });

    expect(razao(claro.acentoTexto, claro.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    // O preenchimento continua sendo a cor que o casal escolheu: é só o texto
    // que precisa de luminância de leitura.
    expect(claro.acento).toBe("#F2C744");
  });

  it("a rampa de neutro acompanha a base, não fica fixa", () => {
    // O defeito que este teste impede: escala calibrada para um preto antigo
    // continua parecendo certa valor a valor, e só brigada com o chão novo.
    const nossa = resolverEscala(MARCA_ALBORA);
    const outroChao = resolverEscala({
      ...MARCA_ALBORA,
      cores: { ...MARCA_ALBORA.cores, noite: "#001018" },
    });

    expect(outroChao.bg).toBe("#001018");
    expect(outroChao.superficie).not.toBe(nossa.superficie);
    expect(razao(outroChao.ink, outroChao.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
  });

  it("acento que já é legível passa intacto", () => {
    const claro = resolverEscala({
      ...MARCA_ALBORA,
      fundo: "claro",
      cores: { ...MARCA_ALBORA.cores, acento: "#1B4D3E" },
    });

    expect(claro.acentoTexto).toBe("#1B4D3E");
  });

  it("hex malformado não apaga a identidade inteira", () => {
    const claro = resolverEscala({
      ...MARCA_ALBORA,
      fundo: "claro",
      cores: { ...MARCA_ALBORA.cores, acento: "o azul da festa" },
    });

    expect(claro.acentoTexto).toBe("o azul da festa");
  });
});

describe("a saída entrega a escala pronta", () => {
  it("o componente não escolhe nem chão nem neutro", () => {
    const v = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA }));

    expect(v["--bg"]).toBe(MARCA_ALBORA.cores.noite);
    expect(v["--ink-2"]).toBeDefined();
    expect(v["--linha"]).toBeDefined();
    expect(v["--superficie"]).toBeDefined();
  });

  it("fundo claro troca o conjunto, não uma variável", () => {
    const v = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA, evento: { fundo: "claro" } }));

    expect(v["--bg"]).not.toBe(MARCA_ALBORA.cores.noite);
    expect(razao(v["--ink"]!, v["--bg"]!)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    expect(razao(v["--acento-texto"]!, v["--bg"]!)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
  });
});
