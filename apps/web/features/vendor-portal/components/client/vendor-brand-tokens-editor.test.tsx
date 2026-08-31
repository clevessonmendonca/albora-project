import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ALBORA_BRAND, MODELOS_DE_IDENTIDADE } from "@albora/tokens";
import { VendorBrandTokensEditor } from "./vendor-brand-tokens-editor";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";

const AMANHECER = MODELOS_DE_IDENTIDADE.find((m) => m.id === "amanhecer")!;
const ACENTO_INICIAL = ALBORA_BRAND.cores.acento;

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

describe("VendorBrandTokensEditor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renderiza o botão de salvar e a prévia", () => {
    render(<VendorBrandTokensEditor vendorId={VENDOR_ID} initialBrandTokens={{}} />);
    expect(screen.getByText("Salvar identidade")).toBeInTheDocument();
    expect(screen.getByTestId("brand-preview")).toBeInTheDocument();
  });

  it("preenche acento inicial de initialBrandTokens", () => {
    render(
      <VendorBrandTokensEditor
        vendorId={VENDOR_ID}
        initialBrandTokens={{ cores: { acento: ACENTO_INICIAL } }}
      />,
    );
    const input = screen.getByLabelText("Hex da cor de destaque") as HTMLInputElement;
    expect(input.value).toBe(ACENTO_INICIAL);
  });

  it("salva com sucesso e exibe confirmação", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({ ok: true })));

    render(<VendorBrandTokensEditor vendorId={VENDOR_ID} initialBrandTokens={{}} />);
    fireEvent.click(screen.getByText("Salvar identidade"));

    await waitFor(() => {
      expect(screen.getByText("✓ Identidade salva com sucesso")).toBeInTheDocument();
    });
  });

  it("erro do servidor exibe mensagem de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => responder({ code: "erro.interno", message: "Não foi possível salvar agora" }, 500)),
    );

    render(<VendorBrandTokensEditor vendorId={VENDOR_ID} initialBrandTokens={{}} />);
    fireEvent.click(screen.getByText("Salvar identidade"));

    await waitFor(() => {
      expect(screen.getByText("Não foi possível salvar agora")).toBeInTheDocument();
    });
    expect(screen.queryByText("✓ Identidade salva com sucesso")).not.toBeInTheDocument();
  });

  it("hex inválido desabilita o botão de salvar", () => {
    render(<VendorBrandTokensEditor vendorId={VENDOR_ID} initialBrandTokens={{}} />);
    const input = screen.getByLabelText("Hex da cor de destaque");
    fireEvent.change(input, { target: { value: "vermelho" } });
    expect(screen.getByText("Salvar identidade")).toBeDisabled();
  });

  it("preset de identidade preenche os campos de cor com o acento do modelo", () => {
    render(<VendorBrandTokensEditor vendorId={VENDOR_ID} initialBrandTokens={{}} />);
    fireEvent.click(screen.getByText(AMANHECER.nome));
    const input = screen.getByLabelText("Hex da cor de destaque") as HTMLInputElement;
    expect(input.value).toBe(AMANHECER.camada.cores?.acento);
  });
});
