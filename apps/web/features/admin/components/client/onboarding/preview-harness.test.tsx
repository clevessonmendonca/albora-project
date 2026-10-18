import React from "react";
import fs from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, it, vi } from "vitest";
import { adminVars } from "../../server/admin-shell";
import { CreateEventWizard } from "../create-event-wizard";
import { HeroDoEvento } from "../home/hero-do-evento";
import { ContagemRegressiva } from "../home/contagem-regressiva";
import { AcessoRapido, NoDiaDaFesta } from "../home/blocos-da-visao-geral";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
afterEach(() => vi.unstubAllGlobals());

// Artefatos locais para inspeção com CSS real via tools/preview/montar.mjs.
// Não executa nem escreve arquivos no CI.
it.runIf(process.env.PREVIEW === "1")("renderiza as cinco etapas para conferência visual", () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ vendors: [] }))));
  const { container } = render(<CreateEventWizard />);
  const output = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
  fs.mkdirSync(output, { recursive: true });
  const vars = Object.entries(adminVars()).map(([key, value]) => `${key}:${value}`).join(";");
  const save = (step: string) => fs.writeFileSync(
    `${output}/body-criacao-${step}.html`,
    `<style>:root{${vars}}</style>${container.innerHTML}`,
  );
  const next = () => fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
  save("tipo");
  next();
  fireEvent.change(screen.getByLabelText("Nome do evento"), { target: { value: "Clevesson & Miriã" } });
  fireEvent.click(screen.getByRole("button", { name: /Escolher data/ }));
  fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
  fireEvent.click(screen.getByRole("button", { name: "Pronto" }));
  save("detalhes");
  next();
  save("identidade");
  next();
  save("participacao");
  next();
  save("revisao");
});

it.runIf(process.env.PREVIEW === "1")("renderiza os blocos do painel para conferência visual", () => {
  const { container } = render(
    <div style={adminVars()} className="min-h-dvh bg-bg p-4 font-corpo text-ink sm:p-8">
      <HeroDoEvento
        nome="Clevesson & Miriã"
        meta="12 de dezembro · 18h · Espaço de celebração"
        img="/onboarding/photo-08.webp"
        vars={{}}
        destaque="Falta pouco"
        legenda="para a festa"
        acoes={<a href="/admin" className="min-h-12 rounded-pilula bg-superficie px-5 py-3 text-ink">Ver página do evento</a>}
        contagem={<ContagemRegressiva comecaEm="2027-12-12T18:00:00Z" />}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div />
        <div className="grid min-w-0 gap-6"><AcessoRapido base="/admin/e/exemplo" /><NoDiaDaFesta base="/admin/e/exemplo" /></div>
      </div>
    </div>,
  );
  const output = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(`${output}/body-painel-blocos.html`, container.innerHTML);
});

it.runIf(process.env.PREVIEW === "1")("renderiza a tela Pronto para conferência visual", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) =>
    String(input).includes("/api/admin/events")
      ? new Response(JSON.stringify({ slug: "clevesson-e-miria", eventoId: "evento-1" }), { status: 201 })
      : new Response(JSON.stringify({ vendors: [] })),
  ));
  const { container } = render(<CreateEventWizard />);
  const next = () => fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
  next();
  fireEvent.change(screen.getByLabelText("Nome do evento"), { target: { value: "Clevesson & Miriã" } });
  fireEvent.click(screen.getByRole("button", { name: /Escolher data/ }));
  fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
  next();
  next();
  next();
  fireEvent.click(screen.getByRole("button", { name: /Criar/ }));
  await screen.findByText(/está pronto/);
  await screen.findByAltText(/QR Code que abre o evento/);
  const output = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
  fs.mkdirSync(output, { recursive: true });
  const vars = Object.entries(adminVars()).map(([key, value]) => `${key}:${value}`).join(";");
  fs.writeFileSync(`${output}/body-criacao-pronto.html`, `<style>:root{${vars}}</style>${container.innerHTML}`);
});
