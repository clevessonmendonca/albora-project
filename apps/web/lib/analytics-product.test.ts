import { describe, expect, it } from "vitest";
import { isProductEventName } from "@albora/db";

describe("landing_veteran_cta", () => {
  it("é evento de produto válido", () => {
    expect(isProductEventName("landing_veteran_cta")).toBe(true);
  });
});
