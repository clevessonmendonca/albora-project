import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminCard } from "./admin-shell";

describe("AdminCard", () => {
  it("sem variant: usa shadow-suave, não shadow-alta", () => {
    render(<AdminCard>conteúdo</AdminCard>);

    const section = screen.getByText("conteúdo").closest("section");
    expect(section).toHaveClass("shadow-suave");
    expect(section).not.toHaveClass("shadow-alta");
  });

  it('variant="highlight": usa shadow-alta e bg-gradient-chao-quente, não shadow-suave', () => {
    render(<AdminCard variant="highlight">conteúdo</AdminCard>);

    const section = screen.getByText("conteúdo").closest("section");
    expect(section).toHaveClass("shadow-alta");
    expect(section).toHaveClass("bg-gradient-chao-quente");
    expect(section).not.toHaveClass("shadow-suave");
  });
});
