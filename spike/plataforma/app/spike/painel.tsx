"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ItemFila = { id: string; blob: Blob; criadoEm: number; tentativas: number };

type Fila = {
  enfileirar(item: ItemFila): Promise<void>;
  listar(): Promise<ItemFila[]>;
  remover(id: string): Promise<void>;
  marcarTentativa(id: string): Promise<void>;
  limpar(): Promise<void>;
};

declare global {
  interface Window {
    FilaIDB?: Fila;
  }
}

type Objeto = { chave: string; tamanho: number; quando: string };

const TAMANHO_TESTE = 800 * 1024;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blobDeTeste(bytes: number): Blob {
  const buf = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i += 1) buf[i] = i % 251;
  return new Blob([buf], { type: "application/octet-stream" });
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function Painel() {
  const [sw, setSw] = useState("verificando…");
  const [controlando, setControlando] = useState(false);
  const [online, setOnline] = useState(true);
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [objetos, setObjetos] = useState<Objeto[]>([]);
  const [linhas, setLinhas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const registrar = useCallback((texto: string) => {
    const hora = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setLinhas((prev) => [`${hora}  ${texto}`, ...prev].slice(0, 60));
  }, []);

  const recarregarFila = useCallback(async () => {
    if (!window.FilaIDB) {
      registrar("✗ FilaIDB não carregou — /fila-idb.js não executou");
      return;
    }
    try {
      setItens(await window.FilaIDB.listar());
    } catch (e) {
      registrar(`✗ listar() falhou: ${String(e)}`);
    }
  }, [registrar]);

  /* ── Prova 1: o SW registra, ativa e controla a página ─────── */
  useEffect(() => {
    setOnline(navigator.onLine);
    const sobe = () => setOnline(true);
    const cai = () => setOnline(false);
    window.addEventListener("online", sobe);
    window.addEventListener("offline", cai);

    if (!("serviceWorker" in navigator)) {
      setSw("indisponível neste navegador");
      registrar("✗ serviceWorker ausente em navigator");
      return () => {
        window.removeEventListener("online", sobe);
        window.removeEventListener("offline", cai);
      };
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        registrar(`SW registrado — escopo ${reg.scope}`);
        const pronto = await navigator.serviceWorker.ready;
        const estado = pronto.active?.state ?? "sem active";
        setSw(estado);
        setControlando(Boolean(navigator.serviceWorker.controller));
        registrar(`SW ${estado} · controlando: ${Boolean(navigator.serviceWorker.controller)}`);
      })
      .catch((e) => {
        setSw("falhou");
        registrar(`✗ register() rejeitou: ${String(e)}`);
      });

    const daSW = (ev: MessageEvent) => {
      const d = ev.data;
      if (d?.tipo === "drenagem") {
        registrar(`SW drenou (${d.origem}): ${d.enviados} enviados, ${d.restantes} restantes`);
        void recarregarFila();
        void listarObjetos();
      }
    };
    navigator.serviceWorker.addEventListener("message", daSW);

    const trocouControlador = () => setControlando(Boolean(navigator.serviceWorker.controller));
    navigator.serviceWorker.addEventListener("controllerchange", trocouControlador);

    return () => {
      window.removeEventListener("online", sobe);
      window.removeEventListener("offline", cai);
      navigator.serviceWorker.removeEventListener("message", daSW);
      navigator.serviceWorker.removeEventListener("controllerchange", trocouControlador);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrar]);

  useEffect(() => {
    void recarregarFila();
    void listarObjetos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Provas 3 e 4: a fila sobrevive à aba e ao navegador ───── */
  async function enfileirarTres() {
    if (!window.FilaIDB) return registrar("✗ FilaIDB indisponível");
    for (let i = 0; i < 3; i += 1) {
      await window.FilaIDB.enfileirar({
        id: uuid(),
        blob: blobDeTeste(TAMANHO_TESTE),
        criadoEm: Date.now(),
        tentativas: 0,
      });
    }
    registrar("3 itens de ~800 KB enfileirados");
    await recarregarFila();
  }

  async function limparFila() {
    if (!window.FilaIDB) return;
    await window.FilaIDB.limpar();
    registrar("fila limpa");
    await recarregarFila();
  }

  /* ── Provas 5 e 6: presign + PUT direto, sem passar pelo servidor ── */
  async function subirUm(blob: Blob, rotulo: string) {
    setOcupado(true);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/spike/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: blob.type || "application/octet-stream" }),
      });
      const corpo = await res.json();
      if (!res.ok) {
        registrar(`✗ presign ${res.status} — ${corpo.code}${corpo.details ? ` (${corpo.details.faltando.join(", ")})` : ""}`);
        return;
      }
      registrar(`presign ok — chave derivada no servidor: ${corpo.key}`);

      const put = await fetch(corpo.full, {
        method: "PUT",
        body: blob,
        headers: { "content-type": blob.type || "application/octet-stream" },
      });
      const ms = Math.round(performance.now() - t0);
      if (put.ok) {
        registrar(`✓ PUT ${put.status} — ${rotulo}, ${kb(blob.size)} em ${ms} ms, direto no R2`);
        await listarObjetos();
      } else {
        registrar(`✗ PUT ${put.status} — provável CORS do bucket (task 001 §Riscos)`);
      }
    } catch (e) {
      registrar(`✗ upload falhou: ${String(e)}`);
    } finally {
      setOcupado(false);
    }
  }

  async function listarObjetos() {
    try {
      const res = await fetch("/api/spike/objetos");
      const corpo = await res.json();
      setObjetos(corpo.objetos ?? []);
    } catch {
      setObjetos([]);
    }
  }

  /* ── Prova 8: Background Sync ──────────────────────────────── */
  async function pedirSync() {
    const reg = await navigator.serviceWorker.ready;
    const comSync = reg as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };
    if (!comSync.sync) {
      registrar("✗ Background Sync ausente — esperado no Safari do iOS, não reprova");
      return;
    }
    await comSync.sync.register("albora-fila");
    registrar("sync 'albora-fila' registrado — desligue a rede, feche a aba e religue");
  }

  function drenarAgora() {
    navigator.serviceWorker.controller?.postMessage({ tipo: "drenar" });
    registrar("drenagem pedida ao SW por mensagem");
  }

  const total = itens.reduce((s, i) => s + (i.blob?.size ?? 0), 0);

  return (
    <main>
      <style>{css}</style>

      <header>
        <h1>Spike de plataforma</h1>
        <p>Task 001 · descartável · não vai para produção</p>
        <div className="chips">
          <span className={controlando ? "chip ok" : "chip alerta"}>SW {sw}</span>
          <span className={controlando ? "chip ok" : "chip alerta"}>
            {controlando ? "controlando" : "não controla"}
          </span>
          <span className={online ? "chip ok" : "chip alerta"}>{online ? "online" : "offline"}</span>
        </div>
      </header>

      <section>
        <h2>Provas 1 e 2 — Service Worker</h2>
        <p className="dica">
          Ative, recarregue uma vez com rede, depois desligue a rede e recarregue: a página abre do cache.
        </p>
      </section>

      <section>
        <h2>Provas 3 e 4 — fila em IndexedDB</h2>
        <div className="acoes">
          <button onClick={enfileirarTres} disabled={ocupado}>Enfileirar 3</button>
          <button onClick={recarregarFila}>Listar</button>
          <button onClick={limparFila} className="fraco">Limpar</button>
        </div>
        <p className="numero">
          {itens.length} {itens.length === 1 ? "item" : "itens"} · {kb(total)}
        </p>
        <ul className="fila">
          {itens.map((i) => (
            <li key={i.id}>
              <code>{i.id.slice(0, 8)}</code>
              <span>{kb(i.blob?.size ?? 0)}</span>
              <span>{i.tentativas} tent.</span>
              <button onClick={async () => { await window.FilaIDB?.remover(i.id); await recarregarFila(); }}>
                remover
              </button>
            </li>
          ))}
          {itens.length === 0 && <li className="vazio">fila vazia</li>}
        </ul>
        <p className="dica">
          Feche a aba e reabra — depois encerre o navegador e reabra. Os itens têm de continuar aqui.
        </p>
      </section>

      <section>
        <h2>Provas 5 e 6 — PUT presigned direto no R2</h2>
        <div className="acoes">
          <button onClick={() => subirUm(blobDeTeste(TAMANHO_TESTE), "gerado")} disabled={ocupado}>
            Subir 800 KB
          </button>
          <button onClick={() => arquivoRef.current?.click()} disabled={ocupado}>
            Escolher foto
          </button>
          <button onClick={listarObjetos} className="fraco">Ver bucket</button>
        </div>
        <input
          ref={arquivoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void subirUm(f, f.name);
            e.target.value = "";
          }}
        />
        <ul className="fila">
          {objetos.map((o) => (
            <li key={o.chave}>
              <code>{o.chave.replace(/^events\/spike\//, "…/")}</code>
              <span>{kb(o.tamanho)}</span>
            </li>
          ))}
          {objetos.length === 0 && <li className="vazio">nenhum objeto no bucket</li>}
        </ul>
        <p className="dica">
          A chave vem do servidor. O cliente não a envia — invariante de ADR 0002 e ADR 0004.
        </p>
      </section>

      <section>
        <h2>Prova 8 — Background Sync</h2>
        <div className="acoes">
          <button onClick={pedirSync}>Registrar sync</button>
          <button onClick={drenarAgora} className="fraco">Drenar agora</button>
        </div>
        <p className="dica">
          Enfileire com a rede desligada, registre o sync, saia da tela e religue a rede. Deve subir sozinho.
          Ausente no iOS por decisão da Apple — isso não reprova a tarefa.
        </p>
      </section>

      <section>
        <h2>Registro</h2>
        <pre>{linhas.join("\n") || "—"}</pre>
      </section>
    </main>
  );
}

