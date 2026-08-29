import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MomentCard } from "./moment-card";
import type { CoverMoment } from "../../types/cover";

const momento = (over: Partial<CoverMoment> = {}): CoverMoment => ({
  id: "m1",
  title: "Pista",
  missionFilterId: "missao-pista",
  thumbUrl: null,
  contributorsLabel: null,
  ...over,
});

describe("MomentCard", () => {
  it("leva para a câmera da missão, não para o álbum", () => {
    render(
      <MomentCard
        moment={momento()}
        slug="festa-demo"
        index={0}
        central
        interactionOpen={false}
      />,
    );

    const link = screen.getByRole("link", { name: "Fotografar Pista" });
    expect(link).toHaveAttribute("href", "/e/festa-demo/photo?missao=missao-pista");
    expect(link.getAttribute("href")).not.toContain("/album");
  });

  it("sem missão, abre a câmera livre", () => {
    render(
      <MomentCard
        moment={momento({ missionFilterId: null, title: "Depois" })}
        slug="festa-demo"
        index={1}
        central={false}
        interactionOpen={false}
      />,
    );

    expect(screen.getByRole("link", { name: "Fotografar Depois" })).toHaveAttribute(
      "href",
      "/e/festa-demo/photo",
    );
  });
});
