import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VendorSubscribeButton } from "./vendor-subscribe-button";

const VENDOR_ID = "22222222-2222-2222-2222-222222222222";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

/**
 * O gate de papel aqui é conveniência de UI — a rota
 * `POST /api/vendors/{id}/subscription` revalida `role === "admin"` no
 * servidor (V2b) e é o teste que importa para a garantia de segurança.
 */
describe("VendorSubscribeButton", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("staff não vê o botão de assinar", () => {
    render(<VendorSubscribeButton vendorId={VENDOR_ID} role="staff" currentPlan="starter" />);
    expect(screen.queryByText("Assinar plano")).not.toBeInTheDocument();
  });

  it("admin escolhe um plano, assina, e vê o link de pagamento", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { plan: string };
      expect(body.plan).toBe("studio");
      return responder({
        subscriptionId: "sub-1",
        asaasSubscriptionId: "asaas-1",
        invoiceUrl: "https://asaas.example/invoice/1",
        amountCents: 24900,
        plan: "studio",
        stub: true,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<VendorSubscribeButton vendorId={VENDOR_ID} role="admin" currentPlan="starter" />);

    fireEvent.click(screen.getByText(/Studio/));
    fireEvent.click(screen.getByText("Assinar plano"));

    await waitFor(() => {
      expect(screen.getByText("Pagar assinatura")).toBeInTheDocument();
    });
    expect(screen.getByText("Pagar assinatura")).toHaveAttribute(
      "href",
      "https://asaas.example/invoice/1",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/vendors/${VENDOR_ID}/subscription`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("erro do servidor mostra a mensagem, sem quebrar a tela", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        responder({ code: "vendor.papel_negado", message: "Só admin do fornecedor pode assinar" }, 403),
      ),
    );

    render(<VendorSubscribeButton vendorId={VENDOR_ID} role="admin" currentPlan="starter" />);
    fireEvent.click(screen.getByText("Assinar plano"));

    expect(await screen.findByText("Só admin do fornecedor pode assinar")).toBeInTheDocument();
    expect(screen.queryByText("Pagar assinatura")).not.toBeInTheDocument();
  });
});
