import { crc32, deflateRawSync } from "node:zlib";

export type ZipFile = {
  name: string;
  data: Uint8Array;
};

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const VERSION = 20;
const UTF8_FLAG = 1 << 11;
const DEFLATE = 8;
const DOS_DATE_1980 = 0x0021;

function u16(value: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value);
  return buf;
}

function u32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return buf;
}

export function buildZip(files: readonly ZipFile[]): Uint8Array {
  const chunks: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const uncompressed = Buffer.from(file.data);
    const compressed = deflateRawSync(uncompressed);
    const checksum = crc32(uncompressed) >>> 0;

    const local = Buffer.concat([
      u32(LOCAL_SIG),
      u16(VERSION),
      u16(UTF8_FLAG),
      u16(DEFLATE),
      u16(0),
      u16(DOS_DATE_1980),
      u32(checksum),
      u32(compressed.length),
      u32(uncompressed.length),
      u16(name.length),
      u16(0),
      name,
    ]);

    const central = Buffer.concat([
      u32(CENTRAL_SIG),
      u16(VERSION),
      u16(VERSION),
      u16(UTF8_FLAG),
      u16(DEFLATE),
      u16(0),
      u16(DOS_DATE_1980),
      u32(checksum),
      u32(compressed.length),
      u32(uncompressed.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);

    chunks.push(local, compressed);
    centrals.push(central);
    offset += local.length + compressed.length;
  }

  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    u32(EOCD_SIG),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return new Uint8Array(Buffer.concat([...chunks, centralDir, eocd]));
}
