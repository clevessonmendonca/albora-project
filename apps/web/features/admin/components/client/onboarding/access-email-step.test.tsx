import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessEmailStep } from "./access-email-step";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

describe("AccessEmailStep (e-mail-como-acesso, ADR 0020)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sem senha/cadastro: envia o e-mail pelo magic link existente e confirma", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/admin/entrar");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.email).toBe("noiva@exemplo.com");
      expect(body.next).toBe("/admin/e/evento-9");
      return responder({ enviado: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccessEmailStep eventId="evento-9" />);
    expect(screen.getByText("Pra onde enviamos o acesso do seu evento?")).toBeInTheDocument();
    // Sem linguagem de senha.
    expect(screen.queryByText(/senha/i)).toHaveTextContent(/sem senha/i);

    fireEvent.change(screen.getByLabelText("Pra onde enviamos o acesso do seu evento?"), {
      target: { value: "noiva@exemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar acesso" }));

    await waitFor(() => expect(screen.getByText("Verifique seu e-mail")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("e-mail inválido mantém o botão desativado", () => {
    render(<AccessEmailStep eventId="evento-9" />);
    fireEvent.change(screen.getByLabelText("Pra onde enviamos o acesso do seu evento?"), {
      target: { value: "não-é-email" },
    });
    expect(screen.getByRole("button", { name: "Enviar acesso" })).toBeDisabled();
  });
});
