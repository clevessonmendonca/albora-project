import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VendorCheckoutForm } from "./vendor-checkout-form";

const VENDOR_ID = "22222222-2222-2222-2222-222222222222";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

describe("VendorCheckoutForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia plano e forma de pagamento escolhidos", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ plan: "agency", billingType: "CREDIT_CARD" });
      return responder({
        invoiceUrl: "https://asaas.example/invoice/1",
        plan: "agency",
        amountCents: 59900,
        stub: false,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VendorCheckoutForm
        vendorId={VENDOR_ID}
        vendorName="Studio Aurora"
        initialPlan="studio"
        returnHref="/f/studio-aurora"
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Agency/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Cartão/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar assinatura" }));

    expect(await screen.findByText("Agora falta a confirmação do pagamento.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir pagamento seguro" })).toHaveAttribute(
      "href",
      "https://asaas.example/invoice/1",
    );
  });

  it("não cria link quando o provedor ainda não devolveu a cobrança", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({ invoiceUrl: null, plan: "starter", amountCents: 9900, stub: true })));
    render(
      <VendorCheckoutForm
        vendorId={VENDOR_ID}
        vendorName="Studio Aurora"
        initialPlan="starter"
        returnHref="/f/studio-aurora"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar assinatura" }));

    expect(await screen.findByText(/não enviou um link de pagamento/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir pagamento seguro" })).not.toBeInTheDocument();
  });

  it("mantém a seleção e oferece recuperação após falha", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => responder({ message: "Espere um instante" }, 429)));
    render(
      <VendorCheckoutForm
        vendorId={VENDOR_ID}
        vendorName="Studio Aurora"
        initialPlan="studio"
        returnHref="/f/studio-aurora"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar assinatura" }));

    expect(await screen.findByText("Espere um instante")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Studio/ })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar assinatura" })).toBeEnabled());
  });
});
