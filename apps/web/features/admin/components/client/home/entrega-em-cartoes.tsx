import React from "react";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import { HostExportCartao } from "../host-export";
import { HostDriveExport } from "../host-drive-export";

/** "Destaques (ZIP das destacadas)" fica de fora: o export só tem os modos `full` e `curated` (seleção automática), nenhum filtra por destacada. */
export function EntregaEmCartoes({ eventoId }: { eventoId: string }) {
  return (
    <section aria-labelledby="entrega-cartoes-titulo">
      <h2 id="entrega-cartoes-titulo" className="tipo-label m-0 mb-3 text-ink-3">
        Guardar suas fotos
      </h2>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
        <HostExportCartao eventoId={eventoId} />
        <HostDriveExport eventoId={eventoId} cartao />
        <AdminCard>
          <h3 className="tipo-subtitle m-0 mb-2 text-ink">Álbum-livro</h3>
          <p className="tipo-body m-0 mb-4 text-ink-2">PDF pra imprimir, com as fotos já diagramadas.</p>
          <a
            href={`/api/admin/events/${eventoId}/book/pdf`}
            className={`${adminClasses.secondaryButton} inline-flex no-underline`}
          >
            Baixar PDF do livro
          </a>
        </AdminCard>
      </div>
    </section>
  );
}
