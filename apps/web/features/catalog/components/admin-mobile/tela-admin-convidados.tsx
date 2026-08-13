import type { CSSProperties } from "react";
import type { Pack } from "@albora/packs";
import { Badge, StatusBar } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { NavAdmin } from "@/features/catalog/components/nav-admin";

export function TelaAdminConvidados({ pack }: { pack: Pack }) {
  const esperados = 150;
  const fotografaram = 112;
  const pct = Math.round((fotografaram / esperados) * 100);

  const funil = [
    { r: "Escanearam o QR", n: 138 },
    { r: "Entraram na festa", n: 126 },
    { r: "Enviaram ao menos 1 foto", n: fotografaram },
  ];

  return (
    <ChaoClaro pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">Convidados</p>
        <Badge tone="accent">{pct}% de participação</Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <div className="rounded-token bg-superficie p-4 shadow-suave">
          <p className="font-titulo text-[2.5rem] font-light leading-none tabular-nums text-acento-texto">
            {pct}%
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-2">
            {fotografaram} de {esperados} convidados fotografaram
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-pilula bg-linha [--progresso:var(--progresso-val)]"
            style={{ "--progresso-val": `${pct}%` } as CSSProperties}
          >
            <div className="h-full w-[var(--progresso)] rounded-pilula bg-acento" />
          </div>
        </div>

        <p className="mt-4 mb-2 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">O funil</p>
        <div className="flex flex-col gap-2">
          {funil.map((f) => (
            <div
              key={f.r}
              className="flex items-center justify-between gap-3 rounded-token bg-superficie px-4 py-3"
            >
              <span className="text-[0.8125rem] text-ink-2">{f.r}</span>
              <span className="font-titulo text-base tabular-nums">{f.n}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[0.75rem] text-ink-3">
          Números agregados. A Albora não manda mensagem pra convidado — ele não recebe e-mail nem
          SMS, e ninguém aparece por nome aqui.
        </p>
      </div>

      <NavAdmin active="convidados" />
    </ChaoClaro>
  );
}
