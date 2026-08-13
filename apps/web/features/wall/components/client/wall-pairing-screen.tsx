import type { CSSProperties } from "react";
import { cn } from "@albora/ui-web";
import { SHELL } from "../../lib/types";

export function WallPairingScreen({
  variaveis,
  codigo,
}: {
  variaveis: Record<string, string>;
  codigo: string | null;
}) {
  return (
    <main
      style={variaveis as CSSProperties}
      className={cn(SHELL, "grid place-items-center p-8")}
    >
      <div className="max-w-[32ch] text-center">
        <p className="m-0 text-[clamp(1rem,2vw,1.5rem)] uppercase tracking-rotulo text-ink-2">
          Para ligar o telão
        </p>
        <p className="my-6 font-titulo text-[clamp(3rem,12vw,8rem)] tracking-[0.15em] text-acento tabular-nums">
          {codigo ?? "······"}
        </p>
        <p className="m-0 text-[clamp(0.95rem,1.8vw,1.35rem)] leading-normal text-ink-2">
          No app do evento, abra as configurações e digite este código. Vale para
          quem já entrou na festa — convidado ou anfitrião.
        </p>
      </div>
    </main>
  );
}
