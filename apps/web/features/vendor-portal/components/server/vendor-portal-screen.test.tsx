import React from "react";
import type { VendorPortalContext } from "../../data/load-vendor-portal";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorPortalScreen } from "./vendor-portal-screen";

function context(overrides: Partial<VendorPortalContext> = {}): VendorPortalContext {
  return {
    vendor: {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "buffet-exemplo",
      name: "Buffet Exemplo",
      brandTokens: {},
      plan: "starter",
    },
    role: "admin",
    eventos: [],
    ...overrides,
  };
}

describe("VendorPortalScreen", () => {
  it("mostra o nome do fornecedor, o papel da conta e o plano", () => {
    render(<VendorPortalScreen {...context()} />);
    expect(screen.getByText("Buffet Exemplo")).toBeInTheDocument();
    expect(screen.getByText(/Administrador/)).toBeInTheDocument();
    expect(screen.getByText(/plano starter/)).toBeInTheDocument();
  });

  it("plano agency zera o selo 'com Albora' (white-label completo, spec §3)", () => {
    render(<VendorPortalScreen {...context({ vendor: { ...context().vendor, plan: "agency" } })} />);
    expect(screen.queryByText("Portal com Albora")).not.toBeInTheDocument();
  });

  it("planos starter/studio mantêm o selo 'com Albora'", () => {
    render(<VendorPortalScreen {...context()} />);
    expect(screen.getByText("Portal com Albora")).toBeInTheDocument();
  });

  it("admin vê o botão de assinar plano", () => {
    render(<VendorPortalScreen {...context({ role: "admin" })} />);
    expect(screen.getByText("Assinar plano")).toBeInTheDocument();
  });

  it("staff não vê o botão de assinar plano", () => {
    render(<VendorPortalScreen {...context({ role: "staff" })} />);
    expect(screen.queryByText("Assinar plano")).not.toBeInTheDocument();
  });
});
