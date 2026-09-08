import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EntityHeader } from "./entity-header";

describe("EntityHeader", () => {
  it("sem ações não renderiza a área de ações", () => {
    render(<EntityHeader title="Maria & João" subtitle="Anfitrião" status={{ tone: "positive", label: "Ativo" }} />);
    expect(screen.queryByTestId("entity-header-actions")).not.toBeInTheDocument();
  });

  it("com ações renderiza a área de ações", () => {
    render(
      <EntityHeader
        title="Maria & João"
        subtitle="Anfitrião"
        status={{ tone: "positive", label: "Ativo" }}
        actions={<button type="button">Revelar contato</button>}
      />,
    );
    expect(screen.getByTestId("entity-header-actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revelar contato" })).toBeInTheDocument();
  });

  it("renderiza título, subtítulo e status", () => {
    render(<EntityHeader title="Maria & João" subtitle="Anfitrião" status={{ tone: "critico", label: "Suspenso" }} />);
    expect(screen.getByRole("heading", { name: "Maria & João" })).toBeInTheDocument();
    expect(screen.getByText("Anfitrião")).toBeInTheDocument();
    expect(screen.getByText("Suspenso")).toBeInTheDocument();
  });
});
