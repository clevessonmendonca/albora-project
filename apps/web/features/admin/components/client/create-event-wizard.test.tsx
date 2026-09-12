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

function continuar() {
  fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
}

function irParaDetalhes() {
  continuar();
}

function preencherDetalhes() {
  fireEvent.change(screen.getByLabelText("Nome do evento"), {
    target: { value: "Festa Teste" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Escolher data/ }));
  fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
}

describe("CreateEventWizard — quatro passos (Tipo · Detalhes · Aparência · Pronto)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("Detalhes valida nome e data antes de avançar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/admin/vendors") return responder({ vendors: [] });
        throw new Error(`fetch inesperado: ${input}`);
      }),
    );

    render(<CreateEventWizard />);
    await waitFor(() =>
      expect(screen.getByText("O que vocês estão celebrando?")).toBeInTheDocument(),
    );

    irParaDetalhes();
    // Sem nome/data, continuar não avança: erro e sem chegar à Aparência.
    continuar();
    expect(screen.getByText("Dê um nome ao evento pra continuar.")).toBeInTheDocument();
    expect(screen.queryByText("Escolha um estilo")).not.toBeInTheDocument();

    preencherDetalhes();
    continuar();
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
        // Começo com hora padrão (18h); fim é +6h.
        expect(body.comecaEm).toMatch(/^\d{4}-\d{2}-\d{2}T18:00$/);
        expect(new Date(String(body.terminaEm)).getTime()).toBeGreaterThan(
          new Date(String(body.comecaEm)).getTime(),
        );
        const identity = body.identityTokens as { eventCores?: unknown };
        expect(identity.eventCores).toMatchObject({ cor: expect.any(String), cor2: expect.any(String) });
        return responder({ eventoId: "evento-1", slug: "slug-1" });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateEventWizard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/vendors"));
    // O seletor de fornecedor só existe no passo Detalhes.
    expect(screen.queryByText("Criar sob")).not.toBeInTheDocument();

    irParaDetalhes();
    preencherDetalhes();
    continuar();
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
    irParaDetalhes();

    const seletor = await screen.findByLabelText("Criar sob");
    fireEvent.change(seletor, { target: { value: vendorId } });
    fireEvent.change(screen.getByLabelText("E-mail de quem recebe o painel"), {
      target: { value: "casal@exemplo.com" },
    });
    preencherDetalhes();

    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Criar evento" }));

    await waitFor(() => expect(screen.getByText(/está pronto/)).toBeInTheDocument());
  });

  it("com vínculo mas sem e-mail do casal: não avança de Detalhes", async () => {
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
    irParaDetalhes();
    const seletor = await screen.findByLabelText("Criar sob");
    fireEvent.change(seletor, { target: { value: vendorId } });
    preencherDetalhes();

    continuar();
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
    await waitFor(() =>
      expect(screen.getByText("O que vocês estão celebrando?")).toBeInTheDocument(),
    );

    const grupo = screen.getByRole("group", { name: "Que evento é esse?" });
    const cards = within(grupo).getAllByRole("radio");
    expect(cards).toHaveLength(6);
  });

  it("desligar uma missão no sheet manda uma missão a menos no POST", async () => {
    let missoesEnviadas: string[] | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/vendors") return responder({ vendors: [] });
      if (url === "/api/admin/events") {
        const body = JSON.parse(String(init?.body)) as { missoes?: string[] };
        missoesEnviadas = body.missoes;
        return responder({ eventoId: "evento-3", slug: "slug-3" });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateEventWizard />);
    await waitFor(() =>
      expect(screen.getByText("O que vocês estão celebrando?")).toBeInTheDocument(),
    );

    // O sheet de missões abre no passo Tipo.
    fireEvent.click(screen.getByRole("button", { name: /Ajustar missões/ }));
    const dialog = screen.getByRole("dialog", { name: "Missões" });
    const switches = within(dialog).getAllByRole("switch");
    const total = switches.length;
    expect(total).toBeGreaterThan(1);
    fireEvent.click(switches[0]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Pronto" }));

    irParaDetalhes();
    preencherDetalhes();
    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Criar evento" }));

    await waitFor(() => expect(screen.getByText(/está pronto/)).toBeInTheDocument());
    expect(missoesEnviadas).toHaveLength(total - 1);
  });
});
