import { describe, expect, it } from "vitest";
import { processarFoto, type Bitmap, type Desenhista } from "./processar";
import { AJUSTES_NEUTROS, saoNeutros } from "./ajustes";
import { NEUTRO } from "./luts";
import { QUALITY } from "./redimensionar";

type Img = Bitmap & { rotulo: string };

/**
 * Canvas falso que **registra a ordem** das operações.
 *
 * Não prova que os pixels saem certos — isso só um olho num aparelho prova.
 * Prova o que de fato quebra nesta função: a sequência. Ler o EXIF depois de
 * reencodar, ou planejar o tamanho sobre as dimensões cruas, são bugs de
 * ordem, e ordem é verificável aqui.
 */
function desenhistaFalso(original: Bitmap) {
  const chamadas: string[] = [];

  const desenhista: Desenhista<Img, string> = {
    async decodificar(bytes, mime) {
      chamadas.push(`decodificar:${mime}:${bytes.length}b`);
      return { ...original, rotulo: "original" };
    },
    async desenhar(imagem, target, t) {
      chamadas.push(
        `desenhar:${imagem.rotulo}→${target.width}x${target.height}:girar${t.girar}${t.espelhar ? ":espelhar" : ""}`,
      );
      return { largura: target.width, altura: target.height, rotulo: `${target.width}x${target.height}` };
    },
    async codificar(imagem, mime, qualidade) {
      chamadas.push(`codificar:${imagem.rotulo}:${mime}:q${qualidade}`);
      return `${imagem.rotulo}@${qualidade}`;
    },
    async filtrar(imagem, filtro) {
      const m = filtro.manuais;
      const ajustes = m && !saoNeutros(m) ? `+ajustes(${m.luz},${m.calor},${m.contraste},${m.vinheta})` : "";

      chamadas.push(
        `filtrar:${imagem.rotulo}:${filtro.porPixel ? "pixel" : "css"}:i${filtro.intensidade}${ajustes}`,
      );
      return { ...imagem, rotulo: `${imagem.rotulo}+filtro${ajustes ? "+ajustes" : ""}` };
    },
    async compor(imagem, texto) {
      chamadas.push(`compor:${imagem.rotulo}:"${texto.conteudo}"@${texto.x},${texto.y}`);
      return { ...imagem, rotulo: `${imagem.rotulo}+texto` };
    },
  };

  return { desenhista, chamadas };
}

/** JPEG mínimo com orientação 6 — o caso do iPhone em paisagem. */
function jpegOrientacao6(): Uint8Array {
  const tiff = [
    0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0,
    1, 0,
    0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const corpo = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const tam = corpo.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (tam >> 8) & 0xff, tam & 0xff, ...corpo]);
}

const semExif = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00]);
const aparelhoComum = { memoryGb: 8, cores: 8 };

function jpegComDateTime(): Uint8Array {
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const str = Array.from("2026:08:09 01:00:00\0").map((c) => c.charCodeAt(0));
  const tiff = [
    0x49, 0x49, 0x2a, 0x00, ...u32(8),
    ...u16(1),
    ...u16(0x0132), ...u16(2), ...u32(20), ...u32(26),
    ...u32(0),
    ...str,
  ];
  const corpo = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const tam = corpo.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (tam >> 8) & 0xff, tam & 0xff, ...corpo]);
}

