import React from "react";
import type { ResumoDoFornecedor } from "@albora/db";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorSummaryCard } from "./vendor-summary-card";

function resumo(overrides: Partial<ResumoDoFornecedor> = {}): ResumoDoFornecedor {
  return {
    totalEventos: 3,
    totalFotos: 240,
    h1Medio: 0.42,
    ...overrides,
  };
}

describe("VendorSummaryCard", () => {
  it("mostra o nome do fornecedor e as três métricas agregadas", () => {
    render(<VendorSummaryCard vendorName="Buffet X" resumo={resumo()} />);

    expect(screen.getByText("Buffet X")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("240")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("H1 médio")).toBeInTheDocument();
  });

  it("arredonda h1Medio para porcentagem inteira", () => {
    render(<VendorSummaryCard vendorName="Buffet Y" resumo={resumo({ h1Medio: 0.3333 })} />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("zero eventos e zero fotos não estouram, mostram 0", () => {
    render(
      <VendorSummaryCard
        vendorName="Buffet Z"
        resumo={resumo({ totalEventos: 0, totalFotos: 0, h1Medio: 0 })}
      />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });
});
