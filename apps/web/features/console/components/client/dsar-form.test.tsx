import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DsarForm } from "./dsar-form";

const { createDsarRequestActionMock } = vi.hoisted(() => ({
  createDsarRequestActionMock: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/features/console/actions", () => ({ createDsarRequestAction: createDsarRequestActionMock }));

describe("DsarForm", () => {
  it("botão fica desabilitado até conta, prazo e motivo estarem preenchidos", async () => {
    render(<DsarForm />);
    expect(screen.getByRole("button", { name: "Registrar pedido" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Conta do titular (id)"), "conta-1");
    await userEvent.type(screen.getByLabelText("Prazo legal"), "2026-10-01");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido por e-mail");
    expect(screen.getByRole("button", { name: "Registrar pedido" })).toBeEnabled();
  });

  it("nunca sugere um prazo padrão — o campo de data nasce vazio", () => {
    render(<DsarForm />);
    expect(screen.getByLabelText("Prazo legal")).toHaveValue("");
  });

  it("envia o pedido e mostra o erro do comando quando negado", async () => {
    createDsarRequestActionMock.mockResolvedValueOnce({ ok: false, error: "motivo obrigatório" });
    render(<DsarForm />);
    await userEvent.type(screen.getByLabelText("Conta do titular (id)"), "conta-1");
    await userEvent.type(screen.getByLabelText("Prazo legal"), "2026-10-01");
    await userEvent.type(screen.getByLabelText("Motivo"), "pedido por e-mail");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pedido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("motivo obrigatório");
  });
});
