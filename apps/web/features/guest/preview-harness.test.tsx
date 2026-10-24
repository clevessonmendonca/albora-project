import React from "react";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Harness de conferência visual do convidado — **não afirma nada** sobre
 * correção; serve para olhar. A escrita dos fragmentos fica atrás de
 * `PREVIEW=1` e fora do CI:
 *
 *   PREVIEW=1 pnpm vitest run apps/web/features/guest/preview-harness.test.tsx
 *   node tools/preview/montar.mjs
 *
 * Existe porque as telas do convidado pedem sessão e banco no request, e
 * `next dev` nesta máquina leva minutos por rota.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/e/festa-demo",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
}));

const SAIDA = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";

describe("harness do convidado", () => {
  it("as telas de entrada renderizam sem estourar", async () => {
    const { EntryFlow } = await import("./components/client/entry-flow");

    const markup = renderToStaticMarkup(
      <EntryFlow
        eventoId="11111111-1111-1111-1111-111111111111"
        slug="festa-demo"
        nomeEvento="Clevesson & Miriã"
        saudacao="Que bom ter você aqui"
        via="qr"
        comecaEm={new Date("2027-12-12T20:00:00Z").toISOString()}
        coverImageUrl={null}
      />,
    );

    expect(markup).toContain("Entrar na festa");
  });

  it.runIf(process.env.PREVIEW === "1")("escreve os fragmentos", async () => {
    const { EntryFlow } = await import("./components/client/entry-flow");
    const { marcaVars } = await import("./lib/event-vars");

    const vars = Object.entries(marcaVars("dark") as Record<string, string>)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");

    const chegada = renderToStaticMarkup(
      <EntryFlow
        eventoId="11111111-1111-1111-1111-111111111111"
        slug="festa-demo"
        nomeEvento="Clevesson & Miriã"
        saudacao="Que bom ter você aqui"
        via="qr"
        comecaEm={new Date("2027-12-12T20:00:00Z").toISOString()}
        coverImageUrl="/onboarding/photo-08.webp"
        localEvento="Espaço Aurora, Brasília"
      />,
    );
    expect(chegada).toContain("Você foi convidado para");
    expect(chegada).toContain("Espaço Aurora, Brasília");

    fs.mkdirSync(SAIDA, { recursive: true });
    // Bloco `<style>`, não atributo `style="…"`: `--fonte-corpo` carrega aspas
    // duplas (`"Instrument Sans"`) que fechariam o atributo e derrubariam todas
    // as vars seguintes — foi assim que o raio dos botões sumiu. Produção já
    // emite bloco; o harness precisa emitir igual para valer como conferência.
    fs.writeFileSync(
      `${SAIDA}/body-convidado-entrada.html`,
      `<style>#guest-root { ${vars} min-height: 100dvh; }</style>` +
        `<div class="guest-tema superficie-de-acao" id="guest-root">${chegada}</div>`,
    );

    for (const foco of [25, 75] as const) {
      const lateral = renderToStaticMarkup(
        <EntryFlow
          eventoId="11111111-1111-1111-1111-111111111111"
          slug="festa-demo"
          nomeEvento="Clevesson & Miriã"
          saudacao="Que bom ter você aqui"
          via="qr"
          comecaEm={new Date("2027-12-12T20:00:00Z").toISOString()}
          coverImageUrl="/onboarding/photo-08.webp"
          coverFocoX={foco}
        />,
      );
      fs.writeFileSync(
        `${SAIDA}/body-convidado-entrada-foco-x-${foco}.html`,
        `<style>#guest-root { ${vars} min-height: 100dvh; }</style>` +
          `<div class="guest-tema superficie-de-acao" id="guest-root">${lateral}</div>`,
      );
      const comFoco = renderToStaticMarkup(
        <EntryFlow
          eventoId="11111111-1111-1111-1111-111111111111"
          slug="festa-demo"
          nomeEvento="Clevesson & Miriã"
          saudacao="Que bom ter você aqui"
          via="qr"
          comecaEm={new Date("2027-12-12T20:00:00Z").toISOString()}
          coverImageUrl="/onboarding/photo-08.webp"
          coverFoco={foco}
        />,
      );
      fs.writeFileSync(
        `${SAIDA}/body-convidado-entrada-foco-${foco}.html`,
        `<style>#guest-root { ${vars} min-height: 100dvh; }</style>` +
          `<div class="guest-tema superficie-de-acao" id="guest-root">${comFoco}</div>`,
      );
    }
  }, 120_000);
  it.runIf(process.env.PREVIEW === "1")("escreve o envio em lote", async () => {
    const { Lote } = await import("../photo/components/client/lote");
    const { marcaVars } = await import("./lib/event-vars");

    const vars = Object.entries(marcaVars("dark") as Record<string, string>)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");

    const tons = ["slategray", "darkseagreen", "rosybrown", "lightsteelblue", "tan", "darkkhaki", "cadetblue", "burlywood"];
    let n = 0;
    URL.createObjectURL = () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${tons[(n++) % tons.length]}"/></svg>`,
      )}`;

    const arquivos = Array.from(
      { length: 8 },
      (_, i) => new File([`f${i}`], `f${i}.jpg`, { type: "image/jpeg" }),
    );

    const lote = renderToStaticMarkup(
      <Lote
        arquivos={arquivos}
        excedeu={false}
        momentos={[
          { id: "cerimonia", title: "Cerimônia" },
          { id: "recepcao", title: "Recepção" },
          { id: "festa", title: "Festa" },
          { id: "detalhes", title: "Detalhes" },
        ]}
        perguntaDoMomento="Qual momento você registrou?"
        momentoInicial="recepcao"
        onEnviar={() => {}}
        onCancelar={() => {}}
      />,
    );
    expect(lote).toContain("Enviar 8 fotos");

    fs.mkdirSync(SAIDA, { recursive: true });
    fs.writeFileSync(
      `${SAIDA}/body-convidado-lote.html`,
      `<style>#guest-root { ${vars} min-height: 100dvh; }</style>` +
        `<div class="guest-tema superficie-de-acao" id="guest-root">${lote}</div>`,
    );
  }, 120_000);
});
