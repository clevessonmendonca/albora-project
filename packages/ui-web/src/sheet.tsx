"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Dialog } from "./dialog";
import { cn } from "./variants";

/** Fração da altura do painel a partir da qual soltar o arrasto fecha a folha. */
const LIMIAR_FECHAR_FRACAO = 0.3;
/** Velocidade (px/ms) a partir da qual um "flick" fecha mesmo sem cruzar o limiar de distância. */
const LIMIAR_VELOCIDADE_PX_MS = 0.5;

export function BottomSheet({
  title,
  open,
  onClose,
  children,
  footer,
  titleId,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  titleId?: string;
}) {
  const headingId = titleId ?? "sheet-title";
  const painelRef = useRef<HTMLDivElement>(null);
  const arrastoRef = useRef<{ inicioY: number; inicioTimestamp: number } | null>(null);
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  // Cada abertura começa do zero — sem isso, reabrir a folha herdaria o
  // deslocamento do arrasto da vez anterior.
  useEffect(() => {
    if (open) {
      setDeslocamento(0);
      setArrastando(false);
      arrastoRef.current = null;
    }
  }, [open]);

  function handlePointerDown(ev: ReactPointerEvent<HTMLDivElement>) {
    arrastoRef.current = { inicioY: ev.clientY, inicioTimestamp: ev.timeStamp };
    setArrastando(true);
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  }

  function handlePointerMove(ev: ReactPointerEvent<HTMLDivElement>) {
    if (!arrastoRef.current) return;
    // Só arrasta pra baixo — pra cima não faz sentido pra dispensar a folha.
    setDeslocamento(Math.max(0, ev.clientY - arrastoRef.current.inicioY));
  }

  function handlePointerUp(ev: ReactPointerEvent<HTMLDivElement>) {
    const inicio = arrastoRef.current;
    arrastoRef.current = null;
    setArrastando(false);
    ev.currentTarget.releasePointerCapture?.(ev.pointerId);
    if (!inicio) return;

    const altura = painelRef.current?.getBoundingClientRect().height ?? 0;
    // `ev.timeStamp` (relógio monotônico do próprio evento) em vez de
    // `Date.now()` — o scheduler do React também lê o relógio de parede, e
    // um `Date.now()` aqui ficaria sujeito a essa interferência.
    const decorridoMs = Math.max(1, ev.timeStamp - inicio.inicioTimestamp);
    const velocidade = deslocamento / decorridoMs;
    const cruzouLimiarDeDistancia = altura > 0 && deslocamento > altura * LIMIAR_FECHAR_FRACAO;
    const foiUmFlick = velocidade > LIMIAR_VELOCIDADE_PX_MS;

    if (cruzouLimiarDeDistancia || foiUmFlick) {
      // Empurra o painel pra fora da tela antes de fechar de fato — o
      // fechamento do Dialog ainda anima o scrim, e o painel já está fora
      // de vista quando ele terminar.
      setDeslocamento(altura > 0 ? altura + 40 : Math.max(deslocamento, 200));
      onClose();
    } else {
      setDeslocamento(0);
    }
  }

  const posicaoControladaPeloArrasto = arrastando || deslocamento > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={headingId}
      className="place-items-end pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div
        ref={painelRef}
        data-testid="bottom-sheet-panel"
        className={cn(
          "grid max-h-[min(78dvh,32rem)] w-[min(26rem,100%)] grid-rows-[auto_auto_1fr_auto] gap-3.5 overflow-hidden rounded-superficie border border-linha p-5 elev-3",
          /*
           * Entrada: translateY(100%) → 0 na curva de mola (Task 2). `starting:`
           * é o `@starting-style` do Tailwind v4 — a folha nasce fora da tela e
           * anima pra posição final assim que o `<dialog>` abre.
           */
          "translate-y-0 transition-transform duration-[var(--tempo-rapido)] ease-mola starting:translate-y-full",
          /*
           * Saída: reage ao `data-state=closing` que o Dialog pai marca (via
           * `group`), na curva de saída — sem duplicar o timer de fechamento.
           */
          "group-data-[state=closing]:translate-y-full group-data-[state=closing]:ease-saida",
        )}
        style={
          posicaoControladaPeloArrasto
            ? {
                transform: `translateY(${deslocamento}px)`,
                // Enquanto o dedo está na tela o painel segue 1:1, sem easing;
                // ao soltar, a transição CSS acima assume (fecha ou volta).
                transitionDuration: arrastando ? "0ms" : undefined,
              }
            : undefined
        }
        onClick={(ev) => ev.stopPropagation()}
      >
        <div
          data-testid="bottom-sheet-handle"
          role="presentation"
          aria-hidden="true"
          className="mx-auto h-1.5 w-9 shrink-0 touch-none rounded-pilula bg-linha"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <h2 id={headingId} className="m-0 font-titulo text-[1.0625rem] font-normal">
          {title}
        </h2>
        <div className="min-h-0 overflow-auto">{children}</div>
        {footer}
      </div>
    </Dialog>
  );
}
