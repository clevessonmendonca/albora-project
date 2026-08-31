"use client";

import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";

type Props = {
  eventName: string;
  guestUrl: string;
  svgString: string;
};

export function QrCodePrint({ eventName, guestUrl, svgString }: Props) {
  return (
    <>
      <style>{`
        @media print {
          header, nav, aside, footer,
          [data-admin-nav], [data-admin-shell-header],
          [data-admin-shell-back] { display: none !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .qr-print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <AdminCard className="qr-print-area">
        <div className="flex flex-col items-center gap-6 py-4">
          <div
            className="w-56 rounded-token bg-white p-3 shadow-sm"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          <div className="text-center">
            <p className="mb-1 mt-0 font-titulo text-xl">{eventName}</p>
            <p className="mb-0 mt-0 break-all font-mono text-sm text-ink-2">{guestUrl}</p>
          </div>

          <p className="mb-0 mt-0 max-w-xs text-center text-sm leading-relaxed text-ink-3">
            Aponte a câmera do celular para o QR Code e comece a enviar fotos.
          </p>
        </div>
      </AdminCard>

      <div className="print:hidden mt-2 flex justify-center">
        <button
          type="button"
          onClick={() => window.print()}
          className={adminClasses.primaryButton}
        >
          Imprimir
        </button>
      </div>
    </>
  );
}
