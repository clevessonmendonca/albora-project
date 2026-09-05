// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({ fireProductEvent: vi.fn() }));
vi.mock("@/lib/analytics/fire-product-event", () => analytics);
const link = vi.hoisted(() => ({ compartilharLink: vi.fn().mockResolvedValue("shared") }));
vi.mock("../../lib/compartilhar-link", () => link);

import { AlbumFooterCta } from "./album-footer-cta";

const REF = "f".repeat(24);

describe("AlbumFooterCta", () => {
  afterEach(() => vi.clearAllMocks());

  it("link 'crie o seu' aponta para a landing com ref e registra o clique", () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={REF} />);
    const a = screen.getByRole("link", { name: /álbum da sua festa/i });
    expect(a).toHaveAttribute("href", `/?ref=${REF}`);
    fireEvent.click(a);
    expect(analytics.fireProductEvent).toHaveBeenCalledWith("guest_cta_criar_click", { originRef: REF });
  });

  it("sem ref, link vai para a landing pura", () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={null} />);
    expect(screen.getByRole("link", { name: /álbum da sua festa/i })).toHaveAttribute("href", "/");
  });

  it("botão compartilhar chama compartilharLink com /p/<slug> e registra", async () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={REF} />);
    fireEvent.click(screen.getByRole("button", { name: /compartilhar álbum/i }));
    await waitFor(() => expect(link.compartilharLink).toHaveBeenCalledWith(expect.stringMatching(/\/p\/festa-demo$/)));
    expect(analytics.fireProductEvent).toHaveBeenCalledWith("guest_share_album", { originRef: REF });
  });

  it("botão tem alvo de toque ≥44px (classe min-h-11)", () => {
    render(<AlbumFooterCta slug="festa-demo" refToken={REF} />);
    expect(screen.getByRole("button", { name: /compartilhar álbum/i }).className).toMatch(/min-h-11/);
  });
});
