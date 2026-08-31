import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postJobsDriveExport } from "./jobs-drive-export";

describe("POST /api/jobs/drive-export", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.APP_ENV = "production";
    process.env.JOB_RUNNER_SECRET = "segredo";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("recusa sem Authorization quando JOB_RUNNER_SECRET está definido", async () => {
    const res = await postJobsDriveExport(new Request("http://localhost/api/jobs/drive-export", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
