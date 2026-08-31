import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "./filter-chip";

describe("FilterChip", () => {
  it("renderiza label corretamente", () => {
    render(<FilterChip label="Vintage" active={false} onClick={() => {}} />);
    expect(screen.getByText("Vintage")).toBeInTheDocument();
  });

  it("mostra thumbnail quando fornecido", () => {
    const { container } = render(
      <FilterChip
        label="Vintage"
        thumbnail="/thumb.jpg"
        active={false}
        onClick={() => {}}
      />
    );
    // A imagem é decorativa (alt="") de propósito: o label ao lado já dá o
    // nome acessível do botão, então ela não tem role="img" — é
    // role="presentation" por spec ARIA. Consultar via querySelector, não getByRole.
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/thumb.jpg");
  });

  it("aplica estilos de active corretamente", () => {
    const { rerender } = render(
      <FilterChip label="Vintage" active={false} onClick={() => {}} />
    );
    const button = screen.getByRole("button");
    
    expect(button).toHaveClass("border-linha");
    expect(button).toHaveClass("text-ink-3");
    
    rerender(<FilterChip label="Vintage" active={true} onClick={() => {}} />);
    expect(button).toHaveClass("border-acento");
    expect(button).toHaveClass("text-acento-texto");
  });

  it("chama onClick quando clicado", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<FilterChip label="Vintage" active={false} onClick={handleClick} />);
    await user.click(screen.getByRole("button"));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("mostra indicador de sugerido quando suggested é true", () => {
    const { container } = render(
      <FilterChip 
        label="Vintage" 
        thumbnail="/thumb.jpg"
        active={false} 
        suggested={true}
        onClick={() => {}} 
      />
    );
    
    const indicator = container.querySelector(".bg-acento");
    expect(indicator).toBeInTheDocument();
  });

  it("não mostra indicador de sugerido quando active", () => {
    const { container } = render(
      <FilterChip 
        label="Vintage" 
        thumbnail="/thumb.jpg"
        active={true} 
        suggested={true}
        onClick={() => {}} 
      />
    );
    
    const indicator = container.querySelector(".size-2.bg-acento");
    expect(indicator).not.toBeInTheDocument();
  });
});
