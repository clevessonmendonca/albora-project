import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { VendorForm } from "./vendor-form";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

describe("VendorForm — modo create", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deriva o slug a partir do nome até o campo de slug ser editado", () => {
    render(<VendorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), {
      target: { value: "Buffet da Serra" },
    });
    expect((screen.getByLabelText("Identificador (URL)") as HTMLInputElement).value).toBe(
      "buffet-da-serra",
    );
  });

  it("editar o slug manualmente para de seguir o nome", () => {
    render(<VendorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), {
      target: { value: "Buffet da Serra" },
    });
    fireEvent.change(screen.getByLabelText("Identificador (URL)"), {
      target: { value: "meu-slug" },
    });
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), {
      target: { value: "Outro nome qualquer" },
    });
    expect((screen.getByLabelText("Identificador (URL)") as HTMLInputElement).value).toBe(
      "meu-slug",
    );
  });

  it("botão de criar começa desabilitado (campos vazios)", () => {
    render(<VendorForm mode="create" />);
    expect(screen.getByText("Criar fornecedor")).toBeDisabled();
  });

  it("slug com caractere inválido mostra erro e desabilita o botão", () => {
    render(<VendorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), {
      target: { value: "Nome Válido" },
    });
    fireEvent.change(screen.getByLabelText("Identificador (URL)"), {
      target: { value: "Slug Inválido!" },
    });
    expect(screen.getByText("Use só letras minúsculas, números e hífen.")).toBeInTheDocument();
    expect(screen.getByText("Criar fornecedor")).toBeDisabled();
  });

  it("erro do servidor exibe mensagem, sem navegar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => responder({ message: "Esse identificador já está em uso" }, 409)),
    );
    render(<VendorForm mode="create" />);
    fireEvent.change(screen.getByLabelText("Nome do fornecedor"), {
      target: { value: "Buffet da Serra" },
    });
    fireEvent.click(screen.getByText("Criar fornecedor"));

    await waitFor(() => {
      expect(screen.getByText("Esse identificador já está em uso")).toBeInTheDocument();
    });
  });
});

describe("VendorForm — modo edit", () => {
  afterEach(() => vi.unstubAllGlobals());

  const VENDOR_ID = "11111111-1111-1111-1111-111111111111";

  it("preenche nome/slug iniciais e salva via PATCH", async () => {
    const fetchMock = vi.fn(async () => responder({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VendorForm
        mode="edit"
        vendorId={VENDOR_ID}
        initialName="Buffet X"
        initialSlug="buffet-x"
      />,
    );

    expect((screen.getByLabelText("Nome do fornecedor") as HTMLInputElement).value).toBe(
      "Buffet X",
    );
    fireEvent.click(screen.getByText("Salvar"));

    await waitFor(() => {
      expect(screen.getByText("✓ Salvo")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/vendor/${VENDOR_ID}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
