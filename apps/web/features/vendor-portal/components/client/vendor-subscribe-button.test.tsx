import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorSubscribeButton } from "./vendor-subscribe-button";

const VENDOR_ID = "22222222-2222-2222-2222-222222222222";

describe("VendorSubscribeButton", () => {
  it("não oferece assinatura para staff", () => {
    render(
      <VendorSubscribeButton
        vendorId={VENDOR_ID}
        role="staff"
        currentPlan="starter"
        subscriptionStatus={null}
      />,
    );
    expect(screen.queryByRole("link", { name: "Ver planos" })).not.toBeInTheDocument();
  });

  it("leva o plano pedido para o checkout dedicado", () => {
    render(
      <VendorSubscribeButton
        vendorId={VENDOR_ID}
        role="admin"
        currentPlan="starter"
        requestedPlan="agency"
        subscriptionStatus={null}
      />,
    );

    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
      "href",
      `/admin/vendor/checkout?vendor=${VENDOR_ID}&plan=agency`,
    );
  });

  it("assinatura pendente mostra estado sem criar outra cobrança", () => {
    render(
      <VendorSubscribeButton
        vendorId={VENDOR_ID}
        role="admin"
        currentPlan="studio"
        subscriptionStatus="pending"
      />,
    );
    expect(screen.getByText("Aguardando confirmação")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver planos" })).not.toBeInTheDocument();
  });

  it("assinatura vencida apresenta recuperação", () => {
    render(
      <VendorSubscribeButton
        vendorId={VENDOR_ID}
        role="admin"
        currentPlan="studio"
        subscriptionStatus="overdue"
      />,
    );
    expect(screen.getByRole("link", { name: "Regularizar" })).toHaveAttribute(
      "href",
      `/admin/vendor/checkout?vendor=${VENDOR_ID}&plan=studio`,
    );
  });
});
