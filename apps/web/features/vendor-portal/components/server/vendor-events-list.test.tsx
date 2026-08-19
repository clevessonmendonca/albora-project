import React from "react";
import type { VendorEventSummary } from "@albora/db";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorEventsList } from "./vendor-events-list";

function evento(overrides: Partial<VendorEventSummary> = {}): VendorEventSummary {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "evento-um",
    title: null,
    packId: "inexistente-no-catalogo",
    plan: "vendor",
    expectedGuests: 120,
    startsAt: new Date("2026-10-10T20:00:00-03:00"),
    isDemo: false,
    ...overrides,
  };
}

describe("VendorEventsList", () => {
  it("mostra o estado vazio quando o fornecedor não tem eventos", () => {
    render(<VendorEventsList eventos={[]} />);
    expect(screen.getByText("Nenhum evento ainda")).toBeInTheDocument();
  });

  it("lista os eventos com contagem, data e convidados esperados", () => {
    render(
      <VendorEventsList
        eventos={[
          evento({ id: "a", title: "Festa da Marina", expectedGuests: 80 }),
          evento({ id: "b", title: "Festa do João", isDemo: true }),
        ]}
      />,
    );

    expect(screen.getByText("2 eventos")).toBeInTheDocument();
    expect(screen.getByText("Festa da Marina")).toBeInTheDocument();
    expect(screen.getByText("Festa do João")).toBeInTheDocument();
    expect(screen.getByText(/80 convidados esperados/)).toBeInTheDocument();
    expect(screen.getByText(/demo/)).toBeInTheDocument();
  });

  it("sem título, cai para o nome derivado do slug (adminEventDisplayName)", () => {
    render(<VendorEventsList eventos={[evento({ title: null, slug: "evento-sem-titulo" })]} />);
    expect(screen.getByText("evento-sem-titulo")).toBeInTheDocument();
  });

  it("não renderiza link nenhum — B1-mínimo é leitura, sem navegação para /admin/e/{id}", () => {
    render(<VendorEventsList eventos={[evento()]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
