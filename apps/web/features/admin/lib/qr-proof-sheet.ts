export const QR_PROOF_DISTANCES_CM = [15, 30, 45] as const;

export const QR_PROOF_DEVICES = [
  { id: "iphone", label: "iPhone (≥3 anos)" },
  { id: "android", label: "Android entry-level" },
  { id: "pelicula", label: "Aparelho com película usada" },
] as const;

export type QrProofDeviceId = (typeof QR_PROOF_DEVICES)[number]["id"];

export function qrProofCellId(deviceId: QrProofDeviceId, distanceCm: number): string {
  return `qr-proof-${deviceId}-${distanceCm}`;
}
