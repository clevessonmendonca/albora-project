import { PACKS, resolvePackText } from "@albora/packs";
import { withEvent, eventPack } from "@albora/db";
import Link from "next/link";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { NoSession } from "@/features/guest/components/client/no-session";
import { getPool } from "@/lib/db";
import { Badge, FloatingNav, GuestHeader, GuestMain, GuestShell, SkipLink } from "@albora/ui-web";

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
      <SkipLink />

      <GuestShell>
        <GuestMain>
          <GuestHeader title={title} homeHref={`${base}/cover`} />
          <p className="mt-1 tipo-body text-ink-2">{lede}</p>

          <ul className="mt-8 flex list-none flex-col gap-3 p-0">
            {pack.confessionario.map((prompt) => {
              const label = resolvePackText(pack, prompt.chaveTitulo);
              const href = `${base}/photo?prompt=${encodeURIComponent(prompt.chaveTitulo)}&video=1`;
              return (
                <li key={prompt.id}>
                  <Link
                    href={href}
                    className="elev-1 flex items-center justify-between gap-4 rounded-token px-5 py-4.5 text-inherit no-underline transition-[transform,box-shadow] duration-instantaneo ease-mola active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <span className="tipo-body-lg min-w-0 font-light leading-[1.32] text-ink">
                      {label}
                    </span>
                    <Badge tone="accent" className="shrink-0">
                      Gravar vídeo
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </GuestMain>
      </GuestShell>
      <FloatingNav base={base} linkComponent={Link} />
    </>
  );
}
