import { describe, expect, it } from "vitest";
import { contarUploadsAntesDepoisDoFeed } from "./funnel-aggregate";

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
