import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCreateEventWizard } from "./use-create-event-wizard";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("useCreateEventWizard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("não avança do passo do evento sem datas", () => {
    const { result } = renderHook(() => useCreateEventWizard());
    act(() => result.current.setStep(1));
    expect(result.current.canAdvance).toBe(false);
  });

  it("avança do passo do evento com datas válidas", () => {
    const { result } = renderHook(() => useCreateEventWizard());
    act(() => {
      result.current.setStep(1);
      result.current.setStarts("2026-09-01T18:00");
      result.current.setEnds("2026-09-02T02:00");
    });
    expect(result.current.canAdvance).toBe(true);
  });

  it("com fornecedor, e-mail do casal é obrigatório", () => {
    const { result } = renderHook(() => useCreateEventWizard());
    act(() => {
      result.current.setStep(1);
      result.current.setStarts("2026-09-01T18:00");
      result.current.setEnds("2026-09-02T02:00");
      result.current.setVendorId("11111111-1111-1111-1111-111111111111");
    });
    expect(result.current.canAdvance).toBe(false);

    act(() => {
      result.current.setCoupleEmail("casal@exemplo.com");
    });
    expect(result.current.canAdvance).toBe(true);
  });

  it("POST de criação não manda vendorId quando o seletor está vazio", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/vendors") {
        return new Response(JSON.stringify({ vendors: [] }), { status: 200 });
      }
      if (url === "/api/admin/events") {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body).not.toHaveProperty("vendorId");
        return new Response(JSON.stringify({ eventoId: "e1", slug: "s1" }), { status: 200 });
      }
      throw new Error(`fetch inesperado: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCreateEventWizard());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/vendors"));

    act(() => {
      result.current.setStarts("2026-09-01T18:00");
      result.current.setEnds("2026-09-02T02:00");
    });
    await act(async () => {
      await result.current.create();
    });

    expect(result.current.created?.slug).toBe("s1");
  });
});
