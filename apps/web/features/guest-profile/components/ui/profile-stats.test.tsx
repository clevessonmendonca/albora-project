import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileStats } from "./profile-stats";

describe("ProfileStats", () => {
  it("mostra fotos e curtidas", () => {
    render(<ProfileStats totalFotos={12} totalCurtidas={48} />);
    expect(screen.getByText("Fotos")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Curtidas")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });
});
