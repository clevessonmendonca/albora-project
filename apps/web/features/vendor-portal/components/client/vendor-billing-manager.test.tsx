import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VendorBillingManager } from "./vendor-billing-manager";

const vendorId = "22222222-2222-2222-2222-222222222222";
const subscription = {
  id: "33333333-3333-3333-3333-333333333333",
  vendorId,
  status: "active" as const,
  plan: "studio" as const,
  pendingPlan: null,
  cancelRequestedAt: null,
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};
const payment = {
  id: "pay_1",
  status: "RECEIVED",
  amountCents: 24900,
  billingType: "PIX",
  description: "Albora Fornecedor — plano studio",
  createdAt: "2026-09-01T12:00:00.000Z",
  dueDate: "2026-09-08",
  invoiceUrl: "https://pagamentos.example/recibo/1",
};

afterEach(() => vi.unstubAllGlobals());

describe("VendorBillingManager", () => {
  it("mostra cobranças reais e oferece o recibo seguro", () => {
    render(<VendorBillingManager vendorId={vendorId} vendorPlan="studio" subscription={subscription} payments={[payment]} providerAvailable paymentsAvailable />);
    expect(screen.getAllByText(/249,00/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Abrir recibo" })).toHaveAttribute(
      "href",
      "https://pagamentos.example/recibo/1",
    );
  });

  it("registra troca de plano e mostra que ainda aguarda confirmação", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      subscription: { ...subscription, pendingPlan: "agency" },
    }), { status: 200 })));
    render(<VendorBillingManager vendorId={vendorId} vendorPlan="studio" subscription={subscription} payments={[]} providerAvailable paymentsAvailable />);
    fireEvent.change(screen.getByLabelText("Próximo plano"), { target: { value: "agency" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(await screen.findByText("Mudança para Agency aguardando confirmação")).toBeInTheDocument();
  });

  it("só cancela depois da confirmação inline", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      subscription: { ...subscription, cancelRequestedAt: "2026-09-09T12:00:00.000Z" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<VendorBillingManager vendorId={vendorId} vendorPlan="studio" subscription={subscription} payments={[]} providerAvailable paymentsAvailable />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar assinatura" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(screen.getByText("Cancelamento em processamento")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/vendors/${vendorId}/subscription/${subscription.id}`,
      { method: "DELETE" },
    );
  });

  it("distingue falha do provedor de um histórico realmente vazio", () => {
    render(<VendorBillingManager vendorId={vendorId} vendorPlan="studio" subscription={subscription} payments={[]} providerAvailable paymentsAvailable={false} />);
    expect(screen.getByText("O histórico não carregou.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma cobrança disponível ainda.")).not.toBeInTheDocument();
  });
});
