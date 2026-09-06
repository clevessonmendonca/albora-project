import { encode as jpegEncode } from "jpeg-js";
import { describe, expect, it } from "vitest";
import type { UploadAguardandoScore } from "@albora/db";
import { curatePendingForEvent, scoresDoThumb, type CurationDependencies } from "./curate";

const EVENTO = "11111111-1111-1111-1111-111111111111";

/** JPEG real (8x8, cinza uniforme) — decodificável de verdade, sem mockar `jpeg-js`. */
function jpegValido(w = 8, h = 8): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 180;
    data[i + 1] = 180;
    data[i + 2] = 180;
    data[i + 3] = 255;
  }
  return new Uint8Array(jpegEncode({ data, width: w, height: h }, 90).data);
}

function midia(parcial: Partial<UploadAguardandoScore> = {}): UploadAguardandoScore {
  return {
    uploadId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    chaveFull: `events/${EVENTO}/2026/08/foto/full`,
    ...parcial,
  };
}

function deps(parcial: Partial<CurationDependencies> = {}): CurationDependencies {
  return {
    listPending: async () => [],
    readThumb: async () => jpegValido(),
    computeScores: scoresDoThumb,
    save: async () => undefined,
    ...parcial,
  };
}

describe("scoresDoThumb", () => {
  it("decodifica um JPEG real e devolve os três sinais, nunca lança", () => {
    const scores = scoresDoThumb(jpegValido());
    expect(scores.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
    expect(scores.sharpness).not.toBeNull();
    expect(scores.exposure).not.toBeNull();
  });

  it("bytes que não são JPEG degradam para os três sinais ausentes, nunca lança", () => {
    const scores = scoresDoThumb(new Uint8Array([1, 2, 3, 4]));
    expect(scores).toEqual({ perceptualHash: null, sharpness: null, exposure: null });
  });

  it("entrada acima do teto de bytes vira sinal ausente sem chamar o decodificador", () => {
    // Os bytes do thumb NAO sao confiaveis: o convidado faz PUT direto na URL
    // presigned, entao a chave aceita qualquer conteudo. Sem teto, um JPEG de
    // poucos KB declarando dimensoes enormes esgota memoria e CPU do Worker.
    // 2 MB + 1 byte: thumb legitimo fica nas dezenas de KB.
    const grandeDemais = new Uint8Array(2 * 1024 * 1024 + 1);
    grandeDemais.set(jpegValido().slice(0, 64));

    const scores = scoresDoThumb(grandeDemais);

    expect(scores.perceptualHash).toBeNull();
    expect(scores.sharpness).toBeNull();
    expect(scores.exposure).toBeNull();
  });
});

describe("curatePendingForEvent", () => {
  it("processa cada mídia pendente e grava seus três scores", async () => {
    const gravados: unknown[] = [];
    const n = await curatePendingForEvent(
      EVENTO,
      deps({
        listPending: async () => [midia()],
        save: async (_eventId, entry) => {
          gravados.push(entry);
        },
      }),
    );

    expect(n).toBe(1);
    expect(gravados).toHaveLength(1);
    const [entry] = gravados as { uploadId: string; perceptualHash: string | null }[];
    expect(entry!.uploadId).toBe(midia().uploadId);
    expect(entry!.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("thumb ausente (null) grava os três scores ausentes, nunca lança e não pula a mídia", async () => {
    const gravados: unknown[] = [];
    const n = await curatePendingForEvent(
      EVENTO,
      deps({
        listPending: async () => [midia()],
        readThumb: async () => null,
        save: async (_eventId, entry) => {
          gravados.push(entry);
        },
      }),
    );

    expect(n).toBe(1);
    expect(gravados).toEqual([
      { uploadId: midia().uploadId, perceptualHash: null, sharpness: null, exposure: null },
    ]);
  });

  it("leitura da thumb que lança degrada para score ausente — um item ruim não derruba o lote", async () => {
    const gravados: { uploadId: string }[] = [];
    const n = await curatePendingForEvent(
      EVENTO,
      deps({
        listPending: async () => [
          midia({ uploadId: "primeira", chaveFull: `events/${EVENTO}/2026/08/primeira/full` }),
          midia({ uploadId: "segunda", chaveFull: `events/${EVENTO}/2026/08/segunda/full` }),
        ],
        readThumb: async (chave) => {
          if (chave.includes("primeira")) throw new Error("r2 fora do ar");
          return jpegValido();
        },
        save: async (_eventId, entry) => {
          gravados.push(entry);
        },
      }),
    );

    expect(n).toBe(2);
    expect(gravados.map((g) => g.uploadId)).toEqual(["primeira", "segunda"]);
  });

  it("pede a chave da thumb, nunca a full", async () => {
    const chaves: string[] = [];
    await curatePendingForEvent(
      EVENTO,
      deps({
        listPending: async () => [midia()],
        readThumb: async (chave) => {
          chaves.push(chave);
          return jpegValido();
        },
      }),
    );
    expect(chaves).toEqual([`events/${EVENTO}/2026/08/foto/thumb`]);
  });

  it("sem mídia pendente, devolve zero e não grava nada", async () => {
    const gravados: unknown[] = [];
    const n = await curatePendingForEvent(
      EVENTO,
      deps({
        listPending: async () => [],
        save: async (_eventId, entry) => {
          gravados.push(entry);
        },
      }),
    );
    expect(n).toBe(0);
    expect(gravados).toEqual([]);
  });
});
