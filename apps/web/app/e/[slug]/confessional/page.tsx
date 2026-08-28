import { PACKS, resolvePackText } from "@albora/packs";
import { withEvent, eventPack } from "@albora/db";
import Link from "next/link";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";
import { getPool } from "@/lib/db";
import { FloatingNav, GuestShell } from "@albora/ui-web";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** Confessionário — gravação reusa a câmera via `/photo?prompt=…&video=1`. */
export default async function ConfessionalPage({ params }: Props) {
  const { slug } = await params;
  const r = await resolveOpenEvent(slug);
  if (r.estado !== "aberto") {
    return (
      <EventNotice
        title="Essa festa não está aberta agora"
        body="Volte pelo QR da mesa quando o envio estiver liberado."
        showRescue
      />
    );
  }

  const session = await guestSession();
  if (!isSameEventSession(session, r.evento.eventoId)) {
    return <NoSession slug={slug} />;
  }

  const packId = await withEvent(getPool(), r.evento.eventoId, (c) =>
    eventPack(c, r.evento.eventoId),
  );
  const pack = packId ? PACKS[packId] : undefined;
  if (!pack?.confessionario?.length) {
    return (
      <EventNotice
        title="Confessionário indisponível"
        body="Este evento não tem confessionário ativo."
        showRescue
      />
    );
  }

  const base = `/e/${encodeURIComponent(slug)}`;
  const title = resolvePackText(pack, "confessionario.titulo");
  const lede = resolvePackText(pack, "confessionario.lede");

  return (
    <>
      <GuestShell>
        <div className="flex flex-1 flex-col px-[calc(var(--espaco)*5)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(var(--espaco)*8)]">
          <h1 className="m-0 font-titulo text-[1.875rem] font-light leading-[1.2] tracking-titulo">
            {title}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{lede}</p>

          {pack.confessionario.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                Nenhuma pergunta disponível no momento.
              </p>
            </div>
          ) : (
            <ul className="mt-8 flex list-none flex-col gap-3.5 p-0">
              {pack.confessionario.map((prompt) => {
                const label = resolvePackText(pack, prompt.chaveTitulo);
                const href = `${base}/photo?prompt=${encodeURIComponent(prompt.chaveTitulo)}&video=1`;
                return (
                  <li key={prompt.id}>
                    <Link
                      href={href}
                      className="block rounded-token border border-linha bg-superficie px-5 py-4.5 text-inherit no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento"
                    >
                      <span className="block font-titulo text-[1.125rem] font-light leading-[1.32]">
                        {label}
                      </span>
                      <span className="mt-2 block font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                        Gravar vídeo
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-10 text-center">
            <Link
              href={`${base}/cover`}
              className="font-titulo text-[0.8125rem] uppercase tracking-rotulo text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-acento"
            >
              Voltar à capa
            </Link>
          </p>
        </div>
      </GuestShell>
      <FloatingNav base={base} linkComponent={Link} />
    </>
  );
}