describe("a ordem das operações", () => {
  it("decodifica, endireita, codifica, e só então faz a miniatura", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    expect(chamadas).toEqual([
      "decodificar:image/jpeg:8b",
      "desenhar:original→2500x1875:girar0",
      "codificar:2500x1875:image/jpeg:q0.82",
      // A miniatura sai do resultado, não do original: reprocessar o original
      // dobraria o pico de memória no aparelho mais fraco.
      "desenhar:2500x1875→320x240:girar0",
      "codificar:320x240:image/jpeg:q0.7",
    ]);
  });

  it("sem filtro escolhido, o desenhista de cor nem é chamado", () => {
    // O preset é escolha do convidado. Aplicar sozinho tiraria a escolha de
    // quem tirou a foto (N5.9).
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    return processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    }).then(() => {
      expect(chamadas.some((c) => c.startsWith("filtrar:"))).toBe(false);
    });
  });

  it("o filtro entra depois de endireitar, e a miniatura sai dele", async () => {
    // Se a miniatura saísse da imagem sem filtro, a tira do telão teria uma
    // cor e o álbum outra — e coerência entre as fotos é o produto.
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
      filtro: { ajustes: NEUTRO, porPixel: true, intensidade: 0.6 },
    });

    expect(chamadas).toEqual([
      "decodificar:image/jpeg:8b",
      "desenhar:original→2500x1875:girar0",
      "filtrar:2500x1875:pixel:i0.6",
      "codificar:2500x1875+filtro:image/jpeg:q0.82",
      "desenhar:2500x1875+filtro→320x240:girar0",
      "codificar:320x240:image/jpeg:q0.7",
    ]);
  });

  it("os ajustes manuais entram na mesma passagem do preset, e a miniatura sai dela", async () => {
    // Uma segunda passagem só para os ajustes custaria outra varredura da
    // imagem inteira; e uma miniatura tirada de antes deles deixaria a tira do
    // telão com uma cor e o álbum com outra.
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
      filtro: {
        ajustes: NEUTRO,
        porPixel: false,
        intensidade: 0.4,
        manuais: { luz: 0.3, calor: -0.2, contraste: 0, vinheta: 0.5 },
      },
    });

    expect(chamadas).toEqual([
      "decodificar:image/jpeg:8b",
      "desenhar:original→2500x1875:girar0",
      "filtrar:2500x1875:css:i0.4+ajustes(0.3,-0.2,0,0.5)",
      "codificar:2500x1875+filtro+ajustes:image/jpeg:q0.82",
      "desenhar:2500x1875+filtro+ajustes→320x240:girar0",
      "codificar:320x240:image/jpeg:q0.7",
    ]);
  });

  it("ajuste sem preset ainda passa pelo desenhista de cor", async () => {
    // O convidado pode corrigir a luz do salão sem escolher preset nenhum. Se
    // a intensidade zerada bloqueasse a passagem, o ajuste sumiria no envio.
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
      filtro: {
        ajustes: NEUTRO,
        porPixel: false,
        intensidade: 0,
        manuais: { luz: -0.4, calor: 0, contraste: 0, vinheta: 0 },
      },
    });

    expect(chamadas[2]).toBe("filtrar:2500x1875:css:i0+ajustes(-0.4,0,0,0)");
    expect(chamadas[3]).toBe("codificar:2500x1875+filtro+ajustes:image/jpeg:q0.82");
  });

  it("preset zerado e ajuste neutro não pagam passagem de cor nenhuma", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
      filtro: { ajustes: NEUTRO, porPixel: true, intensidade: 0, manuais: AJUSTES_NEUTROS },
    });

    expect(chamadas.some((c) => c.startsWith("filtrar:"))).toBe(false);
  });

  it("sem texto do composer, o desenhista de texto nem é chamado", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    expect(chamadas.some((c) => c.startsWith("compor:"))).toBe(false);
  });

  it("texto em branco não conta como composer aberto", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
      texto: { conteudo: "   ", x: 0.5, y: 0.5, tamanho: 0.08 },
    });

    expect(chamadas.some((c) => c.startsWith("compor:"))).toBe(false);
  });

  it("o texto entra depois da cor, e a miniatura sai dele — mesma proporção, sem recalcular posição", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
      filtro: { ajustes: NEUTRO, porPixel: true, intensidade: 0.6 },
      texto: { conteudo: "oi, festa!", x: 0.5, y: 0.8, tamanho: 0.1 },
    });

    expect(chamadas).toEqual([
      "decodificar:image/jpeg:8b",
      "desenhar:original→2500x1875:girar0",
      "filtrar:2500x1875:pixel:i0.6",
      'compor:2500x1875+filtro:"oi, festa!"@0.5,0.8',
      "codificar:2500x1875+filtro+texto:image/jpeg:q0.82",
      "desenhar:2500x1875+filtro+texto→320x240:girar0",
      "codificar:320x240:image/jpeg:q0.7",
    ]);
  });

  it("a miniatura parte da imagem já reduzida", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 8000, altura: 6000 });

    await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    const origemDaThumb = chamadas.find((c) => c.includes("→320x"));
    expect(origemDaThumb).toContain("desenhar:2500x1875→");
  });
});

