"use client";

import { useEffect, useState } from "react";
import { GuestFunnel } from "./guest-funnel";
import { Pessoas } from "./pessoas";
import { Abas } from "./abas";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
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
  // Falha de rede não pode virar "ninguém entrou": antes o catch gravava uma
  // lista vazia, o guard do efeito via `!== null` e nunca mais tentava — um
  // blip de rede virava "a festa não teve ninguém" pelo resto da sessão.
  const [erro, setErro] = useState(false);

  // Só busca quando a aba abre: a lista pode ter centenas de linhas e a aba
  // Participação já é o que o anfitrião olha primeiro.
  useEffect(() => {
    if (aba !== "pessoas" || pessoas !== null || erro) return;
    let vivo = true;
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventoId}/guests`);
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as { pessoas?: Pessoa[] };
        if (vivo) setPessoas(corpo.pessoas ?? []);
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [aba, pessoas, erro, eventoId]);

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
      ) : erro ? (
        <AdminSection>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p role="alert" className="tipo-body m-0 text-critico">
              Não foi possível carregar as pessoas.
            </p>
            <button
              type="button"
              onClick={() => setErro(false)}
              className={adminClasses.secondaryButton}
            >
              Tentar de novo
            </button>
          </div>
        </AdminSection>
      ) : pessoas === null ? (
        <AdminSection>
          {/* A barra de busca sempre aparece: reservar o espaço dela evita o
              empurrão de 60px quando a lista chega. */}
          <div aria-hidden className="mb-4 flex animate-pulse flex-wrap items-center gap-3">
            <span className="min-h-11 min-w-0 flex-1 rounded-token bg-superficie-alta" />
            <span className="min-h-11 w-28 rounded-pilula bg-superficie-alta" />
          </div>
          {/* Mesma estrutura da linha real — avatar de 40px, duas linhas de
              texto e o mesmo py-3 — para cada linha entrar na altura em que o
              skeleton já estava. A quantidade de linhas não dá para prever. */}
          <ul aria-hidden className="m-0 list-none p-0">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex animate-pulse items-center gap-3 border-b border-linha py-3">
                <span className="size-10 shrink-0 rounded-full bg-superficie-alta" />
                <span className="flex min-w-0 flex-1 flex-col">
                  {/* `1lh` = altura de linha, não tamanho de fonte: é o que a
                      linha real ocupa. Com `1em` o skeleton ficava 5px curto. */}
                  <span className="tipo-body h-[1lh] w-32 rounded-token bg-superficie-alta" />
                  <span className="tipo-caption h-[1lh] w-44 rounded-token bg-superficie-alta" />
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      ) : (
        <Pessoas eventoId={eventoId} pessoas={pessoas} pessoaInicial={pessoaInicial} />
      )}
    </div>
  );
}
