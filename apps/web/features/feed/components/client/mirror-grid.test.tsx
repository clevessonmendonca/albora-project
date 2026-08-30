import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MirrorGrid } from "./mirror-grid";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

function item(id: string, autor = "Marina"): ItemVisivel {
  return {
    id,
    chaveThumb: `thumb-${id}`,
    chaveFull: `full-${id}`,
    mime: "image/jpeg",
    autor,
    legenda: null,
    lugar: null,
    criadaEm: new Date().toISOString(),
  };
}

describe("MirrorGrid", () => {
  it("abre o viewer no toque da miniatura", async () => {
    const onAbrir = vi.fn();
    const user = userEvent.setup();
    const urls = new Map([
      ["thumb-1", { chave: "thumb-1", url: "https://cdn.example/1.jpg", expiraEm: Date.now() + 3_600_000 }],
    ]);

    render(
      <MirrorGrid
        itens={[item("1"), item("2", "João")]}
        urls={urls}
        onAbrir={onAbrir}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Abrir foto de Marina" }));
    expect(onAbrir).toHaveBeenCalledWith(0);
  });
});
