"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

function ChoreItem({
  text,
  index,
  onHover,
}: {
  text: string;
  index: number;
  onHover: (text: string | null) => void;
}) {
  const [active, setActive] = useState(false);
  const num = String(index + 1).padStart(2, "0");

  return (
    <li
      className="tarefa-item relative grid cursor-default grid-cols-[auto_1fr] items-center gap-5 border-b border-bg/10 py-[1.125rem]"
      onMouseEnter={() => {
        setActive(true);
        onHover(text);
      }}
      onMouseLeave={() => {
        setActive(false);
        onHover(null);
      }}
      onTouchStart={() => {
        setActive((v) => {
          onHover(v ? null : text);
          return !v;
        });
      }}
    >
      <span className="text-[0.875rem] tabular-nums text-bg/40">{num}</span>
      <span
        className="text-[clamp(0.9375rem,1.2vw,1.0625rem)] leading-normal text-bg"
        style={{
          opacity: active ? 0.35 : 1,
          textDecoration: active ? "line-through" : "none",
          transitionProperty: "opacity",
          transitionDuration: "var(--tempo-rapido)",
          transitionTimingFunction: "var(--curva)",
        }}
      >
        {text}
      </span>
    </li>
  );
}

function FloatingCard({ text }: { text: string | null }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const visible = useRef(false);

  const animate = useCallback(() => {
    pos.current.x += (target.current.x - pos.current.x) * 0.12;
    pos.current.y += (target.current.y - pos.current.y) * 0.12;

    const el = cardRef.current;
    if (el) {
      el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) rotate(-3deg)`;
    }

    if (visible.current) {
      raf.current = requestAnimationFrame(animate);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX + 16;
      target.current.y = e.clientY - 24;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (text) {
      visible.current = true;
      raf.current = requestAnimationFrame(animate);
    } else {
      visible.current = false;
      cancelAnimationFrame(raf.current);
    }
    return () => cancelAnimationFrame(raf.current);
  }, [text, animate]);

  return (
    <div
      ref={cardRef}
      className="pointer-events-none fixed left-0 top-0 z-50 grid gap-1.5 rounded-superficie px-4 py-3 shadow-alta"
      style={{
        backgroundColor: "var(--acento)",
        color: "var(--sobre-acento)",
        opacity: text ? 1 : 0,
        maxWidth: "20rem",
        transitionProperty: "opacity",
        transitionDuration: "var(--tempo-rapido)",
        transitionTimingFunction: "var(--curva)",
      }}
      aria-hidden="true"
    >
      <s className="text-[clamp(0.875rem,1.1vw,1rem)] leading-normal opacity-90">
        {text ?? " "}
      </s>
      <b className="text-[0.625rem] uppercase tracking-rotulo">
        a Albora faz
      </b>
    </div>
  );
}

export function ChoresEliminatedSection() {
  const [hoveredText, setHoveredText] = useState<string | null>(null);

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
            <ChoreItem
              key={chore}
              text={chore}
              index={i}
              onHover={setHoveredText}
            />
          ))}
        </ul>
      </div>

      <FloatingCard text={hoveredText} />
    </Section>
  );
}
