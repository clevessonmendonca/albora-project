import { describe, expect, it } from "vitest";
import { desenharTextoNoContexto, estiloTextoDoStory, quebrarLinhas } from "./story-text";

/** `.test.tsx` (sem JSX): extensão ativa jsdom em `vitest.config.ts` — asserções de estilo precisam de `document`/`getComputedStyle`. */

const ESTILO = { cor: "rgb(250,250,248)", contorno: "rgb(10,10,12)", fonte: "Sans" };

/** Contexto 2D falso (1px/char): registra chamadas sem canvas real — prova ordem e posições, não pixels. */
function ctxFalso() {
  const chamadas: string[] = [];
  const ctx = {
    font: "",
    textAlign: "",
    textBaseline: "",
    lineJoin: "",
    strokeStyle: "",
    lineWidth: 0,
    fillStyle: "",
    measureText(texto: string) {
      return { width: texto.length } as TextMetrics;
    },
    strokeText(texto: string, x: number, y: number) {
      chamadas.push(`stroke:"${texto}"@${x},${y}:cor=${ctx.strokeStyle}:largura=${ctx.lineWidth}`);
    },
    fillText(texto: string, x: number, y: number) {
      chamadas.push(`fill:"${texto}"@${x},${y}:cor=${ctx.fillStyle}`);
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, chamadas };
}

describe("quebrarLinhas", () => {
  it("cabe tudo numa linha quando a largura sobra", () => {
    const { ctx } = ctxFalso();
    expect(quebrarLinhas(ctx, "oi festa", 100)).toEqual(["oi festa"]);
  });

  it("quebra palavra a palavra quando excede a largura máxima", () => {
    const { ctx } = ctxFalso();
    // "abc def ghi" mede 11; cada quebra em 4 força uma linha por palavra.
    expect(quebrarLinhas(ctx, "abc def ghi", 4)).toEqual(["abc", "def", "ghi"]);
  });

  it("uma palavra maior que a largura máxima não é cortada", () => {
    const { ctx } = ctxFalso();
    expect(quebrarLinhas(ctx, "umapalavramuitogrande", 3)).toEqual(["umapalavramuitogrande"]);
  });

  it("espaços múltiplos e bordas não geram linha vazia", () => {
    const { ctx } = ctxFalso();
    expect(quebrarLinhas(ctx, "  oi   festa  ", 100)).toEqual(["oi festa"]);
  });
});

describe("desenharTextoNoContexto", () => {
  it("texto vazio ou só espaço não desenha nada", () => {
    const { ctx, chamadas } = ctxFalso();
    desenharTextoNoContexto(ctx, 1000, 1000, { conteudo: "   ", x: 0.5, y: 0.5, tamanho: 0.1 }, ESTILO);
    expect(chamadas).toEqual([]);
  });

  it("centra uma linha em x,y e desenha contorno antes do preenchimento", () => {
    const { ctx, chamadas } = ctxFalso();
    desenharTextoNoContexto(
      ctx,
      1000,
      1000,
      { conteudo: "oi", x: 0.5, y: 0.8, tamanho: 0.1 },
      ESTILO,
    );

    expect(chamadas).toEqual([
      `stroke:"oi"@500,800:cor=${ESTILO.contorno}:largura=8`,
      `fill:"oi"@500,800:cor=${ESTILO.cor}`,
    ]);
  });

  it("múltiplas linhas ficam centradas verticalmente em torno de y", () => {
    const { ctx, chamadas } = ctxFalso();
    // largura máxima = 10*0.86 = 8.6 → "abcde" (5) cabe, "abcde fghij" (11) não → duas linhas.
    desenharTextoNoContexto(
      ctx,
      10,
      100,
      { conteudo: "abcde fghij", x: 0.5, y: 0.5, tamanho: 0.3 },
      ESTILO,
    );

    const ys = chamadas
      .filter((c) => c.startsWith("fill:"))
      .map((c) => Number(c.match(/@[\d.]+,([\d.-]+):/)?.[1]));

    expect(ys).toHaveLength(2);
    expect(ys[0]).toBeLessThan(ys[1]!);
    // Centradas: a média das duas fica em y=50 (0.5*100).
    expect((ys[0]! + ys[1]!) / 2).toBeCloseTo(50, 5);
  });
});

describe("estiloTextoDoStory", () => {
  it("lê os tokens já resolvidos do elemento passado, sem hex hardcodado", () => {
    const raiz = document.createElement("div");
    raiz.style.setProperty("--ink", "rgb(1,2,3)");
    raiz.style.setProperty("--bg", "rgb(4,5,6)");
    raiz.style.setProperty("--fonte-titulo", '"Minha Fonte", sans-serif');
    document.body.appendChild(raiz);

    const estilo = estiloTextoDoStory(raiz);

    expect(estilo.cor).toBe("rgb(1,2,3)");
    expect(estilo.contorno).toBe("rgb(4,5,6)");
    expect(estilo.fonte).toBe("Minha Fonte, sans-serif");

    raiz.remove();
  });

  it("sem token definido, cai num par de contraste em vez de estourar", () => {
    const raiz = document.createElement("div");
    document.body.appendChild(raiz);

    const estilo = estiloTextoDoStory(raiz);

    expect(estilo.cor).toBeTruthy();
    expect(estilo.contorno).toBeTruthy();

    raiz.remove();
  });
});
