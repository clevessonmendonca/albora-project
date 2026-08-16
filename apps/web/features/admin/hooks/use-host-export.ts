export type JobNaTela = {
  id: string;
  estado: "pronto" | "vazio" | "falhou";
  fotos: number;
  criadoEm: string;
  baixar: string | null;
};

export type EstadoExport =
  | { fase: "idle" }
  | { fase: "reauth"; link: string | null }
  | { fase: "confirmando" }
  | { fase: "pronto"; job: JobNaTela }
  | { fase: "vazio" }
  | { fase: "erro" };

export function estadoInicial(): EstadoExport {
  return { fase: "idle" };
}

export async function pedirConfirmacao(eventoId: string): Promise<
  { ok: true; link: string | null } | { ok: false }
> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/export/reauth`, {
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

export async function abrirJob(
  eventoId: string,
  token: string,
): Promise<{ ok: true; job: JobNaTela } | { ok: false }> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/export`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return { ok: false };
    const corpo = (await res.json()) as { job?: JobNaTela };
    if (!corpo.job) return { ok: false };
    return { ok: true, job: corpo.job };
  } catch {
    return { ok: false };
  }
}

export async function lerJob(eventoId: string): Promise<{ ok: true; job: JobNaTela | null } | { ok: false }> {
  try {
    const res = await fetch(`/api/admin/events/${eventoId}/export`, { credentials: "same-origin" });
    if (!res.ok) return { ok: false };
    const corpo = (await res.json()) as { job?: JobNaTela | null };
    return { ok: true, job: corpo.job ?? null };
  } catch {
    return { ok: false };
  }
}

export function tokenDoLink(link: string): string | null {
  try {
    const url = new URL(link);
    const token = url.searchParams.get("exportar");
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function comReauth(link: string | null): EstadoExport {
  return { fase: "reauth", link };
}

export function comJob(job: JobNaTela): EstadoExport {
  if (job.estado === "vazio") return { fase: "vazio" };
  if (job.estado === "pronto" && job.baixar) return { fase: "pronto", job };
  return { fase: "erro" };
}
