import { afterEach, describe, expect, it, vi } from "vitest";
import { ACEITE_AUDIO_VERSAO } from "@albora/core";
import { uploadGuestbookAudio } from "./guestbook-audio-upload";
import type { PendingGuestbookAudio } from "./guestbook-audio";

const EVENTO = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function pendente(): PendingGuestbookAudio {
  return {
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }),
    mime: "audio/webm",
    duracaoSegundos: 20,
    previewUrl: "blob:preview",
  };
}

describe("upload do audio do recado", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("presign, PUT e confirm — nesta ordem, chave ecoada da resposta", async () => {
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        chamadas.push(`${init?.method ?? "GET"} ${url}`);
        if (url.endsWith("/guestbook/audio") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              chave: `events/${EVENTO}/recado/11111111-2222-3333-4444-555555555555`,
              put: "https://r2/put",
            }),
            { status: 200 },
          );
        }
        if (url === "https://r2/put") return new Response(null, { status: 200 });
        if (url.endsWith("/guestbook/audio/confirm")) {
          const corpo = JSON.parse(String(init?.body)) as { chave: string; aceite: string };
          expect(corpo.chave).toBe(`events/${EVENTO}/recado/11111111-2222-3333-4444-555555555555`);
          expect(corpo.aceite).toBe(ACEITE_AUDIO_VERSAO);
          return new Response(
            JSON.stringify({ recado: { audio: { duracaoSegundos: 20, url: "https://r2/get" } } }),
            { status: 200 },
          );
        }
        return new Response("no", { status: 500 });
      }),
    );

    const audio = await uploadGuestbookAudio(EVENTO, pendente());

    expect(audio).toEqual({ duracaoSegundos: 20, url: "https://r2/get" });
    expect(chamadas).toEqual([
      `POST /api/admin/events/${EVENTO}/guestbook/audio`,
      "PUT https://r2/put",
      `POST /api/admin/events/${EVENTO}/guestbook/audio/confirm`,
    ]);
  });
});
