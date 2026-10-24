import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RemoverFotoDialog } from "./remover-foto-dialog";

describe("RemoverFotoDialog", () => {
  it("só remove depois de confirmar", async () => {
    const onConfirmar = vi.fn(async () => true);
    render(<RemoverFotoDialog aberto enviada onFechar={vi.fn()} onConfirmar={onConfirmar} />);

    expect(screen.getByText("Remover esta foto?")).toBeTruthy();
    expect(onConfirmar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remover", hidden: true }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
  });

  it("mostra a falha em vez de engolir quando a remoção não passa", async () => {
    render(
      <RemoverFotoDialog aberto enviada onFechar={vi.fn()} onConfirmar={async () => false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover", hidden: true }));
    await waitFor(() =>
      expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("Não deu para remover"),
    );
  });

  it("foto ainda não enviada fala em descartar", () => {
    render(<RemoverFotoDialog aberto enviada={false} onFechar={vi.fn()} onConfirmar={async () => true} />);
    expect(screen.getByText("Descartar esta foto?")).toBeTruthy();
  });

  it("Manter fecha sem remover", () => {
    const onFechar = vi.fn();
    const onConfirmar = vi.fn(async () => true);
    render(<RemoverFotoDialog aberto enviada onFechar={onFechar} onConfirmar={onConfirmar} />);
    fireEvent.click(screen.getByRole("button", { name: "Manter", hidden: true }));
    expect(onFechar).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
