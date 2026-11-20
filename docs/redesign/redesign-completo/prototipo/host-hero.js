/* host-hero — hero do Hoje: enquadramento por foco e zoom, composições A–D, véu adaptativo e o editor "Ajustar capa".
   Determinístico e sem dependências. A análise da foto (luminosidade e pele/contraste) só SUGERE: o anfitrião sempre pode trocar. */
(() => {
  const A = window.A; const S = A.store; const E = A.esc;
  const KEY = 'capaCfg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const DEF = () => ({ familia: 'imersivo', comp: 'auto', lado: 'auto', grad: 100, tema: 'auto', sep: false, d: { x: null, y: null, z: 1 }, m: { x: null, y: null, z: 1 } });
  const getCfg = (id) => { const s = S.get(KEY, {})[id] || {}; const o = Object.assign(DEF(), s); o.d = Object.assign({ x: null, y: null, z: 1 }, s.d); o.m = Object.assign({ x: null, y: null, z: 1 }, s.m); return o; };
  const setCfg = (id, cfg) => { const antes = S.get(KEY, {}); S.update(KEY, (m) => Object.assign({}, m, { [id]: cfg }), {}); if (A.store.erro) { S.set(KEY, antes); return false; } return true; };
  const devNow = () => (matchMedia('(min-width:901px)').matches ? 'd' : 'm');

  const perc = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  /* ---------- análise da foto (grade 24x24) ---------- */
  const N = 24; const cache = new Map();
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const analisar = (src) => {
    if (!src) return Promise.resolve(null);
    const k = src.length + '|' + src.slice(-48); if (cache.has(k)) return cache.get(k);
    const p = new Promise((ok) => {
      const im = new Image();
      im.onerror = () => ok(null);
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, N, N);
          const px = x.getImageData(0, 0, N, N).data; const L = new Float32Array(N * N); const skin = new Float32Array(N * N); let sat = 0;
          for (let i = 0; i < N * N; i++) {
            const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
            L[i] = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
            const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
            skin[i] = cb >= 80 && cb <= 125 && cr >= 137 && cr <= 173 && L[i] > 0.04 && L[i] < 0.78 && (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b)) >= 0.2 ? 1 : 0;
            sat += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
          }
          const edge = new Float32Array(N * N);
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = L[j * N + i], r = i < N - 1 ? L[j * N + i + 1] : a, d = j < N - 1 ? L[(j + 1) * N + i] : a; edge[j * N + i] = Math.min(1, (Math.abs(a - r) + Math.abs(a - d)) * 4); }
          const nSkin = skin.reduce((s, v) => s + v, 0);
          const w = new Float32Array(N * N); for (let i = 0; i < N * N; i++) w[i] = nSkin / (N * N) > 0.005 ? skin[i] * 0.75 + edge[i] * 0.25 : edge[i];
          let sw = 0, cx = 0, cy = 0; const subj = new Uint8Array(N * N);
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = w[j * N + i]; if (v > 0.3) { subj[j * N + i] = 1; sw += v; cx += v * (i + 0.5) / N; cy += v * (j + 0.5) / N; } }
          /* rosto = componentes compactos de pele; se o bloco for alto demais (corpo), fica só a parte de cima */
          const vis = new Uint8Array(N * N); let x0 = N, x1 = -1, y0 = N, y1 = -1;
          for (let s0 = 0; s0 < N * N; s0++) {
            if (!skin[s0] || vis[s0]) continue; const q = [s0]; vis[s0] = 1; const cells = [];
            while (q.length) { const c = q.pop(); cells.push(c); const ci = c % N, cj = (c / N) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; const n = nj * N + ni; if (skin[n] && !vis[n]) { vis[n] = 1; q.push(n); } } }
            if (cells.length < 2 || cells.length > 0.22 * N * N) continue;
            if (cells.reduce((t, c) => t + edge[c], 0) / cells.length < 0.12) continue;
            const ys = cells.map((c) => (c / N) | 0); const cy0 = Math.min(...ys), cy1 = Math.max(...ys); const alto = (cy1 - cy0 + 1) / N; const lim = alto > 0.35 ? cy0 + Math.ceil((cy1 - cy0 + 1) * 0.27) : cy1 + 1;
            for (const c of cells) { const ci = c % N, cj = (c / N) | 0; if (cj >= lim) continue; x0 = Math.min(x0, ci); x1 = Math.max(x1, ci + 1); y0 = Math.min(y0, cj); y1 = Math.max(y1, cj + 1); }
          }
          let face = x1 > x0 ? { x0: x0 / N, x1: x1 / N, y0: y0 / N, y1: y1 / N } : null;
          if (face && (face.y1 - face.y0 > 0.5 || face.x1 - face.x0 > 0.7)) face = null; /* grande demais: provavelmente fundo cor de pele, não rosto */
          /* saliência: energia de bordas com viés ao centro; só a leitura de "onde há detalhe" */
          let tw = 0, scx = 0, scy = 0; const col = new Float32Array(N); const wsal = new Float32Array(N * N);
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = (i + 0.5) / N - 0.5, v = (j + 0.5) / N - 0.5; const ww = edge[j * N + i] * Math.exp(-(u * u + v * v) / 0.35); wsal[j * N + i] = ww; tw += ww; scx += ww * (i + 0.5) / N; scy += ww * (j + 0.5) / N; col[i] += ww; }
          let acc = 0, p10 = 0, p90 = 1; for (let i = 0; i < N; i++) { acc += col[i] / (tw || 1); if (acc < 0.1) p10 = (i + 1) / N; if (acc < 0.9) p90 = (i + 2) / N; }
          ok({ ia: im.naturalWidth / im.naturalHeight, L, E: edge, S: skin, subj, cx: tw ? scx / tw : 0.5, cy: tw ? scy / tw : 0.45, spread: [p10, Math.min(1, p90)], sat: sat / (N * N), temPele: nSkin / (N * N) > 0.005, pele: nSkin / (N * N), face });
        } catch { ok(null); }
      };
      im.src = src;
    });
    cache.set(k, p); return p;
  };
  const massa = (a, y0, y1) => { let t = 0, m = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (a.subj[j * N + i]) { t++; const v = (j + 0.5) / N; if (v >= y0 && v < y1) m++; } return t ? m / t : 0; };
  const cobertura = (a) => a.subj.reduce((s, v) => s + v, 0) / (N * N);

  /* sugestão de composição: regras fixas e previsíveis (nunca uma garantia) */
  const sugerir = (a, dev) => {
    if (!a) return { comp: 'A', lado: 'e' };
    if (dev === 'd' && a.ia < 0.9) return { comp: 'D', lado: 'e' };
    if (cobertura(a) > 0.16 || (massa(a, 0.66, 1) > 0.3 && cobertura(a) > 0.08)) return { comp: 'D', lado: 'e' };
    if (dev === 'd' && Math.abs(a.cx - 0.5) > 0.14) return { comp: 'C', lado: a.cx < 0.5 ? 'd' : 'e' };
    return { comp: massa(a, 0.45, 1) < 0.15 ? 'A' : 'B', lado: 'e' };
  };

  /* ---------- enquadramento: cobre o quadro com foco (0..1) e zoom ---------- */
  const retangulo = (pw, ph, ia, z, fx, fy) => { const k = Math.max(pw / ia, ph); const W = k * ia * z, H = k * z; return { W, H, ox: (pw - W) * fx, oy: (ph - H) * fy }; };
  const alvo = (a) => (a.face ? { x: (a.face.x0 + a.face.x1) / 2, y: (a.face.y0 + a.face.y1) / 2 } : { x: a.cx, y: a.cy });
  const focoSugerido = (a, pw, ph, comp, lado, z, yAlvo) => {
    const r0 = retangulo(pw, ph, a.ia, z, 0.5, 0.5); const t = alvo(a);
    const alvoX = comp === 'C' ? (lado === 'e' ? 0.72 : 0.28) : 0.5;
    const fx = r0.W > pw + 1 ? clamp((alvoX * pw - t.x * r0.W) / (pw - r0.W), 0, 1) : 0.5;
    const fy = r0.H > ph + 1 ? clamp(((yAlvo == null ? 0.4 * ph : yAlvo) - t.y * r0.H) / (ph - r0.H), 0, 1) : 0.5;
    return { fx, fy };
  };

  const detalhe = (a, comp, lado, rect, pw, ph, inH) => {
    let sum = 0, n = 0, sk = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = rect.ox + ((i + 0.5) / N) * rect.W, y = rect.oy + ((j + 0.5) / N) * rect.H; if (x < 0 || x > pw || y < 0 || y > ph) continue;
      const dentro = comp === 'C' ? (lado === 'e' ? x <= pw * 0.56 : x >= pw * 0.44) : y >= ph - inH; if (dentro) { sum += a.E[j * N + i]; sk += a.S[j * N + i]; n++; }
    }
    return n ? { d: sum / n, sk: sk / n } : { d: 1, sk: 1 };
  };
  /* ---------- véu adaptativo: mede a região onde o texto fica ---------- */
  const sstep = (x) => { const c = clamp(x, 0, 1); return c * c * c * (c * (c * 6 - 15) + 10); };
  const prof = (t, tp) => (t <= tp ? 1 : 1 - sstep((t - tp) / (1 - tp))); /* patamar atrás do texto e rampa longa em S acima */ /* patamar escuro atrás do texto e esmaecimento suave acima */
  const veu = (a, comp, lado, rect, pw, ph, grad, tema, frac, tp) => {
    const cel = []; // {L, fa}
    if (comp === 'D') { const m = a.L.reduce((s, v) => s + v, 0) / a.L.length; cel.push({ L: m, fa: 1 }); }
    else for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = rect.ox + ((i + 0.5) / N) * rect.W, y = rect.oy + ((j + 0.5) / N) * rect.H; if (x < 0 || x > pw || y < 0 || y > ph) continue;
      const t = comp === 'C' ? (lado === 'e' ? x : pw - x) / (pw * frac) : (ph - y) / (ph * frac);
      if (t >= 0 && t <= tp) cel.push({ L: a.L[j * N + i], fa: 1 });
    }
    const needD = cel.map((c) => (c.L <= 0.1833 ? 0 : (c.L - 0.1833) / (c.L - 0.02)) / c.fa);
    const needL = cel.map((c) => (c.L >= 0.405 ? 0 : (0.405 - c.L) / (1 - c.L)) / c.fa);
    const aD = perc(needD, 0.9), aL = perc(needL, 0.9);
    let escuro = tema === 'escuro'; if (tema === 'auto') escuro = aD > 0.97 && aL < 0.25;
    const base = escuro ? aL : aD; const alfa = clamp(Math.max(base, escuro ? 0.18 : 0.3) * (grad / 100), 0, 0.82);
    const ratios = cel.map((c) => { const af = alfa * c.fa; if (escuro) { const lc = c.L * (1 - af) + af; return (lc + 0.05) / 0.07; } const lc = c.L * (1 - af) + 0.02 * af; return 1.05 / (lc + 0.05); });
    return { alfa, escuro, ratio: ratios.length ? perc(ratios, 0.1) : 21 };
  };
  const gradiente = (comp, lado, alfa, rgb, frac, tp) => {
    const st = []; for (let k = 0; k <= 16; k++) { const t = k / 16; st.push(`rgb(${rgb} / ${(alfa * prof(t, tp)).toFixed(3)}) ${(t * frac * 100).toFixed(1)}%`); }
    const dir = comp === 'C' ? (lado === 'e' ? 'to right' : 'to left') : 'to top';
    return `linear-gradient(${dir},${st.join(',')},rgb(${rgb} / 0) 100%)`;
  };

  /* ---------- montagem: aplica enquadramento, composição e véu a um pôster ---------- */
  const efetivo = (cfg, dev) => (cfg.sep ? cfg[dev] : cfg.d);
  async function aplicar(el, cfg, src) {
    const a = await analisar(src); if (!el.isConnected) return null;
    const dev = el.dataset.dev || devNow(); const pw = el.clientWidth, ph = el.clientHeight; if (!pw || !ph) return null;
    if (el.dataset.fam && el.dataset.fam !== 'imersivo') {
      const box = el.querySelector('.hf-ph'); const bw = box.clientWidth, bh = box.clientHeight; if (!a || !bw || !bh) return null;
      const enq0 = efetivo(cfg, dev); const z0 = clamp(enq0.z || 1, 1, 3); const f1 = focoSugerido(a, bw, bh, 'A', 'e', z0, 0.46 * bh);
      const fx1 = enq0.x == null ? f1.fx : enq0.x / 100, fy1 = enq0.y == null ? f1.fy : enq0.y / 100; const r1 = retangulo(bw, bh, a.ia, z0, fx1, fy1);
      Object.assign(box.querySelector('.hh-img').style, { width: r1.W + 'px', height: r1.H + 'px', left: r1.ox + 'px', top: r1.oy + 'px' });
      el._rect = { ...r1, fx: fx1, fy: fy1, pw: bw, ph: bh }; el.dataset.comp = 'fam'; el.dataset.ratio = ''; el.dataset.tema = 'fam'; return { a, comp: 'fam' };
    }
    const inn = el.querySelector('.hh-in'); const enq = efetivo(cfg, dev); const z = clamp(enq.z || 1, 1, 3);
    /* simula cada composição e fica com a primeira em que o texto não encosta no rosto e o rosto cabe no quadro */
    const testa = (c, lado) => {
      el.dataset.comp = c; el.dataset.lado = lado; const inH = inn ? inn.offsetHeight : ph * 0.4; const t = a ? alvo(a) : { x: 0.5, y: 0.4 };
      if (c === 'D') return { ok: true };
      const yAlvo = c === 'C' ? 0.45 * ph : Math.max(0.1 * ph, (ph - inH - 8) / 2); const f0 = focoSugerido(a, pw, ph, c, lado, z, yAlvo);
      const r = retangulo(pw, ph, a.ia, z, f0.fx, f0.fy); const fc = a.face || { x0: a.cx - 0.08, x1: a.cx + 0.08, y0: a.cy - 0.1, y1: a.cy + 0.1 }; void t;
      const rx0 = r.ox + fc.x0 * r.W, rx1 = r.ox + fc.x1 * r.W, ry0 = r.oy + fc.y0 * r.H, ry1 = r.oy + fc.y1 * r.H;
      const cabe = rx0 >= -1 && rx1 <= pw + 1 && ry0 >= -1 && ry1 <= ph + 1;
      const livre = c === 'C' ? (lado === 'e' ? rx0 >= pw * 0.58 : rx1 <= pw * 0.42) : ry1 <= ph - inH - 4;
      el._log = (el._log || {}); el._log[c + lado] = { cabe, livre, rx0: Math.round(rx0), rx1: Math.round(rx1), ry0: Math.round(ry0), ry1: Math.round(ry1), inH }; return { ok: cabe && livre };
    };
    let comp; let lado = cfg.lado === 'auto' ? (a && alvo(a).x < 0.5 ? 'd' : 'e') : cfg.lado;
    let sugC = 'D';
    if (a) {
      if (a.face) { const ordem = dev === 'd' ? (a.ia < 0.9 ? ['D'] : ['A', 'B', 'C', 'D']) : ['A', 'B', 'D']; sugC = ordem.find((c) => testa(c, lado).ok) || 'D'; }
      else {
        const sc = {}; const sal = { x: a.cx, y: a.cy };
        const meas = (c, l) => { el.dataset.comp = c; el.dataset.lado = l; const inH = inn ? inn.offsetHeight : ph * 0.4; const yA = c === 'C' ? 0.45 * ph : Math.max(0.1 * ph, (ph - inH - 8) / 2); const t0 = { x: a.cx, y: a.cy }; void t0;
          const r0 = retangulo(pw, ph, a.ia, z, 0.5, 0.5); const alvoX = c === 'C' ? (l === 'e' ? 0.72 : 0.28) : 0.5;
          const fx = r0.W > pw + 1 ? clamp((alvoX * pw - sal.x * r0.W) / (pw - r0.W), 0, 1) : 0.5, fy = r0.H > ph + 1 ? clamp((yA - sal.y * r0.H) / (ph - r0.H), 0, 1) : 0.5;
          const r = retangulo(pw, ph, a.ia, z, fx, fy); const o = detalhe(a, c, l, r, pw, ph, inH); const conf = a.pele <= 0.15; return { d: o.d + (conf ? 3 * o.sk : 0), sk: conf ? o.sk : 0, r }; };
        const mA = meas('A', 'e'), mB = meas('B', 'e'); sc.A = mA.d; sc.B = mB.d; sc.skB = +mB.sk.toFixed(3); if (dev === 'd') { sc.Ce = meas('C', 'e').d; sc.Cd = meas('C', 'd').d; }
        const k = Math.max(1 / a.ia, 1); void k; const vis = Math.min(1, pw / (Math.max(pw / a.ia, ph) * a.ia * z)); const larg = a.spread[1] - a.spread[0];
        el._log = { sc, vis: +vis.toFixed(2), larg: +larg.toFixed(2), cx: +a.cx.toFixed(2) };
        const cmin = dev === 'd' ? Math.min(sc.Ce, sc.Cd) : 1;
        if (dev === 'd' && a.ia < 0.9) sugC = 'D';
        else if (vis < 0.5) sugC = 'D';
        else if (mB.sk > 0.1) sugC = 'D';
        else if (sc.A < 0.2) sugC = 'A';
        else if (cmin < 0.22 && cmin < sc.B * 0.8) { sugC = 'C'; lado = sc.Ce <= sc.Cd ? 'e' : 'd'; }
        else sugC = 'B';
      }
    }
    comp = cfg.comp === 'auto' ? sugC : cfg.comp; if (comp === 'C' && dev === 'm') comp = 'B';
    el.dataset.comp = comp; el.dataset.lado = lado; el.dataset.sug = sugC; if (inn) el.style.setProperty('--hh-in-h', inn.offsetHeight + 'px');
    const img = el.querySelector('.hh-img'); let rect = null;
    if (a && comp !== 'D') {
      const inH = inn ? inn.offsetHeight : ph * 0.4; const f0 = focoSugerido(a, pw, ph, comp, lado, z, comp === 'C' ? 0.45 * ph : Math.max(0.1 * ph, (ph - inH - 8) / 2)); const fx = enq.x == null ? f0.fx : enq.x / 100, fy = enq.y == null ? f0.fy : enq.y / 100;
      rect = retangulo(pw, ph, a.ia, z, fx, fy); Object.assign(img.style, { width: rect.W + 'px', height: rect.H + 'px', left: rect.ox + 'px', top: rect.oy + 'px' });
      el._rect = { ...rect, fx, fy, pw, ph };
    }
    if (!a) { el.dataset.veu = 'nao-medido'; return null; }
    const inH2 = inn ? inn.offsetHeight : ph * 0.4; const textFrac = (inH2 + ph * 0.05) / ph; const frac = comp === 'C' ? 0.62 : Math.min(0.98, textFrac + 0.3); const tp = comp === 'C' ? 0.5 : clamp(textFrac / frac, 0.3, 0.9);
    const v = veu(a, comp, lado, rect || { ox: 0, oy: 0, W: pw, H: ph }, pw, ph, cfg.grad, cfg.tema, frac, tp);
    const rgb = v.escuro ? '250 248 246' : '14 12 12';
    el.style.setProperty('--hh-rgb', rgb);
    el.style.setProperty('--hh-grad', comp === 'D' ? `linear-gradient(rgb(${rgb} / ${v.alfa.toFixed(3)}),rgb(${rgb} / ${v.alfa.toFixed(3)}))` : gradiente(comp, lado, v.alfa, rgb, frac, tp));
    if (v.escuro) el.removeAttribute('data-theme'); else el.setAttribute('data-theme', 'noite');
    el.dataset.veu = `${v.alfa.toFixed(2)} (${v.ratio.toFixed(1)}:1)`; el.dataset.ratio = v.ratio.toFixed(2); el.dataset.tema = v.escuro ? 'escuro' : 'claro';
    return { a, comp, lado, v, rect };
  }
  const montar = (root, getCfg2) => {
    A.$$('.hv-poster[data-hh]', root).forEach((el) => {
      const src = el.dataset.src; const run = () => aplicar(el, getCfg2(el), src);
      run(); if (!el._ro && window.ResizeObserver) { let w0 = el.clientWidth; el._ro = new ResizeObserver(() => { if (!el.isConnected) return el._ro.disconnect(); if (Math.abs(el.clientWidth - w0) > 1) { w0 = el.clientWidth; run(); } }); el._ro.observe(el); }
      el._run = run;
    });
  };

  /* ---------- famílias de composição (estilos): layout, moldura e ornamento próprios ---------- */
  const FAMS = [['imersivo', 'Imersivo', 'Foto de ponta a ponta com o texto sobre degradê'], ['romantico', 'Editorial romântico', 'Foto em arco, folhas e tipografia serifada'], ['minimal', 'Minimalismo', 'Foto ampla, muito respiro e linhas finas'], ['classico', 'Clássico elegante', 'Simetria, moldura dupla e monograma']];
  const SPRIG = (c) => `<svg class=\"hf-sp ${c}\" viewBox=\"0 0 60 200\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"><path d=\"M30 198C26 150 34 100 22 4\"/><path d=\"M28 160c-16-4-22-14-22-24 14 2 22 10 22 24z\"/><path d=\"M30 128c14-2 24-10 26-22-14 0-24 8-26 22z\"/><path d=\"M26 96c-14-4-20-14-20-24 12 2 20 10 20 24z\"/><path d=\"M26 66c12-4 20-12 22-22-12 0-20 8-22 22z\"/><path d=\"M22 36c-10-4-14-12-14-20 10 2 14 8 14 20z\"/></svg>`;
  const famHtml = (o) => {
    const { foto, title, kick, place, tail, btn, aria, dev, rot, ini, fam } = o;
    const ph = `<div class="hf-ph"><img class="hh-img" src="${E(foto)}" alt="" aria-hidden="true"></div>`;
    const stage = fam === 'romantico' ? `<div class="hf-stage">${ph}${SPRIG('l')}${SPRIG('r')}</div>` : fam === 'classico' ? `<div class="hf-stage">${ph}<div class="hf-mono" aria-hidden="true"><span>${E(ini || '')}</span></div></div>` : `<div class="hf-stage">${ph}</div>`;
    const divider = fam === 'classico' ? `<div class="hf-div" aria-hidden="true"><i></i><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0l5 5-5 5-5-5z" fill="currentColor"/></svg><i></i></div>` : fam === 'minimal' ? '<hr class="hf-hr">' : '';
    const txt = `<div class="hf-txt"><p class="hv-kick">${E(rot || '')}</p><h1 class="hv-hero-t">${title}</h1>${divider}<p class="hv-date">${A.icon('calendar', 16)}<span>${kick}</span></p><p class="hv-place">${place}</p>${tail}</div>`;
    return `<section class="hv-hero hv-poster hf" data-hh="1" data-fam="${fam}" data-src="${E(foto)}" ${dev ? `data-dev="${dev}"` : ''} data-comp="fam" aria-label="${aria}">${btn}${stage}${txt}</section>${dev ? '' : '<p class="err crit" id="hv-capa-err" role="alert"></p>'}`;
  };
  /* ---------- marcação do pôster ---------- */
  const poster = (o) => {
    if (o.foto && o.fam && o.fam !== 'imersivo') return famHtml(o);
    const { foto, cfg, arc, title, kick, place, tail, btn, aria, dev, mini, rot } = o;
    const dateRow = `<p class="hv-date">${A.icon('calendar', 16)}<span>${kick}</span></p>`; const rotulo = `<p class="hv-kick">${E(rot || '')}</p>`;
    const attrs = foto ? `data-hh="1" data-src="${E(foto)}" ${dev ? `data-dev="${dev}"` : ''} data-comp="A" data-theme="noite"` : '';
    const photo = foto ? `<img class="hh-bg" src="${E(foto)}" alt="" aria-hidden="true"><img class="hh-img" src="${E(foto)}" alt="" aria-hidden="true"><div class="hh-photo"><img src="${E(foto)}" alt="" aria-hidden="true"></div><span class="hh-veil" aria-hidden="true"></span>` : '';
    const orn = `<svg class="hh-orn l" viewBox="0 0 60 200" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M30 198C26 150 34 100 22 4"/><path d="M28 160c-16-4-22-14-22-24 14 2 22 10 22 24z"/><path d="M30 128c14-2 24-10 26-22-14 0-24 8-26 22z"/><path d="M26 96c-14-4-20-14-20-24 12 2 20 10 20 24z"/><path d="M26 66c12-4 20-12 22-22-12 0-20 8-22 22z"/><path d="M22 36c-10-4-14-12-14-20 10 2 14 8 14 20z"/></svg><svg class="hh-orn r" viewBox="0 0 60 200" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M30 198C26 150 34 100 22 4"/><path d="M28 160c-16-4-22-14-22-24 14 2 22 10 22 24z"/><path d="M30 128c14-2 24-10 26-22-14 0-24 8-26 22z"/><path d="M26 96c-14-4-20-14-20-24 12 2 20 10 20 24z"/><path d="M26 66c12-4 20-12 22-22-12 0-20 8-22 22z"/><path d="M22 36c-10-4-14-12-14-20 10 2 14 8 14 20z"/></svg>`;
    const inner = `<div class="hh-in">${foto ? `<div class="hh-arc">${arc}</div>` : ''}${rotulo}<h1 class="hv-hero-t">${title}</h1>${dateRow}<p class="hv-place">${place}</p>${tail}${foto ? orn : ''}</div>`;
    if (!foto) return `<section class="hv-hero hv-poster no-foto" aria-label="${aria}"><div class="hv-poster-top">${arc}${btn}</div><div class="hv-poster-in">${`<p class="hv-kick">${kick}</p><h1 class="hv-hero-t">${title}</h1><p class="hv-place">${place}</p>${tail}`}</div></section><p class="err crit" id="hv-capa-err" role="alert"></p>`;
    return `<section class="hv-hero hv-poster hh has-foto" ${attrs} aria-label="${aria}">${photo}${btn}${inner}</section>${dev ? '' : '<p class="err crit" id="hv-capa-err" role="alert"></p>'}`;
  };

  /* ---------- editor "Ajustar capa" ---------- */
  const COMPS = [['A', 'Editorial', 'Texto centrado na parte de baixo'], ['B', 'Foto em destaque', 'Só uma faixa discreta embaixo'], ['C', 'Lateral', 'Texto no lado livre da foto'], ['D', 'Foto inteira', 'Sem cortes, com fundo desfocado']];
  const mini = (c, src) => `<span class="hh-mini" data-comp="${c}"><img src="${E(src)}" alt="" aria-hidden="true"><i class="m-g"></i><i class="m-n"></i><i class="m-t"></i></span>`;
  function editor(id, ev, onSaved) {
    const orig = ev.capa; const cfg = JSON.parse(JSON.stringify(getCfg(id))); const st = { foto: orig, dev: devNow(), pend: false };
    const body = () => `<div class="hh-ed">
      <div class="hh-ed-stage"><div class="hh-ed-wrap" data-dev="${st.dev}" id="hh-wrap"></div><p class="t-small" id="hh-hint">Arraste a foto para enquadrar.</p></div>
      <div class="hh-ed-side stack">
        <div class="hh-seg" role="group" aria-label="Ver como"><button type="button" class="hh-sb" data-hh="dev" data-v="d" aria-pressed="${st.dev === 'd'}">Computador</button><button type="button" class="hh-sb" data-hh="dev" data-v="m" aria-pressed="${st.dev === 'm'}">Celular</button></div>
        <label class="hh-btn-file btn btn-line btn-sm">${A.icon('image', 16)} Trocar foto<input type="file" accept="image/jpeg,image/png,image/webp" data-hh="file" aria-label="Escolher outra foto"></label>
        <div class="field"><label for="hh-z">Zoom</label><input class="gx-range" id="hh-z" type="range" min="100" max="300" step="5" value="100" data-hh="zoom"></div>
        <div id="hh-fams"></div>
        <div id="hh-comps"></div>
        <div class="field" id="hh-gwrap"><label for="hh-g">Intensidade do degradê <span id="hh-gv"></span></label><input class="gx-range" id="hh-g" type="range" min="40" max="160" step="5" value="${cfg.grad}" data-hh="grad"></div>
        <div class="hh-seg" id="hh-tema" role="group" aria-label="Cor do texto"><button type="button" class="hh-sb" data-hh="tema" data-v="auto">Auto</button><button type="button" class="hh-sb" data-hh="tema" data-v="claro">Texto claro</button><button type="button" class="hh-sb" data-hh="tema" data-v="escuro">Texto escuro</button></div>
        <label class="hh-chk"><input type="checkbox" data-hh="sep" ${cfg.sep ? 'checked' : ''}> Enquadramento próprio para o celular</label>
        <p class="hh-ratio t-small" id="hh-ratio" role="status"></p>
        <p class="err crit" id="hh-err" role="alert"></p>
      </div></div>`;
    const m = A.modal({ title: 'Ajustar capa', body: body(), wide: true, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Salvar', variant: 'btn-primary', onClick: (api) => { const ok = (st.foto === orig || A.evt.setCapa(id, st.foto)) && setCfg(id, cfg); if (!ok) { A.$('#hh-err', api.el).textContent = 'Não consegui guardar neste navegador. Tente uma foto menor.'; return false; } A.toast('Capa atualizada.'); setTimeout(() => (onSaved ? onSaved() : A.render()), 0); } }], onOpen: (el) => start(el) });
    function sugForDev(a) { return sugerir(a, st.dev); }
    function paint(el) {
      const wrap = A.$('#hh-wrap', el); const fake = Object.assign({}, ev, { capa: st.foto }); const tail = '';
      wrap.innerHTML = poster({ foto: st.foto, cfg, arc: ev._arc || '', rot: ev._rot, title: E(ev._nome || ev.nome), kick: ev._kick || '', place: `${A.icon('pin', 16)}<span>${E(ev.local || 'Local a definir')}</span>`, tail: ev._tail || '', btn: '', aria: 'Prévia da capa', dev: st.dev, fam: cfg.familia, ini: ev._ini });
      const p = wrap.querySelector('.hv-poster'); p.dataset.dev = st.dev; montar(wrap, () => cfg); void fake; void tail;
      const run = () => p._run && p._run(); setTimeout(run, 0);
    }
    function sync(el) {
      A.$$('[data-hh=dev]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === st.dev));
      A.$$('[data-hh=tema]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === cfg.tema));
      const enq = efetivo(cfg, st.dev); A.$('#hh-z', el).value = Math.round((enq.z || 1) * 100); A.$('#hh-gv', el).textContent = `${cfg.grad}%`;
      const fam = cfg.familia || 'imersivo'; const imer = fam === 'imersivo';
      A.$('#hh-fams', el).innerHTML = `<div class="hh-lbl">Estilo</div><div class="hh-cards" role="group" aria-label="Estilo da capa">${FAMS.map(([f, n, d]) => `<button type="button" class="hh-card" data-hh="fam" data-v="${f}" aria-pressed="${fam === f}"><span class="hf-mini" data-fam="${f}"><img src="${E(st.foto)}" alt="" aria-hidden="true"><i></i></span><b>${n}</b><span>${d}</span></button>`).join('')}</div>`;
      A.$('#hh-comps', el).hidden = !imer; A.$('#hh-gwrap', el).hidden = !imer; A.$('#hh-tema', el).hidden = !imer;
      const p = A.$('.hv-poster', el); const sug = p && p.dataset.sug; const cur = cfg.comp === 'auto' ? sug : cfg.comp;
      if (imer) A.$('#hh-comps', el).innerHTML = `<div class="hh-lbl">Composição</div><div class="hh-cards" role="group" aria-label="Composição">${COMPS.map(([c, n, d]) => `<button type="button" class="hh-card" data-hh="comp" data-v="${c}" aria-pressed="${cur === c && cfg.comp !== 'auto' || (cfg.comp === 'auto' && c === sug)}">${mini(c, st.foto)}<b>${c} · ${n}</b><span>${d}</span>${c === sug ? '<em class="hh-sug">Sugerida</em>' : ''}</button>`).join('')}</div>${cfg.comp === 'auto' ? '' : '<button type="button" class="btn btn-quiet btn-sm" data-hh="comp" data-v="auto">Voltar à sugestão</button>'}`;
      const r = p && p.dataset.ratio; const q = A.$('#hh-ratio', el); if (!imer) q.textContent = 'Neste estilo o texto fica fora da foto, então a leitura está garantida.'; else if (r) q.textContent = `Contraste do texto: ${(+r).toFixed(1)}:1 ${+r >= 4.5 ? '(bom)' : '(baixo: aumente o degradê ou troque a cor do texto)'}`;
      A.$('#hh-hint', el).textContent = p && p.dataset.comp === 'D' ? 'Esta composição mostra a foto inteira, sem corte.' : 'Arraste a foto para enquadrar.';
    }
    function start(el) {
      paint(el); setTimeout(() => sync(el), 120);
      const reSync = () => { const p = A.$('.hv-poster', el); if (p && p._run) p._run().then(() => sync(el)); };
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-hh]'); if (!b || b.tagName === 'INPUT') return; const k = b.dataset.hh, v = b.dataset.v;
        if (k === 'dev') { st.dev = v; paint(el); setTimeout(() => sync(el), 120); }
        if (k === 'fam') { cfg.familia = v; paint(el); setTimeout(() => sync(el), 150); }
        if (k === 'comp') { cfg.comp = v; if (v === 'C' && cfg.lado === 'auto') cfg.lado = 'auto'; reSync(); }
        if (k === 'tema') { cfg.tema = v; reSync(); }
      });
      el.addEventListener('input', (e) => {
        const k = e.target.dataset.hh; if (k === 'zoom') { const t = cfg.sep ? cfg[st.dev] : cfg.d; t.z = +e.target.value / 100; if (!cfg.sep) cfg.m.z = t.z; reSync(); }
        if (k === 'grad') { cfg.grad = +e.target.value; reSync(); }
        if (k === 'sep') { cfg.sep = e.target.checked; if (cfg.sep) cfg.m = Object.assign({}, cfg.d); reSync(); }
      });
      el.addEventListener('change', async (e) => {
        if (e.target.dataset.hh === 'sep') { cfg.sep = e.target.checked; if (cfg.sep) cfg.m = Object.assign({}, cfg.d); reSync(); }
        if (e.target.dataset.hh !== 'file') return; const f = e.target.files && e.target.files[0]; if (!f) return;
        try { const r = await A.evt.lerImagem(f); st.foto = r.url; cfg.d.x = cfg.d.y = cfg.m.x = cfg.m.y = null; cfg.d.z = cfg.m.z = 1; paint(el); setTimeout(() => sync(el), 150); A.$('#hh-err', el).textContent = ''; } catch (m2) { A.$('#hh-err', el).textContent = String(m2); }
      });
      /* arrastar para enquadrar */
      let drag = null;
      el.addEventListener('pointerdown', (e) => { const p = e.target.closest('.hv-poster'); if (!p || !p._rect || p.dataset.comp === 'D') return; drag = { p, x: e.clientX, y: e.clientY, r: { ...p._rect } }; p.setPointerCapture(e.pointerId); p.classList.add('is-drag'); });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return; const { p, r } = drag; const ox = clamp(r.ox + (e.clientX - drag.x), r.pw - r.W, 0), oy = clamp(r.oy + (e.clientY - drag.y), r.ph - r.H, 0);
        const fx = r.W - r.pw > 1 ? ox / (r.pw - r.W) : 0.5, fy = r.H - r.ph > 1 ? oy / (r.ph - r.H) : 0.5;
        const t = cfg.sep ? cfg[st.dev] : cfg.d; t.x = Math.round(fx * 100); t.y = Math.round(fy * 100); if (!cfg.sep) { cfg.m.x = t.x; cfg.m.y = t.y; }
        if (p._run) p._run();
      });
      const end = () => { if (!drag) return; drag.p.classList.remove('is-drag'); drag = null; sync(el); };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      el.addEventListener('keydown', (e) => { const p = A.$('.hv-poster', el); if (!p || !e.target.closest('.hh-ed-wrap') || !p._rect) return; const d = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key]; if (!d) return; e.preventDefault(); const t = cfg.sep ? cfg[st.dev] : cfg.d; t.x = clamp((t.x == null ? p._rect.fx * 100 : t.x) + d[0], 0, 100); t.y = clamp((t.y == null ? p._rect.fy * 100 : t.y) + d[1], 0, 100); if (!cfg.sep) { cfg.m.x = t.x; cfg.m.y = t.y; } p._run(); });
    }
    void sugForDev; return m;
  }

  const fotoStyle = (id) => { const c = getCfg(id); const e = efetivo(c, 'm'); const x = e.x == null ? 50 : e.x, y = e.y == null ? 40 : e.y; return `object-position:${x}% ${y}%;${(e.z || 1) > 1 ? `transform:scale(${e.z});transform-origin:${x}% ${y}%` : ''}`; };
  A.hero = { fotoStyle, FAMS, poster, montar, getCfg, setCfg, analisar, sugerir, aplicar, editor, _N: N };
  A.acts['hh-edit'] = () => { const id = location.hash.match(/\/h\/e\/([^/]+)/); if (!id) return; const ev = A.data.events.find((e) => e.id === id[1]); if (!ev) return; const ctx = A._heroCtx && A._heroCtx[ev.id]; editor(ev.id, Object.assign({}, ev, ctx || {})); };

  const css = `
  .hh{--hh-grad:none;position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);align-items:end;width:100%;min-width:0;text-align:center;background:var(--noite);color:var(--fg);touch-action:pan-y}
  .hh>*{grid-area:1 / 1}
  .hh .hh-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(28px) saturate(1.1);transform:scale(1.2);z-index:-3;display:none}
  .hh .hh-img{position:absolute;max-width:none;z-index:-2;user-select:none;-webkit-user-drag:none}
  .hh .hh-photo{position:absolute;inset:0 0 auto 0;display:none;z-index:-2;padding:var(--space-4)}
  .hh .hh-photo img{width:100%;height:100%;object-fit:contain;border-radius:var(--space-3)}
  .hh .hh-veil{position:absolute;inset:0;z-index:-1;background:var(--hh-grad);pointer-events:none}
  .hh[data-theme=noite] .hh-in{text-shadow:0 1px 2px rgb(0 0 0 / .4),0 0 8px rgb(0 0 0 / .35)}
  .hh .hv-place,.hh .hv-date{display:block;margin:0;font-size:var(--fs-sm)}
  .hh .hv-date svg,.hh .hv-place svg{display:inline-block;vertical-align:-3px;margin-right:var(--space-1)}
  .hh .hv-kick{letter-spacing:.18em}
  .hh .hh-in{position:relative;display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-6) var(--space-6) var(--space-6);--hh-name:clamp(2.25rem,7vw,3.5rem);--hh-num:var(--fs-display)}
  .hh .hv-cd{width:fit-content;max-width:100%;padding:var(--space-3) var(--space-4);border-radius:var(--space-4);background:rgb(var(--hh-rgb,14 12 12) / .32)}
  .hh .hh-orn{position:absolute;bottom:var(--space-4);width:40px;height:160px;opacity:.55;pointer-events:none;display:none}
  .hh .hh-orn.l{left:var(--space-2)}.hh .hh-orn.r{right:var(--space-2);transform:scaleX(-1)}
  @media(min-width:600px){.hh[data-comp=A] .hh-orn,.hh[data-comp=B] .hh-orn{display:block}}
  .hh .hh-arc{width:min(140px,40%)}
  .hh .hh-arc .hv-arcwrap{width:100%}
  .hh .hv-hero-t{font-size:var(--hh-name)}
  .hh .hv-cd-u b{font-size:var(--hh-num)}
  .hh .hv-capa-btn{color:rgb(250 248 246);background:rgb(14 12 12)}
  .hh[data-comp=B] .hh-in{--hh-name:clamp(1.75rem,5.4vw,2.5rem);--hh-num:var(--fs-xl);padding:var(--space-3) var(--space-4) var(--space-4);gap:var(--space-1)}
  .hh[data-comp=B] .hh-arc{width:min(72px,22%)}
  .hh[data-comp=B] .hv-cd{margin-top:var(--space-2)}
  .hh[data-comp=C] .hh-in{align-self:stretch;justify-self:start;width:56%;align-items:flex-start;text-align:left;justify-content:center;--hh-name:var(--fs-xl);--hh-num:var(--fs-xl)}
  .hh[data-comp=C][data-lado=d] .hh-in{justify-self:end;align-items:flex-end;text-align:right}
  .hh[data-comp=C] .hh-arc{width:min(96px,40%)}
  .hh[data-comp=C] .hv-place{display:block}.hh .hv-place svg{display:inline-block;vertical-align:-3px;margin-right:var(--space-1)}

  .hh[data-comp=C] .hv-cd{justify-content:flex-start}.hh[data-comp=C][data-lado=d] .hv-cd{justify-content:flex-end}
  .hh[data-comp=D]{grid-template-rows:minmax(0,1fr) auto}
  .hh[data-comp=D] .hh-bg{display:block}.hh[data-comp=D] .hh-img{display:none}
  .hh[data-comp=D] .hh-photo{display:block;inset:0 0 auto 0;height:calc(100% - var(--hh-in-h,0px))}
  .hh[data-comp=D] .hh-in{--hh-name:var(--fs-xl);--hh-num:var(--fs-xl);padding:var(--space-3) var(--space-4) var(--space-4);gap:var(--space-1)}
  .hh[data-comp=D] .hh-arc{width:min(72px,22%)}
  .hh{aspect-ratio:4/5;max-height:76dvh}
  @media(min-width:901px){.hh{aspect-ratio:4/3;max-height:none}}
  .hh[data-dev=m]{aspect-ratio:4/5}.hh[data-dev=d]{aspect-ratio:4/3}
  .hh.is-drag{cursor:grabbing}.hh[data-comp=A],.hh[data-comp=B],.hh[data-comp=C]{cursor:grab}
  .hh-ed [hidden]{display:none!important}
  .hh-ed{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
  @media(min-width:760px){.hh-ed{grid-template-columns:minmax(0,1fr) 300px}}
  .hh-ed-stage{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);min-width:0}
  .hh-ed-wrap{width:100%;display:flex;justify-content:center}
  .hh-ed-wrap[data-dev=m] .hv-poster{width:min(100%,300px)}
  .hh-ed-wrap[data-dev=d] .hv-poster{width:100%}
  .hh-ed-wrap .hv-poster{max-height:none;min-height:0}
  .hh-ed-wrap .hv-kick{font-size:var(--fs-sm)}
  .hh-seg{display:flex;gap:var(--space-1);padding:var(--space-1);border:1px solid var(--line);border-radius:var(--r-pill,999px)}
  .hh-sb{flex:1;min-height:40px;padding:0 var(--space-3);border:0;border-radius:var(--r-pill,999px);background:none;color:var(--fg-2);font:inherit;font-size:var(--fs-sm);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2)}
  .hh-sb[aria-pressed=true]{background:var(--fg);color:var(--bg)}
  .hh-btn-file{position:relative;overflow:hidden;cursor:pointer}.hh-btn-file input{position:absolute;inset:0;opacity:0;cursor:pointer}
  .hh-lbl{font-size:var(--fs-sm);color:var(--fg-2);margin-bottom:var(--space-2)}
  .hh-cards{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}
  .hh-card{position:relative;display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-2);border:1px solid var(--line);border-radius:var(--space-3);background:none;color:var(--fg);text-align:left;font:inherit;font-size:var(--fs-sm);cursor:pointer}
  .hh-card[aria-pressed=true]{border-color:var(--fg);box-shadow:0 0 0 1px var(--fg)}
  .hh-card span{color:var(--fg-2);font-size:var(--fs-sm)}
  .hh-sug{position:absolute;top:var(--space-3);right:var(--space-3);padding:0 var(--space-2);border-radius:var(--r-pill,999px);background:var(--fg);color:var(--bg);font-style:normal;font-size:var(--fs-sm)}
  .hh-mini{position:relative;display:block;aspect-ratio:4/3;overflow:hidden;border-radius:var(--space-2);background:var(--noite)}
  .hh-mini img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .hh-mini .m-g{position:absolute;inset:0;background:linear-gradient(to top,rgb(14 12 12 / .8),transparent 60%)}
  .hh-mini .m-n,.hh-mini .m-t{position:absolute;left:25%;right:25%;height:4px;border-radius:2px;background:rgb(250 248 246 / .9)}
  .hh-mini .m-n{bottom:28%}.hh-mini .m-t{bottom:14%;height:4px;opacity:.6}
  .hh-mini[data-comp=B] .m-n{left:30%;right:30%;bottom:22%}.hh-mini[data-comp=B] .m-t{left:20%;right:20%;bottom:10%}
  .hh-mini[data-comp=C] .m-g{background:linear-gradient(to right,rgb(14 12 12 / .8),transparent 60%)}
  .hh-mini[data-comp=C] .m-n{left:8%;right:56%;bottom:50%}.hh-mini[data-comp=C] .m-t{left:8%;right:52%;bottom:38%}
  .hh-mini[data-comp=D] img{object-fit:contain;inset:var(--space-1) var(--space-1) 36% var(--space-1);width:calc(100% - var(--space-2));height:64%}
  .hh-mini[data-comp=D]::before{content:"";position:absolute;inset:0;background:var(--noite);opacity:.9}
  .hh-mini[data-comp=D] img{z-index:1}.hh-mini[data-comp=D] .m-g{display:none}.hh-mini[data-comp=D] .m-n{bottom:20%}.hh-mini[data-comp=D] .m-t{bottom:9%}
  .hh-chk{display:flex;align-items:center;gap:var(--space-2);font-size:var(--fs-sm)}
  .hh-ratio{margin:0;color:var(--fg-2)}

  .hf{--hf-paper:rgb(247 241 232);--hf-ink:rgb(43 33 28);--hf-ink2:rgb(112 98 86);--hf-line:rgb(43 33 28 / .22);position:relative;display:flex;flex-direction:column;align-items:center;gap:var(--space-4);padding:var(--space-6) var(--space-4);aspect-ratio:auto;max-height:none;width:100%;min-width:0;overflow:hidden;text-align:center;border-radius:var(--r-lg,16px);background:var(--hf-paper);color:var(--hf-ink)}
  .hf .hv-kick,.hf .hv-date,.hf .hv-place,.hf .hv-cd-u span,.hf .hv-cd-u:last-child b{color:var(--hf-ink2)}
  .hf .hv-hero-t,.hf .hv-cd-u b{color:var(--hf-ink)}
  .hf .hv-cd{background:none;padding:0;border-radius:0;margin-top:var(--space-2)}
  .hf .hv-cd-u{border-left-color:var(--hf-line)}
  .hf .hv-date,.hf .hv-place{display:block;margin:0;font-size:var(--fs-sm)}
  .hf .hv-date svg,.hf .hv-place svg{display:inline-block;vertical-align:-3px;margin-right:var(--space-1)}
  .hf .hv-capa-btn,.hh .hv-capa-btn{position:absolute;top:var(--space-3);right:var(--space-3);z-index:3;padding:0 var(--space-3);border:1px solid var(--line);border-radius:var(--r-pill,999px);font-size:var(--fs-sm);color:rgb(250 248 246);background:rgb(14 12 12)}
  .hf .hv-capa-lbl{display:none}@media(min-width:600px){.hf .hv-capa-lbl{display:inline}}
  .hf-stage{position:relative;width:100%;display:flex;justify-content:center}
  .hf-ph{position:relative;overflow:hidden;background:rgb(0 0 0 / .06);cursor:grab;touch-action:pan-y}
  .hf-ph .hh-img{position:absolute;max-width:none;user-select:none;-webkit-user-drag:none}
  .hf-txt{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);width:100%}
  .hf[data-fam=romantico] .hf-ph{width:min(70%,340px);aspect-ratio:3/4;border-radius:999px 999px var(--space-4) var(--space-4)}
  @media(min-width:901px){.hf[data-fam=romantico] .hf-ph{width:min(54%,300px)}}
  .hf[data-fam=romantico][data-dev=d] .hf-ph{width:min(54%,300px)}.hf[data-fam=romantico][data-dev=m] .hf-ph{width:min(70%,340px)}
  .hf[data-fam=romantico] .hv-hero-t{font-size:clamp(2.25rem,7vw,3.25rem)}
  .hf-sp{position:absolute;bottom:var(--space-2);width:56px;height:210px;color:var(--ac);opacity:.8;pointer-events:none;z-index:2}
  .hf-sp.l{left:calc(50% - min(35%,170px) - var(--space-6))}.hf-sp.r{right:calc(50% - min(35%,170px) - var(--space-6));transform:scaleX(-1)}
  @media(min-width:901px){.hf-sp.l{left:calc(50% - min(27%,150px) - var(--space-6))}.hf-sp.r{right:calc(50% - min(27%,150px) - var(--space-6))}}
  .hf[data-fam=minimal]{align-items:stretch;text-align:left;padding:var(--space-4)}
  .hf[data-fam=minimal] .hf-ph{width:100%;aspect-ratio:1/1;border-radius:var(--space-2)}
  @media(min-width:901px){.hf[data-fam=minimal] .hf-ph{aspect-ratio:16/10}}
  .hf[data-fam=minimal][data-dev=d] .hf-ph{aspect-ratio:16/10}.hf[data-fam=minimal][data-dev=m] .hf-ph{aspect-ratio:4/5}
  .hf[data-fam=minimal] .hf-txt{align-items:flex-start;text-align:left;padding:var(--space-2) var(--space-1) var(--space-2)}
  .hf[data-fam=minimal] .hv-hero-t{font-weight:300;font-size:clamp(2.75rem,10vw,4.75rem);line-height:1;letter-spacing:-.03em}
  .hf-hr{width:100%;height:1px;border:0;margin:var(--space-3) 0;background:var(--hf-line)}
  .hf[data-fam=minimal] .hv-cd{justify-content:flex-start}
  .hf[data-fam=minimal] .hv-cd-u:first-child{padding-left:0}
  .hf[data-fam=classico]{padding:var(--space-8) var(--space-4) var(--space-6)}
  .hf[data-fam=classico]::before{content:"";position:absolute;inset:var(--space-2);border:1px solid var(--hf-line);border-radius:var(--space-1);pointer-events:none}
  .hf[data-fam=classico] .hf-stage{margin-bottom:var(--space-8)}
  .hf[data-fam=classico] .hf-ph{width:min(74%,340px);aspect-ratio:4/5;border-radius:var(--space-1);outline:1px solid var(--hf-line);outline-offset:var(--space-2)}
  @media(min-width:901px){.hf[data-fam=classico] .hf-ph{width:min(50%,280px)}}
  .hf[data-fam=classico][data-dev=d] .hf-ph{width:min(50%,280px)}.hf[data-fam=classico][data-dev=m] .hf-ph{width:min(74%,340px)}
  .hf-mono{position:absolute;bottom:calc(-1 * var(--space-8));left:50%;translate:-50% 0;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--hf-paper);border:1px solid var(--hf-ink);font-family:var(--font-display);font-size:var(--fs-sm);letter-spacing:.06em;color:var(--hf-ink);z-index:2}
  .hf[data-fam=classico] .hv-hero-t{font-size:clamp(1.5rem,5vw,2.25rem);text-transform:uppercase;letter-spacing:.14em;font-weight:400}
  .hf[data-fam=classico] .hv-kick{letter-spacing:.3em}
  .hf-div{display:flex;align-items:center;gap:var(--space-3);width:min(70%,240px);color:var(--hf-ink2)}
  .hf-div i{flex:1;height:1px;background:var(--hf-line)}
  .hcr-pv[data-fam]:not([data-fam=imersivo]),.gx-fam{--bg:rgb(247 241 232);--fg:rgb(43 33 28);--fg-2:rgb(112 98 86);--fg-3:rgb(112 98 86);--line:rgb(43 33 28 / .22);--line-2:rgb(43 33 28 / .22);background:var(--bg);color:var(--fg)}
  .hcr-pv[data-fam]:not([data-fam=imersivo]) .hcr-cover{background:rgb(0 0 0 / .06);overflow:hidden}
  .hcr-pv[data-fam=romantico] .hcr-cover,.hcr-pv[data-fam=classico] .hcr-cover{margin:var(--space-4) auto 0}
  .hcr-pv[data-fam=romantico] .hcr-cover{width:62%;aspect-ratio:3/4;border-radius:999px 999px var(--space-3) var(--space-3)}
  .hcr-pv[data-fam=classico] .hcr-cover{width:66%;aspect-ratio:4/5;border-radius:var(--space-1);outline:1px solid var(--line);outline-offset:var(--space-2)}
  .hcr-pv[data-fam=minimal] .hcr-cover{margin:var(--space-3) var(--space-3) 0;aspect-ratio:4/3;border-radius:var(--space-2)}
  .hcr-pv[data-fam=romantico] .hcr-pv-body,.hcr-pv[data-fam=classico] .hcr-pv-body{text-align:center;align-items:stretch}
  .hcr-pv[data-fam=classico] .hcr-pv-t{text-transform:uppercase;letter-spacing:.12em;font-size:var(--fs-lg)}
  .hcr-pv[data-fam=minimal] .hcr-pv-t{font-weight:300;letter-spacing:-.02em}
  .gx-cover.gx-fam{justify-content:center;gap:var(--space-6)}
  .gx-fam h1:focus,.gx-fam [tabindex="-1"]:focus{outline:none}
  .gx-fam-ph{position:relative;overflow:hidden;margin:0 auto;background:rgb(0 0 0 / .06)}
  .gx-fam-ph img{width:100%;height:100%;object-fit:cover;display:block}
  .gx-fam[data-fam=romantico] .gx-fam-ph{width:min(68%,300px);aspect-ratio:3/4;border-radius:999px 999px var(--space-3) var(--space-3)}
  .gx-fam[data-fam=classico] .gx-fam-ph{width:min(70%,300px);aspect-ratio:4/5;border-radius:var(--space-1);outline:1px solid var(--line);outline-offset:var(--space-2);margin-top:var(--space-2)}
  .gx-fam[data-fam=minimal] .gx-fam-ph{width:100%;aspect-ratio:4/5;border-radius:var(--space-2)}
  .gx-fam[data-fam=romantico] .gx-ci,.gx-fam[data-fam=classico] .gx-ci{text-align:center}
  .hf-mini{position:relative;display:block;aspect-ratio:4/3;overflow:hidden;border-radius:var(--space-2);background:rgb(247 241 232);border:1px solid var(--line)}
  .hf-mini i{position:absolute;background:rgb(43 33 28 / .55);border-radius:2px;height:3px}
  .hf-mini img{position:absolute;object-fit:cover}
  .hf-mini[data-fam=imersivo]{background:var(--noite)}
  .hf-mini[data-fam=imersivo] img{inset:0;width:100%;height:100%}
  .hf-mini[data-fam=imersivo]::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgb(14 12 12 / .85),transparent 60%)}
  .hf-mini[data-fam=romantico] img{left:30%;right:30%;top:8%;width:40%;height:62%;border-radius:999px 999px 4px 4px}
  .hf-mini[data-fam=romantico] i{left:34%;right:34%;bottom:14%}
  .hf-mini[data-fam=minimal] img{left:8%;top:8%;width:84%;height:50%;border-radius:3px}
  .hf-mini[data-fam=minimal] i{left:8%;width:46%;bottom:22%;height:5px}
  .hf-mini[data-fam=classico] img{left:32%;top:12%;width:36%;height:52%;border-radius:1px;outline:1px solid rgb(43 33 28 / .4);outline-offset:3px}
  .hf-mini[data-fam=classico] i{left:30%;right:30%;bottom:14%}
  `;
  const stl = document.createElement('style'); stl.id = 'hh-style'; stl.textContent = css; document.head.append(stl);
})();
