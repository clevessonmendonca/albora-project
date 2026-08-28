import { TAG_DRENAGEM } from "../sw/tag";

/** Registra o SW e pede drenagem em segundo plano (N6.2); nunca lança — caminho da primeira foto continua sem SW, e um erro viraria tela de falha antes de o convidado fazer qualquer coisa. */

type GerenciadorDeSincronia = { register(tag: string): Promise<void> };

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await pedirDrenagemEmSegundoPlano(registro);
  } catch {
    // Navegação privada, política do navegador, origem sem HTTPS. Nada disso
    // impede subir foto pela aba aberta — só tira a drenagem em segundo plano.
  }
}

/** Por capacidade, nunca por user-agent: quem não tem Background Sync não recebe erro; iOS sobe na próxima abertura pelo laço da aba (N6.2). */
async function pedirDrenagemEmSegundoPlano(registro: ServiceWorkerRegistration): Promise<void> {
  if (!("sync" in registro)) return;

  const sincronia = (registro as ServiceWorkerRegistration & { sync: GerenciadorDeSincronia }).sync;
  await sincronia.register(TAG_DRENAGEM);
}
