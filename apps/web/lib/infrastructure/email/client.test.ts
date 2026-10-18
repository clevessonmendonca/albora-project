import { afterEach, describe, expect, it, vi } from "vitest";
import { sendHostEmail } from "./client";

describe("e-mail do anfitrião degrada sem Resend", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sem chave, não chama a rede e não estoura", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendHostEmail({ to: "a@exemplo.com", subject: "s", text: "t" })).toEqual({
      enviado: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com chave, POST na API do Resend sem colocar o e-mail no log", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    vi.stubEnv("RESEND_FROM", "Albora <dev@exemplo.com>");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );

    expect(await sendHostEmail({ to: "ana@exemplo.com", subject: "Pronto", text: "baixe" })).toEqual({
      enviado: true,
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: ["ana@exemplo.com"],
      subject: "Pronto",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("ana@exemplo.com");
    log.mockRestore();
  });

  it("quando o Resend recusa, loga o motivo sem o e-mail de ninguém", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              name: "validation_error",
              message: "You can only send testing emails to dona@exemplo.com. Verify a domain.",
            }),
            { status: 403 },
          ),
      ),
    );

    expect(await sendHostEmail({ to: "ana@exemplo.com", subject: "s", text: "t" })).toEqual({
      enviado: false,
    });

    const registrado = JSON.stringify(aviso.mock.calls);
    expect(registrado).toContain("validation_error");
    expect(registrado).toContain("[e-mail]");
    expect(registrado).not.toContain("dona@exemplo.com");
    expect(registrado).not.toContain("ana@exemplo.com");
    aviso.mockRestore();
  });

  it("recusa sem corpo legível ainda registra o status", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("não é json", { status: 500 })));

    expect(await sendHostEmail({ to: "ana@exemplo.com", subject: "s", text: "t" })).toEqual({
      enviado: false,
    });
    expect(JSON.stringify(aviso.mock.calls)).toContain("500");
    aviso.mockRestore();
  });
});
