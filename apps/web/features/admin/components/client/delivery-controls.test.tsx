import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DeliveryControls } from "./delivery-controls";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";

function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status });
}

describe("DeliveryControls", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gate fechado desabilita Enviar agora", () => {
    render(<DeliveryControls eventId={EVENT_ID} initialDeliveryOpensAt={null} />);
    expect(screen.getByText("Enviar agora")).toBeDisabled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("gate aberto habilita Enviar agora", () => {
    render(
      <DeliveryControls
        eventId={EVENT_ID}
        initialDeliveryOpensAt="2026-01-01T10:00:00.000Z"
      />,
    );
    expect(screen.getByText("Enviar agora")).not.toBeDisabled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("liga o gate faz PATCH com deliveryOpensAt ISO", async () => {
    const fetchMock = vi.fn(async (_input: string, _init: RequestInit) =>
      responder({ deliveryOpensAt: "2026-02-02T00:00:00.000Z" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<DeliveryControls eventId={EVENT_ID} initialDeliveryOpensAt={null} />);
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/events/${EVENT_ID}/entrega`,
      expect.objectContaining({ method: "PATCH" }),
    );
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as { deliveryOpensAt: string | null };
    expect(typeof body.deliveryOpensAt).toBe("string");
    expect(screen.getByText("Enviar agora")).not.toBeDisabled();
  });

  it("desliga o gate faz PATCH com deliveryOpensAt null", async () => {
    const fetchMock = vi.fn(async (_input: string, _init: RequestInit) =>
      responder({ deliveryOpensAt: null }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DeliveryControls
        eventId={EVENT_ID}
        initialDeliveryOpensAt="2026-01-01T10:00:00.000Z"
      />,
    );
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as { deliveryOpensAt: string | null };
    expect(body.deliveryOpensAt).toBeNull();
    expect(screen.getByText("Enviar agora")).toBeDisabled();
  });

  it("PATCH que falha reverte o switch e mostra erro", async () => {
    const fetchMock = vi.fn(async () => responder({ message: "falhou" }, 500));
    vi.stubGlobal("fetch", fetchMock);

    render(<DeliveryControls eventId={EVENT_ID} initialDeliveryOpensAt={null} />);
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(screen.getByText("Não salvou agora. Tente de novo.")).toBeInTheDocument();
    });
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Enviar agora")).toBeDisabled();
  });

  it("Enviar agora faz POST em /entrega/disparar e mostra enviados/pendentes", async () => {
    const fetchMock = vi.fn(async () => responder({ enviados: 12, pendentes: 3 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DeliveryControls
        eventId={EVENT_ID}
        initialDeliveryOpensAt="2026-01-01T10:00:00.000Z"
      />,
    );
    fireEvent.click(screen.getByText("Enviar agora"));

    await waitFor(() => {
      expect(screen.getByText("12 enviadas, 3 pendentes")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/events/${EVENT_ID}/entrega/disparar`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("Enviar agora que falha mostra o erro", async () => {
    const fetchMock = vi.fn(async () => responder({ message: "falhou" }, 500));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DeliveryControls
        eventId={EVENT_ID}
        initialDeliveryOpensAt="2026-01-01T10:00:00.000Z"
      />,
    );
    fireEvent.click(screen.getByText("Enviar agora"));

    await waitFor(() => {
      expect(screen.getByText("Não salvou agora. Tente de novo.")).toBeInTheDocument();
    });
  });
});
