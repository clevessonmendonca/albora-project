import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClaimPhotosButton } from "./claim-photos-button";

describe("ClaimPhotosButton", () => {
  it("aponta para /auth/google/start com surface=guest e o eventId recebido, nunca com guestSessionId", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<ClaimPhotosButton eventId="evento-123" />);

    await userEvent.click(screen.getByRole("button", { name: "Receber minhas fotos" }));
    expect(assign).toHaveBeenCalledWith("/auth/google/start?surface=guest&eventId=evento-123");
  });
});
