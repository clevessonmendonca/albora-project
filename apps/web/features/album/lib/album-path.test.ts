import { describe, expect, it } from "vitest";
import { albumPath } from "./album-path";

describe("albumPath", () => {
  it("sem missão, devolve o álbum limpo", () => {
    expect(albumPath("festa-demo", null)).toBe("/e/festa-demo/album");
  });

  it("com missão, grava o filtro no query", () => {
    expect(albumPath("festa-demo", "pista")).toBe("/e/festa-demo/album?missao=pista");
  });
});
