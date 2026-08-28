import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renderiza os children recebidos", () => {
    render(<Button>Confirmar presença</Button>);

    expect(screen.getByRole("button", { name: "Confirmar presença" })).toBeInTheDocument();
  });
});
