"use client";

import type { ReactNode } from "react";

export function GateNotice({ children }: { children: ReactNode }) {
  return (
    <div className="elev-1 mb-4 flex items-start gap-3 rounded-token px-4 py-3.5">
      <span className="pulso mt-1.5 size-[0.4375rem] shrink-0 rounded-full bg-acento" />
      <span className="text-[0.8125rem] leading-snug text-ink-2">{children}</span>
    </div>
  );
}

export function MissionBanner({
  index,
  total,
  title,
}: {
  index: number;
  total: number;
  title: string;
}) {
  return (
    <div className="rounded-token bg-acento px-4 py-3.5 text-sobre-acento">
      <p className="m-0 text-[0.5625rem] uppercase tracking-rotulo opacity-75">
        Missão {String(index).padStart(2, "0")} de {String(total).padStart(2, "0")}
      </p>
      <p className="mt-1 font-titulo text-[1.0625rem] leading-tight">{title}</p>
    </div>
  );
}

export function ConsentNote({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-token bg-superficie px-4 py-3.5 text-[0.8125rem] leading-snug text-ink-2">
      {children}
    </p>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[0.85rem] text-critico">
      {children}
    </p>
  );
}
