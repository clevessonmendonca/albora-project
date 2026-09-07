import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildZip } from "./zip-bytes";

function unzip(zip: Uint8Array): Map<string, Uint8Array> {
  const buf = Buffer.from(zip);
  const out = new Map<string, Uint8Array>();
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const dataStart = i + 30 + nameLen + extraLen;
    const compressed = buf.subarray(dataStart, dataStart + compSize);
    const data = method === 8 ? inflateRawSync(compressed) : compressed;
    out.set(name, new Uint8Array(data));
    i = dataStart + compSize;
  }
  return out;
}

describe("buildZip", () => {
  it("empacota arquivos e devolve PK", () => {
    const zip = buildZip([
      { name: "a.txt", data: new TextEncoder().encode("olá") },
      { name: "b/c.pdf", data: new Uint8Array([0x25, 0x50, 0x44, 0x46]) },
    ]);

    expect(Buffer.from(zip.subarray(0, 2)).toString("latin1")).toBe("PK");
    const files = unzip(zip);
    expect([...files.keys()]).toEqual(["a.txt", "b/c.pdf"]);
    expect(new TextDecoder().decode(files.get("a.txt"))).toBe("olá");
    expect(Buffer.from(files.get("b/c.pdf") ?? []).toString("latin1")).toBe("%PDF");
  });

  it("zip vazio ainda fecha o diretório central", () => {
    const zip = buildZip([]);
    expect(zip.byteLength).toBe(22);
    expect(Buffer.from(zip.subarray(0, 4)).readUInt32LE(0)).toBe(0x06054b50);
  });
});
