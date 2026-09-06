import { describe, expect, it } from "vitest";
import { contraste, CONTRASTE_DE_TEXTO, lerHex } from "./cor";
import { ALBORA_BRAND } from "./marca";
import { resolveScale, resolveTokens } from "./resolver";
import { toVariables } from "./outputs";

const cor = (hex: string) => lerHex(hex)!;
const razao = (a: string, b: string) => contraste(cor(a), cor(b));

describe("cadeia marca → pack → evento", () => {
  it("resolve para a marca quando não há nada por cima", () => {
    expect(resolveTokens({ marca: ALBORA_BRAND })).toEqual(ALBORA_BRAND);
  });

  it("o evento ganha do pack, que ganha da marca", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      pack: { cores: { acento: "#111111" }, fontes: { titulo: "Pack" } },
      evento: { cores: { acento: "#222222" } },
    });

    expect(r.cores.acento).toBe("#222222");
    expect(r.fontes.titulo).toBe("Pack");
    expect(r.cores.papel).toBe(ALBORA_BRAND.cores.papel);
  });

  it("sobrepõe campo a campo, não camada inteira", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      evento: { cores: { tinta: "#000000" } },
    });

    // Trocar a tinta não pode zerar as outras quatro cores.
    expect(r.cores.acento).toBe(ALBORA_BRAND.cores.acento);
    expect(r.cores.noite).toBe(ALBORA_BRAND.cores.noite);
  });
});

describe("cadeia marca → vendor → pack → evento (canal do fornecedor)", () => {
  it("o vendor entra entre a marca e o pack", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      vendor: { cores: { acento: "#333333" }, fontes: { titulo: "Fornecedor" } },
    });

    expect(r.cores.acento).toBe("#333333");
    expect(r.fontes.titulo).toBe("Fornecedor");
    // Sem pack/evento por cima, o resto continua vindo da marca.
    expect(r.cores.papel).toBe(ALBORA_BRAND.cores.papel);
  });

  it("o pack ganha do vendor, que ganha da marca", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      vendor: { cores: { acento: "#333333" } },
      pack: { cores: { acento: "#111111" } },
    });

    expect(r.cores.acento).toBe("#111111");
  });

  it("o evento ganha de todo mundo, inclusive do vendor", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      vendor: { cores: { acento: "#333333" } },
      pack: { cores: { acento: "#111111" } },
      evento: { cores: { acento: "#222222" } },
    });

    expect(r.cores.acento).toBe("#222222");
  });

  it("sem vendor, a cadeia se comporta exatamente como antes", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      pack: { cores: { acento: "#111111" } },
      evento: { cores: { acento: "#222222" } },
    });

    expect(r.cores.acento).toBe("#222222");
  });
});

