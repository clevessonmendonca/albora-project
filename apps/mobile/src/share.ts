import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiOrigin, cookieHeader, type GuestSession } from "./session";
import { signMediaUrls } from "./sign-urls";

export type ShareContext = {
  chaveFull: string;
  mime: string;
  evento: {
    compartilhamentoExternoLiberado: boolean;
    panico: boolean;
  };
  sessao: {
    consentimentoExterno: { versao: string } | null;
  };
  midia: { removida: boolean };
};

export async function fetchShareContext(
  session: GuestSession,
  uploadId: string,
  fetchFn: typeof fetch = fetch,
): Promise<ShareContext | null> {
  try {
    const res = await fetchFn(`${apiOrigin()}/api/share?uploadId=${encodeURIComponent(uploadId)}`, {
      headers: { cookie: cookieHeader(session.token) },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ShareContext;
    if (typeof body.chaveFull !== "string") return null;
    return body;
  } catch {
    return null;
  }
}

export async function registrarConsentimentoExterno(
  session: GuestSession,
  nomeNaMoldura: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchFn(`${apiOrigin()}/api/share`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(session.token),
      },
      body: JSON.stringify({ nomeNaMoldura }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fatia mínima: baixa a full assinada e abre a folha nativa.
 * Moldura Skia completa fica para a próxima leva — aqui o convidado já
 * compartilha o arquivo (não o link), com consentimento externo quando preciso.
 */
export async function compartilharFotoPropria(opts: {
  session: GuestSession;
  uploadId: string;
  chaveFull?: string;
  fetchFn?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const fetchFn = opts.fetchFn ?? fetch;
  const ctx = await fetchShareContext(opts.session, opts.uploadId, fetchFn);
  if (!ctx) return { ok: false, erro: "Não deu para preparar o compartilhamento." };
  if (ctx.evento.panico || ctx.midia.removida) {
    return { ok: false, erro: "Essa foto não pode ser compartilhada agora." };
  }
  if (!ctx.evento.compartilhamentoExternoLiberado) {
    return { ok: false, erro: "Compartilhamento externo ainda não foi liberado." };
  }

  if (!ctx.sessao.consentimentoExterno) {
    const ok = await registrarConsentimentoExterno(opts.session, true, fetchFn);
    if (!ok) return { ok: false, erro: "Confirme o consentimento e tente de novo." };
  }

  const chave = opts.chaveFull ?? ctx.chaveFull;
  const urls = await signMediaUrls(opts.session, [chave], fetchFn);
  const url = urls.find((u) => u.chave === chave)?.url ?? urls[0]?.url;
  if (!url) return { ok: false, erro: "Foto indisponível para compartilhar." };

  const available = await Sharing.isAvailableAsync();
  if (!available) return { ok: false, erro: "Compartilhar não está disponível neste aparelho." };

  const dest = `${FileSystem.cacheDirectory ?? ""}albora-share-${opts.uploadId}.jpg`;
  try {
    const dl = await FileSystem.downloadAsync(url, dest);
    await Sharing.shareAsync(dl.uri, {
      mimeType: ctx.mime.startsWith("video/") ? ctx.mime : "image/jpeg",
      dialogTitle: "Compartilhar foto da festa",
    });
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não deu para compartilhar agora." };
  }
}
