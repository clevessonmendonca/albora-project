// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RetentionCard } from "./retention-card";

describe("RetentionCard", () => {
  it("mostra a copy de retenção (§126) e o botão de receber as fotos", () => {
    render(<RetentionCard eventId="evento-123" />);

    expect(screen.getByText("Salve suas fotos e receba o álbum")).toBeInTheDocument();
    expect(
      screen.getByText(/sem senha\. só pra guardar o que é seu — e mandar o álbum depois\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receber minhas fotos" })).toBeInTheDocument();
  });
});
