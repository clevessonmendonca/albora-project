import { describe, expect, it } from "vitest";
import { mayDeleteAtD365, planRetention } from "./retention";

describe("planRetention", () => {
  it("agenda +48h, D330 e D365 a partir do fim do evento", () => {
    const ends = new Date("2026-08-10T06:00:00Z");
    const items = planRetention(ends, new Date("2026-08-10T07:00:00Z"));
    expect(items.map((i) => i.kind)).toEqual(["plus_48h", "d330_drive", "d365_delete"]);
    expect(items[0]!.dueAt.toISOString()).toBe("2026-08-12T06:00:00.000Z");
  });
});

describe("mayDeleteAtD365", () => {
  it("recusa apagar sem evidência de export", () => {
    expect(mayDeleteAtD365({ exportSucceeded: false, driveStubDone: false })).toEqual({
      ok: false,
      reason: "export_missing",
    });
  });

  it("permite quando houve export", () => {
    expect(mayDeleteAtD365({ exportSucceeded: true, driveStubDone: false })).toEqual({ ok: true });
  });
});
