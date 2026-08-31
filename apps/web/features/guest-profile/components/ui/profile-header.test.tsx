import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileHeader } from "./profile-header";

describe("ProfileHeader", () => {
  it("volta para a capa, igual às outras telas do convidado", () => {
    render(
      <ProfileHeader
        nome="Marina"
        backHref="/e/festa-demo/cover"
        totalFotos={3}
        totalCurtidas={8}
      />,
    );

    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/e/festa-demo/cover",
    );
  });
});
