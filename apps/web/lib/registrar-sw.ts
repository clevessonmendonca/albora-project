import { TAG_DRENAGEM } from "../sw/tag";

/**
 * Registra o Service Worker e pede a drenagem em segundo plano (N6.2).
 *
 * **Nunca lança.** É o passo 2 do §3.1 e roda atrás da tela do QR: o caminho
 * da primeira foto continua inteiro sem Service Worker nenhum, e um erro aqui
 * viraria uma tela de falha antes de o convidado ter feito qualquer coisa.
 */

type GerenciadorDeSincronia = { register(tag: string): Promise<void> };

export async function registrarServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await pedirDrenagemEmSegundoPlano(registro);
  } catch {
    // Navegação privada, política do navegador, origem sem HTTPS. Nada disso
    // impede subir foto pela aba aberta — só tira a drenagem em segundo plano.
  }
}

/**
 * Por capacidade, nunca por user-agent: quem não tem Background Sync não
 * recebe erro, e quem passar a ter ganha o recurso sem trocar esta linha. No
 * iOS a fila sobe na próxima abertura, pelo laço da própria aba (N6.2).
 */
async function pedirDrenagemEmSegundoPlano(registro: ServiceWorkerRegistration): Promise<void> {
  if (!("sync" in registro)) return;

  const sincronia = (registro as ServiceWorkerRegistration & { sync: GerenciadorDeSincronia }).sync;
  await sincronia.register(TAG_DRENAGEM);
}
