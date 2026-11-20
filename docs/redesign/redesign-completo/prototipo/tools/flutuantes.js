/* Auditor de camadas flutuantes. window.FLUT.run() na rota aberta.
   Invariante: ao abrir uma camada nova, nenhuma camada flutuante anterior continua no DOM,
   e fechar uma camada nao pode deixar listener registrado. */
(() => {
  const SEL = '.menu,.ds-sel-pop,.gx-tray';
  const TODAS = '.menu,.ds-sel-pop,.gx-tray,.modal,.palette,.scrim';
  const esp = (ms) => new Promise((r) => setTimeout(r, ms));
  const conta = () => ({
    flut: document.querySelectorAll(SEL).length,
    modal: document.querySelectorAll('.modal').length,
    palette: document.querySelectorAll('.palette').length,
    scrim: document.querySelectorAll('.scrim').length,
  });
  const limpa = () => document.querySelectorAll(TODAS).forEach((x) => x.remove());

  const gatilhos = () => ({
    menu: [...document.querySelectorAll('[aria-haspopup="menu"],[aria-haspopup="true"]')].filter((b) => b.offsetParent !== null)[0],
    select: [...document.querySelectorAll('.ds-sel-t:not(:disabled)')].filter((b) => b.offsetParent !== null)[0],
  });

  const contaListeners = () => {
    const n = { scroll: 0, resize: 0, doc: 0 };
    const oA = EventTarget.prototype.addEventListener;
    const oR = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (t, f, o) {
      if (this === window && (t === 'scroll' || t === 'resize')) n[t]++;
      if (this === document && (t === 'mousedown' || t === 'keydown')) n.doc++;
      return oA.call(this, t, f, o);
    };
    EventTarget.prototype.removeEventListener = function (t, f, o) {
      if (this === window && (t === 'scroll' || t === 'resize')) n[t]--;
      if (this === document && (t === 'mousedown' || t === 'keydown')) n.doc--;
      return oR.call(this, t, f, o);
    };
    return { n, para: () => { EventTarget.prototype.addEventListener = oA; EventTarget.prototype.removeEventListener = oR; return { ...n }; } };
  };

  const camadas = () => [...document.querySelectorAll(TODAS)].map((e) => ({
    cls: e.className.split(' ')[0], z: +getComputedStyle(e).zIndex || 0,
  }));

  async function run() {
    const falhas = [];
    const g = gatilhos();
    const nota = (caso, detalhe) => falhas.push({ caso, ...detalhe });

    /* --- 1. abrir camada sobre camada: a anterior precisa sumir --- */
    const pares = [
      ['menu', 'modal', async () => { g.menu && g.menu.click(); }, async () => { A.modal({ title: 'audit', body: '' }); }],
      ['menu', 'palette', async () => { g.menu && g.menu.click(); }, async () => { A.openPalette(); }],
      ['select', 'modal', async () => { g.select && g.select.click(); }, async () => { A.modal({ title: 'audit', body: '' }); }],
      ['select', 'palette', async () => { g.select && g.select.click(); }, async () => { A.openPalette(); }],
    ];
    for (const [a, b, abreA, abreB] of pares) {
      if (!g[a]) continue;
      limpa(); await esp(60);
      await abreA(); await esp(180);
      if (!conta().flut) continue; /* gatilho nao abriu flutuante nesta rota */
      await abreB(); await esp(200);
      const c = conta();
      if (c.flut) nota('camada orfa', { abriu: a, depoisDe: b, flutuantesRestantes: c.flut });
      limpa(); await esp(60);
    }

    /* --- 2. z-index: flutuante nunca acima de modal aberto --- */
    if (g.menu) {
      limpa(); await esp(60); g.menu.click(); await esp(160);
      if (conta().flut) {
        A.modal({ title: 'audit', body: '' }); await esp(180);
        const f = document.querySelector(SEL), m = document.querySelector('.modal');
        if (f && m) {
          const zf = +getComputedStyle(f).zIndex || 0, zm = +getComputedStyle(m).zIndex || 0;
          if (zf > zm) nota('flutuante acima do modal', { zFlutuante: zf, zModal: zm });
          const r = f.getBoundingClientRect();
          const alvo = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + 8));
          if (alvo && alvo.closest(SEL)) nota('flutuante clicavel sobre modal', { elemento: alvo.tagName.toLowerCase() });
        }
      }
      limpa(); await esp(60);
    }

    /* --- 3. troca repetida de camada: sem vazamento de listener --- */
    if (g.menu) {
      limpa(); await esp(80);
      const med = contaListeners();
      for (let i = 0; i < 10; i++) { g.menu.click(); await esp(40); }
      await esp(200);
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await esp(120);
      const fim = med.para();
      if (fim.scroll || fim.resize || fim.doc) nota('vazamento de listener', { ciclos: 10, ...fim });
      limpa();
    }

    /* --- 4. troca de rota nao deixa orfao --- */
    const hAntes = location.hash;
    if (g.menu) {
      limpa(); await esp(60); g.menu.click(); await esp(160);
      const tinha = conta().flut;
      const outra = hAntes === '#/h' ? '#/h/plano' : '#/h';   /* navegar para a propria rota nao dispara troca */
      location.hash = outra; await esp(450);
      if (tinha && conta().flut) nota('orfao na troca de rota', { flutuantesRestantes: conta().flut });
      location.hash = hAntes; await esp(400);
    }

    limpa();
    return { rota: location.hash, vw: innerWidth, camadas: camadas(), falhas };
  }

  window.FLUT = { run };
})();
