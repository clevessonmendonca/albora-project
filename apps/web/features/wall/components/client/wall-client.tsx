"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@albora/ui-web";
import { useWallDisplay } from "../../lib/use-wall-display";
import { useWallPairing } from "../../lib/use-wall-pairing";
import { SHELL, type FaseWall } from "../../lib/types";
import { WallPairingScreen } from "./wall-pairing-screen";
import { WallParticipationCounter } from "./wall-participation-counter";
import { WallStage } from "./wall-stage";

/** Nada corta na vertical — `contain` em todos os modelos exceto `cheio`, que só recebe foto horizontal (regra no CSS e na seleção). */

function WallClock() {
  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  );

  useEffect(() => {
    const atualizar = () =>
      setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    const proxTick = 60_000 - (Date.now() % 60_000);
    let id: ReturnType<typeof setTimeout>;
    const iniciar = () => {
      atualizar();
      id = setInterval(atualizar, 60_000);
    };
    const primeiroTick = setTimeout(iniciar, proxTick);
    return () => {
      clearTimeout(primeiroTick);
      clearInterval(id);
    };
  }, []);

  return (
    <time
      dateTime={hora}
      className="tipo-label absolute left-[clamp(0.75rem,2vw,1.5rem)] bottom-[clamp(0.75rem,2vw,1.5rem)] font-titulo text-[clamp(0.9rem,1.6vw,1.2rem)] tabular-nums text-ink-2 opacity-70"
    >
      {hora}
    </time>
  );
}

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
    contadores,
  } = useWallDisplay(fase, onNaoAutorizado);

  useEffect(() => {
    if (fase !== "exibindo") return;
    function teclaPausa(ev: KeyboardEvent) {
      if (ev.key === " " || ev.key === "p" || ev.key === "P") {
        ev.preventDefault();
        if (!alternandoPanico) void alternarPanico();
      }
    }
    window.addEventListener("keydown", teclaPausa);
    return () => window.removeEventListener("keydown", teclaPausa);
  }, [fase, alternandoPanico, alternarPanico]);

  if (fase === "pareando") {
    return <WallPairingScreen variaveis={variaveis} codigo={codigo} />;
  }

  const cenaKey = cena ? `${cena.modelo}-${cena.ids.join(",")}` : "vazio";

  return (
    <main style={variaveis as CSSProperties} className={SHELL}>
      {/*
       * Motion do telão inteiro mora aqui — WallStage e o contador só consomem
       * as classes. Uma curva só (`--curva`) em toda troca de cena; a deriva
       * ambiente é contínua e independente do relógio de rotação.
       */}
      <style>{`
        @keyframes wall-entrar {
          from { opacity: 0; transform: scale(1.015); }
          to   { opacity: 1; transform: scale(1); }
        }
        .wall-cena-entra { animation: wall-entrar var(--tempo-lento) var(--curva) both; }

        @keyframes parede-deriva {
          from { transform: scale(1.14) translate3d(0, 0, 0); }
          to   { transform: scale(1.22) translate3d(-1.4%, -1%, 0); }
        }
        .parede-deriva { animation: parede-deriva 26s var(--curva) infinite alternate; }

        @keyframes parede-zoom {
          from { transform: scale(1); }
          to   { transform: scale(1.045); }
        }
        .parede-zoom { animation: parede-zoom 30s var(--curva) infinite alternate; }

        @keyframes parede-subir {
          from { opacity: 0; transform: translateY(0.5rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .parede-subir { animation: parede-subir var(--tempo) var(--curva) both; }

        @media (prefers-reduced-motion: reduce) {
          .wall-cena-entra, .parede-deriva, .parede-zoom, .parede-subir { animation: none !important; }
        }
      `}</style>
      {!panico && cena ? (
        <div key={cenaKey} className="wall-cena-entra absolute inset-0">
          <WallStage cena={cena} itemDe={itemDe} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center p-8">
          <div className="max-w-[32ch] text-center">
            <p className="tipo-title tipo-balance m-0 text-[clamp(1.25rem,3vw,2rem)] leading-[1.25] text-ink-2">
              {panico
                ? "Telão pausado"
                : carregou
                  ? "Aguardando fotos"
                  : "Conectando…"}
            </p>
            <p className="tipo-body m-0 mt-4 text-[clamp(0.95rem,1.6vw,1.15rem)] leading-relaxed text-ink-3">
              {panico
                ? "Nenhuma foto nova aparece enquanto o telão estiver pausado."
                : carregou
                  ? "As fotos da festa aparecem aqui assim que os convidados começarem a enviar."
                  : "Conectando ao evento. Aguarde alguns instantes."}
            </p>
          </div>
        </div>
      )}

      <WallClock />
      <WallParticipationCounter contadores={contadores} />

      <button
        type="button"
        aria-label={panico ? "Retomar telão" : "Pausar telão"}
        disabled={alternandoPanico}
        onClick={() => void alternarPanico()}
        className={cn(
          "tipo-label absolute right-[clamp(0.75rem,2vw,1.5rem)] bottom-[clamp(0.75rem,2vw,1.5rem)]",
          "min-h-11 min-w-11 rounded-pilula border border-linha bg-bg-vidro px-[0.85rem] py-2 shadow-suave",
          "font-[inherit] text-[clamp(0.75rem,1.2vw,0.95rem)] uppercase tracking-rotulo text-ink-2",
          "transition-[opacity,transform] duration-instantaneo ease-mola active:scale-[0.96]",
          alternandoPanico ? "cursor-wait opacity-60" : "cursor-pointer opacity-85 hover:opacity-100",
        )}
      >
        {alternandoPanico ? "…" : panico ? "Retomar" : "Pausar"}
      </button>
    </main>
  );
}
