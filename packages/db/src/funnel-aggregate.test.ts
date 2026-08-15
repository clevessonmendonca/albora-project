import { describe, expect, it } from "vitest";
import { contarEntradasPorVia, contarUploadsAntesDepoisDoFeed } from "./funnel-aggregate";

describe("contarUploadsAntesDepoisDoFeed", () => {
  it("upload_ok antes do feed conta em antes", () => {
    expect(contarUploadsAntesDepoisDoFeed([["upload_ok", "upload_ok", "feed_open"]])).toEqual({
      antes: 2,
      depois: 0,
    });
  });

  it("upload_ok depois do primeiro feed_open conta em depois", () => {
    expect(
      contarUploadsAntesDepoisDoFeed([["upload_ok", "feed_open", "upload_ok", "upload_ok"]]),
    ).toEqual({ antes: 1, depois: 2 });
  });

  it("sessão que nunca abriu o feed fica toda em antes", () => {
    expect(contarUploadsAntesDepoisDoFeed([["upload_ok"], ["capture", "upload_ok"]])).toEqual({
      antes: 2,
      depois: 0,
    });
  });

  it("sessão só com feed_open não move o numerador", () => {
    expect(contarUploadsAntesDepoisDoFeed([["feed_open"]])).toEqual({ antes: 0, depois: 0 });
  });
});

describe("contarEntradasPorVia", () => {
  it("soma QR, WhatsApp e link sem misturar", () => {
    expect(
      contarEntradasPorVia([
        { via: "qr", n: 4 },
        { via: "wa", n: 2 },
        { via: "link", n: 3 },
      ]),
    ).toEqual({ qr: 4, wa: 2, link: 3 });
  });

  it("valor fora do conjunto cai em link, nunca em QR", () => {
    expect(contarEntradasPorVia([{ via: "qr_scan", n: 9 }])).toEqual({ qr: 0, wa: 0, link: 9 });
  });
});
