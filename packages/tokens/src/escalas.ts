import {
  acentoLegivelSobre,
  contraste,
  lerHex,
  luminancia,
  misturarHex,
  rotuloSobre,
} from "./cor";
import type { Background, Colors, SemanticScale } from "./types";

/**
 * Escala derivada das cores base — lista fixa fica calibrada para o chão do
 * dia em que foi escrita; derivar é o que faz "todo neutro é opacidade" ser
 * verdade mecânica.
 *
 * A proporção é o ponto de partida, não a palavra final: ela sobrevive à troca
 * de chão, que era a promessa do §2, mas não à troca de TINTA. Com a tinta da
 * marca 76% lê; com um verde médio escolhido pelo casal, o mesmo 76% entrega
 * 4,24:1. `ink2`/`ink3` e o rótulo do botão passam pelo mesmo piso de leitura
 * que o acento já tinha — a opacidade decide a cor, o piso decide se ela fica.
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

type RampaEscura = {
  superficie: number;
  superficieAlta: number;
  linha: number;
  ink3: number;
  ink2: number;
};

const RAMPA_ESCURA: RampaEscura = {
  superficie: 0.0625,
  superficieAlta: 0.1,
  linha: 0.1667,
  ink3: 0.6458,
  ink2: 0.7833,
};

/**
 * A mesma rampa, com os degraus afastados para superfície de trabalho.
 *
 * A de cima é calibrada para o convidado e o telão, onde a foto é a interface:
 * 1,08:1 entre cartão e página é pouco para enxergar, e é isso que se quer lá —
 * o cromo cede. O painel no escuro não tem foto competindo; tem cartão, tabela
 * e fila de moderação, e o §6 diz que no escuro a elevação vem da superfície
 * clarear, não da sombra. Sem isto, a tela do anfitrião vira um plano só.
 *
 * Só as superfícies mudam. Os níveis de tinta continuam sendo os mesmos, então
 * a hierarquia de texto não se move com a elevação.
 */
const RAMPA_ESCURA_DE_TRABALHO: RampaEscura = {
  ...RAMPA_ESCURA,
  superficie: 0.125,
  superficieAlta: 0.185,
  linha: 0.26,
};

/**
 * `superficieAlta` é um passo **a partir da superfície na direção do
 * contraste** — mais escuro no claro, mais claro no escuro. Não é "mais
 * elevado": antes do v5 ela misturava com branco puro, e num papel quase
 * branco isso dava uma superfície invisível, que é como um trilho de barra
 * de progresso sumia contra o card.
 */
/**
 * Devolve `cor` com pelo menos `fator` a mais de contraste que `referencia`
 * contra `fundo`.
 *
 * O piso de leitura empurra secundário e terciário para o mesmo mínimo, e a
 * rampa de três degraus vira dois. Aqui o secundário recupera a distância —
 * "todo neutro é opacidade" continua decidindo a cor de partida; isto só
 * garante que a hierarquia sobreviva à correção.
 */
function comDegrauSobre(cor: string, referencia: string, fundo: string, fator = 1.12): string {
  const chao = lerHex(fundo);
  const base = lerHex(referencia);
  const atual = lerHex(cor);
  if (!chao || !base || !atual) return cor;

  const alvo = contraste(base, chao) * fator;
  if (contraste(atual, chao) >= alvo) return cor;

  const extremo = luminancia(chao) > 0.5 ? "#000000" : "#FFFFFF";
  for (let passo = 1; passo <= 100; passo += 1) {
    const candidato = misturarHex(cor, extremo, passo / 100);
    const rgb = lerHex(candidato);
    if (rgb && contraste(rgb, chao) >= alvo) return candidato;
  }
  return cor;
}

function escuro(c: Colors, rampa: RampaEscura = RAMPA_ESCURA): SemanticScale {
  const sobre = (t: number) => misturarHex(c.noite, c.papel, t);

  const bg = sobre(CHAO_ESCURO);
  const superficieAlta = sobre(rampa.superficieAlta);
  const superficie = sobre(rampa.superficie);
  const legivel = (cor: string) => acentoLegivelSobre(cor, bg, superficieAlta);
  const tintaLegivel = (cor: string) => acentoLegivelSobre(cor, bg, superficie);
  const ink3Escuro = tintaLegivel(sobre(rampa.ink3));

  return {
    bg,
    superficie,
    superficieAlta,
    linha: sobre(rampa.linha),
    ink3: ink3Escuro,
    ink2: comDegrauSobre(tintaLegivel(sobre(rampa.ink2)), ink3Escuro, bg),
    ink: c.papel,
    acento: c.acento,
    acentoTexto: legivel(c.acento),
    sobreAcento: rotuloSobre(c.acento, bg, c.papel),
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
  const tintaLegivel = (cor: string) => acentoLegivelSobre(cor, bg, c.papel);
  const ink3Claro = tintaLegivel(sobre(RAMPA_CLARA.ink3));

  return {
    bg,
    superficie: c.papel,
    superficieAlta: sobre(RAMPA_CLARA.superficieAlta),
    linha: sobre(RAMPA_CLARA.linha),
    ink3: ink3Claro,
    ink2: comDegrauSobre(tintaLegivel(sobre(RAMPA_CLARA.ink2)), ink3Claro, bg),
    ink: c.tinta,
    acento: c.acento,
    acentoTexto: legivel(c.acento),
    sobreAcento: rotuloSobre(c.acento, c.tinta, c.papel),
    critico: legivel(c.critico),
    atencao: legivel(c.atencao),
    positivo: legivel(c.positivo),
    informativo: legivel(c.informativo),
  };
}

export type OpcoesDeEscala = {
  /**
   * `foto` (padrão) é a do convidado e do telão: o cromo cede à imagem.
   * `trabalho` afasta os degraus para uma superfície onde a imagem não compete
   * e quem opera precisa ver onde um bloco termina. Só tem efeito no escuro —
   * no claro a sombra já faz a separação.
   */
  elevacao?: "foto" | "trabalho";
};

export function escalaDoFundo(
  cores: Colors,
  background: Background,
  opcoes: OpcoesDeEscala = {},
): SemanticScale {
  if (background === "light") return claro(cores);
  return escuro(cores, opcoes.elevacao === "trabalho" ? RAMPA_ESCURA_DE_TRABALHO : RAMPA_ESCURA);
}
