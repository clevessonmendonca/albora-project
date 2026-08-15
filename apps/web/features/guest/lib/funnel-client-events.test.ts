import { describe, expect, it } from "vitest";
import { funnelEventFromClient, funnelEventFromInstallChoice } from "./funnel-client-events";

describe("o cliente só manda o que o servidor ainda não gravou", () => {
  it("aceita captura, QR, falha, retry, share e instalação", () => {
    expect(funnelEventFromClient("capture")).toBe("capture");
    expect(funnelEventFromClient("qr_scan")).toBe("qr_scan");
    expect(funnelEventFromClient("upload_fail")).toBe("upload_fail");
    expect(funnelEventFromClient("retry")).toBe("retry");
    expect(funnelEventFromClient("share")).toBe("share");
    expect(funnelEventFromClient("install_prompt")).toBe("install_prompt");
    expect(funnelEventFromClient("install_accept")).toBe("install_accept");
    expect(funnelEventFromClient("install_dismiss")).toBe("install_dismiss");
  });

  it("a escolha do prompt nativo vira o evento certo", () => {
    expect(funnelEventFromInstallChoice("accepted")).toBe("install_accept");
    expect(funnelEventFromInstallChoice("dismissed")).toBe("install_dismiss");
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
