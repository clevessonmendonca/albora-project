import { describe, expect, it } from "vitest";
import { QR_PROOF_DEVICES, QR_PROOF_DISTANCES_CM, qrProofCellId } from "./qr-proof-sheet";

describe("qrProofCellId", () => {
  it("combina aparelho e distância", () => {
    expect(qrProofCellId("iphone", 30)).toBe("qr-proof-iphone-30");
  });
});

describe("QR proof constants", () => {
  it("define 3 aparelhos e 3 distâncias", () => {
    expect(QR_PROOF_DEVICES).toHaveLength(3);
    expect(QR_PROOF_DISTANCES_CM).toEqual([15, 30, 45]);
  });
});
