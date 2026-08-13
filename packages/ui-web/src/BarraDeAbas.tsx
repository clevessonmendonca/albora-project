import { Estrela } from "./Estrela";
import { IconeCamera, IconeGrade, IconePessoa, IconePilha } from "./icones";

/**
 * A barra de abas.
 *
 * Quatro abas e a câmera no meio — a forma que o Instagram consolidou. O que
 * muda é o conteúdo: não há aba de planejamento (fase 4) nem de conversa —
 * comentário mora na foto, não numa caixa de mensagens paralela. A aba viva usa
 * `--acento`; a câmera central é o botão de ação, elevado sobre a barra.
 */
export type AbaConvidado = "feed" | "missoes" | "album" | "minhas";

const ABAS = [
  { id: "feed", rotulo: "Feed", icone: <IconePilha /> },
  { id: "missoes", rotulo: "Missões", icone: <Estrela tamanho={22} /> },
  { id: "album", rotulo: "Álbum", icone: <IconeGrade /> },
  { id: "minhas", rotulo: "Minhas", icone: <IconePessoa /> },
] as const;

export function BarraDeAbas({ ativa }: { ativa: AbaConvidado }) {
  return (
    <nav className="relative grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-linha bg-bg px-3 pt-2.5 pb-[1.625rem]">
      {ABAS.map((aba, i) => (
        <span
          key={aba.id}
          className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo ${
            aba.id === ativa ? "text-acento" : "text-ink-3"
          }`}
          style={{ gridColumn: i < 2 ? i + 1 : i + 2 }}
        >
          {aba.icone}
          {aba.rotulo}
        </span>
      ))}

      <span className="col-start-3 -mt-5 grid size-[3.375rem] place-items-center justify-self-center rounded-full bg-acento text-sobre-acento shadow-acento">
        <IconeCamera />
      </span>
    </nav>
  );
}
