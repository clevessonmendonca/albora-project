/* Albora protótipo — núcleo: roteador, store, componentes, overlays, simulação de estado.
   Módulos de superfície só usam a API `A.*` daqui. */
(function () {
  const A = (window.A = { acts: {}, inputs: {}, data: {}, _routes: [], _map: [], _after: [], _palette: [] });

  /* ---------- util ---------- */
  A.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.$ = (s, r = document) => r.querySelector(s);
  A.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  A.uid = () => Math.random().toString(36).slice(2, 9);
  A.hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  A.rand = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  A.pt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  A.brl = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  A.ago = (min) => (min < 1 ? 'agora' : min < 60 ? `há ${min} min` : min < 1440 ? `há ${Math.floor(min / 60)} h` : `há ${Math.floor(min / 1440)} d`);
  A.later = (ms, fn) => setTimeout(fn, ms);

  /* ---------- ícones (traço 1.6, 24px) ---------- */
  const I = {
    home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', sun: 'M12 4V2m0 20v-2M4.9 4.9L3.5 3.5m17 17l-1.4-1.4M4 12H2m20 0h-2M4.9 19.1l-1.4 1.4m17-17l-1.4 1.4M12 17a5 5 0 100-10 5 5 0 000 10z',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 100-2 1 1 0 000 2', users: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M21 20v-1a4 4 0 00-3-3.9M16 4.2A3.5 3.5 0 0116 11',
    brush: 'M18 3l3 3-9.5 9.5-3-3L18 3zM8.5 12.5C6 12.5 5 14 5 16c0 1.5-1 3-2 3 4 1 8 0 8-3.5', share: 'M12 3v12M8 7l4-4 4 4M5 13v6h14v-6', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h0',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
    search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3', plus: 'M12 5v14M5 12h14', check: 'M5 12.5l4.5 4.5L19 7', x: 'M6 6l12 12M18 6L6 18', chevron: 'M9 6l6 6-6 6', chevdown: 'M6 9l6 6 6-6', chevleft: 'M15 6l-6 6 6 6', arrow: 'M5 12h14M13 6l6 6-6 6', back: 'M19 12H5M11 6l-6 6 6 6',
    more: 'M5 12h.01M12 12h.01M19 12h.01', bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0', camera: 'M3 8h4l2-3h6l2 3h4v11H3zM12 17a4 4 0 100-8 4 4 0 000 8', video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
    heart: 'M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z', chat: 'M4 5h16v11H9l-5 4z', flag: 'M5 21V4m0 0h12l-2 4 2 4H5', copy: 'M9 9h11v11H9zM5 15V4h11', link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1',
    download: 'M12 4v12m-4-4l4 4 4-4M5 20h14', upload: 'M12 16V4m-4 4l4-4 4 4M5 20h14', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6', eyeoff: 'M3 3l18 18M10.6 6.1A9 9 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s4 7 10 7a9 9 0 004-1',
    lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', pin: 'M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4',
    tv: 'M3 5h18v12H3zM8 21h8M12 17v4', phone: 'M8 3h8v18H8zM11 18h2', sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z', music: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
    mic: 'M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zM5 11a7 7 0 0014 0M12 18v3', target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    filter: 'M3 5h18l-7 8v6l-4 2v-8z', sort: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01', warn: 'M12 3l10 18H2zM12 10v5M12 18h.01', book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11', gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-1-3-3s4 1 3 3zM12 7c2 0 4-1 3-3s-4 1-3 3z',
    wallet: 'M3 7h16a2 2 0 012 2v9H5a2 2 0 01-2-2zM3 7l12-3v3M16 13h2', logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9', moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z', globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', zap: 'M13 2L4 14h7l-1 8 9-12h-7z', stop: 'M6 6h12v12H6z', play: 'M7 4l13 8-13 8z', pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
    refresh: 'M20 11a8 8 0 00-14.5-3M4 4v4h4M4 13a8 8 0 0014.5 3M20 20v-4h-4', inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5', mail: 'M3 6h18v12H3zM3 7l9 7 9-7', help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.8.5-1.5 1-1.5 2M12 17h.01', building: 'M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3', card: 'M3 6h18v12H3zM3 10h18', chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8', tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01', send: 'M21 3L3 11l7 3 3 7z', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', face: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01', wifioff: 'M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015-2.7M19 12.9a10 10 0 00-4-2.5M12 20h.01',
  };
  /* Ícones: Lucide (mesma biblioteca do produto). Tamanhos 16/20/24, traço 1.75, `currentColor`. Preenchido: A.icon(n,s,cls,{fill:true}). */
  A.icon = (n, size = 20, cls = '', o = {}) => {
    const body = (window.LUCIDE && window.LUCIDE[n]) || `<path d="${I[n] || I.info}"/>`;
    return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${o.fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${o.stroke || 1.75}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  };
  A.iconNames = () => Object.keys(I);

  /* ---------- marca oficial (brand/ do repo; nada aqui é redesenhado) ---------- */
  let logoN = 0;
  A.logo = (h = 28) => { // LogoAlbora: arco com degradê âmbar + ponto + nome em Fraunces (igual a packages/ui-web/src/logo.tsx)
    const id = 'lg' + ++logoN;
    return `<svg class="logo" viewBox="0 0 300 64" width="${Math.round((h * 300) / 64)}" height="${h}" role="img" aria-label="Albora"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="32" y1="44" x2="32" y2="19"><stop offset="0" style="stop-color:color-mix(in srgb,var(--brasa) 72%,var(--tinta))"/><stop offset=".5" style="stop-color:var(--brasa)"/><stop offset="1" style="stop-color:var(--ambar)"/></linearGradient></defs><path d="M11 42 A21 21 0 0 1 53 42" fill="none" stroke="url(#${id})" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="39.4" r="2.9" style="fill:var(--brasa)"/><text x="86" y="46" font-family="Fraunces,Georgia,serif" font-weight="400" font-size="42" letter-spacing="3.4" fill="currentColor">Albora</text></svg>`;
  };
  A.mark = (px = 26) => `<img class="mark" src="assets/marca-plana-ambar.svg" width="${px}" height="${px}" alt="Albora">`;
  A.mascot = (px = 160, variant = 'mascote', alt = '') => `<img class="mascot" src="assets/${variant}.png" width="${px}" alt="${A.esc(alt)}" ${alt ? '' : 'aria-hidden="true"'} loading="lazy">`;
  A.star = (px = 96) => `<img class="star-anim" src="assets/marca-animada-estrela.svg" width="${px}" height="${px}" alt="" aria-hidden="true">`;
  A.arc = (p = 0.5, w = 220, label = '') => { // arco do logo (M11 42 A21 21 0 0 1 53 42, centro 32,42 raio 21): o ponto percorre o arco de 0 a 1
    const t = Math.min(1, Math.max(0, p)), ang = Math.PI * (1 - t), cx = 32 + 21 * Math.cos(ang), cy = 42 - 21 * Math.sin(ang), L = Math.PI * 21;
    return `<span class="arc" role="img" aria-label="${A.esc(label || Math.round(t * 100) + '% do caminho')}" style="width:${w}px"><svg viewBox="4 10 56 36" width="${w}" height="${Math.round(w * 36 / 56)}"><path class="trk" d="M11 42 A21 21 0 0 1 53 42" stroke-width="2" stroke-linecap="round"/><path class="val" d="M11 42 A21 21 0 0 1 53 42" stroke-width="2.6" stroke-dasharray="${L}" stroke-dashoffset="${(L * (1 - t)).toFixed(2)}"/><circle class="sun" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="3"/></svg></span>`;
  };
  A.celebrate = (el) => { if (!el || matchMedia('(prefers-reduced-motion:reduce)').matches) return; el.classList.remove('is-celebrating'); void el.offsetWidth; el.classList.add('is-celebrating'); };

  /* ---------- store (localStorage, com fallback em memória) ---------- */
  const KEY = 'albora-proto-v1'; let mem = {};
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return mem; } };
  const write = (o) => { mem = o; try { localStorage.setItem(KEY, JSON.stringify(o)); A.store.erro = false; } catch { A.store.erro = true; } };
  A.store = {
    get: (k, d) => { const o = read(); return k in o ? o[k] : d; },
    set: (k, v) => { const o = read(); o[k] = v; write(o); },
    update: (k, fn, d) => { const o = read(); o[k] = fn(k in o ? o[k] : d); write(o); return o[k]; },
    reset: () => { write({}); },
  };
  /* estado simulado do protótipo */
  A.sim = () => ({ phase: A.store.get('phase', 'antes'), role: A.store.get('role', 'owner'), state: A.store.get('state', 'ok'), theme: A.store.get('theme', 'light') });
  A.setSim = (k, v) => { A.store.set(k, v); A.applyTheme(); A.render(); };
  A.applyTheme = () => { document.documentElement.setAttribute('data-host-theme', A.sim().theme); };

  /* estados: ok | loading | empty | error — módulos usam A.stateful */
  A.skel = (n = 3, h = 56) => `<div class="stack-3" aria-busy="true" aria-label="Carregando">${Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px"></div>`).join('')}</div>`;
  A.emptyState = ({ icon = 'inbox', title, body = '', cta = '', art, mascot = 112 }) => `<div class="empty">${(art || (/^#\/c(\/|$)/.test(location.hash) ? 'none' : 'mascote')) === 'mascote' ? A.mascot(mascot) : A.icon(icon, 40)}<h3 class="t-title">${A.esc(title)}</h3>${body ? `<p style="max-width:42ch">${A.esc(body)}</p>` : ''}${cta}</div>`;
  A.errorState = ({ title = 'Não deu para carregar', body = 'Confira a conexão e tente de novo. Nada foi perdido.', retry = 'retry' } = {}) => `<div class="empty" role="alert">${A.icon('warn', 40)}<h3 class="t-title">${A.esc(title)}</h3><p>${A.esc(body)}</p><button class="btn btn-line" data-act="${retry}">${A.icon('refresh', 16)} Tentar de novo</button></div>`;
  A.stateful = ({ ok, empty, error, loading, isEmpty }) => {
    const s = A.sim().state;
    if (s === 'loading') return loading || A.skel(4);
    if (s === 'error') return error || A.errorState();
    if (s === 'empty' || (isEmpty && isEmpty())) return empty || A.emptyState({ title: 'Nada por aqui ainda' });
    return typeof ok === 'function' ? ok() : ok;
  };
  A.acts.retry = () => { A.setSim('state', 'ok'); A.toast('Carregado.'); };

  /* ---------- evento fictício e tempo ---------- */
  A.when = (id = 'e1') => {
    const ev = A.data.events.find((e) => e.id === id) || A.data.events[0];
    const phase = ev.id === 'e1' ? A.sim().phase : ev.phaseFixed;
    const day = 86400000, base = new Date('2026-11-14T12:00:00');
    const off = phase === 'antes' ? 18 : phase === 'durante' ? 0 : -9;
    const d = new Date(base.getTime() + off * day);
    const fmt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const label = phase === 'antes' ? `Faltam ${off} dias` : phase === 'durante' ? 'Acontecendo agora' : `Foi há ${-off} dias`;
    return { phase, date: fmt, label, days: off };
  };
  /* ---------- motor de tema: a cor do evento/fornecedor nunca decide o contraste; este cálculo decide ---------- */
  const rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((x) => x + x).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const hex = (a) => '#' + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const mixHex = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  A.contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const BASE = { noite: '#0C0A09', papel: '#FCFBF9', tinta: '#171513', ambar: '#D46632' };
  /* devolve {fill, text, onFill}: fill ≥3:1 e text ≥4.5:1 contra o chão; onFill = melhor entre tinta/papel sobre o fill. Anda em passos pequenos na direção do contraste (como acentoLegivelSobre). */
  A.theme = {
    resolve(accent, ground = 'noite') {
      const g = BASE[ground], toward = ground === 'noite' ? BASE.papel : BASE.tinta;
      const ensure = (min) => { let c = accent, t = 0; while (A.contrast(c, g) < min && t < 1) { t += 0.04; c = mixHex(accent, toward, t); } return c; };
      const best = (f) => (A.contrast(f, BASE.tinta) >= A.contrast(f, BASE.papel) ? BASE.tinta : BASE.papel);
      let fill = ensure(3), t2 = 0; // o rótulo sobre o preenchimento também precisa de 4.5:1
      while (A.contrast(fill, best(fill)) < 4.5 && t2 < 1) { t2 += 0.04; fill = mixHex(fill, toward, 0.04); }
      const text = ensure(4.5), onFill = best(fill);
      return { fill, text, onFill, ratios: { fill: +A.contrast(fill, g).toFixed(2), text: +A.contrast(text, g).toFixed(2), onFill: +A.contrast(onFill, fill).toFixed(2) } };
    },
    /* estilo inline para um escopo (fornecedor white-label no chão claro, p.ex.) */
    scope(accent, ground = 'papel') { const r = A.theme.resolve(accent, ground); return `--ac:${r.fill};--accent-text:${r.text};--on-ac:${r.onFill}`; },
  };
  A.applyEvent = (ev) => {
    const root = document.documentElement.style, raw = ev ? ev.cor : BASE.ambar; root.setProperty('--ev', raw);
    const n = A.theme.resolve(raw, 'noite'); root.setProperty('--ev-fill-n', n.fill); root.setProperty('--ev-text-n', n.text); root.setProperty('--on-fill-n', n.onFill);
    root.setProperty('--on-ev', A.contrast(raw, BASE.tinta) >= A.contrast(raw, BASE.papel) ? BASE.tinta : BASE.papel);
  };

  /* ---------- fotos e QR de mentira (nenhum asset real) ---------- */
  const PAL = [
    { f: '#2A1A16', m: '#4A2A22', l: '#E8B183', v: '#140C0A' },
    { f: '#14202A', m: '#2A3F4E', l: '#9FC6DE', v: '#0A1016' },
    { f: '#2B1C18', m: '#5A2F2C', l: '#F0C2A4', v: '#150C0B' },
    { f: '#1A2018', m: '#35422E', l: '#CBD49A', v: '#0D110C' },
    { f: '#231A1E', m: '#4C2C38', l: '#E6AFBE', v: '#110C0E' },
    { f: '#201C16', m: '#44392A', l: '#EBCE96', v: '#100E0A' },
    { f: '#2C1A14', m: '#63331F', l: '#F2A871', v: '#160D08' },
    { f: '#162023', m: '#2F4A47', l: '#A8CFBF', v: '#0B1011' },
  ];
  A.photo = (seed, ratio = 'p') => {
    const r = A.rand(A.hash('p' + seed)), c = PAL[Math.floor(r() * PAL.length)];
    const W = ratio === 'l' ? 600 : ratio === 's' ? 520 : 480, H = ratio === 'l' ? 400 : ratio === 's' ? 520 : 600;
    const tipo = ['luz', 'perto', 'aberto', 'brilho'][Math.floor(r() * 4)];
    const gx = 0.18 + r() * 0.64, gy = 0.14 + r() * 0.42;
    const bokeh = (n, ymax, rmin, rmax, omin, omax) => { let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${(r() * W * 1.05 - W * 0.025).toFixed(0)}" cy="${(r() * H * ymax).toFixed(0)}" r="${(W * (rmin + r() * (rmax - rmin))).toFixed(0)}" fill="${c.l}" opacity="${(omin + r() * (omax - omin)).toFixed(2)}"/>`; return o; };
    let fundoBok = '', frente = '';
    if (tipo === 'luz') fundoBok = bokeh(7 + Math.floor(r() * 5), 0.62, 0.03, 0.085, 0.16, 0.44);
    else if (tipo === 'perto') { fundoBok = bokeh(5 + Math.floor(r() * 4), 0.5, 0.035, 0.1, 0.18, 0.4); frente = `<ellipse cx="${(W * (0.2 + r() * 0.6)).toFixed(0)}" cy="${(H * (1.02 + r() * 0.1)).toFixed(0)}" rx="${(W * (0.45 + r() * 0.3)).toFixed(0)}" ry="${(H * (0.3 + r() * 0.14)).toFixed(0)}" fill="${c.v}" opacity=".9"/>`; }
    else if (tipo === 'aberto') { fundoBok = bokeh(9 + Math.floor(r() * 6), 0.72, 0.016, 0.05, 0.14, 0.38); frente = `<rect x="0" y="${(H * (0.66 + r() * 0.1)).toFixed(0)}" width="${W}" height="${H}" fill="${c.v}" opacity=".78"/>`; }
    else { fundoBok = bokeh(4 + Math.floor(r() * 3), 0.55, 0.04, 0.11, 0.14, 0.34); frente = `<path d="M${(-W * 0.25).toFixed(0)} ${(H * 0.95).toFixed(0)} L${(W * (0.5 + r() * 0.3)).toFixed(0)} ${(-H * 0.12).toFixed(0)} L${(W * (0.78 + r() * 0.25)).toFixed(0)} ${(-H * 0.12).toFixed(0)} L${(W * 0.18).toFixed(0)} ${(H * 0.95).toFixed(0)} Z" fill="${c.l}" opacity=".09"/>`; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="a" x1="0" y1="0" x2="${(0.1 + r() * 0.3).toFixed(2)}" y2="1"><stop offset="0" stop-color="${c.f}"/><stop offset=".6" stop-color="${c.m}"/><stop offset="1" stop-color="${c.v}"/></linearGradient><radialGradient id="b" cx="${gx.toFixed(2)}" cy="${gy.toFixed(2)}" r="${(0.5 + r() * 0.25).toFixed(2)}"><stop offset="0" stop-color="${c.l}" stop-opacity="${(0.3 + r() * 0.22).toFixed(2)}"/><stop offset="1" stop-color="${c.l}" stop-opacity="0"/></radialGradient><radialGradient id="c" cx=".5" cy=".44" r=".76"><stop offset=".44" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient><pattern id="g" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#fff" opacity=".6"/></pattern><filter id="bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(W * 0.03).toFixed(0)}"/></filter><filter id="bf" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(W * 0.055).toFixed(0)}"/></filter></defs><rect width="${W}" height="${H}" fill="url(#a)"/><rect width="${W}" height="${H}" fill="url(#b)"/><g filter="url(#bl)">${fundoBok}</g><g filter="url(#bf)">${frente}</g><rect width="${W}" height="${H}" fill="url(#c)"/><rect width="${W}" height="${H}" fill="url(#g)" opacity=".055"/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };
  A.img = (seed, ratio = 'p', alt = 'Foto de exemplo (ilustração do protótipo)') => `<img src="${A.photo(seed, ratio)}" alt="${A.esc(alt)}" loading="lazy">`;

  /* ---------- véu calculado: o contraste de texto sobre foto é medido na imagem, não estimado ---------- */
  const lumRGB = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratioRGB = (a, b) => { const l1 = lumRGB(a), l2 = lumRGB(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const amostrar = (src, de, ate) => new Promise((ok, no) => {
    const im = new Image(); im.crossOrigin = 'anonymous'; im.onerror = () => no(new Error('imagem'));
    im.onload = () => {
      const W = 24, H = 32, c = document.createElement('canvas'); c.width = W; c.height = H;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0, W, H);
      const y0 = Math.max(0, Math.min(H - 1, Math.floor(H * de))), y1 = Math.max(y0 + 1, Math.min(H, Math.ceil(H * ate)));
      let d; try { d = cx.getImageData(0, y0, W, y1 - y0).data; } catch (e) { return no(e); }
      const px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      px.length ? ok(px) : no(new Error('vazio'));
    };
    im.src = src;
  });
  A.veu = async (src, o = {}) => {
    const texto = rgb(o.texto || BASE.papel), veu = rgb(o.veu || BASE.noite), alvo = o.alvo || 4.5;
    const de = o.de == null ? 0.42 : o.de, ate = o.ate == null ? 1 : o.ate;
    const chave = `${src.length}|${src.slice(-48)}|${de}|${ate}|${o.texto || ''}|${o.veu || ''}|${alvo}`;
    if (A.veu.cache.has(chave)) return A.veu.cache.get(chave);
    let px; try { px = await amostrar(src, de, ate); } catch { const f = { alpha: A.veu.seguro, ratio: null, medido: false }; A.veu.cache.set(chave, f); return f; }
    const pior = (a) => px.reduce((m, p) => Math.min(m, ratioRGB(p.map((v, i) => v + (veu[i] - v) * a), texto)), Infinity);
    let hi = 1;
    if (pior(0) >= alvo) hi = 0;
    else { let lo = 0; for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (pior(mid) >= alvo) hi = mid; else lo = mid; } }
    const alpha = Math.min(1, Math.ceil(hi * 100) / 100);
    const out = { alpha, ratio: +pior(alpha).toFixed(2), alvo, medido: true, basta: pior(alpha) >= alvo };
    A.veu.cache.set(chave, out); return out;
  };
  A.veu.cache = new Map();
  A.veu.seguro = 0.78;
  A.aplicarVeu = (el, src, o = {}) => {
    if (!el || !src) return Promise.resolve(null);
    el.style.setProperty('--veu-a', A.veu.seguro);
    return A.veu(src, o).then((r) => {
      if (!el.isConnected) return r;
      el.style.setProperty('--veu-a', r.alpha);
      el.dataset.veu = r.medido ? `${r.alpha} (${r.ratio}:1)` : 'nao-medido';
      if (r.medido && !r.basta) el.dataset.veuAviso = 'abaixo do alvo';
      return r;
    });
  };
  /* capa de demonstração: ilustração determinística do protótipo, nunca uma fotografia */
  A.capa = (seed, cor = BASE.ambar, cor2 = '#1F2A33') => {
    const r = A.rand(A.hash('cp' + seed)), W = 900, H = 1200;
    const ceu = mixHex(cor2, BASE.noite, 0.52), meio = mixHex(cor, BASE.noite, 0.42), chao = mixHex(cor2, BASE.noite, 0.86), luz = mixHex(cor, BASE.papel, 0.34), vulto = mixHex(cor2, BASE.noite, 0.94);
    let pontos = ''; const n = 6 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) { const cx = (0.06 + r() * 0.88) * W, cy = (0.1 + r() * 0.46) * H, rr = (0.012 + r() * 0.034) * W; pontos += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rr.toFixed(0)}" fill="${luz}" opacity="${(0.22 + r() * 0.34).toFixed(2)}"/>`; }
    let vultos = ''; const m = 3 + Math.floor(r() * 3);
    for (let i = 0; i < m; i++) { const x = W * ((i + 0.5) / m) + (r() - 0.5) * 90, y = H * (0.86 + r() * 0.05), s = 42 + r() * 24; vultos += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s * 0.5).toFixed(0)}" fill="${vulto}"/><rect x="${(x - s * 0.9).toFixed(0)}" y="${(y + s * 0.55).toFixed(0)}" width="${(s * 1.8).toFixed(0)}" height="${H}" rx="${(s * 0.75).toFixed(0)}" fill="${vulto}"/>`; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ceu}"/><stop offset=".56" stop-color="${meio}"/><stop offset="1" stop-color="${chao}"/></linearGradient><radialGradient id="b" cx=".5" cy=".6" r=".58"><stop offset="0" stop-color="${luz}" stop-opacity=".46"/><stop offset="1" stop-color="${luz}" stop-opacity="0"/></radialGradient><radialGradient id="c" cx=".5" cy=".42" r=".78"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".46" stop-color="${chao}" stop-opacity="0"/><stop offset=".78" stop-color="${chao}" stop-opacity=".72"/><stop offset="1" stop-color="${chao}" stop-opacity=".96"/></linearGradient><pattern id="d" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="none"/><rect width="1" height="1" fill="#fff" opacity=".5"/></pattern><filter id="e" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter></defs><rect width="${W}" height="${H}" fill="url(#a)"/><rect width="${W}" height="${H}" fill="url(#b)"/><g filter="url(#e)">${pontos}</g><rect width="${W}" height="${H}" fill="url(#f)"/><g opacity=".55">${vultos}</g><rect width="${W}" height="${H}" fill="url(#c)"/><rect width="${W}" height="${H}" fill="url(#d)" opacity=".05"/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };
  A.qrSvg = (text, size = 168) => { // aparência de QR; NÃO escaneável (protótipo)
    const N = 25, r = A.rand(A.hash(text)); let rects = '';
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="currentColor"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="var(--qr-bg,var(--bg))"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="currentColor"/>`;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const inF = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9); if (!inF && r() > 0.52) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`; }
    return `<svg role="img" aria-label="QR Code de exemplo (não escaneável neste protótipo)" width="${size}" height="${size}" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" style="color:var(--fg)">${rects}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</svg>`;
  };

  /* ---------- campos e validação ---------- */
  A.field = ({ name, label, type = 'text', value = '', hint = '', placeholder = '', required = false, options = null, rows = 0, extra = '', err = '' }) => {
    const id = 'f-' + name + A.uid().slice(0, 3);
    const attrs = `id="${id}" name="${name}" ${required ? 'required aria-required="true"' : ''} aria-describedby="${id}-h ${id}-e" ${extra}`;
    let control;
    if (options) control = `<select class="select" ${attrs}>${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${A.esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${A.esc(l)}</option>`; }).join('')}</select>`;
    else if (rows) control = `<textarea class="textarea" rows="${rows}" placeholder="${A.esc(placeholder)}" ${attrs}>${A.esc(value)}</textarea>`;
    else control = `<input class="input" type="${type}" value="${A.esc(value)}" placeholder="${A.esc(placeholder)}" ${attrs}>`;
    return `<div class="field ${err ? 'has-error' : ''}"><label for="${id}">${A.esc(label)}${required ? '' : ' <span class="muted">(opcional)</span>'}</label>${control}${hint ? `<span class="hint" id="${id}-h">${A.esc(hint)}</span>` : `<span id="${id}-h"></span>`}<span class="err" id="${id}-e" role="alert">${A.esc(err)}</span></div>`;
  };
  A.validate = (form, rules = {}) => {
    const out = {}; let first = null;
    A.$$('input,select,textarea', form).forEach((el) => {
      if (!el.name) return; out[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
      const f = el.closest('.field'); if (!f) return;
      let msg = ''; if (el.required && !out[el.name]) msg = 'Preencha este campo.';
      if (!msg && rules[el.name]) msg = rules[el.name](out[el.name], out) || '';
      f.classList.toggle('has-error', !!msg); const e = A.$('.err', f); if (e) e.textContent = msg; if (el.setAttribute) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !first) first = el;
    });
    if (first) { const vis = first.closest('.ds-sel'); (vis ? A.$('.ds-sel-t', vis) : first).focus(); return null; }
    return out;
  };
  A.rules = {
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Esse e-mail parece incompleto. Exemplo: nome@email.com'),
    min: (n, m) => (v) => (v.length >= n ? '' : m || `Use pelo menos ${n} caracteres.`),
    futureDate: (v) => (v && new Date(v) > new Date('2026-11-14') ? '' : 'Escolha uma data a partir de amanhã.'),
    int: (a, b) => (v) => (v === '' || (Number.isInteger(+v) && +v >= a && +v <= b) ? '' : `Informe um número de ${a} a ${b}.`),
  };
  A.busy = (btn, ms, done) => { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); if ('disabled' in btn) btn.disabled = true; setTimeout(() => { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if ('disabled' in btn) btn.disabled = false; done && done(); }, ms); };

  /* ---------- overlays com foco preso ---------- */
  const stack = [];
  const FOC = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  A.modal = ({ title, body = '', actions = [], wide = false, label, onOpen, dismiss = true, restoreFocus }) => {
    A.fecharFlutuantes();
    const prev = document.activeElement; const sc = document.createElement('div'); sc.className = 'scrim'; const m = document.createElement('div');
    m.className = 'modal' + (wide ? ' wide' : ''); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', label || title || 'Janela');
    const acts = actions.map((a, i) => `<button class="btn ${a.variant || ''}" data-mi="${i}">${A.esc(a.label)}</button>`).join('');
    m.innerHTML = `<div class="modal-head"><h2 class="t-title">${A.esc(title || '')}</h2>${dismiss ? `<button class="btn btn-quiet btn-icon btn-sm" data-mclose aria-label="Fechar">${A.icon('x', 18)}</button>` : ''}</div><div class="modal-body">${body}</div>${acts ? `<div class="modal-actions">${acts}</div>` : ''}`;
    document.body.append(sc, m); A.selects(m);
    const api = { el: m, close(ret) { if (!m.isConnected) return; sc.remove(); m.remove(); stack.splice(stack.indexOf(api), 1); const alvo = typeof restoreFocus === 'function' ? restoreFocus() : (restoreFocus || prev); alvo && alvo.focus && alvo.focus(); api.onClose && api.onClose(ret); } };
    sc.addEventListener('click', () => dismiss && api.close());
    m.addEventListener('click', (e) => {
      if (e.target.closest('[data-mclose]')) return api.close();
      const b = e.target.closest('[data-mi]'); if (b) { const a = actions[+b.dataset.mi]; const r = a.onClick ? a.onClick(api, b) : undefined; if (r !== false && a.close !== false) api.close(a.value); }
    });
    stack.push(api); (A.$('input,select,textarea', m) || A.$('.btn-primary,.btn-accent', m) || A.$(FOC, m))?.focus();
    onOpen && onOpen(m, api); return api;
  };
  A.sheet = A.modal;
  A.confirm = ({ title, body = '', confirm = 'Confirmar', cancel = 'Cancelar', danger = false, type = '' }) => new Promise((res) => {
    let ok = false;
    const m = A.modal({
      title, body: body + (type ? `<div class="field" style="margin-top:16px"><label for="cf-t">Para confirmar, digite <b>${A.esc(type)}</b></label><input class="input" id="cf-t" autocomplete="off"></div>` : ''),
      actions: [{ label: cancel, variant: 'btn-quiet', value: false }, { label: confirm, variant: danger ? 'btn-danger solid' : 'btn-primary', onClick: (api) => { if (type && A.$('#cf-t', api.el).value.trim() !== type) { A.$('#cf-t', api.el).focus(); return false; } ok = true; } }],
    }); m.onClose = () => res(ok);
  });
  A.menu = (anchor, items) => {
    A.fecharFlutuantes(); const m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => it.sep ? '<div class="sep"></div>' : it.head ? `<div class="t-label" style="padding:8px 12px 4px">${A.esc(it.head)}</div>` : `<${it.href ? 'a href="' + it.href + '"' : 'button'} role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}" ${it.active ? 'data-active' : ''}>${it.icon ? A.icon(it.icon, 18) : ''}<span class="grow">${A.esc(it.label)}</span>${it.hint ? `<span class="t-small">${A.esc(it.hint)}</span>` : ''}</${it.href ? 'a' : 'button'}>`).join('');
    document.body.append(m);
    let soltaAncora = null;
    const close = (devolve) => { soltaAncora && soltaAncora(); soltaAncora = null; m.remove(); document.removeEventListener('mousedown', out, true); document.removeEventListener('keydown', key, true); if (devolve && anchor.focus) anchor.focus(); };
    const out = (e) => { if (!m.contains(e.target)) close(false); };
    const key = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); return; }
      if (e.key === 'Tab') { close(true); return; }
      const its = A.$$('[role=menuitem]', m); if (!its.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const at = its.indexOf(document.activeElement);
      its[e.key === 'Home' ? 0 : e.key === 'End' ? its.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus();
    };
    setTimeout(() => document.addEventListener('mousedown', out, true)); document.addEventListener('keydown', key, true);
    soltaAncora = A.ancorar(m, anchor, () => close(false));
    m.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[+b.dataset.i]; close(false); it.onClick && it.onClick(); });
    (A.$('[role=menuitem]', m) || m).focus && A.$('[role=menuitem]', m)?.focus(); return m;
  };
  A.toast = (msg, o = {}) => {
    let box = A.$('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (o.kind || ''); t.innerHTML = `<span class="grow">${A.esc(msg)}</span>${o.undo ? '<button>Desfazer</button>' : ''}`;
    box.append(t); const kill = () => t.remove(); const to = setTimeout(kill, o.ms || (o.undo ? 6500 : 3200));
    if (o.undo) A.$('button', t).onclick = () => { clearTimeout(to); kill(); o.undo(); }; return t;
  };

  /* ---------- paleta de comandos (⌘K) ---------- */
  A.palette = { add: (items) => A._palette.push(items) };
  const openPalette = () => {
    if (A.$('.palette')) return; A.fecharFlutuantes(); const prev = document.activeElement; const sc = document.createElement('div'); sc.className = 'scrim'; const p = document.createElement('div'); p.className = 'palette'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Buscar e executar');
    p.innerHTML = `<input aria-label="Buscar" placeholder="Buscar telas e ações…" autocomplete="off"><ul role="listbox"></ul>`; document.body.append(sc, p);
    const inp = A.$('input', p), ul = A.$('ul', p); let sel = 0, cur = [];
    const all = () => A._palette.flatMap((f) => (typeof f === 'function' ? f() : f));
    const draw = () => { const q = inp.value.toLowerCase().trim(); cur = all().filter((i) => !q || (i.label + ' ' + (i.group || '') + ' ' + (i.keys || '')).toLowerCase().includes(q)).slice(0, 40); sel = Math.min(sel, Math.max(0, cur.length - 1)); let g = '';
      ul.innerHTML = cur.length ? cur.map((i, n) => { const h = i.group !== g ? `<li class="grp t-label">${A.esc((g = i.group) || '')}</li>` : ''; return `${h}<li><button role="option" data-n="${n}" aria-selected="${n === sel}">${A.icon(i.icon || 'arrow', 18)}<span class="grow">${A.esc(i.label)}</span>${i.hint ? `<span class="t-small">${A.esc(i.hint)}</span>` : ''}</button></li>`; }).join('') : `<li class="empty" style="padding:24px">Nada encontrado para “${A.esc(inp.value)}”.</li>`; };
    const close = () => { sc.remove(); p.remove(); prev && prev.focus && prev.focus(); };
    const run = (i) => { close(); if (i.go) location.hash = i.go; else if (i.run) i.run(); };
    inp.addEventListener('input', () => { sel = 0; draw(); });
    p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(cur.length - 1, sel + 1); draw(); A.$('[aria-selected=true]', p)?.scrollIntoView({ block: 'nearest' }); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); A.$('[aria-selected=true]', p)?.scrollIntoView({ block: 'nearest' }); } else if (e.key === 'Enter' && cur[sel]) run(cur[sel]); else if (e.key === 'Tab') e.preventDefault(); });
    p.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) run(cur[+b.dataset.n]); }); sc.onclick = close; draw(); inp.focus();
  };
  A.openPalette = openPalette;

  /* ---------- layout genérico (anfitrião, fornecedor, console) ---------- */
  A.layout = (cfg, content) => {
    const nav = (cfg.groups || []).map((g) => `${g.label ? `<div class="nav-group t-label">${A.esc(g.label)}</div>` : ''}${g.items.map((it) => `<a href="${it.href}" ${cfg.active === it.id ? 'aria-current="page"' : ''}>${A.icon(it.icon, 20)}<span class="l">${A.esc(it.label)}</span>${it.badge ? `<span class="pill-count" aria-label="${it.badge} pendentes">${it.badge}</span>` : ''}</a>`).join('')}`).join('');
    const tabs = (cfg.tabs || []).map((t) => t.act ? `<button data-act="${t.act}" aria-label="${A.esc(t.label)}">${A.icon(t.icon, 22)}<span>${A.esc(t.label)}</span></button>` : `<a href="${t.href}" ${cfg.active === t.id ? 'aria-current="page"' : ''}>${A.icon(t.icon, 22)}<span>${A.esc(t.label)}</span>${t.badge ? '<i class="dot"></i>' : ''}</a>`).join('');
    return `<a class="skip" href="#main" data-act="skip">Pular para o conteúdo</a><div class="app"><aside class="rail" aria-label="Navegação principal"><div class="brand">${!cfg.brand || cfg.brand === 'albora' ? `<span class="w">${A.logo(26)}</span><span class="m">${A.mark(26)}</span>${cfg.tag ? `<span class="t-label" style="margin-left:2px">${A.esc(cfg.tag)}</span>` : ''}` : `<span class="brand-mark" aria-hidden="true">${A.esc(cfg.mark || cfg.brand[0])}</span><span class="w">${A.esc(cfg.brand)}</span>`}</div>${cfg.ctx || ''}<nav class="nav" aria-label="${A.esc(cfg.navLabel || 'Seções')}">${nav}</nav><div class="rail-foot nav">${cfg.foot || ''}</div></aside><div class="main"><header class="topbar" id="topbar">${cfg.top || ''}</header><main id="main" tabindex="-1" class="page ${cfg.pageClass || ''}">${content}</main></div></div>${tabs ? `<nav class="tabbar" aria-label="Navegação">${tabs}</nav>` : ''}`;
  };
  A.pageHead = ({ crumbs = [], title, lead = '', actions = '' }) => `<div class="page-head">${crumbs.length ? `<nav class="crumb" aria-label="Você está em">${crumbs.map((c, i) => (c.href ? `<a href="${c.href}">${A.esc(c.label)}</a>` : `<span aria-current="page">${A.esc(c.label)}</span>`) + (i < crumbs.length - 1 ? A.icon('chevron', 14) : '')).join('')}</nav>` : ''}<div class="flex between flex-wrap" style="align-items:flex-end;gap:16px"><h1 class="t-display">${A.esc(title)}</h1><div class="flex flex-wrap">${actions}</div></div>${lead ? `<p class="t-lead" style="max-width:60ch">${lead}</p>` : ''}</div>`;

  /* shell do anfitrião (um só, persistente em todas as telas do evento) */
  A.hostBase = (id) => `#/h/e/${id}`;
  A.hostShell = (ctx, { section, crumbs, title, lead, actions = '', pageClass = '' }, content) => {
    const id = ctx.params.id || 'e1'; const ev = A.data.events.find((e) => e.id === id) || A.data.events[0]; A.applyEvent(ev);
    const w = A.when(ev.id); const base = A.hostBase(ev.id); const pend = ev.id === 'e1' ? A.data.photos.filter((p) => p.status === 'revisar').length : 0;
    const items = [
      { id: 'hoje', label: 'Hoje', icon: 'sun', href: base + '/hoje' }, { id: 'fotos', label: 'Fotos', icon: 'image', href: base + '/fotos', badge: pend || '' },
      { id: 'convidados', label: 'Convidados', icon: 'users', href: base + '/convidados' }, { id: 'estilo', label: 'Estilo', icon: 'brush', href: base + '/estilo' }, { id: 'compartilhar', label: 'Compartilhar', icon: 'share', href: base + '/compartilhar' },
    ];
    const ctxBtn = `<button class="ctx" data-act="switch-event" aria-haspopup="menu" title="${A.esc(ev.nome)}"><span class="avatar" aria-hidden="true">${ev.capa ? `<img src="${A.esc(ev.capa)}" alt="" style="${A.hero ? A.hero.fotoStyle(ev.id) : ''}">` : A.esc(ev.iniciais)}</span><span class="grow"><b class="t-h" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${A.esc(ev.nome)}</b><span class="t-small">${A.esc(w.label)}</span></span>${A.icon('chevdown', 16)}</button>`;
    const foot = `<div class="nav-group t-label">Explorar</div><a href="${base}/comunidade" ${section === 'comunidade' ? 'aria-current="page"' : ''}>${A.icon('chat', 20)}<span class="l">Comunidade</span></a><a href="${base}/inspiracao" ${section === 'inspiracao' ? 'aria-current="page"' : ''}>${A.icon('sparkle', 20)}<span class="l">Inspiração</span></a><button data-act="account-menu" aria-haspopup="menu">${A.icon('settings', 20)}<span class="l">Conta e ajustes</span></button>`;
    const top = `<div class="grow ellip"><span class="t-small hide-sm">${A.esc(ev.nome)} · ${A.esc(w.date)}</span><span class="t-h only-sm">${A.esc(ev.nome)}</span></div>${w.phase === 'durante' ? '<span class="badge live" aria-label="Evento ao vivo">Ao vivo</span>' : ''}<button class="btn btn-quiet btn-sm" data-act="palette" aria-label="Buscar (Ctrl K)">${A.icon('search', 18)}<span class="hide-sm">Buscar</span><span class="kbd hide-sm">⌘K</span></button><button class="btn btn-line btn-sm top-cta" data-act="invite" aria-label="Convidar">${A.icon('send', 16)}<span class="hide-xs">Convidar</span></button><button class="avatar acct" data-act="account-menu" aria-haspopup="menu" aria-label="Conta de Marina Almeida" title="Conta">MA</button>`;
    const tabs = [{ id: 'hoje', label: 'Hoje', icon: 'sun', href: base + '/hoje' }, { id: 'fotos', label: 'Fotos', icon: 'image', href: base + '/fotos', badge: pend }, { id: 'convidados', label: 'Convidados', icon: 'users', href: base + '/convidados' }, { id: 'estilo', label: 'Estilo', icon: 'brush', href: base + '/estilo' }, { label: 'Mais', icon: 'more', act: 'more' }];
    const head = title ? A.pageHead({ crumbs: crumbs || [], title, lead, actions }) : '';
    return A.layout({ brand: 'albora', mark: 'a', ctx: ctxBtn, groups: [{ items }], active: section, foot, top, tabs, pageClass, navLabel: 'Seções do evento' }, head + content);
  };
  A.acts['switch-event'] = (el) => A.menu(el, [{ head: 'Seus eventos' }, ...A.data.events.map((e) => ({ label: e.nome, icon: 'calendar', href: A.hostBase(e.id) + '/hoje', hint: A.when(e.id).label })), { sep: 1 }, { label: 'Todos os eventos', icon: 'list', href: '#/h' }, { label: 'Novo evento', icon: 'plus', href: '#/h/novo/1' }]);
  A.acts['account-menu'] = (el) => { const id = (location.hash.match(/\/h\/e\/([^/]+)/) || [])[1] || 'e1'; const b = A.hostBase(id); A.menu(el, [{ head: 'Marina Almeida · marina@email.com' }, { label: 'Ajustes do evento', icon: 'settings', href: b + '/ajustes/evento' }, { label: 'Plano e cobrança', icon: 'wallet', href: '#/h/plano' }, { label: 'Equipe', icon: 'users', href: b + '/ajustes/equipe' }, { label: 'Privacidade e consentimento', icon: 'shield', href: b + '/ajustes/privacidade' }, { sep: 1 }, { label: 'Todos os eventos', icon: 'list', href: '#/h' }, { label: 'Ajuda', icon: 'help', href: '#/h/ajuda' }, { label: 'Tema: ' + ({ light: 'claro', dark: 'escuro', system: 'sistema' }[A.sim().theme]), icon: 'moon', onClick: () => A.setSim('theme', { light: 'dark', dark: 'system', system: 'light' }[A.sim().theme]) }, { sep: 1 }, { label: 'Sair', icon: 'logout', onClick: A.signOut }]); };
  A.dirty = null; /* módulos com dados não salvos definem A.dirty = 'mensagem' e limpam ao salvar */
  A.signOut = async () => { if (A.dirty) { const ok = await A.confirm({ title: 'Sair sem salvar?', body: A.dirty, confirm: 'Sair mesmo assim', cancel: 'Continuar editando', danger: true }); if (!ok) return; A.dirty = null; } location.hash = '#/h/entrar'; A.toast('Você saiu da conta.'); };
  A.acts.more = () => { const id = (location.hash.match(/\/h\/e\/([^/]+)/) || [])[1] || 'e1'; const b = A.hostBase(id); const L = (h, i, l) => `<a class="li" href="${h}" data-mclose>${A.icon(i, 20)}<span class="grow">${l}</span>${A.icon('chevron', 16)}</a>`; A.sheet({ title: 'Mais do evento', body: `<div class="list">${L(b + '/compartilhar', 'share', 'Compartilhar e telão')}${L(b + '/comunidade', 'chat', 'Comunidade')}${L(b + '/inspiracao', 'sparkle', 'Inspiração')}${L(b + '/ajustes/evento', 'settings', 'Ajustes do evento')}${L(b + '/ajustes/equipe', 'users', 'Equipe')}${L('#/h/ajuda', 'help', 'Ajuda')}${L('#/h', 'list', 'Todos os eventos')}${L('#/h/plano', 'wallet', 'Plano e cobrança')}</div><button class="btn btn-quiet btn-block" style="margin-top:var(--space-4)" data-act="signout">${A.icon('logout', 18)} Sair da conta</button>` }); };
  A.acts.palette = () => openPalette(); A.acts.signout = () => { A.$$('.scrim,.modal').forEach((x) => x.remove()); A.signOut(); };
  A.acts.skip = (el, e) => { e.preventDefault(); A.$('#main')?.focus(); };
  A.acts.invite = () => {
    const id = (location.hash.match(/\/h\/e\/([^/]+)/) || [])[1] || 'e1'; const ev = A.data.events.find((e) => e.id === id) || A.data.events[0]; const url = `albora.app/e/${ev.slug}`;
    A.sheet({ title: 'Convidar para a festa', body: `<div class="stack"><div class="flex" style="gap:20px;align-items:flex-start"><div style="background:var(--papel);padding:10px;border-radius:var(--r-2);color:var(--tinta);--qr-bg:var(--papel)">${A.qrSvg(url, 132)}</div><div class="stack-2 grow"><p class="t-small">O mesmo link serve para todos. Convidado não cria conta.</p><div class="flex"><code class="t-mono grow" style="font-size:14px">${url}</code></div><div class="flex flex-wrap"><button class="btn btn-sm btn-line" data-act="copy" data-text="https://${url}">${A.icon('copy', 16)} Copiar link</button><a class="btn btn-sm btn-line" target="_blank" rel="noopener" href="#/g/${ev.slug}">${A.icon('eye', 16)} Ver como convidado</a></div></div></div><button class="btn btn-accent btn-block" data-act="wa" data-text="Olha só: tire fotos da nossa festa e elas aparecem no telão! https://${url}">${A.icon('send', 18)} Mandar por WhatsApp</button><a class="btn btn-quiet btn-block" href="${A.hostBase(ev.id)}/compartilhar" data-mclose>Placa, QR em alta e telão ${A.icon('arrow', 16)}</a></div>` });
  };
  A.acts.copy = async (el) => {
    const t = el.dataset.text || '';
    try { if (!navigator.clipboard) throw new Error('Clipboard indisponível'); await navigator.clipboard.writeText(t); A.toast('Link copiado.'); }
    catch { A.modal({ title: 'Copie o link', body: `<div class="stack"><p>O navegador não permitiu copiar automaticamente. Selecione o endereço abaixo para copiar.</p><label class="field">Link para compartilhar<input class="input" value="${A.esc(t)}" readonly></label></div>`, onOpen: (modal) => { const input = modal.querySelector('input'); input.focus(); input.select(); } }); }
  };
  A.acts.wa = () => A.toast('WhatsApp abriria aqui com a mensagem pronta (simulado).');

  /* shell do convidado (celular, escuro, sem login) */
  A.guestShell = (ctx, { active = 'explorar', body, nav = true, top = '' }) => {
    const slug = ctx.params.slug || 'marina-rafael'; const ev = A.data.events.find((e) => e.slug === slug) || A.data.events[0]; A.applyEvent(ev); const b = '#/g/' + ev.slug;
    const dest = (href, id, icone, rotulo) => `<a href="${b}/${href}" class="gnav-d" ${active === id ? 'aria-current="page"' : ''}>${A.icon(icone, 22)}<span>${rotulo}</span></a>`;
    const n = nav ? `<nav class="gnav" aria-label="Navegação do convidado">${dest('explorar', 'explorar', 'grid', 'Explorar')}${dest('album', 'album', 'image', 'Álbum')}<a href="${b}/camera" class="gnav-cam" aria-label="Tirar foto"${active === 'camera' ? ' aria-current="page"' : ''}><span class="shutter" aria-hidden="true"></span></a>${dest('missoes', 'missoes', 'target', 'Missões')}${dest('perfil', 'perfil', 'face', 'Perfil')}</nav>` : '';
    return `<div class="guest-stage" data-theme="noite"><div class="phone" data-theme="noite">${top}<main id="main" tabindex="-1" class="phone-body">${body}</main>${n}</div></div>`;
  };

  /* ---------- posicionador de flutuante: fixed posicionado uma vez descola da ancora quando a pagina rola ---------- */
  /* toda camada ancorada se registra aqui: abrir modal, paleta ou outra camada fecha as anteriores,
     e fechar passa pelo close() da propria camada, que e quem solta os listeners */
  A._flut = new Set();
  A.fecharFlutuantes = () => { [...A._flut].forEach((f) => f()); };

  A.ancorar = (flut, alvo, fechar) => {
    const M = 8, VAO = 4, MIN = 96;
    const rola = /auto|scroll/.test(getComputedStyle(flut).overflowY);
    const tetoCss = parseFloat(getComputedStyle(flut).maxHeight);
    let inicial = true;
    const poe = () => {
      const r = alvo.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) { if (!inicial) return fechar(); }
      /* o lado e escolhido por quem tem mais espaco, e a altura cabe nesse espaco:
         decidir so por "cabe embaixo?" jogava o flutuante para cima e ele cobria a propria ancora */
      const abaixo = innerHeight - r.bottom - VAO - M, acima = r.top - VAO - M;
      const paraBaixo = abaixo >= acima;
      if (rola) flut.style.maxHeight = Math.max(MIN, Math.min(isFinite(tetoCss) ? tetoCss : Infinity, paraBaixo ? abaixo : acima)) + 'px';
      const w = flut.offsetWidth, h = flut.offsetHeight;
      flut.style.left = Math.min(Math.max(M, r.left), Math.max(M, innerWidth - w - M)) + 'px';
      flut.style.top = (paraBaixo ? r.bottom + VAO : Math.max(M, r.top - VAO - h)) + 'px';
    };
    poe(); inicial = false;
    const opts = { passive: true, capture: true };
    addEventListener('scroll', poe, opts); addEventListener('resize', poe, opts);
    /* rolagem e redimensionamento nao cobrem tudo: conteudo que cresce acima da ancora a desloca sem disparar nenhum dos dois */
    const ro = new ResizeObserver(poe);
    [alvo, alvo.offsetParent, A.$('#main'), document.body].forEach((n) => { if (n) try { ro.observe(n); } catch (e) { /* no-op */ } });
    A._flut.add(fechar);
    return () => { removeEventListener('scroll', poe, opts); removeEventListener('resize', poe, opts); ro.disconnect(); A._flut.delete(fechar); };
  };

  /* ---------- grupo de radio em botoes: tabindex rotativo e setas, para qualquer [role=radiogroup] ---------- */
  A.radios = (root) => {
    A.$$('[role=radiogroup]', root || document).forEach((g) => {
      const it = A.$$('[role=radio]', g); if (!it.length) return;
      const m = it.find((b) => b.getAttribute('aria-checked') === 'true') || it[0];
      it.forEach((b) => b.setAttribute('tabindex', b === m ? '0' : '-1'));
    });
    if (A._obsRadio) return;
    A._obsRadio = true;
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const b = e.target.closest && e.target.closest('[role=radio]'); if (!b) return;
      const g = b.closest('[role=radiogroup]'); if (!g) return;
      const it = A.$$('[role=radio]', g).filter((x) => !x.disabled && x.getAttribute('aria-disabled') !== 'true');
      const i = it.indexOf(b); if (i < 0) return;
      const n = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: it.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      const alvo = it[(n + it.length) % it.length];
      alvo.focus(); alvo.click();
    });
  };

  /* ---------- seletor proprio: o <select> nativo continua no DOM para nao quebrar handler nem evento change ---------- */
  A.selects = (root) => {
    A.$$('select:not([data-ds])', root || document).forEach((sel) => {
      if (sel.multiple || sel.size > 1) return;
      sel.dataset.ds = '1';
      const wrap = document.createElement('div'); wrap.className = 'ds-sel';
      sel.classList.forEach((c) => wrap.classList.add(c));
      const estilo = sel.getAttribute('style'); if (estilo) { wrap.setAttribute('style', estilo); sel.removeAttribute('style'); }
      sel.parentNode.insertBefore(wrap, sel); wrap.append(sel);
      sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ds-sel-t';
      btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
      const lab = sel.id && A.$(`label[for="${CSS.escape(sel.id)}"]`);
      if (lab) { if (!lab.id) lab.id = 'lb-' + Math.random().toString(36).slice(2, 8); btn.setAttribute('aria-labelledby', lab.id); }
      else if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
      else { const env = sel.closest('label'); if (env) { const c = env.cloneNode(true); c.querySelectorAll('select').forEach((x) => x.remove()); const t = c.textContent.replace(/\s+/g, ' ').trim(); if (t) btn.setAttribute('aria-label', t); } }
      const sinc = () => { btn.disabled = sel.disabled; };
      const pinta = () => { const o = sel.options[sel.selectedIndex]; btn.innerHTML = `<span class="ds-sel-v">${A.esc(o ? o.text : '')}</span>${A.icon('chevdown', 18)}`; };
      pinta(); sinc(); wrap.append(btn);
      sel.addEventListener('change', () => { pinta(); sinc(); });
      new MutationObserver(sinc).observe(sel, { attributes: true, attributeFilter: ['disabled'] });
      let pop = null, solta = null;
      const fecha = (devolve) => { if (!pop) return; solta && solta(); solta = null; pop.remove(); pop = null; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', fora, true); document.removeEventListener('keydown', tecla, true); if (devolve) btn.focus(); };
      const fora = (e) => { if (pop && !pop.contains(e.target) && e.target !== btn) fecha(); };
      const itens = () => (pop ? A.$$('button', pop) : []);
      const tecla = (e) => {
        if (!pop) return; const l = itens(); const i = l.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecha(true); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (l[i + 1] || l[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (l[i - 1] || l[l.length - 1]).focus(); }
        else if (e.key === 'Home') { e.preventDefault(); l[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); l[l.length - 1].focus(); }
        else if (e.key === 'Tab') { fecha(true); }   /* sem preventDefault: fecha, devolve o foco ao gatilho e o Tab segue dali */
      };
      const abre = () => {
        if (sel.disabled) return;
        if (pop) return fecha(true);
        pop = document.createElement('div'); pop.className = 'ds-sel-pop'; pop.setAttribute('role', 'listbox');
        if (btn.getAttribute('aria-labelledby')) pop.setAttribute('aria-labelledby', btn.getAttribute('aria-labelledby'));
        pop.innerHTML = [...sel.options].map((o, i) => `<button type="button" role="option" data-i="${i}" aria-selected="${i === sel.selectedIndex}"><span class="ds-sel-c">${i === sel.selectedIndex ? A.icon('check', 16) : ''}</span><span class="grow">${A.esc(o.text)}</span></button>`).join('');
        document.body.append(pop);
        pop.style.setProperty('--ds-sel-w', Math.max(220, btn.getBoundingClientRect().width) + 'px');
        btn.setAttribute('aria-expanded', 'true');
        solta = A.ancorar(pop, btn, () => fecha());
        pop.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; sel.selectedIndex = +b.dataset.i; sel.dispatchEvent(new Event('change', { bubbles: true })); pinta(); fecha(true); });
        document.addEventListener('mousedown', fora, true); document.addEventListener('keydown', tecla, true);
        (itens()[sel.selectedIndex] || itens()[0])?.focus();
      };
      btn.addEventListener('click', abre);
      btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abre(); } });
    });
  };

  /* ---------- re-render parcial de modulo recria <select> cru; o observador reaplica a melhoria ---------- */
  A.observarSelects = () => {
    const raiz = A.$('#root'); if (!raiz || A._obsSel) return;
    let agendado = false;
    A._obsSel = new MutationObserver((muts) => {
      if (agendado) return;
      if (!muts.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches('select') || n.querySelector('select:not([data-ds])'))))) return;
      agendado = true; setTimeout(() => { agendado = false; A.selects(raiz); });
    });
    A._obsSel.observe(raiz, { childList: true, subtree: true });
  };

  /* ---------- roteador ---------- */
  A.route = (pattern, handler, opts = {}) => {
    const keys = []; const re = new RegExp('^' + pattern.replace(/\/:([^/]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    A._routes.push({ re, keys, handler, opts, pattern });
  };
  A.map = (group, label, href, note = '') => A._map.push({ group, label, href, note });
  A.after = (fn) => A._after.push(fn);
  A.go = (h) => { location.hash = h; };
  const parse = () => { const raw = location.hash.replace(/^#/, '') || '/'; const [path, qs] = raw.split('?'); return { path: path.replace(/\/+$/, '') || '/', q: Object.fromEntries(new URLSearchParams(qs || '')) }; };
  A.render = () => {
    A.applyTheme(); // o tema volta ao escolhido antes de qualquer rota desenhar; quem precisa de outro (console) sobrescreve no proprio handler
    const { path, q } = parse(); const root = A.$('#root'); document.body.classList.remove('wall-mode'); A.fecharFlutuantes(); A.$$('.scrim,.modal,.menu,.palette,.ds-sel-pop,.gx-tray').forEach((x) => x.remove()); stack.length = 0; A._after = [];
    for (const r of A._routes) {
      const m = path.match(r.re); if (!m) continue; const params = {}; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      const ctx = { params, q, path };
      let out; try { out = r.handler(ctx); } catch (err) { console.error(err); out = `<main class="page"><div class="empty" role="alert"><h1 class="t-title">Erro de protótipo nesta tela</h1><p>${A.esc(err.message)}</p><a class="btn btn-line" href="#/">Voltar ao mapa</a></div></main>`; }
      const html = typeof out === 'string' ? out : out.html; root.innerHTML = html; document.title = (out.title ? out.title + ' · ' : '') + 'Albora (protótipo)';
      const main = A.$('#main'); if (main) { main.scrollTop = 0; } window.scrollTo(0, 0); A.selects(root); A.observarSelects(); A.radios(root); A._after.forEach((f) => f(root)); out.after && out.after(root);
      if (A._lastPath !== path) { (A.$('h1', root) || main)?.setAttribute('tabindex', '-1'); (A.$('h1', root) || main)?.focus({ preventScroll: true }); A._lastPath = path; }
      return;
    }
    root.innerHTML = `<main class="page narrow" id="main"><div class="empty"><h1 class="t-display">Esta rota não existe no protótipo</h1><p>${A.esc(path)}</p><a class="btn btn-primary" href="#/">Abrir o mapa do protótipo</a></div></main>`;
  };
  window.addEventListener('hashchange', A.render);

  /* ---------- delegação de eventos ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return; const fn = A.acts[el.dataset.act]; if (fn) { if (el.tagName === 'A' && el.dataset.act !== 'skip') e.preventDefault(); fn(el, e, el.dataset); }
  });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-input]'); if (el && A.inputs[el.dataset.input]) A.inputs[el.dataset.input](el, e, el.dataset); });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-change]'); if (el && A.inputs[el.dataset.change]) A.inputs[el.dataset.change](el, e, el.dataset); });
  document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-submit]'); if (f) { e.preventDefault(); const fn = A.acts[f.dataset.submit]; fn && fn(f, e, f.dataset); } });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    const top = stack[stack.length - 1]; if (!top) return;
    if (e.key === 'Escape') { top.close(); return; }
    if (e.key === 'Tab') { const f = A.$$(FOC, top.el).filter((x) => x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });
  window.addEventListener('scroll', () => A.$('#topbar')?.classList.toggle('scrolled', scrollY > 4), { passive: true });
  /* abas e chips genéricos */
  A.acts.tab = (el) => { const g = el.closest('[role=tablist]'); A.$$('[role=tab]', g).forEach((t) => t.setAttribute('aria-selected', t === el)); const p = el.dataset.panel; A.$$('[data-tabpanel]', g.parentElement).forEach((x) => (x.hidden = x.dataset.tabpanel !== p)); };
  A.acts.toggle = (el) => { const on = el.getAttribute('aria-checked') !== 'true'; el.setAttribute('aria-checked', on); if (el.dataset.toast) A.toast(on ? el.dataset.toast : el.dataset.toastOff || 'Desativado.'); };
  A.acts.chip = (el) => { const single = el.closest('.chips')?.dataset.single; if (single) A.$$('.chip', el.closest('.chips')).forEach((c) => c.setAttribute('aria-pressed', c === el)); else el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true'); };

  /* ---------- barra do protótipo ---------- */
  A.acts.proto = () => {
    const ex = A.$('.proto-panel'); if (ex) { A.$('.proto-bar>button').setAttribute('aria-expanded','false'); return ex.remove(); } const s = A.sim(); const p = document.createElement('div'); p.className = 'proto-panel'; p.setAttribute('role', 'group'); p.setAttribute('aria-label', 'Controles do protótipo');
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="setsim" data-k="${k}" data-v="${v}" aria-pressed="${s[k] === v}">${l}</button>`).join('')}</div>`;
    p.innerHTML = `<div><div class="lbl">Fase da festa</div>${seg('phase', [['antes', 'Antes'], ['durante', 'Durante'], ['depois', 'Depois']])}</div><div><div class="lbl">Papel</div>${seg('role', [['owner', 'Dono'], ['couple', 'Casal'], ['planner', 'Cerimonialista']])}</div><div><div class="lbl">Estado das listas</div>${seg('state', [['ok', 'Normal'], ['loading', 'Carregando'], ['empty', 'Vazio'], ['error', 'Erro']])}</div><div><div class="lbl">Tema do painel</div>${seg('theme', [['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']])}</div><div class="flex between"><a href="#/">Mapa do protótipo</a><button class="seg" style="all:unset;cursor:pointer;text-decoration:underline" data-act="reset">Reiniciar dados</button></div>`;
    A.$('.proto-bar').append(p); A.$('.proto-bar>button').setAttribute('aria-expanded','true');
  };
  A.acts.setsim = (el) => { A.store.set(el.dataset.k, el.dataset.v); A.applyTheme(); const open = !!A.$('.proto-panel'); A.render(); if (open) A.acts.proto(); };
  A.acts.reset = () => { A.store.reset(); A.applyTheme(); A.toast('Dados do protótipo reiniciados.'); A.render(); };

  /* ---------- mapa do protótipo (home) ---------- */
  A.route('/', () => {
    document.documentElement.style.setProperty('--ev', 'var(--ambar)'); const groups = {}; A._map.forEach((m) => (groups[m.group] = groups[m.group] || []).push(m));
    return `<main id="main" class="page" tabindex="-1"><div class="page-head"><span class="t-label">Protótipo navegável · redesign 2026-10</span><h1 class="t-display">Albora, de ponta a ponta</h1><p class="t-lead" style="max-width:62ch">Quatro superfícies, dados fictícios, tudo salvo no seu navegador. Use o botão <b>Protótipo</b> (canto inferior direito) para trocar a fase da festa, o papel, o estado das listas e o tema.</p></div><div class="grid g2">${Object.entries(groups).map(([g, items]) => `<section class="outline"><h2 class="t-title" style="margin-bottom:8px">${A.esc(g)}</h2><div class="list">${items.map((i) => `<a class="li" href="${i.href}"><span class="grow"><b>${A.esc(i.label)}</b>${i.note ? `<span class="t-small" style="display:block">${A.esc(i.note)}</span>` : ''}</span>${A.icon('chevron', 16)}</a>`).join('')}</div></section>`).join('')}</div></main>`;
  });

  /* ---------- boot ---------- */
  A.boot = () => {
    A.applyTheme(); A.palette.add(() => A._map.map((m) => ({ group: m.group, label: m.label, icon: 'arrow', go: m.href, hint: m.note })));
    const bar = document.createElement('div'); bar.className = 'proto-bar'; bar.innerHTML = `<button data-act="proto" aria-haspopup="true" aria-expanded="false" aria-label="Controles do protótipo (somente demonstração)" title="Controles do protótipo (somente demonstração)">Protótipo</button>`; document.body.append(bar);
    if (!location.hash) location.hash = '#/'; A.render();
  };
})();
