export type JobDriveNaTela = {
  id: string;
  estado: "pronto" | "vazio" | "falhou" | "enviando" | "parcial" | "quota_insuficiente";
  fotos: number;
  enviadas: number;
  bytesTotal: number;
  bytesEnviados: number;
  abrirNoDrive: string | null;
};

export type ConexaoDriveNaTela = {
  status: "conectado" | "expirado" | "revogado";
  email: string | null;
  conectadoEm: string;
};

export type StatusDrive = { conexao: ConexaoDriveNaTela | null; podeExportar: boolean };

export type EstadoDrive =
  | { fase: "carregando" }
  | { fase: "indisponivel" }
  | { fase: "desconectado" }
  | { fase: "reauth"; link: string | null }
  | { fase: "conectado_sem_export"; conexao: ConexaoDriveNaTela }
  | { fase: "enviando"; conexao: ConexaoDriveNaTela; job: JobDriveNaTela }
  | { fase: "pronto"; conexao: ConexaoDriveNaTela; job: JobDriveNaTela }
  | { fase: "parcial"; conexao: ConexaoDriveNaTela; job: JobDriveNaTela }
  | { fase: "quota_insuficiente"; conexao: ConexaoDriveNaTela; necessario: number; disponivel: number }
  | { fase: "erro" };

export function estadoInicialDrive(): EstadoDrive {
  return { fase: "carregando" };
}

export async function lerStatusDrive(
  eventoId: string,
): Promise<{ ok: true; status: StatusDrive } | { ok: false }> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/drive`, { credentials: "same-origin" });
    if (!res.ok) return { ok: false };
    const corpo = (await res.json()) as StatusDrive;
    return { ok: true, status: corpo };
  } catch {
    return { ok: false };
  }
}

export async function lerJobDrive(
  eventoId: string,
): Promise<{ ok: true; job: JobDriveNaTela | null } | { ok: false }> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/export/drive`, { credentials: "same-origin" });
    if (!res.ok) return { ok: false };
    const corpo = (await res.json()) as { job?: JobDriveNaTela | null };
    return { ok: true, job: corpo.job ?? null };
  } catch {
    return { ok: false };
  }
}

export async function pedirReauthDrive(
  eventoId: string,
): Promise<{ ok: true; link: string | null } | { ok: false }> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/drive/reauth`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) return { ok: false };
    const corpo = (await res.json()) as { enviado?: boolean; link?: string };
    return { ok: true, link: typeof corpo.link === "string" ? corpo.link : null };
  } catch {
    return { ok: false };
  }
}

export function tokenDoLinkDrive(link: string): string | null {
  try {
    const url = new URL(link);
    const token = url.searchParams.get("driveConectar");
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function urlDeConectar(eventoId: string, confirmacao: string): string {
  return `/api/admin/events/${eventoId}/drive/connect?confirmacao=${encodeURIComponent(confirmacao)}`;
}

export async function exportarParaDrive(
  eventoId: string,
): Promise<
  | { ok: true; job: JobDriveNaTela }
  | { ok: false; code: "quota_insuficiente"; necessario: number; disponivel: number }
  | { ok: false; code: string }
> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/export/drive`, {
      method: "POST",
      credentials: "same-origin",
    });
    const corpo = (await res.json().catch(() => ({}))) as {
      job?: JobDriveNaTela;
      code?: string;
      details?: { necessario?: number; disponivel?: number };
    };
    if (!res.ok) {
      if (corpo.code === "drive.quota_insuficiente") {
        return {
          ok: false,
          code: "quota_insuficiente",
          necessario: corpo.details?.necessario ?? 0,
          disponivel: corpo.details?.disponivel ?? 0,
        };
      }
      return { ok: false, code: corpo.code ?? "erro" };
    }
    if (!corpo.job) return { ok: false, code: "erro" };
    return { ok: true, job: corpo.job };
  } catch {
    return { ok: false, code: "erro" };
  }
}

export async function desconectarDrive(eventoId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/drive`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function gigabytes(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1);
}
