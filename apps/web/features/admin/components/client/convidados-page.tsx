"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [aba, setAba] = useState<Aba>("pessoas");
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  // Falha de rede não pode virar "ninguém entrou": antes o catch gravava uma
  // lista vazia, o guard do efeito via `!== null` e nunca mais tentava — um
  // blip de rede virava "a festa não teve ninguém" pelo resto da sessão.
  const [erro, setErro] = useState(false);

  // A lista só é consultada quando a aba Pessoas está aberta.
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
    <div className="flex min-w-0 flex-col gap-6">
      <section className="grid gap-6 rounded-superficie bg-superficie-alta p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-[44rem]">
          <h2 className="m-0 font-titulo text-[clamp(1.75rem,3vw,2.75rem)] font-light leading-tight tracking-titulo text-ink">As memórias são feitas juntos.</h2>
          <p className="mb-0 mt-3 text-base leading-relaxed text-ink-2">Compartilhe o convite e acompanhe quem já chegou. Cada pessoa pode contribuir com seu próprio olhar.</p>
        </div>
        <Link href={`/admin/e/${eventoId}/qrcode`} className={`${adminClasses.primaryButton} justify-center`}>Compartilhar convite</Link>
      </section>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-5">

      <Abas
        rotulo="Convidados"
        ativa={aba}
        onMudar={setAba}
        abas={[
          { chave: "pessoas", rotulo: "Sua lista" },
          { chave: "participacao", rotulo: "Participação" },
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
      <aside aria-label="Convite e privacidade" className="flex min-w-0 flex-col gap-5">
        <AdminSection>
          <h2 className="tipo-subtitle m-0">Convide para participar</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">Envie o link do evento ou deixe o QR Code nas mesas. Seus convidados entram sem criar uma conta.</p>
          <Link href={`/admin/e/${eventoId}/qrcode`} className={adminClasses.secondaryButton}>Ver convite e QR Code</Link>
        </AdminSection>
        <AdminSection>
          <h2 className="tipo-subtitle m-0">Permissões</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">Defina como os registros aparecem no evento e confira os consentimentos dos convidados.</p>
          <Link href={`/admin/e/${eventoId}/consent`} className={adminClasses.secondaryButton}>Ver consentimentos</Link>
        </AdminSection>
      </aside>
      </div>
    </div>
  );
}
