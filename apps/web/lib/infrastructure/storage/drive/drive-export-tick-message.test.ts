import { describe, expect, it } from "vitest";
import { parseDriveExportTickMessage } from "./drive-export-tick-message";

const EVENT = "11111111-1111-4111-8111-111111111111";
const JOB = "22222222-2222-4222-8222-222222222222";
const ACCOUNT = "33333333-3333-4333-8333-333333333333";

describe("parseDriveExportTickMessage", () => {
  it("aceita payload válido", () => {
    expect(parseDriveExportTickMessage({ eventId: EVENT, jobId: JOB, accountId: ACCOUNT })).toEqual({
      eventId: EVENT,
      jobId: JOB,
      accountId: ACCOUNT,
    });
  });

  it("rejeita uuid inválido", () => {
    expect(parseDriveExportTickMessage({ eventId: "x", jobId: JOB, accountId: ACCOUNT })).toBeNull();
  });
});
