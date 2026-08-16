import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { crc32Update, zipStore } from "./zip-store";

async function* chunksOf(data: Uint8Array, size: number): AsyncIterable<Uint8Array> {
  for (let i = 0; i < data.length; i += size) {
    yield data.subarray(i, Math.min(i + size, data.length));
  }
}

async function* entries(
  files: { nome: string; dados: Uint8Array }[],
): AsyncIterable<{ nome: string; dados: AsyncIterable<Uint8Array> }> {
  for (const file of files) {
    yield { nome: file.nome, dados: chunksOf(file.dados, 3) };
  }
}

async function collect(iter: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let total = 0;
  for await (const part of iter) {
    parts.push(part);
    total += part.byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function u32(buf: Uint8Array, at: number): number {
  return new DataView(buf.buffer, buf.byteOffset + at, 4).getUint32(0, true);
}

describe("ZIP STORE em stream", () => {
  it("o CRC incremental bate com o de zlib", () => {
    const dados = new TextEncoder().encode("foto da festa");
    expect(crc32Update(0, dados)).toBe(crc32(dados) >>> 0);
  });

  it("dois arquivos pedaço a pedaço saem com header, dados e diretório", async () => {
    const a = new TextEncoder().encode("alpha");
    const b = new TextEncoder().encode("bravo-bravo");
    const zip = await collect(
      zipStore(entries([{ nome: "fotos/0001.jpg", dados: a }, { nome: "fotos/0002.mp4", dados: b }])),
    );

    expect(u32(zip, 0)).toBe(0x04034b50);

    const nomeA = new TextEncoder().encode("fotos/0001.jpg");
    const inicioDadosA = 30 + nomeA.length;
    expect(zip.subarray(inicioDadosA, inicioDadosA + a.length)).toEqual(a);

    const descA = inicioDadosA + a.length;
    expect(u32(zip, descA)).toBe(0x08074b50);
    expect(u32(zip, descA + 4)).toBe(crc32(a) >>> 0);
    expect(u32(zip, descA + 8)).toBe(a.length);

    expect(zip.subarray(zip.byteLength - 22, zip.byteLength - 18)).toEqual(
      new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    );
    expect(zip[zip.byteLength - 14]).toBe(2);
    expect(zip[zip.byteLength - 12]).toBe(2);
  });

  it("arquivo vazio ainda fecha o ZIP", async () => {
    const zip = await collect(zipStore(entries([])));
    expect(u32(zip, 0)).toBe(0x06054b50);
    expect(zip.byteLength).toBe(22);
  });
});
