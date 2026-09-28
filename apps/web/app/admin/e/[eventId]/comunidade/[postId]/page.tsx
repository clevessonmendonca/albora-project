import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  comConta,
  lerPostDaComunidade,
  listarRespostas,
  type TopicoDaComunidade,
} from "@albora/db";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { ComunidadeResposta } from "@/features/admin/components/client/comunidade-resposta";
import {
  Cartao,
  Etiqueta,
  IntroDaPagina,
  NotaVazia,
  botaoDoPainel,
} from "@/features/admin/components/server/kit-do-painel";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";

export const dynamic = "force-dynamic";

const ROTULO: Record<TopicoDaComunidade, string> = {
  duvida: "Dúvida",
  ideia: "Ideia",
  experiencia: "Experiência",
  indicacao: "Indicação",
};

function quando(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

export default async function PaginaDaConversa({
  params,
}: {
  params: Promise<{ eventId: string; postId: string }>;
}) {
  const { eventId, postId } = await params;

  const host = await hostFromToken((await cookies()).get(HOST_COOKIE)?.value);
  if (!host) redirect("/admin/sign-in");

  const dados = await comConta(getPool(), host.accountId, async (c) => {
    const post = await lerPostDaComunidade(c, host.accountId, postId);
    if (!post) return null;
    return { post, respostas: await listarRespostas(c, host.accountId, postId) };
  });

  if (!dados) notFound();
  const { post, respostas } = dados;

  return (
    <EventPageLayout eventId={eventId}>
      <Link
        href={`/admin/e/${eventId}/comunidade`}
        className="mb-4 inline-block text-[13px] text-ink-2 no-underline hover:text-ink"
      >
        ← Voltar para a comunidade
      </Link>

      <IntroDaPagina eyebrow={ROTULO[post.topico]} titulo={post.titulo} />

      <div className="mx-auto flex max-w-[56rem] flex-col gap-5">
        <Cartao>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Etiqueta tom={post.meu ? "positivo" : "neutro"}>
              {post.meu ? "Sua conversa" : ROTULO[post.topico]}
            </Etiqueta>
            <small className="text-[12px] text-ink-2">{quando(post.criadoEm)}</small>
          </div>
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{post.corpo}</p>
        </Cartao>

        <Cartao>
          <h2 className="m-0 mb-4 font-[family-name:var(--fonte-titulo)] text-[1.125rem] text-ink">
            {respostas.length === 0
              ? "Sem resposta ainda"
              : `${respostas.length} ${respostas.length === 1 ? "resposta" : "respostas"}`}
          </h2>

          {respostas.length === 0 ? (
            <NotaVazia>
              Ninguém respondeu ainda. Se você já passou por isso, a sua resposta é a primeira.
            </NotaVazia>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {respostas.map((resposta) => (
                <li key={resposta.id} className="border-b border-linha pb-4 last:border-0 last:pb-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {resposta.meu && <Etiqueta tom="positivo">Sua resposta</Etiqueta>}
                    <small className="text-[12px] text-ink-2">{quando(resposta.criadoEm)}</small>
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                    {resposta.corpo}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <ComunidadeResposta postId={post.id} />
        </Cartao>

        <div>
          <Link
            href={`/admin/e/${eventId}/inspiracao`}
            className={botaoDoPainel({ variant: "light" })}
          >
            Ver ideias de outros eventos →
          </Link>
        </div>
      </div>
    </EventPageLayout>
  );
}
