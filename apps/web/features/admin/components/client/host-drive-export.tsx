"use client";

import { Badge, Button } from "@albora/ui-web";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import {
  desconectarDrive,
  estadoInicialDrive,
  exportarParaDrive,
  gigabytes,
  lerJobDrive,
  lerStatusDrive,
  pedirReauthDrive,
  tokenDoLinkDrive,
  urlDeConectar,
  type EstadoDrive,
} from "@/features/admin/hooks/use-host-drive-export";

/** Estado da conexão/export em uma palavra — legível de relance, sem abrir a descrição. */
function estadoBadge(
  estado: EstadoDrive,
): { tone: "neutral" | "accent" | "outline" | "critico"; label: string } | null {
  switch (estado.fase) {
    case "carregando":
      return null;
    case "indisponivel":
      return { tone: "outline", label: "Indisponível" };
    case "desconectado":
      return { tone: "outline", label: "Não conectado" };
    case "reauth":
      return { tone: "outline", label: "Aguardando confirmação" };
    case "conectado_sem_export":
      return { tone: "neutral", label: "Conectado" };
    case "enviando":
      return { tone: "accent", label: "Enviando…" };
    case "pronto":
      return { tone: "accent", label: "Pronto" };
    case "parcial":
      return { tone: "critico", label: "Parcial" };
    case "quota_insuficiente":
      return { tone: "critico", label: "Sem espaço" };
    case "erro":
      return { tone: "critico", label: "Erro" };
  }
}

