"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@albora/ui-web";
import { endImpersonationAction } from "@/features/console/actions";

export type ActiveImpersonation = { id: string; targetAccountId: string; expiresAt: Date };

/**
 * Persistente e NÃO fechável (spec §7/§11) — por isso não existe `onClose`,
 * só `onEnd`. Renderizada duas vezes (topo do console em `ConsoleShell` e
 * rodapé da sidebar em `ConsoleNav`) — quem rola uma tela longa perde o
 * topo de vista, e a única coisa pior que impersonar é impersonar sem
 * lembrar que está impersonando. `bg-critico text-sobre-acento` é o mesmo
 * par usado nos avisos críticos do app do anfitrião — cor reforça, o texto
 * é quem carrega o significado, nunca só a cor. Estático: nenhuma classe
 * de animação em loop — um banner piscando numa sessão de 30 minutos é
 * tortura, e o texto já diz tudo.
 */
export function ImpersonationBanner({ active }: { active: ActiveImpersonation | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!active) return null;

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 bg-critico px-4 py-2 text-sobre-acento">
      <span className="tipo-den-corpo">
        {`Você está vendo como ${active.targetAccountId} — sessão da equipe.`}
      </span>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await endImpersonationAction(active.id);
            router.refresh();
          })
        }
      >
        Encerrar sessão
      </Button>
    </div>
  );
}
