/**
 * Entrega de e-mail ao anfitrião. Resend já está no template de ambiente
 * para o magic link; o aviso de "baixar tudo" reusa o mesmo canal.
 *
 * Sem `RESEND_API_KEY` o envio degrada: o job e o download autenticado
 * continuam. Falha de e-mail nunca derruba o export — terceiro fora do
 * caminho crítico.
 *
 * 🔴 Nunca logar o endereço. E-mail é PII.
 */

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
