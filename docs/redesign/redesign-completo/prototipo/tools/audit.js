/* Auditoria determinística de tela renderizada (rodar no navegador): window.AUDIT.run() → resumo da rota atual.
   Mede: overflow horizontal, elementos fora da viewport, alvos de toque < 44/24 px, contraste real de texto (WCAG 1.4.3), texto cortado por overflow.
   Limite honesto: texto sobre imagem/gradiente e pseudo-elementos não são avaliados (reportados como "indeterminado"). */
(function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const toRGBA = (str) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = str; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => { const a = f[3]; return [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a)).concat(1); };
  const L = (c) => { const [r, g, b] = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { // compõe fundos de baixo para cima; devolve null se achar imagem/gradiente no caminho
    const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e);
    let base = toRGBA(getComputedStyle(document.documentElement).backgroundColor); if (base[3] === 0) base = [255, 255, 255, 1];
    let img = false; for (const e of chain.reverse()) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') img = true; const c = toRGBA(cs.backgroundColor); if (c[3] > 0) base = over(c, base); }
    return { color: base, img };
  };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.'); const t = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 28); return s + (t ? ` “${t}”` : ''); };
  function run(opts = {}) {
    const root = document.getElementById('root'); const vw = innerWidth; const res = { route: location.hash, vw, overflowX: false, offenders: [], smallTargets: [], tinyTargets: [], contrast: [], indeterminate: 0, overflowChild: [], clipped: [], textMin: 99 };
    res.overflowX = document.documentElement.scrollWidth > vw + 1;
    root.querySelectorAll('*').forEach((el) => {
      if (!vis(el) || el.classList.contains('skip')) return; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (res.overflowX && (r.right > vw + 1 || r.left < -1) && !el.closest('[data-scroll],.table-wrap,.tabs,.chips') && cs.position !== 'fixed' && res.offenders.length < 8) res.offenders.push(sel(el) + ` [${Math.round(r.left)}→${Math.round(r.right)}]`);
      // alvos de toque
      if (el.matches('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch],summary')) {
        if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label')) return; // alvo é o label
        const hit = (() => { const b = getComputedStyle(el, '::before'); const exp = b.content !== 'none' && b.position === 'absolute' ? Math.abs(parseFloat(b.top) || 0) + Math.abs(parseFloat(b.bottom) || 0) : 0; return { w: r.width, h: r.height + exp }; })();
        const inline = cs.display === 'inline' && el.tagName === 'A' && el.closest('p,li,.t-small,span,div');
        if (!inline && (hit.w < 44 || hit.h < 44) && opts.touch !== false) { (hit.w < 24 || hit.h < 24 ? res.tinyTargets : res.smallTargets).push(sel(el) + ` ${Math.round(hit.w)}×${Math.round(hit.h)}`); }
      }
      // contraste: só elementos com texto direto
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (own) {
        const fs = parseFloat(cs.fontSize); res.textMin = Math.min(res.textMin, fs);
        const bg = bgOf(el); if (bg.img) { res.indeterminate++; }
        else { const fg = over(toRGBA(cs.color), bg.color); const rt = ratio(fg, bg.color); const large = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700); const need = large ? 3 : 4.5; if (rt < need) res.contrast.push(`${rt.toFixed(2)}<${need} ${sel(el)} (${fs}px)`); }
        if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && !el.title && !el.getAttribute('aria-label')) res.clipped.push(sel(el));
      }
    });
    root.querySelectorAll('*').forEach((el) => { if (!vis(el)) return; const cs = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && el.clientWidth > 0 && !/^(svg|path|img|input|select|textarea)$/i.test(el.tagName) && el.closest('#root') && res.overflowChild.length < 6) res.overflowChild.push(sel(el) + ` ${el.scrollWidth}>${el.clientWidth}`); });
    res.summary = { overflowX: res.overflowX, small: res.smallTargets.length, tiny: res.tinyTargets.length, lowContrast: res.contrast.length, indeterminate: res.indeterminate, clipped: res.clipped.length, overflowChild: res.overflowChild.length, textMin: res.textMin };
    return res;
  }
  window.AUDIT = { run, contrast: ratio, bgOf };
})();
