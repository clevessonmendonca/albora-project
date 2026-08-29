"use client";

import { AdminCard } from "@/features/admin/components/server/admin-shell";
import {
  QR_PROOF_DEVICES,
  QR_PROOF_DISTANCES_CM,
  qrProofCellId,
} from "@/features/admin/lib/qr-proof-sheet";

export function QrProofSheet({ eventId }: { eventId: string }) {
  return (
    <AdminCard className="print:break-inside-avoid">
      <h3 className="m-0 mb-2 font-titulo text-base">Prova física do QR</h3>
      <p className="mt-0 mb-4 max-w-[52ch] text-[0.875rem] leading-relaxed text-ink-3">
        Imprima peças na gráfica e teste com 3 celulares antes do casamento. Critério: 3/3
        aparelhos scaneiam em ≤5 s a 30 cm, luz baixa. Detalhes em{" "}
        <span className="text-ink-2">docs/runbooks/prova-qr-fisica.md</span>.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-[0.8125rem]">
          <thead>
            <tr className="border-b border-linha text-left text-ink-3">
              <th className="py-2 pr-3 font-normal">Aparelho</th>
              {QR_PROOF_DISTANCES_CM.map((d) => (
                <th key={d} className="px-2 py-2 font-normal">
                  {d} cm
                </th>
              ))}
              <th className="px-2 py-2 font-normal">Luz baixa (30 cm)</th>
              <th className="pl-2 py-2 font-normal">Passou?</th>
            </tr>
          </thead>
          <tbody>
            {QR_PROOF_DEVICES.map((device) => (
              <tr key={device.id} className="border-b border-linha">
                <td className="py-2.5 pr-3 text-ink">{device.label}</td>
                {QR_PROOF_DISTANCES_CM.map((d) => (
                  <td key={d} className="px-2 py-2.5">
                    <span
                      className="inline-block size-4 rounded-sm border border-linha align-middle"
                      aria-hidden
                    />
                    <span className="sr-only">{qrProofCellId(device.id, d)}</span>
                  </td>
                ))}
                <td className="px-2 py-2.5">
                  <span
                    className="inline-block size-4 rounded-sm border border-linha align-middle"
                    aria-hidden
                  />
                </td>
                <td className="pl-2 py-2.5">
                  <span
                    className="inline-block size-4 rounded-sm border border-linha align-middle"
                    aria-hidden
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 grid gap-2 text-[0.8125rem] text-ink-2 sm:grid-cols-2">
        <div>
          <dt className="text-ink-3">Data da prova</dt>
          <dd className="m-0 mt-1 min-h-[1.25rem] border-b border-linha" />
        </div>
        <div>
          <dt className="text-ink-3">Responsável</dt>
          <dd className="m-0 mt-1 min-h-[1.25rem] border-b border-linha" />
        </div>
        <div>
          <dt className="text-ink-3">Gráfica / papel</dt>
          <dd className="m-0 mt-1 min-h-[1.25rem] border-b border-linha" />
        </div>
        <div>
          <dt className="text-ink-3">Evento</dt>
          <dd className="m-0 mt-1 font-mono text-[0.75rem]">{eventId}</dd>
        </div>
      </dl>

      <p className="mb-0 mt-4 text-[0.8125rem] text-ink-3">
        Resultado: ☐ APROVADO &nbsp; ☐ REPROVADO — não ir ao casamento sem aprovar.
      </p>
    </AdminCard>
  );
}
