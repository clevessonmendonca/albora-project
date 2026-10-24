import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const enfileirarFoto = vi.fn();
const anotar = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/features/photo/hooks/use-upload", () => ({
  mensagemCotaVideo: () => null,
  useUpload: () => ({
    estado: { pendentes: 0, bytesPendentes: 0, processando: false, ultimoErro: null, online: true },
    enfileirarFoto,
    anotar,
    drenarAgora: async () => null,
  }),
}));
vi.mock("@/features/photo/hooks/use-pwa-install", () => ({
  COPY_CTA_PWA: "",
  deveMostrarCtaPwa: () => false,
  usePwaInstall: () => ({
    disponivel: false,
    jaInstalado: false,
    precisaInstrucaoIos: false,
    dispensado: false,
    pronto: false,
    instalar: async () => {},
    dispensar: () => {},
    avisarPromptIos: () => {},
  }),
}));
vi.mock("./editor", () => ({ Editor: () => <div data-testid="editor" /> }));
vi.mock("@/features/pairing/components/client/app-open-cta", () => ({ AppOpenCta: () => null }));
vi.mock("@/features/guest/components/client/claim-photos-button", () => ({ ClaimPhotosButton: () => null }));
vi.mock("@/features/missions/components/ui/mission-completion-toast", () => ({ MissionCompletionToast: () => null }));

import { PhotoPage } from "./photo-page";

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function (this: Blob) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as ArrayBuffer);
        r.onerror = () => reject(r.error);
        r.readAsArrayBuffer(this);
      });
    };
  }
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, ...new Array(20).fill(0)]);

function foto(nome: string): File {
  return new File([JPEG as BufferSource], nome, { type: "image/jpeg" });
}

function montar() {
  const { container } = render(
    <PhotoPage
      slug="festa"
      eventoId="evt"
      plan="free"
      videoQuota={{ limite: null, enviados: 0 }}
      eventTitle="Festa"
      missions={[]}
      places={[
        { id: "m1", title: "Primeiro" },
        { id: "m2", title: "Segundo" },
      ]}
      copy={{ placeQuestion: "Qual momento?" }}
      recommendedFilter={null}
      interactionOpen={false}
    />,
  );
  const rolo = container.querySelector<HTMLInputElement>("input[multiple]")!;
  return { rolo };
}

async function escolher(input: HTMLInputElement, arquivos: File[]) {
  await act(async () => {
    fireEvent.change(input, { target: { files: arquivos } });
  });
}

describe("PhotoPage — galeria", () => {
  beforeEach(() => {
    enfileirarFoto.mockReset();
    anotar.mockReset();
    let n = 0;
    enfileirarFoto.mockImplementation(async () => ({ ok: true, id: `id-${(n += 1)}` }));
    anotar.mockResolvedValue(undefined);
  });

  it("uma foto só continua indo para o editor, sem passar pela tela de lote e sem enfileirar antes", async () => {
    const { rolo } = montar();
    await escolher(rolo, [foto("a.jpg")]);
    await waitFor(() => expect(screen.getByTestId("editor")).toBeTruthy());
    expect(screen.queryByText("Livre")).toBeNull();
    expect(enfileirarFoto).not.toHaveBeenCalled();
  });

  it("várias fotos abrem a escolha de momento do lote e nada entra na fila antes do envio", async () => {
    const { rolo } = montar();
    await escolher(rolo, [foto("a.jpg"), foto("b.jpg"), foto("c.jpg")]);
    await waitFor(() => expect(screen.getByText("3 fotos para enviar")).toBeTruthy());
    expect(enfileirarFoto).not.toHaveBeenCalled();
  });

  it("enviar o lote enfileira cada foto e anota o mesmo momento em todas", async () => {
    const { rolo } = montar();
    await escolher(rolo, [foto("a.jpg"), foto("b.jpg"), foto("c.jpg")]);
    await waitFor(() => screen.getByText("3 fotos para enviar"));
    fireEvent.click(screen.getByRole("button", { name: "Segundo" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enviar 3 fotos" }));
    });
    await waitFor(() => expect(enfileirarFoto).toHaveBeenCalledTimes(3));
    expect(anotar.mock.calls).toEqual([
      ["id-1", { legenda: null, lugar: "m2" }],
      ["id-2", { legenda: null, lugar: "m2" }],
      ["id-3", { legenda: null, lugar: "m2" }],
    ]);
  });

  it("mais de 8 fotos ficam em 8", async () => {
    const { rolo } = montar();
    await escolher(rolo, Array.from({ length: 10 }, (_, i) => foto(`f${i}.jpg`)));
    await waitFor(() => expect(screen.getByText("8 fotos para enviar")).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enviar 8 fotos" }));
    });
    await waitFor(() => expect(enfileirarFoto).toHaveBeenCalledTimes(8));
  });
});
