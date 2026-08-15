import { describe, expect, it } from "vitest";
import {
  classificarPendentesDoEvento,
  type DependenciasDoClassificador,
} from "./classify-media";
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
  parcial: Partial<DependenciasDoClassificador> & Pick<DependenciasDoClassificador, "listar">,
): DependenciasDoClassificador {
  const gravados: { id: string; veredicto: string }[] = [];
  return {
    lerThumb: async () => jpegMinimo(),
    gravar: async (_eventoId, uploadId, veredicto) => {
      gravados.push({ id: uploadId, veredicto });
    },
    classificar: async () => "limpo",
    agora: () => new Date("2026-08-15T12:00:10Z").getTime(),
    ...parcial,
  };
}

describe("classificarPendentesDoEvento", () => {
  it("grava limpo quando a thumb chega e o provedor responde", async () => {
    const gravados: { id: string; veredicto: string }[] = [];
    const n = await classificarPendentesDoEvento(
      EVENTO,
      deps({
        listar: async () => [pendente()],
        gravar: async (_e, id, veredicto) => {
          gravados.push({ id, veredicto });
        },
      }),
    );

    expect(n).toBe(1);
    expect(gravados).toEqual([{ id: pendente().id, veredicto: "limpo" }]);
  });

  it("leitura da thumb que falha persiste sem-resposta — o telão segura", async () => {
    const gravados: string[] = [];
    await classificarPendentesDoEvento(
      EVENTO,
      deps({
        listar: async () => [pendente()],
        lerThumb: async () => {
          throw new Error("r2");
        },
        gravar: async (_e, _id, veredicto) => {
          gravados.push(veredicto);
        },
      }),
    );
    expect(gravados).toEqual(["sem-resposta"]);
  });

  it("thumb ausente espera; depois do prazo grava sem-resposta", async () => {
    const gravados: string[] = [];
    const cedo = await classificarPendentesDoEvento(
      EVENTO,
      deps({
        listar: async () => [pendente()],
        lerThumb: async () => null,
        gravar: async (_e, _id, veredicto) => {
          gravados.push(veredicto);
        },
        agora: () => new Date("2026-08-15T12:00:10Z").getTime(),
      }),
    );
    expect(cedo).toBe(0);
    expect(gravados).toEqual([]);

    const tarde = await classificarPendentesDoEvento(
      EVENTO,
      deps({
        listar: async () => [pendente()],
        lerThumb: async () => null,
        gravar: async (_e, _id, veredicto) => {
          gravados.push(veredicto);
        },
        agora: () => new Date("2026-08-15T12:00:31Z").getTime(),
      }),
    );
    expect(tarde).toBe(1);
    expect(gravados).toEqual(["sem-resposta"]);
  });

  it("pede a chave da thumb, nunca a full", async () => {
    const chaves: string[] = [];
    await classificarPendentesDoEvento(
      EVENTO,
      deps({
        listar: async () => [pendente()],
        lerThumb: async (chave) => {
          chaves.push(chave);
          return jpegMinimo();
        },
      }),
    );
    expect(chaves).toEqual([`events/${EVENTO}/2026/08/foto/thumb`]);
  });
});
