import { describe, expect, it } from "vitest";
import { safeAdminNext } from "./sign-in-form";

describe("safeAdminNext", () => {
  it("aceita só paths /admin", () => {
    expect(safeAdminNext("/admin/new?plano=celebration")).toBe("/admin/new?plano=celebration");
    expect(safeAdminNext("/admin")).toBe("/admin");
  });

  it("recusa open redirect", () => {
    expect(safeAdminNext("https://evil.com")).toBeNull();
    expect(safeAdminNext("//evil.com")).toBeNull();
    expect(safeAdminNext("/e/festa")).toBeNull();
    expect(safeAdminNext(null)).toBeNull();
  });
});