describe("o que o DESIGN.md afirma sobre contraste é verdade", () => {
  it("âmbar reprova para texto sobre papel", () => {
    // O DESIGN.md afirma que âmbar sobre papel não serve para texto; este teste existe para que a afirmação e a paleta não divirjam em silêncio — já pegou uma troca de base, a razão mudou de 2,47 para 2,74 e continua reprovando.
    const r = razao(ALBORA_BRAND.cores.acento, ALBORA_BRAND.cores.papel);

    expect(r).toBeLessThan(CONTRASTE_DE_TEXTO);
  });

  it("âmbar é o acento pleno sobre noite, texto inclusive", () => {
    expect(razao(ALBORA_BRAND.cores.acento, ALBORA_BRAND.cores.noite)).toBeGreaterThan(
      CONTRASTE_DE_TEXTO,
    );
  });

  it("as duas escalas entregam texto legível sobre o próprio chão", () => {
    for (const background of ["dark", "light"] as const) {
        const e = resolveScale({ ...ALBORA_BRAND, background });

      expect(razao(e.ink, e.bg), `ink/${background}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
      expect(razao(e.ink2, e.bg), `ink2/${background}`).toBeGreaterThan(3);
      expect(razao(e.acentoTexto, e.bg), `acento/${background}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
      expect(razao(e.critico, e.bg), `critico/${background}`).toBeGreaterThan(3);
    }
  });

  it("texto secundário e terciário são legíveis sobre superfícies elevadas", () => {
    for (const background of ["dark", "light"] as const) {
      const e = resolveScale({ ...ALBORA_BRAND, background });

      expect(razao(e.ink, e.superficie), `ink/superficie/${background}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
      expect(razao(e.ink2, e.superficie), `ink2/superficie/${background}`).toBeGreaterThan(3);
      expect(razao(e.ink, e.superficieAlta), `ink/superficieAlta/${background}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
      expect(razao(e.acentoTexto, e.superficie), `acento/superficie/${background}`).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    }
  });

  it("ink3 é distinguível mas intencionalmente abaixo de AA", () => {
    for (const background of ["dark", "light"] as const) {
      const e = resolveScale({ ...ALBORA_BRAND, background });

      expect(razao(e.ink3, e.bg), `ink3/${background}`).toBeGreaterThan(1.5);
    }
  });

  it("o rótulo do botão de acento é legível sobre o preenchimento", () => {
    // O outro lado do teste acima: lá o acento é texto sobre o chão, aqui o acento é o chão — as duas escolhas óbvias reprovam (papel dá 2,7:1, branco não chega a 3:1) e ambas parecem certas numa captura de tela.
    for (const background of ["dark", "light"] as const) {
      const e = resolveScale({ ...ALBORA_BRAND, background });

      expect(razao(e.sobreAcento, e.acento), `sobre-acento/${background}`).toBeGreaterThan(
        CONTRASTE_DE_TEXTO,
      );
    }
  });

  it("acento escolhido pelo casal também recebe rótulo legível", () => {
    // A cor vem de quem paga e pode ser qualquer uma — âmbar claro derruba a escolha para o lado escuro; rótulo fixo faria o botão sumir.
    for (const acento of ["#FFE08A", "#2B1A0E", "#D9793C"]) {
      const e = resolveScale({
        ...ALBORA_BRAND,
        cores: { ...ALBORA_BRAND.cores, acento },
        background: "light",
      });

      expect(razao(e.sobreAcento, e.acento), acento).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    }
  });
});

describe("trocar o chão re-deriva o acento", () => {
  it("o casal escolhe claro e o acento de texto muda sozinho", () => {
    const escuro = resolveScale(ALBORA_BRAND);
    const claro = resolveScale({ ...ALBORA_BRAND, background: "light" });

    // Cada chão recebe o seu, e nenhum dos dois é o acento cru — a versão anterior afirmava que o escuro passava intacto, o que só era verdade enquanto o chão era o preto absoluto.
    expect(escuro.acentoTexto).not.toBe(claro.acentoTexto);
    expect(razao(escuro.acentoTexto, escuro.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    expect(razao(claro.acentoTexto, claro.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);

    // O preenchimento continua sendo a cor escolhida nos dois chãos.
    expect(escuro.acento).toBe(ALBORA_BRAND.cores.acento);
    expect(claro.acento).toBe(ALBORA_BRAND.cores.acento);
  });

  it("o chão escuro não é o extremo cru da marca", () => {
    // Um app inteiro no `noite` puro lê como buraco preto: some a profundidade entre página e card, e a cor que o casal escolheu não aparece em lugar nenhum — `claro()` sempre levantou a página do papel puro, a assimetria no escuro era acidente.
    const escuro = resolveScale(ALBORA_BRAND);

    expect(escuro.bg).not.toBe(ALBORA_BRAND.cores.noite);
    expect(razao(escuro.ink, escuro.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);

    // E a elevação continua subindo: página, superfície, superfície alta.
    expect(razao(escuro.superficie, escuro.bg)).toBeGreaterThan(1);
    expect(razao(escuro.superficieAlta, escuro.bg)).toBeGreaterThan(
      razao(escuro.superficie, escuro.bg),
    );
  });

  it("acento próprio do casal também é re-derivado, não aceito cru", () => {
    // O amarelo é o caso que mais aparece e o que mais reprova — some sobre papel e ninguém percebe até a festa.
    const claro = resolveScale({
      ...ALBORA_BRAND,
      background: "light",
      cores: { ...ALBORA_BRAND.cores, acento: "#F2C744" },
    });

    expect(razao(claro.acentoTexto, claro.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    // O preenchimento continua sendo a cor que o casal escolheu — é só o texto que precisa de luminância de leitura.
    expect(claro.acento).toBe("#F2C744");
  });

  it("a rampa de neutro acompanha a base, não fica fixa", () => {
    // O defeito que este teste impede: escala calibrada para um preto antigo continua parecendo certa valor a valor, e só briga com o chão novo.
    const nossa = resolveScale(ALBORA_BRAND);
    const outroChao = resolveScale({
      ...ALBORA_BRAND,
      cores: { ...ALBORA_BRAND.cores, noite: "#001018" },
    });

    expect(outroChao.bg).not.toBe(nossa.bg);
    expect(outroChao.superficie).not.toBe(nossa.superficie);
    expect(razao(outroChao.ink, outroChao.bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
  });

  it("acento que já é legível passa intacto", () => {
    const claro = resolveScale({
      ...ALBORA_BRAND,
      background: "light",
      cores: { ...ALBORA_BRAND.cores, acento: "#1B4D3E" },
    });

    expect(claro.acentoTexto).toBe("#1B4D3E");
  });

  it("hex malformado não apaga a identidade inteira", () => {
    const claro = resolveScale({
      ...ALBORA_BRAND,
      background: "light",
      cores: { ...ALBORA_BRAND.cores, acento: "o azul da festa" },
    });

    expect(claro.acentoTexto).toBe("o azul da festa");
  });
});

describe("a saída entrega a escala pronta", () => {
  it("o componente não escolhe nem chão nem neutro", () => {
    const v = toVariables(resolveTokens({ marca: ALBORA_BRAND }));

    // Derivado, não copiado da marca: o componente recebe o chão pronto e não tem como escolher o extremo por conta própria.
    expect(v["--bg"]).toBeDefined();
    expect(v["--bg"]).not.toBe(ALBORA_BRAND.cores.noite);
    expect(v["--ink-2"]).toBeDefined();
    expect(v["--linha"]).toBeDefined();
    expect(v["--superficie"]).toBeDefined();
  });

  it("fundo claro troca o conjunto, não uma variável", () => {
    const v = toVariables(resolveTokens({ marca: ALBORA_BRAND, evento: { background: "light" } }));

    expect(v["--bg"]).not.toBe(ALBORA_BRAND.cores.noite);
    expect(razao(v["--ink"]!, v["--bg"]!)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
    expect(razao(v["--acento-texto"]!, v["--bg"]!)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
  });
});

describe("JSON antigo de identityTokens ainda resolve", () => {
  it("aceita fundo/claro e fundo/escuro na camada do evento", () => {
    const claro = resolveTokens({ marca: ALBORA_BRAND, evento: { fundo: "claro" } });
    const escuro = resolveTokens({ marca: ALBORA_BRAND, evento: { fundo: "escuro" } });

    expect(claro.background).toBe("light");
    expect(escuro.background).toBe("dark");
    expect(razao(resolveScale(claro).ink, resolveScale(claro).bg)).toBeGreaterThan(CONTRASTE_DE_TEXTO);
  });

  it("aceita background em inglês na mesma posição", () => {
    const light = resolveTokens({ marca: ALBORA_BRAND, evento: { background: "light" } });
    expect(light.background).toBe("light");
  });

  it("background ganha de fundo na mesma camada", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      evento: { fundo: "claro", background: "dark" },
    });
    expect(r.background).toBe("dark");
  });

  it("fundo depois de background na mesma camada sobrescreve (spread da landing)", () => {
    const r = resolveTokens({
      marca: ALBORA_BRAND,
      evento: { ...{ background: "dark" as const }, fundo: "claro" },
    });
    expect(r.background).toBe("light");
  });
});
