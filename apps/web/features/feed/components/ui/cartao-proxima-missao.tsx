import React from "react";
import Link from "next/link";
import { CameraIcon } from "@albora/ui-web";

export type ProximaMissao = { id: string; title: string; emoji: string | null; href: string };

export function CartaoProximaMissao({
  missao,
  rotulo,
}: {
  missao: ProximaMissao;
  rotulo: string;
}) {
  return (
    <Link
      href={missao.href}
      data-testid="cartao-proxima-missao"
      className="mb-4 flex items-center gap-3 rounded-token border border-acento-texto/30 bg-acento-superficie p-3.5 text-inherit no-underline transition-transform duration-instantaneo ease-mola active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <span className="grid size-9 flex-none place-items-center rounded-token bg-acento text-sobre-acento">
        <CameraIcon size={17} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <b className="tipo-label text-ink">{rotulo}</b>
        <span className="tipo-caption truncate text-ink-2">
          {missao.emoji ? `${missao.emoji} ` : ""}
          {missao.title}
        </span>
      </span>
      <span className="tipo-label ml-auto flex-none text-acento-texto">Fazer →</span>
    </Link>
  );
}
