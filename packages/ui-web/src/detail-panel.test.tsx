import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailPanel } from "./detail-panel";

describe("DetailPanel", () => {
  it("seção vazia não quebra e mostra o vazio da seção", () => {
    render(
      <DetailPanel
        title="Identidade"
        sections={[{ key: "consentimentos", label: "Consentimentos", content: null, emptyLabel: "Nenhum consentimento registrado" }]}
      />,
    );
    expect(screen.getByText("Nenhum consentimento registrado")).toBeInTheDocument();
  });

  it("seção com conteúdo renderiza o conteúdo, não o vazio", () => {
    render(
      <DetailPanel
        title="Atividade"
        sections={[{ key: "eventos", label: "Eventos", content: <p>1 evento</p>, emptyLabel: "Nenhum evento" }]}
      />,
    );
    expect(screen.getByText("1 evento")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum evento")).not.toBeInTheDocument();
  });

  it("sem seções não quebra", () => {
    render(<DetailPanel title="Vazio" sections={[]} />);
    expect(screen.getByRole("heading", { name: "Vazio" })).toBeInTheDocument();
  });
});
