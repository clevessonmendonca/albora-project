import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("renderiza progresso corretamente", () => {
    render(<ProgressBar current={3} total={10} />);
    expect(screen.getByText("3 de 10")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("mostra label customizado", () => {
    render(<ProgressBar current={5} total={10} label="5 missões completas" />);
    expect(screen.getByText("5 missões completas")).toBeInTheDocument();
  });

  it("mostra completedLabel quando concluído", () => {
    render(
      <ProgressBar 
        current={10} 
        total={10} 
        completedLabel="Todas completas!" 
      />
    );
    expect(screen.getByText("Todas completas!")).toBeInTheDocument();
    expect(screen.getByText("100%")).toHaveClass("text-acento-texto");
  });

  it("esconde porcentagem quando showPercentage é false", () => {
    render(<ProgressBar current={3} total={10} showPercentage={false} />);
    expect(screen.queryByText("30%")).not.toBeInTheDocument();
  });

  it("não aplica accent quando accentWhenComplete é false", () => {
    render(
      <ProgressBar 
        current={10} 
        total={10} 
        accentWhenComplete={false}
      />
    );
    expect(screen.getByText("100%")).not.toHaveClass("text-acento-texto");
  });

  it("calcula porcentagem corretamente", () => {
    const { rerender } = render(<ProgressBar current={0} total={10} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    
    rerender(<ProgressBar current={5} total={10} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    
    rerender(<ProgressBar current={10} total={10} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("lida com total zero sem erros", () => {
    render(<ProgressBar current={0} total={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
