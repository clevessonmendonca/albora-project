import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { decode as jpegDecode } from "jpeg-js";
import type { Composicao } from "@albora/core";
import { apiOrigin, cookieHeader, type GuestSession } from "./session";
import { signMediaUrls } from "./sign-urls";
import {
  chaveParaMoldura,
  composeShareFrame,
  parseShareContext,
  type ShareContext,
} from "./share-compose";
import type { FramePalette } from "./share-frame-palette";

export type { ShareContext } from "./share-compose";
export { parseShareContext, composeShareFrame, chaveParaMoldura } from "./share-compose";

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
    const body: unknown = await res.json();
    return parseShareContext(body);
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

function medirJpeg(bytes: Uint8Array): { largura: number; altura: number } {
  const decoded = jpegDecode(bytes, { useTArray: true });
  return { largura: decoded.width, altura: decoded.height };
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export type RenderShareFrameFn = (opts: {
  bytes: Uint8Array;
  composicao: Composicao;
  paleta: FramePalette;
}) => Promise<Uint8Array>;

/**
 * Compartilha a foto própria com moldura Skia 9:16 quando possível.
 * Se a composição/render falhar, cai no arquivo raw (nunca bloqueia o share).
 */
export async function compartilharFotoPropria(opts: {
  session: GuestSession;
  uploadId: string;
  chaveFull?: string;
  fetchFn?: typeof fetch;
  /** Injetável nos testes — em produção usa `renderShareFrame` do Skia. */
  renderFrame?: RenderShareFrameFn;
  measureImage?: (bytes: Uint8Array) => { largura: number; altura: number };
  downloadAsync?: typeof FileSystem.downloadAsync;
  readBase64?: (uri: string) => Promise<string>;
  writeBase64?: (uri: string, b64: string) => Promise<void>;
  shareAsync?: typeof Sharing.shareAsync;
  isAvailableAsync?: typeof Sharing.isAvailableAsync;
}): Promise<{ ok: true; moldura: boolean } | { ok: false; erro: string }> {
  const fetchFn = opts.fetchFn ?? fetch;
  const downloadAsync = opts.downloadAsync ?? FileSystem.downloadAsync;
  const shareAsync = opts.shareAsync ?? Sharing.shareAsync;
  const isAvailableAsync = opts.isAvailableAsync ?? Sharing.isAvailableAsync;
  const measureImage = opts.measureImage ?? medirJpeg;
  const readBase64 =
    opts.readBase64 ??
    (async (uri: string) =>
      FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }));
  const writeBase64 =
    opts.writeBase64 ??
    (async (uri: string, b64: string) => {
      await FileSystem.writeAsStringAsync(uri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    });

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
    ctx.sessao.consentimentoExterno = {
      versao: "externo-v1",
      em: new Date().toISOString(),
      revogadoEm: null,
      nomeNaMoldura: true,
    };
  }

  const chave = opts.chaveFull ?? chaveParaMoldura(ctx);
  const urls = await signMediaUrls(opts.session, [chave], fetchFn);
  const url = urls.find((u) => u.chave === chave)?.url ?? urls[0]?.url;
  if (!url) return { ok: false, erro: "Foto indisponível para compartilhar." };

  const available = await isAvailableAsync();
  if (!available) return { ok: false, erro: "Compartilhar não está disponível neste aparelho." };

  const cache = FileSystem.cacheDirectory ?? "";
  const rawDest = `${cache}albora-share-raw-${opts.uploadId}.jpg`;
  const framedDest = `${cache}albora-share-${opts.uploadId}.jpg`;

  try {
    const dl = await downloadAsync(url, rawDest);
    let shareUri = dl.uri;
    let moldura = false;

    try {
      const b64 = await readBase64(dl.uri);
      const bytes = decodeBase64(b64);
      const dim = measureImage(bytes);
      const composed = composeShareFrame({
        ctx,
        session: opts.session,
        largura: dim.largura,
        altura: dim.altura,
      });

      if (composed.ok) {
        const render =
          opts.renderFrame ??
          (await import("./share-skia-frame")).renderShareFrame;
        const framed = await render({
          bytes,
          composicao: composed.composicao,
          paleta: composed.paleta,
        });
        await writeBase64(framedDest, encodeBase64(framed));
        shareUri = framedDest;
        moldura = true;
      }
    } catch {
      // fallback: arquivo raw
      moldura = false;
      shareUri = dl.uri;
    }

    await shareAsync(shareUri, {
      mimeType: "image/jpeg",
      dialogTitle: "Compartilhar foto da festa",
    });
    return { ok: true, moldura };
  } catch {
    return { ok: false, erro: "Não deu para compartilhar agora." };
  }
}
