/* Albora protótipo — TELÃO (prefixo #/t): parear, link de uso único e exibição em tela cheia.
   Contrato com o painel (outros módulos), tudo em A.store:
     hc:modelos:<evento>  array de ids — o que o anfitrião liga em Estilo (fonte de verdade; sem isso: polaroide + mural, e só polaroide no plano grátis)
     telaoModelo      'polaroide'|'mural'|'colagem'|'dump'|'rodizio' (ou array de ids) — sobrescreve o anterior, uso em teste
     telaoPausado     bool  — pausa pedida pelo anfitrião ou pela TV (tela neutra "em pausa")
     panico           bool  — tela neutra "Já voltamos", só o painel liga/desliga
     telaoFotosNovas  [{id, seed, ratio?, autor?, min?}] — fotos que chegam depois do carregamento
   Funções para o painel (host-config usa todas; não existe segundo estado do telão):
   A.wall.pareado(), A.wall.desligar(), A.wall.gerarLink(evento), A.wall.statusLink(token) -> ok|usado|expirou|substituido,
   A.wall.usarLink(token) (o que a TV faz ao abrir), A.wall.avancarLink(min), A.wall.codigoPainel(evento, renovar),
   A.wall.codigoNaTv(codigo) (a TV digita o código do painel), A.wall.codigoTv() (código que a TV mostra),
   A.wall.autorizar(codigo, evento) (o painel digita o código da TV), A.wall.erroCodigo(id). */
