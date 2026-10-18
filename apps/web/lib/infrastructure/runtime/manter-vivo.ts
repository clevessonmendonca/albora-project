import { after } from "next/server";

/** No Worker, trabalho solto depois da resposta é cancelado; `after` o registra no waitUntil do request. */
export function manterVivo<T>(trabalho: Promise<T>): Promise<T> {
  try {
    after(trabalho);
  } catch {
    // fora de um request (testes, scripts) o processo segue vivo e a promessa termina sozinha
  }
  return trabalho;
}
