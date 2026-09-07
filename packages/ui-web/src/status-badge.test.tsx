import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

const HEX = /#[0-9a-fA-F]{3,8}\b/;

describe("StatusBadge", () => {
  it("não usa hex em nenhum tom", () => {
    for (const tone of ["neutral", "positive", "atencao", "critico"] as const) {
      const { container, unmount } = render(<StatusBadge tone={tone}>Rótulo</StatusBadge>);
      expect(container.innerHTML).not.toMatch(HEX);
      unmount();
    }
  });

  it("sempre renderiza o texto — cor é reforço, não o único portador de significado", () => {
    const { getByText } = render(<StatusBadge tone="critico">Bloqueado</StatusBadge>);
    expect(getByText("Bloqueado")).toBeInTheDocument();
  });
});
