import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedEmptyState } from "./feed-empty-state";

describe("FeedEmptyState", () => {
  it("mostra o CTA de câmera também no espelho", () => {
    render(
      <FeedEmptyState
        interacao="espelho"
        filtroMissao={null}
        cameraPath="/e/festa/photo"
      />,
    );

    const cta = screen.getByRole("link", { name: "Tirar foto" });
    expect(cta).toHaveAttribute("href", "/e/festa/photo");
  });
});
