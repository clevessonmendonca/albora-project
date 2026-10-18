import React from "react";
import fs from "node:fs";
import QRCode from "qrcode";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, it, vi } from "vitest";
import { adminVars } from "./components/server/admin-shell";
import { HostAlbum } from "./components/client/host-album";
import { ConvidadosPage } from "./components/client/convidados-page";
import { QrCodePrint } from "./components/client/qr-code-print";
import { IdentityEditor } from "./components/client/identity-editor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));

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

function fetchDoAlbumComFiltros() {
  const itens = [1, 2, 3, 4].map((id) => ({
    ...photos[(id - 1) % 3]!, id: String(id), sessaoId: id % 2 ? "p1" : "p2", momentoId: id <= 2 ? "cerimonia" : "pista", destacada: id === 1,
  }));
  return vi.fn(async () => new Response(JSON.stringify({
    itens,
    momentos: [{ id: "cerimonia", titulo: "Cerimônia" }, { id: "pista", titulo: "A pista" }],
    pessoas: [{ id: "p1", nome: "Ana", fotos: 2 }, { id: "p2", nome: "João", fotos: 2 }],
  })));
}

it.runIf(process.env.PREVIEW === "1")("captura álbum com filtro de momentos", async () => {
  vi.stubGlobal("fetch", fetchDoAlbumComFiltros());
  const { container } = render(<HostAlbum eventoId="exemplo" canExport={false} />);
  await screen.findByRole("button", { name: /Foto 1 de 4/ });
  fireEvent.click(screen.getByRole("button", { name: "Momentos" }));
  fireEvent.click(screen.getByRole("button", { name: /Cerimônia/ }));
  save("album-filtros", container);
});

it.runIf(process.env.PREVIEW === "1")("captura álbum no modo selecionar", async () => {
  vi.stubGlobal("fetch", fetchDoAlbumComFiltros());
  const { container } = render(<HostAlbum eventoId="exemplo" canExport={false} />);
  await screen.findByRole("button", { name: /Foto 1 de 4/ });
  fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
  fireEvent.click(screen.getByRole("button", { name: /Foto 2 de 4/ }));
  fireEvent.click(screen.getByRole("button", { name: /Foto 3 de 4/ }));
  save("album-lote", container);
});

it.runIf(process.env.PREVIEW === "1")("captura editor de identidade com monograma e momentos", () => {
  const { container } = render(
    <IdentityEditor eventId="exemplo" packId="casamento" initialExpectedGuests={150} initialTimezone="America/Sao_Paulo"
      initialIdentityTokens={{ monograma: "A&J", momentos: [{ id: "cerimonia", titulo: "O sim" }, { id: "recepcao", titulo: "A recepção" }, { id: "m-brinde", titulo: "O brinde" }] }}
      initialTitle="Ana & João" />,
  );
  save("identidade-editor", container);
});
