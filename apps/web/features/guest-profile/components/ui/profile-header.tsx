"use client";

import React from "react";
import Link from "next/link";
import { BackIcon, Avatar } from "@albora/ui-web";
import { ProfileStats } from "./profile-stats";

export function ProfileHeader({
  nome,
  backHref,
  totalFotos,
  totalCurtidas,
}: {
  nome: string | null;
  backHref: string;
  totalFotos: number | null;
  totalCurtidas: number | null;
}) {
  return (
    <header className="flex items-start gap-3 pb-5 pt-1.5">
      <Link
        href={backHref}
        aria-label="Voltar"
        className="-ml-2.5 grid min-h-11 min-w-11 shrink-0 place-items-center text-ink no-underline transition-[opacity,transform] duration-instantaneo ease-mola hover:opacity-70 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <BackIcon />
      </Link>
      {nome ? (
        <Avatar name={nome} className="size-16 shrink-0 text-[1.125rem]" />
      ) : (
        <span aria-hidden className="size-16 shrink-0 rounded-full bg-ink-skeleton" />
      )}
      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="tipo-subtitle m-0 truncate text-ink">{nome ?? "Perfil"}</h1>
        {totalFotos !== null && totalCurtidas !== null && (
          <div className="mt-2.5">
            <ProfileStats totalFotos={totalFotos} totalCurtidas={totalCurtidas} />
          </div>
        )}
      </div>
    </header>
  );
}
