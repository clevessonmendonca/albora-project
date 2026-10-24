import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventTeamPanel } from "./event-team-panel";

const EVENTO = "11111111-1111-1111-1111-111111111111";

function simular(convite: () => Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST" ? convite() : new Response(JSON.stringify({ members: [] }), { status: 200 }),
    ),
  );
}

async function convidar() {
  render(<EventTeamPanel eventId={EVENTO} canManageTeam />);
  await userEvent.type(await screen.findByLabelText(/e-mail/i), "a@b.com");
  await userEvent.click(screen.getByRole("button", { name: /convidar/i }));
}

describe("EventTeamPanel: erro de convite", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resposta 500 com corpo que não é JSON não vaza texto técnico", async () => {
    simular(async () => new Response("<html>boom</html>", { status: 500 }));
    await convidar();
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível convidar agora");
    expect(alerta.textContent).not.toMatch(/Unexpected|JSON|token/i);
  });

  it("sessão expirada (401) diz para entrar de novo", async () => {
    simular(async () => new Response("{}", { status: 401 }));
    await convidar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Entre de novo");
  });

  it("validação (422) mostra a mensagem do servidor", async () => {
    simular(async () => new Response(JSON.stringify({ message: "E-mail inválido" }), { status: 422 }));
    await convidar();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("E-mail inválido"));
  });
});
