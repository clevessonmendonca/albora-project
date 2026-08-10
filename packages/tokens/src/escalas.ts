import { acentoLegivelSobre, misturarHex } from "./cor";
import type { Cores, EscalaSemantica, Fundo } from "./tipos";

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

function escuro(c: Cores): EscalaSemantica {
  const sobre = (t: number) => misturarHex(c.noite, c.papel, t);
  // Texto de acento aparece em card também, e no escuro o card é MAIS claro
  // que a página. Derivar só contra o chão aprovaria uma cor que some em cima
  // da superfície elevada.
  const superficieAlta = sobre(RAMPA.superficieAlta);

  return {
    bg: c.noite,
    superficie: sobre(RAMPA.superficie),
    superficieAlta,
    linha: sobre(RAMPA.linha),
    ink3: sobre(RAMPA.ink3),
    ink2: sobre(RAMPA.ink2),
    ink: c.papel,
    acento: c.acento,
    acentoTexto: acentoLegivelSobre(c.acento, c.noite, superficieAlta),
    // Brasa pura some no escuro. Quem clareia é o contraste, não o olho.
    critico: acentoLegivelSobre(c.critico, c.noite, superficieAlta),
  };
}

function claro(c: Cores): EscalaSemantica {
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
    critico: acentoLegivelSobre(c.critico, bg, c.papel),
  };
}

export function escalaDoFundo(cores: Cores, fundo: Fundo): EscalaSemantica {
  return fundo === "claro" ? claro(cores) : escuro(cores);
}
