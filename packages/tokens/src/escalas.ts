import { acentoLegivelSobre, misturarHex, textoSobre } from "./cor";
import type { Background, Colors, SemanticScale } from "./types";

/** Escala derivada das cinco cores — lista fixa fica calibrada para o chão do dia em que foi escrita; derivar é o que faz "todo neutro é opacidade" ser verdade mecânica. */

/** Opacidades da rampa (DESIGN.md §2): são proporção, não cor — sobrevivem à troca de base. */
const RAMPA = {
  superficie: 0.045,
  superficieAlta: 0.095,
  linha: 0.12,
  ink3: 0.44,
  ink2: 0.66,
} as const;

const BRANCO = "#FFFFFF";

/** Chão escuro não é `noite` cru — `noite` é extremo de escala; levantar 9% dá cinza quente (clareia com o papel do evento, não cinza neutro) e a rampa mede a partir daqui. */
const CHAO_ESCURO = 0.09;

function escuro(c: Colors): SemanticScale {
  const sobre = (t: number) => misturarHex(c.noite, c.papel, t);
  const acima = (t: number) => sobre(CHAO_ESCURO + t);

  const bg = sobre(CHAO_ESCURO);
  // Texto de acento aparece em card também, e no escuro o card é MAIS claro que a página — derivar só contra o chão aprovaria uma cor que some em cima da superfície elevada.
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
    // No claro a elevação sobe para o branco, então a página fica um degrau ABAIXO do card — invertido em relação ao escuro, e de propósito.
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

export function escalaDoFundo(cores: Colors, background: Background): SemanticScale {
  return background === "light" ? claro(cores) : escuro(cores);
}
