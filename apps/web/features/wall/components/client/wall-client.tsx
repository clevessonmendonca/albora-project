"use client";

import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@albora/ui-web";
import { useWallDisplay } from "../../lib/use-wall-display";
import { useWallPairing } from "../../lib/use-wall-pairing";
import { SHELL, type FaseWall } from "../../lib/types";
import { WallPairingScreen } from "./wall-pairing-screen";
import { WallStage } from "./wall-stage";

/**
 * O telão do salão (spec 010), em duas fases.
 *
 * **Parear:** a TV pede um código, mostra na tela, e faz poll. Alguém que já
 * está no evento — convidado ou anfitrião — digita o código no app e autoriza.
 * O crachá volta num cookie `HttpOnly`; a TV nunca toca nele.
 *
 * **Exibir:** com o crachá no cookie, a TV lê `/api/wall` e roda os oito
 * modelos. 🔴 Nada corta na vertical: todo modelo desenha com `contain`, menos
 * `cheio`, que só recebe foto horizontal — a regra está no CSS e na seleção.
 */

export function WallClient({ initialVars }: { initialVars: Record<string, string> }) {
  const [fase, setFase] = useState<FaseWall>("pareando");
  const [variaveis, setVariaveis] = useState(initialVars);

  const onPronto = useCallback((vars: Record<string, string>) => {
    setVariaveis(vars);
    setFase("exibindo");
  }, []);

  const onNaoAutorizado = useCallback(() => {
    setFase("pareando");
  }, []);

  const { codigo } = useWallPairing(fase, onPronto);
  const {
    cena,
    carregou,
    panico,
    alternandoPanico,
    alternarPanico,
    itemDe,
  } = useWallDisplay(fase, onNaoAutorizado);

  if (fase === "pareando") {
    return <WallPairingScreen variaveis={variaveis} codigo={codigo} />;
  }

  return (
    <main style={variaveis as CSSProperties} className={SHELL}>
      {!panico && cena ? (
        <WallStage cena={cena} itemDe={itemDe} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <p className="p-8 text-center text-2xl text-ink-3">
            {panico
              ? "Telão pausado. Nenhuma foto nova aparece na parede."
              : carregou
                ? "As fotos da festa aparecem aqui."
                : "Conectando ao telão…"}
          </p>
        </div>
      )}

      <button
        type="button"
        aria-label={panico ? "Retomar telão" : "Pausar telão"}
        disabled={alternandoPanico}
        onClick={() => void alternarPanico()}
        className={cn(
          "absolute right-[clamp(0.75rem,2vw,1.5rem)] bottom-[clamp(0.75rem,2vw,1.5rem)]",
          "min-h-11 min-w-11 rounded-pilula border border-linha bg-bg-vidro px-[0.85rem] py-2",
          "font-[inherit] text-[clamp(0.75rem,1.2vw,0.95rem)] uppercase tracking-[0.04em] text-ink-2 backdrop-blur-[6px]",
          alternandoPanico ? "cursor-wait opacity-60" : "cursor-pointer opacity-85",
        )}
      >
        {alternandoPanico ? "…" : panico ? "Retomar" : "Pausar"}
      </button>
    </main>
  );
}
