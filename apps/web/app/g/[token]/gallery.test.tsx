import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErroTokenDeEntrega } from "@albora/db";

/** Página pública `/g/[token]` (task 9): sem login, identidade é só o token
 * da URL. Mocka `openGuestGallery` (Task 7) inteiro — sem banco, sem R2. */

const { openGuestGallery } = vi.hoisted(() => ({ openGuestGallery: vi.fn() }));
vi.mock("@albora/application", () => ({ openGuestGallery }));

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

    const jsx = await PaginaGaleriaDoConvidado({
      params: Promise.resolve({ token: "tok-valido" }),
    });
    render(jsx);

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
