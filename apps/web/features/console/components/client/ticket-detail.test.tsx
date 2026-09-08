import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetail } from "./ticket-detail";

vi.mock("@/features/console/actions", () => ({
  respondTicketAction: vi.fn().mockResolvedValue({ ok: true }),
  assignTicketAction: vi.fn().mockResolvedValue({ ok: true }),
  updateTicketStatusAction: vi.fn().mockResolvedValue({ ok: true }),
  updateTicketPriorityAction: vi.fn().mockResolvedValue({ ok: true }),
}));

const ticketBase = {
  id: "t1",
  accountId: "c1",
  eventId: null,
  subject: "dúvida",
  status: "open" as const,
  priority: "p2" as const,
  slaDueAt: new Date(Date.now() + 3600_000),
  createdAt: new Date(),
  assigneeStaffId: null,
};

describe("TicketDetail", () => {
  it("envia a resposta e limpa o campo", async () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: "celebration", events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    await userEvent.type(screen.getByLabelText("Responder"), "já estou vendo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByLabelText("Responder")).toHaveValue("");
  });

  it("mostra o e-mail mascarado, nunca o cru", () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    expect(screen.getByText("t••••@x.com")).toBeInTheDocument();
  });

  it("a ação de responder exige texto antes de habilitar o envio", () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("sem tickets.write, não mostra o campo de responder", () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] }}
        staffOptions={[]}
        canRespond={false}
      />,
    );
    expect(screen.queryByLabelText("Responder")).not.toBeInTheDocument();
  });

  it("fila vazia de mensagens mostra estado honesto, não nada", () => {
    render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    expect(screen.getByText("Nenhuma mensagem ainda.")).toBeInTheDocument();
  });

  it("nada na tela usa animate-pulse", () => {
    const { container } = render(
      <TicketDetail
        ticket={ticketBase}
        messages={[]}
        customerContext={{ maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] }}
        staffOptions={[]}
      />,
    );
    expect(container.innerHTML).not.toContain("animate-pulse");
  });
});
