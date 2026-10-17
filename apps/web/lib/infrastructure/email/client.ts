/** Entrega de e-mail via Resend; sem RESEND_API_KEY degrada (job e download continuam) — terceiro fora do crítico. E-mail é PII: nunca logar o endereço. */

import { manterVivo } from "../runtime/manter-vivo";

export type HostEmail = {
  to: string;
  subject: string;
  text: string;
};

function mascararEmails(texto: string): string {
  return texto.replace(/[^\s@<>()"']+@[^\s@<>()"']+/g, "[e-mail]");
}

async function enviarEmail(mail: HostEmail): Promise<{ enviado: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!key) {
    console.log("aviso.omitido", { motivo: "sem_resend" });
    return { enviado: false };
  }

  const from = process.env.RESEND_FROM?.trim() || "Albora <noreply@albora.app>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
    });

    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { name?: unknown; message?: unknown } | null;
      console.warn("aviso.falhou", {
        status: res.status,
        motivo: typeof corpo?.name === "string" ? corpo.name : undefined,
        detalhe: typeof corpo?.message === "string" ? mascararEmails(corpo.message).slice(0, 200) : undefined,
      });
      return { enviado: false };
    }

    console.log("aviso.enviado", {});
    return { enviado: true };
  } catch (e) {
    console.warn("aviso.falhou", { erro: String(e) });
    return { enviado: false };
  }
}

export function sendHostEmail(mail: HostEmail): Promise<{ enviado: boolean }> {
  return manterVivo(enviarEmail(mail));
}
