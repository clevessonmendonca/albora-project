import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Post } from "./post";

vi.mock("@/features/feed/components/client/photo-interaction", () => ({
  PhotoInteraction: () => null,
}));

describe("Post", () => {
  it("abre o viewer ao clicar na foto", async () => {
    const onAbrir = vi.fn();
    const user = userEvent.setup();

    render(
      <Post
        uploadId="foto-1"
        interacao="completo"
        url="https://cdn.example/foto.jpg"
        autor="Marina"
        legenda={null}
        onAbrir={onAbrir}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Abrir foto de Marina" }));
    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it("não vira botão quando não há onAbrir", () => {
    render(
      <Post
        uploadId="foto-1"
        interacao="espelho"
        url="https://cdn.example/foto.jpg"
        autor="Marina"
        legenda={null}
      />,
    );

    expect(screen.queryByRole("button", { name: /abrir foto/i })).not.toBeInTheDocument();
    expect(screen.getByAltText("Foto de Marina")).toBeInTheDocument();
  });
});
