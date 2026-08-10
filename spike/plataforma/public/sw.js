/* eslint-disable no-restricted-globals */
/**
 * Service Worker do spike — prova 1, 2 e 8 da task 001.
 *
 * Servido como asset estático de /public, fora do pipeline de render do Next.
 * É o que garante escopo "/" e o que a task 001 §Riscos previa como plano B
 * caso o OpenNext não servisse o SW no escopo certo. Aqui já nasce assim.
 */

importScripts("/fila-idb.js");

var VERSAO = "spike-v2";
var CASCA = VERSAO + "-casca";
var ESTATICO = VERSAO + "-estatico";

var PRECACHE = ["/spike", "/fila-idb.js", "/manifest.webmanifest", "/icone.svg"];

self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(CASCA).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.map(function (c) {
        if (c.indexOf(VERSAO) !== 0) return caches.delete(c);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function ehEstaticoDoNext(url) {
  return url.pathname.indexOf("/_next/static/") === 0;
}

self.addEventListener("fetch", function (evento) {
  var req = evento.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;

  // Chunks do Next são versionados no nome — cache primeiro é seguro
  // e é o que faz a prova 2 (recarregar offline) funcionar de verdade.
  if (ehEstaticoDoNext(url)) {
    evento.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.ok) {
            var copia = res.clone();
            caches.open(ESTATICO).then(function (c) { c.put(req, copia); });
          }
          return res;
        });
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req).then(function (res) {
        var copia = res.clone();
        caches.open(CASCA).then(function (c) { c.put(req, copia); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("/spike");
        });
      })
    );
    return;
  }

  // Achado do spike: sem este ramo, /fila-idb.js era precacheado e nunca lido.
  // Um <script src> não é `navigate` nem mora em /_next/static/, então caía
  // direto na rede — e offline a fila simplesmente não existia. A página abria
  // e o convidado não conseguia enfileirar nada, que é o pior modo de falha
  // possível: parece funcionando.
  evento.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copia = res.clone();
          caches.open(CASCA).then(function (c) { c.put(req, copia); });
        }
        return res;
      });
    })
  );
});

/* ── Background Sync — prova 8 ─────────────────────────────────
   Ausente no Safari do iOS por decisão da Apple. A task 001 já
   registra isso como esperado: não reprova, define se o app
   instalado tem vantagem honesta a comunicar.                    */

self.addEventListener("sync", function (evento) {
  if (evento.tag === "albora-fila") {
    evento.waitUntil(drenarFila("sync"));
  }
});

self.addEventListener("message", function (evento) {
  if (evento.data && evento.data.tipo === "drenar") {
    evento.waitUntil(drenarFila("mensagem"));
  }
});

function avisar(payload) {
  return self.clients.matchAll({ includeUncontrolled: true }).then(function (cs) {
    cs.forEach(function (c) { c.postMessage(payload); });
  });
}

function drenarFila(origem) {
  return self.FilaIDB.listar().then(function (itens) {
    if (!itens.length) return avisar({ tipo: "drenagem", origem: origem, enviados: 0, restantes: 0 });

    return itens.reduce(function (cadeia, item) {
      return cadeia.then(function (enviados) {
        return subir(item).then(function () {
          return self.FilaIDB.remover(item.id).then(function () { return enviados + 1; });
        }).catch(function () {
          return self.FilaIDB.marcarTentativa(item.id).then(function () { return enviados; });
        });
      });
    }, Promise.resolve(0)).then(function (enviados) {
      return self.FilaIDB.listar().then(function (resto) {
        return avisar({
          tipo: "drenagem",
          origem: origem,
          enviados: enviados,
          restantes: resto.length,
        });
      });
    });
  });
}

function subir(item) {
  return fetch("/api/spike/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tipo: item.blob.type || "application/octet-stream" }),
  }).then(function (res) {
    if (!res.ok) throw new Error("presign " + res.status);
    return res.json();
  }).then(function (p) {
    return fetch(p.full, {
      method: "PUT",
      body: item.blob,
      headers: { "content-type": item.blob.type || "application/octet-stream" },
    });
  }).then(function (res) {
    if (!res.ok) throw new Error("PUT " + res.status);
  });
}
