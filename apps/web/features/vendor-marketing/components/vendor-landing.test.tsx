import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vendorPlanPrice } from "../data/vendor-plans";
import { VendorLanding } from "./vendor-landing";

describe("VendorLanding", () => {
  it("explica o produto e leva a uma criação real de evento", () => {
    render(<VendorLanding />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Entregue a festa que seus clientes não conseguiram ver inteira/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/QR, fotos, mensagens, missões, telão e álbum/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Criar.*evento/i })[0]).toHaveAttribute(
      "href",
      "/admin/vendor/new?next=event",
    );
  });

  it("renderiza preços da fonte de verdade do domínio", () => {
    expect(vendorPlanPrice("starter").replace(/\s/g, " ")).toBe("R$ 99");
    expect(vendorPlanPrice("studio").replace(/\s/g, " ")).toBe("R$ 249");
    expect(vendorPlanPrice("agency").replace(/\s/g, " ")).toBe("R$ 599");
  });
});
