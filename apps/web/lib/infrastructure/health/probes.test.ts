import { describe, expect, it } from "vitest";
import { livenessBody, probeDatabase } from "./probes";

describe("livenessBody", () => {
  it("marca o processo como vivo sem depender de banco", () => {
    const body = livenessBody();
    expect(body.status).toBe("alive");
    expect(body.service).toBe("albora");
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("probeDatabase", () => {
  it("falha fechado quando DATABASE_URL está ausente", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const result = await probeDatabase();
    expect(result).toEqual({ ok: false, code: "database.url_ausente" });

    if (previous !== undefined) process.env.DATABASE_URL = previous;
  });
});
