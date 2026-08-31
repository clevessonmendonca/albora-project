import { describe, expect, it } from "vitest";
import { zipEntriesFromJob } from "./stream";

const EVENTO = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OUTRO = "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee";
const A = "11111111-2222-3333-4444-555555555555";
const B = "22222222-3333-4444-5555-666666666666";

function item(id: string, eventoId: string, mime = "image/jpeg") {
  return {
    id,
    chave: `events/${eventoId}/2026/08/${id}/full`,
    mime,
    bytes: 4,
  };
}

async function collectNames(
  eventoId: string,
  itens: ReturnType<typeof item>[],
  presentes: Record<string, Uint8Array>,
): Promise<string[]> {
  const nomes: string[] = [];
  for await (const entry of zipEntriesFromJob(eventoId, itens, async (chave) => {
    const dados = presentes[chave];
    if (!dados) return null;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(dados);
        controller.close();
      },
    });
  })) {
    nomes.push(entry.nome);
  }
  return nomes;
}

describe("o ZIP do acervo não mistura eventos nem thumbs", () => {
  it("só inclui a full deste evento que o leitor encontrou", async () => {
    const deste = item(A, EVENTO);
    const alheia = item(B, OUTRO);
    const nomes = await collectNames(
      EVENTO,
      [deste, alheia],
      { [deste.chave]: new Uint8Array([1, 2, 3, 4]) },
    );
    expect(nomes).toEqual(["fotos/0001.jpg"]);
  });

  it("objeto ausente no storage é pulado, não derruba o ZIP", async () => {
    const foto = item(A, EVENTO);
    const nomes = await collectNames(EVENTO, [foto], {});
    expect(nomes).toEqual([]);
  });
});
