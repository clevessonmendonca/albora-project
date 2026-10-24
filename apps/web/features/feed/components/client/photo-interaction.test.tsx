import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoInteraction } from "./photo-interaction";

vi.mock("@albora/ui-web", async (orig) => {
  const mod = (await orig()) as Record<string, unknown>;
  return { ...mod, showToast: vi.fn(), announce: vi.fn() };
});

afterEach(cleanup);

describe("PhotoInteraction", () => {
  it("não põe as folhas de opções, comentários e denúncia no DOM antes de abrir", () => {
    const { container } = render(<PhotoInteraction uploadId="u1" interacao="completo" autor="Bia" />);
    expect(container.querySelectorAll("dialog")).toHaveLength(0);
    expect(screen.queryByText("Denunciar")).toBeNull();
  });

  it("abre as opções e mostra Denunciar", () => {
    render(<PhotoInteraction uploadId="u1" interacao="completo" autor="Bia" />);
    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByText("Denunciar")).toBeTruthy();
  });

  it("antes do gate só reage: sem comentar nem mais opções", () => {
    render(<PhotoInteraction uploadId="u1" interacao="espelho" autor="Bia" />);
    expect(screen.getByTestId("like-button")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mais opções" })).toBeNull();
  });
});
