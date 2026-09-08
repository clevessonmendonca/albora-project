import { describe, expect, it } from "vitest";
import * as actorModule from "./actor";

describe("actor barrel", () => {
  it("reexporta resolveActor", () => {
    expect(typeof actorModule.resolveActor).toBe("function");
  });
});
