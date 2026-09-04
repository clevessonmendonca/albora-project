import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./guest-chrome";

describe("EmptyState", () => {
  it("mostra ação quando fornecida via `acao` (props novas titulo/descricao)", () => {
    render(
      <EmptyState titulo="Sem fotos" descricao="Seja o primeiro" acao={<button>Tirar foto</button>} />,
    );

    expect(screen.getByText("Sem fotos")).toBeInTheDocument();
    expect(screen.getByText("Seja o primeiro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tirar foto" })).toBeInTheDocument();
  });

  it("continua funcionando com as props originais title/lede/cameraPath (compatibilidade)", () => {
    render(<EmptyState title="Ainda não tem foto" lede="Seja o primeiro a fotografar." cameraPath="/e/festa/photo" />);

    expect(screen.getByText("Ainda não tem foto")).toBeInTheDocument();
    expect(screen.getByText("Seja o primeiro a fotografar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tirar foto" })).toHaveAttribute("href", "/e/festa/photo");
  });

  it("usa as classes da escala tipográfica no título e na descrição", () => {
    render(<EmptyState titulo="Sem fotos" descricao="Seja o primeiro" />);

    expect(screen.getByText("Sem fotos").className).toContain("tipo-title");
    expect(screen.getByText("Seja o primeiro").className).toContain("tipo-body");
  });

  it("sem `acao` nem `cameraPath`, não renderiza CTA", () => {
    render(<EmptyState titulo="Sem fotos" descricao="Seja o primeiro" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renderiza o ícone opcional quando fornecido", () => {
    render(
      <EmptyState
        titulo="Sem fotos"
        descricao="Seja o primeiro"
        icon={<svg data-testid="icone-vazio" />}
      />,
    );

    expect(screen.getByTestId("icone-vazio")).toBeInTheDocument();
  });
});
