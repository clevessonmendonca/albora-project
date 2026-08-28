import { describe, expect, it } from "vitest";
import { midiaExportavel, nomeDoArquivoZip, nomeNoZip } from "./acervo-export";

const EVENTO = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OUTRO = "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee";
const UUID = "11111111-2222-3333-4444-555555555555";

function item(parcial: Partial<{ chave: string; estado: string; mime: string }> = {}) {
  return {
    id: UUID,
    chave: `events/${EVENTO}/2026/08/${UUID}/full`,
    mime: "image/jpeg",
    estado: "published",
    ...parcial,
  };
}

describe("o que entra no baixar tudo", () => {
  it("aceita a full publicada deste evento", () => {
    expect(midiaExportavel(item(), EVENTO)).toBe(true);
  });

  it("recusa o que saiu de published — a mesma coluna do álbum", () => {
    expect(midiaExportavel(item({ estado: "removed" }), EVENTO)).toBe(false);
    expect(midiaExportavel(item({ estado: "held" }), EVENTO)).toBe(false);
  });

  it("recusa thumb, recado, peça e o próprio ZIP de export", () => {
    expect(midiaExportavel(item({ chave: `events/${EVENTO}/2026/08/${UUID}/thumb` }), EVENTO)).toBe(
      false,
    );
    expect(midiaExportavel(item({ chave: `events/${EVENTO}/recado/${UUID}` }), EVENTO)).toBe(false);
    expect(midiaExportavel(item({ chave: `events/${EVENTO}/export/${UUID}.zip` }), EVENTO)).toBe(
      false,
    );
  });

  it("recusa a full de outro evento mesmo com estado publicado", () => {
    expect(
      midiaExportavel(item({ chave: `events/${OUTRO}/2026/08/${UUID}/full` }), EVENTO),
    ).toBe(false);
  });
});

describe("nomes no ZIP", () => {
  it("numera sem nome de convidado e escolhe a extensão pelo mime", () => {
    expect(nomeNoZip(0, "image/jpeg")).toBe("fotos/0001.jpg");
    expect(nomeNoZip(11, "video/mp4")).toBe("fotos/0012.mp4");
    expect(nomeNoZip(0, "application/octet-stream")).toBe("fotos/0001.bin");
  });

  it("o arquivo baixado leva o slug, sem caracteres de path", () => {
    expect(nomeDoArquivoZip("festa-da-ana")).toBe("festa-da-ana.zip");
    expect(nomeDoArquivoZip("../outro/evento")).toBe("outro-evento.zip");
  });
});
