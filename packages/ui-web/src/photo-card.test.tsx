import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoCard } from "./photo-card";

describe("PhotoCard", () => {
  it("mostra curtidas e comentários como número no documento", () => {
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("chama onCurtir ao clicar no coração", () => {
    const onCurtir = vi.fn();
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={false}
        comentarios={3}
        onCurtir={onCurtir}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Curtir" }));

    expect(onCurtir).toHaveBeenCalledTimes(1);
  });

  it("reflete curtido=true no aria-pressed do botão de curtir", () => {
    render(
      <PhotoCard
        autor="Marina"
        quando="há 2 min"
        curtidas={12}
        curtido={true}
        comentarios={3}
      />,
    );

    expect(screen.getByRole("button", { name: "Curtir" })).toHaveAttribute("aria-pressed", "true");
  });
});
