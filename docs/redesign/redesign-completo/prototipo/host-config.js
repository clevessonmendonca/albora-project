/* host-config — Estilo, Compartilhar (convite, peças, telão), Ajustes, Comunidade, Inspiração, Ajuda.
   Tudo persiste em A.store (chaves "hc:*"). Estilos com prefixo .hc- . Sem hex neste arquivo. */
(function () {
  const A = window.A; if (!A) return;
  const S = A.store, $ = A.$, $$ = A.$$, esc = A.esc;
  const evOf = (id) => A.data.events.find((e) => e.id === id) || A.data.events[0];
  const K = (n, id) => `hc:${n}:${id}`;
  const curId = () => (location.hash.match(/\/h\/e\/([^/]+)/) || [])[1] || S.get('hc:last', 'e1');
  const role = () => A.sim().role;
  const canEdit = () => role() !== 'planner';
  const baseOf = (id) => A.hostBase(id);
  const roman = (n) => { let s = ''; for (const [v, r] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
  const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const fmtDT = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fmtD = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  /* ---------- estado e hidratação ---------- */
  const ESTILO_MAP = {
    editorial: { ff: 'var(--font-display)', r: '4px', w: 350 }, minimal: { ff: 'var(--font-body)', r: '0px', w: 560 },
    contemporaneo: { ff: 'var(--font-body)', r: '18px', w: 600 }, fotografico: { ff: 'var(--font-display)', r: '10px', w: 380 }, classic: { ff: 'var(--font-display)', r: '2px', w: 420 },
  };
  const defEstilo = (id) => {
    const ev = evOf(id); const ci = A.data.combos.findIndex((c) => c[1].toLowerCase() === String(ev.cor).toLowerCase());
    const est = A.data.estilos.find((s) => s.nome === ev.estilo) || A.data.estilos[0];
    return { estilo: est.id, combo: ci < 0 ? 0 : ci, custom: false, customCor: ev.cor };
  };
  const getEstilo = (id) => Object.assign(defEstilo(id), S.get(K('estilo', id), {}));
  const cores = (id) => { const e = getEstilo(id); if (e.custom) return [e.customCor, e.customCor]; const c = A.data.combos[e.combo] || A.data.combos[0]; return [c[1], c[2]]; };
  const applyEstiloToEvent = (id) => { const ev = evOf(id); const e = getEstilo(id); const [c1, c2] = cores(id); ev.cor = c1; ev.cor2 = c2; ev.estilo = (A.data.estilos.find((s) => s.id === e.estilo) || {}).nome || ev.estilo; };
  const missBase = (id) => (id === 'e1' ? A.data.missions : A.data.missions.slice(0, 8)).map((m, i) => ({ id: m.id, titulo: m.titulo, on: id === 'e1' ? m.on : i < 6, fotos: m.fotos || 0 }));
  const getMiss = (id) => S.get(K('miss', id)) || missBase(id);
  const syncMiss = (id, list) => { if (id !== 'e1') return; let n = 0; A.data.missions.splice(0, A.data.missions.length, ...list.map((m) => ({ id: m.id, titulo: m.titulo, on: m.on, fotos: m.fotos || 0, romano: m.on ? roman(++n) : '' }))); };
  const setMiss = (id, list) => { S.set(K('miss', id), list); syncMiss(id, list); };
  const getGate = (id) => S.get(K('gate', id), { modo: 'apos', momento: 'Cerimônia' });
  const gateLabel = (g) => (g.modo === 'apos' ? `depois de “${g.momento}”` : g.modo === 'chegada' ? 'assim que a pessoa entra' : 'quando você abrir');
  const getMenores = (id) => S.get(K('menores', id), id === 'e1');
  const getModelos = (id) => S.get(K('modelos', id), id === 'e3' ? ['polaroide'] : ['polaroide', 'mural']);
  const getRecado = (id) => Object.assign({ texto: '', quando: 'manual', audio: 0, audioOk: false }, S.get(K('recado', id), {}));
  const dataEv = (id) => (S.get(K('evento', id), {}).data) || (() => { const w = A.when(id); if (w.semData) return ''; return new Date(new Date('2026-11-14T12:00:00').getTime() + w.days * 86400000).toISOString().slice(0, 10); })();
  A.data.events.forEach((ev) => {
    const o = S.get(K('evento', ev.id)); if (o) ['nome', 'local', 'hora', 'tipo', 'esperados'].forEach((f) => { if (o[f] != null) ev[f] = o[f]; });
    if (S.get(K('estilo', ev.id))) applyEstiloToEvent(ev.id);
  });
  { const m = S.get(K('miss', 'e1')); if (m) syncMiss('e1', m); const tm = S.get('hc:team'); if (tm) A.data.team.splice(0, A.data.team.length, ...tm); }

  /* ---------- cores e contraste: motor central (A.contrast / A.theme), nada de cálculo próprio ---------- */
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); // --papel e --tinta são declarados como hex em ds.css
  const r1 = (n) => n.toFixed(1).replace('.', ',');
  const mixHex = (a, b, t) => { const c = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = c(a), y = c(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const groundOf = () => { const t = A.sim().theme; return t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'noite' : 'papel'; };

  /* ---------- helpers de UI ---------- */
  let tt; const saved = (m = 'Alterações salvas.') => { clearTimeout(tt); tt = setTimeout(() => A.toast(m), 450); };
  const rerender = () => { const y = scrollY; const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k; A.render(); scrollTo(0, y); if (f) { const el = $(`[data-k="${f}"]`); el && el.focus({ preventScroll: true }); } };
  const exclusivo = (id) => { const g = A.data.planos.find((x) => x.id === 'gratis'), c = A.data.planos.find((x) => x.id === 'completo'); return evOf(id).plano === 'gratis' && g && c && /4 modelos/.test(c.itens.join(' ')) && !/4 modelos/.test(g.itens.join(' ')); };
  const nudge = (id, ctx) => (exclusivo(id) && A.plan && A.plan.nudge ? A.plan.nudge(ctx) || '' : '');
  const sw = (on, act, label, extra = '') => `<button class="switch hc-sw" type="button" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-act="${act}" ${extra}></button>`;
  const sec = (id, title, lead, body, extra = '') => `<section class="hc-sec" id="${id}" aria-labelledby="${id}-h"><div class="hc-sec-h"><h2 class="hc-h2" id="${id}-h">${esc(title)}</h2>${extra}</div>${lead ? `<p class="hc-sec-p">${lead}</p>` : ''}${body}</section>`;
  const pageHd = (title, lead) => `<header class="hc-head"><h1 class="hc-h1">${esc(title)}</h1>${lead ? `<p class="hc-lead">${lead}</p>` : ''}</header>`;
  const roBanner = (txt) => (canEdit() ? '' : `<div class="hc-bn lock" role="note">${A.icon('lock', 18)}<span>${txt}</span></div>`);
  const phaseBanner = (id, antes, durante, depois) => { const p = A.when(id).phase; const t = p === 'antes' ? antes : p === 'durante' ? durante : depois; return t ? `<div class="hc-bn" role="note">${A.icon('info', 18)}<span>${t}</span></div>` : ''; };
  const stFull = (id, ok, extra = {}) => A.stateful(Object.assign({ ok, empty: typeof ok === 'function' ? ok() : ok, loading: A.skel(5, 64) }, extra));
  const store = (n) => ({ get: (d) => S.get(n, d), set: (v) => S.set(n, v) });
  A.acts['hc-goto'] = (el) => { const t = document.getElementById(el.dataset.t); if (t && t.tagName === 'DETAILS') t.open = true; t && (t.scrollIntoView({ behavior: 'smooth', block: 'start' }), t.querySelector('h2')?.setAttribute('tabindex', '-1'), t.querySelector('h2')?.focus({ preventScroll: true })); };

  /* ---------- CSS ---------- */
  const css = document.createElement('style'); css.id = 'hc-style';
  css.textContent = `
/* mobile-first: a base vale de 320 para cima; min-width só acrescenta */
.hc-head{display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-8)}
.hc-h1{font:350 var(--fs-display)/1.08 var(--font-display);letter-spacing:-.015em;margin:0;text-wrap:balance}
.hc-lead{color:var(--fg-2);max-width:var(--measure);margin:0;font-size:var(--fs-lg)}
.hc-h2{font:400 var(--fs-xl)/1.25 var(--font-display);letter-spacing:-.01em;margin:0}
.hc-h3{font:600 var(--fs-md)/1.35 var(--font-body);margin:0}
.hc-sec{padding:var(--space-8) 0;border-top:1px solid var(--line)}
.hc-ed-l>.hc-sec:first-of-type,.hc-aj-panel .hc-sec:first-of-type,.hc-help .hc-sec:first-of-type{border-top:0;padding-top:var(--space-4)}
.hc-sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-2)}
.hc-sec-h:not(:has(+ .hc-sec-p)){margin-bottom:var(--space-5)}
.hc-sec-p{color:var(--fg-2);max-width:var(--measure);margin:0 0 var(--space-5)}
.hc-note{font-size:var(--fs-sm);color:var(--fg-3);margin:0} .hc-ok{color:var(--positivo)} .hc-bad{color:var(--crit-text)} .hc-acc{color:var(--accent-text)}
.hc-note+.hc-note,.hc-note+.hc-sec-p{margin-top:var(--space-2)}
.hc-gap-3{margin-top:var(--space-3)} .hc-gap-5{margin-top:var(--space-5)} .hc-gap-6{margin-top:var(--space-6)}
.hc-bn{display:flex;gap:var(--space-3);align-items:flex-start;padding:var(--space-3) 0;margin-bottom:var(--space-4);border-top:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--fg-2);font-size:var(--fs-sm)}
.hc-bn svg{flex:none;color:var(--accent-text)} .hc-bn ul{margin:var(--space-2) 0 0;padding-left:var(--space-5)}
.hc-bn.lock svg{color:var(--fg-3)}
/* alvos e estados: um só jeito para tudo que é botão de texto do módulo */
.hc-tl,.hc-seg button,.hc-spec,.hc-pal-i,details.hc-d>summary,.hc-aj-nav a{transition:color var(--dur-1) var(--ease),border-color var(--dur-1) var(--ease),background-color var(--dur-1) var(--ease),transform var(--dur-1) var(--ease)}
.hc-tl:active,.hc-seg button:active,.hc-spec:active,.hc-pal-i:active,.hc-ib:active{transform:scale(.977)}
.hc-tl:disabled,.hc-seg button:disabled,.hc-spec:disabled,.hc-pal-i:disabled{opacity:.45}
.hc-toc{display:flex;gap:var(--space-1) var(--space-5);flex-wrap:wrap;margin-bottom:var(--space-3)}
.hc-tl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;background:none;border:0;padding:0;min-height:44px;color:var(--fg-2);font-size:var(--fs-sm);text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:5px} .hc-tl:hover{color:var(--fg);text-decoration-color:var(--ac)}
.hc-seg{display:flex;gap:var(--space-1) var(--space-5);flex-wrap:wrap}
.hc-seg button{min-width:44px;background:none;border:0;border-bottom:2px solid transparent;padding:var(--space-2) var(--space-1);min-height:44px;color:var(--fg-3);font-weight:500}
.hc-seg button:hover{color:var(--fg)} .hc-seg button[aria-pressed="true"]{color:var(--fg);border-bottom-color:var(--ac)}
.hc-ib{min-width:44px;min-height:44px;padding:0} .hc-sw{position:relative} .hc-sw::before{content:"";position:absolute;inset:calc(var(--space-2) * -1) 0}
.hc-row{flex-wrap:wrap;display:flex;gap:var(--space-2) var(--space-4);align-items:center;justify-content:space-between;padding:var(--space-4) 0;border-bottom:1px solid var(--line-2)} .hc-row:last-child{border-bottom:0}
.hc-row>div:first-child{min-width:0;flex:1 1 12rem;overflow-wrap:anywhere}
.hc-form .check,.hc-sec .check{padding:var(--space-3) 0}
#hc-ctr li{display:flex;gap:var(--space-2);align-items:flex-start} #hc-ctr svg{flex:none;margin-top:var(--space-1)}
.hc-seal{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-2)}
.hc-seal li{display:flex;gap:var(--space-2);align-items:flex-start;font-size:var(--fs-sm)} .hc-seal svg{flex:none;margin-top:2px}
.hc-seal-sw{display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-4);font-size:var(--fs-sm);color:var(--fg-2)}
.hc-sw-dot{width:28px;height:28px;border-radius:50%;border:1px solid var(--control);flex:none}
/* estilo: editor + prévia */
.hc-ed{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-5);align-items:start}
.hc-ed-r{display:none}
.hc-prevbtn{display:flex;margin-bottom:var(--space-3)}
@media(min-width:1000px){.hc-ed{grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:var(--space-8)}.hc-ed-r{display:block;position:sticky;top:var(--space-16)}.hc-prevbtn{display:none}}
.hc-specs{display:flex;flex-direction:column;border-top:1px solid var(--line-2)}
.hc-spec{display:flex;align-items:center;gap:var(--space-4);width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line-2);padding:var(--space-2) 0;min-height:64px;color:var(--fg)}
.hc-spec .aa{font-size:var(--fs-title);line-height:1;width:var(--space-12);flex:none;text-align:center} .hc-spec:hover b{text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:4px}
.hc-pip{width:12px;height:12px;border-radius:50%;border:1px solid var(--control);flex:none} .hc-spec[aria-checked="true"] .hc-pip,.hc-pal-i[aria-checked="true"] .hc-pip,.hc-pal-i[aria-pressed="true"] .hc-pip{background:var(--ac);border-color:var(--ac)} .hc-spec[aria-checked="true"] b{font-weight:600}
.hc-pal{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,10rem),1fr));gap:0 var(--space-4)}
.hc-pal-i{display:flex;align-items:center;gap:var(--space-3);background:none;border:0;border-bottom:1px solid var(--line-2);padding:var(--space-2) 0;min-height:48px;text-align:left;font-size:var(--fs-sm);color:var(--fg-2)} .hc-pal-i:hover{color:var(--fg)} .hc-pal-i[aria-checked="true"],.hc-pal-i[aria-pressed="true"]{color:var(--fg);font-weight:600} .hc-pal-i .hc-pip{margin-left:auto}
.hc-dots{display:inline-flex;gap:var(--space-1);flex:none} .hc-dots i{width:20px;height:20px;border-radius:50%;border:1px solid var(--control)}
.hc-cor{width:100%;height:48px;border:1px solid var(--control);border-radius:var(--r-1);background:transparent;padding:var(--space-1)}
.hc-sec{padding:var(--space-6);margin-top:var(--space-4);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hc-specs{border-top:0;gap:var(--space-2)}
.hc-spec{padding:var(--space-3) var(--space-4);border:1px solid var(--line-2);border-radius:var(--r-3);background:var(--bg)}
.hc-spec[aria-checked="true"],.hc-pal-i[aria-checked="true"],.hc-pal-i[aria-pressed="true"]{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 10%,var(--bg))}
.hc-pal{gap:var(--space-2)}
.hc-pal-i{padding:0 var(--space-4);border:1px solid var(--line-2);border-radius:var(--r-pill);background:var(--bg)}
.hc-cor{border-radius:var(--r-3)}
details.hc-fold.ds-fold:not(.in){margin-top:var(--space-2);padding:var(--space-1) var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hc-mis{padding:var(--space-3) var(--space-4);margin-bottom:var(--space-2);border:1px solid var(--line-2);border-radius:var(--r-3);background:var(--bg)}
.hc-mis{display:grid;grid-template-columns:2.75rem minmax(0,1fr);gap:var(--space-1) var(--space-3);align-items:center;padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);list-style:none}
.hc-mis .rom{white-space:nowrap;font:380 var(--fs-xl) var(--font-display);color:var(--accent-text);text-align:center} .hc-mis.off .rom,.hc-mis.off .ti{color:var(--fg-3)}
.hc-mis .acts{grid-column:1/-1;display:flex;align-items:center;gap:0;flex-wrap:wrap;justify-content:flex-end}
@media(min-width:640px){.hc-mis{grid-template-columns:2.75rem minmax(0,1fr) auto}.hc-mis .acts{grid-column:auto}}
.hc-ol{margin:0;padding:0}
.hc-add{margin-top:var(--space-5)}
.hc-stage{background:var(--surface);border-radius:var(--r-3);padding:var(--space-4);display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-5);align-items:center;justify-items:center}
@media(min-width:700px){.hc-stage{grid-template-columns:minmax(0,15rem) minmax(0,1fr);padding:var(--space-5);justify-items:stretch}}
.hc-stage-r{display:flex;flex-direction:column;gap:var(--space-4);min-width:0;width:100%}
.hc-fig{margin:0;display:flex;flex-direction:column;gap:var(--space-2);min-width:0;width:100%} .hc-fig figcaption{font-size:var(--fs-xs);color:var(--fg-3)}
.hc-title{font-family:var(--hc-ff);font-weight:var(--hc-w);letter-spacing:-.01em;line-height:1.1}
.hc-sm{font-size:var(--fs-xs);color:var(--fg-3)} .hc-lab{font:500 var(--fs-xs)/1.2 var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3)}
.hc-ph{width:100%;max-width:15rem;margin:0 auto;aspect-ratio:9/17;background:var(--bg);color:var(--fg);border-radius:var(--r-3);overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--line)}
.hc-ph-cov{height:40%;flex:none;background:var(--surface-2)} .hc-ph-cov img{width:100%;height:100%;object-fit:cover}
.hc-ph-b{padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);flex:1;min-height:0}
.hc-ph .hc-title{font-size:var(--fs-xl)} .hc-ph .hc-title::after,.hc-tv .cap b::after,.hc-al .hc-title::after{content:"";display:block;width:var(--space-8);height:2px;background:var(--ac);margin-top:var(--space-2)}
.hc-fb{margin-top:auto;display:flex;justify-content:center;align-items:center;min-height:44px;background:var(--ac);color:var(--on-ac);border-radius:var(--r-pill);font-size:var(--fs-sm);font-weight:500}
.hc-mi{font-size:var(--fs-xs);color:var(--fg-2)} .hc-mi b{color:var(--accent-text);font-family:var(--font-display);font-weight:500;margin-right:var(--space-1)}
.hc-tv{aspect-ratio:16/9;background:var(--noite);color:var(--papel);border-radius:var(--r-2);position:relative;overflow:hidden}
.hc-tv .cap{position:absolute;left:var(--space-3);bottom:var(--space-2);font-size:var(--fs-xs);z-index:3} .hc-tv .cap b{font-family:var(--hc-ff);font-weight:var(--hc-w);font-size:var(--fs-sm);display:block}
.hc-tv img{width:100%;height:100%;object-fit:contain;display:block;background:var(--noite)}
.hc-pol{position:absolute;background:var(--papel);padding:var(--space-1) var(--space-1) var(--space-3);border-radius:calc(var(--hc-r)/2);width:21%;aspect-ratio:4/5} .hc-pol img{background:var(--surface-2)}
.hc-mural{position:absolute;inset:var(--space-2) var(--space-2) var(--space-8);display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);gap:var(--space-1)}
.hc-mural>*{border-radius:calc(var(--hc-r)/2);overflow:hidden;background:var(--surface-2)}
.hc-col{position:absolute;overflow:hidden;border:3px solid var(--papel);border-radius:calc(var(--hc-r)/3)} .hc-dumpg{position:absolute;inset:var(--space-2) var(--space-2) var(--space-8);display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(3,1fr);gap:var(--space-1)}
.hc-dumpg>div{overflow:hidden;background:var(--surface-2);border-radius:var(--space-1)}
.hc-al{background:var(--bg);border-radius:var(--r-2);padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);border:1px solid var(--line-2)} .hc-al .hc-title{font-size:var(--fs-lg)}
.hc-alg{display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-1)} .hc-alg .ph{aspect-ratio:4/5;border-radius:var(--hc-r);overflow:hidden;background:var(--surface-2)} .hc-alg img{width:100%;height:100%;object-fit:cover}
.hc-prevnote{margin-top:var(--space-3)}
/* compartilhar */
.hc-cs{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-5);align-items:start}
@media(min-width:1000px){.hc-cs{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-8)}}
.hc-pstage{--ph:min(17.5rem,42dvh);background:var(--surface);border-radius:var(--r-3);padding:var(--space-4);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);min-height:var(--ph)}
@media(min-width:700px){.hc-pstage{--ph:min(27.5rem,64dvh);padding:var(--space-6);gap:var(--space-4)}}
.hc-nudge{margin-top:var(--space-4);font-size:var(--fs-sm);color:var(--fg-2);max-width:var(--measure)} .hc-top{align-items:flex-start} .hc-sec-h .link{display:inline-flex;align-items:center;min-height:44px} .hc-bar .search input,.hc-gl-s input{min-height:44px} .hc-self{align-self:flex-start} .hc-tight{margin-bottom:var(--space-2)} .hc-strong{color:var(--fg)} .hc-gap-2{margin-top:var(--space-2)} .hc-h-gap{margin-bottom:var(--space-3)} .hc-bot{align-items:flex-end} .hc-q{min-width:min(100%,15rem)}
.hc-pfig{margin:0;display:flex;flex-direction:column;align-items:center;gap:var(--space-3);width:100%}
.hc-paper{--fg:var(--tinta);--fg-2:color-mix(in srgb,var(--tinta) 78%,var(--papel));--fg-3:color-mix(in srgb,var(--tinta) 62%,var(--papel));--qr-bg:var(--papel);container-type:inline-size;width:min(100%,calc(var(--ph) * var(--pa)));aspect-ratio:var(--pa);background:var(--papel);color:var(--tinta);display:grid;place-items:center;border:1px solid var(--line);border-radius:2px;box-shadow:0 1px 2px color-mix(in srgb,var(--tinta) 12%,transparent),0 12px 24px -16px color-mix(in srgb,var(--tinta) 30%,transparent)}
.hc-pp{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);text-align:center;padding:6cqw;max-width:100%;max-height:100%;min-width:0}
.hc-pn{font-family:var(--font-display);font-weight:400;line-height:1.1;letter-spacing:-.01em;text-wrap:balance;font-size:clamp(14px,8.5cqw,44px)}
.hc-pn::after{content:"";display:block;width:6cqw;height:2px;background:var(--ac);margin:var(--space-2) auto 0}
.hc-p2{font-size:clamp(12px,5cqw,20px);color:var(--fg-2)} .hc-p3{font-size:clamp(12px,4.6cqw,18px)} .hc-p4{font-size:clamp(12px,3.6cqw,16px);color:var(--fg-3);overflow-wrap:anywhere}
.hc-pq{width:min(90cqw,var(--qw));max-width:60%;aspect-ratio:1} .hc-pq svg{width:100%;height:100%;display:block}
.hc-qr{display:inline-block;padding:var(--space-2);border-radius:var(--r-1);color:var(--tinta);--fg:var(--tinta);background:var(--papel);--qr-bg:var(--papel);border:1px solid var(--line)}
.hc-qr.tr{--qr-bg:transparent;background:repeating-conic-gradient(color-mix(in srgb,var(--tinta) 14%,var(--papel)) 0 25%,var(--papel) 0 50%) 0 0/16px 16px}
.hc-ctl{display:flex;flex-direction:column;gap:var(--space-5)}
.hc-inl{display:flex;gap:var(--space-5);flex-wrap:wrap;align-items:flex-end} .hc-inl .field{min-width:0;flex:1 1 9rem}
.hc-live{display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-6)} .hc-live>div:nth-child(2){flex:1;min-width:min(100%,12rem)} .hc-live-a{display:flex;gap:var(--space-2);flex-wrap:wrap}
.hc-disc{width:14px;height:14px;border-radius:50%;background:var(--atencao);flex:none} .hc-live.on .hc-disc{background:var(--positivo)}
.hc-meth{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6)} .hc-meth>div+div{border-top:1px solid var(--line);padding-top:var(--space-6)}
@media(min-width:800px){.hc-meth{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-12)}.hc-meth>div+div{border-top:0;padding-top:0;border-left:1px solid var(--line);padding-left:var(--space-12)}}
.hc-code{font:400 var(--fs-hero)/1 var(--font-display);letter-spacing:.18em;font-variant-numeric:tabular-nums}
.hc-hist{list-style:none;margin:0;padding:0} .hc-hist li{display:flex;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--line-2);font-size:var(--fs-sm)} .hc-hist time{color:var(--fg-3);min-width:6rem;flex:none;font-variant-numeric:tabular-nums}
.hc-hist.tight{margin-top:var(--space-5)}
.hc-wa{max-width:var(--measure)}
.hc-linkrow{display:flex;align-items:center;gap:var(--space-2)} .hc-linkrow code{flex:1;min-width:0;font-size:var(--fs-sm)}
.hc-kit .grow{flex:1 1 12rem;min-width:0} .hc-kit{display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-4);border-top:1px solid var(--line-2);padding-top:var(--space-4)}
/* ajustes: leitura de documento */
.hc-aj{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6)} .hc-aj-side{align-self:start}
.hc-aj-side .hc-h2{font-size:var(--fs-title)}
.hc-aj-nav{display:flex;flex-direction:column;margin-top:var(--space-4);border-top:1px solid var(--line-2)}
.hc-aj-nav a{display:flex;align-items:center;gap:var(--space-3);min-height:48px;border-bottom:1px solid var(--line-2);color:var(--fg-2);text-decoration:none;font-size:var(--fs-md)} .hc-aj-nav a:hover{color:var(--fg)}
.hc-aj-nav a::before{content:"";width:8px;height:8px;border-radius:50%;flex:none;background:transparent;display:none} .hc-aj-nav a[aria-current="page"],.hc-aj-nav a.is-sel{color:var(--fg);font-weight:600} .hc-aj-nav .chev{display:inline-flex;margin-left:auto}
.hc-aj-panel{max-width:var(--w-narrow);min-width:0}
.hc-aj-panel>.hc-h1{margin-bottom:var(--space-4)}
.hc-aj.has-sec .hc-aj-side{display:none} .hc-aj:not(.has-sec) .hc-aj-panel{display:none}
.hc-aj-back{display:inline-flex;margin-bottom:var(--space-4)}
@media(min-width:760px){.hc-aj{grid-template-columns:12.5rem minmax(0,1fr);gap:var(--space-8)}.hc-aj-side{position:sticky;top:var(--space-16)}.hc-aj.has-sec .hc-aj-side,.hc-aj:not(.has-sec) .hc-aj-panel{display:block}.hc-aj-back{display:none}.hc-aj-nav .chev{display:none}.hc-aj-nav a::before{display:block}}
.hc-doc .field{padding:var(--space-2) 0}
@media(min-width:760px){.hc-doc .field{display:grid;grid-template-columns:11.25rem minmax(0,1fr);column-gap:var(--space-5);align-items:center}.hc-doc .field>label{grid-column:1;grid-row:1}.hc-doc .field>.input,.hc-doc .field>.select,.hc-doc .field>.textarea{grid-column:2;grid-row:1}.hc-doc .field>.hint,.hc-doc .field>.err{grid-column:2;margin-top:var(--space-1)}.hc-doc .field>span:empty{display:none}.hc-doc .field>.textarea{align-self:start}}
.hc-doc .grid.g2{display:block}
.hc-doc-act{padding-top:var(--space-3)}
.hc-warn{margin:var(--space-3) 0}
.hc-danger{border-top:1px solid var(--brasa);padding-top:var(--space-6);margin-top:var(--space-6)}
details.hc-d .body{color:var(--fg-2);max-width:var(--measure)}
.hc-faq{border-top:1px solid var(--line-2)}
.hc-txt{white-space:pre-wrap;background:var(--surface);border-radius:var(--r-2);padding:var(--space-3) var(--space-4);font-size:var(--fs-sm);color:var(--fg-2)}
.hc-who{display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap}
.hc-team-li{flex-wrap:wrap} .hc-team-li .grow{flex:1 1 12rem;min-width:0;overflow-wrap:anywhere}
.hc-sel{width:auto;min-width:9rem}
.hc-list-gap{margin-bottom:var(--space-6)}
.hc-cons{margin-top:var(--space-2)}
.hc-bul{margin:var(--space-3) 0 0;padding-left:var(--space-5);color:var(--fg-2)}
.hc-plan{max-width:32.5rem}
/* comunidade / inspiração: editorial */
.hc-col1{max-width:var(--w-narrow)}
.hc-priv{color:var(--fg-2);max-width:var(--measure);margin:0 0 var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--line);font-size:var(--fs-sm)}
.hc-bar{display:flex;gap:var(--space-4);align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:var(--space-3)} .hc-bar .search{flex:1 1 14rem;max-width:24rem}
.hc-flip{transform:rotate(180deg)} .hc-blk{display:block} .hc-ctr{text-align:center} .hc-m48{max-width:48ch} .hc-sub{margin:var(--space-6) 0 var(--space-2)} .hc-corf{max-width:21rem;margin-top:var(--space-4)} .hc-gmom{max-width:20rem}
.hc-post{display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-5) 0;border-bottom:1px solid var(--line-2)}
.hc-pt{font:400 var(--fs-title)/1.2 var(--font-display);letter-spacing:-.01em;color:var(--fg);text-decoration:none;text-wrap:balance;display:block;padding:var(--space-1) 0;min-height:44px} .hc-pt:hover{text-decoration:underline;text-decoration-color:var(--ac);text-underline-offset:5px}
.hc-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--fg-2);max-width:var(--measure);margin:0}
.hc-meta{display:flex;gap:var(--space-2) var(--space-4);flex-wrap:wrap;align-items:center;font-size:var(--fs-sm);color:var(--fg-3)} .hc-tp{color:var(--accent-text);font-weight:500}
.hc-ex{font-size:var(--fs-xs);color:var(--fg-3);font-style:italic}
.hc-meta .hc-ib{margin-left:auto}
.hc-reply{padding:var(--space-4) 0 var(--space-4) var(--space-4);border-left:1px solid var(--line);margin-left:var(--space-2)}
.hc-body{white-space:pre-wrap;max-width:var(--measure);font-size:var(--fs-lg);line-height:1.6;margin:0}
.hc-ideas{columns:1;column-gap:var(--space-8)} @media(min-width:760px){.hc-ideas{columns:2}}
.hc-idea{break-inside:avoid;padding:var(--space-5) 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:var(--space-2)}
.hc-idea h3{font:400 var(--fs-title)/1.2 var(--font-display);letter-spacing:-.01em;margin:0;text-wrap:balance}
.hc-idea p{color:var(--fg-2);margin:0;max-width:46ch}
.hc-idea .acts{display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center;margin-top:var(--space-2)} .hc-idea .acts .hc-tp{margin-right:auto;font-size:var(--fs-sm)}
.hc-fil{margin-bottom:var(--space-4)}
.hc-more{margin-top:var(--space-4)}
.hc-reply-f{max-width:40rem}
.hc-resp{border-top:1px solid var(--line);padding-top:var(--space-4)}
/* ajuda */
.hc-help-h{flex-direction:column;align-items:flex-start;gap:var(--space-4)} .hc-help-h .mascot{flex:none;width:6rem;height:auto}
@media(min-width:560px){.hc-help-h{flex-direction:row;align-items:center;gap:var(--space-6)}.hc-help-h .mascot{width:8rem}}
.hc-gl{columns:1;column-gap:var(--space-8);margin:0} @media(min-width:640px){.hc-gl{columns:2}} .hc-gl>div{break-inside:avoid;padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)} .hc-gl dt{font:600 var(--fs-md) var(--font-body)} .hc-gl dd{margin:var(--space-1) 0 0;color:var(--fg-2)}
.hc-help{max-width:var(--w-page)}
.hc-help .search,.hc-gl-s{max-width:24rem;margin-bottom:var(--space-3)}
.hc-form{max-width:40rem}
.hc-tour-l{padding-left:var(--space-5);margin:0 0 var(--space-4);color:var(--fg-2);columns:2 14rem}
/* tour */
.hc-tour{position:fixed;z-index:var(--z-guia);left:var(--space-4);bottom:calc(88px + env(safe-area-inset-bottom));width:min(22.5rem,calc(100vw - var(--space-8)));background:var(--fg);color:var(--bg);border-radius:var(--r-3);padding:var(--space-5);box-shadow:var(--shadow-pop);display:flex;flex-direction:column;gap:var(--space-3);animation:rise var(--dur-3) var(--ease)}
@media(min-width:901px){.hc-tour{bottom:var(--space-4)}}
.hc-tour .t-label{color:color-mix(in srgb,var(--bg) 78%,var(--fg))} .hc-tour .t-title{font-size:var(--fs-xl)}
.hc-tour .btn{--b:var(--bg)} .hc-tour .btn-line{border-color:color-mix(in srgb,var(--bg) 40%,var(--fg));color:var(--bg)} .hc-tour .btn-quiet{color:var(--bg)} .hc-tour .btn-light{background:var(--bg);color:var(--fg)}
.hc-spot{outline:3px solid var(--ac)!important;outline-offset:3px;border-radius:var(--r-1);position:relative;z-index:35}
.hc-clamp-1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* revelação progressiva: o essencial fica aberto; o resto mostra o estado atual e abre sob demanda */
details.hc-fold.ds-fold:not(.in){border-top-color:var(--line)}
details.hc-fold.ds-fold>summary>.hc-h2{font:400 var(--fs-xl)/1.25 var(--font-display);letter-spacing:-.01em}
.hc-fold-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--space-1)}
.hc-fold-s{display:flex;align-items:center;gap:var(--space-2);color:var(--fg-3);font-size:var(--fs-sm);line-height:1.4;overflow-wrap:anywhere}
.hc-fold-s svg{flex:none}
.hc-fold>summary:hover .hc-h2,.hc-fold>summary:hover .hc-h3{text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:5px}
.hc-fold-b{padding-top:var(--space-2)} details.hc-fold:not(.in)>.hc-fold-b{padding-bottom:var(--space-8)}
.hc-fold-end{border-bottom:1px solid var(--line)}
.hc-spec .hc-note{margin-top:0}
.hc-kv{display:grid;grid-template-columns:auto 1fr;gap:var(--space-2) var(--space-5);margin:0 0 var(--space-5);font-size:var(--fs-sm)} .hc-kv dt{color:var(--fg-3)} .hc-kv dd{margin:0}
@media(max-height:500px) and (orientation:landscape){.hc-pstage{--ph:min(17.5rem,60dvh)}.hc-tour{bottom:var(--space-2)}}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){
.hc-tl:hover{color:var(--fg-2);text-decoration-color:var(--line)}
.hc-seg button:not([aria-pressed="true"]):hover{color:var(--fg-3)}
.hc-spec:hover b,.hc-pt:hover,.hc-fold>summary:hover .hc-h2,.hc-fold>summary:hover .hc-h3{text-decoration:none}
.hc-pal-i:not([aria-checked="true"]):not([aria-pressed="true"]):hover,.hc-aj-nav a:hover{color:var(--fg-2)}
}
`;
  document.head.append(css);

  /* =====================================================================
     ESTILO  /h/e/:id/estilo
     ===================================================================== */
  const gateOpts = [['apos', 'Depois de um momento da festa'], ['chegada', 'Desde que a pessoa entra'], ['manual', 'Só quando eu abrir (botão no painel)']];

  function previewHtml(id, only) {
    const ev = evOf(id), est = getEstilo(id), m = ESTILO_MAP[est.estilo] || ESTILO_MAP.editorial, [c1] = cores(id), w = A.when(id), g = getGate(id);
    const base = `--hc-r:${m.r};--hc-ff:${m.ff};--hc-w:${m.w}`; const night = `${base};${A.theme.scope(c1, 'noite')}`, host = `${base};${A.theme.scope(c1, groundOf())}`;
    const ativos = getMiss(id).filter((x) => x.on); const mis = ativos[0]; const mods = getModelos(id); const pm = mods.includes(S.get('hc:pm:' + id)) ? S.get('hc:pm:' + id) : mods[0];
    const phone = `<figure class="hc-fig"><div class="hc-ph" data-theme="noite" style="${night}" role="img" aria-label="Prévia da tela do convidado: capa, nome do evento, missão e botão Tirar foto"><div class="hc-ph-cov">${A.img(ev.slug + 'capa', 'p', '')}</div><div class="hc-ph-b"><span class="hc-lab">Você foi convidado para</span><div class="hc-title">${esc(ev.nome)}</div><div class="hc-sm">${esc(w.date)} · ${esc(ev.hora)}</div>${mis ? `<div class="hc-mi"><b>${roman(1)}</b>${esc(mis.titulo)}</div>` : '<div class="hc-mi">Sem missão: cada um fotografa o que quiser</div>'}<span class="hc-fb">Tirar foto</span><span class="hc-sm hc-ctr">Feed e comentários abrem ${esc(gateLabel(g))}</span></div></div><figcaption>Convidado, no celular</figcaption></figure>`;
    const im = (n, r = 'p') => A.img(ev.slug + 'tv' + n, r, '');
    let stage = '';
    if (pm === 'polaroide') stage = [[6, 8, -5], [29, 14, 3], [52, 6, -2], [74, 16, 5]].map(([x, y, rot], i) => `<div class="hc-pol" style="left:${x}%;top:${y}%;transform:rotate(${rot}deg)">${im(i)}</div>`).join('');
    else if (pm === 'mural') stage = `<div class="hc-mural">${Array.from({ length: 10 }, (_, i) => `<div>${im(i, i % 3 === 0 ? 'l' : 'p')}</div>`).join('')}</div>`;
    else if (pm === 'colagem') stage = [[4, 6, 30, 70], [26, 16, 26, 62], [48, 4, 34, 74], [70, 18, 24, 60]].map(([x, y, w2, h], i) => `<div class="hc-col" style="left:${x}%;top:${y}%;width:${w2}%;height:${h}%;z-index:${i}">${im(i, i % 2 ? 'p' : 'l')}</div>`).join('');
    else stage = `<div class="hc-dumpg">${Array.from({ length: 24 }, (_, i) => `<div>${im(i, 'p')}</div>`).join('')}</div>`;
    const tv = `<figure class="hc-fig"><div class="hc-tv" style="${night}" role="img" aria-label="Prévia do telão no modelo ${esc(pm)}; fotos verticais aparecem inteiras, sem corte">${stage}<div class="cap"><b>${esc(ev.nome)}</b></div></div><div class="hc-seg" role="group" aria-label="Modelo na prévia">${mods.map((x) => `<button type="button" data-act="hc-pmodel" data-v="${x}" aria-pressed="${x === pm}">${esc(A.data.telaoModelos.find((t) => t[0] === x)[1])}</button>`).join('')}</div><figcaption>Telão do salão. Foto vertical aparece inteira, nunca cortada.</figcaption></figure>`;
    const ok = A.data.photos.filter((p) => p.status === 'aprovada').slice(0, 6);
    const album = `<figure class="hc-fig"><div class="hc-al" style="${host}" role="img" aria-label="Prévia do álbum com seis fotos de exemplo"><div class="hc-title">${esc(ev.nome)}</div><div class="hc-alg">${ok.map((p) => `<div class="ph">${A.img(p.id, 'p', '')}</div>`).join('')}</div></div><figcaption>Álbum depois da festa</figcaption></figure>`;
    if (only) return { convidado: phone, telao: tv, album }[only];
    return `<div class="hc-stage">${phone}<div class="hc-stage-r">${tv}${album}</div></div>`;
  }
  let pvTab = 'convidado';
  const drawPreview = () => { const el = $('#hc-prev'); if (el) el.innerHTML = previewHtml(curId()); const m = $('#hc-prev-m'); if (m) m.innerHTML = previewHtml(curId(), pvTab); };
  A.acts['hc-pmodel'] = (el) => { S.set('hc:pm:' + curId(), el.dataset.v); drawPreview(); };
  A.acts['hc-pvtab'] = (el) => { pvTab = el.dataset.v; $$('[data-act=hc-pvtab]').forEach((b) => b.setAttribute('aria-pressed', String(b === el))); drawPreview(); };
  A.acts['hc-prev-open'] = () => {
    const tabs = [['convidado', 'Convidado'], ['telao', 'Telão'], ['album', 'Álbum']];
    A.sheet({ title: 'Como fica', body: `<div class="hc-seg hc-fil" role="group" aria-label="Superfície da prévia">${tabs.map(([k, l]) => `<button type="button" data-act="hc-pvtab" data-v="${k}" aria-pressed="${k === pvTab}">${l}</button>`).join('')}</div><div id="hc-prev-m">${previewHtml(curId(), pvTab)}</div><p class="hc-note hc-prevnote">Ilustrações de exemplo no lugar das fotos.</p>`, actions: [{ label: 'Voltar ao estilo', variant: 'btn-line' }] });
  };

  const sealHtml = (id) => {
    const raw = cores(id)[0], n = A.theme.resolve(raw, 'noite'), p = A.theme.resolve(raw, 'papel');
    const cN = A.contrast(raw, tok('--noite')), cP = A.contrast(raw, tok('--papel'));
    const low = (x) => x.toLowerCase(); const adj = low(n.fill) !== low(raw) || low(p.text) !== low(raw);
    const li = (ok, txt) => `<li class="${ok ? 'hc-ok' : 'hc-bad'}">${A.icon(ok ? 'check' : 'warn', 16)}<span>${txt}</span></li>`;
    return `<ul class="hc-seal">${li(n.ratios.onFill >= 4.5, `Botão do convidado, texto sobre a cor: ${r1(n.ratios.onFill)}:1`)}${li(n.ratios.text >= 4.5, `Detalhes e títulos no fundo escuro: ${r1(n.ratios.text)}:1`)}${li(p.ratios.text >= 4.5, `Cor no fundo claro (álbum e peças): ${r1(p.ratios.text)}:1`)}</ul>
<div class="hc-seal-sw"><span class="hc-sw-dot" style="background:${esc(raw)}" aria-hidden="true"></span><span>${adj ? `Sua cor sozinha dá ${r1(cP)}:1 no claro e ${r1(cN)}:1 no escuro. O Albora ajusta o tom sozinho para a leitura ficar boa em cada fundo.` : 'Sua cor já lê bem no claro e no escuro. Nada foi ajustado.'}</span></div>`;
  };
  const sealLine = (id) => { const raw = cores(id)[0], n = A.theme.resolve(raw, 'noite'), pp = A.theme.resolve(raw, 'papel'); const ok = [n.ratios.onFill, n.ratios.text, pp.ratios.text].every((x) => x >= 4.5); return `<span class="${ok ? 'hc-ok' : 'hc-bad'} flex">${A.icon(ok ? 'check' : 'warn', 16)}<span>${ok ? 'Leitura boa nos fundos claro e escuro' : 'Leitura abaixo de 4,5:1 em algum fundo'}</span></span>`; };
  const refreshSeal = () => { const c = $('#hc-ctr'); if (c) c.innerHTML = sealHtml(curId()); const l = $('#hc-seal-line'); if (l) l.innerHTML = sealLine(curId()); const d = $('#hc-cor-sum'); if (d) d.innerHTML = corSum(curId()); };
  const setEstilo = (id, patch) => { S.set(K('estilo', id), Object.assign(S.get(K('estilo', id), {}), patch)); applyEstiloToEvent(id); A.applyEvent(evOf(id)); };
  A.acts['hc-estilo'] = (el) => { if (!canEdit()) return; const id = curId(); setEstilo(id, { estilo: el.dataset.v }); saved('Estilo salvo.'); rerender(); };
  A.acts['hc-combo'] = (el) => { if (!canEdit()) return; const id = curId(); setEstilo(id, { combo: +el.dataset.v, custom: false }); saved('Paleta salva.'); rerender(); };
  A.acts['hc-custom'] = () => { if (!canEdit()) return; const id = curId(); const e = getEstilo(id); setEstilo(id, { custom: true, customCor: e.custom ? e.customCor : cores(id)[0] }); saved('Cor personalizada salva.'); rerender(); };
  A.inputs['hc-cor'] = (el) => { if (!canEdit()) return; const id = curId(); setEstilo(id, { custom: true, customCor: el.value }); $$('[data-act=hc-combo]').forEach((b) => b.setAttribute('aria-checked', 'false')); const cb = $('[data-act=hc-custom]'); cb && cb.setAttribute('aria-checked', 'true'); const dot = $('#hc-cdot'); dot && (dot.style.background = el.value); refreshSeal(); drawPreview(); saved('Cor personalizada salva.'); };

  const missHtml = (id) => {
    const list = getMiss(id), ativos = list.filter((m) => m.on); const ro = !canEdit();
    const rows = list.map((m, i) => {
      const n = ativos.indexOf(m) + 1;
      return `<li class="hc-mis ${m.on ? '' : 'off'}"><span class="rom" aria-hidden="true">${m.on ? roman(n) : '·'}</span><div class="grow"><b class="ti">${esc(m.titulo)}</b><div class="hc-note">${m.on ? `Missão ${roman(n)}` : 'Desligada'}${m.custom ? ' · criada por você' : ''}${m.fotos ? ` · ${m.fotos} fotos` : ''}</div></div><div class="acts">${m.custom ? `<button class="btn btn-quiet hc-ib" type="button" data-act="hc-mis-edit" data-id="${m.id}" aria-label="Renomear missão ${esc(m.titulo)}" ${ro ? 'disabled' : ''}>${A.icon('edit', 18)}</button><button class="btn btn-quiet hc-ib" type="button" data-act="hc-mis-del" data-id="${m.id}" aria-label="Remover missão ${esc(m.titulo)}" ${ro ? 'disabled' : ''}>${A.icon('trash', 18)}</button>` : ''}<button class="btn btn-quiet hc-ib" type="button" data-k="up-${m.id}" data-act="hc-mis-up" data-id="${m.id}" aria-label="Subir ${esc(m.titulo)}" ${ro || i === 0 ? 'disabled' : ''}>${A.icon('chevdown', 18, 'hc-flip')}</button><button class="btn btn-quiet hc-ib" type="button" data-k="dn-${m.id}" data-act="hc-mis-down" data-id="${m.id}" aria-label="Descer ${esc(m.titulo)}" ${ro || i === list.length - 1 ? 'disabled' : ''}>${A.icon('chevdown', 18)}</button>${sw(m.on, 'hc-mis-toggle', (m.on ? 'Desligar' : 'Ligar') + ' missão ' + m.titulo, `data-id="${m.id}" data-k="sw-${m.id}" ${ro ? 'disabled' : ''}`)}</div></li>`;
    }).join('');
    return `<p class="hc-note" role="status">${ativos.length ? `${ativos.length} ${ativos.length === 1 ? 'missão ligada' : 'missões ligadas'}, numeradas na ordem em que o convidado vê.` : 'Nenhuma missão ligada: o convidado fotografa o que quiser (modo livre).'}</p><ol class="hc-ol" aria-label="Missões do evento">${rows}</ol>
<form data-submit="hc-mis-add" class="stack stack-2 hc-add" novalidate>${A.field({ name: 'titulo', label: 'Criar uma missão', hint: 'Uma frase curta, de até 80 letras. Ex.: “O detalhe que ninguém viu”.', placeholder: 'O que o convidado deve fotografar?', extra: ro ? 'disabled' : '' })}<div><button class="btn btn-line" type="submit" ${ro ? 'disabled' : ''}>${A.icon('plus', 16)} Adicionar missão</button></div></form>`;
  };
  const moveMiss = (id, mid, d) => { const l = getMiss(id).slice(); const i = l.findIndex((m) => m.id === mid), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setMiss(id, l); saved('Ordem das missões salva.'); rerender(); };
  A.acts['hc-mis-up'] = (el) => canEdit() && moveMiss(curId(), el.dataset.id, -1);
  A.acts['hc-mis-down'] = (el) => canEdit() && moveMiss(curId(), el.dataset.id, 1);
  A.acts['hc-mis-toggle'] = (el) => { if (!canEdit()) return; const id = curId(); const l = getMiss(id).map((m) => (m.id === el.dataset.id ? Object.assign({}, m, { on: !m.on }) : m)); setMiss(id, l); const m = l.find((x) => x.id === el.dataset.id); saved(m.on ? 'Missão ligada.' : 'Missão desligada.'); rerender(); };
  A.acts['hc-mis-add'] = (f) => {
    const id = curId(); const v = A.validate(f, { titulo: (x) => (x.length < 4 ? 'Escreva pelo menos 4 letras.' : x.length > 80 ? 'Use até 80 letras.' : getMiss(id).some((m) => m.titulo.toLowerCase() === x.toLowerCase()) ? 'Você já tem uma missão com esse nome.' : '') });
    if (!v) return; const novo = { id: 'c' + A.uid(), titulo: v.titulo, on: true, custom: true, fotos: 0 }; const antes = getMiss(id); setMiss(id, [...antes, novo]);
    A.toast('Missão criada e ligada.', { undo: () => { setMiss(id, antes); rerender(); } }); rerender();
  };
  A.acts['hc-mis-del'] = (el) => { const id = curId(); const antes = getMiss(id); const m = antes.find((x) => x.id === el.dataset.id); setMiss(id, antes.filter((x) => x !== m)); A.toast(`Missão “${m.titulo}” removida.`, { undo: () => { setMiss(id, antes); rerender(); } }); rerender(); };
  A.acts['hc-mis-edit'] = (el) => {
    const id = curId(); const m = getMiss(id).find((x) => x.id === el.dataset.id);
    const api = A.modal({ title: 'Renomear missão', body: `<form data-submit="hc-mis-ren" novalidate>${A.field({ name: 'titulo', label: 'Texto da missão', value: m.titulo, required: true })}</form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Salvar nome', variant: 'btn-primary', onClick: (a) => { A.acts['hc-mis-ren']($('form', a.el), null, { id: m.id, api: a }); return false; } }] });
    $('form', api.el).dataset.mid = m.id; hcModal = api;
  };
  let hcModal = null;
  A.acts['hc-mis-ren'] = (f) => { const api = hcModal; const id = curId(); const v = A.validate(f, { titulo: (x) => (x.length < 4 ? 'Escreva pelo menos 4 letras.' : x.length > 80 ? 'Use até 80 letras.' : '') }); if (!v) return; const mid = f.dataset.mid; setMiss(id, getMiss(id).map((m) => (m.id === mid ? Object.assign({}, m, { titulo: v.titulo }) : m))); api && api.close(); saved('Missão renomeada.'); rerender(); };

  const recadoHtml = (id) => {
    const r = getRecado(id), ro = !canEdit();
    const q = [['manual', 'Só quando eu publicar'], ['agora', 'Agora (já visível)'], ...A.data.momentos.map((m) => ['m:' + m, `Quando chegar “${m}”`])];
    return `${A.field({ name: 'texto', label: 'Mensagem para quem chegar', rows: 4, value: r.texto, placeholder: 'Escreva algo curto e pessoal. Aparece no começo da experiência do convidado.', extra: `data-input="hc-recado-txt" maxlength="280" ${ro ? 'disabled' : ''}`, hint: 'Até 280 letras.' }).replace('<span class="err"', `<span class="hc-note" id="hc-rcount" aria-live="polite">${r.texto.length}/280</span><span class="err"`)}
<div class="hc-gap-5">${A.field({ name: 'quando', label: 'Aparece para o convidado', options: q, value: r.quando, extra: `data-change="hc-recado-quando" ${ro ? 'disabled' : ''}`, required: true })}</div>
<p class="hc-note hc-gap-3" id="hc-rstatus" role="status">${recadoStatus(r)}</p>
<div class="stack stack-3 hc-gap-6"><span class="t-h">Recado em áudio (opcional)</span>
${r.audio ? `<div class="flex"><span class="badge ok">Áudio de ${r.audio} s gravado</span><button class="btn btn-quiet btn-sm" type="button" data-act="hc-audio-del" ${ro ? 'disabled' : ''}>Remover áudio</button></div>` : `<label class="check"><input type="checkbox" data-change="hc-audio-ok" ${r.audioOk ? 'checked' : ''} ${ro ? 'disabled' : ''}><span>É a minha voz, ou tenho autorização de quem fala.</span></label><div><button class="btn btn-line btn-sm" type="button" data-act="hc-audio-rec" ${ro ? 'disabled' : ''}>${A.icon('mic', 16)} Gravar até 30 s (simulado)</button></div><p class="hc-note">A gravação é simulada: nenhum microfone é usado neste protótipo.</p>`}</div>`;
  };
  const recadoStatus = (r) => (!r.texto && !r.audio ? 'Ainda sem recado: nada aparece para o convidado.' : r.quando === 'manual' ? 'Rascunho salvo. Ninguém vê até você publicar.' : r.quando === 'agora' ? 'Publicado: já aparece para quem entra.' : `Aparece quando chegar “${r.quando.slice(2)}”.`);
  const setRecado = (id, p) => S.set(K('recado', id), Object.assign(getRecado(id), p));
  A.inputs['hc-recado-txt'] = (el) => { setRecado(curId(), { texto: el.value }); const c = $('#hc-rcount'); c && (c.textContent = el.value.length + '/280'); const s = $('#hc-rstatus'); s && (s.textContent = recadoStatus(getRecado(curId()))); updSum('rec'); saved('Recado salvo.'); };
  A.inputs['hc-recado-quando'] = (el) => { setRecado(curId(), { quando: el.value }); const s = $('#hc-rstatus'); s && (s.textContent = recadoStatus(getRecado(curId()))); updSum('rec'); saved(el.value === 'manual' ? 'Recado guardado como rascunho.' : 'Horário do recado salvo.'); };
  A.inputs['hc-audio-ok'] = (el) => { setRecado(curId(), { audioOk: el.checked }); saved('Autorização registrada.'); };
  A.acts['hc-audio-rec'] = (el) => { if (!getRecado(curId()).audioOk) { A.toast('Marque que a voz é sua (ou autorizada) antes de gravar.', { kind: 'bad' }); $('[data-change=hc-audio-ok]')?.focus(); return; } A.busy(el, 1400, () => { setRecado(curId(), { audio: 12 }); saved('Áudio salvo (simulado).'); rerender(); }); };
  A.acts['hc-audio-del'] = () => { const id = curId(); const prev = getRecado(id).audio; setRecado(id, { audio: 0 }); A.toast('Áudio removido.', { undo: () => { setRecado(id, { audio: prev }); rerender(); } }); rerender(); };

  const telaoModelosHtml = (id) => {
    const on = getModelos(id), free = evOf(id).plano === 'gratis', ro = !canEdit();
    return `<div class="stack stack-3">${A.data.telaoModelos.map(([k, n, d]) => { const lock = free && k !== 'polaroide'; return `<label class="check"><input type="checkbox" data-change="hc-modelo" data-v="${k}" ${on.includes(k) ? 'checked' : ''} ${lock || ro ? 'disabled' : ''}><span><b>${esc(n)}</b> <span class="muted">— ${esc(d)}</span>${lock ? `<span class="hc-note hc-blk">Disponível no plano Completo. <a class="link" href="${baseOf(id)}/ajustes/plano">Ver plano</a></span>` : ''}</span></label>`; }).join('')}</div><p class="hc-note hc-gap-3" id="hc-mderr" role="alert"></p><p class="hc-note hc-gap-3">O telão alterna entre os modelos ligados. Foto vertical nunca é cortada.</p>${nudge(id, 'recurso-exclusivo') ? `<div class="hc-nudge">${nudge(id, 'recurso-exclusivo')}</div>` : ''}`;
  };
  A.inputs['hc-modelo'] = (el) => { const id = curId(); let l = getModelos(id).slice(); if (el.checked) l.push(el.dataset.v); else l = l.filter((x) => x !== el.dataset.v); if (!l.length) { el.checked = true; $('#hc-mderr').textContent = 'Deixe pelo menos um modelo ligado, senão o telão fica sem o que mostrar.'; return; } $('#hc-mderr').textContent = ''; S.set(K('modelos', id), l); updSum('tel'); saved('Modelos do telão salvos.'); drawPreview(); };

  const gateHtml = (id) => {
    const g = getGate(id), ro = !canEdit();
    return `<div class="stack stack-3" role="radiogroup" aria-label="Quando a interação social abre">${gateOpts.map(([k, l]) => `<label class="check"><input type="radio" name="gate" value="${k}" data-change="hc-gate" ${g.modo === k ? 'checked' : ''} ${ro ? 'disabled' : ''}><span><b>${l}</b>${k === 'apos' ? ' <span class="muted">(recomendado)</span>' : ''}</span></label>`).join('')}</div>
<div class="hc-gap-5 hc-gmom" ${g.modo === 'apos' ? '' : 'hidden'} id="hc-gmom">${A.field({ name: 'momento', label: 'Depois de qual momento?', options: A.data.momentos, value: g.momento, extra: `data-change="hc-gate-mom" ${ro ? 'disabled' : ''}`, required: true })}</div>
<p class="hc-note hc-gap-5" id="hc-gnote">Antes disso, o app só sobe fotos e espelha o telão. Depois, abre feed, reações e comentários. As notificações ficam desligadas.</p>`;
  };
  A.inputs['hc-gate'] = (el) => { const id = curId(); S.set(K('gate', id), Object.assign({}, getGate(id), { modo: el.value })); $('#hc-gmom').hidden = el.value !== 'apos'; updSum('gate'); saved('Abertura da interação salva.'); drawPreview(); };
  A.inputs['hc-gate-mom'] = (el) => { const id = curId(); S.set(K('gate', id), Object.assign({}, getGate(id), { momento: el.value })); updSum('gate'); saved('Abertura da interação salva.'); drawPreview(); };

  const menoresHtml = (id) => {
    const on = getMenores(id), ro = !canEdit();
    return `<div class="hc-row"><div><b class="t-h">Há menores de 18 anos na festa</b><p class="muted hc-m48">${on ? 'Proteções ligadas para este evento.' : 'Proteções extras desligadas.'}</p></div>${sw(on, 'hc-menores', 'Há menores de 18 anos na festa', `data-k="menores" ${ro ? 'disabled' : ''}`)}</div>${on ? `<ul class="stack stack-2 hc-bul"><li>Fotos denunciadas ficam retidas até você revisar.</li><li>Compartilhar foto fora da festa fica desligado.</li><li>A interação social só abre depois da revisão das fotos.</li></ul>` : ''}${ro ? '<p class="hc-note hc-gap-3">Só dono e casal mudam isto.</p>' : ''}`;
  };
  A.acts['hc-menores'] = async () => {
    if (!canEdit()) return; const id = curId(); const on = getMenores(id);
    if (on) { const ok = await A.confirm({ title: 'Desligar as proteções para menores?', body: '<p>Fotos denunciadas deixam de ficar retidas, o compartilhamento fora da festa pode ser usado e a interação social não espera a revisão. Se houver crianças ou adolescentes na festa, mantenha ligado.</p>', confirm: 'Desligar proteções', danger: true }); if (!ok) return; }
    S.set(K('menores', id), !on); A.toast(!on ? 'Proteções para menores ligadas.' : 'Proteções para menores desligadas.', { undo: () => { S.set(K('menores', id), on); rerender(); } }); rerender();
  };

  const foldOpen = (k, def = false) => S.get('hc:fold:' + k, def);
  document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.classList && d.classList.contains('hc-fold') && d.id) S.set('hc:fold:' + d.id, d.open); }, true);
  const fold = ({ id, title, sum = '', sumKey = '', body, open = false, lvl = 2, inner = false }) => `<details class="hc-fold ds-fold grande ${inner ? 'in' : ''}" id="${id}" ${foldOpen(id, open) ? 'open' : ''}><summary><span class="hc-fold-t"><h${lvl} class="${lvl === 2 ? 'hc-h2' : 'hc-h3'}">${esc(title)}</h${lvl}><span class="hc-fold-s" ${sumKey ? `id="hc-fs-${sumKey}"` : ''}>${sum}</span></span></summary><div class="hc-fold-b ds-fold-b">${body}</div></details>`;
  const modNome = (k) => (A.data.telaoModelos.find((x) => x[0] === k) || [k, k])[1];
  const SUMS = {
    mis: (id) => { const l = getMiss(id), n = l.filter((m) => m.on).length; return n ? `${n} ${n === 1 ? 'ligada' : 'ligadas'} de ${l.length}` : 'Nenhuma ligada: cada um fotografa o que quiser'; },
    rec: (id) => recadoStatus(getRecado(id)),
    tel: (id) => getModelos(id).map(modNome).join(', '),
    gate: (id) => 'Abre ' + gateLabel(getGate(id)),
    men: (id) => (getMenores(id) ? 'Proteções ligadas' : 'Proteções desligadas'),
  };
  const updSum = (k) => { const el = $('#hc-fs-' + k); if (el) el.textContent = SUMS[k](curId()); };
  const corNome = (id) => { const e = getEstilo(id); return e.custom ? 'Cor personalizada' : (A.data.combos[e.combo] || A.data.combos[0])[0]; };
  const corSum = (id) => { const [c1, c2] = cores(id); return `<span class="hc-dots" aria-hidden="true"><i style="background:${esc(c1)}"></i><i style="background:${esc(c2)}"></i></span>${esc(corNome(id))}`; };

  const estiloSec = (id, e, dis) => {
    const specs = A.data.estilos.map((s) => { const m = ESTILO_MAP[s.id]; const cant = parseInt(m.r, 10) ? `cantos de ${parseInt(m.r, 10)} px` : 'cantos retos'; return `<button type="button" class="hc-spec" role="radio" aria-checked="${e.estilo === s.id}" data-act="hc-estilo" data-v="${s.id}" data-k="est-${s.id}" ${dis}><span class="aa" style="font-family:${m.ff};font-weight:${m.w}" aria-hidden="true">Aa</span><span class="grow"><b>${esc(s.nome)}</b><span class="hc-note hc-blk">${esc(s.desc)}</span><span class="hc-note hc-blk hc-fine">${esc(s.fonte)} · ${cant}</span></span><span class="hc-pip" aria-hidden="true"></span></button>`; }).join('');
    const pal = A.data.combos.map((c, i) => `<button type="button" class="hc-pal-i" role="radio" aria-checked="${!e.custom && e.combo === i}" data-act="hc-combo" data-v="${i}" data-k="cmb-${i}" ${dis}><span class="hc-dots" aria-hidden="true"><i style="background:${c[1]}"></i><i style="background:${c[2]}"></i></span>${esc(c[0])}<span class="hc-pip" aria-hidden="true"></span></button>`).join('');
    const est = A.data.estilos.find((x) => x.id === e.estilo) || A.data.estilos[0]; const m = ESTILO_MAP[est.id];
    const cust = `<div class="hc-pal"><button type="button" class="hc-pal-i" aria-pressed="${!!e.custom}" data-act="hc-custom" data-k="cmb-x" ${dis}><span class="hc-dots" aria-hidden="true"><i id="hc-cdot" style="background:${esc(e.customCor)}"></i></span>Cor personalizada<span class="hc-pip" aria-hidden="true"></span></button></div>${e.custom ? `<div class="field hc-corf"><label for="hc-cor">Escolha a cor</label><input id="hc-cor" class="hc-cor" type="color" value="${esc(e.customCor)}" data-input="hc-cor" aria-describedby="hc-ctr" ${dis}></div>` : ''}`;
    const fino = `${cust}<dl class="hc-kv hc-gap-5"><dt>Fonte</dt><dd>${esc(est.fonte)}, do estilo ${esc(est.nome)}</dd><dt>Cantos</dt><dd>${parseInt(m.r, 10) ? parseInt(m.r, 10) + ' px' : 'retos'}, do estilo ${esc(est.nome)}</dd></dl><p class="hc-note">Para mudar a fonte e os cantos, escolha outro estilo acima.</p><div id="hc-ctr" class="hc-gap-5" aria-live="polite">${sealHtml(id)}</div>`;
    return sec('hc-s-id', 'Estilo', 'Comece por aqui: escolha um estilo pronto e veja a prévia ao lado. Cores e ajuste fino são opcionais e ficam logo abaixo.',
      `<div class="hc-specs" role="radiogroup" aria-label="Estilo">${specs}</div>
${fold({ id: 'hc-f-cor', title: 'Cores', lvl: 3, inner: true, sum: `<span id="hc-cor-sum" class="flex">${corSum(id)}</span>`, body: `<p class="hc-sec-p">A cor aparece nos botões e destaques que o convidado vê. O Albora ajusta o tom sozinho para a leitura ficar boa.</p><div class="hc-pal" role="radiogroup" aria-label="Paleta de cores">${pal}</div>` })}
${fold({ id: 'hc-f-fino', title: 'Ajuste fino', lvl: 3, inner: true, open: !!e.custom, sum: `<span id="hc-seal-line">${sealLine(id)}</span>`, body: fino })}
`);
  };

  A.route('/h/e/:id/estilo', (ctx) => {
    const id = ctx.params.id; S.set('hc:last', id); const ro = roBanner('Você entrou como cerimonialista: pode ver o estilo, mas só dono e casal alteram.');
    const e = getEstilo(id); const dis = canEdit() ? '' : 'disabled';
    const ok = () => `<div class="hc-ed"><div class="hc-ed-l"><button class="btn btn-line hc-prevbtn" type="button" data-act="hc-prev-open">${A.icon('eye', 18)} Ver como fica</button>${ro}${phaseBanner(id, '', 'A festa está acontecendo: o que você mudar aparece para quem está no evento em alguns segundos.', 'A festa acabou: mudanças de estilo valem só para o álbum e o livro.')}
${estiloSec(id, e, dis)}
${fold({ id: 'hc-s-mis', title: 'Missões', sumKey: 'mis', sum: esc(SUMS.mis(id)), body: `<p class="hc-sec-p">Desafios curtos que dão assunto para as fotos. A numeração é romana e segue a ordem.</p>${missHtml(id)}` })}
${fold({ id: 'hc-s-rec', title: 'Recado', sumKey: 'rec', sum: esc(SUMS.rec(id)), body: `<p class="hc-sec-p">Uma mensagem sua que o convidado lê ao entrar.</p>${recadoHtml(id)}` })}
${fold({ id: 'hc-s-tel', title: 'Modelos de telão', sumKey: 'tel', sum: esc(SUMS.tel(id)), body: `<p class="hc-sec-p">Como as fotos aparecem na tela do salão. Ligue um ou mais. Para ligar a TV, use <a class="link" href="${baseOf(id)}/compartilhar">Compartilhar</a>.</p>${telaoModelosHtml(id)}` })}
${fold({ id: 'hc-s-gate', title: 'Interação social', sumKey: 'gate', sum: esc(SUMS.gate(id)), body: `<p class="hc-sec-p">Feed, reações e comentários abrem no horário que você escolher.</p>${gateHtml(id)}` })}
${fold({ id: 'hc-s-men', title: 'Controle de menores', sumKey: 'men', sum: esc(SUMS.men(id)), body: `<p class="hc-sec-p">Proteções extras quando há crianças e adolescentes.</p>${menoresHtml(id)}` })}
<div class="hc-fold-end"></div>
<p class="hc-note hc-gap-6">Tudo aqui salva sozinho; um aviso confirma. Para trocar nome, data ou local, vá em <a class="link" href="${baseOf(id)}/ajustes/evento">Ajustes do evento</a>.</p></div>
<aside class="hc-ed-r" id="hc-prevaside" aria-label="Prévia ao vivo"><div id="hc-prev">${previewHtml(id)}</div><p class="hc-note hc-prevnote">Ilustrações de exemplo no lugar das fotos. A prévia muda a cada escolha.</p></aside></div>`;
    return { title: 'Estilo', html: A.hostShell(ctx, { section: 'estilo', pageClass: 'wide' }, pageHd('Estilo', 'O jeito da sua festa. A prévia mostra como cada pessoa vê, e muda enquanto você escolhe.') + stFull(id, ok)) };
  });

  /* =====================================================================
     COMPARTILHAR  /h/e/:id/compartilhar
     ===================================================================== */
  const PIECES = [{ id: 'placa', nome: 'Placa A4', dim: '210 × 297 mm', w: 210, h: 297, mm: 60 }, { id: 'mesa', nome: 'Card de mesa', dim: '100 × 150 mm', w: 100, h: 150, mm: 35 }, { id: 'missao', nome: 'Card de missão', dim: '74 × 105 mm', w: 74, h: 105, mm: 30 }];
  const COR = { tinta: 'Tinta (recomendado)', evento: 'Cor do evento', claro: 'Cor do evento, versão clara' };
  const corHex = (id, k) => (k === 'tinta' ? tok('--tinta') : k === 'evento' ? evOf(id).cor : mixHex(evOf(id).cor, tok('--papel'), 0.6));
  const getPecas = (id) => { const o = S.get(K('pecas', id), {}); return PIECES.map((p) => Object.assign({}, p, { mm: p.mm, cor: 'tinta' }, o[p.id] || {})); };
  const setPeca = (id, pid, patch) => { const o = S.get(K('pecas', id), {}); o[pid] = Object.assign(o[pid] || {}, patch); S.set(K('pecas', id), o); };
  const checkPeca = (id, p) => { const rt = A.contrast(corHex(id, p.cor), tok('--papel')); const probs = []; if (p.mm < 30) probs.push(`QR com ${p.mm} mm: abaixo do mínimo de 30 mm, celulares não leem de longe.`); if (rt < 7) probs.push(`Contraste ${r1(rt)}:1: para o QR ser lido precisa de pelo menos 7:1. Use a cor Tinta.`); return { rt, probs }; };
  const waDef = (ev) => `Oi! No ${ev.tipo === 'casamento' ? 'nosso casamento' : 'nosso evento'} vai ter telão com as fotos de todo mundo. Entre por aqui e tire as suas: https://albora.app/e/${ev.slug} (não precisa criar conta).`;

  /* O telão tem UM estado: o de wall.js (A.wall). Aqui só ficam o histórico do painel e o link que foi substituído. */
  const W = () => A.wall;
  const telaoState = (id) => Object.assign({ hist: [], anterior: null }, S.get(K('telao', id), {}));
  const saveTelao = (id, t) => S.set(K('telao', id), t);
  const logT = (t, txt) => { t.hist.unshift({ t: Date.now(), txt }); t.hist = t.hist.slice(0, 12); };
  const linkAtual = (id) => { const at = (A.store.get('telaoLinks', {}) || {}).atual; return at && at.evento === id ? at : null; };
  const linkState = (l) => (!l ? 'none' : { ok: 'ativo', usado: 'usado', expirou: 'expirado', substituido: 'invalido' }[W().statusLink(l.token)]);
  const LS = { ativo: ['ok', 'Ativo'], usado: ['info', 'Já usado'], expirado: ['warn', 'Expirou'], invalido: ['bad', 'Substituído por um mais novo'] };
  const VIA = { codigo: 'código', 'codigo-painel': 'código', link: 'link' };
  const minRest = (exp) => Math.max(1, Math.ceil((exp - Date.now()) / 60000));
  let tick = null;

  const telaoHtml = (id) => {
    const t = telaoState(id); const par = W().pareado(); const conectado = !!(par && par.evento === id);
    const cur = linkAtual(id); const ls = linkState(cur); const old = t.anterior; const cod = W().codigoPainel(id);
    const url = (l) => `albora.app/t/link/${l.token}`;
    const modelos = getModelos(id).map((m) => esc(A.data.telaoModelos.find((x) => x[0] === m)[1])).join(', ');
    return `<div class="hc-live ${conectado ? 'on' : ''}" role="status" aria-live="polite"><span class="hc-disc" aria-hidden="true"></span><div><div class="hc-h2">${conectado ? 'Telão conectado' : 'Aguardando conexão'}</div><div class="hc-note">${conectado ? `Desde ${hhmm(par.quando)}, por ${esc(VIA[par.via] || par.via)}. Modelos: ${modelos}.` : 'A TV do salão ainda não está ligada ao evento. Use o código ou o link.'}</div></div><div class="hc-live-a"><a class="btn btn-line" href="#/t/display">${A.icon('tv', 18)} Abrir telão</a>${conectado ? `<button class="btn btn-danger" type="button" data-act="hc-tv-off">Desconectar</button>` : ''}</div></div>
<div class="hc-meth">
<div class="stack stack-3"><h3 class="hc-h3">Pelo código</h3><p class="muted">Na TV, abra <b>albora.app/telao</b>. Ela mostra um código de 6 letras e números: digite aqui.</p>
<form class="hc-inl hc-bot" data-submit="hc-tv-codigo" novalidate>${A.field({ name: 'codigo', label: 'Código que aparece na TV', required: true, placeholder: 'A2C4E6', hint: '6 letras e números', extra: 'maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" data-input="wl-upper"' })}<button class="btn btn-primary" type="submit">Ligar o telão</button></form>
<div class="stack stack-2 hc-gap-5"><span class="hc-lab">Ou digite este código na TV</span><div class="hc-code" aria-label="Código ${cod.codigo.split('').join(' ')}">${esc(cod.codigo)}</div><div class="hc-note">Vale <span id="hc-cod-min" data-exp="${cod.exp}">${minRest(cod.exp)} min</span>.</div></div>
<div class="flex flex-wrap"><a class="btn btn-line btn-sm" href="#/t/parear">Parear agora</a><button class="btn btn-quiet btn-sm" type="button" data-act="hc-code-new">${A.icon('refresh', 16)} Gerar outro código</button></div></div>
<div class="stack stack-3"><h3 class="hc-h3">Link de uso único</h3><p class="muted">Abra o link na TV ou mande para quem monta o salão. <b>Vale 20 minutos</b> e só funciona uma vez. Gerar um novo cancela o anterior.</p>
${cur ? `<div class="stack stack-2"><div class="hc-linkrow"><code class="t-mono hc-clamp-1" title="${esc(url(cur))}">${esc(url(cur))}</code><button class="btn btn-quiet btn-icon" type="button" data-act="copy" data-text="https://${esc(url(cur))}" aria-label="Copiar link do telão">${A.icon('copy', 16)}</button></div><span class="badge ${LS[ls][0]}">${LS[ls][1]}${ls === 'ativo' ? ` · expira em <span id="hc-count" data-exp="${cur.exp}"></span>` : ''}</span></div>` : '<p class="hc-note">Nenhum link gerado ainda.</p>'}
<div class="flex flex-wrap"><button class="btn btn-line btn-sm" type="button" data-act="hc-link-new">${A.icon('link', 16)} ${cur ? 'Gerar novo link' : 'Gerar link'}</button></div>
${old ? `<div class="hc-note">Link anterior <code>${esc(url(old))}</code>: <span class="hc-bad">não vale mais</span>.</div>` : ''}</div></div>
<details class="hc-d ds-fold sem-borda hc-gap-5"><summary>Atalhos do protótipo (fingem o que a TV faria)</summary><div class="body ds-fold-b flex flex-wrap"><button class="btn btn-quiet btn-sm" type="button" data-act="hc-code-tv">A TV mostra um código</button><button class="btn btn-quiet btn-sm" type="button" data-act="hc-code-sim">A TV digitou o código acima</button>${cur ? `<button class="btn btn-quiet btn-sm" type="button" data-act="hc-link-open">A TV abriu o link</button><button class="btn btn-quiet btn-sm" type="button" data-act="hc-link-age">Avançar 20 minutos</button>` : ''}${old ? `<button class="btn btn-quiet btn-sm" type="button" data-act="hc-link-old">Testar o link antigo</button>` : ''}</div></details>
<ul class="hc-hist tight"><li><time>Interação</time><span>Abre ${esc(gateLabel(getGate(id)))} <a class="link" href="${baseOf(id)}/estilo">mudar</a></span></li><li><time>Menores</time><span>${getMenores(id) ? 'Proteções ligadas' : 'Proteções desligadas'}</span></li><li><time>Modelos</time><span>${modelos} <a class="link" href="${baseOf(id)}/estilo">mudar</a></span></li></ul>
${nudge(id, 'telao') ? `<div class="hc-nudge">${nudge(id, 'telao')}</div>` : ''}<details class="hc-d ds-fold sem-borda"><summary>Histórico do telão (${t.hist.length})</summary><div class="body ds-fold-b">${t.hist.length ? `<ol class="hc-hist">${t.hist.map((h) => `<li><time datetime="${new Date(h.t).toISOString()}">${fmtDT(h.t)}</time><span>${esc(h.txt)}</span></li>`).join('')}</ol>` : '<p class="hc-note">Nada ainda. Cada conexão, link novo e desconexão aparece aqui.</p>'}</div></details>`;
  };
  const conectou = (id, t, txt, msg) => { logT(t, txt); saveTelao(id, t); A.toast(msg); rerender(); setTimeout(() => A.celebrate($('.hc-live .hc-disc')), 60); };
  A.acts['hc-tv-codigo'] = (form) => {
    const id = curId(); const v = A.validate(form, { codigo: (x) => (/^[A-HJ-NP-Z2-9]{6}$/.test(x.toUpperCase()) ? '' : W().erroCodigo('formato')) }); if (!v) return;
    A.busy($('button[type=submit]', form), 700, () => {
      const r = W().autorizar(v.codigo, id); const f = $('.field', form);
      if (!r.ok) { f.classList.add('has-error'); $('.err', f).textContent = W().erroCodigo(r.erro); $('input', f).focus(); return; }
      conectou(id, telaoState(id), 'Telão conectado pelo código da TV.', 'Telão conectado.');
    });
  };
  A.acts['hc-code-new'] = () => { const id = curId(), t = telaoState(id); W().codigoPainel(id, true); logT(t, 'Novo código de pareamento gerado.'); saveTelao(id, t); A.toast('Novo código gerado. O anterior não funciona mais.'); rerender(); };
  A.acts['hc-code-tv'] = () => { const c = W().codigoTv().codigo; A.toast(`A TV mostraria o código ${c}. Digite no campo “Código que aparece na TV”.`, { ms: 6000 }); const i = $('input[name=codigo]'); i && i.focus(); };
  A.acts['hc-code-sim'] = () => {
    const id = curId(), t = telaoState(id); const r = W().codigoNaTv(W().codigoPainel(id).codigo);
    if (!r.ok) { A.toast(W().erroCodigo(r.erro), { kind: 'bad', ms: 6000 }); return; }
    conectou(id, t, 'Telão conectado por código.', 'Telão conectado (simulado).');
  };
  A.acts['hc-link-new'] = async () => {
    const id = curId(), t = telaoState(id); const cur = linkAtual(id);
    if (cur && linkState(cur) === 'ativo') { const ok = await A.confirm({ title: 'Gerar um novo link?', body: '<p>O link atual deixa de funcionar na hora. Se alguém já abriu o salão com ele, a TV continua conectada.</p>', confirm: 'Gerar novo link' }); if (!ok) return; }
    if (cur) t.anterior = { token: cur.token }; W().gerarLink(id);
    logT(t, cur ? 'Novo link gerado; o anterior deixou de valer.' : 'Link de uso único gerado (vale 20 min).'); saveTelao(id, t); A.toast('Link novo gerado. Vale por 20 minutos.'); rerender();
  };
  const MOTIVO = { usado: 'Este link já foi usado. Gere um novo.', expirou: 'Este link não vale mais: passaram 20 minutos. Gere um novo.', substituido: 'Este link foi substituído. Use o mais novo.' };
  A.acts['hc-link-open'] = () => {
    const id = curId(), t = telaoState(id); const cur = linkAtual(id); if (!cur) return;
    const r = W().usarLink(cur.token); if (!r.ok) { A.toast(MOTIVO[r.motivo], { kind: 'bad' }); return; }
    conectou(id, t, 'Telão conectado por link de uso único.', 'A TV abriu o link e conectou (simulado).');
  };
  A.acts['hc-link-old'] = () => A.toast(MOTIVO.substituido.replace('Este link foi substituído.', 'Este link não vale mais: foi substituído por um novo.'), { kind: 'bad' });
  A.acts['hc-link-age'] = () => { W().avancarLink(21); rerender(); };
  A.acts['hc-tv-off'] = async () => { const ok = await A.confirm({ title: 'Desconectar o telão?', body: '<p>A tela do salão para de receber fotos e volta para a tela de espera. Para ligar de novo, use um código ou um link novo.</p>', confirm: 'Desconectar', danger: true }); if (!ok) return; const id = curId(), t = telaoState(id); W().desligar(); logT(t, 'Telão desconectado.'); saveTelao(id, t); A.toast('Telão desconectado.'); rerender(); };

  const qrFundo = () => S.get('hc:qrfundo', 'branco');
  A.acts['hc-qrfundo'] = (el) => { S.set('hc:qrfundo', el.dataset.v); saved('Fundo do QR salvo.'); rerender(); };
  A.acts['hc-qr-dl'] = (el) => { const ev = evOf(curId()); A.toast(`Baixaria qr-${ev.slug}-${qrFundo() === 'branco' ? 'fundo-branco' : 'transparente'}.${el.dataset.f} (simulado).`); };
  A.inputs['hc-wa'] = (el) => { S.set(K('wa', curId()), el.value); saved('Mensagem salva.'); };
  A.acts['hc-wa-copy'] = () => { const t = ($('#hc-wa') || {}).value || ''; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => {}).finally(() => A.toast('Mensagem copiada.')); };

  let pieceSel = 'placa';
  A.acts['hc-psel'] = (el) => { pieceSel = el.dataset.v; rerender(); };
  const heroHtml = (id) => {
    const ev = evOf(id); const ps = getPecas(id); const p = ps.find((x) => x.id === pieceSel) || ps[0]; const c = checkPeca(id, p); const url = `albora.app/e/${ev.slug}`; const hex = corHex(id, p.cor);
    const mis = p.id === 'missao' ? (getMiss(id).find((m) => m.on) || {}).titulo : '';
    const paper = `<div class="hc-paper" style="--pa:${(p.w / p.h).toFixed(4)}" role="img" aria-label="Prévia da peça ${esc(p.nome)} em escala, com QR de ${p.mm} milímetros"><div class="hc-pp"><b class="hc-pn">${esc(ev.nome)}</b>${mis ? `<span class="hc-p2">${esc(mis)}</span>` : ''}<div class="hc-pq" style="--qw:${(p.mm / p.w * 100).toFixed(1)}cqw;color:${hex};--fg:${hex}">${A.qrSvg(url, 100)}</div><span class="hc-p3">Aponte a câmera e tire suas fotos</span><span class="hc-p4">${esc(url)}</span></div></div>`;
    const ctrl = `<div class="hc-ctl">
<div class="field"><label for="hc-url">Link do convidado</label><div class="hc-linkrow"><input id="hc-url" class="input" readonly value="${esc(url)}" onfocus="this.select()"><button class="btn btn-line btn-sm" type="button" data-act="copy" data-text="https://${esc(url)}">${A.icon('copy', 16)} Copiar</button></div><span class="hint" id="hc-url-h"><a class="link" href="#/g/${ev.slug}">Ver como convidado</a>. O mesmo link e o mesmo QR servem para todos.</span></div>
<div><div class="hc-seg" role="group" aria-label="Peça para imprimir">${ps.map((x) => `<button type="button" data-act="hc-psel" data-v="${x.id}" aria-pressed="${x.id === p.id}">${esc(x.nome)}</button>`).join('')}</div><p class="hc-note">${p.dim}, com sangria de 3 mm na versão real. A prévia está em escala.</p></div>
<div class="hc-inl"><div class="field"><label for="mm-${p.id}">Tamanho do QR (mm)</label><input id="mm-${p.id}" class="input" type="number" min="10" max="150" value="${p.mm}" data-change="hc-piece-mm" data-p="${p.id}" aria-describedby="pe-${p.id}"></div><div class="field"><label for="cor-${p.id}">Cor do QR</label><select id="cor-${p.id}" class="select" data-change="hc-piece-cor" data-p="${p.id}">${Object.entries(COR).map(([k, v]) => `<option value="${k}" ${p.cor === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div><button class="btn btn-quiet btn-sm" type="button" data-act="hc-kit-all">Mesma cor no kit todo</button></div>
<div id="pe-${p.id}" role="status" aria-live="polite">${c.probs.length ? c.probs.map((x) => `<div class="hc-bad flex hc-top">${A.icon('warn', 16)}<span>${x}</span></div>`).join('') : `<div class="hc-ok flex">${A.icon('check', 16)}<span>QR de ${p.mm} mm, contraste ${r1(c.rt)}:1: pode imprimir.</span></div>`}</div>
<div class="flex flex-wrap"><button class="btn btn-primary" type="button" data-act="hc-piece-dl" data-p="${p.id}">${A.icon('download', 18)} Baixar ${esc(p.nome)} (PDF)</button><button class="btn btn-quiet" type="button" data-act="hc-zip">Pacote completo (ZIP)</button></div>
<p class="hc-note">Downloads simulados: o toast diz o arquivo que sairia. Para o QR ser lido na festa: no mínimo 30 mm e contraste de 7:1 com o papel.</p>
<div class="hc-kit"><div class="hc-qr ${qrFundo() === 'transparente' ? 'tr' : ''}">${A.qrSvg(url, 56)}</div><div class="stack stack-2 grow"><b class="hc-h3">Só o QR</b><div class="hc-seg" role="group" aria-label="Fundo do QR">${[['branco', 'Fundo branco'], ['transparente', 'Transparente']].map(([k, l]) => `<button type="button" data-act="hc-qrfundo" data-v="${k}" aria-pressed="${qrFundo() === k}">${l}</button>`).join('')}</div></div><div class="flex"><button class="btn btn-quiet btn-sm" type="button" data-act="hc-qr-dl" data-f="png">PNG</button><button class="btn btn-quiet btn-sm" type="button" data-act="hc-qr-dl" data-f="svg">SVG</button></div></div>
<p class="hc-note">QR de exemplo: não escaneia neste protótipo. Na versão real, aponta para o link acima.</p></div>`;
    return `<div class="hc-cs"><div class="hc-pstage">${paper}<span class="hc-sm">${esc(p.nome)} · ${p.dim}</span></div>${ctrl}</div>`;
  };
  A.inputs['hc-piece-mm'] = (el) => { const v = Math.round(+el.value) || 0; setPeca(curId(), el.dataset.p, { mm: Math.max(0, Math.min(150, v)) }); saved('Tamanho do QR salvo.'); rerender(); };
  A.inputs['hc-piece-cor'] = (el) => { setPeca(curId(), el.dataset.p, { cor: el.value }); saved('Cor do QR salva.'); rerender(); };
  A.acts['hc-kit-all'] = () => { const id = curId(); const antes = S.get(K('pecas', id), {}); const cor = getPecas(id).find((x) => x.id === pieceSel).cor; PIECES.forEach((p) => setPeca(id, p.id, { cor })); A.toast('Cor desta peça aplicada às três peças do kit.', { undo: () => { S.set(K('pecas', id), antes); rerender(); } }); rerender(); };
  A.acts['hc-piece-dl'] = (el) => { const id = curId(); const p = getPecas(id).find((x) => x.id === el.dataset.p); const c = checkPeca(id, p); if (c.probs.length) { A.toast('Não dá para baixar assim: ' + c.probs[0], { kind: 'bad', ms: 6000 }); return; } A.toast(`Baixaria ${p.nome.toLowerCase()}.pdf com sangria de 3 mm (simulado).`); };
  A.acts['hc-zip'] = () => { const bad = getPecas(curId()).filter((p) => checkPeca(curId(), p).probs.length); if (bad.length) { A.toast(`Corrija o QR de: ${bad.map((p) => p.nome).join(', ')}.`, { kind: 'bad', ms: 6000 }); return; } A.toast('Baixaria o pacote completo em ZIP (simulado).'); };

  A.route('/h/e/:id/materiais', (ctx) => {
    const id = ctx.params.id; S.set('hc:last', id); const ev = evOf(id); const wa = S.get(K('wa', id), waDef(ev));
    const ok = () => `${phaseBanner(id, '', 'A festa está acontecendo: se o telão desconectar, gere um link novo aqui e abra na TV.', 'A festa acabou: o convite e o telão não recebem mais fotos novas.')}${heroHtml(id)}
${sec('hc-c-tel', 'Telão', 'Dois jeitos de ligar a TV do salão. Use o que for mais fácil para quem monta.', telaoHtml(id))}
${sec('hc-c-wa', 'Mensagem para o grupo', '', `<div class="hc-wa"><div class="field"><label for="hc-wa">Texto que acompanha o link</label><textarea id="hc-wa" class="textarea" rows="3" data-input="hc-wa">${esc(wa)}</textarea></div><div class="flex flex-wrap hc-gap-3"><button class="btn btn-line btn-sm" type="button" data-act="wa">${A.icon('send', 16)} Abrir no WhatsApp (simulado)</button><button class="btn btn-quiet btn-sm" type="button" data-act="hc-wa-copy">${A.icon('copy', 16)} Copiar mensagem</button></div></div>`)}`;
    return { title: 'Compartilhar', html: A.hostShell(ctx, { section: 'compartilhar', pageClass: 'wide' }, pageHd('Compartilhar', 'Convite, peças para imprimir e telão, num lugar só. Convidado não cria conta.') + stFull(id, ok)), after: () => { clearInterval(tick); if (!$('#hc-count') && !$('#hc-cod-min')) return; const up = () => { const el = $('#hc-count'), cm = $('#hc-cod-min'); if (!el && !cm) return clearInterval(tick); if (cm) { const m = minRest(+cm.dataset.exp); cm.textContent = m + ' min'; } if (!el) return; const left = +el.dataset.exp - Date.now(); if (left <= 0) { clearInterval(tick); return rerender(); } el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; }; up(); tick = setInterval(up, 1000); } };
  });

  /* =====================================================================
     AJUSTES  /h/e/:id/ajustes[/:section]
     ===================================================================== */
  const SECS = [['evento', 'Evento', 'calendar'], ['privacidade', 'Privacidade e consentimento', 'shield'], ['equipe', 'Equipe', 'users'], ['exportar', 'Exportar e apagar', 'download'], ['plano', 'Plano e cobrança', 'wallet']];
  const retDates = (id) => { const d = new Date(dataEv(id) + 'T12:00:00'); const f = (n) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10); return [f(330), f(365)]; };

  const eventoPanel = (id) => {
    const ev = evOf(id), ro = !canEdit(); const d = dataEv(id); const dis = ro ? 'disabled' : '';
    return `${roBanner('Cerimonialista vê os dados do evento, mas só dono e casal alteram.')}<form data-submit="hc-evt-save" data-input="hc-evt-input" novalidate class="hc-doc">${A.field({ name: 'nome', label: 'Nome do evento', value: ev.nome, required: true, extra: dis })}${A.field({ name: 'data', label: 'Data', type: 'date', value: d, required: true, extra: dis })}${A.field({ name: 'hora', label: 'Hora', type: 'time', value: ev.hora, required: true, extra: dis })}${A.field({ name: 'local', label: 'Local', value: ev.local, required: true, extra: dis })}${A.field({ name: 'tipo', label: 'Tipo de evento', options: A.data.tipos.map((t) => [t.id, t.nome]), value: ev.tipo, required: true, extra: dis })}${A.field({ name: 'esperados', label: 'Convidados esperados', type: 'number', value: ev.esperados, required: true, extra: dis })}
<div id="hc-evt-warn" class="hc-warn" aria-live="polite"></div><div class="hc-doc-act"><button class="btn btn-primary" type="submit" ${dis}>Salvar alterações</button></div></form>`;
  };
  A.inputs['hc-evt-input'] = (f) => {
    const form = f.closest('form'); const id = curId(), ev = evOf(id); const g = (n) => form.elements[n].value.trim(); const w = [];
    if (g('nome') !== ev.nome) w.push('O nome novo aparece no convite, no telão, no álbum e no livro de recados.');
    if (g('data') !== dataEv(id)) w.push('Mudar a data muda a contagem regressiva e as datas de exportar (dia 330) e apagar (dia 365). Convidados que já entraram não são avisados.');
    if (g('hora') !== ev.hora) w.push('A hora nova aparece na tela de convite do convidado.');
    if (g('local') !== ev.local) w.push('O local novo aparece no convite e no “Você foi convidado para”.');
    if (g('tipo') !== ev.tipo) w.push('Trocar o tipo muda os textos e as sugestões de missão. Suas missões atuais continuam.');
    if (+g('esperados') !== +ev.esperados) w.push('Mudar os convidados esperados muda a barra de participação em Hoje.');
    $('#hc-evt-warn').innerHTML = w.length ? `<div class="hc-bn">${A.icon('info', 18)}<div><b class="t-h">O que muda ao salvar</b><ul>${w.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : '';
  };
  A.acts['hc-evt-save'] = async (f) => {
    if (!canEdit()) return; const id = curId(), ev = evOf(id);
    const v = A.validate(f, { nome: A.rules.min(3, 'Dê um nome com pelo menos 3 letras.'), esperados: (x) => (Number.isInteger(+x) && +x >= 1 && +x <= 999 ? '' : 'Informe um número de 1 a 999.'), local: A.rules.min(3, 'Informe o local.') }); if (!v) return;
    if (v.tipo !== ev.tipo) { const ok = await A.confirm({ title: 'Trocar o tipo de evento?', body: '<p>Os textos e as sugestões passam a seguir o novo tipo. As missões e fotos que você já tem ficam como estão.</p>', confirm: 'Trocar tipo' }); if (!ok) return; }
    S.set(K('evento', id), { nome: v.nome, data: v.data, hora: v.hora, local: v.local, tipo: v.tipo, esperados: +v.esperados }); Object.assign(ev, { nome: v.nome, hora: v.hora, local: v.local, tipo: v.tipo, esperados: +v.esperados });
    A.toast('Dados do evento salvos.'); rerender();
  };

  const CONS = [['entrada', 'Entrada no evento', 'Texto que o convidado lê e aceita antes de tirar a primeira foto.', 'Ao entrar, você aceita que as fotos que tirar aqui apareçam no telão e no álbum deste evento. Não coletamos sua localização e removemos os dados de GPS da foto antes de enviar.'], ['fora', 'Compartilhamento fora da festa', 'Texto para quando o convidado quer levar uma foto para fora do evento.', 'Ao compartilhar uma foto fora da festa, você avisa quem aparece nela. Fotos com menores de idade não podem ser compartilhadas fora do evento.']];
  const getCons = (id) => S.get(K('consent', id), null) || Object.fromEntries(CONS.map(([k, , , txt]) => [k, [{ v: 1, em: '2026-09-01', txt, aceites: 0 }, { v: 2, em: '2026-10-03', txt, aceites: A.data.guests.filter((g) => g.consentiu).length }]]));
  const privacidadePanel = (id) => {
    const c = getCons(id), [d330, d365] = retDates(id), ro = !canEdit();
    const cons = CONS.map(([k, nome, lead]) => { const l = c[k].slice().reverse(); const cur = l[0]; return `<section class="hc-sec" aria-label="${esc(nome)}"><div class="hc-sec-h"><h3 class="hc-h2">${esc(nome)}</h3><button class="btn btn-line btn-sm" type="button" data-act="hc-consent-new" data-t="${k}" ${ro ? 'disabled' : ''}>Publicar nova versão</button></div><p class="hc-sec-p hc-tight">${esc(lead)}</p><p class="hc-note hc-tight"><b class="hc-strong">Versão ${cur.v}</b> <span class="badge ok">vigente</span> · em vigor desde ${fmtD(cur.em)} · ${cur.aceites} aceites (mostramos só totais, nunca quem aceitou)</p>
<details class="hc-d ds-fold sem-borda"><summary>Ler texto vigente</summary><div class="body ds-fold-b"><div class="hc-txt">${esc(cur.txt)}</div></div></details>${l.length > 1 ? `<details class="hc-d ds-fold sem-borda"><summary>Histórico de versões (${l.length - 1} anterior${l.length > 2 ? 'es' : ''})</summary><div class="stack body ds-fold-b stack-3">${l.slice(1).map((x) => `<div><b>Versão ${x.v}</b> <span class="hc-note">· de ${fmtD(x.em)} · ${x.aceites} aceites</span><div class="hc-txt hc-gap-2">${esc(x.txt)}</div></div>`).join('')}</div></details>` : ''}</section>`; }).join('');
    return `${cons}<section class="hc-sec" aria-label="Menores de 18 anos"><h3 class="hc-h2">Menores de 18 anos</h3><p class="muted hc-gap-2">${getMenores(id) ? 'Proteções ligadas.' : 'Proteções desligadas.'} <a class="link" href="${baseOf(id)}/estilo">Alterar em Estilo</a></p></section>
<section class="hc-sec" aria-label="Por quanto tempo guardamos"><h3 class="hc-h2">Por quanto tempo guardamos</h3><ul class="hc-hist hc-gap-3"><li><time>Dia 330</time><span>${fmtD(d330)}: as fotos vão para a sua nuvem.</span></li><li><time>Dia 365</time><span>${fmtD(d365)}: apagamos tudo de verdade.</span></li></ul><div class="hc-row"><div><b class="t-h">Me avisar por e-mail 30 dias antes</b><p class="hc-note">Para você exportar a tempo.</p></div>${sw(S.get(K('retaviso', id), true), 'hc-ret-aviso', 'Avisar por e-mail 30 dias antes de apagar', ro ? 'disabled' : '')}</div></section>`;
  };
  A.acts['hc-ret-aviso'] = () => { const id = curId(); S.set(K('retaviso', id), !S.get(K('retaviso', id), true)); saved('Preferência de aviso salva.'); rerender(); };
  A.acts['hc-consent-new'] = (el) => {
    const id = curId(), t = el.dataset.t, c = getCons(id), cur = c[t][c[t].length - 1], nome = CONS.find((x) => x[0] === t)[1];
    const api = A.modal({ title: `Nova versão: ${nome}`, body: `<form data-submit="hc-consent-save" novalidate>${A.field({ name: 'txt', label: 'Texto novo', rows: 6, value: cur.txt, required: true })}<label class="check"><input type="checkbox" name="reask" checked><span>Pedir novo aceite de quem já entrou</span></label><p class="hc-note">A versão ${cur.v + 1} fica datada de hoje. A versão ${cur.v} continua no histórico.</p></form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Publicar versão ' + (cur.v + 1), variant: 'btn-primary', onClick: (a) => { A.acts['hc-consent-save']($('form', a.el)); return false; } }] });
    hcModal = api; $('form', api.el).dataset.t = t;
  };
  A.acts['hc-consent-save'] = (f) => { const v = A.validate(f, { txt: A.rules.min(20, 'Escreva o texto completo (mínimo de 20 letras).') }); if (!v) return; const id = curId(), t = f.dataset.t, c = getCons(id); const cur = c[t][c[t].length - 1]; c[t] = [...c[t], { v: cur.v + 1, em: new Date().toISOString().slice(0, 10), txt: v.txt, aceites: 0 }]; S.set(K('consent', id), c); hcModal && hcModal.close(); A.toast(`Versão ${cur.v + 1} publicada${v.reask ? ': quem já entrou será convidado a aceitar de novo' : ''}.`); rerender(); };

  const getTeam = () => A.data.team;
  const saveTeam = (l) => { A.data.team.splice(0, A.data.team.length, ...l); S.set('hc:team', l); };
  const equipePanel = (id) => {
    if (role() === 'planner') return A.emptyState({ icon: 'lock', title: 'Só dono e casal gerenciam a equipe', body: 'Você entrou como cerimonialista: pode moderar fotos e acompanhar a festa, mas convidar ou remover pessoas é com o dono ou o casal. Peça a eles se precisar de acesso para mais alguém.' });
    const t = getTeam();
    return `${A.stateful({ ok: () => `<div class="list hc-list-gap">${t.map((m) => `<div class="li hc-team-li"><span class="avatar" aria-hidden="true">${esc(m.nome.split(' ').map((x) => x[0]).slice(0, 2).join(''))}</span><div class="grow"><b>${esc(m.nome)}</b>${m.papel === role() ? ' <span class="badge acc">Você</span>' : ''}<div class="hc-note">${esc(m.email)}${m.pendente ? ' · convite pendente' : ''}</div></div>${m.papel === 'owner' ? `<span class="hc-note">${A.data.papeis.owner}</span>` : `<select class="select hc-sel" aria-label="Papel de ${esc(m.nome)}" data-change="hc-team-role" data-id="${m.id}">${['couple', 'planner'].map((p) => `<option value="${p}" ${m.papel === p ? 'selected' : ''}>${A.data.papeis[p]}</option>`).join('')}</select>${m.pendente ? `<button class="btn btn-quiet btn-sm" type="button" data-act="hc-team-resend" data-id="${m.id}">Reenviar</button>` : ''}<button class="btn btn-quiet hc-ib" type="button" data-act="hc-team-del" data-id="${m.id}" aria-label="Remover ${esc(m.nome)}">${A.icon('trash', 18)}</button>`}</div>`).join('')}</div>`, empty: A.emptyState({ icon: 'users', title: 'Só você por enquanto', body: 'Convide o casal ou a cerimonialista pelo e-mail abaixo.' }), isEmpty: () => !t.length })}
<form data-submit="hc-team-add" novalidate class="hc-doc"><h3 class="hc-h2 hc-h-gap">Convidar para a equipe</h3>${A.field({ name: 'email', label: 'E-mail', type: 'email', required: true, placeholder: 'nome@email.com' })}${A.field({ name: 'papel', label: 'Papel', options: [['couple', 'Casal (acesso completo)'], ['planner', 'Cerimonialista (moderação e acompanhamento)']], value: 'couple', required: true })}<div class="hc-doc-act"><button class="btn btn-primary" type="submit">Enviar convite</button></div><p class="hc-note hc-gap-3">Simulado: nenhum e-mail sai de verdade neste protótipo.</p></form>`;
  };
  A.acts['hc-team-add'] = (f) => { const v = A.validate(f, { email: (x) => A.rules.email(x) || (getTeam().some((m) => m.email.toLowerCase() === x.toLowerCase()) ? 'Essa pessoa já está na equipe ou tem convite pendente.' : '') }); if (!v) return; const antes = getTeam().slice(); saveTeam([...antes, { id: 't' + A.uid(), nome: v.email.split('@')[0], email: v.email, papel: v.papel, pendente: true }]); A.toast('Convite criado (simulado, nenhum e-mail saiu).', { undo: () => { saveTeam(antes); rerender(); } }); rerender(); };
  A.inputs['hc-team-role'] = (el) => { const antes = getTeam().slice(); saveTeam(antes.map((m) => (m.id === el.dataset.id ? Object.assign({}, m, { papel: el.value }) : m))); A.toast('Papel alterado.', { undo: () => { saveTeam(antes); rerender(); } }); rerender(); };
  A.acts['hc-team-resend'] = () => A.toast('Convite reenviado (simulado).');
  A.acts['hc-team-del'] = async (el) => { const antes = getTeam().slice(); const m = antes.find((x) => x.id === el.dataset.id); const ok = await A.confirm({ title: `Remover ${m.nome}?`, body: '<p>A pessoa perde o acesso ao painel na hora. Fotos e missões que ela criou continuam no evento.</p>', confirm: 'Remover da equipe', danger: true }); if (!ok) return; saveTeam(antes.filter((x) => x !== m)); A.toast(`${m.nome} saiu da equipe.`); rerender(); };

  const driveSt = (id) => S.get(K('drive', id), { st: 'off' });
  const exportarPanel = (id) => {
    const d = driveSt(id), [d330, d365] = retDates(id), ro = role() !== 'owner'; const ent = S.get(K('entrega', id), { on: false, q: 'fim' }); const lv = S.get(K('livro', id), null); const ex = S.get(K('lastexp', id), null);
    const n = A.data.photos.filter((p) => p.status === 'aprovada').length;
    const dr = { off: ['Não conectado', '<button class="btn btn-line btn-sm" type="button" data-act="hc-drive-on">Conectar Google Drive (simulado)</button>'], on: [`Conectado como ${esc(d.conta || '')}`, '<button class="btn btn-quiet btn-sm" type="button" data-act="hc-drive-off">Desconectar</button>'], reauth: ['A sessão expirou: entre de novo para continuar exportando', '<button class="btn btn-line btn-sm" type="button" data-act="hc-drive-re">Reautenticar (simulado)</button>'] }[d.st];
    return `<section class="hc-sec" aria-label="Baixar tudo"><h3 class="hc-h2">Baixar tudo</h3><p class="hc-sec-p hc-gap-2">${n ? `Um arquivo ZIP com as ${n} fotos aprovadas, sem dados de localização.` : 'Ainda não há fotos aprovadas. Quando houver, elas saem num ZIP, sem dados de localização.'}</p><button class="btn btn-line btn-sm" type="button" data-act="hc-zipall">${A.icon('download', 16)} Baixar arquivo ZIP (simulado)</button></section>
<section class="hc-sec" aria-label="Google Drive"><h3 class="hc-h2">Google Drive</h3><div class="hc-row"><div role="status" aria-live="polite"><span class="badge ${d.st === 'on' ? 'ok' : d.st === 'reauth' ? 'warn' : ''}">${dr[0]}</span>${ex && d.st === 'on' ? `<div class="hc-note">Última exportação: ${fmtDT(ex)}</div>` : ''}</div><div class="flex flex-wrap">${dr[1]}${d.st === 'on' ? '<button class="btn btn-line btn-sm" type="button" data-act="hc-drive-exp">Exportar agora</button><button class="btn btn-quiet btn-sm" type="button" data-act="hc-drive-expire">Protótipo: simular sessão expirada</button>' : ''}</div></div><p class="hc-note">Integração simulada: nenhuma conta Google é acessada.</p></section>
<section class="hc-sec" aria-label="Entrega das fotos ao convidado"><h3 class="hc-h2">Entrega das fotos ao convidado</h3><div class="hc-row"><div><b class="t-h">Enviar para cada convidado as fotos em que ele aparece ou que tirou</b><p class="hc-note">Só depois que a interação social abrir.</p></div>${sw(ent.on, 'hc-entrega', 'Liberar entrega das fotos ao convidado')}</div>${ent.on ? `<div class="flex flex-wrap hc-gap-5 hc-bot"><div class="hc-q">${A.field({ name: 'q', label: 'Quando enviar', options: [['fim', 'Quando o evento terminar'], ['dia', 'No dia seguinte'], ['manual', 'Só quando eu mandar']], value: ent.q, extra: 'data-change="hc-entrega-q"', required: true })}</div><button class="btn btn-line btn-sm" type="button" data-act="hc-entrega-now">Enviar agora (simulado)</button></div>` : ''}</section>
<section class="hc-sec" aria-label="Livro em PDF"><h3 class="hc-h2">Livro em PDF</h3><div class="hc-row"><div><b class="t-h">${lv ? `Livro pronto em ${fmtDT(lv)}` : 'Ainda não gerado'}</b><p class="hc-note">As fotos mais curtidas e as missões, em páginas prontas para imprimir.</p></div><div class="flex flex-wrap"><button class="btn btn-line btn-sm" type="button" data-act="hc-livro">${lv ? 'Gerar de novo' : 'Gerar livro'}</button>${lv ? `<button class="btn btn-quiet btn-sm" type="button" data-act="hc-livro-dl">${A.icon('download', 16)} Baixar PDF (simulado)</button>` : ''}</div></div></section>
<section class="hc-sec" aria-label="Datas importantes"><h3 class="hc-h2">Datas importantes</h3><ul class="hc-hist hc-gap-3"><li><time>Dia 330</time><span>${fmtD(d330)}: exportamos para a sua nuvem automaticamente.</span></li><li><time>Dia 365</time><span>${fmtD(d365)}: tudo é apagado de verdade.</span></li></ul></section>
<section class="hc-danger" aria-label="Apagar este evento"><h3 class="hc-h2 hc-bad">Apagar este evento</h3><p class="hc-sec-p hc-gap-2">Apaga fotos, missões, recado, convidados e a equipe deste evento. <b>Não dá para desfazer</b> e o link e o QR deixam de funcionar. Exporte antes.</p>${ro ? '<p class="hc-note">Só o dono do evento pode apagar.</p>' : ''}<button class="btn btn-danger" type="button" data-act="hc-apagar" ${ro ? 'disabled' : ''}>Apagar evento…</button></section>`;
  };
  A.acts['hc-zipall'] = () => A.toast('Baixaria o ZIP de todas as fotos aprovadas (simulado).');
  A.acts['hc-drive-on'] = (el) => A.busy(el, 1200, () => { S.set(K('drive', curId()), { st: 'on', conta: 'voce@gmail.example' }); A.toast('Google Drive conectado (simulado).'); rerender(); });
  A.acts['hc-drive-re'] = (el) => A.busy(el, 1000, () => { S.set(K('drive', curId()), { st: 'on', conta: 'voce@gmail.example' }); A.toast('Sessão renovada (simulado).'); rerender(); });
  A.acts['hc-drive-off'] = async () => { const ok = await A.confirm({ title: 'Desconectar o Google Drive?', body: '<p>As fotos já exportadas ficam no seu Drive. As próximas exportações param até você conectar de novo.</p>', confirm: 'Desconectar' }); if (!ok) return; S.set(K('drive', curId()), { st: 'off' }); A.toast('Google Drive desconectado.'); rerender(); };
  A.acts['hc-drive-expire'] = () => { S.set(K('drive', curId()), { st: 'reauth' }); rerender(); };
  A.acts['hc-drive-exp'] = (el) => A.busy(el, 1800, () => { S.set(K('lastexp', curId()), Date.now()); A.toast(`${A.data.photos.filter((p) => p.status === 'aprovada').length} fotos enviadas ao Drive (simulado).`); rerender(); });
  A.acts['hc-entrega'] = () => { const id = curId(); const e = S.get(K('entrega', id), { on: false, q: 'fim' }); S.set(K('entrega', id), Object.assign({}, e, { on: !e.on })); saved(!e.on ? 'Entrega ao convidado ligada.' : 'Entrega ao convidado desligada.'); rerender(); };
  A.inputs['hc-entrega-q'] = (el) => { const id = curId(); S.set(K('entrega', id), Object.assign(S.get(K('entrega', id), { on: true }), { q: el.value })); saved('Horário da entrega salvo.'); };
  A.acts['hc-entrega-now'] = () => A.toast('Enviaria agora as fotos para os convidados que aceitaram (simulado).');
  A.acts['hc-livro'] = (el) => A.busy(el, 1800, () => { S.set(K('livro', curId()), Date.now()); A.toast('Livro gerado (simulado).'); rerender(); });
  A.acts['hc-livro-dl'] = () => A.toast('Baixaria o livro em PDF (simulado).');
  A.acts['hc-apagar'] = async () => { const id = curId(); const ev = evOf(id); const ok = await A.confirm({ title: `Apagar “${ev.nome}”?`, body: '<p>Fotos, missões, recado, convidados e equipe são apagados de vez. O link e o QR param de funcionar. Não existe como recuperar.</p>', confirm: 'Apagar para sempre', danger: true, type: 'apagar' }); if (!ok) return; A.toast('Simulado: no protótipo nada foi apagado. Na versão real o evento sumiria agora.', { ms: 5000 }); location.hash = '#/h'; };

  const planoPanel = (id) => { const ev = evOf(id); const p = A.data.planos.find((x) => x.id === ev.plano) || A.data.planos[0]; return `<div class="stack stack-3 hc-plan"><div><h3 class="hc-h1">${esc(p.nome)}</h3><p class="t-lead hc-gap-2">${p.preco ? A.brl(p.preco) + ' por evento' : 'Sem custo'}</p></div><ul class="stack stack-2 hc-bul">${p.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul><div><a class="btn btn-primary" href="#/h/plano">Ver plano e cobrança</a></div></div>`; };

  const ajRender = (ctx, section) => {
    const id = ctx.params.id; S.set('hc:last', id); const cur = section || null; const act = cur || 'evento';
    const meta = SECS.find((s) => s[0] === act);
    if (!meta) return { title: 'Ajustes', html: A.hostShell(ctx, { section: 'ajustes' }, A.emptyState({ icon: 'warn', title: 'Essa seção não existe', body: 'Escolha uma das seções dos ajustes.', cta: `<a class="btn btn-line" href="${baseOf(id)}/ajustes">Voltar aos ajustes</a>` })) };
    const body = { evento: eventoPanel, privacidade: privacidadePanel, equipe: equipePanel, exportar: exportarPanel, plano: planoPanel }[act](id);
    const list = `<nav class="hc-aj-nav" aria-label="Seções dos ajustes">${SECS.map(([k, l]) => `<a href="${baseOf(id)}/ajustes/${k}" ${act === k && cur ? 'aria-current="page"' : ''} ${act === k && !cur ? 'class="is-sel"' : ''}>${l}<span class="chev">${A.icon('chevron', 16)}</span></a>`).join('')}</nav>`;
    const panel = `<section class="hc-aj-panel" aria-labelledby="hc-aj-h"><a class="btn btn-quiet btn-sm hc-aj-back" href="${baseOf(id)}/ajustes">${A.icon('back', 16)} Ajustes</a><h2 class="hc-h1" id="hc-aj-h">${meta[1]}</h2>${A.stateful({ ok: body, empty: body, loading: A.skel(4, 64) })}</section>`;
    return { title: meta[1] + ' · Ajustes', html: A.hostShell(ctx, { section: 'ajustes' }, `<div class="hc-aj ${cur ? 'has-sec' : ''}"><div class="hc-aj-side"><h1 class="hc-h2">Ajustes</h1><p class="hc-note hc-gap-2">Dados do evento, privacidade, equipe e exportação.</p>${list}</div>${panel}</div>`) };
  };
  A.route('/h/e/:id/ajustes', (ctx) => ajRender(ctx, null));
  A.route('/h/e/:id/ajustes/:section', (ctx) => ajRender(ctx, ctx.params.section));

  /* =====================================================================
     COMUNIDADE  /h/e/:id/comunidade[/:postId]
     ===================================================================== */
  const TOPICOS = ['Fornecedores', 'Orçamento', 'Convidados', 'Telão e fotos', 'Cerimonial', 'Dia da festa'];
  const SEED = [
    { id: 'p1', topico: 'Telão e fotos', titulo: 'Qual modelo de telão funcionou melhor no jantar?', corpo: 'Estou entre Polaroide e Mural. O salão é comprido e a TV fica no fundo. Alguém testou os dois no mesmo evento?', autor: 'Helena (festa de 15 anos)', min: 190, resp: [{ id: 'r1', autor: 'Rogério (formatura)', corpo: 'Mural no jantar, Polaroide só na hora do parabéns. Foto vertical aparece inteira nos dois.', min: 120 }, { id: 'r2', autor: 'Tainá (aniversário de 40)', corpo: 'Concordo. A pista pede ritmo rápido.', min: 70 }] },
    { id: 'p2', topico: 'Dia da festa', titulo: 'Como avisar os convidados do QR sem chato de microfone?', corpo: 'Quero que todo mundo saiba que dá para tirar foto pelo celular, mas sem ficar repetindo no microfone.', autor: 'Caio (confraternização)', min: 1500, resp: [{ id: 'r3', autor: 'Lívia (casamento)', corpo: 'Placa na entrada e um card em cada mesa. Funcionou sem avisar ninguém.', min: 1300 }] },
    { id: 'p3', topico: 'Orçamento', titulo: 'Vale imprimir card de mesa ou só a placa?', corpo: 'O orçamento está apertado. Com a placa na entrada já basta ou os cards fazem diferença?', autor: 'Dani (chá de bebê)', min: 2900, resp: [] },
    { id: 'p4', topico: 'Cerimonial', titulo: 'A cerimonialista pode moderar sem ver os convidados?', corpo: 'Quero que ela cuide da fila de fotos durante a festa, mas sem mexer no estilo. Dá para dividir assim?', autor: 'Lívia (casamento)', min: 4300, resp: [{ id: 'r4', autor: 'Helena (festa de 15 anos)', corpo: 'Dá: o papel Cerimonialista só modera e acompanha. Estilo e equipe ficam com dono e casal.', min: 4100 }] },
    { id: 'p5', topico: 'Convidados', titulo: 'Convidado sem celular com internet: como fazer?', corpo: 'Parte da família não leva celular. Tem jeito de participarem?', autor: 'Rogério (formatura)', min: 6000, resp: [] },
    { id: 'p6', topico: 'Fornecedores', titulo: 'Gráfica rápida para imprimir a placa: indicações?', corpo: 'Preciso do PDF impresso em 3 dias com a sangria certa. Alguém com indicação em Belo Horizonte?', autor: 'Tainá (aniversário de 40)', min: 8600, resp: [{ id: 'r5', autor: 'Caio (confraternização)', corpo: 'Pergunta na gráfica se aceitam PDF com sangria de 3 mm antes de fechar.', min: 8200 }] },
  ];
  const getPosts = () => S.get('hc:posts', SEED);
  const setPosts = (p) => S.set('hc:posts', p);
  const getHid = () => S.get('hc:com-oculto', []);
  const getBloq = () => S.get('hc:com-bloq', []);
  let comLimit = 5, comQ = '';
  const comFiltro = () => S.get('hc:com-filtro', 'Tudo');
  const autorN = (a) => a.split(' (')[0];
  const comList = (id) => {
    const bloq = getBloq(); let ps = getPosts().filter((p) => !bloq.includes(autorN(p.autor)) && !getHid().includes(p.id));
    const f = comFiltro(); if (f !== 'Tudo') ps = ps.filter((p) => p.topico === f); const q = comQ.toLowerCase().trim(); if (q) ps = ps.filter((p) => (p.titulo + ' ' + p.corpo).toLowerCase().includes(q));
    if (!ps.length) return A.emptyState({ icon: 'chat', title: q || f !== 'Tudo' ? 'Nenhuma conversa encontrada' : 'Ainda não há conversas', body: q || f !== 'Tudo' ? 'Tente outro assunto ou limpe a busca.' : 'Seja a primeira pessoa a começar uma conversa.', cta: `<button class="btn btn-line" data-act="hc-com-new">Começar uma conversa</button>` });
    const show = ps.slice(0, comLimit);
    return `<div>${show.map((p) => `<article class="hc-post"><a class="hc-pt" href="${baseOf(id)}/comunidade/${p.id}">${esc(p.titulo)}</a><p class="hc-clamp">${esc(p.corpo)}</p><div class="hc-meta"><span class="hc-tp">${esc(p.topico)}</span><span>${p.meu ? 'Você' : esc(p.autor)}</span><span>${A.ago(p.min)}</span><span>${p.resp.length} ${p.resp.length === 1 ? 'resposta' : 'respostas'}</span>${p.meu ? '' : '<span class="hc-ex">Exemplo fictício</span>'}</div></article>`).join('')}</div>${ps.length > show.length ? `<div class="hc-more"><button class="btn btn-line" data-act="hc-com-more">Ver conversas mais antigas</button></div>` : ''}`;
  };
  A.acts['hc-com-more'] = () => { comLimit += 5; const l = $('#hc-com-list'); l && (l.innerHTML = comList(curId())); };
  A.inputs['hc-com-q'] = (el) => { comQ = el.value; comLimit = 5; const l = $('#hc-com-list'); l && (l.innerHTML = comList(curId())); };
  A.acts['hc-com-f'] = (el) => { S.set('hc:com-filtro', el.dataset.v); comLimit = 5; rerender(); };
  A.acts['hc-com-new'] = () => {
    const api = A.modal({ title: 'Começar uma conversa', wide: false, body: `<form data-submit="hc-com-submit" novalidate class="stack stack-3">${A.field({ name: 'topico', label: 'Assunto', options: TOPICOS, required: true })}${A.field({ name: 'titulo', label: 'Título', required: true, extra: 'maxlength="160"', hint: 'Até 160 letras.' })}${A.field({ name: 'corpo', label: 'Mensagem', rows: 5, required: true, extra: 'maxlength="4000"', hint: 'Não cite nomes de convidados nem poste fotos deles.' })}</form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Publicar', variant: 'btn-primary', onClick: (a) => { A.acts['hc-com-submit']($('form', a.el)); return false; } }] }); hcModal = api;
  };
  A.acts['hc-com-submit'] = (f) => {
    const v = A.validate(f, { titulo: A.rules.min(8, 'Escreva um título com pelo menos 8 letras.'), corpo: A.rules.min(15, 'Conte um pouco mais (mínimo de 15 letras).') }); if (!v) return;
    const antes = getPosts(); const p = { id: 'u' + A.uid(), topico: v.topico, titulo: v.titulo, corpo: v.corpo, autor: 'Você', meu: true, min: 0, resp: [] }; setPosts([p, ...antes]); hcModal && hcModal.close();
    A.toast('Conversa publicada.', { undo: () => { setPosts(antes); rerender(); } }); rerender();
  };
  A.route('/h/e/:id/comunidade', (ctx) => {
    const id = ctx.params.id; S.set('hc:last', id); comLimit = 5; comQ = ''; const f = comFiltro();
    const flt = ['Tudo', ...TOPICOS].map((t) => `<button type="button" data-act="hc-com-f" data-v="${t}" aria-pressed="${t === f}" data-k="cf-${t}">${t}</button>`).join('');
    const ok = () => `<p class="hc-priv"><b>Aqui conversam anfitriões de contas diferentes.</b> O que você escreve fica visível para outras pessoas que organizam festas, nunca para convidados. Não cite nomes de convidados nem poste fotos deles.</p>
<div class="hc-bar"><div class="search grow">${A.icon('search', 18)}<input type="search" aria-label="Buscar nas conversas" placeholder="Buscar nas conversas" data-input="hc-com-q"></div><button class="btn btn-primary" type="button" data-act="hc-com-new">${A.icon('plus', 16)} Começar uma conversa</button></div>
<div class="hc-seg" role="group" aria-label="Filtrar por assunto">${flt}</div><div id="hc-com-list">${comList(id)}</div>`;
    const empty = A.emptyState({ icon: 'chat', title: 'Ainda não há conversas', body: 'Seja a primeira pessoa a começar uma conversa entre anfitriões.', cta: '<button class="btn btn-line" data-act="hc-com-new">Começar uma conversa</button>' });
    return { title: 'Comunidade', html: A.hostShell(ctx, { section: 'comunidade' }, `<div class="hc-col1">${pageHd('Comunidade', 'Troque ideia com quem também organiza festa: o que funcionou, o que não, quem indicar.')}${A.stateful({ ok, empty, loading: A.skel(5, 84), error: A.errorState({ title: 'Não deu para carregar as conversas', body: 'Confira a conexão e tente de novo. Suas conversas continuam salvas.' }) })}</div>`) };
  });
  A.acts['hc-msg-menu'] = (el) => {
    const r = el.dataset.r, own = el.dataset.own === '1'; const items = own ? [{ label: 'Apagar', icon: 'trash', danger: true, onClick: () => delMsg(r) }] : [{ label: 'Denunciar', icon: 'flag', onClick: () => denunciar(r) }, { label: 'Bloquear autor', icon: 'lock', danger: true, onClick: () => bloquear(r) }];
    A.menu(el, items);
  };
  const findMsg = (pid, mid) => { const p = getPosts().find((x) => x.id === pid); if (!p) return null; return mid === 'post' ? { p, m: p } : { p, m: p.resp.find((x) => x.id === mid) }; };
  const curPost = () => (location.hash.match(/comunidade\/([^/?]+)/) || [])[1];
  async function delMsg(mid) {
    const pid = curPost(), antes = getPosts(); const isPost = mid === 'post';
    const ok = await A.confirm({ title: isPost ? 'Apagar esta conversa?' : 'Apagar esta resposta?', body: isPost ? '<p>A conversa e todas as respostas somem para todo mundo. Não dá para desfazer.</p>' : '<p>A resposta some para todo mundo.</p>', confirm: 'Apagar', danger: true }); if (!ok) return;
    if (isPost) { setPosts(antes.filter((p) => p.id !== pid)); A.toast('Conversa apagada.'); location.hash = baseOf(curId()) + '/comunidade'; } else { setPosts(antes.map((p) => (p.id === pid ? Object.assign({}, p, { resp: p.resp.filter((r) => r.id !== mid) }) : p))); A.toast('Resposta apagada.'); rerender(); }
  }
  function denunciar(mid) {
    const pid = curPost();
    const api = A.modal({ title: 'Denunciar mensagem', body: `<form data-submit="hc-rep-submit" novalidate class="stack stack-3"><p class="muted">A equipe do Albora revisa. Você não verá mais esta mensagem enquanto isso.</p>${A.field({ name: 'motivo', label: 'Motivo', options: ['Ofensivo ou desrespeitoso', 'Propaganda ou spam', 'Expõe dados ou fotos de convidados', 'Outro motivo'], required: true })}${A.field({ name: 'detalhe', label: 'Detalhe', rows: 3 })}</form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Enviar denúncia', variant: 'btn-primary', onClick: (a) => { A.acts['hc-rep-submit']($('form', a.el)); return false; } }] }); hcModal = api; $('form', api.el).dataset.m = mid; $('form', api.el).dataset.p = pid;
  }
  A.acts['hc-rep-submit'] = (f) => { const v = A.validate(f, {}); if (!v) return; const key = f.dataset.p + ':' + f.dataset.m; const antes = getHid(); S.set('hc:com-oculto', [...antes, key]); S.set('hc:com-denuncias', [...S.get('hc:com-denuncias', []), { key, motivo: v.motivo, em: Date.now() }]); hcModal && hcModal.close(); A.toast('Denúncia enviada (simulado). A mensagem ficou oculta para você.', { undo: () => { S.set('hc:com-oculto', antes); rerender(); } }); if (f.dataset.m === 'post') location.hash = baseOf(curId()) + '/comunidade'; else rerender(); };
  async function bloquear(mid) { const f = findMsg(curPost(), mid); if (!f) return; const nome = autorN(f.m.autor); const ok = await A.confirm({ title: `Bloquear ${nome}?`, body: '<p>Você deixa de ver conversas e respostas dessa pessoa. Dá para desbloquear em Ajuda, falando com o suporte (simulado).</p>', confirm: 'Bloquear', danger: true }); if (!ok) return; const antes = getBloq(); S.set('hc:com-bloq', [...antes, nome]); A.toast(`${nome} bloqueado.`, { undo: () => { S.set('hc:com-bloq', antes); rerender(); } }); location.hash = baseOf(curId()) + '/comunidade'; }
  A.acts['hc-show-hidden'] = (el) => { const k = el.dataset.k; S.set('hc:com-oculto', getHid().filter((x) => x !== k)); rerender(); };
  A.acts['hc-reply'] = (f) => { const pid = curPost(); const v = A.validate(f, { texto: A.rules.min(3, 'Escreva sua resposta.') }); if (!v) return; const antes = getPosts(); setPosts(antes.map((p) => (p.id === pid ? Object.assign({}, p, { resp: [...p.resp, { id: 'x' + A.uid(), autor: 'Você', meu: true, corpo: v.texto, min: 0 }] }) : p))); A.toast('Resposta publicada.', { undo: () => { setPosts(antes); rerender(); } }); rerender(); };
  A.route('/h/e/:id/comunidade/:postId', (ctx) => {
    const id = ctx.params.id; S.set('hc:last', id); const back = `<a class="btn btn-quiet btn-sm hc-self" href="${baseOf(id)}/comunidade">${A.icon('back', 16)} Comunidade</a>`;
    const p = getPosts().find((x) => x.id === ctx.params.postId); const hid = getHid(), bloq = getBloq();
    const ok = () => {
      if (!p || hid.includes(p.id + ':post') || bloq.includes(autorN(p.autor))) return `<div class="stack stack-5">${back}${A.emptyState({ icon: 'chat', title: 'Essa conversa não está mais disponível', body: 'Ela foi apagada, denunciada por você ou o autor foi bloqueado. Volte para a lista.', cta: `<a class="btn btn-line" href="${baseOf(id)}/comunidade">Ver conversas</a>` })}</div>`;
      const meta = (m, mid, own) => `<div class="hc-meta"><b class="hc-strong">${own ? 'Você' : esc(m.autor)}</b><span>${A.ago(m.min)}</span><button class="btn btn-quiet hc-ib" data-act="hc-msg-menu" data-r="${mid}" data-own="${own ? 1 : 0}" aria-haspopup="menu" aria-label="Mais ações desta mensagem">${A.icon('more', 18)}</button></div>`;
      const rs = p.resp.map((r) => (hid.includes(p.id + ':' + r.id) || bloq.includes(autorN(r.autor)) ? `<div class="hc-reply"><span class="hc-note">Resposta oculta por você. ${hid.includes(p.id + ':' + r.id) ? `<button class="link" data-act="hc-show-hidden" data-k="${p.id}:${r.id}">Mostrar de novo</button>` : ''}</span></div>` : `<div class="stack hc-reply stack-2">${meta(r, r.id, !!r.meu)}<p class="hc-body">${esc(r.corpo)}</p></div>`)).join('');
      return `<div class="stack stack-5">${back}<article class="stack stack-3"><h1 class="hc-h1">${esc(p.titulo)}</h1><div class="hc-meta"><span class="hc-tp">${esc(p.topico)}</span>${p.meu ? '' : '<span class="hc-ex">Exemplo fictício</span>'}</div>${meta(p, 'post', !!p.meu)}<p class="hc-body">${esc(p.corpo)}</p></article><section aria-label="Respostas" class="hc-resp"><h2 class="hc-h2">${p.resp.length} ${p.resp.length === 1 ? 'resposta' : 'respostas'}</h2>${rs || '<p class="muted hc-gap-2">Ninguém respondeu ainda. Você pode ser a primeira pessoa.</p>'}</section>
<form data-submit="hc-reply" novalidate class="stack stack-3 hc-reply-f">${A.field({ name: 'texto', label: 'Sua resposta', rows: 3, required: true, hint: 'Não cite nomes de convidados nem poste fotos deles.' })}<div><button class="btn btn-primary" type="submit">Responder</button></div></form></div>`;
    };
    return { title: p ? p.titulo : 'Conversa', html: A.hostShell(ctx, { section: 'comunidade' }, `<div class="hc-col1">${A.stateful({ ok, empty: ok(), loading: A.skel(4, 80), error: A.errorState({ title: 'Não deu para carregar esta conversa', body: 'Confira a conexão e tente de novo. Nada foi perdido.' }) })}</div>`) };
  });

  /* =====================================================================
     INSPIRAÇÃO  /h/e/:id/inspiracao
     ===================================================================== */
  const TEMAS = ['Missões', 'Telão', 'Estilo', 'Recado', 'Convite', 'Momentos'];
  const IDEIAS = [
    { id: 'i1', tema: 'Missões', titulo: 'A foto que só quem estava perto viu', corpo: 'Uma missão que pede o detalhe escondido: o gesto, o brinde, a mão na mão. Gera foto diferente da que o fotógrafo faz.', usar: { k: 'missao', titulo: 'A foto que só quem estava perto viu' } },
    { id: 'i2', tema: 'Missões', titulo: 'Brinde de duas gerações', corpo: 'Peça uma foto de um brinde entre a pessoa mais nova e a mais velha da mesa.', usar: { k: 'missao', titulo: 'Brinde de duas gerações' } },
    { id: 'i3', tema: 'Missões', titulo: 'O prato favorito da mesa', corpo: 'Missão leve para o jantar, boa para quem não gosta de posar.', usar: { k: 'missao', titulo: 'O prato favorito da mesa' } },
    { id: 'i4', tema: 'Telão', titulo: 'Mural para a pista cheia', corpo: 'Muitas fotos ao mesmo tempo combinam com a pista. Ligue o Mural e deixe o Polaroide para o jantar.', usar: { k: 'modelo', v: 'mural' } },
    { id: 'i5', tema: 'Telão', titulo: 'Dump no fim da noite', corpo: 'Perto do fim, o ritmo rápido do Dump vira a festa do que passou.', usar: { k: 'modelo', v: 'dump' } },
    { id: 'i6', tema: 'Estilo', titulo: 'Editorial com Terracota & Ocre', corpo: 'Títulos grandes, muito ar e um acento quente. Funciona em festa ao ar livre.', usar: { k: 'estilo', estilo: 'editorial', combo: 2 } },
    { id: 'i7', tema: 'Estilo', titulo: 'Minimal com Grafite & Champanhe', corpo: 'Só o essencial. Boa para evento corporativo e fotos em preto e branco.', usar: { k: 'estilo', estilo: 'minimal', combo: 5 } },
    { id: 'i8', tema: 'Recado', titulo: 'Peça uma lembrança antes da primeira foto', corpo: 'Um recado curto que faz o convidado começar contando algo, e não só clicando.', usar: { k: 'recado', texto: 'Antes da primeira foto, conta para a gente: qual é a sua melhor lembrança de nós?' } },
    { id: 'i9', tema: 'Recado', titulo: 'Um agradecimento sem texto longo', corpo: 'Duas linhas bastam. Quem lê no celular agradece.', usar: { k: 'recado', texto: 'Obrigado por estar aqui. Cada foto sua faz parte da nossa história.' } },
    { id: 'i10', tema: 'Convite', titulo: 'Mensagem curta no grupo da família', corpo: 'Um texto de três linhas, com o link, funciona melhor que o convite longo.', usar: { k: 'convite', texto: 'Gente, tire fotos da festa pelo celular e elas aparecem no telão. Sem baixar nada, sem conta. Link: ' } },
    { id: 'i11', tema: 'Momentos', titulo: 'Abra a interação depois do jantar', corpo: 'Deixe o feed e as reações para quando todo mundo já está solto.', usar: { k: 'gate', momento: 'Jantar' } },
    { id: 'i12', tema: 'Momentos', titulo: 'Uma missão relâmpago na pista', corpo: 'Dez segundos, uma foto: a missão que mais vira assunto no telão.', usar: { k: 'missao', titulo: 'Dez segundos de pista' } },
  ];
  const insSalvas = () => S.get('hc:ins-salvas', []);
  const insFiltro = () => S.get('hc:ins-filtro', 'Tudo');
  const usarLbl = { missao: 'Adicionar como missão', modelo: 'Ligar no telão', estilo: 'Aplicar estilo', recado: 'Usar como recado', convite: 'Usar na mensagem', gate: 'Usar no evento' };
  const insList = (id) => {
    const f = insFiltro(), sv = insSalvas(); let l = IDEIAS; if (f === 'Salvas') l = l.filter((i) => sv.includes(i.id)); else if (f !== 'Tudo') l = l.filter((i) => i.tema === f);
    if (!l.length) return A.emptyState({ icon: 'sparkle', title: f === 'Salvas' ? 'Você ainda não salvou nenhuma ideia' : 'Nada neste tema ainda', body: f === 'Salvas' ? 'Toque em Salvar nas ideias que gostar. Elas ficam aqui.' : 'Escolha outro tema.', cta: f === 'Salvas' ? '<button class="btn btn-line" data-act="hc-ins-f" data-v="Tudo">Ver todas as ideias</button>' : '' });
    return `<div class="hc-ideas">${l.map((i) => { const s = sv.includes(i.id); return `<article class="hc-idea"><h3>${esc(i.titulo)}</h3><p>${esc(i.corpo)}</p><div class="acts"><span class="hc-tp">${esc(i.tema)}</span><button class="btn btn-quiet btn-sm" type="button" data-act="hc-ins-save" data-id="${i.id}" aria-pressed="${s}" data-k="sv-${i.id}">${A.icon(s ? 'check' : 'plus', 16)} ${s ? 'Salva' : 'Salvar'}</button><button class="btn btn-line btn-sm" type="button" data-act="hc-ins-use" data-id="${i.id}">${usarLbl[i.usar.k]}</button></div></article>`; }).join('')}</div>`;
  };
  A.acts['hc-ins-f'] = (el) => { S.set('hc:ins-filtro', el.dataset.v); rerender(); };
  A.acts['hc-ins-save'] = (el) => { const sv = insSalvas(), i = el.dataset.id; const on = sv.includes(i); S.set('hc:ins-salvas', on ? sv.filter((x) => x !== i) : [...sv, i]); A.toast(on ? 'Ideia removida das salvas.' : 'Ideia salva.', { undo: () => { S.set('hc:ins-salvas', sv); rerender(); } }); rerender(); };
  A.acts['hc-ins-use'] = async (el) => {
    const id = curId(); const i = IDEIAS.find((x) => x.id === el.dataset.id), u = i.usar; const ev = evOf(id); const link = `<a class="link" href="${baseOf(id)}/estilo">Ver em Estilo</a>`;
    if (!canEdit()) { A.toast('Só dono e casal aplicam ideias no evento. Salve para mostrar a eles.', { kind: 'bad' }); return; }
    if (u.k === 'missao') { const l = getMiss(id); if (l.some((m) => m.titulo === u.titulo)) { A.toast('Essa missão já está no seu evento.'); return; } setMiss(id, [...l, { id: 'c' + A.uid(), titulo: u.titulo, on: true, custom: true, fotos: 0 }]); A.toast('Missão adicionada ao seu evento.', { undo: () => { setMiss(id, l); } }); }
    else if (u.k === 'modelo') { const l = getModelos(id); if (ev.plano === 'gratis' && u.v !== 'polaroide') { A.toast('Esse modelo é do plano Completo.', { kind: 'bad' }); return; } if (l.includes(u.v)) { A.toast('Esse modelo já está ligado.'); return; } S.set(K('modelos', id), [...l, u.v]); A.toast('Modelo ligado no telão.', { undo: () => S.set(K('modelos', id), l) }); }
    else if (u.k === 'estilo') { const antes = S.get(K('estilo', id), {}); setEstilo(id, { estilo: u.estilo, combo: u.combo, custom: false }); A.toast('Estilo aplicado.', { undo: () => { S.set(K('estilo', id), antes); applyEstiloToEvent(id); } }); }
    else if (u.k === 'recado') { const r = getRecado(id); if (r.texto) { const ok = await A.confirm({ title: 'Trocar o seu recado?', body: '<p>Você já tem um recado escrito. Ele será substituído por este texto.</p>', confirm: 'Trocar recado' }); if (!ok) return; } setRecado(id, { texto: u.texto }); A.toast('Recado atualizado.', { undo: () => S.set(K('recado', id), r) }); }
    else if (u.k === 'convite') { const antes = S.get(K('wa', id), null); S.set(K('wa', id), u.texto + `https://albora.app/e/${ev.slug}`); A.toast('Mensagem de WhatsApp atualizada em Compartilhar.', { undo: () => S.set(K('wa', id), antes ?? waDef(ev)) }); }
    else if (u.k === 'gate') { const antes = getGate(id); S.set(K('gate', id), { modo: 'apos', momento: u.momento }); A.toast(`Interação social abre depois de “${u.momento}”.`, { undo: () => S.set(K('gate', id), antes) }); }
    void link;
  };
  A.route('/h/e/:id/inspiracao', (ctx) => {
    const id = ctx.params.id; S.set('hc:last', id); const f = insFiltro(); const n = insSalvas().length;
    const flt = ['Tudo', ...TEMAS, 'Salvas'].map((t) => `<button type="button" data-act="hc-ins-f" data-v="${t}" aria-pressed="${t === f}" data-k="if-${t}">${t}${t === 'Salvas' ? ` (${n})` : ''}</button>`).join('');
    const ok = () => `<div class="hc-seg hc-fil" role="group" aria-label="Filtrar por tema">${flt}</div>${insList(id)}<p class="hc-note hc-gap-6">Ideias de exemplo escritas para o protótipo. “Usar” aplica na hora e dá para desfazer.</p>`;
    return { title: 'Inspiração', html: A.hostShell(ctx, { section: 'inspiracao' }, pageHd('Inspiração', 'Ideias para a sua festa. Salve as que gostar e aplique com um toque.') + A.stateful({ ok, empty: A.emptyState({ icon: 'sparkle', title: 'Ainda não há ideias por aqui', body: 'Quando houver, elas aparecem neste lugar, por tema.' }), loading: A.skel(5, 88), error: A.errorState({ title: 'Não deu para carregar as ideias', body: 'Confira a conexão e tente de novo. Suas ideias salvas continuam aqui.' }) })) };
  });

  /* =====================================================================
     AJUDA  /h/ajuda
     ===================================================================== */
  const GLOSS = [['Missões', 'Desafios curtos de foto (“o abraço mais apertado”) que dão assunto para os convidados. Você liga, cria e ordena.'], ['Telão', 'A tela do salão que mostra as fotos na hora. Foto vertical aparece inteira, nunca cortada.'], ['Pareamento', 'Ligar a TV ao seu evento, digitando um código ou abrindo um link.'], ['Link de uso único', 'Endereço que liga o telão uma vez só e vale 20 minutos. Gerar outro cancela o anterior.'], ['Moderação', 'Revisar fotos antes (ou depois) de irem para o telão e o álbum. Você aprova, oculta ou remove.'], ['Consentimento', 'O aceite que o convidado dá antes da primeira foto, com texto versionado e data. Mostramos só totais.'], ['Interação social', 'Feed, reações e comentários entre convidados. Abre no momento que você escolher.'], ['Livro de recados', 'A mensagem sua, em texto ou áudio, que o convidado lê ao entrar.'], ['Controle de menores', 'Proteções extras quando há menores de 18 anos: fotos denunciadas ficam retidas e não compartilham fora.'], ['Retenção', 'Por quanto tempo guardamos: exportamos no dia 330 e apagamos de verdade no dia 365.'], ['Estilo', 'Fonte, cantos e cores do seu evento. Vale para o convidado, o telão e o álbum.'], ['Cerimonialista', 'Papel de equipe que modera e acompanha a festa, sem mexer em estilo, equipe nem apagar nada.']];
  const FAQ = [['O convidado precisa criar conta?', 'Não. Ele abre o link ou lê o QR, informa o primeiro nome e aceita o consentimento. Não existe senha, e-mail nem SMS.'], ['Dá para ligar o telão sem a TV ter internet boa?', 'A TV precisa de internet. Teste com antecedência: gere um link novo em Compartilhar e abra na TV do salão.'], ['O que acontece se o sinal cair na festa?', 'As fotos ficam na fila do celular do convidado e sobem quando o sinal volta.'], ['As fotos ficam com a localização?', 'Não. Removemos a localização (GPS) da foto antes de ela sair do celular.'], ['Posso usar o Albora sem pagar?', 'Sim, no plano Grátis, com telão básico. O plano Completo libera fotos ilimitadas, quatro modelos de telão e o livro em PDF.'], ['Quem vê as conversas da Comunidade?', 'Só outros anfitriões. Convidados nunca veem.'], ['Como apago o evento?', 'Em Ajustes > Exportar e apagar. Só o dono apaga, e é preciso digitar a palavra de confirmação.']];
  const TOUR = [{ r: 'hoje', t: 'Hoje', b: 'Aqui começa o dia: o próximo passo e o que está acontecendo na festa.' }, { r: 'fotos', t: 'Fotos', b: 'Revise, aprove e escolha o que vai para o telão.' }, { r: 'convidados', t: 'Convidados', b: 'Veja quem entrou, quem fotografou e quem ainda não aceitou.' }, { r: 'estilo', t: 'Estilo', b: 'Cores, missões, recado e telão num lugar só, com a prévia ao lado.' }, { r: 'compartilhar', t: 'Compartilhar', b: 'Link, QR, peças para imprimir e a conexão do telão.' }, { sel: '[data-act=invite]', t: 'Convidar', b: 'O botão Convidar fica sempre no alto: link, QR e WhatsApp em um toque.' }, { sel: '[data-act=account-menu]', t: 'Conta e ajustes', b: 'Dados do evento, equipe, privacidade, exportar e plano ficam aqui.' }];
  const tickets = () => S.get('hc:tickets', []);
  let glQ = '';
  const glList = () => { const q = glQ.toLowerCase().trim(); const l = GLOSS.filter(([t, d]) => !q || (t + d).toLowerCase().includes(q)); return l.length ? `<dl class="hc-gl">${l.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>` : A.emptyState({ icon: 'search', title: 'Nenhum termo encontrado', body: 'Tente outra palavra ou fale com o suporte.' }); };
  A.inputs['hc-gl-q'] = (el) => { glQ = el.value; const l = $('#hc-gl'); l && (l.innerHTML = glList()); };
  A.acts['hc-ticket'] = (f) => {
    const v = A.validate(f, { mensagem: A.rules.min(10, 'Conte o que aconteceu com pelo menos 10 letras.') }); if (!v) return; const btn = $('button[type=submit]', f);
    A.busy(btn, 900, () => { const l = tickets(); const n = 1040 + l.length + 1; S.set('hc:tickets', [{ n, assunto: v.assunto, urg: v.urg, msg: v.mensagem, em: Date.now() }, ...l]); A.toast(`Pedido HC-${n} enviado. A resposta chega no e-mail da conta (simulado).`); rerender(); });
  };
  const ajudaBody = () => {
    const l = tickets(); const done = S.get('hc:tour-done', false);
    const toc = [['hc-a-gl', 'Glossário'], ['hc-a-faq', 'Perguntas frequentes'], ['hc-a-sup', 'Falar com o suporte'], ['hc-a-tour', 'Tour do painel']].map(([t, n]) => `<button class="hc-tl" type="button" data-act="hc-goto" data-t="${t}">${n}</button>`).join('');
    return `<div class="hc-help"><nav class="hc-toc" aria-label="Seções da ajuda">${toc}</nav>
${sec('hc-a-gl', 'Glossário', 'Os termos que aparecem no painel, em linguagem de festa.', `<div class="search hc-gl-s">${A.icon('search', 18)}<input type="search" aria-label="Buscar termo" placeholder="Buscar termo" data-input="hc-gl-q" value="${esc(glQ)}"></div><div id="hc-gl">${glList()}</div>`)}
${sec('hc-a-faq', 'Perguntas frequentes', '', `<div class="hc-faq">${FAQ.map(([q, a]) => `<details class="hc-d ds-fold b-baixo"><summary>${esc(q)}</summary><div class="body ds-fold-b">${esc(a)}</div></details>`).join('')}</div>`)}
${sec('hc-a-sup', 'Falar com o suporte', 'Conte o que aconteceu. A resposta chega no e-mail da conta.', `<form data-submit="hc-ticket" novalidate class="hc-doc hc-form">${A.field({ name: 'assunto', label: 'Assunto', options: ['Telão não conecta', 'Fotos não aparecem', 'QR ou link', 'Plano e cobrança', 'Outro'], required: true })}${A.field({ name: 'urg', label: 'Urgência', options: [['p0', 'Minha festa está acontecendo agora'], ['p1', 'É para esta semana'], ['p2', 'Quando der']], value: 'p2', required: true })}${A.field({ name: 'mensagem', label: 'O que aconteceu', rows: 4, required: true, hint: 'Conte o que você fez e o que apareceu na tela.' })}<div class="hc-doc-act"><button class="btn btn-primary" type="submit">Enviar pedido</button></div><p class="hc-note hc-gap-3">Simulado: o pedido fica só neste navegador.</p></form>
<h3 class="hc-h3 hc-sub">Seus pedidos</h3>${A.stateful({ ok: () => `<ul class="hc-hist">${l.map((t) => `<li><time>HC-${t.n}</time><span><b>${esc(t.assunto)}</b> · ${({ p0: 'Festa acontecendo', p1: 'Esta semana', p2: 'Quando der' })[t.urg]} · <span class="badge info">Recebido</span><br><span class="hc-note">${fmtDT(t.em)} — ${esc(t.msg)}</span></span></li>`).join('')}</ul>`, empty: A.emptyState({ icon: 'inbox', title: 'Nenhum pedido ainda', body: 'Quando você enviar, o pedido aparece aqui com o número.' }), isEmpty: () => !l.length })}`)}
${sec('hc-a-tour', 'Tour do painel', `Um passeio de ${TOUR.length} passos pelas telas do painel. Dá para sair quando quiser.`, `<ol class="hc-tour-l">${TOUR.map((s) => `<li>${esc(s.t)}</li>`).join('')}</ol><div class="flex flex-wrap"><button class="btn btn-line" type="button" data-act="hc-tour-start">${done ? 'Refazer o tour' : 'Começar o tour'}</button>${done ? '<span class="badge ok">Você já fez o tour</span>' : ''}</div>`)}</div>`;
  };
  A.route('/h/ajuda', (ctx) => {
    const id = S.get('hc:last', 'e1'); const c2 = Object.assign({}, ctx, { params: Object.assign({}, ctx.params, { id }) });
    return { title: 'Ajuda', html: A.hostShell(c2, { section: 'ajuda' }, `<header class="hc-head hc-help-h">${A.mascot(128, 'mascote', '')}<div class="stack stack-2"><h1 class="hc-h1">Ajuda</h1><p class="hc-lead">Glossário, perguntas frequentes, suporte e um tour do painel. Se não achar aqui, fale com a gente.</p></div></header>` + A.stateful({ ok: ajudaBody, empty: ajudaBody(), loading: A.skel(5, 60) })) };
  });

  /* ---- tour guiado (cartão não modal; persiste ao navegar) ---- */
  let tourI = -1;
  const visible = (el) => el && el.offsetParent !== null;
  const spot = () => {
    $$('.hc-spot').forEach((x) => x.classList.remove('hc-spot')); if (tourI < 0) return; const s = TOUR[tourI]; if (!s) return;
    const cand = s.sel ? $$(s.sel) : $$(`.rail a[href$="/${s.r}"], .tabbar a[href$="/${s.r}"]`); const el = cand.find(visible); el && el.classList.add('hc-spot');
  };
  const tourCard = () => {
    let c = $('.hc-tour'); if (tourI < 0) { c && c.remove(); $$('.hc-spot').forEach((x) => x.classList.remove('hc-spot')); return; }
    if (!c) { c = document.createElement('div'); c.className = 'hc-tour'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Tour do painel'); document.body.append(c); }
    const s = TOUR[tourI], last = tourI === TOUR.length - 1;
    c.innerHTML = `<span class="t-label">Passo ${tourI + 1} de ${TOUR.length}</span><b class="t-title">${esc(s.t)}</b><p aria-live="polite">${esc(s.b)}</p><div class="flex between"><button class="btn btn-quiet btn-sm" data-act="hc-tour-skip">Sair do tour</button><div class="flex">${tourI > 0 ? '<button class="btn btn-line btn-sm" data-act="hc-tour-prev">Voltar</button>' : ''}<button class="btn btn-light btn-sm" data-act="hc-tour-next">${last ? 'Concluir' : 'Próximo'}</button></div></div>`;
    $('[data-act=hc-tour-next]', c).focus();
  };
  const goStep = (i) => { tourI = i; const s = TOUR[i]; const id = curId(); if (s && s.r) { const h = `${baseOf(id)}/${s.r}`; if (location.hash !== h) location.hash = h; } tourCard(); setTimeout(spot, 80); };
  A.acts['hc-tour-start'] = () => goStep(0);
  A.acts['hc-tour-next'] = () => { if (tourI >= TOUR.length - 1) { tourI = -1; S.set('hc:tour-done', true); tourCard(); A.toast('Tour concluído. Ele fica em Ajuda caso queira rever.'); return; } goStep(tourI + 1); };
  A.acts['hc-tour-prev'] = () => goStep(Math.max(0, tourI - 1));
  A.acts['hc-tour-skip'] = () => { tourI = -1; tourCard(); A.toast('Tour encerrado.'); };
  window.addEventListener('hashchange', () => setTimeout(spot, 60));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tourI >= 0 && !$('.modal,.menu,.palette')) { tourI = -1; tourCard(); } });

  /* ---------- mapa e paleta ---------- */
  const G = 'Anfitrião · configuração';
  [['Estilo', '/estilo', 'Identidade, missões, recado, telão, interação, menores'], ['Compartilhar', '/compartilhar', 'Convite, QR, peças impressas e telão'], ['Ajustes · Evento', '/ajustes/evento', 'Nome, data, hora, local'], ['Ajustes · Privacidade', '/ajustes/privacidade', 'Consentimento versionado e retenção'], ['Ajustes · Equipe', '/ajustes/equipe', 'Convidar, papel, remover'], ['Ajustes · Exportar e apagar', '/ajustes/exportar', 'Arquivo, Drive, livro, apagar'], ['Ajustes · Plano', '/ajustes/plano', 'Resumo do plano'], ['Comunidade', '/comunidade', 'Troca entre anfitriões'], ['Inspiração', '/inspiracao', 'Ideias por tema']].forEach(([l, p, n]) => A.map(G, l, `#/h/e/e1${p}`, n));
  A.map(G, 'Ajuda', '#/h/ajuda', 'Glossário, perguntas, suporte e tour');
  A.palette.add(() => [{ group: 'Ações', label: 'Gerar link do telão', icon: 'link', run: () => { location.hash = `${baseOf(curId())}/compartilhar`; } }, { group: 'Ações', label: 'Fazer o tour do painel', icon: 'help', run: () => A.acts['hc-tour-start']() }]);
})();
