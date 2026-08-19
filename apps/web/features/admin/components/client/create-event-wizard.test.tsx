import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateEventWizard } from "./create-event-wizard";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

/** Passo 0 (datas + convidados) até o passo final, clicando "Continuar". */
function preencherDatasEAvancarAteCriar() {
  fireEvent.change(screen.getByLabelText("Começo"), {
    target: { value: "2026-09-01T18:00" },
  });
  fireEvent.change(screen.getByLabelText("Fim"), {
    target: { value: "2026-09-02T02:00" },
  });
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByText("Continuar"));
  }
}

/**
 * O passo aqui é conveniência de UI: quem valida pertencimento real a
 * `vendor_members` é `criarEvento` no servidor (V2c), na mesma transação de
 * `comConta`. O que este teste garante é a UI — o passo só aparece quando
 * `GET /api/admin/vendors` devolve algo, e o `vendorId` escolhido é o único
 * dado extra que viaja no corpo de `POST /api/admin/events`.
 */
describe("CreateEventWizard — passo condicional do fornecedor (spec-canal-fornecedor §2)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sem vínculo em vendor_members: sem seletor, e o POST não manda vendorId", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/vendors") return responder({ vendors: [] });
      if (url === "/api/admin/events") {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body).not.toHaveProperty("vendorId");
        return responder({ eventoId: "evento-1", slug: "slug-1" });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateEventWizard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/vendors"));
    expect(screen.queryByText("Criar sob")).not.toBeInTheDocument();

    preencherDatasEAvancarAteCriar();
    fireEvent.click(screen.getByText("Criar e abrir painel"));

    await waitFor(() => expect(screen.getByText("Evento criado")).toBeInTheDocument());
  });

  it(
    "com vínculo em vendor_members: oferece o seletor + e-mail do casal, e " +
      "escolher um fornecedor manda vendorId + coupleEmail no POST (o casal, " +
      "nunca o fornecedor, vira dono — canManageCoupleOnly)",
    async () => {
      const vendorId = "11111111-1111-1111-1111-111111111111";
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/vendors") {
          return responder({ vendors: [{ vendorId, name: "Buffet Teste", role: "staff" }] });
        }
        if (url === "/api/admin/events") {
          const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
          expect(body.vendorId).toBe(vendorId);
          expect(body.coupleEmail).toBe("casal@exemplo.com");
          return responder({ eventoId: "evento-2", slug: "slug-2" });
        }
        throw new Error(`fetch inesperado: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<CreateEventWizard />);

      const seletor = await screen.findByLabelText("Criar sob");
      fireEvent.change(seletor, { target: { value: vendorId } });

      fireEvent.change(screen.getByLabelText("E-mail do casal"), {
        target: { value: "casal@exemplo.com" },
      });

      preencherDatasEAvancarAteCriar();
      fireEvent.click(screen.getByText("Criar e abrir painel"));

      await waitFor(() => expect(screen.getByText("Evento criado")).toBeInTheDocument());
    },
  );

  it("com vínculo em vendor_members mas sem e-mail do casal: não avança do passo 0", async () => {
    const vendorId = "11111111-1111-1111-1111-111111111111";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/admin/vendors") {
        return responder({ vendors: [{ vendorId, name: "Buffet Teste", role: "staff" }] });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateEventWizard />);

    const seletor = await screen.findByLabelText("Criar sob");
    fireEvent.change(seletor, { target: { value: vendorId } });

    fireEvent.change(screen.getByLabelText("Começo"), {
      target: { value: "2026-09-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText("Fim"), {
      target: { value: "2026-09-02T02:00" },
    });

    expect(screen.getByText("Continuar")).toBeDisabled();
  });
});
