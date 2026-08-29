import { describe, expect, it } from "vitest";
import { WEDDING } from "@albora/packs";
import { interactionBannerLabels, resolveInteractionBanner } from "./interaction-banner";

const FUSO = "America/Sao_Paulo";

describe("resolveInteractionBanner", () => {
  const labels = interactionBannerLabels(WEDDING);

  it("gate aberto usa copy do pack", () => {
    const r = resolveInteractionBanner(
      { interacaoAbreEm: new Date("2020-01-01T12:00:00Z"), fuso: FUSO },
      labels,
      new Date("2026-06-01T22:00:00Z"),
    );
    expect(r.open).toBe(true);
    expect(r.label).toBe("Feed liberado — veja o que rolou");
  });

  it("gate fechado sem horário usa copy fechada", () => {
    const r = resolveInteractionBanner(
      { interacaoAbreEm: null, fuso: FUSO },
      labels,
      new Date("2026-06-01T22:00:00Z"),
    );
    expect(r.open).toBe(false);
    expect(r.label).toBe("Interação abre após a cerimônia");
  });

  it("gate agendado inclui hora no fuso do evento", () => {
    const r = resolveInteractionBanner(
      { interacaoAbreEm: new Date("2026-06-01T23:30:00-03:00"), fuso: FUSO },
      labels,
      new Date("2026-06-01T20:00:00-03:00"),
    );
    expect(r.open).toBe(false);
    expect(r.label).toMatch(/23:30/);
  });
});
