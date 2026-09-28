import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import {
  comConta,
  ehTemaDeInspiracao,
  listarIdeias,
  TEMAS_DE_INSPIRACAO,
  type TemaDeInspiracao,
} from "@albora/db";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { InspiracaoSalvar } from "@/features/admin/components/client/inspiracao-salvar";
import {
  Aviso,
  botaoDoPainel,
  Cartao,
  FaixaDeDestaque,
  IntroDaPagina,
  VazioIlustrado,
} from "@/features/admin/components/server/kit-do-painel";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

export const dynamic = "force-dynamic";

const ROTULO: Record<TemaDeInspiracao, string> = {
  fotos: "Fotos",
  decoracao: "Decoração",
  experiencia: "Experiência",
};

export default async function PaginaInspiracao({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tema?: string }>;
}) {
  const { eventId } = await params;
  const { tema: temaBruto } = await searchParams;
  const tema = ehTemaDeInspiracao(temaBruto) ? temaBruto : undefined;

  const host = await hostFromToken((await cookies()).get(HOST_COOKIE)?.value);
  if (!host) redirect("/admin/sign-in");

  const ideias = await comConta(getPool(), host.accountId, (c) =>
    listarIdeias(c, host.accountId, tema),
  );
  const salvas = ideias.filter((i) => i.salva).length;

  const base = `/admin/e/${eventId}/inspiracao`;
  const chip = (marcado: boolean) =>
    [
      "inline-flex min-h-11 items-center rounded-pilula border px-4 text-[13px] no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
      marcado
        ? "border-transparent bg-ink text-bg"
        : "border-linha bg-superficie text-ink-2 hover:text-ink",
    ].join(" ");

  return (
    <EventPageLayout eventId={eventId}>
      <IntroDaPagina
        eyebrow="Descubra possibilidades"
        titulo="Inspiração"
        subtitulo="O melhor da festa é viver. As lembranças ficam."
        acao={
          salvas > 0 ? (
            <span className={botaoDoPainel({ variant: "light" })}>Salvas · {salvas}</span>
          ) : undefined
        }
      />
      <FaixaDeDestaque
        eyebrow="Explore por tema"
        titulo="Ideias que já funcionaram em outras festas."
        descricao="Formas de pedir foto sem cobrar, onde colocar o QR e o que combinar antes de projetar."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link href={base} aria-current={!tema ? "true" : undefined} className={chip(!tema)}>
          Todos
        </Link>
        {TEMAS_DE_INSPIRACAO.map((t) => (
          <Link
            key={t}
            href={`${base}?tema=${t}`}
            aria-current={tema === t ? "true" : undefined}
            className={chip(tema === t)}
          >
            {ROTULO[t]}
          </Link>
        ))}
      </div>

      {ideias.length === 0 ? (
        <Cartao>
          <VazioIlustrado
            icone={<Lightbulb size={28} aria-hidden />}
            titulo="Nenhuma ideia neste tema"
            descricao="Volte para todos os temas para ver o acervo inteiro."
          />
        </Cartao>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ideias.map((ideia) => (
            <Cartao key={ideia.id} className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
                {ROTULO[ideia.tema]}
              </span>
              <h2 className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.125rem] text-ink">
                {ideia.titulo}
              </h2>
              <p className="m-0 flex-1 text-[13px] leading-relaxed text-ink-2">{ideia.corpo}</p>
              <div>
                <InspiracaoSalvar
                  ideiaId={ideia.id}
                  titulo={ideia.titulo}
                  salva={ideia.salva}
                />
              </div>
            </Cartao>
          ))}
        </div>
      )}

      <Aviso
        titulo="Comece pelo convite"
        descricao="Mostrar onde enviar a foto é o que mais aumenta a participação."
        acao={
          <Link href={`/admin/e/${eventId}/qrcode`} className={botaoDoPainel({ variant: "light" })}>
            Preparar convite →
          </Link>
        }
      />
    </EventPageLayout>
  );
}
