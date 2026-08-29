import { describe, expect, it } from "vitest";
import {
  classifyPendingForEvent,
  type ClassifierDependencies,
} from "./classify";
import type { UploadPendenteDeClassificacao } from "@albora/db";

const EVENTO = "11111111-1111-1111-1111-111111111111";

function jpegMinimo(): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

function pendente(parcial: Partial<UploadPendenteDeClassificacao> = {}): UploadPendenteDeClassificacao {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    chaveFull: `events/${EVENTO}/2026/08/foto/full`,
    mime: "image/jpeg",
    criadaEm: new Date("2026-08-15T12:00:00Z"),
    ...parcial,
  };
}

function deps(
  parcial: Partial<ClassifierDependencies> & Pick<ClassifierDependencies, "list">,
): ClassifierDependencies {
  return {
    readThumb: async () => jpegMinimo(),
    save: async () => undefined,
    classify: async () => "limpo",
    now: () => new Date("2026-08-15T12:00:10Z").getTime(),
    ...parcial,
  };
}

describe("classifyPendingForEvent", () => {
  it("grava limpo quando a thumb chega e o provedor responde", async () => {
    const gravados: { id: string; veredicto: string }[] = [];
    const n = await classifyPendingForEvent(
      EVENTO,
      deps({
        list: async () => [pendente()],
        save: async (_e, id, veredicto) => {
          gravados.push({ id, veredicto });
        },
      }),
    );

    expect(n).toBe(1);
    expect(gravados).toEqual([{ id: pendente().id, veredicto: "limpo" }]);
  });

  it("leitura da thumb que falha persiste sem-resposta — o telão segura", async () => {
    const gravados: string[] = [];
    await classifyPendingForEvent(
      EVENTO,
      deps({
        list: async () => [pendente()],
        readThumb: async () => {
          throw new Error("r2");
        },
        save: async (_e, _id, veredicto) => {
          gravados.push(veredicto);
        },
      }),
    );
    expect(gravados).toEqual(["sem-resposta"]);
  });

  it("thumb ausente espera; depois do prazo grava sem-resposta", async () => {
    const gravados: string[] = [];
    const cedo = await classifyPendingForEvent(
      EVENTO,
      deps({
        list: async () => [pendente()],
        readThumb: async () => null,
        save: async (_e, _id, veredicto) => {
          gravados.push(veredicto);
        },
        now: () => new Date("2026-08-15T12:00:10Z").getTime(),
      }),
    );
    expect(cedo).toBe(0);
    expect(gravados).toEqual([]);

    const tarde = await classifyPendingForEvent(
      EVENTO,
      deps({
        list: async () => [pendente()],
        readThumb: async () => null,
        save: async (_e, _id, veredicto) => {
          gravados.push(veredicto);
        },
        now: () => new Date("2026-08-15T12:00:31Z").getTime(),
      }),
    );
    expect(tarde).toBe(1);
    expect(gravados).toEqual(["sem-resposta"]);
  });

  it("pede a chave da thumb, nunca a full", async () => {
    const chaves: string[] = [];
    await classifyPendingForEvent(
      EVENTO,
      deps({
        list: async () => [pendente()],
        readThumb: async (chave) => {
          chaves.push(chave);
          return jpegMinimo();
        },
      }),
    );
    expect(chaves).toEqual([`events/${EVENTO}/2026/08/foto/thumb`]);
  });
});
