import Link from "next/link";
import { AdminCard } from "@/features/admin/components/server/admin-shell";
import { Apagar, NovaConversa, Responder, SalvarIdeia } from "@/features/admin/components/client/comunidade-acoes";
import { carregarConversa, carregarFeed, carregarIdeias } from "@/features/admin/data/carregar-descobrir";
import {
  autoria,
  escreverCursor,
  lerCursor,
  quando,
  ROTULO_DO_TEMA,
  ROTULO_DO_TOPICO,
  TEMAS,
  TOPICOS,
  type IdeiaNaTela,
  type PostNaTela,
} from "@/features/admin/lib/descobrir-tela";
import { ehTemaDeInspiracao, ehTopicoDaComunidade } from "@albora/core";

/**
 * Comunidade e Inspiração — os dois destinos do grupo "Descobrir" (ADR 0023).
 *
 * A URL mora no painel do evento, mas o dado é de conta: nenhuma consulta
 * destas telas usa o `eventId`, e a porta que as abre é `app.account_id`.
 */

function Chips({
  base,
  atual,
  opcoes,
}: {
  base: string;
  atual: string | undefined;
  opcoes: readonly { valor: string; rotulo: string; descricao: string }[];
}) {
  const itens = [{ valor: "", rotulo: "Tudo", descricao: "Sem filtro" }, ...opcoes];

  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {itens.map((o) => {
        const ativo = (atual ?? "") === o.valor;
        return (
          <li key={o.valor || "tudo"}>
            <Link
              href={o.valor ? `${base}?filtro=${o.valor}` : base}
              aria-current={ativo ? "true" : undefined}
              title={o.descricao}
              className={`inline-flex min-h-11 items-center rounded-pilula border px-4 tipo-label no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                ativo
                  ? "border-acento bg-acento-superficie text-acento-texto"
                  : "border-linha text-ink-3 hover:border-acento-borda hover:text-ink"
              }`}
            >
              {o.rotulo}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Assinatura({ meu, criadoEm }: { meu: boolean; criadoEm: string }) {
  return (
    <span className="tipo-caption text-ink-3">
      {autoria(meu)} · {quando(criadoEm)}
    </span>
  );
}

function CartaoDeConversa({ base, post }: { base: string; post: PostNaTela }) {
  return (
    <AdminCard>
      <span className="tipo-label text-ink-3">{ROTULO_DO_TOPICO[post.topico].rotulo}</span>
      <h3 className="tipo-subtitle mt-1 mb-0 text-ink">
        <Link
          href={`${base}/${post.id}`}
          className="text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-acento-texto"
        >
          {post.titulo}
        </Link>
      </h3>
      <p className="tipo-body mt-2 mb-3 line-clamp-3 max-w-[60ch] whitespace-pre-line text-ink-2">
        {post.corpo}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Assinatura meu={post.meu} criadoEm={post.criadoEm} />
        <span className="tipo-caption text-ink-3">
          {post.respostas === 1 ? "1 resposta" : `${post.respostas} respostas`}
        </span>
      </div>
    </AdminCard>
  );
}

export async function Comunidade({
  eventId,
  filtro,
  antes,
}: {
  eventId: string;
  filtro?: string | undefined;
  antes?: string | undefined;
}) {
  const base = `/admin/e/${eventId}/comunidade`;
  const topico = ehTopicoDaComunidade(filtro) ? filtro : undefined;
  const { posts, temMais } = await carregarFeed({ topico, antesDe: lerCursor(antes) });
  const ultimo = posts[posts.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Entre anfitriões</h2>
        <p className="tipo-body m-0 max-w-[52ch] text-ink-2">
          Um lugar para trocar ideia com quem está organizando uma festa — antes e depois dela.
        </p>
      </section>

      <Chips
        base={base}
        atual={topico}
        opcoes={TOPICOS.map((t) => ({ valor: t, ...ROTULO_DO_TOPICO[t] }))}
      />

      <NovaConversa />

      {posts.length === 0 ? (
        <AdminCard>
          <h3 className="tipo-subtitle m-0 text-ink">
            {topico ? "Nada por aqui ainda neste assunto" : "A conversa começa com alguém"}
          </h3>
          <p className="tipo-body mt-2 mb-0 max-w-[52ch] text-ink-2">
            {topico
              ? "Escolha outro assunto acima, ou abra a primeira conversa deste."
              : "Ninguém publicou ainda. Uma dúvida sua provavelmente é a de mais gente."}
          </p>
        </AdminCard>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <CartaoDeConversa key={p.id} base={base} post={p} />
          ))}
        </div>
      )}

      {temMais && ultimo && (
        <Link
          href={`${base}?${topico ? `filtro=${topico}&` : ""}antes=${encodeURIComponent(
            escreverCursor(ultimo),
          )}`}
          className="inline-flex min-h-12 items-center self-start rounded-pilula border border-linha px-5 tipo-label text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
        >
          Conversas mais antigas
        </Link>
      )}
    </div>
  );
}

export async function Conversa({ eventId, postId }: { eventId: string; postId: string }) {
  const base = `/admin/e/${eventId}/comunidade`;
  const { post, respostas } = await carregarConversa(postId);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={base}
        className="tipo-label self-start text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
      >
        ← Comunidade
      </Link>

      <AdminCard>
        <span className="tipo-label text-ink-3">{ROTULO_DO_TOPICO[post.topico].rotulo}</span>
        <h2 className="tipo-title mt-1 mb-2 text-ink">{post.titulo}</h2>
        <Assinatura meu={post.meu} criadoEm={post.criadoEm} />
        <p className="tipo-body mt-4 mb-0 max-w-[60ch] whitespace-pre-line text-ink-2">
          {post.corpo}
        </p>
        {post.meu && (
          <div className="mt-5">
            <Apagar
              url={`/api/admin/comunidade/${post.id}`}
              rotulo="Apagar conversa"
              confirmacao="Apagar leva junto as respostas."
              depois={base}
            />
          </div>
        )}
      </AdminCard>

      <section className="flex flex-col gap-4">
        <h3 className="tipo-label m-0 text-ink-3">
          {respostas.length === 1 ? "1 resposta" : `${respostas.length} respostas`}
        </h3>

        {respostas.map((r) => (
          <AdminCard key={r.id}>
            <Assinatura meu={r.meu} criadoEm={r.criadoEm} />
            <p className="tipo-body mt-2 mb-0 max-w-[60ch] whitespace-pre-line text-ink-2">
              {r.corpo}
            </p>
            {r.meu && (
              <div className="mt-4">
                <Apagar
                  url={`/api/admin/comunidade/respostas/${r.id}`}
                  rotulo="Apagar resposta"
                  confirmacao="Some para todo mundo."
                />
              </div>
            )}
          </AdminCard>
        ))}
      </section>

      <AdminCard>
        <Responder postId={post.id} />
      </AdminCard>
    </div>
  );
}

function CartaoDeIdeia({ ideia }: { ideia: IdeiaNaTela }) {
  return (
    <AdminCard>
      <span className="tipo-label text-ink-3">{ROTULO_DO_TEMA[ideia.tema].rotulo}</span>
      <h3 className="tipo-subtitle mt-1 mb-2 text-ink">{ideia.titulo}</h3>
      <p className="tipo-body m-0 max-w-[60ch] whitespace-pre-line text-ink-2">{ideia.corpo}</p>
      <div className="mt-5">
        <SalvarIdeia ideiaId={ideia.id} salva={ideia.salva} />
      </div>
    </AdminCard>
  );
}

export async function Inspiracao({
  eventId,
  filtro,
}: {
  eventId: string;
  filtro?: string | undefined;
}) {
  const base = `/admin/e/${eventId}/inspiracao`;
  const tema = ehTemaDeInspiracao(filtro) ? filtro : undefined;
  const ideias = await carregarIdeias(tema);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Para se inspirar</h2>
        <p className="tipo-body m-0 max-w-[52ch] text-ink-2">
          Pequenas escolhas mudam o jeito como vocês vão lembrar do dia. Aqui ficam as ideias que
          ajudam as fotos a acontecerem sozinhas.
        </p>
      </section>

      <Chips
        base={base}
        atual={tema}
        opcoes={TEMAS.map((t) => ({ valor: t, ...ROTULO_DO_TEMA[t] }))}
      />

      {ideias.length === 0 ? (
        <AdminCard>
          <h3 className="tipo-subtitle m-0 text-ink">Nada publicado neste tema ainda</h3>
          <p className="tipo-body mt-2 mb-0 max-w-[52ch] text-ink-2">
            Enquanto isso, as missões são o caminho mais direto: elas pedem a foto que vocês
            querem ver no álbum.
          </p>
          <Link
            href={`/admin/e/${eventId}/missions`}
            className="mt-5 inline-flex min-h-12 items-center rounded-pilula border border-linha px-5 tipo-label text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
          >
            Criar uma missão
          </Link>
        </AdminCard>
      ) : (
        <div className="flex flex-col gap-4">
          {ideias.map((i) => (
            <CartaoDeIdeia key={i.id} ideia={i} />
          ))}
        </div>
      )}
    </div>
  );
}
