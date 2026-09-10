import { describe, expect, it } from "vitest";
import {
  VENDOR_PLAN_PRICE_CENTS,
  VENDOR_PLAN_TEAM_LIMIT,
  type VendorPlanTier,
} from "./vendor-billing";

describe("VENDOR_PLAN_PRICE_CENTS", () => {
  it("cobre exatamente os três tiers, em centavos inteiros", () => {
    const tiers = Object.keys(VENDOR_PLAN_PRICE_CENTS) as VendorPlanTier[];
    expect(tiers.sort()).toEqual(["agency", "starter", "studio"]);
    for (const v of Object.values(VENDOR_PLAN_PRICE_CENTS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe("VENDOR_PLAN_TEAM_LIMIT", () => {
  it("mantém equipe pequena no Starter, cinco pessoas no Studio e libera Agency", () => {
    expect(VENDOR_PLAN_TEAM_LIMIT).toEqual({ starter: 1, studio: 5, agency: null });
  });
});
