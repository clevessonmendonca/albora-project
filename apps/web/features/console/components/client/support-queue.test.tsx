import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SupportTicketAdmin } from "@albora/db";
import { SupportQueue } from "./support-queue";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function ticket(overrides: Partial<SupportTicketAdmin>): SupportTicketAdmin {
  return {
    id: "t1",
    accountId: "c1",
    eventId: null,
    subject: "assunto",
    status: "open",
    priority: "p2",
    slaDueAt: null,
    createdAt: new Date(),
    assigneeStaffId: null,
    ...overrides,
  };
}

describe("SupportQueue", () => {
  it("fila ordena por SLA mais próximo do estouro, não por data de criação — renderiza na ordem recebida do servidor", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    const rows = [
      ticket({ id: "perto", subject: "vai estourar", slaDueAt: new Date(now.getTime() + 60_000), createdAt: new Date(now.getTime() - 86_400_000) }),
      ticket({ id: "longe", subject: "tem tempo", slaDueAt: new Date(now.getTime() + 3600_000 * 5), createdAt: now }),
    ];
    render(<SupportQueue rows={rows} selectedId={null} now={now} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("vai estourar");
    expect(links[1]).toHaveTextContent("tem tempo");
  });

  it("ticket com SLA estourado recebe o fundo crítico E o texto 'Estourado há …' — cor sozinha não comunica estado", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    const rows = [ticket({ id: "estourado", subject: "incêndio", slaDueAt: new Date(now.getTime() - 12 * 60_000) })];
    render(<SupportQueue rows={rows} selectedId={null} now={now} />);
    expect(screen.getByText("Estourado há 12min")).toBeInTheDocument();
    expect(screen.getByRole("link").className).toContain("bg-critico-superficie");
  });

  it("ticket dentro do prazo não recebe o fundo crítico", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    const rows = [ticket({ id: "ok", subject: "tranquilo", slaDueAt: new Date(now.getTime() + 3600_000) })];
    render(<SupportQueue rows={rows} selectedId={null} now={now} />);
    expect(screen.getByRole("link").className).not.toContain("bg-critico-superficie");
  });

  it("nada usa animate-pulse — uma fila com vários estouros não pisca", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    const rows = Array.from({ length: 6 }, (_, i) =>
      ticket({ id: `t${i}`, subject: `ticket ${i}`, slaDueAt: new Date(now.getTime() - 60_000) }),
    );
    const { container } = render(<SupportQueue rows={rows} selectedId={null} now={now} />);
    expect(container.innerHTML).not.toContain("animate-pulse");
  });

  it("ticket sem SLA mostra 'sem SLA', não erro", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    render(<SupportQueue rows={[ticket({ slaDueAt: null })]} selectedId={null} now={now} />);
    expect(screen.getByText("sem SLA")).toBeInTheDocument();
  });
});
