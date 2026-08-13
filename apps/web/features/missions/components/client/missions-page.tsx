"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { raio } from "@/app/landing/pecas";
import {
  BotaoPrimario,
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
  TextoSecundario,
  TituloGrande,
} from "@/app/telas/shell-convidado";
import { Estrela, Pilula } from "@/app/telas/pecas-de-tela";
import { BarraDeAbas } from "@/app/e/[slug]/barra-de-abas";

export type VisibleMission = { id: string; title: string; done: boolean };

function turnIndex(missions: readonly VisibleMission[]): number {
  const aberta = missions.findIndex((m) => !m.done);
  if (aberta >= 0) return aberta + 1;
  return missions.length;
}

function photoPathForMission(slug: string, missionId: string | null): string {
  const base = `/e/${encodeURIComponent(slug)}/foto`;
  if (!missionId) return base;
  return `${base}?missao=${encodeURIComponent(missionId)}`;
}

export function MissionsPage({
  slug,
  missions,
}: {
  slug: string;
  missions: VisibleMission[];
}) {
  const feitas = missions.filter((m) => m.done).length;
  const atual = missions.find((m) => !m.done) ?? null;
  const indice = turnIndex(missions);
  const resumo =
    missions.length === 0
      ? "Modo livre"
      : feitas === missions.length
        ? `${missions.length} de ${missions.length}`
        : `${indice} de ${missions.length}`;

  return (
    <>
      <ChaoConvidado>
        <MioloConvidado>
          <CabecalhoConvidado
            titulo="Missões"
            hrefInicio={`/e/${encodeURIComponent(slug)}/capa`}
            acao={<Pilula>{resumo}</Pilula>}
          />

          {missions.length === 0 ? (
            <EstadoLivre slug={slug} />
          ) : atual ? (
            <>
              <Link
                href={photoPathForMission(slug, atual.id)}
                style={{
                  display: "grid",
                  gap: "0.75rem",
                  padding: "1.25rem 1.125rem",
                  textDecoration: "none",
                  color: "inherit",
                  ...raio("var(--raio)"),
                  backgroundColor: "color-mix(in srgb, var(--acento) 14%, var(--superficie))",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "color-mix(in srgb, var(--acento) 35%, var(--linha))",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    letterSpacing: "var(--tracking-rotulo)",
                    textTransform: "uppercase",
                    color: "var(--acento-texto)",
                  }}
                >
                  Missão de agora
                </span>
                <span
                  style={{
                    fontFamily: "var(--fonte-titulo)",
                    fontSize: "1.375rem",
                    lineHeight: 1.15,
                    letterSpacing: "var(--tracking-titulo)",
                  }}
                >
                  {atual.title}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "var(--ink-2)" }}>
                  Toque para fotografar
                </span>
              </Link>

              <TextoSecundario>As outras missões</TextoSecundario>

              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                {missions.map((m) => (
                  <li key={m.id}>
                    <ItemMissao slug={slug} missao={m} destaque={m.id === atual.id} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <TituloGrande>
                Você fez todas as {missions.length}.
                <br />
                <em>Manda o que quiser.</em>
              </TituloGrande>
              <BotaoCamera slug={slug} rotulo="Abrir a câmera" />
              <ListaConcluidas slug={slug} missions={missions} />
            </>
          )}

          {atual && (
            <div style={{ marginTop: "0.5rem" }}>
              <BotaoCamera slug={slug} rotulo="Modo livre" />
            </div>
          )}
        </MioloConvidado>
      </ChaoConvidado>

      <BarraDeAbas slug={slug} ativa="missoes" />
    </>
  );
}

function EstadoLivre({ slug }: { slug: string }) {
  return (
    <>
      <TituloGrande>Modo livre</TituloGrande>
      <TextoSecundario>Este evento não tem missões. Fotografe o que quiser.</TextoSecundario>
      <BotaoCamera slug={slug} rotulo="Abrir a câmera" />
    </>
  );
}

function ListaConcluidas({
  slug,
  missions,
}: {
  slug: string;
  missions: readonly VisibleMission[];
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: "1.5rem 0 0",
        padding: 0,
        display: "grid",
        gap: "0.5rem",
      }}
    >
      {missions.map((m) => (
        <li key={m.id}>
          <ItemMissao slug={slug} missao={m} destaque={false} />
        </li>
      ))}
    </ul>
  );
}

function ItemMissao({
  slug,
  missao,
  destaque,
}: {
  slug: string;
  missao: VisibleMission;
  destaque: boolean;
}) {
  const conteudo = (
    <>
      <span
        style={{
          flex: "none",
          display: "grid",
          placeItems: "center",
          width: "2.5rem",
          height: "2.5rem",
          ...raio("var(--raio)"),
          backgroundColor: missao.done ? "var(--superficie-alta)" : "var(--superficie)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: missao.done ? "var(--acento)" : "var(--linha)",
        }}
      >
        <Estrela tamanho={18} cheia={missao.done} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1rem",
            lineHeight: 1.25,
          }}
        >
          {missao.title}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
          {missao.done ? "Feita" : destaque ? "Agora" : "Aberta"}
        </span>
      </span>
    </>
  );

  const estiloBase: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    width: "100%",
    padding: "0.875rem 1rem",
    ...raio("var(--raio)"),
    backgroundColor: destaque && !missao.done ? "var(--superficie-alta)" : "var(--superficie)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: destaque && !missao.done ? "var(--linha)" : "transparent",
    textAlign: "left",
  };

  if (missao.done) {
    return (
      <div style={{ ...estiloBase, color: "var(--ink-2)" }} aria-disabled>
        {conteudo}
      </div>
    );
  }

  return (
    <Link
      href={photoPathForMission(slug, missao.id)}
      style={{ ...estiloBase, textDecoration: "none", color: "inherit" }}
    >
      {conteudo}
    </Link>
  );
}

function BotaoCamera({
  slug,
  rotulo,
  missionId = null,
}: {
  slug: string;
  rotulo: string;
  missionId?: string | null;
}) {
  const router = useRouter();
  return (
    <BotaoPrimario onClick={() => router.push(photoPathForMission(slug, missionId ?? null))}>
      {rotulo}
    </BotaoPrimario>
  );
}
