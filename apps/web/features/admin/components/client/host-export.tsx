"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import {
  abrirJob,
  comJob,
  comReauth,
  estadoInicial,
  lerJob,
  pedirConfirmacao,
  tokenDoLink,
  type EstadoExport,
} from "@/features/admin/hooks/use-host-export";

type ExportSectionProps = {
  eventoId: string;
  modo: "full" | "curated";
  titulo: string;
  descricao: string;
  textoBotao: string;
};

function ExportSection({ eventoId, modo, titulo, descricao, textoBotao }: ExportSectionProps) {
  const [estado, setEstado] = useState<EstadoExport>(estadoInicial);
  const [busy, setBusy] = useState(false);
  const confirmou = useRef(false);

  const aplicarJob = useCallback((job: Parameters<typeof comJob>[0] | null) => {
    if (!job) return;
    setEstado(comJob(job));
  }, []);

  useEffect(() => {
    void lerJob(eventoId, modo).then((r) => {
      if (r.ok) aplicarJob(r.job);
    });
  }, [eventoId, modo, aplicarJob]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("exportar");
    const urlModo = new URLSearchParams(window.location.search).get("modo");
    if (!token || confirmou.current || (urlModo && urlModo !== modo)) return;
    confirmou.current = true;
    setBusy(true);
    void abrirJob(eventoId, token, modo === "curated")
      .then((r) => {
        if (!r.ok) setEstado({ fase: "erro" });
        else aplicarJob(r.job);
      })
      .finally(() => setBusy(false));
  }, [eventoId, modo, aplicarJob]);

  const pedir = async () => {
    setBusy(true);
    setEstado({ fase: "idle" });
    const r = await pedirConfirmacao(eventoId);
    setBusy(false);
    if (!r.ok) {
      setEstado({ fase: "erro" });
      return;
    }
    setEstado(comReauth(r.link));
  };

  const confirmarDev = async (link: string) => {
    const token = tokenDoLink(link);
    if (!token) return;
    setBusy(true);
    const r = await abrirJob(eventoId, token, modo === "curated");
    setBusy(false);
    if (!r.ok) setEstado({ fase: "erro" });
    else aplicarJob(r.job);
  };

  return (
    <AdminCard variant={estado.fase === "pronto" ? "highlight" : "default"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 mt-0 font-titulo text-lg">{titulo}</h2>
          <p className="mb-0 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">{descricao}</p>
        </div>
        {estado.fase !== "pronto" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void pedir()}
            className={`${adminClasses.secondaryButton} shrink-0 ${busy ? "cursor-wait opacity-60" : ""}`}
          >
            {busy ? "Aguarde…" : textoBotao}
          </button>
        )}
        {estado.fase === "pronto" && estado.job.baixar && (
          <a href={estado.job.baixar} className={`${adminClasses.primaryButton} shrink-0`}>
            Baixar ZIP · {estado.job.fotos} {estado.job.fotos === 1 ? "arquivo" : "arquivos"}
          </a>
        )}
      </div>

      {estado.fase === "reauth" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-ink-2">
          Enviamos um link de confirmação. Sem ele o download não começa.
          {estado.link && (
            <>
              {" "}
              Em desenvolvimento o link aparece aqui:{" "}
              <button
                type="button"
                className="cursor-pointer border-none bg-transparent p-0 text-acento underline"
                onClick={() => void confirmarDev(estado.link!)}
              >
                confirmar agora
              </button>
            </>
          )}
        </p>
      )}

      {estado.fase === "vazio" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-ink-3">
          Ainda não há fotos no álbum. Quando entrar a primeira, o download abre aqui.
        </p>
      )}

      {estado.fase === "erro" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-critico">Não foi possível baixar agora. Tente de novo.</p>
      )}
    </AdminCard>
  );
}

export function HostExport({ eventoId }: { eventoId: string }) {
  return (
    <>
      <ExportSection
        eventoId={eventoId}
        modo="full"
        titulo="Baixar tudo"
        descricao="As fotos publicadas da noite, num ZIP. Confirma no e-mail antes — a sessão aberta não basta."
        textoBotao="Baixar tudo"
      />
      <ExportSection
        eventoId={eventoId}
        modo="curated"
        titulo="Álbum curado"
        descricao="Seleção automática (sem rajadas) · até ~60 páginas · mesmo step-up"
        textoBotao="Baixar curado"
      />
    </>
  );
}
