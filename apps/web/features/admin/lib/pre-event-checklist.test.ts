/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPreEventSections,
  preEventStorageKey,
  readPreEventChecklist,
  writePreEventChecklist,
} from "./pre-event-checklist";

describe("preEventStorageKey", () => {
  it("combina conta e evento", () => {
    expect(preEventStorageKey("acc-1", "evt-2")).toBe("albora-pre-event:acc-1:evt-2");
  });
});

describe("readPreEventChecklist / writePreEventChecklist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persiste booleanos e ignora lixo", () => {
    const key = "albora-pre-event:test:test";
    writePreEventChecklist(key, { pecas: true, invalid: true as unknown as boolean });
    expect(readPreEventChecklist(key)).toEqual({ pecas: true, invalid: true });
    localStorage.removeItem(key);
  });
});

describe("buildPreEventSections", () => {
  it("gera links admin e telão", () => {
    const sections = buildPreEventSections("evt-1", "https://albora.app");
    const antes = sections.find((s) => s.id === "antes");
    expect(antes?.items.some((i) => i.href === "/admin/e/evt-1/guests")).toBe(true);
    expect(antes?.items.some((i) => i.href === "https://albora.app/wall-display")).toBe(true);
    expect(antes?.items.some((i) => i.href?.includes("#controle-interacao"))).toBe(true);
    expect(antes?.items.some((i) => i.href?.includes("#prova-qr-fisica"))).toBe(true);
  });
});
