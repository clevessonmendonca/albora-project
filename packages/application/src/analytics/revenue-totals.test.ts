import { describe, expect, it } from "vitest";
import { computeRevenueTotals, VENDOR_PLAN_PRICE_CENTS } from "./revenue";

describe("computeRevenueTotals", () => {
  it("soma MRR só das assinaturas ativas, por preço do plano", () => {
    const r = computeRevenueTotals([
      { plan: "starter", status: "active", n: 2 },
      { plan: "agency", status: "active", n: 1 },
      { plan: "studio", status: "canceled", n: 5 },
    ]);
    expect(r.mrrCents).toBe(VENDOR_PLAN_PRICE_CENTS.starter * 2 + VENDOR_PLAN_PRICE_CENTS.agency);
    expect(r.activeSubscriptions).toBe(3);
  });

  it("conta atraso separado do MRR", () => {
    const r = computeRevenueTotals([
      { plan: "starter", status: "overdue", n: 4 },
      { plan: "starter", status: "active", n: 1 },
    ]);
    expect(r.overdueCount).toBe(4);
    expect(r.mrrCents).toBe(VENDOR_PLAN_PRICE_CENTS.starter);
  });

  // Trava de regressão: `undefined * n` daria NaN, e NaN somado ao MRR se
  // propaga em silêncio até o painel do dono — parece número e não é.
  it("plano sem preço no mapa não contamina o MRR com NaN", () => {
    const r = computeRevenueTotals([
      { plan: "starter", status: "active", n: 1 },
      { plan: "enterprise", status: "active", n: 3 },
    ]);
    expect(Number.isNaN(r.mrrCents)).toBe(false);
    expect(r.mrrCents).toBe(VENDOR_PLAN_PRICE_CENTS.starter);
    expect(r.unknownPlans).toEqual(["enterprise"]);
  });

  it("sem linha nenhuma devolve zeros, não NaN", () => {
    const r = computeRevenueTotals([]);
    expect(r).toEqual({ mrrCents: 0, activeSubscriptions: 0, overdueCount: 0, unknownPlans: [] });
  });
});
