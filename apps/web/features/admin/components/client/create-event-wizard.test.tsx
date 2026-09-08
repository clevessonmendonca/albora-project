import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateEventWizard } from "./create-event-wizard";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

/** Passo 0 (Evento): nome + data são o que valida; guests é opcional (fica em "mais detalhes"). */
function preencherEvento() {
  fireEvent.change(screen.getByLabelText("Nome do evento"), {
    target: { value: "Festa Teste" },
  });
  fireEvent.change(screen.getByLabelText("Data"), {
    target: { value: "2026-09-01" },
  });

  fireEvent.change(screen.getByLabelText("Quantos convidados presentes?"), {
    target: { value: "120" },
  });

  // Passo 1 → 2 → 3 → 4 (Confirmar)
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByText("Continuar"));
  }
}

describe("CreateEventWizard — três passos (redesign v4)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passo 0 valida nome e data antes de avançar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/admin/vendors") return responder({ vendors: [] });
        throw new Error(`fetch inesperado: ${input}`);
      }),
    );

    render(<CreateEventWizard />);
    await waitFor(() => expect(screen.getByText("Vamos criar seu evento")).toBeInTheDocument());

    // Sem nome/data, clicar não avança: continua no passo 0 e mostra erro.
    fireEvent.click(screen.getByRole("button", { name: /Tudo pronto/ }));
    expect(screen.getByText("Dê um nome ao evento pra continuar.")).toBeInTheDocument();
    expect(screen.queryByText("Escolha um estilo")).not.toBeInTheDocument();

    preencherEvento();
    fireEvent.click(screen.getByRole("button", { name: /Tudo pronto/ }));
    // Passo 1 (Aparência) apareceu.
    expect(screen.getByText("Escolha um estilo")).toBeInTheDocument();
  });

  it("sem vínculo em vendor_members: sem seletor, e o POST não manda vendorId", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/vendors") return responder({ vendors: [] });
      if (url === "/api/admin/events") {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body).not.toHaveProperty("vendorId");
        expect(body.title).toBe("Festa Teste");
        // A data única vira começo/fim com hora padrão.
        expect(body.comecaEm).toBe("2026-09-01T16:00");
        expect(body.terminaEm).toBe("2026-09-01T22:00");
        // As duas cores do evento viajam no identity (camada do casal).
        const identity = body.identityTokens as { eventCores?: unknown };
        expect(identity.eventCores).toMatchObject({ cor: expect.any(String), cor2: expect.any(String) });
        return responder({ eventoId: "evento-1", slug: "slug-1" });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateEventWizard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/vendors"));
    expect(screen.queryByText("Criar sob")).not.toBeInTheDocument();

    preencherEvento();
    fireEvent.click(screen.getByRole("button", { name: /Tudo pronto/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar evento" }));

    await waitFor(() => expect(screen.getByText(/está pronto/)).toBeInTheDocument());
  });

  it("com vínculo: escolher fornecedor manda vendorId + coupleEmail no POST", async () => {
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
    fireEvent.change(screen.getByLabelText("E-mail de quem recebe o painel"), {
      target: { value: "casal@exemplo.com" },
    });
    preencherEvento();

    fireEvent.click(screen.getByRole("button", { name: /Tudo pronto/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar evento" }));

    await waitFor(() => expect(screen.getByText(/está pronto/)).toBeInTheDocument());
  });

  it("com vínculo mas sem e-mail do casal: não avança do passo 0", async () => {
    const vendorId = "11111111-1111-1111-1111-111111111111";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/admin/vendors") {
          return responder({ vendors: [{ vendorId, name: "Buffet Teste", role: "staff" }] });
        }
        throw new Error(`fetch inesperado: ${input}`);
      }),
    );

    render(<CreateEventWizard />);
    const seletor = await screen.findByLabelText("Criar sob");
    fireEvent.change(seletor, { target: { value: vendorId } });
    preencherEvento();

    fireEvent.click(screen.getByRole("button", { name: /Tudo pronto/ }));
    // Segue no passo 0, com erro no e-mail e sem chegar à Aparência.
    expect(screen.getByText("Informe um e-mail válido pra quem recebe o painel.")).toBeInTheDocument();
    expect(screen.queryByText("Escolha um estilo")).not.toBeInTheDocument();
  });

  it("os cards de tipo vêm dos packs de criação, não hardcoded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/admin/vendors") return responder({ vendors: [] });
        throw new Error(`fetch inesperado: ${input}`);
      }),
    );
    render(<CreateEventWizard />);
    await waitFor(() => expect(screen.getByText("Vamos criar seu evento")).toBeInTheDocument());

    const grupo = screen.getByRole("group", { name: "Que evento é esse?" });
    const cards = within(grupo).getAllByRole("radio");
    // Seis tipos: casamento, aniversário, formatura, corporativo, celebração, outro.
    expect(cards).toHaveLength(6);
  });
});