const css = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #16110D; color: #F2EAE1;
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-text-size-adjust: 100%; }
  main { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.1rem 4rem; }
  header { padding-bottom: 1.25rem; border-bottom: 1px solid rgba(242,234,225,.12); }
  h1 { font-size: 1.35rem; margin: 0 0 .2rem; font-weight: 600; }
  h2 { font-size: .74rem; text-transform: uppercase; letter-spacing: .12em;
    color: rgba(242,234,225,.55); margin: 0 0 .7rem; font-weight: 600; }
  header p { margin: 0; color: rgba(242,234,225,.5); font-size: .84rem; }
  section { padding: 1.4rem 0; border-bottom: 1px solid rgba(242,234,225,.1); }
  .chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .9rem; }
  .chip { font-size: .72rem; padding: .25rem .6rem; border-radius: 999px;
    border: 1px solid rgba(242,234,225,.18); }
  .chip.ok { color: #8FCB9B; border-color: rgba(143,203,155,.4); }
  .chip.alerta { color: #E8873A; border-color: rgba(232,135,58,.4); }
  .acoes { display: flex; flex-wrap: wrap; gap: .5rem; }
  button { font: inherit; font-size: .88rem; padding: .6rem 1rem; border-radius: .55rem;
    border: 1px solid rgba(242,234,225,.2); background: #F2EAE1; color: #16110D;
    cursor: pointer; min-height: 44px; }
  button.fraco { background: transparent; color: #F2EAE1; }
  button:disabled { opacity: .45; cursor: default; }
  .numero { margin: .9rem 0 .5rem; font-variant-numeric: tabular-nums;
    color: rgba(242,234,225,.65); font-size: .85rem; }
  .fila { list-style: none; margin: .8rem 0 0; padding: 0;
    border: 1px solid rgba(242,234,225,.12); border-radius: .6rem; overflow: hidden; }
  .fila li { display: flex; align-items: center; gap: .7rem; padding: .55rem .75rem;
    font-size: .8rem; border-top: 1px solid rgba(242,234,225,.08);
    font-variant-numeric: tabular-nums; }
  .fila li:first-child { border-top: 0; }
  .fila li code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; color: rgba(242,234,225,.85); }
  .fila li span { color: rgba(242,234,225,.5); white-space: nowrap; }
  .fila li button { padding: .2rem .5rem; font-size: .72rem; min-height: 0;
    background: transparent; color: rgba(242,234,225,.6); }
  .fila .vazio { color: rgba(242,234,225,.35); justify-content: center; }
  .dica { margin: .8rem 0 0; font-size: .8rem; color: rgba(242,234,225,.45); }
  pre { margin: 0; padding: .8rem; background: rgba(0,0,0,.35); border-radius: .6rem;
    font-size: .72rem; line-height: 1.65; overflow-x: auto; max-height: 22rem;
    white-space: pre-wrap; word-break: break-word; color: rgba(242,234,225,.8); }
`;
