window.ESPACO = (function () {
  const ESCALA = new Set([0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
  const TOKENS = ['--gutter','--wl-pad','--wl-gap','--wl-hud-x','--wl-hud-y','--ph','--w-page'];
  const PROPS = ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','rowGap','columnGap'];
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
  function run() {
    const root = document.getElementById('root');
    const fora = {};        // valor -> { n, exemplos:[ "prop em seletor" ] }
    const beiradas = [];    // conteudo encostado na borda do container de rota
    const sangria = [];     // margem negativa: sangria deliberada, listada a parte
    const ritmo = {};       // container -> lista de gaps verticais entre irmaos
    root.querySelectorAll('*').forEach((el) => {
      if (!vis(el)) return;
      const cs = getComputedStyle(el);
      const centrado = cs.marginLeft === cs.marginRight && parseFloat(cs.marginLeft) > 0;
      /* valor resolvido de um token declarado (inclusive fluido, tipo clamp no telao) nao e numero a mao */
      const doToken = new Set();
      TOKENS.forEach((t) => { const r = Math.round(parseFloat(cs.getPropertyValue(t))); if (isFinite(r)) doToken.add(r); });
      PROPS.forEach((p) => {
        const v = parseFloat(cs[p]);
        if (!isFinite(v) || v === 0) return;
        if (Math.abs(v - Math.round(v)) > 0.02) return;   // valores derivados de % ou de fonte: outro assunto
        const n = Math.round(v);
        if (ESCALA.has(n) || doToken.has(n)) return;
        if (n < 4 && /padding/.test(p)) return;            // 1-3px de padding e ajuste optico, nao ritmo
        /* margin:auto resolve em pixels e nao e valor autoral; sangria negativa e deliberada.
           Os dois entravam como "fora da escala" e afogavam o sinal real. */
        if (centrado && /^margin(Left|Right)$/.test(p)) return;
        if (n < 0) { sangria.push(p + ' · ' + sel(el) + ' · ' + n + 'px'); return; }
        const k = n + 'px';
        (fora[k] ||= { n: 0, exemplos: [] }).n++;
        if (fora[k].exemplos.length < 6) fora[k].exemplos.push(p + ' · ' + sel(el));
      });
    });
    // ritmo vertical: filhos diretos empilhados de cada container de bloco
    root.querySelectorAll('*').forEach((pai) => {
      if (!vis(pai)) return;
      const cs = getComputedStyle(pai);
      if (cs.display === 'grid' && cs.gridAutoFlow.indexOf('column') >= 0) return;
      if (cs.display === 'flex' && cs.flexDirection.indexOf('row') === 0) return;
      const f = [...pai.children].filter((c) => vis(c) && getComputedStyle(c).position === 'static');
      if (f.length < 3) return;
      const gaps = [];
      for (let i = 1; i < f.length; i++) {
        const a = f[i - 1].getBoundingClientRect(), b = f[i].getBoundingClientRect();
        if (Math.abs(a.left - b.left) > 2) return;         // nao e pilha
        const g = Math.round(b.top - a.bottom);
        if (g < 0 || g > 120) return;
        gaps.push(g);
      }
      const u = [...new Set(gaps)];
      if (u.length > 1 || !ESCALA.has(u[0])) ritmo[sel(pai)] = gaps;
    });
    // conteudo encostando na borda
    const main = root.querySelector('#main, .phone, main') || root;
    const mr = main.getBoundingClientRect();
    root.querySelectorAll('h1,h2,h3,h4,p,ul,ol,.card,.li,.btn').forEach((el) => {
      if (!vis(el)) return; const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.position === 'absolute') return;
      const r = el.getBoundingClientRect();
      const e = Math.min(r.left - mr.left, mr.right - r.right);
      if (e >= 0 && e < 8 && mr.width > 0 && beiradas.length < 8) beiradas.push(sel(el) + ' a ' + Math.round(e) + 'px da borda');
    });
    return { rota: location.hash, vw: innerWidth, fora, ritmo, beiradas, sangria };
  }
  return { run };
})();
