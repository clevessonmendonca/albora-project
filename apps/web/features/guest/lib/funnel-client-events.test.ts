import { describe, expect, it } from "vitest";
import { funnelEventFromClient } from "./funnel-client-events";

describe("o cliente só manda o que o servidor ainda não gravou", () => {
  it("aceita captura, QR, falha e instalação", () => {
    expect(funnelEventFromClient("capture")).toBe("capture");
    expect(funnelEventFromClient("qr_scan")).toBe("qr_scan");
    expect(funnelEventFromClient("upload_fail")).toBe("upload_fail");
    expect(funnelEventFromClient("install_prompt")).toBe("install_prompt");
  });

  it("recusa o que já nasce no confirm, na sessão ou no feed", () => {
    expect(funnelEventFromClient("upload_ok")).toBeNull();
    expect(funnelEventFromClient("upload_start")).toBeNull();
    expect(funnelEventFromClient("page_open")).toBeNull();
    expect(funnelEventFromClient("consent")).toBeNull();
    expect(funnelEventFromClient("feed_open")).toBeNull();
    expect(funnelEventFromClient("uploadOk")).toBeNull();
    expect(funnelEventFromClient("")).toBeNull();
  });
});
