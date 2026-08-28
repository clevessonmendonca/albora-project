/** Contraste calculado (DESIGN.md §2): trocar o chão re-deriva o acento — validação é do sistema, não da escolha do casal. */

export type Rgb = { r: number; g: number; b: number };

export function lerHex(hex: string): Rgb | null {
  const limpo = hex.trim().replace(/^#/, "");

  const expandido =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;

  if (!/^[0-9a-f]{6}$/i.test(expandido)) return null;

  return {
    r: parseInt(expandido.slice(0, 2), 16),
    g: parseInt(expandido.slice(2, 4), 16),
    b: parseInt(expandido.slice(4, 6), 16),
  };
}

export function paraHex({ r, g, b }: Rgb): string {
  const canal = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");

  return `#${canal(r)}${canal(g)}${canal(b)}`.toUpperCase();
}

/** Luminância relativa da sRGB, com a expansão de gama da WCAG. */
export function luminancia(cor: Rgb): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(cor.r) + 0.7152 * canal(cor.g) + 0.0722 * canal(cor.b);
}

export function contraste(a: Rgb, b: Rgb): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);

  return (claro + 0.05) / (escuro + 0.05);
}

/** Texto corrido pela WCAG AA. Rótulo pequeno no escuro do salão não perdoa. */
export const CONTRASTE_DE_TEXTO = 4.5;

function misturar(cor: Rgb, alvo: Rgb, t: number): Rgb {
  return {
    r: cor.r + (alvo.r - cor.r) * t,
    g: cor.g + (alvo.g - cor.g) * t,
    b: cor.b + (alvo.b - cor.b) * t,
  };
}

/** `base` coberta por `tom` com opacidade `t`, achatado em hex opaco — sombra sobre foto de festa suja; devolve `base` quando hex inválido: neutro errado é feio, ausente é tela em branco. */
export function misturarHex(base: string, tom: string, t: number): string {
  const a = lerHex(base);
  const b = lerHex(tom);
  if (!a || !b) return base;

  return paraHex(misturar(a, b, t));
}

/** Rótulo sobre preenchimento de acento — sobre âmbar, papel dá 2,6:1 e branco dá 3,0:1, ambos reprovam; escolhe por contraste medido e caminha o melhor até servir. */
export function textoSobre(preenchimento: string, ...candidatos: string[]): string {
  const chao = lerHex(preenchimento);
  const cores = candidatos.map(lerHex).filter((c): c is Rgb => c !== null);
  if (!chao || cores.length === 0) return candidatos[0] ?? preenchimento;

  const melhor = cores.reduce((a, b) => (contraste(a, chao) >= contraste(b, chao) ? a : b));

  return acentoLegivelSobre(paraHex(melhor), preenchimento);
}

export function acentoLegivelSobre(acento: string, ...superficies: string[]): string {
  const cor = lerHex(acento);
  const chaos = superficies.map(lerHex).filter((c): c is Rgb => c !== null);
  if (!cor || chaos.length === 0) return acento;

  const serve = (c: Rgb) => chaos.every((chao) => contraste(c, chao) >= CONTRASTE_DE_TEXTO);
  if (serve(cor)) return paraHex(cor);

  // O extremo sai da superfície mais parecida com o acento — é contra ela que o contraste é pior, e ela decide para que lado caminhar; usar o fundo da página daria a resposta certa no escuro e errada no claro.
  const pior = chaos.reduce((a, b) =>
    contraste(cor, a) <= contraste(cor, b) ? a : b,
  );
  const extremo: Rgb =
    luminancia(pior) > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

  for (let passo = 1; passo <= 100; passo += 1) {
    const candidato = misturar(cor, extremo, passo / 100);
    if (serve(candidato)) return paraHex(candidato);
  }

  return paraHex(extremo);
}
