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
    <header className="flex items-start gap-3 pb-4 pt-1.5">
      <Link
        href={backHref}
        aria-label="Voltar"
        className="mt-1 text-ink no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
      >
        <BackIcon />
      </Link>
      {nome ? (
        <Avatar name={nome} className="size-16 text-[1.125rem]" />
      ) : (
        <span aria-hidden className="size-16 rounded-full bg-ink-skeleton" />
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="m-0 truncate font-titulo text-[1.125rem] tracking-titulo text-ink">
          {nome ?? "Perfil"}
        </h1>
        {totalFotos !== null && totalCurtidas !== null && (
          <div className="mt-2">
            <ProfileStats totalFotos={totalFotos} totalCurtidas={totalCurtidas} />
          </div>
        )}
      </div>
    </header>
  );
}

