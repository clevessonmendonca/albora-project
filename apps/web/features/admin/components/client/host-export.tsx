"use client";

import { Badge, Button } from "@albora/ui-web";
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

/** Estado do export em uma palavra — legível de relance, sem abrir a descrição. */
function estadoBadge(estado: EstadoExport): { tone: "neutral" | "accent" | "outline" | "critico"; label: string } | null {
  if (estado.fase === "pronto") return { tone: "accent", label: "Pronto" };
  if (estado.fase === "reauth" || estado.fase === "confirmando") return { tone: "outline", label: "Aguardando confirmação" };
  if (estado.fase === "vazio") return { tone: "outline", label: "Sem fotos ainda" };
  if (estado.fase === "erro") return { tone: "critico", label: "Erro" };
  return null;
}

function ExportSection({ eventoId, modo, titulo, descricao, textoBotao }: ExportSectionProps) {
  const [estado, setEstado] = useState<EstadoExport>(estadoInicial);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const confirmou = useRef(false);

  const aplicarJob = useCallback((job: Parameters<typeof comJob>[0] | null) => {
    if (!job) return;
    setEstado(comJob(job));
  }, []);

  useEffect(() => {
    void lerJob(eventoId, modo).then((r) => {
      if (r.ok) aplicarJob(r.job);
    }).finally(() => setLoading(false));
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

  if (loading) {
    return (
      <AdminCard>
        <div className="animate-pulse flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-36 rounded-token bg-superficie-alta" />
            <div className="h-3.5 w-64 rounded-full bg-superficie-alta" />
          </div>
          <div className="h-11 w-28 shrink-0 rounded-pilula bg-superficie-alta" />
        </div>
      </AdminCard>
    );
  }

  const badge = estadoBadge(estado);

  return (
    <AdminCard variant={estado.fase === "pronto" ? "highlight" : "default"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="tipo-subtitle m-0 text-ink">{titulo}</h2>
            {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
          </div>
          <p className="tipo-body m-0 text-ink-2">{descricao}</p>
        </div>
        {estado.fase !== "pronto" && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void pedir()}
            className={`shrink-0 ${busy ? "cursor-wait" : ""}`}
          >
            {busy ? "Aguarde…" : textoBotao}
          </Button>
        )}
        {estado.fase === "pronto" && estado.job.baixar && (
          <a href={estado.job.baixar} className={`${adminClasses.primaryButton} shrink-0`}>
            Baixar ZIP · {estado.job.fotos} {estado.job.fotos === 1 ? "arquivo" : "arquivos"}
          </a>
        )}
      </div>

      {estado.fase === "reauth" && (
        <p className="tipo-caption m-0 mt-4 text-ink-2">
          Enviamos um link de confirmação. Sem ele o download não começa.
          {estado.link && (
            <>
              {" "}
              Em desenvolvimento o link aparece aqui:{" "}
              <button
                type="button"
                className="cursor-pointer border-none bg-transparent p-0 text-acento underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
                onClick={() => void confirmarDev(estado.link!)}
              >
                confirmar agora
              </button>
            </>
          )}
        </p>
      )}

      {estado.fase === "vazio" && (
        <p className="tipo-caption m-0 mt-4 text-ink-3">
          Ainda não há fotos no álbum. Quando entrar a primeira, o download abre aqui.
        </p>
      )}

      {estado.fase === "erro" && (
        <p role="alert" className="tipo-caption m-0 mt-4 text-critico">
          Não foi possível baixar agora. Tente de novo.
        </p>
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
