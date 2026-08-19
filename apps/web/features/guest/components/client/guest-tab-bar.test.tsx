import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuestTabBar } from "./guest-tab-bar";

describe("GuestTabBar", () => {
  const slug = "ana-e-joao";
  const base = `/e/${slug}`;

  it("renderiza os 4 links de tela e o botão de câmera com os hrefs corretos", () => {
    render(<GuestTabBar slug={slug} active="missoes" />);

    expect(screen.getByRole("link", { name: /feed/i })).toHaveAttribute("href", `${base}/feed`);
    expect(screen.getByRole("link", { name: /missões/i })).toHaveAttribute(
      "href",
      `${base}/missions`,
    );
    expect(screen.getByRole("link", { name: /álbum/i })).toHaveAttribute("href", `${base}/album`);
    expect(screen.getByRole("link", { name: /minhas/i })).toHaveAttribute(
      "href",
      `${base}/my-photos`,
    );
    expect(screen.getByRole("link", { name: "Mandar foto ou vídeo" })).toHaveAttribute(
      "href",
      `${base}/photo`,
    );
  });

  it("marca só o item ativo em text-acento; os demais ficam em text-ink-3", () => {
    render(<GuestTabBar slug={slug} active="album" />);

    expect(screen.getByRole("link", { name: /álbum/i }).className).toContain("text-acento");
    expect(screen.getByRole("link", { name: /feed/i }).className).toContain("text-ink-3");
    expect(screen.getByRole("link", { name: /missões/i }).className).toContain("text-ink-3");
    expect(screen.getByRole("link", { name: /minhas/i }).className).toContain("text-ink-3");
  });

  it("sem `active`, nenhum item fica marcado", () => {
    render(<GuestTabBar slug={slug} />);

    for (const name of [/feed/i, /missões/i, /álbum/i, /minhas/i]) {
      expect(screen.getByRole("link", { name }).className).toContain("text-ink-3");
    }
  });
});
