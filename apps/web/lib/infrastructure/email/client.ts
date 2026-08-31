/** Entrega de e-mail via Resend; sem RESEND_API_KEY degrada (job e download continuam) — terceiro fora do crítico. E-mail é PII: nunca logar o endereço. */

export type HostEmail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendHostEmail(mail: HostEmail): Promise<{ enviado: boolean }> {
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
      console.warn("aviso.falhou", { status: res.status });
      return { enviado: false };
    }

    console.log("aviso.enviado", {});
    return { enviado: true };
  } catch (e) {
    console.warn("aviso.falhou", { erro: String(e) });
    return { enviado: false };
  }
}
