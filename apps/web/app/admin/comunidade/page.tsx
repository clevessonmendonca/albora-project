import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MessageCircle, Search } from "lucide-react";
import {
  comConta,
  ehTopicoDaComunidade,
  listarPostsDaComunidade,
  TOPICOS_DA_COMUNIDADE,
  type PostDaComunidade,
  type TopicoDaComunidade,
} from "@albora/db";
import { CascaDaConta } from "@/features/admin/components/server/casca-da-conta";
import { ComunidadeNovaConversa } from "@/features/admin/components/client/comunidade-nova-conversa";
import {
  acaoTextual,
  botaoDoPainel,
  CabecalhoDeCartao,
  Cartao,
  ColunaDeApoio,
  Etiqueta,
  FaixaDeDestaque,
  GradeDePaineis,
  IntroDaPagina,
  VazioIlustrado,
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
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export default async function PaginaComunidade({
  searchParams,
}: {
  searchParams: Promise<{ topico?: string; busca?: string; antes?: string }>;
}) {
  const { topico: topicoBruto, busca, antes } = await searchParams;
  const topico = ehTopicoDaComunidade(topicoBruto) ? topicoBruto : undefined;

  const host = await hostFromToken((await cookies()).get(HOST_COOKIE)?.value);
  if (!host) redirect("/admin/sign-in");

  const POR_PAGINA = 20;
  const cursor = lerCursor(antes);
  // Pede um a mais para saber se há página seguinte sem uma segunda consulta.
  const pagina: PostDaComunidade[] = await comConta(getPool(), host.accountId, (c) =>
    listarPostsDaComunidade(c, host.accountId, {
      topico,
      termo: busca,
      limite: POR_PAGINA + 1,
      antesDe: cursor,
    }),
  );
  const temMais = pagina.length > POR_PAGINA;
  const posts = temMais ? pagina.slice(0, POR_PAGINA) : pagina;
  const ultimo = posts[posts.length - 1];

  const base = "/admin/comunidade";
  const maisAntigas = (() => {
    if (!temMais || !ultimo) return null;
    const p = new URLSearchParams();
    if (topico) p.set("topico", topico);
    if (busca) p.set("busca", busca);
    p.set("antes", `${ultimo.criadoEm.toISOString()}~${ultimo.id}`);
    return `${base}?${p.toString()}`;
  })();
  const filtro = (alvo: TopicoDaComunidade | undefined) => {
    const p = new URLSearchParams();
    if (alvo) p.set("topico", alvo);
    if (busca) p.set("busca", busca);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  const chip = (marcado: boolean) =>
    [
      "inline-flex min-h-11 items-center rounded-pilula border px-4 text-[13px] no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
      marcado
        ? "border-transparent bg-ink text-bg"
        : "border-linha bg-superficie text-ink-2 hover:text-ink",
    ].join(" ");

  return (
    <CascaDaConta>
      <IntroDaPagina
        eyebrow="Entre anfitriões"
        titulo="Comunidade"
        subtitulo="Quem já passou por isso conta como fez. Pergunte, responda, indique."
        acao={<ComunidadeNovaConversa />}
      />
      <FaixaDeDestaque
        eyebrow="Uma boa ideia merece ser compartilhada"
        titulo="Ninguém organiza um evento sozinho."
        descricao="As conversas ficam entre anfitriões — nada do que está aqui aparece para os convidados do seu evento."
      />

      <GradeDePaineis>
        <div className="flex flex-col gap-5">
          <Cartao>
            <form method="get" action={base} className="mb-4 flex gap-2">
              {topico && <input type="hidden" name="topico" value={topico} />}
              <label className="relative flex-1">
                <span className="sr-only">Buscar conversa</span>
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2"
                />
                <input
                  name="busca"
                  defaultValue={busca ?? ""}
                  placeholder="Buscar por assunto ou palavra"
                  className="min-h-11 w-full rounded-[9px] border border-linha bg-superficie py-2 pl-9 pr-3 text-sm text-ink outline-none focus-visible:border-acento-texto"
                />
              </label>
              <button type="submit" className={botaoDoPainel({ variant: "light" })}>
                Buscar
              </button>
            </form>

            <div className="mb-5 flex flex-wrap gap-2">
              <Link
                href={filtro(undefined)}
                aria-current={!topico ? "true" : undefined}
                className={chip(!topico)}
              >
                Todos
              </Link>
              {TOPICOS_DA_COMUNIDADE.map((t) => (
                <Link
                  key={t}
                  href={filtro(t)}
                  aria-current={topico === t ? "true" : undefined}
                  className={chip(topico === t)}
                >
                  {ROTULO[t]}
                </Link>
              ))}
            </div>

            {posts.length === 0 ? (
              <VazioIlustrado
                icone={<MessageCircle size={28} aria-hidden />}
                titulo={busca || topico ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                descricao={
                  busca || topico
                    ? "Tente outro termo ou volte para todos os assuntos."
                    : "A primeira pergunta pode ser a sua — é assim que o resto aparece."
                }
              />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`${base}/${post.id}`}
                      className="block rounded-xl border border-linha p-4 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-borda"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Etiqueta tom={post.meu ? "positivo" : "neutro"}>
                          {ROTULO[post.topico]}
                        </Etiqueta>
                        <small className="text-[12px] text-ink-2">{quando(post.criadoEm)}</small>
                        {post.meu && <small className="text-[12px] text-ink-2">· sua</small>}
                      </div>
                      <strong className="block font-[family-name:var(--fonte-titulo)] text-[1.0625rem] text-ink">
                        {post.titulo}
                      </strong>
                      <p className="m-0 mt-1 line-clamp-2 text-[13px] text-ink-2">{post.corpo}</p>
                      <small className="mt-2 block text-[12px] text-acento-texto">
                        {post.respostas === 0
                          ? "Sem resposta ainda"
                          : `${post.respostas} ${post.respostas === 1 ? "resposta" : "respostas"}`}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {maisAntigas && (
              <Link
                href={maisAntigas}
                className={`${botaoDoPainel({ variant: "light", width: "full" })} mt-4`}
              >
                Conversas mais antigas →
              </Link>
            )}

            {cursor && (
              <Link href={base} className={`${acaoTextual} mt-4 inline-block`}>
                ← Voltar para as recentes
              </Link>
            )}
          </Cartao>
        </div>

        <ColunaDeApoio>
          <Cartao>
            <CabecalhoDeCartao titulo="Inspire-se" subtitulo="Ideias prontas para adaptar." />
            <Link
              href="/admin/inspiracao"
              className={botaoDoPainel({ variant: "gold", width: "full" })}
            >
              Explorar ideias →
            </Link>
          </Cartao>

          <Cartao>
            <CabecalhoDeCartao titulo="Por onde começar?" />
            <p className="m-0 text-[13px] text-ink-2">
              Pergunta boa é pergunta concreta: quantas pessoas, que horário, o que já tentou. É o
              que faz quem já passou por isso responder.
            </p>
          </Cartao>
        </ColunaDeApoio>
      </GradeDePaineis>
    </CascaDaConta>
  );
}

/** `antes` chega como `<iso>~<uuid>`. Valor malformado volta como página inicial, nunca como erro. */
function lerCursor(bruto: string | undefined): { criadoEm: Date; id: string } | undefined {
  if (!bruto) return undefined;
  const [iso, id] = bruto.split("~");
  if (!iso || !id) return undefined;
  const criadoEm = new Date(iso);
  if (Number.isNaN(criadoEm.getTime())) return undefined;
  return { criadoEm, id };
}
