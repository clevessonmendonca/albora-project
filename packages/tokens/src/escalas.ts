import { acentoLegivelSobre, misturarHex, textoSobre } from "./cor";
import type { Background, Colors, SemanticScale } from "./types";

/**
 * A escala **derivada** das cinco cores, nunca uma lista de hexes.
 *
 * Lista fixa parece equivalente e não é: ela fica calibrada para a base do dia
 * em que foi escrita. Quando o chão mudou de `#14100E` para `#0C0A09`, uma
 * lista fixa teria continuado a devolver superfícies clareadas na medida do
 * preto antigo — e o defeito é invisível em revisão, porque cada valor
 * isolado continua parecendo certo.
 *
 * Derivar é o que faz "todo neutro é opacidade" (`DESIGN.md` §2) ser verdade
 * mecânica em vez de promessa.
 */

/**
 * As opacidades da rampa, medidas a partir da escala publicada no `DESIGN.md`
 * §2. São a proporção, não a cor — é o que sobrevive à troca de base.
 */
const RAMPA = {
  superficie: 0.045,
  superficieAlta: 0.095,
  linha: 0.12,
  ink3: 0.44,
  ink2: 0.66,
} as const;

const BRANCO = "#FFFFFF";

/**
 * O chão escuro não é o `noite` cru.
 *
 * `noite` é o extremo da marca, e extremo é fim de escala, não superfície de
 * leitura: um app inteiro em `#0C0A09` lê como buraco preto, some a
 * profundidade entre página e card e faz a cor do evento não aparecer em
 * lugar nenhum — o casal escolheu uma cor e o preto absoluto engole todas.
 *
 * O `claro()` já fazia isto: a página é `sobre(0.03)` e não o papel puro. Aqui
 * a assimetria era acidente, não decisão. Levantar o chão em 9% da distância
 * até o papel dá um cinza **quente**, porque quem clareia é o papel do evento,
 * e não um cinza neutro colado por fora.
 *
 * A rampa continua sendo a mesma do `DESIGN.md` §2 — ela passa a ser medida
 * **a partir do chão**, que é o que "elevação" sempre quis dizer.
 */
const CHAO_ESCURO = 0.09;

function escuro(c: Colors): SemanticScale {
  const sobre = (t: number) => misturarHex(c.noite, c.papel, t);
  const acima = (t: number) => sobre(CHAO_ESCURO + t);

  const bg = sobre(CHAO_ESCURO);
  // Texto de acento aparece em card também, e no escuro o card é MAIS claro
  // que a página. Derivar só contra o chão aprovaria uma cor que some em cima
  // da superfície elevada.
  const superficieAlta = acima(RAMPA.superficieAlta);

  return {
    bg,
    superficie: acima(RAMPA.superficie),
    superficieAlta,
    linha: acima(RAMPA.linha),
    ink3: acima(RAMPA.ink3),
    ink2: acima(RAMPA.ink2),
    ink: c.papel,
    acento: c.acento,
    acentoTexto: acentoLegivelSobre(c.acento, bg, superficieAlta),
    sobreAcento: textoSobre(c.acento, bg, c.papel),
    // Brasa pura some no escuro. Quem clareia é o contraste, não o olho.
    critico: acentoLegivelSobre(c.critico, bg, superficieAlta),
  };
}

function claro(c: Colors): SemanticScale {
  const sobre = (t: number) => misturarHex(c.papel, c.tinta, t);
  // No claro a página é o degrau mais ESCURO, então é ela o pior caso.
  const bg = sobre(0.03);

  return {
    // No claro a elevação sobe para o branco, então a página fica um degrau
    // ABAIXO do card. Invertido em relação ao escuro, e de propósito.
    bg,
    superficie: c.papel,
    superficieAlta: misturarHex(c.papel, BRANCO, 0.55),
    linha: sobre(RAMPA.linha),
    ink3: sobre(RAMPA.ink3),
    ink2: sobre(RAMPA.ink2),
    ink: c.tinta,
    acento: c.acento,
    acentoTexto: acentoLegivelSobre(c.acento, bg, c.papel),
    // Não depende do chão: o preenchimento é o mesmo âmbar nos dois.
    sobreAcento: textoSobre(c.acento, c.tinta, c.papel),
    critico: acentoLegivelSobre(c.critico, bg, c.papel),
  };
}

export function escalaDoFundo(cores: Colors, fundo: Background): SemanticScale {
  return fundo === "claro" ? claro(cores) : escuro(cores);
}
