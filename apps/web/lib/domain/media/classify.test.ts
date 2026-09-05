import { describe, expect, it } from "vitest";
import {
  classifyPendingForEvent,
  type ClassifierDependencies,
} from "./classify";
import type { ClaimedItem, UploadParaClassificar } from "@albora/db";

const EVENTO = "11111111-1111-1111-1111-111111111111";
const UPLOAD = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function jpegMinimo(): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

function claimado(parcial: Partial<ClaimedItem> = {}): ClaimedItem {
  return { uploadId: UPLOAD, eventId: EVENTO, attempts: 1, ...parcial };
}

function upload(parcial: Partial<UploadParaClassificar> = {}): UploadParaClassificar {
  return {
    chaveFull: `events/${EVENTO}/2026/08/foto/full`,
    mime: "image/jpeg",
    ...parcial,
  };
}

/**
 * `claim` já devolve os itens (é o que o `FOR UPDATE SKIP LOCKED` do banco
 * faz de verdade); os testes aqui simulam o resultado do claim, não a
 * corrida em si — essa é coberta contra banco real em
 * `moderation-queue.test.ts`.
 */
function deps(parcial: Partial<ClassifierDependencies> = {}): ClassifierDependencies {
  return {
    claim: async () => [claimado()],
    getUploads: async () => new Map([[UPLOAD, upload()]]),
    readThumb: async () => jpegMinimo(),
    complete: async () => undefined,
    fail: async () => "retry",
    saveVerdict: async () => undefined,
    classify: async () => "limpo",
    ...parcial,
  };
}

describe("classifyPendingForEvent", () => {
  it("grava limpo e conclui na fila quando a thumb chega e o provedor responde", async () => {
    const gravados: { id: string; veredicto: string }[] = [];
    const concluidos: { id: string; provider: string }[] = [];

    const n = await classifyPendingForEvent(
      EVENTO,
      deps({
        saveVerdict: async (_e, id, veredicto) => {
          gravados.push({ id, veredicto });
        },
        complete: async (_e, id, outcome) => {
          concluidos.push({ id, provider: outcome.provider });
        },
        provider: "openai",
      }),
    );

    expect(n).toBe(1);
    expect(gravados).toEqual([{ id: UPLOAD, veredicto: "limpo" }]);
    expect(concluidos).toEqual([{ id: UPLOAD, provider: "openai" }]);
  });

  it("nada pra fazer quando o claim não traz nada — não bate no banco de novo", async () => {
    const getUploadsChamado = { vezes: 0 };
    const n = await classifyPendingForEvent(
      EVENTO,
      deps({
        claim: async () => [],
        getUploads: async () => {
          getUploadsChamado.vezes += 1;
          return new Map();
        },
      }),
    );
    expect(n).toBe(0);
    expect(getUploadsChamado.vezes).toBe(0);
  });

  it("leitura da thumb que falha vai pra fail — sem esgotar, não grava veredito ainda", async () => {
    const gravados: string[] = [];
    await classifyPendingForEvent(
      EVENTO,
      deps({
        readThumb: async () => {
          throw new Error("r2");
        },
        fail: async () => "retry",
        saveVerdict: async (_e, _id, v) => {
          gravados.push(v);
        },
      }),
    );
    expect(gravados).toEqual([]);
  });

  it("leitura da thumb que falha e esgota as tentativas grava sem-resposta — o telão segura", async () => {
    const gravados: string[] = [];
    await classifyPendingForEvent(
      EVENTO,
      deps({
        readThumb: async () => {
          throw new Error("r2");
        },
        fail: async () => "failed",
        saveVerdict: async (_e, _id, v) => {
          gravados.push(v);
        },
      }),
    );
    expect(gravados).toEqual(["sem-resposta"]);
  });

  it("thumb ainda não propagou no storage (bytes null) segue o mesmo caminho de fail, não espera por tempo de relógio", async () => {
    const chamadasDeFail: string[] = [];
    const n = await classifyPendingForEvent(
      EVENTO,
      deps({
        readThumb: async () => null,
        fail: async (_e, uploadId) => {
          chamadasDeFail.push(uploadId);
          return "retry";
        },
      }),
    );
    expect(n).toBe(1);
    expect(chamadasDeFail).toEqual([UPLOAD]);
  });

  it("upload claimado que sumiu de `uploads` força failed com o attempts corrente, não fica claimed pra sempre", async () => {
    const argsDeFail: unknown[] = [];
    await classifyPendingForEvent(
      EVENTO,
      deps({
        claim: async () => [claimado({ attempts: 2 })],
        getUploads: async () => new Map(),
        fail: async (eventId, uploadId, maxAttempts) => {
          argsDeFail.push([eventId, uploadId, maxAttempts]);
          return "failed";
        },
      }),
    );
    expect(argsDeFail).toEqual([[EVENTO, UPLOAD, 2]]);
  });

  it("pede a chave da thumb, nunca a full", async () => {
    const chaves: string[] = [];
    await classifyPendingForEvent(
      EVENTO,
      deps({
        readThumb: async (chave) => {
          chaves.push(chave);
          return jpegMinimo();
        },
      }),
    );
    expect(chaves).toEqual([`events/${EVENTO}/2026/08/foto/thumb`]);
  });

  it("processa item que só foi enfileirado pelo confirm — nenhuma dependência de wall.ts, nenhum poll do telão envolvido", async () => {
    // Simula exatamente o que `enqueueModeration` (chamado por confirm-upload.ts)
    // deixa pronto pro claim: nada além da linha na fila e o upload já
    // confirmado. Esta função nunca importa nada de `handlers/wall.ts` — o
    // defeito original era o inverso disso.
    const veredictos: string[] = [];
    const n = await classifyPendingForEvent(
      EVENTO,
      deps({
        classify: async () => "limpo",
        saveVerdict: async (_e, _id, v) => {
          veredictos.push(v);
        },
      }),
    );
    expect(n).toBe(1);
    expect(veredictos).toEqual(["limpo"]);
  });

  it("duas instâncias não classificam a mesma mídia duas vezes — a exclusão é do que `claim` devolve, não de estado local", async () => {
    // Fila fake compartilhada: uma vez claimado, some — é o comportamento
    // real de `claimNextForModeration` (FOR UPDATE SKIP LOCKED), só que sem
    // banco. Prova que `classifyPendingForEvent` não precisa (nem tem) de
    // Set em memória: a garantia vem inteira do `claim` injetado.
    let filaCompartilhada: ClaimedItem[] = [claimado()];
    const chamadasDeClassify: string[] = [];

    const depsCompartilhados = (): ClassifierDependencies =>
      deps({
        claim: async () => {
          const peguei = filaCompartilhada;
          filaCompartilhada = [];
          return peguei;
        },
        classify: async ({ mime }) => {
          chamadasDeClassify.push(mime);
          return "limpo";
        },
      });

    const [instanciaA, instanciaB] = await Promise.all([
      classifyPendingForEvent(EVENTO, depsCompartilhados()),
      classifyPendingForEvent(EVENTO, depsCompartilhados()),
    ]);

    expect(instanciaA + instanciaB).toBe(1);
    expect(chamadasDeClassify).toHaveLength(1);
  });
});
