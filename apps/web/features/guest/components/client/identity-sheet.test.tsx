import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IdentitySheet } from "./identity-sheet";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

function renderSheet(overrides: Partial<React.ComponentProps<typeof IdentitySheet>> = {}) {
  const props = {
    eventoId: "11111111-1111-1111-1111-111111111111",
    via: "qr" as const,
    open: true,
    onClose: vi.fn(),
    onEntered: vi.fn(),
    ...overrides,
  };
  render(<IdentitySheet {...props} />);
  return props;
}

describe("IdentitySheet (identidade tardia, ADR 0021)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pede nome + consentimento; ação primária desabilitada sem nome", () => {
    renderSheet();
    expect(screen.getByText("Antes da sua primeira foto")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();

    const botao = screen.getByRole("button", { name: /continuar/i });
    expect(botao).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    expect(botao).toBeEnabled();
  });

  it("mostra a versão do consentimento sem duplicar o texto legal por padrão", () => {
    renderSheet();
    expect(screen.getByText(/Versão v1/)).toBeInTheDocument();
    expect(screen.queryByText(/no álbum, no feed e no telão/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(screen.getByText(/no álbum, no feed e no telão/)).toBeInTheDocument();
  });

  it("cria a sessão com consentimento versionado e chama onEntered no sucesso", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/sessions");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.eventoId).toBe("11111111-1111-1111-1111-111111111111");
      expect(body.consentimento).toBe("v1");
      expect(body.nome).toBe("Ana");
      expect(body.via).toBe("qr");
      return responder({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const props = renderSheet();
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => expect(props.onEntered).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falha de sessão mostra alerta e não chama onEntered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => responder({ code: "outro" }, 500)),
    );
    const props = renderSheet();
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não consegui entrar");
    expect(props.onEntered).not.toHaveBeenCalled();
  });
});
