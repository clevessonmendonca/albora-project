import { drainAndReport } from "../features/guest/lib/funnel-from-drain";
import { webQueue } from "../lib/queue";
import { webTransport } from "../lib/transport";
import { TAG_DRENAGEM } from "./tag";

/** SW do convidado (scripts/construir-sw.mjs) — drain/fila/transporte são os mesmos da aba (ADR 0010); reescrever seria segunda fonte da verdade. */

declare const __VERSAO_SW__: string;

type EventoComEspera = { waitUntil(promessa: Promise<unknown>): void };
type EventoDeSincronia = EventoComEspera & { tag: string };
type EventoDeBusca = EventoComEspera & {
  request: Request;
  respondWith(resposta: Response | Promise<Response>): void;
};

/** Escopo global do SW não existe em `lib.dom`; trocar para `webworker` quebraria todo o app — declarado aqui só o que este arquivo usa. */
interface EscopoDoServiceWorker {
  readonly location: { readonly origin: string };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(tipo: "install", ouvinte: (evento: EventoComEspera) => void): void;
  addEventListener(tipo: "activate", ouvinte: (evento: EventoComEspera) => void): void;
  addEventListener(tipo: "sync", ouvinte: (evento: EventoDeSincronia) => void): void;
  addEventListener(tipo: "fetch", ouvinte: (evento: EventoDeBusca) => void): void;
}

declare const self: EscopoDoServiceWorker;

const VERSAO = __VERSAO_SW__;
const CASCA = `${VERSAO}-casca`;
const ESTATICO = `${VERSAO}-estatico`;

const PRECACHE = ["/manifest.webmanifest", "/favicon.svg", "/icone-app-512.svg"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CASCA);

      // Item a item, engolindo falha — com `addAll`, um único 404 aborta o install inteiro e o convidado fica sem SW (sem Background Sync, sem abertura offline); o casco vale mais que o ícone.
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)));

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      for (const chave of await caches.keys()) {
        if (!chave.startsWith(VERSAO)) await caches.delete(chave);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Chunks do Next são versionados no nome: cache primeiro nunca serve velho.
  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(cachePrimeiro(requisicao, ESTATICO));
    return;
  }

  if (requisicao.mode === "navigate") {
    evento.respondWith(redePrimeiro(requisicao));
    return;
  }

  // Achado do spike: sem este ramo, `<script src>` caía na rede e offline a página renderizava com o script faltando — só o que foi precacheado de propósito entra em cache primeiro.
  if (PRECACHE.includes(url.pathname)) {
    evento.respondWith(cachePrimeiro(requisicao, CASCA));
    return;
  }

  evento.respondWith(redePrimeiro(requisicao));
});

self.addEventListener("sync", (evento) => {
  if (evento.tag !== TAG_DRENAGEM) return;

  // `online: () => true` não é otimismo — `sync` só dispara com conectividade restabelecida, e `navigator.onLine` no SW responde por contexto que pode ter acordado agora; consultá-lo cancelaria a drenagem na hora certa.
  evento.waitUntil(drainAndReport(webQueue, webTransport, { online: () => true }));
});

async function cachePrimeiro(requisicao: Request, nomeDoCache: string): Promise<Response> {
  // Escopado ao cache pedido — sem `cacheName` a busca varre todos os caches da origem, uma entrada da casca respondia a busca do estático, e a limpeza por prefixo do `activate` deixava de valer como garantia.
  const guardado = await caches.match(requisicao, { cacheName: nomeDoCache });
  if (guardado) return guardado;

  const resposta = await fetch(requisicao);
  guardar(nomeDoCache, requisicao, resposta);
  return resposta;
}

async function redePrimeiro(requisicao: Request): Promise<Response> {
  try {
    const resposta = await fetch(requisicao);
    guardar(CASCA, requisicao, resposta);
    return resposta;
  } catch (e) {
    const guardado = await caches.match(requisicao);
    if (guardado) return guardado;
    throw e;
  }
}

/** Guarda sem aguardar: `cache.put` só resolve quando o corpo inteiro chegou — aguardá-lo atrasaria a navegação pelo tempo do download. */
function guardar(nomeDoCache: string, requisicao: Request, resposta: Response): void {
  if (!resposta.ok || resposta.type !== "basic") return;

  const copia = resposta.clone();
  void caches
    .open(nomeDoCache)
    .then((cache) => cache.put(requisicao, copia))
    .catch(() => undefined);
}
