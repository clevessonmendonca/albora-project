import { describe, expect, it, vi } from "vitest";
import { rejectGuestEventMismatch, rejectGuestEventQueryMismatch } from "./guest-event";

const SESSION = {
  eventoId: "11111111-1111-1111-1111-111111111111",
  sessaoId: "22222222-2222-2222-2222-222222222222",
};

describe("rejectGuestEventMismatch", () => {
  it("passa quando o evento não veio", () => {
    expect(rejectGuestEventMismatch(undefined, SESSION, "x.evento_divergente")).toBeNull();
  });

  it("passa quando o evento é o da sessão", () => {
    expect(rejectGuestEventMismatch(SESSION.eventoId, SESSION, "x.evento_divergente")).toBeNull();
  });

  it("recusa outro id, null no corpo e tipo errado", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const other = rejectGuestEventMismatch("outro", SESSION, "x.evento_divergente");
    const nulled = rejectGuestEventMismatch(null, SESSION, "x.evento_divergente");
    const numbered = rejectGuestEventMismatch(1, SESSION, "x.evento_divergente");

    expect(other).toBeInstanceOf(Response);
    expect(nulled).toBeInstanceOf(Response);
    expect(numbered).toBeInstanceOf(Response);
    expect(other?.status).toBe(403);
    expect(await other?.json()).toMatchObject({ code: "x.evento_divergente" });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("rejectGuestEventQueryMismatch", () => {
  it("query ausente passa; query de outro evento recusa", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const absent = rejectGuestEventQueryMismatch(
      new Request("https://albora.test/api/music"),
      SESSION,
      "musica.evento_divergente",
    );
    const other = rejectGuestEventQueryMismatch(
      new Request("https://albora.test/api/music?evento=outro"),
      SESSION,
      "musica.evento_divergente",
    );

    expect(absent).toBeNull();
    expect(other?.status).toBe(403);
    warn.mockRestore();
  });
});
