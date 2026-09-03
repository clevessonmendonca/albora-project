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

function preencherDatasEAvancarAteCriar() {
  // Passo 0 (Tipo) → passo 1 (Evento)
  fireEvent.click(screen.getByText("Continuar"));

  // Preenche datas e convidados no passo 1
  fireEvent.change(screen.getByLabelText("Começo"), {
    target: { value: "2026-09-01T18:00" },
  });
  fireEvent.change(screen.getByLabelText("Fim"), {
    target: { value: "2026-09-02T02:00" },
  });

  fireEvent.change(screen.getByLabelText("Quantos convidados presentes?"), {
    target: { value: "120" },
  });

  // Passo 1 → 2 → 3 → 4 (Confirmar)
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByText("Continuar"));
  }
}

/** Valida só a UI — autorização real de `vendor_members` fica em `criarEvento` (V2c). O passo aparece quando `/api/admin/vendors` devolve algo, e `vendorId` é o único campo extra no POST. */
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
    // No passo 0 (Tipo) o seletor nunca aparece; vendors vazio nunca mostra em nenhum passo
    expect(screen.queryByText("Criar sob")).not.toBeInTheDocument();

    preencherDatasEAvancarAteCriar();
    fireEvent.click(screen.getByText("Criar evento"));

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

      // Avança do passo 0 (Tipo) para o passo 1 (Evento) onde o seletor aparece
      fireEvent.click(screen.getByText("Continuar"));

      const seletor = await screen.findByLabelText("Criar sob");
      fireEvent.change(seletor, { target: { value: vendorId } });

      fireEvent.change(screen.getByLabelText("E-mail do casal"), {
        target: { value: "casal@exemplo.com" },
      });

      // Preenche datas e avança do passo 1 até o passo final
      fireEvent.change(screen.getByLabelText("Começo"), {
        target: { value: "2026-09-01T18:00" },
      });
      fireEvent.change(screen.getByLabelText("Fim"), {
        target: { value: "2026-09-02T02:00" },
      });
      fireEvent.change(screen.getByLabelText("Quantos convidados presentes?"), {
        target: { value: "120" },
      });
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText("Continuar"));
      }

      fireEvent.click(screen.getByText("Criar evento"));

      await waitFor(() => expect(screen.getByText("Evento criado")).toBeInTheDocument());
    },
  );

  it("com vínculo em vendor_members mas sem e-mail do casal: não avança do passo 1", async () => {
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

    // Avança do passo 0 para o passo 1 (Evento)
    fireEvent.click(screen.getByText("Continuar"));

    const seletor = await screen.findByLabelText("Criar sob");
    fireEvent.change(seletor, { target: { value: vendorId } });

    // Preenche datas mas não o e-mail do casal
    fireEvent.change(screen.getByLabelText("Começo"), {
      target: { value: "2026-09-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText("Fim"), {
      target: { value: "2026-09-02T02:00" },
    });

    // Continuar deve estar desabilitado sem o e-mail do casal
    expect(screen.getByText("Continuar")).toBeDisabled();
  });

  it("sem convidados válidos: não avança do passo 1", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/admin/vendors") return responder({ vendors: [] });
      throw new Error(`fetch inesperado: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateEventWizard />);
    fireEvent.click(screen.getByText("Continuar"));

    fireEvent.change(screen.getByLabelText("Começo"), {
      target: { value: "2026-09-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText("Fim"), {
      target: { value: "2026-09-02T02:00" },
    });
    fireEvent.change(screen.getByLabelText("Quantos convidados presentes?"), {
      target: { value: "" },
    });

    expect(screen.getByText("Continuar")).toBeDisabled();
    expect(
      screen.getByText("Informe quantos convidados você espera na festa."),
    ).toBeInTheDocument();
  });
});