(function () {
  const A = window.A; const W = (A.wall = {});
  const $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon;
  const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const VAL_COD = 10 * 60000, VAL_LINK = 20 * 60000, ROTACAO = 8000;
  const RE_COD = /^[A-HJ-NP-Z2-9]{6}$/;
  const COD_DEMO = { FESTA2: 'e1', FESTA3: 'e3' }; // protótipo: códigos que o "painel" poderia mostrar
  const now = () => Date.now();
  const hm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const evOf = (id) => A.data.events.find((e) => e.id === id) || A.data.events[0];
  const novoCodigo = () => Array.from({ length: 6 }, () => ALFA[Math.floor(Math.random() * ALFA.length)]).join('');

  /* ---------- estado compartilhado ---------- */
  W.pareado = () => A.store.get('telaoPareado', null);
  W.parear = (evento, via) => A.store.set('telaoPareado', { evento, via, quando: now() });
  W.desligar = () => { A.store.set('telaoPareado', null); };
  W.codigoTv = (renovar) => {
    let p = A.store.get('telaoPareamento', null);
    if (!p || p.exp < now() || renovar) { p = { codigo: novoCodigo(), exp: now() + VAL_COD }; A.store.set('telaoPareamento', p); }
    return p;
  };
  W.autorizar = (codigo, evento = 'e1') => {
    const c = String(codigo || '').trim().toUpperCase();
    if (!RE_COD.test(c)) return { ok: false, erro: 'formato' };
    const p = A.store.get('telaoPareamento', null);
    if (p && p.codigo === c && p.exp > now()) { if (evOf(evento).plano === 'gratis') return { ok: false, erro: 'plano' }; W.parear(evento, 'codigo'); return { ok: true }; }
    return { ok: false, erro: 'invalido' };
  };
  W.codigoPainel = (evento = 'e1', renovar = false) => {
    let p = A.store.get('telaoCodigoPainel', null);
    if (!p || p.exp < now() || p.evento !== evento || renovar) { p = { codigo: novoCodigo(), evento, exp: now() + VAL_COD }; A.store.set('telaoCodigoPainel', p); }
    return p;
  };
  W.gerarLink = (evento = 'e1') => {
    const token = A.uid() + A.uid(); const l = { token, exp: now() + VAL_LINK, usado: false, evento };
    A.store.set('telaoLinks', { atual: l }); // gerar um novo invalida o anterior, sem depender de relógio
    return { token, exp: l.exp, url: 'albora.app/t/link/' + token, hash: '#/t/link/' + token };
  };
  const statusLink = (token) => {
    if (token === 'amostra') return 'ok';
    if (token === 'expirado') return 'expirou';
    if (token === 'usado') return 'usado';
    const at = (A.store.get('telaoLinks', {}) || {}).atual;
    if (!at || at.token !== token) return 'substituido';
    if (at.usado) return 'usado';
    return at.exp < now() ? 'expirou' : 'ok';
  };
  W.statusLink = (token) => statusLink(token);
  const consumirLink = (token) => {
    if (token === 'amostra') return;
    A.store.update('telaoLinks', (o) => { if (o && o.atual && o.atual.token === token) o.atual.usado = true; return o; }, {});
  };

  W.usarLink = (token) => {
    const sl = statusLink(token); if (sl !== 'ok') return { ok: false, motivo: sl };
    const at = (A.store.get('telaoLinks', {}) || {}).atual; const evento = token === 'amostra' ? 'e1' : (at && at.evento) || 'e1';
    W.parear(evento, 'link'); consumirLink(token); return { ok: true, evento };
  };
  W.avancarLink = (min = 21) => A.store.update('telaoLinks', (o) => { if (o && o.atual) o.atual.exp -= min * 60000; return o; }, {});
  W.codigoNaTv = (codigo) => {
    const c = String(codigo || '').trim().toUpperCase(); if (!RE_COD.test(c)) return { ok: false, erro: 'formato' };
    let ev = COD_DEMO[c]; const pc = A.store.get('telaoCodigoPainel', null); if (pc && pc.codigo === c && pc.exp > now()) ev = pc.evento;
    if (!ev) return { ok: false, erro: 'invalido' }; if (evOf(ev).plano === 'gratis') return { ok: false, erro: 'plano' };
    W.parear(ev, 'codigo-painel'); return { ok: true, evento: ev };
  };
  W.modelosDe = (evento) => A.store.get('telaoModelo', null) || A.store.get('hc:modelos:' + evento, null) || (evento === 'e3' ? ['polaroide'] : ['polaroide', 'mural']);

  /* ---------- estilo (prefixo wl-) ---------- */
  const st = document.createElement('style'); st.id = 'wl-style';
  st.textContent = `
/* Telão: tipografia e espaço fluem com a MENOR dimensão da tela (vmin), então 1280x720, 1920x1080 e ultrawide mantêm a mesma proporção; só a escala muda. Durações lentas = múltiplos das 3 bases (documentados em --wl-*). */
.wl-screen,.wl-wall{--wl-in:calc(var(--dur-3)*3);--wl-out:calc(var(--dur-3)*2);--wl-sway:calc(var(--dur-3)*25);--wl-breathe:calc(var(--dur-3)*16);--wl-pad:clamp(var(--space-4),4vmin,var(--space-16));--wl-gap:clamp(var(--space-3),2vmin,var(--space-6));--wl-gap-l:clamp(var(--space-5),4vmin,var(--space-12));--wl-hud-x:clamp(var(--space-4),3vmin,var(--space-10));--wl-hud-y:clamp(var(--space-2),2vmin,var(--space-6));--wl-hud-fs:clamp(var(--fs-sm),1.9vmin,var(--fs-lg));--wl-band:calc(var(--wl-hud-y) + var(--wl-hud-fs) * 1.5 + var(--space-2) + var(--space-2));background:radial-gradient(120% 46% at 50% -14%,color-mix(in srgb,var(--ac) 9%,transparent),transparent 62%),var(--bg)}
.wl-screen :is([tabindex="-1"],.wl-h1):focus-visible,.wl-wall:focus-visible{outline:0}
.wl-screen{display:grid;place-items:center;padding:var(--wl-pad);overflow:auto}
.wl-main{width:min(var(--w-page),100%);display:flex;flex-direction:column;gap:var(--wl-gap-l);align-items:center;text-align:center;outline:0}
.wl-open{display:block;height:auto;width:clamp(120px,19vmin,240px)}
.wl-h1{font:350 clamp(var(--fs-xl),6vmin,calc(var(--fs-display)*1.6))/1.08 var(--font-display);letter-spacing:-.015em;text-wrap:balance}
.wl-h1.sm{font-size:clamp(var(--fs-lg),3.2vmin,calc(var(--fs-display)*.9));color:var(--fg-2)}
.wl-pair{display:flex;flex-direction:column;align-items:center;gap:var(--wl-gap)}
.wl-lead{font-size:clamp(var(--fs-md),2.3vmin,calc(var(--fs-xl)*1.1));color:var(--fg-2);max-width:46ch;text-wrap:pretty}
.wl-plate{width:min(100%,56rem);display:flex;flex-direction:column;align-items:center;gap:var(--wl-gap);padding:clamp(var(--space-5),4vmin,var(--space-12)) clamp(var(--space-4),5vmin,var(--space-16));background:var(--elev-2);border:1px solid var(--line-2);border-radius:var(--r-3)}
.wl-code{font:400 clamp(3.25rem,15vmin,10.5rem)/1 var(--font-display);letter-spacing:.14em;padding-left:.14em;font-variant-numeric:tabular-nums;max-width:100%;overflow-wrap:anywhere}
.wl-meta{font-size:clamp(var(--fs-sm),1.9vmin,var(--fs-lg));color:var(--fg-2)}
.wl-way{font-size:clamp(var(--fs-md),2.3vmin,calc(var(--fs-xl)*1.1));color:var(--fg-2);max-width:40ch} .wl-way b{color:var(--fg);font-weight:600}
.wl-more{width:min(36rem,100%);text-align:left}
.wl-more .stack{padding-top:var(--space-2)}
.wl-actions{display:flex;gap:var(--space-3);flex-wrap:wrap;justify-content:center}
.wl-proto{font-size:var(--fs-xs);color:var(--fg-2);display:flex;gap:0 var(--space-3);align-items:center;flex-wrap:wrap;justify-content:center;max-width:60ch}
.wl-msg{display:flex;flex-direction:column;align-items:center;gap:var(--wl-gap);text-align:center;max-width:100%} .wl-msg>svg{width:clamp(36px,6vmin,64px);height:clamp(36px,6vmin,64px);color:var(--fg-2)}
.wl-star{display:block} .wl-spin{width:44px;height:44px} .wl-gap{margin-top:var(--space-4)}
.wl-skel{width:min(40rem,90vw)}

.wl-wall{outline:0}
.wl-stage{position:absolute;inset:0;overflow:hidden}
.wl-layer{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);padding:var(--wl-band) var(--wl-pad);container-type:size} .wl-pol{place-self:center}
.wl-in{animation:wl-in var(--wl-in) var(--ease) both} .wl-out{animation:wl-out var(--wl-out) var(--ease) both;pointer-events:none}
@keyframes wl-in{from{opacity:0;transform:scale(1.02)}} @keyframes wl-out{to{opacity:0}}
@keyframes wl-pop{from{opacity:0;transform:scale(.94)}} @keyframes wl-sway{from{transform:rotate(calc(var(--rot,0deg) - .8deg))}to{transform:rotate(calc(var(--rot,0deg) + .8deg))}}
.wl-pol{--fg:var(--tinta);--fg-2:color-mix(in srgb,var(--tinta) 76%,var(--papel));--fg-3:color-mix(in srgb,var(--tinta) 66%,var(--papel));background:var(--papel);color:var(--tinta);padding:clamp(var(--space-2),1.8vmin,var(--space-5)) clamp(var(--space-2),1.8vmin,var(--space-5)) 0;border-radius:var(--r-1);box-shadow:0 2vmin 6vmin -1vmin var(--noite);transform:rotate(var(--rot,0deg));animation:wl-sway var(--wl-sway) ease-in-out infinite alternate}
.wl-ph{aspect-ratio:var(--ar);height:min(62cqh,calc(72cqw / var(--ar)));background:var(--surface-2)}
.wl-ph img{width:100%;height:100%;object-fit:contain}
.wl-cap{display:flex;justify-content:space-between;gap:var(--space-4);align-items:baseline;padding:clamp(var(--space-3),2vmin,var(--space-5)) var(--space-1);font:400 clamp(var(--fs-md),2.6vmin,var(--fs-xl)) var(--font-display)}
.wl-cap span{font:500 clamp(var(--fs-xs),1.8vmin,var(--fs-md)) var(--font-body);color:var(--fg-2)}
.wl-grid{width:100%;height:100%;display:grid;gap:var(--wl-gap);grid-template-columns:repeat(var(--cols),minmax(0,1fr));grid-template-rows:repeat(var(--rows),minmax(0,1fr))}
.wl-cell{position:relative;overflow:hidden;border-radius:var(--r-1);background:var(--surface);margin:0;animation:wl-pop var(--dur-3) var(--ease) both;animation-delay:calc(var(--i) * var(--gap,var(--dur-1)))}
.wl-cell .wl-bd{position:absolute;left:-10%;top:-10%;width:120%;height:120%;object-fit:cover;filter:blur(26px) saturate(1.1);opacity:.45}
.wl-cell .wl-fg{position:relative;width:100%;height:100%;object-fit:contain}
.wl-new{position:absolute;left:var(--space-2);top:var(--space-2);font:600 clamp(var(--fs-sm),1.6vmin,var(--fs-md)) var(--font-body);background:var(--ac);color:var(--on-ac);border-radius:var(--r-pill);padding:var(--space-1) var(--space-3)}
.wl-leg{--veu-c:color-mix(in srgb,var(--noite) calc(var(--veu-a,.78) * 100%),transparent);position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-2);padding:var(--space-8) var(--space-3) var(--space-2);background:linear-gradient(to top,var(--veu-c) 0,var(--veu-c) 60%,transparent);color:var(--papel);font:600 var(--wl-hud-fs)/1.3 var(--font-body)}
.wl-leg b{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .wl-leg span{font-weight:500;flex:none} .wl-dump .wl-leg span{display:none}
.wl-col{position:relative;margin:auto;width:min(100cqw,177.78cqh);height:min(100cqh,56.25cqw);container-type:size}
.wl-col .wl-item{position:absolute;left:var(--x);top:var(--y);height:calc(var(--h) * 1cqh);aspect-ratio:var(--ar);max-width:62cqw;transform:translate(-50%,-50%) rotate(var(--rot));background:var(--papel);padding:clamp(var(--space-1),.9vmin,var(--space-3));box-shadow:0 1.6vmin 4vmin -1vmin var(--noite);animation:wl-pop var(--dur-3) var(--ease) both;animation-delay:calc(var(--i) * var(--dur-2))}
.wl-col .wl-item img{width:100%;height:100%;object-fit:contain;display:block}
.wl-state{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--wl-gap);text-align:center;padding:var(--wl-pad)}
.wl-state .arc{width:clamp(200px,34vmin,420px)!important;margin-bottom:var(--space-2)} .wl-state .arc svg{width:100%;height:auto} .wl-state .arc .trk{stroke:var(--line);stroke-width:1.4} .wl-state .arc .sun{animation:wl-breathe var(--wl-breathe) ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes wl-breathe{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.18)}}
.wl-state .wl-qr svg{color:var(--tinta)!important}
.wl-state .wl-qr{background:var(--papel);color:var(--tinta);padding:clamp(var(--space-2),1.4vmin,var(--space-4));border-radius:var(--r-2);--qr-bg:var(--papel)}
/* HUD fora das fotos: as faixas de cima e de baixo são reservadas (--wl-band); texto nunca fica sobre fotografia, a não ser a legenda com véu medido. Chips sólidos = elevação 2. */
.wl-top,.wl-bottom{position:absolute;z-index:3;left:var(--wl-hud-x);right:var(--wl-hud-x);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);pointer-events:none}
.wl-top{top:var(--wl-hud-y)} .wl-bottom{bottom:var(--wl-hud-y)}
.wl-hud,.wl-chip,.wl-hint{background:var(--elev-2);border:1px solid var(--line-2);border-radius:var(--r-pill);padding:0 var(--space-3);font:500 var(--wl-hud-fs)/calc(1.5em + var(--space-2)) var(--font-body);color:var(--fg-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.wl-hud:empty{display:none} .wl-bottom .wl-hud+.wl-hud{margin-left:auto}
.wl-hint{margin-inline:auto;white-space:normal;text-align:center;line-height:1.5;padding:var(--space-1) var(--space-4);transition:opacity var(--dur-3) var(--ease);text-wrap:balance}
.wl-hint.off{opacity:0;visibility:hidden} .wl-h-s{display:none} @media(max-width:640px){.wl-h-l{display:none}.wl-h-s{display:inline;white-space:nowrap}} .wl-top:has(.wl-hint:not(.off)) #wl-count{display:none}
.wl-bar{position:absolute;z-index:5;left:50%;bottom:var(--wl-hud-y);transform:translateX(-50%);display:flex;gap:var(--space-2);flex-wrap:wrap;justify-content:center;max-width:calc(100% - var(--space-6));background:var(--elev-2);border:1px solid var(--line);border-radius:var(--r-3);padding:var(--space-2);opacity:0;visibility:hidden;transition:opacity var(--dur-2) var(--ease),visibility var(--dur-2)}
.wl-bar.show,.wl-bar:focus-within{opacity:1;visibility:visible}
.wl-bar .btn:not(.btn-danger){background:var(--elev-3)} .wl-bar .btn:not(.btn-danger):hover{background:color-mix(in srgb,var(--papel) 20%,var(--noite))}
body.wall-mode .modal[data-theme="noite"]{background:var(--elev-3);border:1px solid var(--line)}
.wl-keys{display:grid;grid-template-columns:auto 1fr;gap:var(--space-3) var(--space-5);margin:0;align-items:center} .wl-keys dd{margin:0;color:var(--fg-2)}
body.wall-mode .proto-bar{opacity:0;transition:opacity var(--dur-2)} body.wall-mode .proto-bar:hover,body.wall-mode .proto-bar:focus-within{opacity:1}
@media(max-width:479px){.wl-code{letter-spacing:.08em;padding-left:.08em}}
@media(max-height:499px){.wl-screen{place-items:start center}.wl-open{width:clamp(72px,14vmin,120px)}}
.wl-state .wl-meta{margin-top:calc(var(--space-2) * -1)}
@media(prefers-reduced-motion:reduce){.wl-pol,.wl-cell,.wl-col .wl-item,.wl-in,.wl-state .arc .sun{animation:none!important}}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){
.wl-bar .btn:not(.btn-danger):hover{background:var(--elev-3)}
}
`;
  document.head.appendChild(st);

  const wallShell = (inner) => `<div class="wall wl-screen" data-theme="noite"><main id="main" tabindex="-1" class="wl-main">${inner}</main></div>`;
  const brand = `<img class="wl-open" src="assets/splash-animado.svg" width="220" height="160" alt="Albora">`;
  const msg = ({ h = 1, art = '', icon = '', title, body = '', extra = '', role = 'status', focus = false }) => `<div class="wl-msg" role="${role}">${art || (icon ? ic(icon, 64) : '')}<h${h} class="wl-h1"${focus ? ' tabindex="-1"' : ''}>${title}</h${h}>${body ? `<p class="wl-lead">${body}</p>` : ''}${extra}</div>`;
  const msgErro = ({ h = 1, title, body }) => msg({ h, icon: 'wifioff', title, body, role: 'alert', extra: `<button class="btn btn-accent btn-lg" data-act="retry">${ic('refresh', 18)} Tentar de novo</button>` });
  const msgCarregando = ({ h = 1, title, body, art = '' }) => msg({ h, art, title, body, extra: `<div class="wl-skel">${A.skel(1, 96)}</div>` });
  const noiteObs = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.matches('.modal,.toasts,.menu')) n.setAttribute('data-theme', 'noite'); })));
  const wallAfter = () => { document.body.classList.add('wall-mode'); noiteObs.observe(document.body, { childList: true }); A.$$('.toasts').forEach((n) => n.setAttribute('data-theme', 'noite')); };
  let ENG = null;
  const stopEng = () => { if (ENG) { ENG.stop(); ENG = null; } };
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/t/display')) stopEng(); if (!location.hash.startsWith('#/t')) { document.body.classList.remove('wall-mode'); noiteObs.disconnect(); A.$$('.toasts').forEach((n) => n.removeAttribute('data-theme')); } });

  /* ---------- /t/parear ---------- */
  let parearIni = null; // estava ligado quando a tela abriu?
  const tvErr = (id) => ({ formato: 'O código tem 6 letras e números. Não usamos 0, 1, I nem O.', invalido: 'Esse código não confere ou já expirou. Veja o código atual no painel, em Compartilhar › Telão, e digite de novo.', plano: 'O telão entra no plano Completo. Peça a quem organiza a festa para ativar o plano e tente de novo.' }[id]);
  W.erroCodigo = tvErr;
  A.route('/t', () => { A.later(0, () => A.go('#/t/parear')); return ''; });
  A.route('/t/parear', () => {
    stopEng(); const sim = A.sim().state; const par = W.pareado();
    if (parearIni === null) parearIni = !!par;
    let body;
    if (sim === 'loading') {
      body = msgCarregando({ art: brand, title: 'Gerando o código…', body: 'Conectando ao Albora.' });
    } else if (sim === 'error') {
      body = msgErro({ title: 'Não deu para gerar o código', body: 'Verifique a internet desta tela. Nada foi perdido; o código aparece assim que a conexão voltar.' });
    } else if (par && parearIni) {
      const e = evOf(par.evento);
      body = `<div class="wl-pair">${brand}</div><h1 class="wl-h1">Este telão já está ligado</h1><p class="wl-lead">Ele mostra as fotos de <b>${esc(e.nome)}</b>. Para ligar a outro evento, desligue este telão primeiro.</p><div class="wl-actions"><a class="btn btn-accent btn-lg" href="#/t/display">${ic('tv', 18)} Abrir o telão</a><button class="btn btn-line btn-lg" data-act="wl-desligar-parear">Desligar e parear de novo</button></div>`;
    } else {
      const p = W.codigoTv(); const c = p.codigo;
      body = `<div class="wl-pair">${brand}<h1 class="wl-h1 sm">Ligue este telão</h1></div>
<div class="wl-plate"><div class="wl-code" role="img" aria-label="Código de pareamento: ${c.split('').join(' ')}">${c}</div><p class="wl-meta" aria-live="off">Vale por <b data-wl-restam>${Math.max(0, Math.ceil((p.exp - now()) / 60000))} min</b> · um código novo aparece sozinho</p></div>
<p class="wl-way">No painel do evento, abra <b>Compartilhar › Telão</b> e digite este código. A tela liga sozinha.</p>
<details class="wl-more ds-fold cartao"><summary>Outras formas de ligar</summary><div class="stack ds-fold-b">
<p class="t-small">Link de uso único: no painel, em Compartilhar › Telão, toque em <b>Gerar link</b>, copie e abra no navegador desta TV. O link vale 20 minutos e serve uma vez.</p>
<form class="stack-3" data-submit="wl-codigo" novalidate>${A.field({ name: 'codigo', label: 'Ou digite aqui um código que o painel mostra', required: true, placeholder: 'A2C4E6', hint: '6 letras e números', extra: 'maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" data-input="wl-upper"' })}<button class="btn btn-line" type="submit">Ligar com este código</button></form></div></details>
<div class="wl-proto"><span>Protótipo (simulado): na versão real quem autoriza é o painel; este código não existe de verdade.</span><button class="btn btn-quiet" data-act="wl-simular-autorizar">Simular: autorizar pelo painel</button></div>`;
    }
    return { title: 'Ligar o telão', html: wallShell(body), after: () => { wallAfter(); tickParear(); } };
  });
  A.inputs['wl-upper'] = (el) => { const pos = el.selectionStart; el.value = el.value.toUpperCase(); try { el.setSelectionRange(pos, pos); } catch { /* sem seleção */ } };
  A.acts['wl-desligar-parear'] = () => { W.desligar(); parearIni = false; A.render(); A.toast('Telão desligado deste evento.'); };
  A.acts['wl-simular-autorizar'] = () => { const r = W.autorizar(W.codigoTv().codigo, 'e1'); if (r.ok) ligado('e1'); };
  A.acts['wl-codigo'] = (form) => {
    const v = A.validate(form, { codigo: (x) => (RE_COD.test(x.toUpperCase()) ? '' : tvErr('formato')) }); if (!v) return;
    const c = v.codigo.toUpperCase(); const btn = form.querySelector('button[type=submit]');
    A.busy(btn, 700, () => {
      const f = form.querySelector('.field'); const set = (m) => { f.classList.toggle('has-error', !!m); f.querySelector('.err').textContent = m || ''; };
      const r = W.codigoNaTv(c); if (!r.ok) return set(tvErr(r.erro));
      ligado(r.evento);
    });
  };
  function ligado(ev) {
    const root = A.$('#root'); parearIni = false;
    root.innerHTML = wallShell(msg({ art: `<div class="wl-star">${A.star(112)}</div>`, title: 'Telão ligado', body: `As fotos de ${esc(evOf(ev).nome)} já aparecem aqui.`, extra: '<a class="btn btn-accent btn-lg" href="#/t/display">Abrir o telão agora</a>', focus: true }));
    A.$('h1', root).focus({ preventScroll: true }); wallAfter(); A.later(1600, () => { if (location.hash.startsWith('#/t/parear')) A.go('#/t/display'); });
  }
  function tickParear() {
    const root = A.$('#root'); const marker = A.$('[data-wl-restam]', root); if (!marker) return;
    const t = setInterval(() => {
      if (!marker.isConnected || !location.hash.startsWith('#/t/parear')) return clearInterval(t);
      const par = W.pareado(); if (par && !parearIni) { clearInterval(t); return ligado(par.evento); }
      const p = A.store.get('telaoPareamento', null); if (!p || p.exp <= now()) { clearInterval(t); W.codigoTv(true); return A.render(); }
      marker.textContent = Math.max(1, Math.ceil((p.exp - now()) / 60000)) + ' min';
    }, 1000);
  }

  /* ---------- /t/link/:token ---------- */
  const linkRes = {};
  const linkMotivo = { usado: 'Cada link só funciona uma vez, e este já foi usado para ligar um telão.', expirou: 'Links valem por 20 minutos, e este passou do prazo.', substituido: 'Quem organiza gerou um link mais novo, e isso desliga os anteriores. Também pode ser um link digitado errado.' };
  A.route('/t/link/:token', (ctx) => {
    stopEng(); const token = ctx.params.token; const sim = A.sim().state; let body, after = wallAfter;
    if (sim === 'error') {
      body = msgErro({ title: 'Sem internet nesta tela', body: 'Não conseguimos conectar agora. O link continua valendo; confira a conexão desta TV e tente de novo.' });
    } else if (!linkRes[token]) {
      body = msgCarregando({ art: brand, title: 'Conectando o telão…', body: 'Isso leva só alguns segundos.' });
      after = () => { wallAfter(); A.later(1300, () => { if (location.hash !== '#/t/link/' + encodeURIComponent(token) && location.hash !== '#/t/link/' + token) return; const r = W.usarLink(token); if (r.ok) { delete linkRes[token]; A.go('#/t/display'); } else { linkRes[token] = r.motivo; A.render(); } }); };
    } else {
      const s = linkRes[token]; delete linkRes[token];
      body = `<h1 class="wl-h1">Este link não vale mais</h1><p class="wl-lead">${esc(linkMotivo[s] || linkMotivo.substituido)}</p>
<p class="wl-way">Para ligar este telão: no painel, <b>Compartilhar › Telão › Gerar link</b>, e abra o link novo aqui em até 20 minutos.</p>
<div class="wl-actions"><a class="btn btn-accent btn-lg" href="#/t/parear">${ic('tv', 18)} Conectar pelo código</a><a class="btn btn-quiet btn-lg" href="${A.hostBase('e1')}/compartilhar">Abrir o painel</a></div>
<div class="wl-proto"><span>Protótipo (simulado):</span><button class="btn btn-quiet" data-act="wl-link-teste">Gerar um link de teste agora</button></div>`;
    }
    return { title: 'Conectar o telão', html: wallShell(body), after };
  });
  A.acts['wl-link-teste'] = () => { const l = W.gerarLink('e1'); A.toast('Link de teste gerado (vale 20 min, uma vez).'); A.go(l.hash); };

  /* ---------- /t/display ---------- */
  const AR = { p: 0.8, l: 1.5, s: 1 };
  const SLOTS = {
    1: [[50, 50, 70, -2]], 2: [[32, 50, 56, -3], [68, 50, 56, 2]], 3: [[24, 46, 50, -4], [50, 56, 54, 2], [76, 42, 48, 4]],
    4: [[26, 34, 42, -3], [72, 32, 44, 3], [32, 72, 44, 2], [70, 70, 42, -2]], 5: [[22, 32, 40, -4], [50, 56, 46, 2], [78, 30, 40, 4], [26, 74, 38, 3], [74, 74, 38, -3]],
  };
  const guestOf = (id) => A.data.guests.find((g) => g.id === id);
  const toItem = (p) => ({ id: p.id, seed: p.id, ratio: p.ratio || 'p', autor: (guestOf(p.autor) || {}).primeiro || 'Convidado', min: p.min == null ? 5 : p.min, nova: false });
  const MODELS = () => A.data.telaoModelos.map((m) => m[0]);

  A.route('/t/display', () => {
    const par = W.pareado(); const e = evOf((par && par.evento) || 'e1'); A.applyEvent(e);
    const html = `<div class="wall wl-wall" id="wl-wall" data-theme="noite" tabindex="-1">
<h1 class="sr-only" id="wl-h1" tabindex="-1">Telão: ${esc(e.nome)}</h1>
<main id="main" class="wl-stage" aria-label="Fotos da festa"><div id="wl-scene"></div></main>
<div class="wl-top"><div class="wl-hud" id="wl-count" role="status" aria-live="polite"></div><div class="wl-hint" id="wl-hint"><span class="wl-h-l">Clique para ver os controles · Esc sai da tela cheia</span><span class="wl-h-s">Toque para ver os controles</span></div></div>
<div class="wl-bottom"><div class="wl-hud"><time id="wl-clock"></time></div><div id="wl-chips"></div></div>
<div class="wl-bar" id="wl-bar" role="toolbar" aria-label="Controles do telão">
<button class="btn" data-act="wl-pausar" id="wl-pausar" aria-pressed="false"></button>
<button class="btn" data-act="wl-proxima">${ic('arrow', 16)} Próxima foto</button>
<button class="btn" data-act="wl-tela" id="wl-tela">${ic('grid', 16)} <span>Tela cheia</span></button>
<button class="btn" data-act="wl-ajuda">${ic('help', 16)} Atalhos</button>
<a class="btn" href="${A.hostBase(e.id)}/compartilhar">${ic('back', 16)} Voltar ao painel</a>
<button class="btn btn-danger" data-act="wl-desligar">Desligar este telão</button></div></div>`;
    return { title: 'Telão · ' + e.nome, html, after: startDisplay };
  });

  function startDisplay(root) {
    stopEng(); wallAfter();
    const wall = $('#wl-wall', root); if (!wall) return;
    const par = W.pareado(); const ev = evOf((par && par.evento) || 'e1');
    const S = { kind: '', model: '', mi: 0, shown: {}, sim: [], tmr: [], off: [], fs: false };
    ENG = S; const scene = $('#wl-scene', root);
    const on = (t, ev2, fn, o) => { t.addEventListener(ev2, fn, o); S.off.push(() => t.removeEventListener(ev2, fn, o)); };
    S.stop = () => { S.tmr.forEach((x) => { clearInterval(x); clearTimeout(x); }); S.off.forEach((f) => f()); };
    const live = () => wall.isConnected || (stopEng(), false);

    const pool = () => {
      const ids = new Set(); const out = [];
      const add = (it) => { if (!ids.has(it.id)) { ids.add(it.id); out.push(it); } };
      A.store.get('telaoFotosNovas', []).forEach((n) => add({ id: n.id, seed: n.seed || n.id, ratio: n.ratio || 'p', autor: n.autor || 'Convidado', min: n.min == null ? 0 : n.min, nova: true }));
      S.sim.forEach(add);
      A.data.photos.filter((p) => p.status === 'aprovada' && p.telao).map(toItem).forEach(add);
      return out;
    };
    const pick = (n) => {
      const items = pool().map((it) => ({ it, k: (S.shown[it.id] || 0) * 10 + (it.nova ? -5 : 0) + it.min / 400 + Math.random() }));
      items.sort((a, b) => a.k - b.k); const sel = items.slice(0, n).map((x) => x.it); sel.forEach((s) => { S.shown[s.id] = (S.shown[s.id] || 0) + 1; }); return sel;
    };
    const modelo = () => {
      const m = W.modelosDe(ev.id); const all = MODELS();
      const list = Array.isArray(m) ? m.filter((x) => all.includes(x)) : (m === 'rodizio' || m === 'auto') ? all : all.includes(m) ? [m] : ['polaroide'];
      const l = list.length ? list : ['polaroide']; return l[S.mi % l.length];
    };
    const when = (it) => (it.nova ? 'agora' : A.ago(it.min));
    const fig = (it, i, gap) => `<figure class="wl-cell" style="--i:${i};--gap:${gap}ms"><img class="wl-bd" src="${A.photo(it.seed, it.ratio)}" alt="" aria-hidden="true"><img class="wl-fg" src="${A.photo(it.seed, it.ratio)}" alt="Foto de ${esc(it.autor)}">${it.nova ? '<span class="wl-new">Agora</span>' : ''}<figcaption class="wl-leg" aria-hidden="true"><b>${esc(it.autor)}</b><span>${when(it)}</span></figcaption></figure>`;
    const sceneHtml = (m, items) => {
      const n = items.length;
      if (m === 'polaroide') { const it = items[0]; return `<div class="wl-layer"><div class="wl-pol" style="--ar:${AR[it.ratio]};--rot:${S.mi % 2 ? 1.6 : -1.6}deg"><div class="wl-ph"><img src="${A.photo(it.seed, it.ratio)}" alt="Foto de ${esc(it.autor)}"></div><p class="wl-cap"><b>${esc(it.autor)}</b><span>${when(it)}</span></p></div></div>`; }
      if (m === 'colagem') { const sl = SLOTS[Math.min(5, n)]; return `<div class="wl-layer"><div class="wl-col">${items.map((it, i) => `<div class="wl-item" style="--x:${sl[i][0]}%;--y:${sl[i][1]}%;--h:${sl[i][2]};--rot:${sl[i][3]}deg;--ar:${AR[it.ratio]};--i:${i}"><img src="${A.photo(it.seed, it.ratio)}" alt="Foto de ${esc(it.autor)}"></div>`).join('')}</div></div>`; }
      const cols = m === 'dump' ? 3 : Math.max(1, Math.ceil(n / 2)); const rows = Math.ceil(n / cols);
      return `<div class="wl-layer"><div class="wl-grid ${m === 'dump' ? 'wl-dump' : ''}" style="--cols:${cols};--rows:${rows}">${items.map((it, i) => fig(it, i, m === 'dump' ? 90 : 160)).join('')}</div></div>`;
    };
    const NEED = { polaroide: 1, mural: 6, colagem: 5, dump: 9 };
    const swap = (inner) => {
      scene.querySelectorAll('.wl-layer,.wl-state').forEach((o) => { o.classList.add('wl-out'); setTimeout(() => o.remove(), 800); });
      const d = document.createElement('div'); d.className = 'wl-fade'; d.innerHTML = inner; const el = d.firstElementChild; el.classList.add('wl-in'); scene.append(el); return el;
    };
    const veuNasLegendas = (el, items) => { if (!el) return; $$('.wl-cell', el).forEach((c, i) => { if (items[i]) A.aplicarVeu(c, A.photo(items[i].seed, items[i].ratio), { de: 0.7 }); }); };
    const stateHtml = (k) => {
      const wrap = (inner) => `<div class="wl-state">${inner}</div>`;
      if (k === 'loading') return wrap(msgCarregando({ h: 2, title: 'Conectando ao evento…', body: 'Aguarde alguns instantes.' }));
      if (k === 'error') return wrap(msgErro({ h: 2, title: 'Sem conexão com o evento', body: 'Tentando de novo. O telão volta sozinho quando a internet voltar.' }));
      if (k === 'panico') return wrap(msg({ h: 2, art: A.arc(0.1, 320, 'Já voltamos'), title: esc(ev.nome), body: 'Já voltamos.' }));
      if (k === 'pausado') return wrap(msg({ h: 2, art: A.arc(0.5, 320, 'Telão em pausa'), title: 'Telão em pausa', body: 'As fotos continuam chegando e voltam a aparecer quando o telão for retomado.' }));
      return wrap(msg({ h: 2, art: A.star(112), title: 'Aguardando as primeiras fotos', body: 'Aponte a câmera do celular para o QR e mande a primeira.', extra: `<div class="wl-qr">${A.qrSvg('albora.app/e/' + ev.slug, 150)}</div><span class="wl-meta">QR de exemplo: não escaneia neste protótipo</span>` }));
    };
    const renderScene = () => {
      const m = modelo(); S.model = m; const items = pick(NEED[m]); if (!items.length) return setKind('vazio', true);
      veuNasLegendas(swap(sceneHtml(m, items)), items); S.mi++;
    };
    const setKind = (k, force) => { if (S.kind === k && !force) return; S.kind = k; if (k === 'cena') renderScene(); else swap(stateHtml(k)); };
    const eqModel = () => JSON.stringify(W.modelosDe(ev.id));
    let modelSig = eqModel();
    const evaluate = () => {
      if (!live()) return;
      const sim = A.sim().state, pan = A.store.get('panico', false), pau = A.store.get('telaoPausado', false);
      const k = sim === 'loading' ? 'loading' : sim === 'error' ? 'error' : pan ? 'panico' : pau ? 'pausado' : (sim === 'empty' || !pool().length) ? 'vazio' : 'cena';
      const ms = eqModel(); const changedModel = ms !== modelSig; modelSig = ms;
      if (k !== S.kind) setKind(k); else if (k === 'cena' && changedModel) { S.mi = 0; renderScene(); }
      const n = A.data.photos.filter((p) => p.status === 'aprovada').length + A.store.get('telaoFotosNovas', []).length + S.sim.length;
      const pessoas = A.data.guests.filter((g) => g.fotos > 0).length + S.sim.length;
      $('#wl-count', root).textContent = k === 'cena' ? `${A.pt(n)} fotos · ${A.pt(pessoas)} pessoas` : '';
      const ens = A.when(ev.id).phase === 'antes';
      $('#wl-chips', root).innerHTML = ens ? '<span class="wl-chip">Ensaio: fotos de exemplo</span>' : '';
      const b = $('#wl-pausar', root); b.setAttribute('aria-pressed', String(!!pau)); b.innerHTML = pau ? `${ic('play', 16)} Retomar` : `${ic('pause', 16)} Pausar`;
    };
    const clock = () => { const c = $('#wl-clock', root); if (c) { const d = new Date(); c.dateTime = d.toISOString(); c.textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } };

    /* controles */
    const bar = $('#wl-bar', root), hint = $('#wl-hint', root); let barT; let helpApi = null;
    const showBar = () => { bar.classList.add('show'); hint.classList.add('off'); clearTimeout(barT); barT = setTimeout(() => { if (!bar.contains(document.activeElement)) bar.classList.remove('show'); }, 4500); S.tmr.push(barT); };
    const fsToggle = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { A.toast('Este navegador não deixou entrar em tela cheia. Use F11.'); } };
    const next = () => { if (S.kind === 'cena') renderScene(); };
    const pausar = () => { A.store.set('telaoPausado', !A.store.get('telaoPausado', false)); evaluate(); };
    const openHelp = () => {
      if (helpApi && helpApi.el.isConnected) return;
      helpApi = A.modal({ title: 'Atalhos do telão', body: `<dl class="wl-keys"><dt><span class="kbd">Espaço</span> <span class="kbd">P</span></dt><dd>Pausar ou retomar</dd><dt><span class="kbd">→</span> <span class="kbd">N</span></dt><dd>Próxima foto agora</dd><dt><span class="kbd">F</span></dt><dd>Entrar ou sair da tela cheia</dd><dt><span class="kbd">?</span></dt><dd>Abrir esta lista</dd><dt><span class="kbd">Esc</span></dt><dd>Sair da tela cheia, fechar esta lista ou mostrar os controles</dd></dl><p class="t-small wl-gap">O botão de pânico fica só no painel do anfitrião. Pausar aqui só para as fotos; o pânico mostra uma tela neutra.</p>`, actions: [{ label: 'Fechar', variant: 'btn-line' }] });
      helpApi.onClose = () => showBar();
    };
    const closeHelp = () => { helpApi && helpApi.close(); };
    S.api = { pausar, next, fsToggle, openHelp, closeHelp };
    on(wall, 'click', (e) => { if (!e.target.closest('#wl-bar,button,a')) { if (bar.classList.contains('show')) bar.classList.remove('show'); else showBar(); } });
    on(wall, 'mousemove', (() => { let t = 0; return () => { if (now() - t > 700) { t = now(); showBar(); } }; })());
    on(document, 'fullscreenchange', () => { const s = $('#wl-tela span', root); if (s) s.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia'; });
    on(document, 'keydown', (e) => {
      if (!wall.isConnected || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key; const inCtl = e.target.closest && e.target.closest('button,a,input,select,textarea,summary');
      if (A.$('.modal')) return;
      if (k === 'Escape') { if (!document.fullscreenElement) showBar(); return; }
      if (k === 'Tab') { showBar(); return; }
      if (inCtl && (k === ' ' || k === 'Enter')) return;
      if (k === ' ' || k === 'p' || k === 'P') { e.preventDefault(); pausar(); showBar(); }
      else if (k === 'ArrowRight' || k === 'n' || k === 'N') { next(); }
      else if (k === 'f' || k === 'F') { fsToggle(); }
      else if (k === '?' || k === 'h' || k === 'H') { openHelp(); }
    });
    on(window, 'storage', evaluate);

    /* relógio, rotação, checagem de estado e chegada de fotos novas (só durante a festa) */
    clock(); evaluate();
    S.tmr.push(setInterval(clock, 5000));
    S.tmr.push(setInterval(() => { if (live() && S.kind === 'cena') renderScene(); }, ROTACAO));
    S.tmr.push(setInterval(evaluate, 1000));
    S.tmr.push(setInterval(() => {
      if (!live() || A.when(ev.id).phase !== 'durante' || S.kind !== 'cena') return;
      const k = S.sim.length; const nomes = A.data.guests.filter((g) => g.fotos > 0);
      S.sim.push({ id: 'nv' + k, seed: 'chegou' + k, ratio: ['p', 'l', 'p', 's'][k % 4], autor: nomes[(k * 3) % nomes.length].primeiro, min: 0, nova: true });
      S.mi = 0; renderScene();
    }, 20000));
    S.tmr.push(setTimeout(() => hint.classList.add('off'), 7000));
  }

  A.acts['wl-pausar'] = () => ENG && ENG.api.pausar();
  A.acts['wl-proxima'] = () => ENG && ENG.api.next();
  A.acts['wl-tela'] = () => ENG && ENG.api.fsToggle();
  A.acts['wl-ajuda'] = () => ENG && ENG.api.openHelp();
  A.acts['wl-desligar'] = async () => {
    const ok = await A.confirm({ title: 'Desligar este telão?', body: '<p>A tela volta para o código de pareamento e para de mostrar as fotos até ser ligada de novo. Nada é apagado.</p>', confirm: 'Desligar', danger: true });
    if (!ok) return; if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* ok */ } }
    W.desligar(); parearIni = false; stopEng(); A.go('#/t/parear'); A.toast('Telão desligado.');
  };

  /* mapa do protótipo */
  A.map('Telão (TV do salão)', 'Ligar o telão (código na tela)', '#/t/parear', 'Código grande, passos e estados');
  A.map('Telão (TV do salão)', 'Conectar por link de uso único', '#/t/link/amostra', 'Link de exemplo que sempre funciona');
  A.map('Telão (TV do salão)', 'Link que não vale mais', '#/t/link/expirado', 'Como gerar outro');
  A.map('Telão (TV do salão)', 'Telão em exibição', '#/t/display', 'Tela cheia, 4 modelos, sem cortar foto em pé');
})();
