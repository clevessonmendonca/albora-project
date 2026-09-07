import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErroTokenDeEntrega } from "@albora/db";

/** Página pública `/g/[token]` (task 9): sem login, identidade é só o token
 * da URL. Mocka `openGuestGallery` (Task 7) inteiro — sem banco, sem R2.
 * Também mocka `carregarEventoPublico`/`withEvent`: a galeria carrega os
 * tokens de marca do casal a partir do `eventId` que o próprio token já
 * revelou (spec §6 / ADR 0019) — sem isso a tela usa chão neutro do app,
 * que é exatamente o bug que este teste passou a cobrir. */

const { openGuestGallery } = vi.hoisted(() => ({ openGuestGallery: vi.fn() }));
vi.mock("@albora/application", () => ({ openGuestGallery }));

const { carregarEventoPublico, withEvent } = vi.hoisted(() => ({
  carregarEventoPublico: vi.fn(),
  withEvent: vi.fn((_pool: unknown, _eventId: string, executar: (c: unknown) => unknown) => executar({})),
}));
vi.mock("@albora/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@albora/db")>();
  return { ...real, carregarEventoPublico, withEvent };
});

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));
vi.mock("@/lib/r2", () => ({ signGet: vi.fn() }));
vi.mock("@/lib/config", () => ({
  config: () => ({ sessionSecret: "segredo-de-teste-com-pelo-menos-32-caracteres" }),
}));

const { default: PaginaGaleriaDoConvidado } = await import("./page");

function fotoFake(id: string) {
  return {
    id,
    url: `https://r2.example/${id}-full.jpg`,
    thumbUrl: `https://r2.example/${id}-thumb.jpg`,
    mime: "image/jpeg",
    criadaEm: new Date("2026-09-06T20:00:00Z"),
    legenda: null,
  };
}

describe("GET /g/[token]", () => {
  it("token válido renderiza as fotos da sessão com as URLs presignadas", async () => {
    openGuestGallery.mockResolvedValueOnce({
      eventId: "evt-1",
      fotos: [fotoFake("foto-1"), fotoFake("foto-2")],
    });
    carregarEventoPublico.mockResolvedValueOnce({
      eventoId: "evt-1",
      packId: "pack-inexistente",
      identityTokens: { cores: { acento: "rgb(17, 17, 17)" } },
      vendorBrandTokens: null,
    });

    const jsx = await PaginaGaleriaDoConvidado({
      params: Promise.resolve({ token: "tok-valido" }),
    });
    const { container } = render(jsx);

    expect(carregarEventoPublico).toHaveBeenCalledWith(expect.anything(), "evt-1");
    expect(container.firstChild).toHaveAttribute("style");

    const imagens = screen.getAllByRole("img");
    expect(imagens).toHaveLength(2);
    expect(imagens[0]!).toHaveAttribute("src", "https://r2.example/foto-1-thumb.jpg");
    expect(imagens[0]!.closest("a")).toHaveAttribute("href", "https://r2.example/foto-1-full.jpg");
    expect(imagens[1]!).toHaveAttribute("src", "https://r2.example/foto-2-thumb.jpg");
  });

  it("token inválido/expirado renderiza o estado calmo, sem stack nem detalhe", async () => {
    openGuestGallery.mockRejectedValueOnce(new ErroTokenDeEntrega());

    const jsx = await PaginaGaleriaDoConvidado({
      params: Promise.resolve({ token: "tok-invalido" }),
    });
    render(jsx);

    expect(screen.getByText(/este link expirou/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("erro que não é de token propaga — não vira estado de expirado", async () => {
    openGuestGallery.mockRejectedValueOnce(new Error("banco fora do ar"));

    await expect(
      PaginaGaleriaDoConvidado({ params: Promise.resolve({ token: "tok-qualquer" }) }),
    ).rejects.toThrow("banco fora do ar");
  });
});
