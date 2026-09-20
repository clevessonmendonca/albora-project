"use client";

import { useEffect, useState } from "react";
import { GuestFunnel } from "./guest-funnel";
import { Pessoas } from "./pessoas";
import { Abas } from "./abas";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import type { Pessoa } from "@/features/admin/lib/descobertas";

type Aba = "participacao" | "pessoas";

export function ConvidadosPage({
  eventoId,
  pessoaInicial,
}: {
  eventoId: string;
  pessoaInicial: string | null;
}) {
  const [aba, setAba] = useState<Aba>(pessoaInicial ? "pessoas" : "participacao");
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);

  // Só busca quando a aba abre: a lista pode ter centenas de linhas e a aba
  // Participação já é o que o anfitrião olha primeiro.
  useEffect(() => {
    if (aba !== "pessoas" || pessoas !== null) return;
    let vivo = true;
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventoId}/guests`);
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as { pessoas?: Pessoa[] };
        if (vivo) setPessoas(corpo.pessoas ?? []);
      } catch {
        if (vivo) setPessoas([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [aba, pessoas, eventoId]);

  return (
    <div className="flex flex-col gap-5">
      <Abas
        rotulo="Convidados"
        ativa={aba}
        onMudar={setAba}
        abas={[
          { chave: "participacao", rotulo: "Participação" },
          { chave: "pessoas", rotulo: "Pessoas" },
        ]}
      />

      {aba === "participacao" ? (
        <GuestFunnel eventoId={eventoId} />
      ) : pessoas === null ? (
        <AdminSection>
          <div aria-hidden className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-token bg-superficie-alta" />
            ))}
          </div>
        </AdminSection>
      ) : (
        <Pessoas eventoId={eventoId} pessoas={pessoas} pessoaInicial={pessoaInicial} />
      )}
    </div>
  );
}
