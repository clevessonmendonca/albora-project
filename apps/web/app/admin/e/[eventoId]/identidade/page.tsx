import { buscarEventoDoHost } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { banco } from "@/lib/banco";
import { COOKIE_HOST, hostDoToken } from "@/lib/host-sessao";
import { CascaAdmin } from "../../../casca";
import { NavEvento } from "../nav-evento";
import { IdentidadeDoEvento } from "./identidade-cliente";

export const dynamic = "force-dynamic";

export default async function PaginaIdentidade({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const token = (await cookies()).get(COOKIE_HOST)?.value;
  const host = await hostDoToken(token);
  if (!host) redirect("/admin/entrar");

  const { eventoId } = await params;
  const evento = await buscarEventoDoHost(banco(), host.accountId, eventoId);
  if (!evento) notFound();

  const pack = PACKS[evento.packId];
  const nome = pack ? texto(pack, "evento.nome") : evento.slug;

  return (
    <CascaAdmin
      titulo={nome}
      subtitulo={`/${evento.slug} · Identidade`}
      voltar={{ rotulo: "Seus eventos", href: "/admin" }}
    >
      <NavEvento eventoId={eventoId} />
      <IdentidadeDoEvento
        eventoId={eventoId}
        packId={evento.packId}
        expectedGuestsInicial={evento.expectedGuests}
        identityTokensInicial={evento.identityTokens}
      />
    </CascaAdmin>
  );
}
