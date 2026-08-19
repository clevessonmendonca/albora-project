import { describe, expect, it } from "vitest";
import { showsFollowMode } from "./follow-mode";

describe("showsFollowMode", () => {
  it("casal na seção habilitada: modo Acompanhar", () => {
    expect(showsFollowMode("couple", true)).toBe(true);
  });

  it("planner na mesma seção: painel denso, sem mudança", () => {
    expect(showsFollowMode("planner", true)).toBe(false);
  });

  it("owner na mesma seção: painel denso, sem mudança", () => {
    expect(showsFollowMode("owner", true)).toBe(false);
  });

  it("casal fora da seção habilitada (ex.: Moderação, Missões): painel denso", () => {
    expect(showsFollowMode("couple", false)).toBe(false);
  });
});
