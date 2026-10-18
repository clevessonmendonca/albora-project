import React from "react";
import fs from "node:fs";
import QRCode from "qrcode";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, it, vi } from "vitest";
import { adminVars } from "./components/server/admin-shell";
import { HostAlbum } from "./components/client/host-album";
import { ConvidadosPage } from "./components/client/convidados-page";
import { QrCodePrint } from "./components/client/qr-code-print";
import { EventHub } from "./components/client/event-hub";
import { EventControls } from "./components/client/event-controls";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// Dados exclusivos da conferência local; não participam de nenhuma rota do produto.
const date = "2026-09-20T20:00:00.000Z";
const photos = [1, 2, 3].map((id) => ({
  id: String(id), sessaoId: `s-${id}`, missaoId: null, lugarId: null,
  reacoes: 0, destacada: id === 1, criadaEm: date,
  thumb: `/onboarding/photo-0${id}.webp`,
}));

function save(name: string, container: HTMLElement) {
  const output = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
  fs.mkdirSync(output, { recursive: true });
  const vars = Object.entries(adminVars()).map(([key, value]) => `${key}:${value}`).join(";");
  fs.writeFileSync(`${output}/body-${name}.html`, `<style>:root{${vars}}</style><main class="mx-auto min-h-dvh max-w-[90rem] bg-bg p-4 font-corpo text-ink sm:p-8">${container.innerHTML}</main>`);
}

it.runIf(process.env.PREVIEW === "1")("captura álbum carregado", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ itens: photos }))));
  const { container } = render(<HostAlbum eventoId="exemplo" canExport={false} />);
  await screen.findByRole("button", { name: /Foto 1 de 3/ });
  save("album", container);
});

it.runIf(process.env.PREVIEW === "1")("captura convidados carregados", async () => {
  const pessoas = ["Ana", "João", "Maria de Oliveira"].map((nome, id) => ({
    id: String(id), nome, fotos: id + 1, entrouEm: date, primeiraFotoEm: date, ultimaFotoEm: date,
  }));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ pessoas }))));
  const { container } = render(<ConvidadosPage eventoId="exemplo" pessoaInicial={null} />);
  await screen.findAllByText("Maria de Oliveira");
  save("convidados", container);
});

it.runIf(process.env.PREVIEW === "1")("captura convite com QR real", async () => {
  const guestUrl = "https://example.com/e/celebracao";
  const svgString = await QRCode.toString(guestUrl, { type: "svg", margin: 2 });
  const { container } = render(<QrCodePrint eventId="exemplo" slug="celebracao" eventName="Clevesson & Miriã" guestUrl={guestUrl} svgString={svgString} coverImageUrl="/onboarding/photo-08.webp" dateLabel="12 de dezembro de 2027 · 18h" />);
  save("convite", container);
});

it.runIf(process.env.PREVIEW === "1")("captura ajustes do evento", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}))));
  const { container } = render(
    <div className="flex flex-col gap-8">
      <EventHub eventId="exemplo" />
      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Controles do evento</h2>
        <EventControls
          eventId="exemplo"
          slug="celebracao"
          plan="free"
          initial={{ panico: false, modoEndurecido: false, haMenores: false }}
          initialInteractionOpensAt={null}
          initialDeliveryOpensAt={null}
          initialStatus="active"
        />
      </section>
    </div>,
  );
  save("ajustes", container);
});
