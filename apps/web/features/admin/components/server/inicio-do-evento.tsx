import React from "react";
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { Camera, Images, MonitorPlay, QrCode, Star, Users } from "lucide-react";
import { faseDoEvento } from "@albora/core";
import {
  lerMetricasAoVivo,
  lerRetencaoDoEvento,
  listarDestaques,
  listarEventosDoHost,
  withEvent,
} from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { signGet } from "@/lib/r2";
import { prazosDeRetencao } from "@/features/admin/lib/prazos-de-retencao";
import { montarRetrospectivaServida } from "@/lib/domain/album/retrospectiva";
import { AdminCard, AdminSection } from "@/features/admin/components/server/admin-card";
import {
  acaoTextual,
  botaoDoPainel,
  CabecalhoDeCartao,
  Cartao,
  ColunaDeApoio,
  Estatistica,
  Estatisticas,
  FaixaDeDestaque,
  GradeDePaineis,
  IntroDaPagina,
  NotaVazia,
  Progresso,
} from "@/features/admin/components/server/kit-do-painel";
import { ContagemRegressiva } from "@/features/admin/components/client/contagem-regressiva";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { PreEventPromo } from "@/features/admin/components/client/pre-event-promo";
import { PrimeiraVisita } from "@/features/admin/components/client/primeira-visita";
import { proximosPassos, type Passo } from "@/features/admin/lib/proximos-passos";
import type { AdminEventPageContext } from "@/features/admin/data/load-event-page";

const GET_TTL_SEGUNDOS = 900;

function dataPorExtenso(quando: Date): string {
  return quando.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function contarEventosDoHost(): Promise<number> {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) return 1;
  const eventos = await listarEventosDoHost(getPool(), host.accountId);
  return eventos.length;
}

