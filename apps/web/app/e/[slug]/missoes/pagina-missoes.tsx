"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { raio } from "../../../landing/pecas";
import {
  BotaoPrimario,
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
  TextoSecundario,
  TituloGrande,
} from "../../../telas/shell-convidado";
import { Estrela, Pilula } from "../../../telas/pecas-de-tela";
import { BarraDeAbas } from "../barra-de-abas";

export type MissaoVisivel = { id: string; titulo: string; feito: boolean };

function indiceDaVez(missoes: readonly MissaoVisivel[]): number {
  const aberta = missoes.findIndex((m) => !m.feito);
  if (aberta >= 0) return aberta + 1;
  return missoes.length;
}

function caminhoCamera(slug: string, missaoId: string | null): string {
  const base = `/e/${encodeURIComponent(slug)}/foto`;
  if (!missaoId) return base;
  return `${base}?missao=${encodeURIComponent(missaoId)}`;
}

export function PaginaMissoes({
  slug,
  missoes,
}: {
  slug: string;
  missoes: MissaoVisivel[];
}) {
  const feitas = missoes.filter((m) => m.feito).length;
  const atual = missoes.find((m) => !m.feito) ?? null;
  const indice = indiceDaVez(missoes);
  const resumo =
    missoes.length === 0
      ? "Modo livre"
      : feitas === missoes.length
        ? `${missoes.length} de ${missoes.length}`
        : `${indice} de ${missoes.length}`;

  return (
    <>
      <ChaoConvidado>
        <MioloConvidado>
          <CabecalhoConvidado titulo="Missões" acao={<Pilula>{resumo}</Pilula>} />

          {missoes.length === 0 ? (
            <EstadoLivre slug={slug} />
          ) : atual ? (
            <>
              <Link
                href={caminhoCamera(slug, atual.id)}
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
                  {atual.titulo}
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
                {missoes.map((m) => (
                  <li key={m.id}>
                    <ItemMissao slug={slug} missao={m} destaque={m.id === atual.id} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <TituloGrande>
                Você fez todas as {missoes.length}.
                <br />
                <em>Manda o que quiser.</em>
              </TituloGrande>
              <BotaoCamera slug={slug} rotulo="Abrir a câmera" />
              <ListaConcluidas slug={slug} missoes={missoes} />
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
  missoes,
}: {
  slug: string;
  missoes: readonly MissaoVisivel[];
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
      {missoes.map((m) => (
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
  missao: MissaoVisivel;
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
          backgroundColor: missao.feito ? "var(--superficie-alta)" : "var(--superficie)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: missao.feito ? "var(--acento)" : "var(--linha)",
        }}
      >
        <Estrela tamanho={18} cheia={missao.feito} />
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
          {missao.titulo}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
          {missao.feito ? "Feita" : destaque ? "Agora" : "Aberta"}
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
    backgroundColor: destaque && !missao.feito ? "var(--superficie-alta)" : "var(--superficie)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: destaque && !missao.feito ? "var(--linha)" : "transparent",
    textAlign: "left",
  };

  if (missao.feito) {
    return (
      <div style={{ ...estiloBase, color: "var(--ink-2)" }} aria-disabled>
        {conteudo}
      </div>
    );
  }

  return (
    <Link
      href={caminhoCamera(slug, missao.id)}
      style={{ ...estiloBase, textDecoration: "none", color: "inherit" }}
    >
      {conteudo}
    </Link>
  );
}

function BotaoCamera({
  slug,
  rotulo,
  missaoId = null,
}: {
  slug: string;
  rotulo: string;
  missaoId?: string | null;
}) {
  const router = useRouter();
  return (
    <BotaoPrimario onClick={() => router.push(caminhoCamera(slug, missaoId ?? null))}>
      {rotulo}
    </BotaoPrimario>
  );
}
