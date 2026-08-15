import { drain } from "@albora/core";
import { webQueue } from "../lib/queue";
import { webTransport } from "../lib/transport";
import { TAG_DRENAGEM } from "./tag";

/**
 * O Service Worker do convidado. Compilado por `scripts/construir-sw.mjs`.
 *
 * A sequência presign → PUT → confirm **não** é reescrita aqui: `drain`, a
 * fila e o transporte são exatamente os que a aba usa (ADR 0010). Escrever o
 * laço de novo em JS solto seria uma segunda fonte da verdade, e o sintoma da
 * divergência seria foto que sobe com a aba aberta e some com a aba fechada —
 * que é justamente o caso que a N6.2 existe para cobrir.
 */

declare const __VERSAO_SW__: string;

type EventoComEspera = { waitUntil(promessa: Promise<unknown>): void };
type EventoDeSincronia = EventoComEspera & { tag: string };
type EventoDeBusca = EventoComEspera & {
  request: Request;
  respondWith(resposta: Response | Promise<Response>): void;
};

/**
 * O escopo global do Service Worker não existe em `lib.dom`, e trocar a lib do
 * app inteiro para `webworker` quebraria todo o resto de `apps/web`. Declarado
 * aqui só a superfície que este arquivo usa.
 */
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

      // Item a item, engolindo falha: com `addAll`, um único 404 aborta o
      // install inteiro e o convidado fica sem SW — sem Background Sync e sem
      // abertura offline. O casco vale mais que o ícone.
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

  // Achado do spike: sem este ramo, um arquivo precacheado nunca era lido. Um
  // `<script src>` não é `navigate` nem mora em `/_next/static/`, então caía
  // direto na rede — e offline a página renderizava inteira com o script
  // faltando. Falha silenciosa: parece funcionando.
  //
  // Só o que foi precacheado de propósito entra em cache primeiro. A versão
  // anterior aplicava a regra a **tudo** que não fosse estático nem navegação,
  // e aí a carga RSC entrava junto: ela é acoplada ao build, então servir a
  // guardada contra chunk novo derruba a página inteira com "Application
  // error" — e derruba para quem já visitou, que é justamente o convidado que
  // volta no meio da festa.
  if (PRECACHE.includes(url.pathname)) {
    evento.respondWith(cachePrimeiro(requisicao, CASCA));
    return;
  }

  evento.respondWith(redePrimeiro(requisicao));
});

self.addEventListener("sync", (evento) => {
  if (evento.tag !== TAG_DRENAGEM) return;

  // `online: () => true` não é otimismo: o evento `sync` só dispara quando o
  // navegador já restabeleceu conectividade, e `navigator.onLine` dentro do SW
  // responde por um contexto que pode ter acordado agora. Consultá-lo aqui
  // cancelaria a drenagem exatamente na hora em que ela deveria acontecer.
  evento.waitUntil(drain(webQueue, webTransport, { online: () => true }));
});

async function cachePrimeiro(requisicao: Request, nomeDoCache: string): Promise<Response> {
  // Escopado ao cache pedido. Sem `cacheName` a busca varre todos os caches da
  // origem, e aí o parâmetro é decorativo: uma entrada da casca respondia a
  // uma busca do estático, e a limpeza por prefixo do `activate` deixava de
  // valer como garantia.
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

/**
 * Guarda uma cópia sem segurar a resposta: `cache.put` só resolve quando o
 * corpo inteiro chegou, e aguardá-lo atrasaria a navegação pelo tempo do
 * download completo.
 */
function guardar(nomeDoCache: string, requisicao: Request, resposta: Response): void {
  if (!resposta.ok || resposta.type !== "basic") return;

  const copia = resposta.clone();
  void caches
    .open(nomeDoCache)
    .then((cache) => cache.put(requisicao, copia))
    .catch(() => undefined);
}
