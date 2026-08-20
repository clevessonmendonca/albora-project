"use client";

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

/**
 * Terceira seção ao lado de `HostExport` (spec drive-export §4) — self-serve,
 * sem download: o resultado é a própria pasta no Drive do casal. Sem
 * downgrade de UX quando falta espaço — o botão de ZIP (`HostExport`)
 * continua sempre visível como saída garantida.
 */
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

  // O e-mail de confirmação de conexão leva de volta pra cá com o token —
  // a navegação para o Google acontece por redirect de servidor
  // (`/drive/connect`), nunca por fetch.
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

  if (estado.fase === "carregando") return null;

  return (
    <AdminSection>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 mt-0 font-titulo text-lg">Exportar para o Google Drive</h2>
          <p className="mb-0 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
            A cópia completa do acervo, direto no Drive do casal — sem prazo pra começar, quando vocês
            quiserem depois da festa.
          </p>
        </div>

        {estado.fase === "desconectado" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void pedirConexao()}
            className={`${adminClasses.secondaryButton} shrink-0 ${busy ? "cursor-wait opacity-60" : ""}`}
          >
            {busy ? "Aguarde…" : "Conectar Google Drive"}
          </button>
        )}

        {(estado.fase === "conectado_sem_export" || estado.fase === "quota_insuficiente") && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportar()}
            className={`${adminClasses.primaryButton} shrink-0 ${busy ? "cursor-wait opacity-60" : ""}`}
          >
            {busy ? "Enviando…" : "Exportar para o Drive"}
          </button>
        )}

        {estado.fase === "parcial" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportar()}
            className={`${adminClasses.secondaryButton} shrink-0 ${busy ? "cursor-wait opacity-60" : ""}`}
          >
            {busy ? "Enviando…" : "Tentar de novo"}
          </button>
        )}

        {estado.fase === "pronto" && estado.job.abrirNoDrive && (
          <a
            href={estado.job.abrirNoDrive}
            target="_blank"
            rel="noreferrer"
            className={`${adminClasses.primaryButton} shrink-0`}
          >
            Abrir no Google Drive
          </a>
        )}
      </div>

      {estado.fase === "indisponivel" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-ink-3">Disponível depois que a festa terminar.</p>
      )}

      {estado.fase === "reauth" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-ink-2">
          Enviamos um link de confirmação. Sem ele a conexão não começa.
          {estado.link && (
            <>
              {" "}
              Em desenvolvimento o link aparece aqui:{" "}
              <button
                type="button"
                className="cursor-pointer border-none bg-transparent p-0 text-acento underline"
                onClick={() => confirmarDev(estado.link!)}
              >
                confirmar agora
              </button>
            </>
          )}
        </p>
      )}

      {estado.fase === "enviando" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-ink-2">
          Enviando {estado.job.enviadas} de {estado.job.fotos}… Pode fechar esta tela — o upload continua em
          segundo plano.
        </p>
      )}

      {(estado.fase === "conectado_sem_export" ||
        estado.fase === "enviando" ||
        estado.fase === "pronto" ||
        estado.fase === "parcial") && (
        <p className="mb-0 mt-4 text-[0.9rem] text-ink-3">
          Conectado como {estado.conexao.email ?? "sua conta Google"}.{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => void desconectar()}
            className="cursor-pointer border-none bg-transparent p-0 text-ink-3 underline"
          >
            Desconectar
          </button>
        </p>
      )}

      {estado.fase === "parcial" && (
        <p className="mb-0 mt-2 text-[0.9rem] text-critico">
          {estado.job.enviadas} de {estado.job.fotos} enviadas — algumas não subiram. O ZIP acima sempre
          funciona como saída garantida.
        </p>
      )}

      {estado.fase === "quota_insuficiente" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-critico">
          Seu Drive tem {gigabytes(estado.disponivel)} GB livres; o álbum tem {gigabytes(estado.necessario)}{" "}
          GB. Libere espaço no Drive ou baixe o ZIP acima.
        </p>
      )}

      {estado.fase === "erro" && (
        <p className="mb-0 mt-4 text-[0.9rem] text-critico">Não foi possível concluir agora. Tente de novo.</p>
      )}
    </AdminSection>
  );
}
