import type { Ajustes } from "./luts";

/** 35 mm requer passagem por pixel: ombro nas altas, viés verde, halação e grão — quatro efeitos que CSS não sabe fazer (ADR 0007). */

export type Preset = {
  id: string;
  nome: string;
  ajustes: Ajustes;
  /** `true` → `ajustes` é degradação CSS; o resultado real sai de `aplicarPorPixel`. Cai pro CSS se exceder `TETO_POR_PIXEL_MS`. */
  porPixel?: boolean;
};

export const PRESETS: readonly Preset[] = [
  {
    id: "natural",
    nome: "Natural",
    ajustes: { sepia: 0, saturacao: 1.08, matiz: 0, brilho: 1.02, contraste: 1.06 },
  },
  {
    id: "quente",
    nome: "Quente",
    ajustes: { sepia: 0.22, saturacao: 1.14, matiz: -6, brilho: 1.03, contraste: 1.04 },
  },
  {
    id: "frio",
    nome: "Frio",
    ajustes: { sepia: 0, saturacao: 0.94, matiz: 12, brilho: 1.0, contraste: 1.1 },
  },
  {
    id: "dourado",
    nome: "Dourado",
    ajustes: { sepia: 0.38, saturacao: 1.2, matiz: -10, brilho: 1.06, contraste: 0.98 },
  },
  {
    id: "contraste",
    nome: "Contraste",
    ajustes: { sepia: 0, saturacao: 1.12, matiz: 0, brilho: 0.98, contraste: 1.28 },
  },
  {
    id: "suave",
    nome: "Suave",
    ajustes: { sepia: 0.1, saturacao: 0.86, matiz: 0, brilho: 1.08, contraste: 0.88 },
  },
  {
    id: "monocromatico",
    nome: "Preto e branco",
    ajustes: { sepia: 0, saturacao: 0, matiz: 0, brilho: 1.02, contraste: 1.14 },
  },
  {
    id: "35mm",
    nome: "35 mm",
    porPixel: true,
    ajustes: { sepia: 0.16, saturacao: 0.92, matiz: -4, brilho: 1.04, contraste: 0.94 },
  },
];

export function preset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function ordenarComRecomendado(recomendadoId: string | null): Preset[] {
  const recomendado = recomendadoId ? preset(recomendadoId) : undefined;
  if (!recomendado) return [...PRESETS];

  return [recomendado, ...PRESETS.filter((p) => p.id !== recomendado.id)];
}

/** Limiar em ms acima do qual o preset cai para CSS. Medido no pior caso: Android de entrada, foto de 12 MP. */
export const TETO_POR_PIXEL_MS = 1500;

const PONTO_DO_OMBRO = 0.72;
const FORCA_DO_OMBRO = 2.6;
const PISO_DO_PRETO = 0.045;
const VIES_VERDE = 0.036;
const LIMIAR_DE_HALACAO = 0.78;
const FORCA_DA_HALACAO = 0.5;
const FORCA_DO_GRAO = 9;

/** Roll-off nas altas — digital clipa em 1.0 (disco branco chapado); filme comprime. Maior diferença visual entre "celular" e "filme". */
function ombro(v: number): number {
  if (v <= PONTO_DO_OMBRO) return v;

  const faixa = 1 - PONTO_DO_OMBRO;
  const t = (v - PONTO_DO_OMBRO) / faixa;
  const comprimido = (1 - Math.exp(-t * FORCA_DO_OMBRO)) / (1 - Math.exp(-FORCA_DO_OMBRO));

  return PONTO_DO_OMBRO + comprimido * faixa;
}

/** Grão determinístico — sem isso, reabrir o editor mudaria a foto e a miniatura divergiria do resultado final. */
function ruido(indice: number): number {
  let x = Math.imul(indice ^ 0x9e3779b9, 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;

  return (x >>> 0) / 4294967295 - 0.5;
}

function luminancia(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Blur de caixa separável (2 passagens) — O(n) em pixels, não O(n·r²); quadrático tornaria inviável no aparelho fraco. */
function mascaraDeHalacao(dados: Uint8ClampedArray, largura: number, altura: number): Float32Array {
  const total = largura * altura;
  const mascara = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const l = luminancia(dados[i * 4] ?? 0, dados[i * 4 + 1] ?? 0, dados[i * 4 + 2] ?? 0);
    mascara[i] = l > LIMIAR_DE_HALACAO ? (l - LIMIAR_DE_HALACAO) / (1 - LIMIAR_DE_HALACAO) : 0;
  }

  const raio = Math.max(1, Math.round(Math.min(largura, altura) * 0.012));
  const janela = raio * 2 + 1;
  const horizontal = new Float32Array(total);

  for (let y = 0; y < altura; y++) {
    const linha = y * largura;
    for (let x = 0; x < largura; x++) {
      let soma = 0;
      for (let d = -raio; d <= raio; d++) {
        soma += mascara[linha + Math.min(largura - 1, Math.max(0, x + d))] ?? 0;
      }
      horizontal[linha + x] = soma / janela;
    }
  }

  for (let x = 0; x < largura; x++) {
    for (let y = 0; y < altura; y++) {
      let soma = 0;
      for (let d = -raio; d <= raio; d++) {
        soma += horizontal[Math.min(altura - 1, Math.max(0, y + d)) * largura + x] ?? 0;
      }
      mascara[y * largura + x] = soma / janela;
    }
  }

  return mascara;
}

/** Ombro nas altas mais piso no preto, em 0–255. */
function curva(canal: number): number {
  const v = ombro(canal / 255);
  return (PISO_DO_PRETO + v * (1 - PISO_DO_PRETO)) * 255;
}

function misturar(de: number, para: number, t: number): number {
  return de + (para - de) * t;
}

/** Opera em bytes crus para rodar igual no canvas web e no buffer Expo, e ser testável sem navegador. `intensidade` 0 = intacta, 1 = cheio. */
export function aplicarPorPixel(
  dados: Uint8ClampedArray,
  largura: number,
  altura: number,
  intensidade = 1,
): void {
  const forca = Math.min(1, Math.max(0, intensidade));
  if (forca === 0) return;

  const halacao = mascaraDeHalacao(dados, largura, altura);
  const total = largura * altura;

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const r = dados[p] ?? 0;
    const g = dados[p + 1] ?? 0;
    const b = dados[p + 2] ?? 0;

    // O grão de filme é mais visível nos médios: nas sombras o preto o come,
    // nas altas a luz o apaga.
    const pesoDosMedios = 1 - Math.abs(luminancia(r, g, b) * 2 - 1);
    const grao = ruido(i) * FORCA_DO_GRAO * pesoDosMedios;
    const halo = (halacao[i] ?? 0) * FORCA_DA_HALACAO * 255;
    const verde = VIES_VERDE * pesoDosMedios * 255;

    // A halação de filme é quente: vaza no vermelho e no verde, quase nada no
    // azul. Vazar igual nos três daria véu cinza, não luz.
    dados[p] = misturar(r, curva(r) + grao + halo, forca);
    dados[p + 1] = misturar(g, curva(g) + grao + halo * 0.62 + verde, forca);
    dados[p + 2] = misturar(b, curva(b) + grao + halo * 0.18, forca);
  }
}
