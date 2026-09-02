"use client";

import { useState } from "react";
import { Heading, Label, Section } from "../pieces";

const CHORES = [
  "Cobrar o fotógrafo pelo pendrive",
  "Pedir foto no grupo do WhatsApp",
  "Esperar todo mundo mandar por e-mail",
  "Juntar as fotos num Google Drive",
  "Descobrir de quem é cada foto",
  "Pedir para tirar foto 'com o meu celular também'",
  "Apagar as repetidas uma por uma",
  "Imprimir em tamanho errado e refazer",
  "Montar slideshow de última hora",
  "Recolher câmeras descartáveis e revelar",
  "Perder as fotos porque o celular encheu",
  "Correr atrás de quem saiu sem mandar",
] as const;

function ChoreItem({ text, index }: { text: string; index: number }) {
  const [active, setActive] = useState(false);
  const num = String(index + 1).padStart(2, "0");

  return (
    <li
      className="tarefa-item relative grid cursor-default grid-cols-[auto_1fr] items-center gap-5 border-b border-linha py-[1.125rem]"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={() => setActive((v) => !v)}
    >
      <span className="text-[0.875rem] tabular-nums text-ink-3">{num}</span>
      <span
        className="text-[clamp(0.9375rem,1.2vw,1.0625rem)] leading-normal text-ink"
        style={{
          opacity: active ? 0.35 : 1,
          transitionProperty: "opacity",
          transitionDuration: "var(--tempo-rapido)",
          transitionTimingFunction: "var(--curva)",
        }}
      >
        {text}
      </span>

      <span
        className="pointer-events-none absolute left-10 top-0 z-10 grid gap-1.5 rounded-superficie px-4 py-3 shadow-alta"
        style={{
          backgroundColor: "var(--acento)",
          color: "var(--sobre-acento)",
          opacity: active ? 1 : 0,
          transform: active ? "rotate(-3deg) scale(1)" : "rotate(-4deg) scale(0.96)",
          transitionProperty: "opacity, transform",
          transitionDuration: "var(--tempo-rapido)",
          transitionTimingFunction: "var(--curva)",
        }}
        aria-hidden="true"
      >
        <s className="text-[clamp(0.875rem,1.1vw,1rem)] leading-normal opacity-90">
          {text}
        </s>
        <b className="text-[0.625rem] uppercase tracking-rotulo">
          O Albora faz
        </b>
      </span>
    </li>
  );
}

export function ChoresEliminatedSection() {
  return (
    <Section className="py-[clamp(3rem,7vw,6rem)] px-[clamp(1.125rem,4vw,2.75rem)]">
      <div className="rounded-superficie bg-ink p-[clamp(2rem,5vw,4.5rem)_clamp(1.5rem,4vw,3.75rem)] text-bg">
        <div className="mb-[clamp(2rem,4vw,3.5rem)] flex flex-wrap gap-[clamp(2rem,5vw,5rem)]">
          <div>
            <p className="m-0 font-titulo text-[clamp(2rem,5vw,3.5rem)] font-light">
              {CHORES.length}
            </p>
            <p className="m-0 text-[0.75rem] text-bg/60">
              tarefas que o casal<br />não precisa mais fazer
            </p>
          </div>
          <div>
            <p className="m-0 font-titulo text-[clamp(2rem,5vw,3.5rem)] font-light">
              4
            </p>
            <p className="m-0 text-[0.75rem] text-bg/60">
              toques do QR até<br />a primeira foto
            </p>
          </div>
        </div>

        <Label>Menos trabalho, mais festa</Label>
        <Heading
          size="clamp(1.75rem, 4vw, 3rem)"
          className="max-w-[24ch] text-bg"
        >
          {CHORES.length} coisas que deixam de ser problema seu
        </Heading>

        <ul
          className="m-0 mt-[clamp(1.5rem,3vw,2.5rem)] grid list-none grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-x-[clamp(2rem,5vw,4rem)] p-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--bg)/8 1px, transparent 1px)",
            backgroundSize: "1.5rem 1.5rem",
          }}
        >
          {CHORES.map((chore, i) => (
            <ChoreItem key={chore} text={chore} index={i} />
          ))}
        </ul>
      </div>
    </Section>
  );
}
