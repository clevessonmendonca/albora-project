import React from "react";
import { GuestShell, EntryColumn, FinePrint } from "@albora/ui-web";

export function NoSession({ slug }: { slug: string }) {
  return (
    <GuestShell hideStatusBar>
      <EntryColumn>
        <div className="text-center">
          <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-superficie-alta text-[1.75rem]">
            📸
          </span>
          <h1 className="mb-3 font-titulo text-[clamp(1.5rem,7vw,1.75rem)] font-medium leading-[1.14] tracking-titulo [text-wrap:balance]">
            Falta você entrar
          </h1>
          <p className="m-0 leading-relaxed text-ink-2">
            É rápido: diz seu primeiro nome e as fotos da festa aparecem.
          </p>
        </div>

        <a
          href={`/e/${encodeURIComponent(slug)}`}
          className="grid w-full place-items-center rounded-pilula bg-acento px-[1.125rem] py-[1.125rem] font-semibold text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
        >
          Entrar
        </a>

        <FinePrint>Só leva alguns segundos.</FinePrint>
      </EntryColumn>
    </GuestShell>
  );
}
