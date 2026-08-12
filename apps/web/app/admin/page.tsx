import { listarEventosDoHost } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { banco } from "@/lib/banco";
import { COOKIE_HOST, hostDoToken } from "@/lib/host-sessao";
import { CascaAdmin, SecaoAdmin, estilosAdmin } from "./casca";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const token = (await cookies()).get(COOKIE_HOST)?.value;
  const host = await hostDoToken(token);
  if (!host) redirect("/admin/entrar");

  const eventos = await listarEventosDoHost(banco(), host.accountId);

  return (
    <CascaAdmin titulo="Seu painel" subtitulo={host.email}>
      <SecaoAdmin>
        <p style={{ margin: "0 0 1.25rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          Durante a festa, abra o evento para pausar o telão ou marcar que há menores.
          Crie um evento novo quando precisar.
        </p>
        <Link href="/admin/novo" style={estilosAdmin.botaoPrimario}>
          Criar evento
        </Link>
      </SecaoAdmin>

      {eventos.length > 0 && (
        <SecaoAdmin>
          <h2
            style={{
              margin: "0 0 0.5rem",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "1.125rem",
            }}
          >
            Seus eventos
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {eventos.map((e) => {
              const pack = PACKS[e.packId];
              const nome = pack ? texto(pack, "evento.nome") : e.slug;
              const quando = e.comecaEm.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <li key={e.eventoId}>
                  <Link href={`/admin/e/${e.eventoId}`} style={estilosAdmin.linkLista}>
                    <span style={{ fontFamily: "var(--fonte-titulo)" }}>{nome}</span>
                    <span style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-3)" }}>
                      /{e.slug} · {quando}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SecaoAdmin>
      )}
    </CascaAdmin>
  );
}
