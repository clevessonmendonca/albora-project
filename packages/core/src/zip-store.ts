/**
 * ZIP STORE em stream. Um arquivo por vez, sem comprimir — JPEG e MP4 já
 * chegaram compactados, e deflate no servidor carregaria o blob inteiro.
 *
 * Data descriptor (bit 3) deixa o CRC e o tamanho saírem **depois** dos
 * bytes, que é o que permite puxar o objeto do storage em pedaços.
 */

const LOCAL = 0x04034b50;
const DESCRIPTOR = 0x08074b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;
const VERSION = 20;
const STORE = 0;
const UTF8 = 1 << 11;
const DATA_DESCRIPTOR = 1 << 3;
const FLAGS = UTF8 | DATA_DESCRIPTOR;
const DOS_DATE_1980 = 0x0021;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32Update(crc: number, chunk: Uint8Array): number {
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < chunk.length; i++) {
    c = CRC_TABLE[(c ^ chunk[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipStoreEntry = {
  nome: string;
  dados: AsyncIterable<Uint8Array>;
};

export async function* zipStore(entries: AsyncIterable<ZipStoreEntry>): AsyncIterable<Uint8Array> {
  const centrals: Uint8Array[] = [];
  let offset = 0;
  let count = 0;

  for await (const entry of entries) {
    const nome = new TextEncoder().encode(entry.nome);
    const local = concat([
      u32(LOCAL),
      u16(VERSION),
      u16(FLAGS),
      u16(STORE),
      u16(0),
      u16(DOS_DATE_1980),
      u32(0),
      u32(0),
      u32(0),
      u16(nome.length),
      u16(0),
      nome,
    ]);

    yield local;

    let crc = 0;
    let size = 0;
    for await (const chunk of entry.dados) {
      if (chunk.byteLength === 0) continue;
      crc = crc32Update(crc, chunk);
      size += chunk.byteLength;
      yield chunk;
    }

    const descriptor = concat([u32(DESCRIPTOR), u32(crc), u32(size), u32(size)]);
    yield descriptor;

    centrals.push(
      concat([
        u32(CENTRAL),
        u16(VERSION),
        u16(VERSION),
        u16(FLAGS),
        u16(STORE),
        u16(0),
        u16(DOS_DATE_1980),
        u32(crc),
        u32(size),
        u32(size),
        u16(nome.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nome,
      ]),
    );

    offset += local.byteLength + size + descriptor.byteLength;
    count += 1;
  }

  const centralDir = concat(centrals);
  yield centralDir;
  yield concat([
    u32(EOCD),
    u16(0),
    u16(0),
    u16(count),
    u16(count),
    u32(centralDir.byteLength),
    u32(offset),
    u16(0),
  ]);
}

function u16(value: number): Uint8Array {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, value, true);
  return buf;
}

function u32(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value >>> 0, true);
  return buf;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
