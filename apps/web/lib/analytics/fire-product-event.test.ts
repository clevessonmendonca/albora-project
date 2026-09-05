// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireProductEvent, refDaUrl } from "./fire-product-event";

describe("refDaUrl", () => {
  it("extrai ref válido da query", () => {
    expect(refDaUrl(`?ref=${"q".repeat(24)}&x=1`)).toBe("q".repeat(24));
  });
  it("ignora ref inválido ou ausente", () => {
    expect(refDaUrl("?ref=abc")).toBeNull();
    expect(refDaUrl("?x=1")).toBeNull();
    expect(refDaUrl("")).toBeNull();
  });
});

describe("fireProductEvent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTa name, anonId, packHint e originRef", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    fireProductEvent("guest_share_album", { packHint: "pack-teste", originRef: "z".repeat(24) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/analytics/product");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ name: "guest_share_album", packHint: "pack-teste", originRef: "z".repeat(24) });
    expect(typeof body.anonId).toBe("string");
  });

  it("originRef e packHint são null quando omitidos", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    fireProductEvent("guest_cta_criar_click");
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.packHint).toBeNull();
    expect(body.originRef).toBeNull();
  });

  it("falha de rede é engolida", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => fireProductEvent("landing_view")).not.toThrow();
  });
});
