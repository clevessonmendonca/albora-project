/**
 * Fila de upload em IndexedDB — fonte única, sem wrapper.
 *
 * Carregada por dois consumidores com sistemas de módulo incompatíveis:
 * a página (bundle do Next) e o Service Worker (importScripts). Por isso é
 * script clássico anexado ao escopo global, e não um módulo ES.
 *
 * Contrato (task 001 §Contrato):
 *   enfileirar(item) -> Promise<void>
 *   listar()         -> Promise<ItemFila[]>
 *   remover(id)      -> Promise<void>
 *
 * ItemFila = { id: string, blob: Blob, criadoEm: number, tentativas: number }
 * O `id` é uuid do cliente — vira a chave de idempotência da task 004.
 */
(function (escopo) {
  "use strict";

  var BANCO = "albora-fila";
  var VERSAO = 1;
  var LOJA = "pendentes";

  function abrir() {
    return new Promise(function (ok, falha) {
      var req = indexedDB.open(BANCO, VERSAO);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(LOJA)) {
          var loja = db.createObjectStore(LOJA, { keyPath: "id" });
          loja.createIndex("criadoEm", "criadoEm");
        }
      };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { falha(req.error); };
      req.onblocked = function () { falha(new Error("IndexedDB bloqueado por outra aba")); };
    });
  }

  function transacionar(modo, executa) {
    return abrir().then(function (db) {
      return new Promise(function (ok, falha) {
        var tx = db.transaction(LOJA, modo);
        var resultado;
        tx.oncomplete = function () { db.close(); ok(resultado); };
        tx.onerror = function () { db.close(); falha(tx.error); };
        tx.onabort = function () { db.close(); falha(tx.error || new Error("transação abortada")); };
        executa(tx.objectStore(LOJA), function (v) { resultado = v; });
      });
    });
  }

  function enfileirar(item) {
    if (!item || typeof item.id !== "string" || !item.id) {
      return Promise.reject(new Error("item sem id"));
    }
    return transacionar("readwrite", function (loja) {
      loja.put({
        id: item.id,
        blob: item.blob,
        criadoEm: item.criadoEm || Date.now(),
        tentativas: item.tentativas || 0,
      });
    });
  }

  function listar() {
    return transacionar("readonly", function (loja, devolve) {
      var req = loja.index("criadoEm").getAll();
      req.onsuccess = function () { devolve(req.result || []); };
    });
  }

  function remover(id) {
    return transacionar("readwrite", function (loja) {
      loja.delete(id);
    });
  }

  function marcarTentativa(id) {
    return transacionar("readwrite", function (loja) {
      var req = loja.get(id);
      req.onsuccess = function () {
        var item = req.result;
        if (item) {
          item.tentativas = (item.tentativas || 0) + 1;
          loja.put(item);
        }
      };
    });
  }

  function limpar() {
    return transacionar("readwrite", function (loja) { loja.clear(); });
  }

  escopo.FilaIDB = {
    enfileirar: enfileirar,
    listar: listar,
    remover: remover,
    marcarTentativa: marcarTentativa,
    limpar: limpar,
  };
})(typeof self !== "undefined" ? self : this);
