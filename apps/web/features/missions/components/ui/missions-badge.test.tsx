import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionsBadge } from "./missions-badge";

describe("MissionsBadge", () => {
  it("não renderiza sem missões", () => {
    const { container } = render(<MissionsBadge done={0} total={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("mostra progresso incompleto", () => {
    render(<MissionsBadge done={2} total={8} />);
    expect(screen.getByLabelText("2 de 8 missões completas")).toHaveTextContent("2/8 missões");
  });

  it("muda o tom quando todas estão completas", () => {
    render(<MissionsBadge done={8} total={8} />);
    expect(screen.getByLabelText("8 de 8 missões completas")).toHaveTextContent("8 missões");
  });

  it("usa a variante compacta quando pedida", () => {
    render(<MissionsBadge done={2} total={8} variant="compact" />);
    expect(screen.getByLabelText("2 de 8 missões completas")).toHaveTextContent("2/8");
  });
});