describe("orientação, antes de o reencode apagar o EXIF", () => {
  it("a foto do iPhone em paisagem é girada e os eixos trocam", async () => {
    // Pixels gravados de lado: 4032 de largura por 3024, com a tag dizendo
    // para girar. Sem isso a foto entra deitada no álbum.
    const { desenhista, chamadas } = desenhistaFalso({ largura: 4032, altura: 3024 });

    const r = await processarFoto(jpegOrientacao6(), "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    expect(r.orientacaoOriginal).toBe(6);
    expect(chamadas[1]).toBe("desenhar:original→1875x2500:girar90");
    // Em pé: o lado maior passa a ser a altura.
    expect(r.altura).toBeGreaterThan(r.largura);
  });

  it("o plano é calculado sobre a imagem em pé, não sobre os pixels crus", async () => {
    const { desenhista } = desenhistaFalso({ largura: 4032, altura: 3024 });

    const r = await processarFoto(jpegOrientacao6(), "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    // Planejar sobre as dimensões cruas encolheria pelo lado errado.
    expect(Math.max(r.largura, r.altura)).toBe(2500);
    expect(r.largura / r.altura).toBeCloseTo(3024 / 4032, 2);
  });

  it("sem EXIF, não gira nada", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 1000, altura: 800 });

    const r = await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    expect(r.orientacaoOriginal).toBe(1);
    expect(chamadas[1]).toContain("girar0");
    expect(chamadas[1]).not.toContain("espelhar");
  });
});

describe("saída", () => {
  it("sai em JPEG, independente do que entrou", async () => {
    const { desenhista, chamadas } = desenhistaFalso({ largura: 1000, altura: 800 });

    // É o que o iPhone não entrega e todo mundo abre — inclusive o telão.
    await processarFoto(semExif, "image/heic", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    expect(chamadas[0]).toContain("image/heic");
    expect(chamadas.filter((c) => c.startsWith("codificar")).every((c) => c.includes("image/jpeg"))).toBe(true);
  });

  it("a miniatura é mais comprimida que a foto", async () => {
    expect(QUALITY.thumb).toBeLessThan(QUALITY.full);
  });

  it("num aparelho modesto, o teto reduz mais e a foto ainda sai", async () => {
    const { desenhista } = desenhistaFalso({ largura: 4032, altura: 3024 });

    const r = await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "pago",
      device: { memoryGb: 2 },
    });

    expect(r.largura * r.altura).toBeLessThanOrEqual(2048 * 2048);
    expect(r.full).toBeTruthy();
  });

  it("relata se a foto trazia GPS — verificação, não decisão", async () => {
    const { desenhista } = desenhistaFalso({ largura: 1000, altura: 800 });

    const r = await processarFoto(semExif, "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    // O EXIF sai de toda foto, sempre. Este campo serve para o cliente poder
    // afirmar que a remoção aconteceu, não para condicioná-la.
    expect(r.tinhaGeolocalizacao).toBe(false);
    expect(r.capturadaEm).toBeNull();
  });

  it("lê o instante de captura antes de reencodar", async () => {
    const { desenhista } = desenhistaFalso({ largura: 1000, altura: 800 });
    const r = await processarFoto(jpegComDateTime(), "image/jpeg", desenhista, {
      plan: "gratis",
      device: aparelhoComum,
    });

    expect(r.capturadaEm?.toISOString()).toBe("2026-08-09T01:00:00.000Z");
  });
});
