"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BarraDeAbas } from "@/app/e/[slug]/barra-de-abas";
import { Moldura, raio } from "@/app/landing/pecas";
import { BotaoPrimario, ChaoConvidado, RODAPE_ABAS } from "@/app/telas/shell-convidado";
import { Estrela, IconeGrade, IconePilha } from "@/app/telas/pecas-de-tela";
import type { AlbumServido } from "@/lib/album";
import type { CoverMoment } from "../../types/cover";

function IconeMusica({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function truncateLabel(label: string, max = 16): string {
  return label.length <= max ? label : `${label.slice(0, max - 1)}…`;
}

function albumCoverUrl(album: AlbumServido): string | null {
  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      const foto = pagina.fotos[0];
      if (foto?.url) return foto.url;
    }
  }
  return null;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date(iso));
}

function Shortcut({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.3125rem",
        padding: "0.75rem 0.25rem",
        ...raio("var(--raio)"),
        backgroundColor: "var(--superficie)",
        color: "var(--ink-2)",
        textDecoration: "none",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: "0.625rem",
          letterSpacing: "var(--tracking-rotulo)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.6875rem", color: "var(--ink)" }}>{value}</span>
    </Link>
  );
}

export function CoverPage({
  slug,
  eventName,
  startsAt,
  album,
  moments,
  interactionOpen,
  musicLabel,
}: {
  slug: string;
  eventName: string;
  startsAt: string;
  album: AlbumServido;
  moments: CoverMoment[];
  interactionOpen: boolean;
  musicLabel: string | null;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const hero = albumCoverUrl(album);
  const guests = album.contadores.convidados;
  const photos = album.contadores.fotos;
  const missions = album.contadores.missoes;
  const centerIndex = moments.length > 1 ? 1 : 0;

  return (
    <>
      <ChaoConvidado>
        <div style={{ position: "relative", height: "20.5rem", flex: "none" }}>
          {hero ? (
            <img
              src={hero}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Moldura rotulo="" raio="0rem" atmosfera variante={1} />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 30%, transparent) 0%, transparent 26%, transparent 58%, var(--bg) 100%)",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "-3.25rem",
            textAlign: "center",
            padding: "0 1.5rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--fonte-titulo)",
              fontWeight: 300,
              fontSize: "1.875rem",
              lineHeight: 1.1,
              letterSpacing: "var(--tracking-titulo)",
            }}
          >
            {eventName}
          </p>
          <p style={{ margin: "0.4375rem 0 0", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
            {formatDate(startsAt)}
            {guests > 0
              ? ` · ${guests} ${guests === 1 ? "pessoa" : "pessoas"} fotografando`
              : ""}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.5rem",
            padding: "1.25rem 1.125rem 1.125rem",
          }}
        >
          <Shortcut
            href={`${base}/album`}
            label="Álbum"
            value={String(photos)}
            icon={<IconeGrade tamanho={20} />}
          />
          <Shortcut
            href={`${base}/feed`}
            label="Feed"
            value={interactionOpen ? "ao vivo" : "em breve"}
            icon={<IconePilha tamanho={20} />}
          />
          <Shortcut
            href={`${base}/missoes`}
            label="Missões"
            value={missions > 0 ? String(missions) : "—"}
            icon={<Estrela tamanho={20} />}
          />
          <Shortcut
            href={`${base}/musica`}
            label="Música"
            value={musicLabel ? truncateLabel(musicLabel) : "trilha"}
            icon={<IconeMusica />}
          />
        </div>

        {moments.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                padding: "0 1.125rem 0.75rem",
              }}
            >
              <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "1rem" }}>Os momentos</span>
              <Link
                href={`${base}/album`}
                style={{ fontSize: "0.6875rem", color: "var(--ink-3)", textDecoration: "none" }}
              >
                ver álbum
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.625rem",
                padding: "0 1.125rem",
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {moments.map((moment, i) => {
                const central = i === centerIndex;
                const hrefAlbum = moment.missionFilterId
                  ? `${base}/album?missao=${encodeURIComponent(moment.missionFilterId)}`
                  : `${base}/album`;

                return (
                  <Link
                    key={moment.id}
                    href={hrefAlbum}
                    style={{
                      position: "relative",
                      flex: "none",
                      width: central ? "9.25rem" : "5rem",
                      aspectRatio: "9 / 16",
                      overflow: "hidden",
                      ...raio("var(--raio)"),
                      opacity: central ? 1 : 0.62,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Moldura rotulo="" raio="var(--raio)" atmosfera variante={i * 6 + 2} />

                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                          "linear-gradient(to top, color-mix(in srgb, var(--bg) 88%, transparent), transparent 52%)",
                      }}
                    />

                    {central && interactionOpen ? (
                      <span
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          left: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3125rem",
                          padding: "0.25rem 0.5rem",
                          ...raio("var(--raio-pilula)"),
                          backgroundColor: "var(--acento)",
                          color: "var(--sobre-acento)",
                          fontSize: "0.5rem",
                          letterSpacing: "var(--tracking-rotulo)",
                          textTransform: "uppercase",
                        }}
                      >
                        <span
                          className="pulso"
                          style={{
                            width: "0.25rem",
                            height: "0.25rem",
                            borderRadius: "50%",
                            backgroundColor: "currentColor",
                          }}
                        />
                        agora
                      </span>
                    ) : null}

                    <span
                      style={{
                        position: "absolute",
                        left: "0.625rem",
                        right: "0.625rem",
                        bottom: "0.625rem",
                        display: "block",
                        fontFamily: "var(--fonte-titulo)",
                        fontSize: central ? "0.9375rem" : "0.6875rem",
                        lineHeight: 1.15,
                        letterSpacing: "var(--tracking-titulo)",
                      }}
                    >
                      {moment.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ padding: `1.125rem 1.5rem ${RODAPE_ABAS}` }}>
          <BotaoPrimario onClick={() => router.push(`${base}/foto`)}>Enviar foto</BotaoPrimario>
        </div>
      </ChaoConvidado>
      <BarraDeAbas slug={slug} />
    </>
  );
}