export function HostDriveExport({ eventoId }: { eventoId: string }) {
  const [estado, setEstado] = useState<EstadoDrive>(estadoInicialDrive());
  const [busy, setBusy] = useState(false);
  const confirmouConexao = useRef(false);

  const carregar = useCallback(async () => {
    const [statusR, jobR] = await Promise.all([lerStatusDrive(eventoId), lerJobDrive(eventoId)]);
    if (!statusR.ok) {
      setEstado({ fase: "erro" });
      return;
    }
    if (!statusR.status.podeExportar) {
      setEstado({ fase: "indisponivel" });
      return;
    }
    const conexao = statusR.status.conexao;
    if (!conexao || conexao.status !== "conectado") {
      setEstado({ fase: "desconectado" });
      return;
    }
    if (jobR.ok && jobR.job) {
      if (jobR.job.estado === "pronto") setEstado({ fase: "pronto", conexao, job: jobR.job });
      else if (jobR.job.estado === "parcial") setEstado({ fase: "parcial", conexao, job: jobR.job });
      else if (jobR.job.estado === "enviando")
        setEstado({ fase: "enviando", conexao, job: jobR.job });
      else setEstado({ fase: "conectado_sem_export", conexao });
      return;
    }
    setEstado({ fase: "conectado_sem_export", conexao });
  }, [eventoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (estado.fase !== "enviando") return;
    const id = window.setInterval(() => void carregar(), 4000);
    return () => window.clearInterval(id);
  }, [estado.fase, carregar]);

  // driveConectar vem via redirect do servidor (/drive/connect), nunca por fetch direto.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("driveConectar");
    if (!token || confirmouConexao.current) return;
    confirmouConexao.current = true;
    window.location.href = urlDeConectar(eventoId, token);
  }, [eventoId]);

  const pedirConexao = async () => {
    setBusy(true);
    const r = await pedirReauthDrive(eventoId);
    setBusy(false);
    if (!r.ok) {
      setEstado({ fase: "erro" });
      return;
    }
    setEstado({ fase: "reauth", link: r.link });
  };

  const confirmarDev = (link: string) => {
    const token = tokenDoLinkDrive(link);
    if (!token) return;
    window.location.href = urlDeConectar(eventoId, token);
  };

  const desconectar = async () => {
    setBusy(true);
    const ok = await desconectarDrive(eventoId);
    setBusy(false);
    if (ok) setEstado({ fase: "desconectado" });
  };

  const exportar = async () => {
    const conexaoAtual = "conexao" in estado ? estado.conexao : null;
    if (!conexaoAtual) return;

    setBusy(true);
    const r = await exportarParaDrive(eventoId);
    setBusy(false);

    if (!r.ok) {
      if ("necessario" in r) {
        setEstado({
          fase: "quota_insuficiente",
          conexao: conexaoAtual,
          necessario: r.necessario,
          disponivel: r.disponivel,
        });
        return;
      }
      setEstado({ fase: "erro" });
      return;
    }

    if (r.job.estado === "pronto") setEstado({ fase: "pronto", conexao: conexaoAtual, job: r.job });
    else if (r.job.estado === "parcial") setEstado({ fase: "parcial", conexao: conexaoAtual, job: r.job });
    else if (r.job.estado === "enviando") setEstado({ fase: "enviando", conexao: conexaoAtual, job: r.job });
    else void carregar();
  };

  if (estado.fase === "carregando") {
    return (
      <AdminSection>
        <div className="animate-pulse flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-52 rounded-token bg-superficie-alta" />
            <div className="h-3.5 w-80 rounded-full bg-superficie-alta" />
          </div>
          <div className="h-11 w-36 shrink-0 rounded-pilula bg-superficie-alta" />
        </div>
      </AdminSection>
    );
  }

  const badge = estadoBadge(estado);

  return (
    <AdminSection>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="tipo-subtitle m-0 text-ink">Exportar para o Google Drive</h2>
            {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
          </div>
          <p className="tipo-body m-0 text-ink-2">
            A cópia completa do acervo, direto no Drive do casal — sem prazo pra começar, quando vocês
            quiserem depois da festa.
          </p>
        </div>

        {estado.fase === "desconectado" && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void pedirConexao()}
            className={`shrink-0 ${busy ? "cursor-wait" : ""}`}
          >
            {busy ? "Aguarde…" : "Conectar Google Drive"}
          </Button>
        )}

        {(estado.fase === "conectado_sem_export" || estado.fase === "quota_insuficiente") && (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() => void exportar()}
            className={`shrink-0 ${busy ? "cursor-wait" : ""}`}
          >
            {busy ? "Enviando…" : "Exportar para o Drive"}
          </Button>
        )}

        {estado.fase === "parcial" && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void exportar()}
            className={`shrink-0 ${busy ? "cursor-wait" : ""}`}
          >
            {busy ? "Enviando…" : "Tentar de novo"}
          </Button>
        )}

        {estado.fase === "pronto" && estado.job.abrirNoDrive && (
          <a
            href={estado.job.abrirNoDrive}
            target="_blank"
            rel="noopener noreferrer"
            className={`${adminClasses.primaryButton} shrink-0`}
          >
            Abrir no Google Drive
          </a>
        )}
      </div>

      {estado.fase === "indisponivel" && (
        <p className="tipo-caption m-0 mt-4 text-ink-3">Disponível depois que a festa terminar.</p>
      )}

      {estado.fase === "reauth" && (
        <p className="tipo-caption m-0 mt-4 text-ink-2">
          Enviamos um link de confirmação. Sem ele a conexão não começa.
          {estado.link && (
            <>
              {" "}
              Em desenvolvimento o link aparece aqui:{" "}
              <button
                type="button"
                className="cursor-pointer border-none bg-transparent p-0 text-acento underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80"
                onClick={() => confirmarDev(estado.link!)}
              >
                confirmar agora
              </button>
            </>
          )}
        </p>
      )}

      {estado.fase === "enviando" && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="tipo-caption m-0 text-ink-2">
              Enviando para o Drive… Pode fechar esta tela.
            </p>
            <span className="tipo-label shrink-0 tabular-nums text-ink-3">
              {estado.job.enviadas}/{estado.job.fotos}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-superficie-alta">
            <div
              className="h-full rounded-full bg-acento transition-all duration-700 motion-reduce:transition-none"
              style={{
                width: estado.job.fotos > 0
                  ? `${Math.round((estado.job.enviadas / estado.job.fotos) * 100)}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      )}

      {(estado.fase === "conectado_sem_export" ||
        estado.fase === "enviando" ||
        estado.fase === "pronto" ||
        estado.fase === "parcial") && (
        <p className="tipo-caption m-0 mt-4 text-ink-3">
          Conectado como {estado.conexao.email ?? "sua conta Google"}.{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => void desconectar()}
            className="cursor-pointer border-none bg-transparent p-0 text-ink-3 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80"
          >
            Desconectar
          </button>
        </p>
      )}

      {estado.fase === "parcial" && (
        <p role="alert" className="tipo-caption m-0 mt-2 text-critico">
          {estado.job.enviadas} de {estado.job.fotos} enviadas — algumas não subiram. O ZIP acima sempre
          funciona como saída garantida.
        </p>
      )}

      {estado.fase === "quota_insuficiente" && (
        <p role="alert" className="tipo-caption m-0 mt-4 text-critico">
          Seu Drive tem {gigabytes(estado.disponivel)} GB livres; o álbum tem {gigabytes(estado.necessario)}{" "}
          GB. Libere espaço no Drive ou baixe o ZIP acima.
        </p>
      )}

      {estado.fase === "erro" && (
        <p role="alert" className="tipo-caption m-0 mt-4 text-critico">
          Não foi possível concluir agora. Tente de novo.
        </p>
      )}
    </AdminSection>
  );
}
