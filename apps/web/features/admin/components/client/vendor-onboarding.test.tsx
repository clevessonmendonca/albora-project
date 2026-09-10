import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VendorOnboarding } from "./vendor-onboarding";

function responder(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("VendorOnboarding", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("cria a operação e só então avança para a identidade", async () => {
    const fetchMock = vi.fn(async () => responder({ vendorId: "vendor-1", slug: "studio-aurora" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    render(<VendorOnboarding afterCreate="settings" />);
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), { target: { value: "Studio Aurora" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar fornecedor" }));

    expect(await screen.findByText(/Etapa 2 de 3/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/vendor",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("mostra a falha da criação sem perder os dados preenchidos", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({ message: "Esse identificador já está em uso" }, 409)));

    render(<VendorOnboarding afterCreate="event" />);
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), { target: { value: "Studio Aurora" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar fornecedor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esse identificador já está em uso");
    await waitFor(() => expect(screen.getByLabelText("Nome do fornecedor")).toHaveValue("Studio Aurora"));
  });
});
