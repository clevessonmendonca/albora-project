import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModerationPage } from "./moderation-page";
import { ReviewQueue } from "./review-queue";

vi.mock("./comment-moderation", () => ({ CommentModeration: () => null }));

const midia = (id: string, denuncias = 0) => ({
  id,
  autor: `Autor ${id}`,
  denuncias,
  motivo: "endurecido",
  criadaEm: "2026-10-18T20:00:00Z",
});

function ok(corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status: 200 });
}

afterEach(() => vi.unstubAllGlobals());

describe("ReviewQueue — erro de carga", () => {
  it("falha ao carregar não vira 'Tudo revisado': mostra erro e Tentar de novo", async () => {
    let falhar = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => (falhar ? new Response("x", { status: 500 }) : ok({ midias: [midia("a")], comentarios: [] }))),
    );
    render(<ModerationPage eventoId="e1" />);

    await waitFor(() => expect(screen.getByText("Não deu para carregar a revisão")).toBeInTheDocument());
    expect(screen.queryByText("Tudo revisado")).not.toBeInTheDocument();
    expect(screen.queryByText("Fila limpa")).not.toBeInTheDocument();
    expect(screen.getByText("Não foi possível carregar")).toBeInTheDocument();

    falhar = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(screen.getByText("Autor a")).toBeInTheDocument());
    expect(screen.getByText("1 item aguardando")).toBeInTheDocument();
  });
});

describe("ReviewQueue — aprovar todas", () => {
  it("confirma antes e deixa as denunciadas de fora", async () => {
    const patches: { id: string; acao: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          patches.push(JSON.parse(String(init.body)));
          return ok({});
        }
        return ok({ midias: [midia("a"), midia("b"), midia("c", 2)], comentarios: [] });
      }),
    );
    render(<ReviewQueue eventoId="e1" />);
    await waitFor(() => expect(screen.getByText("Autor a")).toBeInTheDocument());
    expect(screen.getByText(/1 com denúncia/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aprovar sem denúncia (2)" }));
    expect(patches).toHaveLength(0);
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText("Aprovar 2 fotos?")).toBeInTheDocument();
    expect(within(dialogo).getByText(/1 foto denunciada fica de fora/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(patches).toHaveLength(2));
    expect(patches.map((p) => p.id).sort()).toEqual(["a", "b"]);
    expect(patches.every((p) => p.acao === "liberar")).toBe(true);
  });

  it("cancelar não aprova nada", async () => {
    const patch = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) => {
        if (init?.method === "PATCH") patch();
        return ok({ midias: [midia("a"), midia("b")], comentarios: [] });
      }),
    );
    render(<ReviewQueue eventoId="e1" />);
    await waitFor(() => expect(screen.getByText("Autor a")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Aprovar todas (2)" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(patch).not.toHaveBeenCalled();
  });
});