async function paginaPublicaDoEvento(slug: string): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}/e/${slug}`;
}

/** Linha de contexto (protótipo §5.1.2): tipo do evento pelo pack, nunca string fixa, mais o link para a lista. */
function ContextoDoEvento({ tipoEvento, totalEventos }: { tipoEvento: string; totalEventos: number }) {
  return (
    <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
      <span className="capitalize">{tipoEvento}</span>
      <span aria-hidden>·</span>
      <span>Evento independente</span>
      <Link href="/admin" className={`${acaoTextual} ml-auto`}>
        {totalEventos} {totalEventos === 1 ? "evento" : "eventos"} →
      </Link>
    </div>
  );
}

/** As mesmas 5 pendências reais de `proximos-passos.ts` (missões, capa, identidade, convidados, gate), só que aqui contadas para a barra de progresso — o módulo não expõe o total, então o card conta direto pelos mesmos sinais. */
function progressoDoPreparo(sinais: {
  missoes: number;
  temCapa: boolean;
  temIdentidade: boolean;
  convidadosEsperados: number;
  gateDefinido: boolean;
}) {
  const pendencias = [
    sinais.missoes === 0,
    !sinais.temCapa,
    !sinais.temIdentidade,
    sinais.convidadosEsperados === 0,
    !sinais.gateDefinido,
  ];
  const total = pendencias.length;
  return { feitos: total - pendencias.filter(Boolean).length, total };
}

function CartaoDePreparo({
  passos,
  progresso,
}: {
  passos: Passo[];
  progresso: { feitos: number; total: number };
}) {
  return (
    <Cartao>
      <CabecalhoDeCartao titulo="Deixe tudo pronto" />
      <Progresso feitos={progresso.feitos} total={progresso.total} />
      {passos.length === 0 ? (
        <NotaVazia>Tudo pronto por aqui — o resto é aproveitar a festa.</NotaVazia>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {passos.map((passo) => (
            <li key={passo.id}>
              <Link
                href={passo.href}
                className="flex items-center justify-between gap-3 rounded-token border border-linha px-4 py-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {passo.rotulo}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-3">
                    {passo.porque}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-acento-texto">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Cartao>
  );
}

function CartaoDoAlbum({ base, thumbs }: { base: string; thumbs: string[] }) {
  return (
    <Cartao>
      <CabecalhoDeCartao titulo="Um primeiro olhar para o álbum" />
      {thumbs.length === 0 ? (
        <NotaVazia>O álbum deste evento está pronto para receber as primeiras fotos.</NotaVazia>
      ) : (
        <ul className="m-0 mb-4 grid list-none grid-cols-4 gap-2 p-0">
          {thumbs.map((url, i) => (
            <li key={i}>
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-media bg-superficie-alta object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <Link href={`${base}/album`} className={acaoTextual}>
        Abrir álbum →
      </Link>
    </Cartao>
  );
}

function CartaoDeProximoPasso({ passo, base }: { passo: Passo | undefined; base: string }) {
  return (
    <div className="rounded-[17px] bg-gradient-chao-quente p-[25px] text-ink shadow-suave">
      <h3 className="m-0 mb-2 font-[family-name:var(--fonte-titulo)] text-[1.125rem]">
        Próximo passo
      </h3>
      <p className="m-0 mb-4 text-[13px] text-ink-2">
        {passo ? passo.porque : "Tudo em dia. Que tal compartilhar o convite mais uma vez?"}
      </p>
      <Link
        href={passo ? passo.href : `${base}/qrcode`}
        className={botaoDoPainel({ variant: "gold", width: "full" })}
      >
        {passo ? passo.rotulo : "Compartilhar convite"} →
      </Link>
    </div>
  );
}

function CartaoDeAcessoRapido({ base }: { base: string }) {
  const atalhos = [
    { href: `${base}/qrcode`, icone: QrCode, rotulo: "Meu QR", legenda: "Compartilhar" },
    { href: `${base}/album`, icone: Images, rotulo: "Álbum", legenda: "As fotos da festa" },
    { href: `${base}/telao`, icone: MonitorPlay, rotulo: "Telão", legenda: "Ao vivo no salão" },
  ];

  return (
    <Cartao>
      <CabecalhoDeCartao titulo="Acesso rápido" />
      <div className="grid grid-cols-3 gap-2">
        {atalhos.map(({ href, icone: Icone, rotulo, legenda }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-token border border-linha px-2 py-3.5 text-center no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
          >
            <Icone size={18} className="text-acento-texto" />
            <span className="text-[13px] font-semibold text-ink">{rotulo}</span>
            <span className="text-[11px] text-ink-3">{legenda}</span>
          </Link>
        ))}
      </div>
    </Cartao>
  );
}

function CartaoDoDia({ base }: { base: string }) {
  return (
    <Cartao>
      <CabecalhoDeCartao titulo="No dia da festa" />
      <p className="m-0 mb-4 text-[13px] text-ink-2">
        Deixe o telão pareado e testado antes dos convidados chegarem.
      </p>
      <Link href={`${base}/telao`} className={botaoDoPainel({ variant: "light", width: "full" })}>
        Preparar telão →
      </Link>
    </Cartao>
  );
}

function CartaoDeDescoberta({ base }: { base: string }) {
  return (
    <Cartao className="bg-acento-fundo">
      <CabecalhoDeCartao titulo="Enquanto isso" />
      <div className="flex flex-col gap-2">
        <Link href={`${base}/comunidade`} className={botaoDoPainel({ variant: "light", width: "full" })}>
          Conversar →
        </Link>
        <Link href={`${base}/inspiracao`} className={botaoDoPainel({ variant: "light", width: "full" })}>
          Ver ideias
        </Link>
      </div>
    </Cartao>
  );
}

/** Hero de celebração (protótipo §5.1.3) — fundo quente, pill do tipo, contagem regressiva ao vivo. */
function HeroDeCelebracao({
  tipoEvento,
  nome,
  comecaEm,
  base,
  paginaPublica,
}: {
  tipoEvento: string;
  nome: string;
  comecaEm: Date;
  base: string;
  paginaPublica: string;
}) {
  return (
    <div className="mb-6 grid gap-8 rounded-[17px] bg-gradient-chao-quente p-[clamp(1.5rem,4vw,3rem)] text-ink shadow-alta lg:grid-cols-2 lg:items-center">
      <div className="min-w-0">
        <span className="inline-flex rounded-pilula bg-superficie-alta px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
          ✦ {tipoEvento}
        </span>
        <div className="my-4 h-px w-16 bg-linha" aria-hidden />
        <h2 className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[var(--tracking-titulo)] text-ink">
          {nome}
        </h2>
        <p className="m-0 mt-3 text-sm text-ink-2">{dataPorExtenso(comecaEm)}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`${base}/identity`} className={botaoDoPainel({ variant: "gold" })}>
            Personalizar evento →
          </Link>
          <a
            href={paginaPublica}
            target="_blank"
            rel="noreferrer"
            className={botaoDoPainel({ variant: "outline" })}
          >
            Ver página do evento
          </a>
        </div>
      </div>
      <div className="rounded-[17px] bg-superficie-alta p-6">
        <div className="mb-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-ink-3">
          <span>Contagem regressiva</span>
          <span aria-hidden>✧</span>
        </div>
        <ContagemRegressiva paraISO={comecaEm.toISOString()} />
        <p className="m-0 mt-6 text-center text-[11px] uppercase tracking-[0.15em] text-ink-3">
          Cada momento vai contar a partir de agora
        </p>
      </div>
    </div>
  );
}

export async function InicioDoEvento({ ctx }: { ctx: AdminEventPageContext }) {
  const { evento, eventoId, name, canManageCoupleOnly, missoes } = ctx;
  const base = `/admin/e/${eventoId}`;
  const fase = faseDoEvento(evento, new Date());
  const pack = PACKS[evento.packId];
  const tipoEvento = pack ? resolvePackText(pack, "evento.nome") : evento.slug;

  const sinais = {
    fase,
    temCapa: Boolean(evento.coverImageKey),
    temIdentidade: Object.keys(evento.identityTokens).length > 0,
    missoes,
    convidadosEsperados: evento.expectedGuests,
    gateDefinido: evento.interacaoAbreEm !== null,
  };
  const passos = proximosPassos(sinais, base);
  const progresso = progressoDoPreparo(sinais);

  const totalEventos = await contarEventosDoHost();

  const intro = (
    <>
      <IntroDaPagina
        eyebrow="Seu evento"
        titulo="Cada encontro merece ser lembrado."
        subtitulo="Preparem o evento e guardem cada olhar desse dia."
        acao={
          <Link href={`${base}/qrcode`} className={botaoDoPainel({ variant: "primary" })}>
            Compartilhar convite
          </Link>
        }
      />
      <ContextoDoEvento tipoEvento={tipoEvento} totalEventos={totalEventos} />
    </>
  );

  const preparo = (
    <PreEventPromo
      eventId={evento.eventoId}
      sinais={{
        missoes,
        temIdentidade: sinais.temIdentidade,
        convidadosEsperados: evento.expectedGuests,
        planoPago: evento.plan !== "free",
        gateDefinido: sinais.gateDefinido,
      }}
      startsAt={evento.comecaEm}
    />
  );

  const controles = (
    <EventControls
      eventId={evento.eventoId}
      plan={evento.plan}
      initial={evento.moderacao}
      initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
      initialStatus={evento.status}
      canManageCoupleOnly={canManageCoupleOnly}
    />
  );

  if (fase === "rascunho") {
    return (
      <div className="flex flex-col gap-5">
        {intro}
        <PrimeiraVisita />
        <FaixaDeDestaque
          eyebrow="Antes de tudo"
          titulo={`${name} ainda não está no ar`}
          descricao="O Álbora junta as fotos que os convidados tiram na festa. Eles escaneiam o QR da mesa e fotografam — sem baixar nada. As fotos aparecem no telão e viram o álbum do evento. Prepare o que falta abaixo e publique quando estiver pronto."
        />
        <CartaoDePreparo passos={passos} progresso={progresso} />
        {preparo}
        {controles}
      </div>
    );
  }

  if (fase === "antes") {
    const [metricas, destaques, paginaPublica] = await Promise.all([
      withEvent(getPool(), eventoId, (c) => lerMetricasAoVivo(c, eventoId)),
      withEvent(getPool(), eventoId, (c) => listarDestaques(c, eventoId)),
      paginaPublicaDoEvento(evento.slug),
    ]);
    const thumbs = await Promise.all(
      metricas.ultimas.map((f) => signGet(f.chaveThumb, GET_TTL_SEGUNDOS)),
    );

    return (
      <div className="flex flex-col gap-5">
        {intro}
        <HeroDeCelebracao
          tipoEvento={tipoEvento}
          nome={name}
          comecaEm={evento.comecaEm}
          base={base}
          paginaPublica={paginaPublica}
        />
        <Estatisticas>
          <Estatistica icone={<Camera size={16} />} valor={String(metricas.totalFotos)} legenda="fotos no álbum" />
          <Estatistica icone={<Users size={16} />} valor={String(metricas.sessoesComUpload)} legenda="convidados que já fotografaram" />
          <Estatistica icone={<Star size={16} />} valor={String(destaques.length)} legenda="fotos em destaque" />
        </Estatisticas>
        <GradeDePaineis>
          <div className="flex flex-col gap-5">
            <CartaoDePreparo passos={passos} progresso={progresso} />
            <CartaoDoAlbum base={base} thumbs={thumbs} />
          </div>
          <ColunaDeApoio>
            <CartaoDeProximoPasso passo={passos[0]} base={base} />
            <CartaoDeAcessoRapido base={base} />
            <CartaoDoDia base={base} />
            <CartaoDeDescoberta base={base} />
          </ColunaDeApoio>
        </GradeDePaineis>
        {preparo}
        {controles}
      </div>
    );
  }

  if (fase === "durante") {
    return (
      <div className="flex flex-col gap-5">
        {intro}
        <LiveSummary eventoId={eventoId} />
        {controles}
      </div>
    );
  }

  const jobs = await withEvent(getPool(), eventoId, (c) => lerRetencaoDoEvento(c, eventoId));
  const prazos = prazosDeRetencao(jobs);
  const retrospectiva = await montarRetrospectivaServida(eventoId);

  return (
    <div className="flex flex-col gap-5">
      {intro}
      <AdminCard variant="highlight">
        <h2 className="tipo-title m-0 mb-3 text-ink">A festa acabou</h2>
        <p className="tipo-body m-0 max-w-[56ch] text-ink-2">
          O que os convidados guardaram está aqui. Revise o que quiser esconder, destaque o que
          merece e leve o álbum para onde vocês quiserem.
        </p>
      </AdminCard>
      <LiveSummary eventoId={eventoId} />

      {retrospectiva.total > 0 && (
        <AdminSection>
          <h2 className="tipo-subtitle m-0 mb-2 text-ink">A noite em poucas fotos</h2>
          <p className="tipo-body m-0 mb-5 max-w-[52ch] text-ink-2">
            {retrospectiva.sequenciaUnica
              ? "As fotos chegaram todas por volta da mesma hora, então isto é uma sequência, não uma linha do tempo."
              : "Um recorte de cada momento da festa, na ordem em que aconteceu. O que vocês destacaram entra primeiro."}
          </p>

          <ol className="m-0 flex list-none flex-col gap-6 p-0">
            {retrospectiva.momentos.map((momento) => (
              <li key={momento.id}>
                <h3 className="tipo-label m-0 mb-3 text-ink-3">{momento.titulo}</h3>
                <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
                  {momento.fotos.map((foto) => (
                    <li key={foto.id} className="relative">
                      <img
                        src={foto.urlThumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full rounded-media bg-superficie-alta object-cover object-top"
                      />
                      {foto.destacada && (
                        <span
                          aria-hidden
                          className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-acento text-sobre-acento"
                        >
                          <Star size={13} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </AdminSection>
      )}

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">As memórias</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`${base}/album`} className={botaoDoPainel({ variant: "primary" })}>
            Abrir o álbum
          </Link>
          <Link href={`${base}/guests`} className={botaoDoPainel({ variant: "light" })}>
            Ver quem participou
          </Link>
        </div>
      </AdminSection>

      {(prazos.exportaEm || prazos.apagaEm || prazos.jaExportou) && (
        <AdminSection>
          <h2 className="tipo-subtitle m-0 mb-2 text-ink">Até quando ficam aqui</h2>
          <p className="tipo-body m-0 mb-4 max-w-[52ch] text-ink-2">
            O Álbora guarda as fotos por um ano. Antes do prazo acabar, elas vão sozinhas para a
            nuvem de vocês — não é preciso lembrar de nada.
          </p>
          <dl className="m-0 flex flex-col gap-3">
            {prazos.jaExportou && prazos.exportouEm && (
              <div className="rounded-token border border-linha px-4 py-3">
                <dt className="tipo-label m-0 text-ink-3">Já foram para a nuvem de vocês</dt>
                <dd className="tipo-body m-0 mt-1 text-ink">{dataPorExtenso(prazos.exportouEm)}</dd>
              </div>
            )}
            {prazos.exportaEm && (
              <div className="rounded-token border border-linha px-4 py-3">
                <dt className="tipo-label m-0 text-ink-3">Vão para a nuvem de vocês</dt>
                <dd className="tipo-body m-0 mt-1 text-ink">{dataPorExtenso(prazos.exportaEm)}</dd>
              </div>
            )}
            {prazos.apagaEm && (
              <div className="rounded-token border border-linha px-4 py-3">
                <dt className="tipo-label m-0 text-ink-3">Saem do Álbora</dt>
                <dd className="tipo-body m-0 mt-1 text-ink">{dataPorExtenso(prazos.apagaEm)}</dd>
                <dd className="tipo-caption m-0 mt-1 text-ink-3">
                  Baixe ou exporte antes desta data se quiser outra cópia.
                </dd>
              </div>
            )}
          </dl>
        </AdminSection>
      )}
    </div>
  );
}
