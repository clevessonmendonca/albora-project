import { acentoLegivelSobre, misturarHex, textoSobre } from "./cor";
import type { Background, Colors, SemanticScale } from "./types";

/**
 * Escala derivada das cores base — lista fixa fica calibrada para o chão do
 * dia em que foi escrita; derivar é o que faz "todo neutro é opacidade" ser
 * verdade mecânica.
 *
 * As duas rampas são diferentes de propósito. A mesma opacidade não lê igual
 * nos dois chões: 12% de tinta sobre papel é uma linha nítida, 12% de papel
 * sobre noite quase some. Uma rampa só era mais elegante no código e pior na
 * tela — o redesign v5 calibrou cada uma contra o seu próprio fundo.
 */

/** Sobre `papel`, medindo em direção a `tinta`. */
const RAMPA_CLARA = {
  bg: 0.07,
  /** Preenchimento rebaixado: trilho de barra, chip, célula de tabela. */
  superficieAlta: 0.045,
  /**
   * Mais funda que o `#E6E2DC` do protótipo, de propósito. O v5 usa borda
   * sobre o chão, e o produto usa borda sobre o próprio preenchimento —
   * botão, pílula e switch são `border-linha` em cima de `superficieAlta`.
   * Com a opacidade do protótipo, a razão entre os dois cai para 1,11 e a
   * borda some; em 0,15 ela volta a 1,25, que é o peso que a rampa tinha
   * antes do v5. O protótipo tem a mesma colisão e escapa dela por não pôr
   * pílula com borda sobre `surface-2`.
   */
  linha: 0.15,
  ink3: 0.64,
  ink2: 0.76,
} as const;

/**
 * Sobre `noite`, medindo em direção a `papel` — valores absolutos a partir do
 * extremo, não offsets a partir do chão.
 *
 * `noite` continua sendo o extremo da escala e não aparece em tela: o chão é
 * `noite` levantado 2,5%, que é o cinza quente do v5. Chão igual ao extremo
 * tira do designer o degrau mais escuro que ainda existe.
 */
const CHAO_ESCURO = 0.025;

const RAMPA_ESCURA = {
  superficie: 0.0625,
  superficieAlta: 0.1,
  linha: 0.1667,
  ink3: 0.6458,
  ink2: 0.7833,
} as const;

/**
 * `superficieAlta` é um passo **a partir da superfície na direção do
 * contraste** — mais escuro no claro, mais claro no escuro. Não é "mais
 * elevado": antes do v5 ela misturava com branco puro, e num papel quase
 * branco isso dava uma superfície invisível, que é como um trilho de barra
 * de progresso sumia contra o card.
 */
function escuro(c: Colors): SemanticScale {
  const sobre = (t: number) => misturarHex(c.noite, c.papel, t);

  const bg = sobre(CHAO_ESCURO);
  const superficieAlta = sobre(RAMPA_ESCURA.superficieAlta);
  const legivel = (cor: string) => acentoLegivelSobre(cor, bg, superficieAlta);

  return {
    bg,
    superficie: sobre(RAMPA_ESCURA.superficie),
    superficieAlta,
    linha: sobre(RAMPA_ESCURA.linha),
    ink3: sobre(RAMPA_ESCURA.ink3),
    ink2: sobre(RAMPA_ESCURA.ink2),
    ink: c.papel,
    acento: c.acento,
    acentoTexto: legivel(c.acento),
    sobreAcento: textoSobre(c.acento, bg, c.papel),
    critico: legivel(c.critico),
    atencao: legivel(c.atencao),
    positivo: legivel(c.positivo),
    informativo: legivel(c.informativo),
  };
}

function claro(c: Colors): SemanticScale {
  const sobre = (t: number) => misturarHex(c.papel, c.tinta, t);

  const bg = sobre(RAMPA_CLARA.bg);
  const legivel = (cor: string) => acentoLegivelSobre(cor, bg, c.papel);

  return {
    bg,
    superficie: c.papel,
    superficieAlta: sobre(RAMPA_CLARA.superficieAlta),
    linha: sobre(RAMPA_CLARA.linha),
    ink3: sobre(RAMPA_CLARA.ink3),
    ink2: sobre(RAMPA_CLARA.ink2),
    ink: c.tinta,
    acento: c.acento,
    acentoTexto: legivel(c.acento),
    sobreAcento: textoSobre(c.acento, c.tinta, c.papel),
    critico: legivel(c.critico),
    atencao: legivel(c.atencao),
    positivo: legivel(c.positivo),
    informativo: legivel(c.informativo),
  };
}

export function escalaDoFundo(cores: Colors, background: Background): SemanticScale {
  return background === "light" ? claro(cores) : escuro(cores);
}
