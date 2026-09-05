import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionActions } from "./subscription-actions";

vi.mock("@/features/console/actions", () => ({
  applySubscriptionCourtesyAction: vi.fn().mockResolvedValue({ ok: true }),
  cancelSubscriptionAction: vi.fn().mockResolvedValue({ ok: false, error: "motivo é obrigatório" }),
  changeSubscriptionPlanAction: vi.fn(),
}));

describe("SubscriptionActions", () => {
  it("sem subscription.mutate mostra só travessão", () => {
    render(<SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar={false} podeReembolsar={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("cancelar sem motivo mostra o erro devolvido pelo comando", async () => {
    render(<SubscriptionActions subscriptionId="s1" vendorId="v1" plan="studio" podeMutar podeReembolsar={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar assinatura" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("motivo é obrigatório");
  });
});
