/* host-criar.js — entrada e criação do anfitrião: /h, /h/entrar, /h/novo/:step, /h/novo/pronto, /h/plano */
(function () {
  const A = window.A; if (!A) return;
  const S = A.store, esc = A.esc, $ = A.$, $$ = A.$$;
  const DAY = 86400000, HOJE = new Date('2026-11-14T12:00:00'), HOJE_ISO = '2026-11-14', AMANHA_ISO = '2026-11-15';
  const MAXN = 60;

  /* ---------- estilos próprios (prefixo hcr-) ---------- */
  const st = document.createElement('style'); st.id = 'hcr-style';
  st.textContent = `
.hcr-auth{min-height:100dvh;display:grid;grid-template-columns:minmax(0,1fr);align-content:start;padding:0}
.hcr-hero{display:flex;flex-direction:column;gap:var(--space-4);padding:var(--space-6) var(--space-4) var(--space-5);background:linear-gradient(160deg,color-mix(in srgb,var(--ac) 45%,var(--tinta)),var(--tinta));color:var(--papel)}
.hcr-hero-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
.hcr-hero-g span{display:block;aspect-ratio:4/5;border-radius:var(--r-3);overflow:hidden}
.hcr-hero-g span:nth-child(n+4){display:none}
.hcr-hero-g img{display:block;width:100%;height:100%;object-fit:cover}
.hcr-hero-t{margin:0;font:350 var(--fs-xl)/1.15 var(--font-display);color:var(--papel)}
.hcr-auth-in{width:min(420px,100%);margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-8);display:flex;flex-direction:column;gap:var(--space-6)}
.hcr-auth .input{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-3);padding:var(--space-3) var(--space-4)}
.hcr-auth .input:focus{border-color:var(--ac)}
.hcr-auth .btn{border-radius:var(--r-pill)}
.hcr-prog{flex-direction:column;align-items:stretch;gap:var(--space-2)}
.hcr-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2);width:100%}
.hcr-seg i{display:block;height:4px;border-radius:var(--r-pill);background:var(--line)}
.hcr-seg i.on{background:var(--ac)}
.hcr-wiz .hcr-opts{border-top:0;gap:var(--space-2)}
.hcr-wiz .hcr-opt{border:1px solid var(--line-2);border-radius:var(--r-3);background:var(--surface)}
.hcr-wiz .hcr-opt[aria-checked="true"],.hcr-wiz .hcr-combo[aria-checked="true"]{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 10%,var(--bg))}
.hcr-wiz .hcr-combos{border-top:0;gap:var(--space-2)}
.hcr-wiz .hcr-combo{border:1px solid var(--line-2);border-radius:var(--r-pill);background:var(--surface)}
.hcr-wiz .input,.hcr-wiz .select,.hcr-wiz .textarea{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-3);padding:var(--space-3) var(--space-4)}
.hcr-wiz .input:focus,.hcr-wiz .select:focus,.hcr-wiz .textarea:focus{border-color:var(--ac)}
.hcr-wiz .hcr-foot{border-top:0}
.hcr-wiz .hcr-foot .btn{border-radius:var(--r-pill)}
.hcr-card{display:flex;flex-direction:column;gap:var(--space-5);padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hcr-card-h{display:flex;align-items:center;gap:var(--space-3)}
.hcr-n{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:var(--ac);color:var(--on-ac);font-weight:600;font-size:var(--fs-sm)}
.hcr-card .input,.hcr-card .select,.hcr-card .textarea,.hcr-card .hcr-opt,.hcr-card .hcr-combo{background:var(--bg)}
.hcr-wiz .hcr-more{background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3);padding:var(--space-2) var(--space-4)}
.hcr-ok .btn{border-radius:var(--r-pill)}
.hcr-placa{border-radius:var(--r-4);box-shadow:0 12px 32px color-mix(in srgb,var(--tinta) 14%,transparent)}
.hcr-msg{border:1px solid var(--line-2);border-radius:var(--r-3)}
.hcr-link{border-radius:var(--r-3)}
.hcr-hero-ok h1{letter-spacing:-.02em}
@media(min-width:900px){
  .hcr-auth{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);align-content:stretch}
  .hcr-hero{justify-content:center;padding:var(--space-16) var(--space-12)}
  .hcr-hero-g span:nth-child(n+4){display:block}
  .hcr-hero-g span:nth-child(even){transform:translateY(var(--space-8))}
  .hcr-hero-t{margin-top:var(--space-12);font-size:var(--fs-title)}
  .hcr-auth-in{align-self:center;padding:var(--space-8)}
}
.hcr-brand{text-decoration:none;color:inherit;display:inline-flex;align-items:center;min-height:44px}
.hcr-nudge{margin-top:var(--space-2)}
.hcr-lkrow{display:flex;flex-wrap:wrap;align-items:center;column-gap:var(--space-3)} .hcr-lk{display:inline-flex;align-items:center;min-height:44px}
.hcr-plt{flex:1 1 12rem;min-width:0} .hcr-pli{flex-wrap:wrap} .hcr-pli .grow{flex:1 1 10rem;min-width:0} .hcr-pli .btn-icon.btn-sm{width:44px}
.hcr-tools .search input,.hcr-tools .search{min-height:44px}
.hcr-wtop{display:flex;align-items:center;gap:var(--space-4);padding:var(--space-3) var(--space-6);border-bottom:1px solid var(--line-2)}
.hcr-wiz .page{padding-bottom:var(--space-6)}
.hcr-stage{overflow-x:clip;display:grid;grid-template-columns:minmax(0,520px) minmax(0,1fr);gap:var(--space-16);align-items:start}
.hcr-col{min-width:0;display:flex;flex-direction:column;gap:var(--space-6)}
@keyframes hcr-fwd{from{opacity:0;transform:translateX(var(--space-4))}} @keyframes hcr-bck{from{opacity:0;transform:translateX(calc(var(--space-4) * -1))}}
.hcr-col.hcr-fwd{animation:hcr-fwd var(--dur-3) var(--ease)} .hcr-col.hcr-bck{animation:hcr-bck var(--dur-3) var(--ease)}
.hcr-prog{display:flex;align-items:center;gap:var(--space-3)} .hcr-prog .arc{flex:none}
.hcr-pvside{position:sticky;top:24px}
.hcr-pvside .hcr-pv{max-width:440px;margin-inline:auto}
.hcr-pvside .tabs{max-width:440px;margin-inline:auto} .hcr-pvside .tab{padding-inline:var(--space-2)}
@media(max-width:960px){.hcr-stage{grid-template-columns:minmax(0,1fr);gap:var(--space-6)}.hcr-pvside{order:-1;position:static}.hcr-compact .hcr-pv:not(.hcr-wallpv){display:grid;grid-template-columns:minmax(0,96px) minmax(0,1fr);align-items:center}.hcr-compact .hcr-cover{aspect-ratio:auto;align-self:stretch;min-height:96px}.hcr-compact .hcr-pv-body .btn,.hcr-compact .hcr-pv-body .t-small:first-child{display:none}.hcr-compact .hcr-pv-t{font-size:var(--fs-xl)}.hcr-compact .hcr-mono .monogram{font-size:var(--fs-xl)}.hcr-compact .hcr-pvside .tabs,.hcr-compact .hcr-pvside #hcr-prev>div>p{display:none}.hcr-compact .hcr-pv-body{padding:var(--space-3) var(--space-4)}}
@media(max-width:600px){.hcr-hide-m{display:none!important}.hcr-wtop{padding:var(--space-3) var(--space-4)}}
.hcr-resume{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;margin-bottom:var(--space-6);border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
.hcr-resume>.grow{flex:1 1 220px;min-width:0}
.hcr-opts{display:flex;flex-direction:column;border-top:1px solid var(--line-2)}
.hcr-opt{display:flex;gap:var(--space-4);align-items:center;width:100%;min-height:64px;padding:var(--space-3);background:none;border:0;border-bottom:1px solid var(--line-2);text-align:left;color:var(--fg)}
.hcr-opt:hover,.hcr-opt[aria-checked="true"]{background:var(--surface)}
.hcr-opt .nm{display:block;font:380 var(--fs-xl)/1.15 var(--font-display);letter-spacing:-.01em}
.hcr-opt .ck{width:20px;flex:none;color:var(--accent-text)}
.hcr-combos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid var(--line-2)}
@media(max-width:480px){.hcr-combos{grid-template-columns:1fr}}
.hcr-combo{display:flex;gap:var(--space-3);align-items:center;min-height:48px;padding:0 var(--space-3);background:none;border:0;border-bottom:1px solid var(--line-2);text-align:left;color:var(--fg);font-size:var(--fs-sm)}
.hcr-combo:hover,.hcr-combo[aria-checked="true"]{background:var(--surface)} .hcr-combo[aria-checked="true"]{font-weight:500}
.hcr-dots{display:inline-flex;flex:none} .hcr-dots i{width:20px;height:20px;border-radius:50%;border:1px solid var(--line);display:block} .hcr-dots i+i{margin-left:calc(var(--space-2) * -.75)}
.hcr-selo{display:flex;gap:var(--space-2);align-items:flex-start;font-size:var(--fs-sm)}
.hcr-foot{position:sticky;bottom:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:var(--space-3) 0 calc(var(--space-3) + env(safe-area-inset-bottom));background:var(--bg);border-top:1px solid var(--line-2)}
.hcr-x{width:32px;height:32px;border:0;background:none;display:inline-grid;place-items:center;border-radius:50%;color:inherit;margin-right:-8px;padding:0}
.hcr-x:hover{background:var(--surface-2)}
.hcr-sum{margin:0} .hcr-sum>div{display:flex;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);font-size:var(--fs-sm)} .hcr-sum dt{width:34%;color:var(--fg-3);flex:none} .hcr-sum dd{margin:0;flex:1;min-width:0}
.hcr-capa-in:focus-visible+label{outline:2px solid var(--accent-text);outline-offset:2px}
.hcr-pv{border:1px solid var(--line-2);border-radius:var(--r-3);overflow:hidden;background:var(--bg);color:var(--fg)}
.hcr-pv img{display:block;width:100%}
.hcr-cover{aspect-ratio:4/5;background:var(--surface-2);overflow:hidden} .hcr-cover img{height:100%;object-fit:cover}
.hcr-mono{width:100%;height:100%;display:grid;place-items:center;background:var(--ac);color:var(--on-ac)}
.hcr-mono .monogram{font-size:clamp(56px,9vw,96px)}
.hcr-pv-body{padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2)}
.hcr-pv-t{font-family:var(--hcr-font);font-weight:380;font-size:var(--fs-title);line-height:1.1;letter-spacing:-.01em}
.hcr-pv .btn-accent{border-radius:var(--hcr-r)}
.hcr-wallpv{aspect-ratio:16/9;display:flex;flex-direction:column;padding:var(--space-3);gap:var(--space-2)}
.hcr-wallpv .row{display:flex;gap:8px;flex:1;align-items:flex-start;min-height:0}
.hcr-pol{background:var(--papel);padding:var(--space-1) var(--space-1) var(--space-3);flex:1;min-width:0;border-radius:2px;box-shadow:0 1px 3px color-mix(in srgb,var(--noite) 50%,transparent)}
.hcr-albm{columns:2;column-gap:var(--space-2);padding:0 var(--space-4) var(--space-4)} .hcr-albm img{margin-bottom:var(--space-2);border-radius:var(--hcr-r);height:auto}
.hcr-link{font:500 var(--fs-md) var(--font-body);font-variant-numeric:tabular-nums;word-break:break-all;background:var(--surface);padding:var(--space-3) var(--space-4);border-radius:var(--r-1)}
.hcr-msg{background:var(--surface);padding:var(--space-4);border-radius:var(--r-2);font-size:var(--fs-md);white-space:pre-line}
.hcr-ok{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:var(--space-12);align-items:start}
@media(max-width:860px){.hcr-ok{grid-template-columns:1fr;gap:var(--space-16)}.hcr-ok>section:nth-child(2){order:-1}}
.hcr-hero-ok{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-4);padding:var(--space-4) 0 var(--space-8)}
.hcr-seal{display:flex;align-items:flex-start;gap:var(--space-2)} .hcr-hero-ok .stack{align-items:center}
.hcr-placa{background:var(--papel);color:var(--tinta);--qr-bg:var(--papel);border:1px solid var(--line);border-radius:var(--r-1);padding:var(--space-6);display:flex;flex-direction:column;align-items:center;gap:var(--space-3);text-align:center}
.hcr-placa .nm{font:380 var(--fs-xl)/1.15 var(--font-display);letter-spacing:-.01em}
.hcr-placa-s{color:color-mix(in srgb,var(--tinta) 70%,var(--papel))}
.hcr-placa .u{font:500 var(--fs-xs) var(--font-body);letter-spacing:.02em;color:color-mix(in srgb,var(--tinta) 70%,var(--papel))}
.hcr-tools{display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-3)}
.hcr-tools .search{flex:1;min-width:220px}
.hcr-ev{display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:var(--space-6);align-items:center;padding:var(--space-4) var(--space-2);border-bottom:1px solid var(--line-2);text-decoration:none;color:inherit}
.hcr-ev:hover{background:var(--surface)}
.hcr-ev:focus-visible{outline-offset:-2px}
.hcr-thumb{width:88px;aspect-ratio:4/5;border-radius:var(--r-2);overflow:hidden;background:var(--ac);color:var(--on-ac);display:grid;place-items:center}
.hcr-thumb img{width:100%;height:100%;object-fit:cover} .hcr-thumb .monogram{font-size:var(--fs-xl)}
.hcr-ev-n{display:block;font:380 var(--fs-title)/1.1 var(--font-display);letter-spacing:-.01em;margin-bottom:var(--space-1)}
.hcr-ev-w{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-1);min-width:92px}
.hcr-ev-w b{font:300 var(--fs-hero)/1 var(--font-display);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
@media(max-width:600px){.hcr-thumb .monogram{font-size:var(--fs-md)}.hcr-ev{grid-template-columns:64px minmax(0,1fr);gap:var(--space-3)}.hcr-thumb{width:64px}.hcr-ev-w{grid-column:2;align-items:flex-start;text-align:left;flex-direction:row;gap:var(--space-2);align-items:baseline}.hcr-ev-w b{font-size:var(--fs-title)}}
.hcr-pay{display:flex;flex-direction:column}
.tabbar:has(> :nth-child(4):last-child){grid-template-columns:repeat(4,1fr)}
.hcr-tps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
@media(max-width:480px){.hcr-tps{grid-template-columns:repeat(2,minmax(0,1fr))}}
.hcr-tp{display:flex;align-items:center;gap:var(--space-2);min-height:48px;padding:0 var(--space-3);background:none;border:1px solid var(--line);border-radius:var(--r-2);color:var(--fg);font:500 var(--fs-sm)/1.2 var(--font-body);text-align:left}
.hcr-tp:hover{background:var(--surface)}
.hcr-tp[aria-checked="true"]{border-color:var(--fg);background:var(--surface)}
.hcr-tp:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
.hcr-tp .ic{flex:none}
.hcr-opts.hcr-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--space-4)}
@media(max-width:480px){.hcr-opts.hcr-g2{grid-template-columns:minmax(0,1fr)}}
.hcr-more{border-bottom:1px solid var(--line-2)}
.hcr-more>summary:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
.hcr-more-in{padding-top:var(--space-2)}
.hcr-sk{display:grid;grid-template-columns:88px minmax(0,1fr);gap:var(--space-6);align-items:center;padding:var(--space-4) var(--space-2);border-bottom:1px solid var(--line-2)}
.hcr-sk .t{aspect-ratio:4/5;border-radius:var(--r-2)} .hcr-sk .l{display:flex;flex-direction:column;gap:var(--space-2)}
.hcr-sk .l .skeleton:first-child{height:28px;width:70%} .hcr-sk .l .skeleton:last-child{height:16px;width:50%}
.hcr-sk-bar{height:44px;margin-bottom:var(--space-3)} .hcr-sk-bar.m{display:none} @media(max-width:600px){.hcr-sk-bar.m{display:block}}
@media(max-width:600px){.hcr-sk{grid-template-columns:64px minmax(0,1fr);gap:var(--space-3)}}
.hcr-dim{color:var(--fg-3)}
@media(max-width:760px){.hcr-brand.only-sm{display:inline-flex!important;min-height:44px}}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){
.hcr-opt:not([aria-checked="true"]):hover,.hcr-combo:not([aria-checked="true"]):hover{background:none}
.hcr-x:hover,.hcr-ev:hover{background:none}
.hcr-tp:not([aria-checked="true"]):hover{background:none}
}
/* v203 — Seus eventos: cartões com capa e selo, em grade (fim do bloco para vencer as regras originais) */
.hcr-evs{display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:var(--space-4)}
.hcr-ev{display:flex;flex-direction:column;gap:0;padding:0;border:1px solid var(--line-2);border-radius:var(--r-4);background:var(--surface);overflow:hidden;transition:transform var(--dur-2) var(--ease),box-shadow var(--dur-2) var(--ease)}
.hcr-ev .hcr-thumb{position:relative;width:100%;aspect-ratio:16/10;border-radius:0}
.hcr-ev .hcr-thumb .monogram{font-size:var(--fs-display)}
.hcr-ev-pill{position:absolute;right:var(--space-3);top:var(--space-3);padding:var(--space-1) var(--space-3);border-radius:var(--r-pill);background:var(--bg);color:var(--fg);font-size:var(--fs-sm);font-weight:600;box-shadow:0 2px 10px color-mix(in srgb,var(--tinta) 22%,transparent)}
.hcr-ev-pill.live{background:var(--ac);color:var(--on-ac)}
.hcr-ev-b{display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-4) var(--space-5) var(--space-5);min-width:0}
.hcr-ev-n{margin-bottom:0}
.hcr-ev-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hcr-ev-p{align-self:flex-start;margin-top:var(--space-2);padding:var(--space-1) var(--space-3);border-radius:var(--r-pill);background:var(--surface-2);font-size:var(--fs-xs);color:var(--fg-2)}
@media(hover:hover){.hcr-ev:hover{background:var(--surface);transform:translateY(calc(-1 * var(--space-1)));box-shadow:0 16px 32px color-mix(in srgb,var(--tinta) 12%,transparent)}}
@media(prefers-reduced-motion:reduce){.hcr-ev{transition:none}.hcr-ev:hover{transform:none}}
@media(max-width:600px){.hcr-evs{grid-template-columns:minmax(0,1fr)}.hcr-ev .hcr-thumb{width:100%}.hcr-ev .hcr-thumb .monogram{font-size:var(--fs-display)}}
`;
  document.head.appendChild(st);

  /* ---------- dados de pack (verticais) ---------- */
  const PACK = {
    casamento: { ex: 'Marina & Rafael', momentos: (A.data.momentos || []).slice(), missoes: (A.data.missions || []).slice(0, 8).map((m) => m.titulo) },
    aniversario: { ex: 'Os 40 da Lu', momentos: ['Chegada', 'Parabéns', 'Jantar', 'Pista', 'Despedida'], missoes: ['Quem chegou primeiro?', 'A mesa mais animada', 'Um brinde inesperado', 'Uma foto com quem você não conhecia', 'O detalhe que ninguém viu', 'A pista cheia', 'Sua selfie com quem faz aniversário'] },
    formatura: { ex: 'Formatura Direito 2026', momentos: ['Colação', 'Recepção', 'Jantar', 'Baile', 'Despedida'], missoes: ['Quem chegou primeiro?', 'A turma toda junta', 'O abraço mais apertado', 'Os pais emocionados', 'A pista cheia', 'O detalhe que ninguém viu', 'Sua selfie com a turma'] },
    corporativo: { ex: 'Confraternização da equipe', momentos: ['Recepção', 'Abertura', 'Almoço', 'Atividade', 'Encerramento'], missoes: ['A foto da equipe', 'Quem você acabou de conhecer', 'O melhor brinde', 'O detalhe da decoração', 'Um momento de risada'] },
    celebracao: { ex: 'Chá da Helena', momentos: ['Chegada', 'Brincadeiras', 'Parabéns', 'Lanche', 'Despedida'], missoes: ['Quem chegou primeiro?', 'A mesa mais animada', 'O abraço mais apertado', 'O detalhe que ninguém viu', 'Sua selfie com a família', 'Um momento de risada'] },
    outro: { ex: 'Nome da sua festa', momentos: ['Chegada', 'Momento principal', 'Pista', 'Despedida'], missoes: ['Quem chegou primeiro?', 'O abraço mais apertado', 'O detalhe que ninguém viu', 'Uma foto com quem você não conhecia', 'Sua selfie com o grupo'] },
  };
  const FONT = { editorial: 'var(--font-display)', minimal: 'var(--font-body)', contemporaneo: 'var(--font-body)', fotografico: 'var(--font-display)', classic: 'var(--font-display)' };
  const RAD = { editorial: 'var(--r-2)', minimal: '0px', contemporaneo: 'var(--r-3)', fotografico: 'var(--r-1)', classic: 'var(--r-1)' };
  const CEPS = { '30130010': 'Av. Afonso Pena, Centro, Belo Horizonte - MG', '01310100': 'Av. Paulista, Bela Vista, São Paulo - SP', '70040010': 'Esplanada dos Ministérios, Brasília - DF', '20040020': 'Rua da Assembleia, Centro, Rio de Janeiro - RJ', '80010000': 'Rua XV de Novembro, Centro, Curitiba - PR' };
  const FASE = { antes: 'Preparando', durante: 'Ao vivo', depois: 'Encerrado' };

  const tipoObj = (id) => A.data.tipos.find((t) => t.id === id) || A.data.tipos[A.data.tipos.length - 1];
  const estiloObj = (id) => A.data.estilos.find((t) => t.id === id) || A.data.estilos[0];
  const ME = () => (A.data.team && A.data.team[0]) || { nome: 'Marina Almeida', email: 'marina@email.com' };
  const authed = () => S.get('hostAuth', true);
  const vendors = () => ((A.data.vendors && A.data.vendors.length) ? A.data.vendors.map((v, i) => ({ id: String(v.id || 'v' + i), nome: v.nome || v.name || 'Fornecedor' })) : [{ id: 'v1', nome: 'Studio Luz & Festa' }, { id: 'v2', nome: 'Cerimonial Passo a Passo' }]);
  const iniNome = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slugify = (s) => norm(s).replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const plano = (id) => (A.data.planos || []).find((p) => p.id === id) || { id, nome: id, preco: 0, itens: [] };
  const fmtISO = (iso, o) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', o || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const goto = (h) => { if (location.hash === h) A.render(); else A.go(h); };
  const redirect = (h) => { A.later(0, () => A.go(h)); return `<main id="main" class="page"><div class="skeleton" style="height:40px"></div></main>`; };
  const guard = (ctx) => (authed() ? null : redirect('#/h/entrar?next=' + encodeURIComponent(ctx.path)));
  const rerender = (sel) => { A.render(); if (sel) { const x = $(sel); if (x) x.focus(); } };
  const safeNext = (raw) => (typeof raw === 'string' && /^\/h(\/|$)/.test(raw) && !raw.includes('//') && !raw.includes(':') && !raw.includes('\\') ? '#' + raw : '');
  const hexOk = (h) => (/^#[0-9a-f]{6}$/i.test(h || '') ? h : '');
  /* o cartão de prévia tem data-theme="noite", que relê o acento de --ev-fill-n na raiz: a cor escolhida precisa chegar até lá */
  const prevVars = (cor, cor2, est) => { const ok = hexOk(cor), r = ok ? A.theme.resolve(ok, 'noite') : null; return `--ev:${ok || 'var(--ambar)'};--ev-2:${hexOk(cor2) || 'var(--ev-2)'};${r ? `--ev-fill-n:${r.fill};--ev-text-n:${r.text};--on-fill-n:${r.onFill};${A.theme.scope(ok, 'noite')};` : ''}--hcr-font:${FONT[est] || FONT.editorial};--hcr-r:${RAD[est] || RAD.editorial}`; };

  /* contraste (WCAG) — papel lido do CSS, nenhuma cor fixa aqui */
  const toRgb = (c) => { c = String(c).trim(); let m = c.match(/^#([0-9a-f]{6})$/i); if (m) return [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16)); m = c.match(/^#([0-9a-f]{3})$/i); if (m) return [...m[1]].map((x) => parseInt(x + x, 16)); return null; };
  const lum = (rgb) => { const f = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const papelRgb = () => toRgb(getComputedStyle(document.documentElement).getPropertyValue('--papel')) || [255, 255, 255];
  const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const legivel = (h) => { let c = toRgb(h); if (!c) return h; let k = 0; while (ratio(papelRgb(), c) < 4.5 && k++ < 25) c = c.map((v) => v * 0.9); return toHex(...c); };
  const seloHtml = (d) => {
    const c = toRgb(d.cor); if (!c) return `<span>${A.icon('warn', 18)}</span><span>Essa cor não é válida. Escolha outra.</span>`;
    const r = ratio(papelRgb(), c), n = r.toFixed(1).replace('.', ',') + ':1';
    if (r >= 7) return `<span class="pos">${A.icon('check', 18)}</span><span><b>Contraste ${n}: excelente.</b> O texto claro sobre a cor principal fica bem legível.</span>`;
    if (r >= 4.5) return `<span class="pos">${A.icon('check', 18)}</span><span><b>Contraste ${n}: bom (AA).</b> O texto claro sobre a cor principal é legível.</span>`;
    if (r >= 3) return `<span class="accent">${A.icon('warn', 18)}</span><span><b>Contraste ${n}: só para títulos grandes.</b> Botões e textos pequenos ficam difíceis de ler. Prefira uma cor mais escura.</span>`;
    return `<span class="crit">${A.icon('warn', 18)}</span><span><b>Contraste ${n}: baixo.</b> O texto sobre a cor principal não vai ser lido. Escolha uma cor mais escura.</span>`;
  };

  /* ---------- eventos extras + planos persistidos ---------- */
  const seedPlan = {};
  A.data.events.forEach((e) => { seedPlan[e.id] = e.plano; });
  function sync() {
    const ex = S.get('eventosExtras', []), ov = S.get('crPlanos', {}), caps = S.get('crCapas', {}), ev = A.data.events;
    for (let i = ev.length - 1; i >= 0; i--) if (ev[i]._x && !ex.some((x) => x.id === ev[i].id)) ev.splice(i, 1);
    ex.forEach((x) => { const i = ev.findIndex((e) => e.id === x.id); if (i < 0) ev.push(Object.assign({}, x, { _x: 1 })); else Object.assign(ev[i], x, { _x: 1 }); });
    ev.forEach((e) => {
      e.plano = ov[e.id] || (e._x ? (ex.find((x) => x.id === e.id) || {}).plano : seedPlan[e.id]) || 'gratis';
      if (caps[e.id]) e.capa = caps[e.id];
    });
  }
  sync();
  window.addEventListener('hashchange', sync, true);
  const reset0 = A.acts.reset;
  A.acts.reset = (...a) => { S.reset(); sync(); if (reset0) reset0(...a); };

  /* API para o painel: completar data, hora e local de um evento criado no assistente */
  A.evt = {
    patch(id, p) {
      const q = Object.assign({}, p); if (q.dataIso) q.phaseFixed = Math.round((new Date(q.dataIso + 'T12:00:00') - HOJE) / DAY) > 0 ? 'antes' : 'durante';
      S.update('eventosExtras', (a) => a.map((x) => (x.id === id ? Object.assign({}, x, q) : x)), []); sync();
    },
    minData: AMANHA_ISO,
    lerImagem,
    setCapa(id, url) {
      const antes = S.get('crCapas', {}); S.update('crCapas', (m) => Object.assign({}, m, { [id]: url }), {});
      if (A.store.erro) { S.set('crCapas', antes); sync(); return false; }
      sync(); return true;
    },
    convite(ev) {
      const est = A.data.estilos.find((x) => x.nome === ev.estilo) || A.data.estilos[0], w = A.when(ev.id);
      const fam = (A.hero && ev.capa) ? A.hero.getCfg(ev.id).familia : 'imersivo';
      const cover = ev.capa ? `<img src="${esc(ev.capa)}" alt="Capa escolhida" style="${A.hero ? A.hero.fotoStyle(ev.id) : 'object-position:50% ' + (+ev.foco || 50) + '%'}">` : ev.capaDemo ? A.img('cv-' + ev.id, 'p', 'Capa de exemplo (ilustração)') : `<div class="hcr-mono" role="img" aria-label="Monograma da festa: ${esc(ev.iniciais)}"><span class="monogram">${esc(ev.iniciais)}</span></div>`;
      const vars = prevVars(ev.cor, ev.cor2, est.id);
      return `<div style="${vars}"><div class="hcr-pv" ${fam === 'imersivo' ? 'data-theme="noite"' : ''} data-fam="${fam}"><div class="hcr-cover">${cover}</div><div class="hcr-pv-body"><span class="t-small">Você foi convidado para</span><div class="hcr-pv-t">${esc(ev.nome)}</div><p class="t-small hcr-pv-meta"><span>${A.icon('calendar', 14)}${esc(w.date)}</span><span>${A.icon('pin', 14)}${esc(ev.local || 'Local a definir')}</span></p><div class="btn btn-accent btn-block" style="margin-top:8px" aria-hidden="true">Entrar na festa</div></div></div></div>`;
    },
  };

  /* A.when com a data real dos eventos criados aqui */
  const when0 = A.when;
  A.when = (id = 'e1') => {
    const ev = A.data.events.find((e) => e.id === id);
    if (ev && ev._x && !ev.dataIso) return { phase: 'antes', date: 'Data a definir', label: 'Data a definir', days: 0, semData: true };
    if (!ev || !ev.dataIso) return when0(id);
    const d = new Date(ev.dataIso + 'T12:00:00'), days = Math.round((d - HOJE) / DAY), phase = days > 0 ? 'antes' : days === 0 ? 'durante' : 'depois';
    const date = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const label = phase === 'antes' ? (days === 1 ? 'Falta 1 dia' : `Faltam ${days} dias`) : phase === 'durante' ? 'Acontecendo agora' : (days === -1 ? 'Foi ontem' : `Foi há ${-days} dias`);
    return { phase, date, label, days };
  };

  /* ---------- rascunho do assistente ---------- */
  const novoRascunho = () => { const c = A.data.combos[0]; return { tipo: A.data.tipos[0].id, nome: '', data: '', hora: '', local: '', localAuto: '', cep: '', esperados: '', sob: 'conta', emailPainel: '', momentos: null, missoesOff: [], proprias: [], capa: '', foco: '50', estilo: A.data.estilos[0].id, combo: '0', cor: c[1], cor2: c[2], corFoto: '', passo: 1 }; };
  const getD = () => Object.assign(novoRascunho(), S.get('crRascunho', {}) || {});
  const putD = (d) => { d.atualizado = Date.now(); S.set('crRascunho', d); const el = $('#hcr-saved'); if (el) el.textContent = 'Rascunho salvo neste navegador.'; };
  const temRasc = () => { const d = S.get('crRascunho', null); return d && (d.nome || d.data || (d.passo || 1) > 1) ? d : null; };
  const momD = (d) => d.momentos || (PACK[d.tipo] || PACK.outro).momentos;
  const missoesAtivas = (d) => (PACK[d.tipo] || PACK.outro).missoes.filter((_, i) => !d.missoesOff.includes(i)).concat(d.proprias);
  const iniciais = (nome, tipo) => {
    const stop = ['de', 'da', 'do', 'dos', 'das', 'e', '&', norm(tipoObj(tipo).nome)];
    const w = nome.split(/\s+/).filter((x) => x && !stop.includes(norm(x)));
    const base = w.length ? w : nome.split(/\s+/).filter(Boolean);
    if (/&/.test(nome) && base.length >= 2) return (base[0][0] + '&' + base[base.length - 1][0]).toUpperCase();
    return base.slice(0, 3).map((x) => x[0]).join('').toUpperCase();
  };
  function validar(d) {
    const e = {};
    if ((d.nome || '').trim().length < 2) e.nome = 'Dê um nome para a festa, com pelo menos 2 letras.';
    if (d.data && d.data < AMANHA_ISO) e.data = 'Escolha uma data a partir de amanhã ou deixe em branco para definir depois.';
    if (d.esperados !== '' && !(Number.isInteger(+d.esperados) && +d.esperados >= 1 && +d.esperados <= 999)) e.esperados = 'Informe um número de 1 a 999.';
    if (d.sob !== 'conta' && A.rules.email(d.emailPainel || '')) e.emailPainel = A.rules.email(d.emailPainel || '');
    return e;
  }

  /* ---------- leitura de imagem (remove EXIF ao redesenhar) ---------- */
  function lerImagem(file) {
    return new Promise((res, rej) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej('Esse arquivo não é uma foto JPG, PNG ou WebP. Escolha outra imagem.');
      if (file.size > 10 * 1024 * 1024) return rej('A foto tem mais de 10 MB. Escolha uma menor.');
      const fr = new FileReader(); fr.onerror = () => rej('Não conseguimos ler esse arquivo. Tente outra foto.');
      fr.onload = () => {
        const im = new Image(); im.onerror = () => rej('Essa imagem parece corrompida. Tente outra foto.');
        im.onload = () => {
          const k = Math.min(1, 720 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          let cor = ''; try { const s = document.createElement('canvas'); s.width = s.height = 8; const sx = s.getContext('2d'); sx.drawImage(im, 0, 0, 8, 8); const px = sx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; } const n = px.length / 4; cor = legivel(toHex(r / n, g / n, b / n)); } catch (e) { /* sem cor */ }
          res({ url: c.toDataURL('image/jpeg', 0.82), cor });
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* =========================================================
     Shell de conta (sem trilho de evento)
  ========================================================= */
  function acct(active, content) {
    A.applyEvent(null); const me = ME();
    const ctx = `<button class="ctx" data-act="hcr-conta" aria-haspopup="menu"><span class="avatar" aria-hidden="true">${esc(iniNome(me.nome))}</span><span class="grow"><b class="t-h" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(me.nome)}</b><span class="t-small">Minha conta</span></span>${A.icon('chevdown', 16)}</button>`;
    const items = [{ id: 'eventos', label: 'Seus eventos', icon: 'calendar', href: '#/h' }, { id: 'novo', label: 'Novo evento', icon: 'plus', href: '#/h/novo/1' }, { id: 'plano', label: 'Plano e cobrança', icon: 'wallet', href: '#/h/plano' }];
    const top = `<div class="grow"><span class="t-small hide-sm">${esc(me.email)}</span><a class="only-sm hcr-brand" href="#/h" aria-label="Albora, seus eventos">${A.logo(24)}</a></div><button class="btn btn-quiet btn-sm" data-act="palette" aria-label="Buscar (Ctrl K)">${A.icon('search', 18)}<span class="hide-sm">Buscar</span><span class="kbd hide-sm">⌘K</span></button><button class="avatar acct" data-act="hcr-conta" aria-haspopup="menu" aria-label="Conta de ${esc(me.nome)}" title="Conta">${esc(iniNome(me.nome))}</button>`;
    const foot = '';
    const tabs = items.map((i) => ({ id: i.id, label: i.id === 'novo' ? 'Novo' : i.id === 'plano' ? 'Plano' : 'Eventos', icon: i.icon, href: i.href }));
    return A.layout({ brand: 'albora', mark: 'a', ctx, groups: [{ items }], active, foot, top, tabs, navLabel: 'Conta' }, content);
  }
  A.acts['hcr-conta'] = (el) => A.menu(el, [{ head: ME().email }, { label: 'Todos os eventos', icon: 'list', href: '#/h' }, { label: 'Plano e cobrança', icon: 'wallet', href: '#/h/plano' }, { label: 'Ajuda', icon: 'help', href: '#/h/ajuda' }, { label: 'Tema: ' + ({ light: 'claro', dark: 'escuro', system: 'sistema' }[A.sim().theme]), icon: 'moon', onClick: () => A.setSim('theme', { light: 'dark', dark: 'system', system: 'light' }[A.sim().theme]) }, { sep: 1 }, { label: 'Sair', icon: 'logout', danger: 1, onClick: () => A.signOut() }]);
  A.acts['hcr-sair'] = async () => { await A.signOut(); if (/^#\/h\/entrar/.test(location.hash)) { S.set('hostAuth', false); authStep = 'form'; } };

  /* =========================================================
     /h — lista de eventos
  ========================================================= */
  const lf = () => Object.assign({ q: '', f: 'todos', o: 'proximos' }, S.get('crLista', {}));
  const setLf = (p) => S.set('crLista', Object.assign(lf(), p));

  function listaDados() {
    const f = lf(), all = A.data.events.map((e, i) => ({ e, i, w: A.when(e.id) }));
    const counts = { todos: all.length, antes: 0, durante: 0, depois: 0 }; all.forEach((x) => counts[x.w.phase]++);
    const q = norm(f.q); let arr = all.filter((x) => !q || norm(x.e.nome + ' ' + (x.e.local || '') + ' ' + tipoObj(x.e.tipo).nome).includes(q));
    if (f.f !== 'todos') arr = arr.filter((x) => x.w.phase === f.f);
    const key = (x) => (x.w.semData ? 50000 : x.w.days === 0 ? -1 : x.w.days > 0 ? x.w.days : 100000 - x.w.days);
    arr.sort(f.o === 'nome' ? (a, b) => a.e.nome.localeCompare(b.e.nome, 'pt-BR') : f.o === 'recentes' ? (a, b) => b.i - a.i : (a, b) => key(a) - key(b));
    return { arr, counts, f };
  }
  const linhaEvento = ({ e, w }) => {
    const thumb = e.capa ? `<img src="${esc(e.capa)}" alt="">` : `<span class="monogram">${esc(e.iniciais)}</span>`;
    const pill = w.semData ? '<span class="hcr-ev-pill">Data a definir</span>' : w.phase === 'antes' ? `<span class="hcr-ev-pill">em ${w.days} ${w.days === 1 ? 'dia' : 'dias'}</span>` : w.phase === 'durante' ? '<span class="hcr-ev-pill live">Ao vivo agora</span>' : `<span class="hcr-ev-pill">${esc(w.label)}</span>`;
    return `<a class="hcr-ev" href="${A.hostBase(e.id)}/hoje" style="${A.theme.scope(e.cor, 'papel')}"><span class="hcr-thumb" aria-hidden="true">${thumb}${pill}</span><span class="hcr-ev-b"><b class="hcr-ev-n">${esc(e.nome)}</b><span class="t-small">${esc(tipoObj(e.tipo).nome)} · ${esc(w.date)}</span>${e.local ? `<span class="t-small hcr-ev-l">${esc(e.local)}</span>` : ''}<span class="hcr-ev-p">Plano ${esc(plano(e.plano).nome)}${w.phase === 'durante' ? ' · abrir ao vivo' : ''}</span></span></a>`;
  };
  function listaHtml() {
    const { arr, counts, f } = listaDados();
    const chips = [['todos', 'Todos'], ['antes', 'Preparando'], ['durante', 'Ao vivo'], ['depois', 'Encerrados']].map(([v, l]) => `<button data-act="hcr-f" data-v="${v}" aria-pressed="${f.f === v}">${l}<span class="n">${counts[v]}</span></button>`).join('');
    const FN = { antes: 'em preparação', durante: 'ao vivo agora', depois: 'encerrado' };
    const vazioT = f.q.trim() ? `Nenhum evento para “${f.q.trim().slice(0, 40)}”` : `Nenhum evento ${FN[f.f] || ''}`.trim();
    const lista = arr.length ? `<div class="hcr-evs">${arr.map(linhaEvento).join('')}</div>` : A.emptyState({ icon: 'search', title: vazioT, body: f.q.trim() ? 'Confira a escrita do nome, do tipo ou do local. Seus eventos continuam todos aqui.' : 'Seus outros eventos estão em outra fase. Limpe o filtro para vê-los.', cta: '<button class="btn btn-line" data-act="hcr-limpar">Limpar busca e filtros</button>' });
    return { chips, lista, n: `${arr.length} ${arr.length === 1 ? 'evento' : 'eventos'}` };
  }
  function refreshLista() { const h = listaHtml(); const c = $('#hcr-chips'), l = $('#hcr-list'), n = $('#hcr-n'); if (c) c.innerHTML = h.chips; if (l) l.innerHTML = h.lista; if (n) n.textContent = h.n; }
  A.inputs['hcr-q'] = (el) => { setLf({ q: el.value }); refreshLista(); };
  A.inputs['hcr-o'] = (el) => { setLf({ o: el.value }); refreshLista(); };
  A.acts['hcr-f'] = (el, e, ds) => { setLf({ f: ds.v }); refreshLista(); };
  A.acts['hcr-limpar'] = () => { S.set('crLista', {}); A.render(); };
  A.acts['hcr-vendor'] = () => { const m = A._map.find((x) => /fornecedor/i.test(x.group + ' ' + x.label)); if (m) A.go(m.href); else A.toast('O portal do fornecedor fica em outra área do protótipo e ainda não está ligado a este botão.'); };
  A.acts['hcr-descartar'] = () => A.confirm({ title: 'Descartar o rascunho?', body: 'O que você preencheu para o novo evento será apagado. Isso não dá para desfazer.', confirm: 'Descartar rascunho', danger: true }).then((ok) => { if (ok) { S.set('crRascunho', null); A.toast('Rascunho descartado.'); A.render(); } });

  A.route('/h', (ctx) => {
    const g = guard(ctx); if (g) return g; sync(); clearTimer();
    const ok = A.sim().state === 'ok' && A.data.events.length;
    const rasc = temRasc(), me = ME();
    const banner = rasc ? `<div class="hcr-resume"><span>${A.icon('edit', 20)}</span><div class="grow"><b>Você começou um evento${rasc.nome ? ': ' + esc(rasc.nome) : ''}.</b> <span class="t-small">Passo ${Math.min(rasc.passo || 1, NSTEP)} de ${NSTEP} · salvo neste navegador.</span></div><div class="flex flex-wrap"><a class="btn btn-line btn-sm" href="#/h/novo/${Math.min(rasc.passo || 1, NSTEP)}">Continuar de onde parei</a><button class="btn btn-quiet btn-sm" data-act="hcr-descartar">Descartar</button></div></div>` : '';
    const empty = A.emptyState({ title: 'Bem-vindo ao Albora', body: 'Em poucos passos sua festa tem link, QR e um telão. Seus convidados tiram as fotos sem criar conta.', cta: '<a class="btn btn-primary btn-lg" href="#/h/novo/1">Criar meu primeiro evento</a>', art: 'mascote' });
    const sk = `<div aria-busy="true" aria-label="Carregando seus eventos">${'<div class="skeleton hcr-sk-bar"></div>'.repeat(3)}${'<div class="skeleton hcr-sk-bar m"></div>'.repeat(2)}${[1, 2, 3].map(() => '<div class="hcr-sk"><div class="skeleton t"></div><div class="l"><div class="skeleton"></div><div class="skeleton"></div></div></div>').join('')}</div>`;
    const content = A.stateful({
      loading: sk, error: A.errorState({ title: 'Não deu para carregar seus eventos', body: 'Seus eventos continuam salvos. Confira a conexão e tente de novo.' }),
      isEmpty: () => !A.data.events.length, empty,
      ok: () => { const h = listaHtml(), f = lf(); return `<div class="hcr-tools"><label class="search">${A.icon('search', 18)}<span class="sr-only">Buscar evento</span><input type="search" value="${esc(f.q)}" placeholder="Buscar por nome, tipo ou local" data-input="hcr-q" autocomplete="off"></label><div class="field" style="flex-direction:row;align-items:center;gap:8px"><label for="hcr-ord" class="t-small">Ordenar</label><select id="hcr-ord" class="select" style="width:auto;min-width:160px" data-input="hcr-o">${[['proximos', 'Mais próximos primeiro'], ['recentes', 'Criados por último'], ['nome', 'Nome (A a Z)']].map(([v, l]) => `<option value="${v}" ${f.o === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div><div class="ds-fl" id="hcr-chips" role="group" aria-label="Filtrar por fase">${h.chips}</div><p class="t-small" id="hcr-n" role="status">${h.n}</p><div id="hcr-list">${h.lista}</div><div class="hcr-lkrow" style="margin-top:var(--space-8)"><p class="t-small">Cerimonialista ou espaço de festas?</p><button class="link hcr-lk" data-act="hcr-vendor">Crie o portal do fornecedor</button></div>`; },
    });
    const head = A.pageHead({ title: 'Seus eventos', lead: ok ? `Olá, ${esc(me.nome.split(' ')[0])}. Escolha uma festa para abrir o painel.` : '', actions: ok ? `<a class="btn btn-primary" href="#/h/novo/1">${A.icon('plus', 18)} Novo evento</a>` : '' });
    return { title: 'Seus eventos', html: acct('eventos', head + banner + content) };
  });

  /* =========================================================
     /h/entrar
  ========================================================= */
  let authStep = 'form', resendAt = 0, tick = null;
  const clearTimer = () => { if (tick) { clearInterval(tick); tick = null; } };
  const brandHtml = () => `<div class="hcr-brand">${A.logo(30)}</div>`;
  function authForm(err, next) {
    const msgs = { google: 'Não conseguimos entrar com o Google. Você pode ter fechado a janela, ou o Google não confirmou o seu e-mail. Tente de novo ou receba um link por e-mail.' };
    const eb = err ? `<div class="banner bad" role="alert">${A.icon('warn', 20)}<div>${esc(msgs[err] || 'Não foi possível entrar agora. Tente de novo ou receba um link por e-mail.')}</div></div>` : '';
    const ja = authed() ? `<div class="banner ok">${A.icon('check', 20)}<div class="grow">Você já está dentro como <b>${esc(ME().email)}</b>. <a href="${next || '#/h'}" class="link">Ir para seus eventos</a></div></div>` : '';
    return `<div class="stack stack-2"><h1 class="t-display">Entrar no painel</h1><p class="t-lead">Sem senha. Entre com o Google ou receba um link por e-mail.</p></div>${ja}${eb}
<button class="btn btn-line btn-lg btn-block" data-act="hcr-google">${A.icon('globe', 18)} Entrar com Google</button>
<div class="flex" aria-hidden="true"><hr class="hr grow"><span class="t-small">ou</span><hr class="hr grow"></div>
<form class="stack" data-submit="hcr-link" data-next="${esc(next)}" novalidate>${A.field({ name: 'email', label: 'Seu e-mail', type: 'email', value: S.get('crAuthEmail', ''), required: true, placeholder: 'nome@email.com', extra: 'autocomplete="email" inputmode="email"' })}<div id="hcr-auth-err" role="alert"></div><button class="btn btn-primary btn-lg btn-block" type="submit">Enviar link de acesso</button></form>
<p class="t-small">Primeira vez aqui? Basta usar o seu e-mail: a conta é criada quando você confirmar o link.</p>`;
  }
  function authSent(next) {
    const email = S.get('crAuthEmail', '');
    return `<div class="stack stack-2"><h1 class="t-display">Verifique seu e-mail</h1><p class="t-lead">Se existir uma conta para <b>${esc(email)}</b>, enviamos um link de acesso. Se for sua primeira vez, a conta é criada quando você confirmar. O link vale uma vez só e por pouco tempo.</p></div>
<div class="banner">${A.icon('info', 20)}<div>Neste protótipo nenhum e-mail é enviado de verdade. Use o botão abaixo para simular o clique no link.</div></div>
<a class="btn btn-primary btn-lg btn-block" href="#/h/entrar?m=ok${next ? '&next=' + encodeURIComponent(next.slice(1)) : ''}">Abrir o link do e-mail (simulado)</a>
<div class="flex flex-wrap"><button class="btn btn-line" id="hcr-resend" data-act="hcr-reenviar" disabled aria-disabled="true">Reenviar link</button><button class="btn btn-quiet" data-act="hcr-trocar">Trocar e-mail</button></div>
<p class="t-small"><a class="link" href="#/h/entrar?m=expirado">Simular um link vencido</a></p>`;
  }
  function authConfirm(m, next) {
    if (m === 'expirado') return `<div class="stack stack-2"><h1 class="t-display">Este link não vale mais</h1><p class="t-lead">Ele já foi usado ou venceu. Links de acesso funcionam uma vez só. Peça um novo: seu e-mail já está preenchido.</p></div><a class="btn btn-primary btn-lg btn-block" href="#/h/entrar" data-act="hcr-novolink">Pedir um novo link</a>`;
    return `<div class="stack stack-2"><h1 class="t-display">Confirmar acesso</h1><p class="t-lead">Você está entrando como <b>${esc(S.get('crAuthEmail', '') || ME().email)}</b>. Confirme para abrir o painel.</p></div><button class="btn btn-primary btn-lg btn-block" data-act="hcr-confirmar" data-next="${esc(next || '#/h')}">Entrar no painel</button><p class="t-small">Não foi você? Feche esta página. Nada acontece até você confirmar.</p>`;
  }
  A.route('/h/entrar', (ctx) => {
    A.applyEvent(null); clearTimer();
    const next = safeNext(ctx.q.next);
    const body = ctx.q.m ? authConfirm(ctx.q.m, next) : authStep === 'sent' ? authSent(next) : authForm(ctx.q.error, next);
    return { title: 'Entrar', html: `<main id="main" tabindex="-1" class="hcr-auth"><aside class="hcr-hero" aria-hidden="true"><div class="hcr-hero-g">${[0, 1, 2, 3, 4, 5].map((i) => `<span>${A.img('entrar-' + i, 'p', '')}</span>`).join('')}</div><p class="hcr-hero-t">Todas as fotos da festa, no mesmo clima.</p></aside><div class="hcr-auth-in">${brandHtml()}${body}</div></main>`, after: () => { if (authStep === 'sent' && !ctx.q.m) startTick(); else if (!ctx.q.m && authStep === 'form') { const i = $('input[name=email]'); if (i && matchMedia('(pointer:fine)').matches) A.later(40, () => i.focus()); } } };
  });
  function startTick() {
    const paint = () => { const b = $('#hcr-resend'); if (!b) return clearTimer(); const s = Math.ceil((resendAt - Date.now()) / 1000); if (s > 0) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.textContent = `Reenviar em ${s} s`; } else { b.disabled = false; b.removeAttribute('aria-disabled'); b.textContent = 'Reenviar link'; clearTimer(); } };
    if (!resendAt || resendAt < Date.now() - 600000) resendAt = Date.now() + 30000; clearTimer(); paint(); tick = setInterval(paint, 500);
  }
  A.acts['hcr-link'] = (form, e, ds) => {
    const v = A.validate(form, { email: A.rules.email }); if (!v) return; S.set('crAuthEmail', v.email);
    A.busy($('button[type=submit]', form), 800, () => {
      if (A.sim().state === 'error') { $('#hcr-auth-err').innerHTML = `<div class="banner bad">${A.icon('warn', 20)}<div>Não conseguimos enviar o link agora. Seu e-mail continua preenchido: tente de novo em instantes. <span class="t-small">(Protótipo: erro simulado pelo estado “Erro” da barra Protótipo.)</span></div></div>`; return; }
      authStep = 'sent'; resendAt = Date.now() + 30000; A.render();
    });
  };
  A.acts['hcr-reenviar'] = () => { resendAt = Date.now() + 30000; A.toast('Enviamos outro link (simulado).'); startTick(); };
  A.acts['hcr-trocar'] = () => { authStep = 'form'; clearTimer(); A.render(); };
  A.acts['hcr-novolink'] = () => { authStep = 'form'; goto('#/h/entrar'); };
  A.acts['hcr-confirmar'] = (el, e, ds) => A.busy(el, 700, () => { S.set('hostAuth', true); authStep = 'form'; A.toast('Acesso confirmado.'); A.go(ds.next || '#/h'); });
  A.acts['hcr-google'] = () => {
    const q = new URLSearchParams((location.hash.split('?')[1]) || ''), next = safeNext(q.get('next'));
    A.modal({ title: 'Entrar com Google (simulado)', body: '<p>Na versão real, você vai até o Google, escolhe a conta e volta para cá já dentro do painel. Aqui, escolha o que simular.</p>', actions: [{ label: 'Simular uma falha', variant: 'btn-quiet', onClick: () => { A.go('#/h/entrar?error=google'); } }, { label: 'Continuar como ' + ME().nome, variant: 'btn-primary', onClick: () => { S.set('hostAuth', true); A.toast('Você entrou com o Google (simulado).'); A.go(next || '#/h'); } }] });
  };

  /* =========================================================
     /h/novo/:step — assistente de 3 passos
  ========================================================= */
  const NSTEP = 3;
  const STEP_NAMES = ['Nome e tipo', 'Visual', 'Quando e onde'];
  const STEP_H = ['Que festa vai ser?', 'Com a cara da festa', 'Quando e onde?'];
  const STEP_L = ['Dê um nome e escolha o tipo. A prévia do convite se monta enquanto você escreve.', 'Capa, estilo e cores. Dá para trocar depois, e o link e o QR continuam os mesmos.', 'Ainda não sabe? Deixe em branco: a festa fica como “a definir” e o convite já funciona.'];
  let showErr = false, pvTab = 'convidado', cepTok = 0;
  const curStep = () => (location.hash.match(/#\/h\/novo\/(\d|pronto)/) || [])[1];

  A.route('/h/novo', () => redirect('#/h/novo/' + Math.min((S.get('crRascunho', null) || {}).passo || 1, NSTEP)));
  A.route('/h/novo/:step', (ctx) => {
    const g = guard(ctx); if (g) return g; sync(); clearTimer();
    if (ctx.params.step === 'pronto') { lastStep = 0; return pronto(ctx); }
    if (['2', '3'].includes(ctx.params.step)) return redirect('#/h/novo/1');
    return wizard(1);
  });

  let lastStep = 0;
  function wizard(step) {
    A.applyEvent(null); lastStep = 1;
    const d = getD(), er = showErr ? validar(d) : {};
    const resume = temRasc() ? `<div class="hcr-resume"><div class="grow"><b>Rascunho restaurado.</b> <span class="t-small">Continue de onde parou.</span></div><button class="btn btn-quiet btn-sm" data-act="hcr-zero">Começar do zero</button></div>` : '';
    const sec = (n, t, inner) => `<section class="hcr-card" id="hcr-s${n}" aria-labelledby="hcr-sh${n}"><header class="hcr-card-h"><span class="hcr-n" aria-hidden="true">${n}</span><h2 class="t-title" id="hcr-sh${n}">${t}</h2></header>${inner}</section>`;
    const body = `<form id="hcr-form" class="stack stack-6" data-submit="hcr-criar-form" novalidate>${sec(1, 'Nome e tipo', sNome(d, er))}${sec(2, 'Visual', sVisual(d, er))}${sec(3, 'Quando e onde', sQuando(d, er))}${sRevisar(d, er)}</form>`;
    const foot = `<div class="hcr-foot"><button class="btn btn-quiet" data-act="hcr-sair-wiz">Sair</button><button class="btn btn-primary btn-lg" data-act="hcr-criar">Criar evento ${A.icon('arrow', 18)}</button></div>`;
    const html = `<div class="hcr-wiz"><header class="hcr-wtop"><a href="#/h" class="hcr-brand" aria-label="Albora, voltar para seus eventos">${A.logo(26)}</a><span class="grow"></span><span class="t-small" id="hcr-saved" role="status">${d.atualizado ? 'Rascunho salvo neste navegador.' : 'Salvamos o rascunho enquanto você escreve.'}</span></header><main id="main" tabindex="-1" class="page wide hcr-compact">${resume}<div class="hcr-stage"><div class="hcr-col"><div class="stack stack-2"><h1 class="t-display">Nova festa</h1><p class="t-lead" style="max-width:46ch">Tudo numa página só. A prévia do convite se monta enquanto você escreve, e dá para trocar depois.</p></div>${body}${foot}</div><aside class="hcr-pvside" aria-label="Prévia ao vivo"><div id="hcr-prev">${previewHtml(d)}</div></aside></div></main></div>`;
    return { title: 'Nova festa', html, after: () => { const wasErr = showErr; showErr = false; if (matchMedia('(pointer:fine)').matches) A.later(40, () => { const bad = $('.field.has-error input,.field.has-error select'); (bad || $('#hcr-form input:not([disabled])'))?.focus(); }); else if (wasErr) { const bad = $('.field.has-error'); bad && bad.scrollIntoView({ block: 'center' }); } } };
  }

  const E = (er, k) => er[k] || '';
  const radioOpt = (act, id, on, i, nm, sub, extra = '') => `<button type="button" role="radio" class="hcr-opt" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-act="${act}" data-id="${id}"><span class="grow"><span class="nm" ${extra}>${esc(nm)}</span><span class="t-small">${esc(sub)}</span></span><span class="kbd hcr-hide-m" aria-hidden="true">${i + 1}</span><span class="ck">${on ? A.icon('check', 18) : ''}</span></button>`;
  function sNome(d, er) {
    const t = tipoObj(d.tipo), P = PACK[d.tipo] || PACK.outro;
    const nm = A.field({ name: 'nome', label: 'Nome da festa', value: d.nome, required: true, placeholder: 'Ex.: ' + P.ex, err: E(er, 'nome'), extra: `maxlength="${MAXN}" autocomplete="off" data-input="hcr-in"` }).replace('class="input"', 'class="input input-sign"');
    const tps = A.data.tipos.map((x, i) => `<button type="button" role="radio" class="hcr-tp" aria-checked="${x.id === d.tipo}" tabindex="${x.id === d.tipo ? 0 : -1}" data-act="hcr-tipo" data-id="${x.id}">${A.icon(x.icone, 18)}<span class="grow">${esc(x.nome)}</span><span class="kbd hcr-hide-m" aria-hidden="true">${i + 1}</span></button>`).join('');
    return `<div class="stack stack-6"><div class="stack stack-2">${nm}<span class="t-small" id="hcr-count">${d.nome.length}/${MAXN}</span></div><section class="stack stack-3" aria-labelledby="hcr-tpl"><h2 class="t-h" id="hcr-tpl">Tipo de festa</h2><div role="radiogroup" aria-labelledby="hcr-tpl" class="hcr-tps">${tps}</div><div class="hcr-lkrow"><p class="t-small" id="hcr-tpd">${esc(t.texto)} Já vêm prontos <b>${missoesAtivas(d).length} missões</b> e <b>${momD(d).length} momentos</b>.</p><button type="button" class="link hcr-lk" data-act="hcr-missoes">Ajustar</button></div></section></div>`;
  }
  function sVisual(d) {
    const estilos = A.data.estilos.map((x, i) => radioOpt('hcr-estilo', x.id, x.id === d.estilo, i, x.nome, x.desc, `style="font-family:${FONT[x.id]}"`)).join('');
    const combos = A.data.combos.map(([n, a, b], i) => `<button type="button" role="radio" class="hcr-combo" aria-checked="${d.combo === String(i)}" tabindex="${d.combo === String(i) ? 0 : -1}" data-act="hcr-combo" data-i="${i}"><span class="hcr-dots"><i style="background:${a}"></i><i style="background:${b}"></i></span><span>${esc(n)}</span></button>`).join('')
      + (d.corFoto ? `<button type="button" role="radio" class="hcr-combo" aria-checked="${d.combo === 'foto'}" tabindex="${d.combo === 'foto' ? 0 : -1}" data-act="hcr-combo" data-i="foto"><span class="hcr-dots"><i style="background:${d.corFoto}"></i></span><span>Cor da sua foto</span></button>` : '')
      + `<button type="button" role="radio" class="hcr-combo" aria-checked="${d.combo === 'custom'}" tabindex="${d.combo === 'custom' ? 0 : -1}" data-act="hcr-combo" data-i="custom"><span class="hcr-dots">${A.icon('edit', 18)}</span><span>Personalizada</span></button>`;
    const pers = d.combo === 'custom' ? `<div class="grid g2 keep"><label class="field"><span class="lbl">Principal</span><input type="color" class="input" name="cor" value="${esc(hexOk(d.cor) || '')}" data-input="hcr-cor" aria-label="Cor principal" style="padding:2px;height:48px"></label><label class="field"><span class="lbl">Detalhe</span><input type="color" class="input" name="cor2" value="${esc(hexOk(d.cor2) || '')}" data-input="hcr-cor" aria-label="Cor de detalhe" style="padding:2px;height:48px"></label></div>` : '';
    const foco = d.capa ? `<div class="chips" role="group" aria-label="Enquadramento da capa">${[['0', 'Topo'], ['50', 'Centro'], ['100', 'Base']].map(([v, l]) => `<button type="button" class="chip" aria-pressed="${String(d.foco) === v}" data-act="hcr-foco" data-v="${v}">${l}</button>`).join('')}</div>` : '';
    return `<div class="stack stack-6">
<section class="stack stack-2" aria-labelledby="hcr-cl"><h2 class="t-h" id="hcr-cl">Par de cores</h2><div role="radiogroup" aria-labelledby="hcr-cl" class="hcr-combos">${combos}</div>${pers}<div class="hcr-selo" id="hcr-selo" role="status" aria-live="polite">${seloHtml(d)}</div></section>
<section class="stack stack-2" aria-labelledby="hcr-el"><h2 class="t-h" id="hcr-el">Estilo</h2><div role="radiogroup" aria-labelledby="hcr-el" class="hcr-opts hcr-g2">${estilos}</div></section>
<section class="stack stack-3" aria-labelledby="hcr-cap"><h2 class="t-h" id="hcr-cap">Capa do convite <span class="t-small hcr-dim">(opcional)</span></h2><div class="flex flex-wrap"><input id="hcr-capa-in" class="sr-only hcr-capa-in" type="file" accept="image/jpeg,image/png,image/webp" data-change="hcr-capa"><label class="btn btn-line" for="hcr-capa-in">${A.icon('upload', 18)} ${d.capa ? 'Trocar foto' : 'Escolher foto'}</label>${d.capa ? '<button type="button" class="btn btn-quiet" data-act="hcr-capa-del">Remover</button>' : ''}</div><p class="t-small">JPG, PNG ou WebP até 10 MB. A localização da foto (GPS) é removida. Sem foto, a capa usa o monograma da festa.</p><p class="t-small crit" id="hcr-capa-err" role="alert"></p>${foco}</section></div>`;
  }
  function sQuando(d, er) {
    const semHora = !d.data, abre = d.cep || d.esperados !== '' || er.esperados ? 'open' : '';
    return `<div class="stack stack-5"><div class="grid g2 keep">${A.field({ name: 'data', label: 'Data', type: 'date', value: d.data, err: E(er, 'data'), hint: 'Ainda não definiu? Deixe em branco.', extra: `min="${AMANHA_ISO}" data-input="hcr-in"` })}${A.field({ name: 'hora', label: 'Hora', type: 'time', value: d.hora, hint: semHora ? 'Disponível depois de escolher a data.' : 'Sem hora, usamos 18:00 (Brasília).', extra: `data-input="hcr-in" ${semHora ? 'disabled' : ''}` })}</div>${A.field({ name: 'local', label: 'Local', value: d.local, placeholder: 'Nome do espaço e cidade', hint: 'Em branco, aparece como “local a definir”.', extra: 'maxlength="80" autocomplete="off" data-input="hcr-in"' })}
<details class="hcr-more ds-fold" ${abre}><summary>Buscar pelo CEP e estimar convidados</summary><div class="stack stack-5 hcr-more-in ds-fold-b"><div class="stack stack-2">${A.field({ name: 'cep', label: 'CEP do local', value: d.cep, placeholder: '00000-000', hint: 'Busca simulada: tente 30130-010 ou 01310-100.', extra: 'inputmode="numeric" maxlength="9" autocomplete="off" data-input="hcr-in"' })}<span class="t-small" id="hcr-cep" role="status"></span></div>${A.field({ name: 'esperados', label: 'Convidados esperados', type: 'number', value: d.esperados, hint: 'Uma estimativa serve. De 1 a 999.', err: E(er, 'esperados'), extra: 'min="1" max="999" inputmode="numeric" data-input="hcr-in"' })}</div></details></div>`;
  }
  function sRevisar(d, er) {
    const V = vendors(), sob = d.sob !== 'conta';
    const aberto = sob || er.emailPainel ? 'open' : '';
    return `<details class="hcr-more ds-fold" ${aberto}><summary>Criar para outra pessoa (cerimonialista)</summary><div class="stack stack-5 hcr-more-in ds-fold-b"><div class="stack stack-3">${A.field({ name: 'sob', label: 'Criar sob', value: d.sob, options: [['conta', 'Minha conta']].concat(V.map((v) => [v.id, v.nome])), hint: 'Escolha um fornecedor se a festa é de um cliente dele.', extra: 'data-input="hcr-in"' })}${sob ? A.field({ name: 'emailPainel', label: 'E-mail de quem recebe o painel', type: 'email', value: d.emailPainel, required: true, err: E(er, 'emailPainel'), hint: 'Quem cria aqui entra como cerimonialista. O cliente recebe o acesso por esse e-mail.', extra: 'autocomplete="off" data-input="hcr-in"' }) : ''}</div></div></details><div id="hcr-criar-err" role="alert"></div>`;
  }

  function previewHtml(d) {
    const e = d.estilo;
    const exemplo = !d.nome.trim(), nome = exemplo ? (PACK[d.tipo] || PACK.outro).ex : d.nome.trim(), data = d.data ? fmtISO(d.data, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Data a definir';
    const mono = iniciais(nome, d.tipo);
    const cover = d.capa ? `<img src="${esc(d.capa)}" alt="Capa escolhida" style="object-position:50% ${+d.foco || 50}%">` : `<div class="hcr-mono" role="img" aria-label="Monograma da festa: ${esc(mono)}"><span class="monogram">${esc(mono)}</span></div>`;
    const vars = prevVars(d.cor, d.cor2, e);
    const tabs = [['convidado', 'Convidado'], ['telao', 'Telão'], ['album', 'Álbum']];
    const tl = `<div class="tabs" role="tablist" aria-label="Prévia">${tabs.map(([k, l]) => `<button type="button" class="tab" role="tab" id="hcr-t-${k}" aria-selected="${pvTab === k}" aria-controls="hcr-p-${k}" data-act="hcr-ptab" data-t="${k}">${l}</button>`).join('')}</div>`;
    const g = `<div class="hcr-pv" data-theme="noite"><div class="hcr-cover">${cover}</div><div class="hcr-pv-body"><span class="t-small">Você foi convidado para</span><div class="hcr-pv-t">${esc(nome)}</div><p class="t-small">${esc(data)} · ${esc(d.local || 'Local a definir')}</p><div class="btn btn-accent btn-block" style="margin-top:8px">Entrar na festa</div></div></div>`;
    const w = `<div class="hcr-pv hcr-wallpv" data-theme="noite"><div class="flex between"><span class="hcr-pv-t" style="font-size:var(--fs-md)">${esc(nome)}</span><span class="t-small">Ao vivo</span></div><div class="row">${[1, 2, 3].map((n) => `<div class="hcr-pol">${A.img('w' + n + d.tipo, 'p', 'Foto de exemplo (ilustração)')}</div>`).join('')}</div></div>`;
    const al = `<div class="hcr-pv"><div class="hcr-pv-body"><div class="hcr-pv-t">${esc(nome)}</div><p class="t-small">${esc(data)}</p></div><div class="hcr-albm">${['a', 'b', 'c', 'd', 'e'].map((n, i) => A.img(n + d.tipo, ['p', 'l', 's', 'p', 'l'][i], 'Foto de exemplo (ilustração)')).join('')}</div></div>`;
    return `<div style="${vars}">${tl}<div style="margin-top:12px"><div role="tabpanel" id="hcr-p-convidado" aria-labelledby="hcr-t-convidado" ${pvTab === 'convidado' ? '' : 'hidden'} inert>${g}</div><div role="tabpanel" id="hcr-p-telao" aria-labelledby="hcr-t-telao" ${pvTab === 'telao' ? '' : 'hidden'} inert>${w}</div><div role="tabpanel" id="hcr-p-album" aria-labelledby="hcr-t-album" ${pvTab === 'album' ? '' : 'hidden'} inert>${al}</div></div><p class="t-small" style="margin-top:8px">${exemplo ? 'Exemplo: escreva o nome da sua festa e ele aparece aqui. ' : ''}As fotos são ilustrativas e o telão nunca corta foto vertical.</p></div>`;
  }
  const paintPreview = () => { const el = $('#hcr-prev'); if (el) el.innerHTML = previewHtml(getD()); };
  A.acts['hcr-ptab'] = (el, e, ds) => { pvTab = ds.t; paintPreview(); const t = $('#hcr-t-' + pvTab); if (t) t.focus(); };

  /* entradas do assistente */
  A.inputs['hcr-in'] = (el) => {
    const d = getD(), k = el.name; let v = el.value;
    if (k === 'cep') { const dg = v.replace(/\D/g, '').slice(0, 8); el.value = dg.length > 5 ? dg.slice(0, 5) + '-' + dg.slice(5) : dg; d.cep = el.value; putD(d); buscaCep(dg); return; }
    d[k] = v; putD(d);
    if (k === 'data') { const h = $('[name=hora]'); if (h) { h.disabled = !v; const ht = $('#' + (h.getAttribute('aria-describedby') || '').split(' ')[0]); if (ht) ht.textContent = v ? 'Sem hora, usamos 18:00 (Brasília).' : 'Disponível depois de escolher a data.'; } }
    if (k === 'nome') { const c = $('#hcr-count'); if (c) c.textContent = v.length + '/' + MAXN; }
    if (k === 'sob') { rerender('[name=sob]'); return; }
    paintPreview();
  };
  function buscaCep(dg) {
    const tok = ++cepTok, st = $('#hcr-cep'); if (!st) return;
    if (dg.length < 8) { st.textContent = ''; return; }
    st.textContent = 'Buscando endereço…';
    A.later(650, () => {
      if (tok !== cepTok) return; const s = $('#hcr-cep'); if (!s) return;
      if (A.sim().state === 'error') { s.textContent = 'A busca de CEP está fora do ar. Digite o local à mão.'; return; }
      const end = CEPS[dg];
      if (!end) { s.textContent = 'Não achamos esse CEP. Confira os números ou digite o local à mão.'; return; }
      const d = getD(), li = $('[name=local]');
      if (!d.local || d.local === d.localAuto) { d.local = end; d.localAuto = end; if (li) li.value = end; putD(d); paintPreview(); s.textContent = 'Endereço preenchido. Complete com o nome do espaço.'; } else s.textContent = 'Achamos: ' + end + '. Seu texto de local foi mantido.';
    });
  }
  A.acts['hcr-tipo'] = (el, e, ds) => {
    const d = getD();
    if (d.tipo !== ds.id) { const custom = d.momentos || d.missoesOff.length; d.tipo = ds.id; d.momentos = null; d.missoesOff = []; putD(d); if (custom) A.toast('Momentos e missões voltaram ao padrão deste tipo.'); }
    rerender('[data-act=hcr-tipo][aria-checked=true]');
  };
  A.acts['hcr-estilo'] = (el, e, ds) => { const d = getD(); d.estilo = ds.id; putD(d); rerender('[data-act=hcr-estilo][aria-checked=true]'); };
  A.acts['hcr-combo'] = (el, e, ds) => {
    const d = getD(), i = ds.i;
    if (i === 'custom') { d.combo = 'custom'; } else if (i === 'foto') { d.combo = 'foto'; d.cor = d.corFoto; d.cor2 = d.corFoto; } else { const c = A.data.combos[+i]; d.combo = String(i); d.cor = c[1]; d.cor2 = c[2]; }
    putD(d); rerender('[data-act=hcr-combo][aria-checked=true]');
  };
  A.inputs['hcr-cor'] = (el) => {
    const d = getD(); d[el.name] = el.value; d.combo = 'custom'; putD(d); paintPreview();
    const s = $('#hcr-selo'); if (s) s.innerHTML = seloHtml(d);
  };
  A.acts['hcr-foco'] = (el, e, ds) => { const d = getD(); d.foco = ds.v; putD(d); $$('[data-act=hcr-foco]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === ds.v)); paintPreview(); };
  A.inputs['hcr-capa'] = async (el) => {
    const f = el.files && el.files[0]; const er = $('#hcr-capa-err'); if (!f) return; if (er) er.textContent = '';
    try { const r = await lerImagem(f); const d = getD(); d.capa = r.url; d.corFoto = r.cor || ''; putD(d); A.toast('Capa adicionada.'); rerender('label[for=hcr-capa-in]'); }
    catch (m) { if (er) er.textContent = String(m); el.value = ''; }
  };
  A.acts['hcr-capa-del'] = () => { const d = getD(), old = { capa: d.capa, corFoto: d.corFoto, combo: d.combo }; d.capa = ''; d.corFoto = ''; if (d.combo === 'foto') { d.combo = '0'; d.cor = A.data.combos[0][1]; d.cor2 = A.data.combos[0][2]; } putD(d); A.render(); A.toast('Capa removida.', { undo: () => { const x = getD(); Object.assign(x, old); putD(x); A.render(); } }); };

  /* missões (folha, sem virar passo) */
  function paintMis() {
    const box = $('#hcr-mis'); if (!box) return; const d = getD(), P = PACK[d.tipo] || PACK.outro;
    const momChips = momD(d).map((m, i) => `<span class="chip">${esc(m)}<button type="button" class="hcr-x" data-act="hcr-mom-del" data-i="${i}" aria-label="Remover momento ${esc(m)}">${A.icon('x', 14)}</button></span>`).join('');
    box.innerHTML = `<h3 class="t-h">Missões</h3><p class="t-small" style="margin-bottom:8px">Tudo vem ligado. Desligue o que não combina com a sua festa ou crie a sua própria missão. Dá para mudar depois, no painel.</p><div class="list hcr-mis">${P.missoes.map((m, i) => `<div class="li"><span class="grow" id="hm${i}">${esc(m)}</span><button type="button" class="switch" role="switch" aria-checked="${!d.missoesOff.includes(i)}" aria-labelledby="hm${i}" data-act="hcr-mis-tg" data-i="${i}"></button></div>`).join('')}${d.proprias.map((m, i) => `<div class="li"><span class="grow">${esc(m)} <span class="t-small">(sua)</span></span><button type="button" class="btn btn-quiet btn-sm btn-icon" data-act="hcr-mis-del" data-i="${i}" aria-label="Remover missão ${esc(m)}">${A.icon('trash', 16)}</button></div>`).join('')}</div><div class="flex" style="margin-top:12px"><input class="input grow" id="hcr-mis-in" maxlength="60" aria-label="Nova missão" placeholder="Criar missão própria" autocomplete="off"><button type="button" class="btn btn-line btn-sm" data-act="hcr-mis-add">Adicionar</button></div><p class="t-small crit" id="hcr-mis-err" role="alert"></p>
<h3 class="t-h" style="margin-top:var(--space-6)">Momentos da festa</h3><p class="t-small" style="margin-bottom:8px">Organizam o álbum. Tire, troque ou crie os seus.</p><div class="chips" id="hcr-moms">${momChips}</div><div class="flex" style="margin-top:12px"><input class="input grow" id="hcr-mom-in" maxlength="30" aria-label="Novo momento" placeholder="Novo momento" autocomplete="off"><button type="button" class="btn btn-line btn-sm" data-act="hcr-mom-add">Adicionar</button></div><p class="t-small crit" id="hcr-mom-err" role="alert"></p>`;
  }
  A.acts['hcr-missoes'] = () => { const api = A.sheet({ title: 'Missões e momentos', label: 'Ajustar missões e momentos', body: '<div id="hcr-mis"></div>', actions: [{ label: 'Pronto', variant: 'btn-primary' }] }); paintMis(); api.onClose = () => A.render(); };
  A.acts['hcr-mom-add'] = () => {
    const inp = $('#hcr-mom-in'), er = $('#hcr-mom-err'); if (!inp) return; const v = inp.value.trim(), d = getD(), l = momD(d).slice();
    if (!v) { er.textContent = 'Escreva o nome do momento antes de adicionar.'; inp.focus(); return; }
    if (l.some((x) => norm(x) === norm(v))) { er.textContent = 'Esse momento já está na lista.'; inp.focus(); return; }
    if (l.length >= 12) { er.textContent = 'O limite é de 12 momentos. Tire algum para adicionar outro.'; return; }
    d.momentos = l.concat(v); putD(d); paintMis(); $('#hcr-mom-in')?.focus();
  };
  A.acts['hcr-mom-del'] = (el, e, ds) => {
    const d = getD(), l = momD(d).slice(), i = +ds.i, [m] = l.splice(i, 1); d.momentos = l; putD(d); paintMis();
    A.toast(`Momento “${m}” removido.`, { undo: () => { const x = getD(), y = momD(x).slice(); y.splice(i, 0, m); x.momentos = y; putD(x); if ($('#hcr-mis')) paintMis(); else A.render(); } });
  };
  A.acts['hcr-mis-tg'] = (el, e, ds) => { const d = getD(), i = +ds.i; d.missoesOff = d.missoesOff.includes(i) ? d.missoesOff.filter((x) => x !== i) : d.missoesOff.concat(i); putD(d); paintMis(); $(`[data-act=hcr-mis-tg][data-i="${i}"]`)?.focus(); };
  A.acts['hcr-mis-add'] = () => {
    const inp = $('#hcr-mis-in'), er = $('#hcr-mis-err'); if (!inp) return; const v = inp.value.trim(), d = getD();
    if (!v) { er.textContent = 'Escreva a missão antes de adicionar. Ex.: “Quem dançou mais?”'; inp.focus(); return; }
    if (d.proprias.some((x) => norm(x) === norm(v))) { er.textContent = 'Você já criou essa missão.'; inp.focus(); return; }
    d.proprias = d.proprias.concat(v); putD(d); paintMis(); $('#hcr-mis-in')?.focus();
  };
  A.acts['hcr-mis-del'] = (el, e, ds) => { const d = getD(), i = +ds.i, [m] = d.proprias.splice(i, 1); putD(d); paintMis(); A.toast(`Missão “${m}” removida.`, { undo: () => { const x = getD(); x.proprias.splice(i, 0, m); putD(x); paintMis(); } }); };

  /* navegação do assistente */
  A.acts['hcr-zero'] = () => A.confirm({ title: 'Começar do zero?', body: 'O rascunho atual será apagado e você volta ao primeiro passo. Isso não dá para desfazer.', confirm: 'Apagar e recomeçar', danger: true }).then((ok) => { if (ok) { S.set('crRascunho', null); A.render(); } });
  A.acts['hcr-sair-wiz'] = () => { if (temRasc()) A.toast('Rascunho salvo. Você continua de onde parou quando voltar.'); A.go('#/h'); };
  A.acts['hcr-next'] = () => {
    const step = +curStep(), form = $('#hcr-form'); if (!form) return;
    const rules = step === 1 ? { nome: (v) => (v.length >= 2 ? '' : 'Dê um nome para a festa, com pelo menos 2 letras.') } : {};
    const v = A.validate(form, rules); if (!v) return;
    const d = getD(); d.passo = Math.max(d.passo || 1, step + 1); putD(d); A.go('#/h/novo/' + (step + 1));
  };
  A.acts['hcr-criar-form'] = () => { const b = $('[data-act=hcr-criar]'); if (b) A.acts['hcr-criar'](b); };
  A.acts['hcr-criar'] = (btn) => {
    const d = getD(), er = validar(d), ks = Object.keys(er);
    if (ks.length) { showErr = true; d.passo = NSTEP; putD(d); const msg = er[ks[0]]; A.toast(`Falta ajustar: ${msg}`, { kind: 'bad' }); A.render(); return; }
    const box = $('#hcr-criar-err'); box.innerHTML = '';
    A.busy(btn, 1100, () => {
      if (A.sim().state === 'error') { box.innerHTML = `<div class="banner bad">${A.icon('warn', 20)}<div class="grow"><b>Não deu para criar o evento agora.</b> O servidor não respondeu. Seus dados continuam salvos neste rascunho: tente de novo em instantes. <span class="t-small">(Protótipo: erro simulado pelo estado “Erro” da barra Protótipo.)</span></div></div>`; box.scrollIntoView({ block: 'center' }); return; }
      criar(d);
    });
  };
  function criar(d) {
    const base = slugify(d.nome) || 'festa', usados = new Set(A.data.events.map((e) => e.slug)); let slug = base, n = 2; while (usados.has(slug)) slug = base + '-' + n++;
    const id = 'x' + Date.now().toString(36), days = d.data ? Math.round((new Date(d.data + 'T12:00:00') - HOJE) / DAY) : 1;
    const ev = { id, slug, nome: d.nome.trim(), iniciais: iniciais(d.nome.trim(), d.tipo), cor: d.cor, cor2: d.cor2, tipo: d.tipo, local: d.local, esperados: d.esperados ? +d.esperados : 0, plano: 'gratis', estilo: estiloObj(d.estilo).nome, hora: d.hora || '18:00', dataIso: d.data || '', phaseFixed: days > 0 ? 'antes' : days === 0 ? 'durante' : 'depois', capa: d.capa, foco: d.foco, momentos: momD(d), missoes: missoesAtivas(d), vendorId: d.sob !== 'conta' ? d.sob : '', emailPainel: d.sob !== 'conta' ? d.emailPainel : '', criadoEm: HOJE_ISO };
    S.update('eventosExtras', (a) => a.concat([ev]), []); S.set('crRascunho', null); S.set('crUltimo', id); sync(); pvTab = 'convidado';
    A.go('#/h/novo/pronto?id=' + id);
  }

  /* teclado do assistente (Enter, Esc, Backspace, 1..N, setas nos grupos) */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key === 'Enter' && t.id === 'hcr-mis-in') { e.preventDefault(); A.acts['hcr-mis-add'](); return; }
    if (!/^#\/h\/novo\/[1-3]/.test(location.hash)) return;
    if (e.key === 'Enter' && t.id === 'hcr-mom-in') { e.preventDefault(); A.acts['hcr-mom-add'](); return; }
    if ($('.modal,.palette,.menu') || e.metaKey || e.ctrlKey || e.altKey) return;
    const inField = t.matches && t.matches('input,textarea,select,[contenteditable]');
    if (inField) { if (e.key === 'Escape') t.blur(); return; }
    if (/^[1-9]$/.test(e.key)) { const n = +e.key - 1; if (A.data.tipos[n]) A.acts['hcr-tipo'](null, null, { id: A.data.tipos[n].id }); return; }
    if (e.key === 'Enter') { if (t.closest && t.closest('a,button,label,summary')) return; e.preventDefault(); const b = $('[data-act=hcr-criar]'); b && A.acts['hcr-criar'](b); return; }
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); A.acts['hcr-sair-wiz'](); }
  });

  /* =========================================================
     /h/novo/pronto
  ========================================================= */
  function prontoItens(ev) {
    const nm = (ev.missoes && ev.missoes.length) || (ev._x ? 0 : A.data.missions.filter((m) => m.on).length), eq = ev._x ? 0 : A.data.team.length, b = A.hostBase(ev.id);
    return [
      { ok: true, t: 'Link e QR', d: 'Já funcionam. É só mandar.' },
    ].concat(ev._x && !(ev.dataIso && ev.local) ? [{ ok: false, t: ev.dataIso ? 'Local' : ev.local ? 'Data' : 'Data e local', d: 'Sem isso o convite mostra “a definir”. Dá para completar quando souber.', fix: `<a class="btn btn-line btn-sm" href="${b}/hoje?quando=1">Definir</a>` }] : []).concat([
      { ok: !!ev.capa, t: 'Capa do convite', d: ev.capa ? 'Foto escolhida.' : 'Sem foto: o convite usa uma ilustração.', fix: `<label class="btn btn-line btn-sm" for="hcr-capa-p">Adicionar foto</label>` },
      { ok: nm > 0, t: 'Missões', d: nm ? `${nm} ligadas.` : 'Nenhuma ligada ainda.', fix: `<a class="btn btn-line btn-sm" href="${b}/estilo">Escolher</a>` },
      { ok: false, t: 'Telão', d: 'Ainda não ligado. Escolha o modelo e conecte a TV.', fix: `<a class="btn btn-line btn-sm" href="${b}/compartilhar">Ligar</a>` },
      { ok: eq > 1, t: 'Equipe', d: eq > 1 ? `${eq} pessoas com acesso.` : 'Só você tem acesso. Chame o casal ou a cerimonialista.', fix: `<a class="btn btn-line btn-sm" href="${b}/ajustes/equipe">Convidar</a>` },
    ]);
  }
  let nuShown = '';
  function pronto(ctx) {
    const ev = A.data.events.find((e) => e.id === (ctx.q.id || S.get('crUltimo', ''))) || A.data.events[0]; A.applyEvent(ev);
    const url = 'albora.app/e/' + ev.slug, w = A.when(ev.id), b = A.hostBase(ev.id), it = prontoItens(ev), feitos = it.filter((x) => x.ok).length, comp = plano('completo');
    const msg = `Oi! Vem para ${ev.nome}. Tire fotos da festa e elas aparecem no telão, sem cadastro: é só abrir o link.\nhttps://${url}`;
    const checks = it.map((x) => `<div class="li hcr-pli"><span class="${x.ok ? 'pos' : 'muted'}">${A.icon(x.ok ? 'check' : 'clock', 20)}</span><span class="grow"><b class="t-h">${x.t}</b><span class="t-small" style="display:block">${x.d}</span></span>${x.ok ? '<span class="badge ok">Pronto</span>' : x.fix}</div>`).join('');
    const pl = ev.plano === 'completo' ? `<p class="t-small">${A.icon('check', 16)} Plano Completo ativo neste evento.</p>` : `<div class="flex between flex-wrap"><div class="grow hcr-plt"><b class="t-h">Plano ${esc(plano(ev.plano).nome)}</b><div class="t-small">${esc(plano(ev.plano).itens.join(' · '))}</div></div><div class="flex flex-wrap"><a class="btn btn-quiet btn-sm" href="#/h/plano?e=${ev.id}">Ver planos</a><button class="btn btn-line btn-sm" data-act="hcr-ativar" data-id="${ev.id}">Ativar Completo · ${A.brl(comp.preco)}</button></div></div>`;
    const nuQ = S.get('crNudge', {}), nu = (!nuQ[ev.id] || nuShown === ev.id) && ev.plano !== 'completo' && A.plan && A.plan.nudge ? A.plan.nudge('apos-criar') || '' : ''; if (nu) nuShown = ev.id; if (nu) S.update('crNudge', (m) => Object.assign({}, m, { [ev.id]: 1 }), {});
    const html = `<main id="main" tabindex="-1" class="page stack stack-6"><header class="hcr-hero-ok"><div class="hcr-seal"><span id="hcr-mascote">${A.mascot(150, 'mascote', 'Mascote do Albora espiando sobre o arco')}</span></div><div class="stack stack-2"><span class="t-small">${esc(w.date)}</span><h1 class="t-display">${esc(ev.nome)} está pronto.</h1></div></header>
<div class="hcr-ok"><section aria-labelledby="hcr-lk"><h2 class="sr-only" id="hcr-lk">Placa com o QR</h2><div class="hcr-placa"><span class="nm">${esc(ev.nome)}</span><div>${A.qrSvg(url, 200)}</div><span class="u">${esc(url)}</span><span class="t-small hcr-placa-s">Aponte a câmera e tire fotos da festa</span></div><p class="t-small" style="margin-top:8px">O QR é ilustrativo e não escaneia neste protótipo.</p><div class="flex flex-wrap" style="margin-top:var(--space-2)"><button class="btn btn-line btn-sm" data-act="hcr-placa" data-nome="${esc(ev.nome)}">${A.icon('download', 16)} Baixar placa com QR</button></div></section>
<section class="stack stack-4" aria-labelledby="hcr-wa"><h2 class="t-title" id="hcr-wa">Chame a turma</h2><p class="hcr-msg">${esc(msg)}</p><div class="flex flex-wrap"><button class="btn btn-primary btn-lg" data-act="wa">${A.icon('send', 18)} Mandar por WhatsApp</button></div><div class="flex flex-wrap"><span class="hcr-link grow" style="flex:1 1 200px" id="hcr-url">${esc(url)}</span><button class="btn btn-line btn-sm" data-act="copy" data-text="https://${esc(url)}">${A.icon('copy', 16)} Copiar link</button><button class="btn btn-quiet btn-sm" data-act="hcr-copymsg" data-text="${esc(msg)}">${A.icon('copy', 16)} Copiar mensagem</button></div><p class="t-small">O mesmo link serve para todos. Convidado não cria conta.</p>${nu ? `<div class="hcr-nudge">${nu}</div>` : ''}</section></div>
<section class="stack stack-3" aria-labelledby="hcr-pr"><div class="flex between"><h2 class="t-title" id="hcr-pr">O que falta</h2><span class="t-small" role="status">${feitos} de ${it.length} prontos</span></div><div class="list">${checks}</div><input id="hcr-capa-p" class="sr-only hcr-capa-in" type="file" accept="image/jpeg,image/png,image/webp" data-change="hcr-capa-p" data-id="${ev.id}"><p class="t-small crit" id="hcr-capa-perr" role="alert"></p></section>
<section class="stack stack-3" aria-labelledby="hcr-pl"><h2 class="t-h" id="hcr-pl">Plano</h2>${pl}</section>
<div class="flex flex-wrap"><a class="btn btn-line" href="${b}/hoje">Abrir o painel ${A.icon('arrow', 18)}</a><a class="btn btn-quiet" href="#/g/${esc(ev.slug)}">${A.icon('eye', 16)} Ver como convidado</a>${ev.vendorId ? '<button class="btn btn-quiet" data-act="hcr-vendor">Abrir portal do fornecedor</button>' : ''}<a class="btn btn-quiet" href="#/h">Todos os eventos</a></div></main>`;
    return { title: ev.nome + ' está pronto', html, after: () => { A.celebrate($('#hcr-mascote')); } };
  }
  A.acts['hcr-placa'] = (el, e, ds) => A.busy(el, 900, () => A.toast(`A placa de “${ds.nome}” (PDF A4 com o QR) seria baixada aqui. Simulado no protótipo.`));
  A.acts['hcr-copymsg'] = (el) => { (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.text || '') : Promise.reject()).catch(() => {}).finally(() => A.toast('Mensagem copiada.')); };
  A.inputs['hcr-capa-p'] = async (el) => {
    const f = el.files && el.files[0], er = $('#hcr-capa-perr'); if (!f) return; if (er) er.textContent = '';
    try { const r = await lerImagem(f); S.update('crCapas', (m) => Object.assign({}, m, { [el.dataset.id]: r.url }), {}); sync(); A.toast('Capa adicionada.'); A.render(); }
    catch (m) { if (er) er.textContent = String(m); el.value = ''; }
  };

  /* =========================================================
     /h/plano — plano do evento e cobrança (jornada comercial)
     O Completo é pago UMA vez por evento. Pagamento, desconto e fatura são simulados.
  ========================================================= */
  const pst = document.createElement('style'); pst.id = 'hpl-style';
  pst.textContent = `
.hpl{display:flex;flex-direction:column;gap:var(--space-12)}
.hpl-head{display:flex;flex-direction:column;gap:var(--space-4)}
.hpl-ev{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--space-2) var(--space-4)}
.hpl-ev label{color:var(--fg-2);font-size:var(--fs-sm)} .hpl-ev .select{width:auto;min-width:min(100%,18rem);max-width:100%;border-bottom-color:var(--line)}
.hpl-main{display:grid;gap:var(--space-10);grid-template-columns:minmax(0,1fr);grid-template-areas:"story" "aside" "ben"}
.hpl-story{grid-area:story;display:flex;flex-direction:column;gap:var(--space-5);min-width:0} .hpl-aside{grid-area:aside;display:flex;flex-direction:column;gap:var(--space-8);min-width:0} .hpl-ben{grid-area:ben;min-width:0}
@media(min-width:960px){.hpl-main{grid-template-columns:minmax(0,1fr) minmax(0,22rem);grid-template-areas:"story aside" "ben aside";column-gap:var(--space-16);align-items:start}.hpl-aside{position:sticky;top:var(--space-6)}}
.hpl-kick{display:flex;align-items:center;gap:var(--space-3)} .hpl-kick::before{content:"";width:var(--space-8);height:1px;background:var(--ac);flex:none}
.hpl-lead{font:350 var(--fs-display)/1.1 var(--font-display);letter-spacing:-.01em;margin:0;max-width:18ch;text-wrap:balance}
.hpl-p{margin:0;max-width:var(--measure);color:var(--fg-2);font-size:var(--fs-lg);line-height:1.5}
.hpl-ben ol{list-style:none;margin:0;padding:0}
.hpl-ben li{display:grid;grid-template-columns:var(--space-10) minmax(0,1fr);gap:var(--space-4);padding:var(--space-5) 0;border-top:1px solid var(--line-2)}
.hpl-ben li:last-child{border-bottom:1px solid var(--line-2)}
.hpl-n{font:350 var(--fs-xl)/1 var(--font-display);color:var(--accent-text);font-variant-numeric:tabular-nums}
.hpl-ben b{font:500 var(--fs-md)/1.3 var(--font-body);color:var(--fg);display:block} .hpl-ben p{margin:var(--space-1) 0 0;color:var(--fg-2);font-size:var(--fs-sm);line-height:1.5;max-width:var(--measure)}
.hpl-ben .eq{display:block;color:var(--fg-3);font-size:var(--fs-sm);margin-top:var(--space-2)}
.hpl-dl{margin:0;display:flex;flex-direction:column}
.hpl-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-1) var(--space-4);align-items:baseline;padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)}
.hpl-row dt{color:var(--fg-2);font-size:var(--fs-sm)} .hpl-row dd{margin:0}
.hpl-val{font:350 var(--fs-xl)/1.1 var(--font-display);font-variant-numeric:tabular-nums;text-align:right} .hpl-val small{font:400 var(--fs-sm) var(--font-body);color:var(--fg-3)}
.hpl-nota{grid-column:1/-1;color:var(--fg-3);font-size:var(--fs-sm)} .hpl-fil{grid-column:1/-1}
.hpl-preco{display:flex;flex-direction:column;gap:var(--space-3);border-top:1px solid var(--ac);padding-top:var(--space-5)}
.hpl-preco-n{font:350 var(--fs-hero)/1 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.hpl-preco s{color:var(--fg-3);font-size:var(--fs-sm)}
.hpl-link{display:inline-flex;align-items:center;gap:var(--space-2);min-height:44px;padding:0;background:none;border:0;font:inherit;font-size:var(--fs-md);color:var(--fg);text-decoration:underline;text-decoration-color:var(--ac);text-decoration-thickness:1px;text-underline-offset:.3em;cursor:pointer;text-align:left}
.hpl-link:hover{color:var(--accent-text)} .hpl-link[disabled]{color:var(--fg-3);cursor:not-allowed;text-decoration-color:var(--line)}
.hpl-link.sm{font-size:var(--fs-sm)} .hpl-link[aria-pressed="true"]{font-weight:500;text-decoration-thickness:2px}
.hpl-act{display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-1)}
.hpl-st{display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-4) 0;border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
.hpl-sec{display:flex;flex-direction:column;gap:var(--space-4)} .hpl-sec>h2{margin:0}
.hpl-evs{list-style:none;margin:0;padding:0}
.hpl-evs li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-1) var(--space-4);align-items:center;padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)}
.hpl-evs .nm{grid-column:1/-1;font:350 var(--fs-xl)/1.2 var(--font-display);overflow-wrap:anywhere} .hpl-evs .pl{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-1) var(--space-3);color:var(--fg-2);font-size:var(--fs-sm)}
.hpl-evs .dt{grid-column:1/-1;color:var(--fg-3);font-size:var(--fs-sm)}
@media(min-width:760px){.hpl-evs li{grid-template-columns:minmax(0,1fr) minmax(10rem,14rem) auto;column-gap:var(--space-8)}.hpl-evs .nm{grid-column:auto;font-size:var(--fs-lg)}.hpl-evs .dt{grid-column:1;grid-row:2}.hpl-evs .pl{grid-row:1/span 2;grid-column:2}.hpl-evs .go{grid-row:1/span 2;grid-column:3}}
.hpl-met{list-style:none;margin:0;padding:0}
.hpl-met li{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-1) var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)}
.hpl-met .grow{flex:1 1 12rem} .hpl-fats li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-1) var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);list-style:none}
.hpl-fats{margin:0;padding:0} .hpl-fats .d{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-4);align-items:center}
.hpl-tabs .hpl-link{min-width:var(--space-12);justify-content:center}
.hpl-tabs{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-5)}
.hpl-nudge{display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-1);border-top:1px solid var(--ac);padding-top:var(--space-3);max-width:var(--measure)}
.hpl-nudge p{margin:0;color:var(--fg-2);font-size:var(--fs-md);line-height:1.5}
.hpl-diff{list-style:none;margin:0;padding:0} .hpl-diff li{display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-3) 0;border-top:1px solid var(--line-2)} .hpl-diff li:last-child{border-bottom:1px solid var(--line-2)}
.hpl-oferta{display:flex;flex-direction:column;gap:var(--space-2);border-top:1px solid var(--ac);padding-top:var(--space-4)} .hpl-oferta h3{margin:0;font:350 var(--fs-xl)/1.2 var(--font-display)}
.hpl-oferta .n{font:350 var(--fs-title)/1.1 var(--font-display);font-variant-numeric:tabular-nums}
.hpl-danger{color:var(--crit-text)}
details.hpl-sim.ds-fold{border-top-style:dashed;border-top-color:var(--line);padding-top:var(--space-6)} .hpl-sim.ds-fold>summary{color:var(--fg-2);font-size:var(--fs-sm)}
.hpl-sim .in{display:flex;flex-direction:column;gap:var(--space-8);padding-top:var(--space-4)} .hpl-sim form{display:grid;gap:var(--space-4);grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));align-items:end}
.hpl-sim .bar{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);grid-column:1/-1}
.hpl-sim pre{margin:0;max-height:16rem;overflow:auto;font:var(--fs-xs)/1.5 var(--font-mono,monospace);color:var(--fg-2);white-space:pre-wrap;overflow-wrap:anywhere}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){.hpl-link:not([disabled]):hover{color:var(--fg)}}
/* v206 — Plano estilo Stripe/Linear: hero escuro, medidores em cartão, benefícios em grade, cartão de pagamento */
.hpl-story{position:relative;overflow:hidden;padding:var(--space-8);border-radius:var(--r-4);background:var(--tinta);color:var(--papel);background-image:radial-gradient(circle at 100% 0,color-mix(in srgb,var(--ambar) 38%,transparent),transparent 55%)}
.hpl-story .hpl-kick,.hpl-story .hpl-p{color:color-mix(in srgb,var(--papel) 78%,transparent)}
.hpl-story .hpl-kick::before{background:var(--ambar)}
.hpl-story .hpl-lead{color:var(--papel);max-width:20ch}
.hpl-story .hpl-st{background:color-mix(in srgb,var(--papel) 10%,transparent);border-color:color-mix(in srgb,var(--papel) 22%,transparent);border-radius:var(--r-3);color:var(--papel)}
.hpl-main{grid-template-areas:"story" "aside" "ben"}
@media(min-width:960px){.hpl-main{grid-template-columns:minmax(0,1fr) minmax(0,22rem);grid-template-areas:"story story" "ben aside";column-gap:var(--space-8);row-gap:var(--space-6)}.hpl-aside{position:sticky;top:var(--space-6);align-self:start}}
.hpl-dl{gap:var(--space-3)}
.hpl-row{padding:var(--space-4);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3)}
.hpl-fil{height:8px;border-radius:var(--r-pill);overflow:hidden} .hpl-fil i{border-radius:var(--r-pill)}
.hpl-ben ol{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-3)}
@media(min-width:1100px){.hpl-ben ol{grid-template-columns:repeat(2,minmax(0,1fr))}}
.hpl .hpl-ben li{margin:0;grid-template-columns:var(--space-8) minmax(0,1fr);align-content:start}
.hpl .hpl-n{background:var(--ac);color:var(--on-ac)}
.hpl .hpl-met .badge{background:color-mix(in srgb,var(--papel) 18%,transparent);color:var(--papel)}
.hpl-ben .eq{display:inline-block;padding:var(--space-1) var(--space-3);background:var(--surface-2);border-radius:var(--r-pill);font-size:var(--fs-xs)}
.hpl .hpl-preco{background:var(--surface);border:1px solid var(--ac);box-shadow:var(--elev-2)}
.hpl-preco-n{font-size:var(--fs-display)}
.hpl .hpl-met li{position:relative;align-items:center;padding:var(--space-5);background:var(--tinta);color:var(--papel);border-color:var(--tinta);border-radius:var(--r-3)}
.hpl-met li .muted,.hpl-met li .t-small{color:color-mix(in srgb,var(--papel) 70%,transparent)}
.hpl-met li .hpl-link,.hpl-met li .t-h{color:var(--papel)}
.hpl-met li .btn{color:var(--papel)}
.hpl-fats li{padding:var(--space-4) var(--space-5);margin-bottom:var(--space-2);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3)}
.hpl-tabs{padding:var(--space-1);background:var(--surface-2);border-radius:var(--r-pill);align-self:flex-start;gap:var(--space-1)}
.hpl-tabs .hpl-link{padding:0 var(--space-4);border-radius:var(--r-pill);text-decoration:none}
.hpl-tabs .hpl-link[aria-pressed="true"]{background:var(--bg);box-shadow:var(--elev-1)}
.hpl-sec>h2{font:400 var(--fs-xl)/1.2 var(--font-display)}
@media(max-width:600px){.hpl-story{padding:var(--space-5)}}
/* v205 — Plano e cobrança em cartões */
.hpl-aside>*{min-width:0}
.hpl-st,.hpl-preco{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hpl-preco{border-top:1px solid var(--line-2);background:var(--surface-2);box-shadow:var(--elev-1)}
.hpl-preco .btn,.hpl-oferta .btn,.hpl-nudge .btn{border-radius:var(--r-pill)}
.hpl-ben li{padding:var(--space-4) var(--space-5);margin-bottom:var(--space-3);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3)}
.hpl-ben li:last-child{border-bottom:1px solid var(--line-2);margin-bottom:0}
.hpl-n{display:grid;place-items:center;width:var(--space-8);height:var(--space-8);border-radius:50%;background:var(--surface-2);font-size:var(--fs-md)}
.hpl-evs li,.hpl-met li{padding:var(--space-4) var(--space-5);margin-bottom:var(--space-2);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3)}
.hpl-oferta,.hpl-nudge{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);max-width:none}
`;
  document.head.appendChild(pst);

  const FAT0 = [{ id: 'f1', ev: 'e1', desc: 'Plano Completo', forma: 'Pix', data: '2026-08-02', status: 'paga' }, { id: 'f2', ev: 'e2', desc: 'Plano Completo', forma: 'Cartão Visa final 4242', data: '2026-09-10', status: 'paga' }, { id: 'f3', ev: 'e3', desc: 'Plano Completo', forma: 'Pix', data: '2026-11-10', status: 'pendente' }];
  const STS = { paga: ['Paga', 'ok'], pendente: ['Pendente', 'warn'], falhou: ['Não concluída', 'bad'], vencida: ['Vencida', 'bad'] };
  const faturas = () => { const sts = S.get('crFaturaSt', {}), pr = plano('completo').preco; return S.get('crFaturasNovas', []).concat(FAT0.map((f) => Object.assign({ valor: pr }, f))).map((f) => Object.assign({}, f, { status: sts[f.id] || f.status })).sort((a, b) => (a.data < b.data ? 1 : -1)); };
  const metodos = () => S.get('crMetodos', [{ id: 'm1', tipo: 'cartao', bandeira: 'Visa', final: '4242' }, { id: 'm2', tipo: 'pix' }]);
  const metLabel = (m) => (m.tipo === 'pix' ? 'Pix' : `Cartão ${m.bandeira} final ${m.final}`);
  const padrao = () => S.get('crMetodoPadrao', 'm1');
  const isOwner = () => A.sim().role === 'owner';
  const evById = (id) => A.data.events.find((e) => e.id === id);
  const evNome = (id) => (evById(id) || {}).nome || 'Evento removido';
  const pf = (f) => S.get('crFat', 'todas') === 'todas' || (S.get('crFat') === 'pagas' ? f.status === 'paga' : f.status !== 'paga');
  const abertaDe = (id) => faturas().find((f) => f.ev === id && f.status !== 'paga');
  const ultimaDe = (id) => faturas().find((f) => f.ev === id);
  const pagEstado = (id) => { const f = ultimaDe(id); return !f || f.status === 'paga' ? 'paga' : f.status === 'falhou' ? 'falhou' : 'pendente'; };
  const dtc = (iso) => fmtISO(iso, { day: 'numeric', month: 'short', year: 'numeric' });

  /* ---------- analytics local: nada de PII nem dado financeiro ---------- */
  const PROIBIDO = /valor|preco|preço|cartao|cartão|forma|final|email|nome|cpf|token|bandeira/i;
  A.track = (nome, props) => {
    const p = {};
    Object.keys(props || {}).forEach((k) => { const v = props[k]; if (PROIBIDO.test(k)) return; if (v == null || typeof v === 'number' || typeof v === 'boolean') p[k] = v; else if (typeof v === 'string') p[k] = v.slice(0, 40); });
    S.update('analytics:log', (a) => [{ t: Date.now(), nome, props: p }].concat(a).slice(0, 200), []);
    return p;
  };

  /* ---------- campanha de retenção: dado + "servidor simulado" ---------- */
  const CAMP = 'retencao:campanha', USOS = 'retencao:usos', RLOG = 'retencao:log', CRED = 'retencao:creditos';
  const campanha = () => S.get(CAMP, null);
  const descontoDe = (c, base) => Math.min(base, Math.round((c.tipo === 'percentual' ? base * c.valor / 100 : c.valor) * 100) / 100);
  const descTxt = (c) => (c.tipo === 'percentual' ? `${c.valor}% de desconto` : `${A.brl(c.valor)} de desconto`);
  function servidorValidaOferta(evento, camp) {
    if (!camp) return { ok: false, motivo: 'sem_campanha' };
    if (camp.status !== 'ativa') return { ok: false, motivo: 'inativa' };
    if (!evento || evento.plano !== camp.plano) return { ok: false, motivo: 'plano_inelegivel' };
    if (!camp.validade || HOJE_ISO > camp.validade) return { ok: false, motivo: 'expirada' };
    if (!(camp.limite > 0) || (S.get(USOS, {})[camp.id] || 0) >= camp.limite) return { ok: false, motivo: 'esgotada' };
    if (['percentual', 'valor'].indexOf(camp.tipo) < 0 || !(camp.valor > 0) || (camp.tipo === 'percentual' && camp.valor > 90)) return { ok: false, motivo: 'campanha_invalida' };
    if (S.get(RLOG, []).some((l) => l.camp === camp.id && l.ev === evento.id && l.acao === 'aceita')) return { ok: false, motivo: 'ja_usada_neste_evento' };
    const base = plano('completo').preco, desconto = descontoDe(camp, base);
    return { ok: true, motivo: 'ok', desconto, precoFinal: Math.max(0, base - desconto), validade: camp.validade };
  }
  const logRet = (acao, camp, ev, extra) => S.update(RLOG, (a) => [Object.assign({ t: Date.now(), acao, camp: camp.id, ev: ev.id }, extra || {})].concat(a).slice(0, 100), []);
  const credito = () => S.get(CRED, []).find((c) => !c.usado && c.validade >= HOJE_ISO);

  /* ---------- uso do evento (lido do que o protótipo já guarda) ---------- */
  const BASE_FOTOS = 48;
  const limiteGratis = () => +((plano('gratis').itens.join(' ').match(/(\d+)\s*fotos/) || [])[1]) || 50;
  function uso(e) {
    const w = A.when(e.id); let fotos = 0;
    if (w.phase !== 'antes' && !e._x) {
      if (e.id === 'e1') fotos = (A.data.photos || []).length;
      else fotos = BASE_FOTOS - Object.values(S.get('hv.ph.' + e.id, {})).filter((o) => o && o.status === 'removida').length;
    }
    const ativas = e._x ? (e.missoes || []).length : A.data.missions.filter((m) => m.on).length;
    const total = e._x ? ativas : A.data.missions.length;
    const telao = (S.get('hc:telao:' + e.id, null) || {}).st === 'conectado';
    return { fotos, ativas, total, telao, fase: w.phase, dias: w.days };
  }
  const setPlano = (id, p) => { S.update('crPlanos', (m) => Object.assign({}, m, { [id]: p }), {}); sync(); };
  const rr = () => { const y = window.scrollY; A.render(); window.scrollTo(0, y); };

  /* ---------- lado do evento em foco ---------- */
  function foco(ctx) {
    const ev = A.data.events, q = ctx && ctx.q && ctx.q.e; let id = ev.some((e) => e.id === q) ? q : S.get('hplFoco', '');
    if (!ev.some((e) => e.id === id)) id = (ev.find((e) => e.plano !== 'completo') || ev[0] || {}).id;
    S.set('hplFoco', id); return evById(id);
  }
  const EQ = { 0: 0, 2: 2 };
  const BENDESC = (lim) => [`Nenhuma foto fica de fora no meio da festa. O Grátis para em ${lim}.`, 'Todas as missões e o visual do evento, do convite ao telão.', `${A.data.telaoModelos.map((m) => m[1]).join(', ')}: cada um com o visual da festa.`, 'Depois da festa, as fotos viram um álbum e um livro em PDF para guardar.', 'Leve as fotos para a sua própria nuvem, quando quiser.'];
  const rowUso = (rot, val, nota, pct) => `<div class="hpl-row"><dt>${rot}</dt><dd class="hpl-val">${val}</dd>${nota ? `<span class="hpl-nota">${nota}</span>` : ''}${pct == null ? '' : `<div class="progress hpl-fil" aria-hidden="true"><i style="width:${pct}%"></i></div>`}</div>`;
  const telaoNota = (e, u) => (u.telao ? 'Telão pareado.' : `Ainda não pareado. <a class="hpl-link sm" href="${A.hostBase(e.id)}/compartilhar">Parear o telão</a>`);

  function vistaLivre(e, u, own) {
    const comp = plano('completo'), lim = limiteGratis(), aberto = abertaDe(e.id), cred = aberto ? null : credito();
    const base = aberto ? aberto.valor : comp.preco, total = cred ? Math.max(0, base - descontoDe(cred, base)) : base;
    const pct = Math.min(100, Math.round(u.fotos / lim * 100));
    const aviso = u.fotos >= lim ? `Este evento chegou às ${lim} fotos do Grátis.` : u.fotos >= lim * 0.8 ? `Faltam ${lim - u.fotos} fotos para o limite do Grátis.` : u.fotos === 0 && u.fase === 'antes' ? 'A festa ainda não começou.' : '';
    const ben = comp.itens.map((it, i) => { const g = EQ[i] != null ? plano('gratis').itens[EQ[i]] : null; return `<li><span class="hpl-n" aria-hidden="true">${i + 1}</span><div><b>${esc(it)}</b><p>${esc(BENDESC(lim)[i] || '')}</p><span class="eq">${g ? 'No Grátis: ' + esc(g.charAt(0).toLowerCase() + g.slice(1)) : 'Não faz parte do Grátis'}</span></div></li>`; }).join('');
    const abertoMsg = aberto ? `<p class="t-small" role="status">${aberto.status === 'falhou' ? 'A última tentativa de pagamento não foi aprovada. Nada foi cobrado.' : 'Há um pagamento em aberto para este evento.'} Pague ${A.brl(aberto.valor)} para ativar o Completo.</p>` : '';
    const credMsg = cred ? `<p class="t-small">Desconto da oferta aplicado (${esc(descTxt(cred))}), válido até ${esc(dtc(cred.validade))}. Vale para um evento.</p>` : '';
    return `<div class="hpl-main"><div class="hpl-story"><span class="hpl-kick t-label">Plano Grátis neste evento</span><h2 class="hpl-lead" id="hpl-st" tabindex="-1">Para que nenhuma foto fique de fora.</h2><p class="hpl-p">O Completo é pago uma vez por evento, só para ${esc(e.nome)}. Sem mensalidade.</p></div>
<div class="hpl-aside"><section aria-labelledby="hpl-hj"><h3 class="t-label" id="hpl-hj" style="margin-bottom:var(--space-2)">Seu evento hoje</h3><dl class="hpl-dl">${rowUso('Fotos', `${u.fotos} <small>de ${lim}</small>`, aviso, pct)}${rowUso('Missões ativas', String(u.ativas), '')}${rowUso('Telão', u.telao ? 'Pareado' : 'Não pareado', telaoNota(e, u))}</dl></section>
<section class="hpl-preco" aria-labelledby="hpl-pc"><h3 class="t-label" id="hpl-pc">Completo neste evento</h3><div><span class="hpl-preco-n">${A.brl(total)}</span>${cred ? ` <s>${A.brl(base)}</s>` : ''}</div><p class="t-small">Pagamento único, só para este evento. Cartão ou Pix.</p>${credMsg}${abertoMsg}<button class="btn btn-primary btn-lg btn-block" data-act="hpl-up" data-id="${e.id}" ${own ? '' : 'disabled aria-disabled="true"'}>Ativar o Completo</button>${own ? '' : '<p class="t-small">Só o dono da conta ativa o plano.</p>'}</section></div>
<section class="hpl-ben" aria-labelledby="hpl-bn"><h3 class="t-label" id="hpl-bn" style="margin-bottom:var(--space-4)">O que o Completo inclui</h3><ol>${ben}</ol></section></div>`;
  }

  function vistaPaga(e, u, own) {
    const comp = plano('completo'), lim = limiteGratis(), est = pagEstado(e.id), f = ultimaDe(e.id), b = A.hostBase(e.id);
    const extra = Math.max(0, u.fotos - lim), pct = Math.min(100, Math.round(u.fotos / lim * 100)), pctM = u.total ? Math.round(u.ativas / u.total * 100) : 0;
    const stTxt = est === 'paga' ? `<span class="badge ok">Pago</span><span>${f ? `${esc(dtc(f.data))} · ${esc(f.forma)} · ${A.brl(f.valor)}` : 'Pagamento confirmado.'}</span>`
      : est === 'falhou' ? `<span class="badge bad">Pagamento não concluído</span><span>A última tentativa não foi aprovada. Nada foi cobrado. Tente de novo ou use outra forma de pagamento.</span>`
        : `<span class="badge warn">Pagamento pendente</span><span>Falta confirmar ${A.brl(f.valor)} (${esc(f.forma)}).</span>`;
    const prim = est === 'paga' ? `<a class="btn btn-primary btn-lg btn-block" href="${b}/hoje">Abrir o painel do evento</a>` : `<button class="btn btn-primary btn-lg btn-block" data-act="hpl-up" data-id="${e.id}" ${own ? '' : 'disabled aria-disabled="true"'}>${est === 'falhou' ? 'Tentar pagar de novo' : 'Pagar agora'}</button>`;
    const dep = u.fase === 'depois';
    const valor = extra ? `<span class="hpl-val">${extra} <small>${extra === 1 ? 'foto além do limite' : 'fotos além do limite'} do Grátis</small></span>` : `<span class="t-small">Ainda dentro das ${lim} fotos do Grátis. O Completo passa a valer a partir da foto ${lim + 1}, no telão com 4 modelos e no álbum final.</span>`;
    return `<div class="hpl-main"><div class="hpl-story"><span class="hpl-kick t-label">Plano Completo neste evento</span><h2 class="hpl-lead" id="hpl-st" tabindex="-1">Tudo liberado para esta festa.</h2><div class="hpl-st" role="status"><div class="flex flex-wrap" style="gap:var(--space-2) var(--space-4)">${stTxt}</div></div></div>
<div class="hpl-aside"><section class="stack stack-3" aria-label="Ações do plano">${prim}<div class="hpl-act"><button class="hpl-link" data-act="hpl-fat-ev" data-id="${e.id}">Ver fatura deste evento</button><button class="hpl-link sm" data-act="hpl-gerir" data-id="${e.id}" aria-haspopup="menu" ${own ? '' : 'disabled aria-disabled="true"'}>Gerenciar plano</button></div></section></div>
<section class="hpl-ben" aria-labelledby="hpl-us"><h3 class="t-label" id="hpl-us" style="margin-bottom:var(--space-2)">O que está sendo usado</h3><dl class="hpl-dl">${rowUso('Fotos', `${u.fotos} <small>sem limite</small>`, `O Grátis pararia em ${lim}. O filete vai até esse limite.`, pct)}${rowUso('Missões ativas', `${u.ativas} <small>de ${u.total}</small>`, '', pctM)}${rowUso('Telão', u.telao ? 'Pareado' : 'Não pareado', `${esc(A.data.telaoModelos.map((m) => m[1]).join(', '))}. ${telaoNota(e, u)}`)}${rowUso('Álbum final e livro em PDF', dep ? 'Disponível' : 'Depois da festa', '')}${rowUso('Exportar para a sua nuvem', 'Disponível', '')}</dl>
<div class="stack stack-2" style="margin-top:var(--space-8)"><h3 class="t-label">Valor entregue até agora</h3>${valor}</div><p class="t-small" style="margin-top:var(--space-4)">${esc(comp.nome)} · ${A.brl(comp.preco)} por evento, pagamento único.</p></section></div>`;
  }

  function outrosHtml(atual, own) {
    const lista = A.data.events.filter((e) => e.id !== atual.id);
    if (!lista.length) return '';
    const li = lista.map((e) => {
      const comp = e.plano === 'completo', ab = abertaDe(e.id), est = comp ? pagEstado(e.id) : (ab ? (ab.status === 'falhou' ? 'falhou' : 'pendente') : '');
      const lab = comp ? 'Completo' : 'Grátis', b = est === 'paga' ? '' : est === 'falhou' ? '<span class="badge bad">Pagamento não concluído</span>' : est === 'pendente' ? '<span class="badge warn">Pagamento pendente</span>' : '';
      const pagar = est === 'falhou' || est === 'pendente';
      const acao = pagar ? `<button class="hpl-link sm" data-act="hpl-up" data-id="${e.id}" ${own ? '' : 'disabled aria-disabled="true"'}>${est === 'falhou' ? 'Tentar de novo' : 'Pagar agora'}<span class="sr-only"> ${esc(e.nome)}</span></button>` : `<button class="hpl-link sm" data-act="hpl-foco" data-id="${e.id}">${comp ? 'Gerenciar' : 'Ver o Completo'}<span class="sr-only"> ${esc(e.nome)}</span></button>`;
      return `<li><span class="nm">${esc(e.nome)}</span><span class="dt">${esc(A.when(e.id).date)}</span><span class="pl"><span>Plano ${lab}</span>${b}${comp && !b ? '<span class="badge ok">Pago</span>' : ''}</span><span class="go">${acao}</span></li>`;
    }).join('');
    return `<section class="hpl-sec" aria-labelledby="hpl-ot"><h2 class="t-h" id="hpl-ot">Seus outros eventos</h2><ul class="hpl-evs">${li}</ul></section>`;
  }

  function pagamentoHtml(own) {
    const dis = own ? '' : 'disabled aria-disabled="true"', ms = metodos(), pd = padrao(), fil = S.get('crFat', 'todas');
    const met = `<ul class="hpl-met">${ms.map((m) => `<li><span class="muted">${A.icon(m.tipo === 'pix' ? 'zap' : 'card', 20)}</span><span class="grow"><b class="t-h">${esc(metLabel(m))}</b>${pd === m.id ? ' <span class="badge ok">Padrão</span>' : ''}<span class="t-small muted" style="display:block">Simulado: nenhum dado real é guardado.</span></span>${pd === m.id ? '' : `<button class="hpl-link sm" data-act="hcr-pad" data-id="${m.id}" ${dis}>Tornar padrão</button>`}<button class="btn btn-quiet btn-icon" data-act="hcr-met-del" data-id="${m.id}" aria-label="Remover ${esc(metLabel(m))}" ${ms.length < 2 || !own ? 'disabled aria-disabled="true"' : ''}>${A.icon('trash', 16)}</button></li>`).join('')}</ul><div><button class="hpl-link" data-act="hcr-met-add" ${dis}>${A.icon('plus', 16)} Adicionar cartão</button></div>`;
    const vis = faturas().filter(pf);
    const tabs = [['todas', 'Todas'], ['pagas', 'Pagas'], ['abertas', 'Em aberto']].map(([v, l]) => `<button class="hpl-link sm" data-act="hcr-ff" data-v="${v}" aria-pressed="${fil === v}">${l}</button>`).join('');
    const fat = vis.length ? `<ul class="hpl-fats">${vis.map((f) => { const [l, c] = STS[f.status] || [f.status, '']; return `<li><span><b class="t-h" style="display:block">${esc(f.desc)} · ${esc(evNome(f.ev))}</b><span class="t-small muted">${esc(dtc(f.data))} · ${esc(f.forma)}</span></span><span class="hpl-val">${A.brl(f.valor)}</span><span class="d"><span class="badge ${c}">${l}</span>${f.status === 'paga' ? '' : `<button class="hpl-link sm" data-act="hcr-pagar" data-id="${f.id}" ${dis}>${f.status === 'falhou' ? 'Tentar de novo' : 'Pagar agora'}</button>`}<button class="hpl-link sm" data-act="hcr-fatura" data-id="${f.id}">Ver fatura</button></span></li>`; }).join('')}</ul>` : A.emptyState({ icon: 'inbox', title: 'Nenhuma fatura aqui', body: fil === 'todas' ? 'Quando você ativar o plano Completo, a fatura aparece nesta lista.' : 'Nenhuma fatura neste filtro. Mude o filtro para ver as outras.' });
    return `<section class="hpl-sec" id="hpl-pag" aria-labelledby="hpl-fp"><h2 class="t-h" id="hpl-fp" tabindex="-1">Forma de pagamento</h2>${met}</section><section class="hpl-sec" aria-labelledby="hpl-ft"><h2 class="t-h" id="hpl-ft">Faturas</h2><div class="hpl-tabs" role="group" aria-label="Filtrar faturas">${tabs}</div>${fat}</section>`;
  }

  function simHtml(e) {
    const c = campanha() || { tipo: 'percentual', valor: 20, validade: '2026-11-30', limite: 10, status: 'ativa', id: 'ret-1' }, a = S.get('analytics:log', []), rl = S.get(RLOG, []);
    const ver = e.plano === 'completo' ? servidorValidaOferta(e, campanha()) : { ok: false, motivo: 'plano_inelegivel' };
    const log = a.slice(0, 14).map((x) => `${new Date(x.t).toLocaleTimeString('pt-BR')}  ${x.nome}  ${JSON.stringify(x.props)}`).join('\n') || 'Nenhum evento ainda.';
    const rlog = rl.slice(0, 8).map((x) => `${new Date(x.t).toLocaleTimeString('pt-BR')}  ${x.acao}  ${x.camp}  ${x.ev}`).join('\n') || 'Nenhum registro.';
    const est = pagEstado(e.id);
    return `<details class="hpl-sim ds-fold" ${S.get('hplSim', false) ? 'open' : ''}><summary data-act="hpl-sim">Painel de simulação (só no protótipo, não aparece para o usuário)</summary><div class="in ds-fold-b">
<div class="stack stack-3"><h3 class="t-h">Simulação: configurar/limpar campanha de retenção</h3><p class="t-small muted">No produto isso vive no backend. Hoje: ${campanha() ? 'campanha configurada' : 'nenhuma campanha (padrão: o diálogo mostra só benefícios e opções)'}. Elegibilidade de ${esc(e.nome)}: <b>${esc(ver.motivo)}</b>.</p>
<form data-submit="hpl-camp-save" novalidate>${A.field({ name: 'tipo', label: 'Tipo', value: c.tipo, required: true, options: [['percentual', 'Percentual'], ['valor', 'Valor em reais']] })}${A.field({ name: 'valor', label: 'Valor (% ou R$)', value: String(c.valor), required: true, extra: 'inputmode="decimal"' })}${A.field({ name: 'validade', label: 'Válida até', type: 'date', value: c.validade, required: true })}${A.field({ name: 'limite', label: 'Limite de usos', value: String(c.limite), required: true, extra: 'inputmode="numeric"' })}${A.field({ name: 'status', label: 'Status', value: c.status, required: true, options: [['ativa', 'Ativa'], ['pausada', 'Pausada'], ['encerrada', 'Encerrada']] })}<div class="bar"><button class="btn btn-line btn-sm" type="submit">Salvar campanha</button><button class="btn btn-quiet btn-sm" type="button" data-act="hpl-camp-clear">Limpar campanha, usos e créditos</button></div></form></div>
<div class="stack stack-3"><h3 class="t-h">Simulação: situação do pagamento de ${esc(e.nome)}</h3><p class="t-small muted">Situação atual: ${est}. Para eventos Completo, mostra os caminhos pago, pendente e não concluído.</p><div class="flex flex-wrap"><button class="hpl-link sm" data-act="hpl-sim-pag" data-id="${e.id}" data-v="paga">Marcar pago</button><button class="hpl-link sm" data-act="hpl-sim-pag" data-id="${e.id}" data-v="pendente">Marcar pendente</button><button class="hpl-link sm" data-act="hpl-sim-pag" data-id="${e.id}" data-v="falhou">Marcar não concluído</button></div></div>
<div class="stack stack-3"><h3 class="t-h">Analytics local (últimos 14)</h3><pre aria-label="Registro de eventos de analytics">${esc(log)}</pre><h3 class="t-h">Registro da oferta (exibida, aceita, recusada)</h3><pre aria-label="Registro da oferta de retenção">${esc(rlog)}</pre><div><button class="hpl-link sm" data-act="hpl-log-clear">Limpar registros</button></div></div></div></details>`;
  }

  let lastView = null;
  window.addEventListener('hashchange', () => { if (!/^#\/h\/plano/.test(location.hash)) lastView = null; });
  A.route('/h/plano', (ctx) => {
    const g = guard(ctx); if (g) return g; sync(); clearTimer();
    const e = foco(ctx), own = isOwner();
    const head = `<header class="hpl-head"><h1 class="t-title">Plano e cobrança</h1>${e ? `<div class="hpl-ev"><label for="hpl-sel">Evento em foco</label><select class="select" id="hpl-sel" data-change="hpl-sel">${A.data.events.map((x) => `<option value="${x.id}" ${x.id === e.id ? 'selected' : ''}>${esc(x.nome)} · ${plano(x.plano).nome}</option>`).join('')}</select></div>` : ''}</header>`;
    const aviso = own ? '' : `<div class="banner warn">${A.icon('lock', 20)}<div>Só o dono da conta troca o plano e a forma de pagamento. Você está vendo como outro papel (mude em “Protótipo”).</div></div>`;
    const ok = () => { const u = uso(e); return `${aviso}${e.plano === 'completo' ? vistaPaga(e, u, own) : vistaLivre(e, u, own)}${outrosHtml(e, own)}${pagamentoHtml(own)}${simHtml(e)}`; };
    const body = A.stateful({ ok, loading: `<div class="stack stack-5" aria-busy="true" aria-label="Carregando plano e cobrança"><div class="skeleton" style="height:48px;width:60%"></div><div class="skeleton" style="height:160px"></div><div class="skeleton" style="height:96px"></div></div>`, error: A.errorState({ title: 'Não deu para carregar o plano e a cobrança', body: 'Nada foi cobrado nem alterado. Confira a conexão e tente de novo.' }), isEmpty: () => !A.data.events.length, empty: A.emptyState({ icon: 'wallet', title: 'Nada para cobrar ainda', body: 'Crie um evento e, se quiser o plano Completo, a fatura aparece aqui.', cta: '<a class="btn btn-primary" href="#/h/novo/1">Criar evento</a>' }) });
    if (e && A.sim().state === 'ok' && lastView !== e.id) { lastView = e.id; A.track('planos_visualizados', { evento: e.id, plano: e.plano, origem: ctx.q.de || 'direto' }); }
    return { title: 'Plano e cobrança', html: acct('plano', `<div class="hpl">${head}${body}</div>`) };
  });
  A.inputs['hpl-sel'] = (el) => goto('#/h/plano?e=' + encodeURIComponent(el.value));
  A.acts['hpl-foco'] = (el, ev, ds) => { goto('#/h/plano?e=' + encodeURIComponent(ds.id)); A.later(0, () => { const x = $('#hpl-st'); if (x) x.focus(); }); };
  A.acts['hpl-sim'] = (el) => { S.set('hplSim', !el.parentElement.open); };
  A.acts['hcr-ff'] = (el, e, ds) => { S.set('crFat', ds.v); rr(); $(`[data-act=hcr-ff][data-v=${ds.v}]`)?.focus(); };
  A.acts['hcr-pad'] = (el, e, ds) => { S.set('crMetodoPadrao', ds.id); A.toast('Forma de pagamento padrão atualizada.'); rr(); };
  A.acts['hcr-met-del'] = (el, e, ds) => { const m = metodos().find((x) => x.id === ds.id); A.confirm({ title: 'Remover forma de pagamento?', body: `${metLabel(m)} deixa de ser oferecida nas próximas cobranças. As faturas já pagas não mudam.`, confirm: 'Remover', danger: true }).then((ok) => { if (!ok) return; const r = metodos().filter((x) => x.id !== ds.id); S.set('crMetodos', r); if (padrao() === ds.id) S.set('crMetodoPadrao', r[0].id); A.toast('Forma de pagamento removida.'); rr(); }); };
  A.acts['hcr-met-add'] = () => A.modal({ title: 'Adicionar cartão', body: `<form class="stack" data-submit="hcr-met-ok" novalidate>${A.field({ name: 'bandeira', label: 'Bandeira', value: 'Visa', options: ['Visa', 'Mastercard', 'Elo'] })}${A.field({ name: 'final', label: 'Últimos 4 dígitos', required: true, placeholder: '0000', hint: 'Só os 4 últimos números. Protótipo: nenhum cartão de verdade é guardado.', extra: 'inputmode="numeric" maxlength="4" autocomplete="off"' })}</form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Salvar cartão', variant: 'btn-primary', onClick: (api) => { const v = A.validate($('form', api.el), { final: (x) => (/^\d{4}$/.test(x) ? '' : 'Informe exatamente 4 números.') }); if (!v) return false; const id = 'm' + A.uid(); S.set('crMetodos', metodos().concat([{ id, tipo: 'cartao', bandeira: v.bandeira, final: v.final }])); A.toast('Cartão adicionado (simulado).'); A.later(0, rr); } }] });
  A.acts['hcr-met-ok'] = () => { const b = $('.modal [data-mi="1"]'); if (b) b.click(); };

  /* ---------- upgrade: checkout simulado ---------- */
  function upgradeClick(evId, origem) {
    const ev = evById(evId); if (!ev) return;
    if (!isOwner()) { A.toast('Só o dono da conta ativa o plano. Peça a ele.'); return; }
    if (ev.plano === 'completo' && pagEstado(ev.id) === 'paga') { A.toast('Este evento já está no Completo.'); return; }
    A.track('upgrade_clicado', { evento: ev.id, plano: ev.plano, origem: origem || 'plano' });
    checkout(ev.id);
  }
  A.acts['hpl-up'] = (el, e, ds) => upgradeClick(ds.id, 'plano');
  A.acts['hcr-ativar'] = (el, e, ds) => upgradeClick(ds.id, 'pronto');
  A.acts['hcr-pagar'] = (el, e, ds) => { const f = faturas().find((x) => x.id === ds.id); if (f) upgradeClick(f.ev, 'fatura'); };
  function checkout(evId) {
    const ev = evById(evId); if (!ev) return;
    const comp = plano('completo'), ms = metodos(), pd = padrao(), aberto = abertaDe(ev.id), cred = aberto ? null : credito();
    const base = aberto ? aberto.valor : comp.preco, desc = cred ? descontoDe(cred, base) : 0, total = Math.max(0, base - desc);
    const opts = ms.map((m) => `<label class="check"><input type="radio" name="forma" value="${m.id}" ${m.id === pd ? 'checked' : ''}><span>${esc(metLabel(m))}</span></label>`).join('');
    const credRow = cred ? `<div class="flex between"><span>Desconto da oferta (${esc(descTxt(cred))})</span><span>- ${A.brl(desc)}</span></div>` : '';
    let mudou = false, busy = false;
    A.track('checkout_iniciado', { evento: ev.id, retomada: !!aberto, com_desconto: !!cred });
    A.modal({ title: 'Ativar o plano Completo', label: 'Ativar plano Completo', onOpen: (m, api) => { api.onClose = () => { if (mudou) rr(); }; }, body: `<div class="stack"><p>Evento: <b>${esc(ev.nome)}</b></p><ul style="margin:0;padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-1)">${comp.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul><div class="stack stack-2"><span class="t-label">Forma de pagamento</span><div class="stack stack-3" id="hcr-forma">${opts}</div></div><label class="check"><input type="checkbox" id="hcr-recusa"><span>Simular pagamento recusado <span class="t-small">(protótipo)</span></span></label>${credRow}<div class="flex between"><span>Total, pagamento único</span><b class="t-num" style="font-size:var(--fs-title)">${A.brl(total)}</b></div><div id="hcr-pay-err" role="alert"></div><p class="t-small">Pagamento simulado: nenhum valor é cobrado de verdade. Na versão real, o pagamento é processado por um provedor seguro.</p></div>`, actions: [{ label: 'Agora não', variant: 'btn-quiet' }, { label: `Pagar ${A.brl(total)} (simulado)`, variant: 'btn-primary', onClick: (api, b) => {
      if (busy) return false; const er = $('#hcr-pay-err', api.el); er.innerHTML = ''; busy = true;
      const sel = ms.find((m) => m.id === ($('input[name=forma]:checked', api.el) || {}).value) || ms[0], recusa = $('#hcr-recusa', api.el).checked;
      A.busy(b, 1000, () => {
        busy = false;
        if (recusa || A.sim().state === 'error') {
          const motivo = recusa ? 'recusado' : 'indisponivel';
          if (aberto) S.update('crFaturaSt', (m) => Object.assign({}, m, { [aberto.id]: 'falhou' }), {});
          else S.update('crFaturasNovas', (a) => [{ id: 'f' + A.uid(), ev: ev.id, desc: 'Plano Completo', forma: metLabel(sel), valor: total, data: HOJE_ISO, status: 'falhou', cred: cred ? cred.id : undefined }].concat(a), []);
          mudou = true; A.track('erro_fluxo', { etapa: 'pagamento', motivo, evento: ev.id });
          er.innerHTML = `<div class="banner bad">${A.icon('warn', 20)}<div><b>O pagamento não foi aprovado.</b> ${recusa ? 'O banco recusou a cobrança.' : 'O serviço de pagamento não respondeu.'} Nada foi cobrado. Tente outra forma de pagamento ou tente de novo em instantes.</div></div>`; return;
        }
        const credId = (aberto && aberto.cred) || (cred && cred.id);
        if (aberto) S.update('crFaturaSt', (m) => Object.assign({}, m, { [aberto.id]: 'paga' }), {});
        else S.update('crFaturasNovas', (a) => [{ id: 'f' + A.uid(), ev: ev.id, desc: 'Plano Completo', forma: metLabel(sel), valor: total, data: HOJE_ISO, status: 'paga', cred: credId }].concat(a), []);
        if (credId) S.update(CRED, (a) => a.map((c) => (c.id === credId ? Object.assign({}, c, { usado: true }) : c)), []);
        setPlano(ev.id, 'completo'); A.track('pagamento_concluido', { evento: ev.id, retomada: !!aberto, com_desconto: !!credId });
        mudou = true; api.close(); A.toast(`Plano Completo ativo em ${ev.nome} (pagamento simulado).`); A.later(0, () => { const x = $('#hpl-st'); if (x) x.focus(); });
      });
      return false;
    } }] });
  }
  A.acts['hpl-fat-ev'] = (el, e, ds) => { const f = ultimaDe(ds.id); if (f) A.acts['hcr-fatura'](el, e, { id: f.id }); else A.toast('Este evento ainda não tem fatura.'); };
  A.acts['hcr-fatura'] = (el, e, ds) => { const f = faturas().find((x) => x.id === ds.id), [l] = STS[f.status] || [f.status]; A.modal({ title: 'Fatura', body: `<dl class="hcr-sum">${[['Descrição', f.desc], ['Evento', evNome(f.ev)], ['Data', fmtISO(f.data)], ['Forma', f.forma], ['Valor', A.brl(f.valor)], ['Situação', l]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`, actions: [{ label: 'Fechar', variant: 'btn-quiet' }, { label: 'Baixar PDF (simulado)', variant: 'btn-line', onClick: () => { A.toast('O PDF da fatura seria baixado aqui. Simulado no protótipo.'); } }] }); };
  A.acts['hpl-gerir'] = (el, e, ds) => A.menu(el, [{ label: 'Forma de pagamento', icon: 'card', onClick: () => { const x = $('#hpl-fp'); if (x) { x.scrollIntoView({ block: 'start' }); x.focus({ preventScroll: true }); } } }, { label: 'Voltar ao Grátis', icon: 'undo', onClick: () => abrirDowngrade(ds.id) }]);

  /* ---------- downgrade: um diálogo por tentativa, nunca executa direto ---------- */
  let dgAberto = false;
  function abrirDowngrade(evId) {
    const ev = evById(evId); if (!ev || (dgAberto && $('.modal'))) return;
    if (!isOwner()) { A.toast('Só o dono da conta muda o plano.'); return; }
    if (ev.plano !== 'completo') { A.toast('Este evento já está no Grátis.'); return; }
    dgAberto = true;
    const u = uso(ev), lim = limiteGratis(), comp = plano('completo'), f = ultimaDe(ev.id), camp = campanha(), of = servidorValidaOferta(ev, camp);
    let resolvido = false;
    A.track('downgrade_tentado', { evento: ev.id, plano: ev.plano, oferta_valida: of.ok, motivo_oferta: of.motivo });
    if (of.ok) { A.track('oferta_exibida', { evento: ev.id, campanha: camp.id, tipo: camp.tipo }); logRet('exibida', camp, ev); }
    const gr = plano('gratis').itens;
    const rows = comp.itens.map((it, i) => { const g = EQ[i] != null ? gr[EQ[i]] : null; const nota = g ? `No Grátis: ${g.charAt(0).toLowerCase() + g.slice(1)}.${i === 0 && u.fotos ? ` Seu evento tem ${u.fotos} fotos hoje.` : ''}` : 'Não faz parte do Grátis.'; return `<li><b>${esc(it)}</b><span class="t-small muted">${esc(nota)}</span></li>`; }).join('');
    const oferta = of.ok ? `<section class="hpl-oferta" aria-label="Oferta para continuar"><h3>${esc(descTxt(camp))} no próximo Completo</h3><div><s class="muted">${A.brl(comp.preco)}</s> <span class="n">${A.brl(of.precoFinal)}</span></div><p class="t-small">Vale para um evento novo, até ${esc(dtc(camp.validade))}. Fica guardado na sua conta se você escolher Continuar com o Completo. Se confirmar a mudança para o Grátis, a oferta não é aplicada.</p></section>` : '';
    const body = `<div class="stack stack-5"><p style="margin:0;font:350 var(--fs-lg)/1.5 var(--font-display)">${esc(ev.nome)} continua existindo e o que já foi enviado fica guardado. Veja o que muda ao voltar ao Grátis:</p><ul class="hpl-diff">${rows}</ul><p class="t-small" style="margin:0">${f && f.status === 'paga' ? `O valor já pago (${A.brl(f.valor)}) não é devolvido. ` : ''}Para ter o Completo de novo, é preciso pagar outra vez.</p>${oferta}</div>`;
    A.modal({ title: 'Que tal continuar guardando cada momento?', label: 'Voltar ao plano Grátis', body, onOpen: (m, api) => { api.onClose = () => { dgAberto = false; if (of.ok && !resolvido) { logRet('recusada', camp, ev, { via: 'fechou' }); A.track('oferta_recusada', { evento: ev.id, campanha: camp.id, via: 'fechou' }); } }; },
      actions: [
        { label: 'Continuar com o Completo', variant: 'btn-primary', onClick: () => {
          resolvido = true;
          if (!of.ok) { A.toast('Tudo certo: o Completo continua neste evento.'); return; }
          const v = servidorValidaOferta(ev, camp);
          if (!v.ok) { A.track('erro_fluxo', { etapa: 'oferta', motivo: v.motivo, evento: ev.id }); A.toast('Essa oferta não está mais disponível. O Completo continua neste evento.'); return; }
          S.update(USOS, (m) => Object.assign({}, m, { [camp.id]: (m[camp.id] || 0) + 1 }), {});
          S.update(CRED, (a) => a.concat([{ id: 'c' + A.uid(), camp: camp.id, tipo: camp.tipo, valor: camp.valor, validade: camp.validade, origem: ev.id, usado: false }]), []);
          logRet('aceita', camp, ev); A.track('oferta_aceita', { evento: ev.id, campanha: camp.id, tipo: camp.tipo });
          A.toast(`Completo mantido. ${descTxt(camp)} guardado para o próximo evento, até ${dtc(camp.validade)}.`); A.later(0, rr);
        } },
        { label: 'Confirmar mudança para o Grátis', variant: 'btn-line hpl-danger', onClick: (api, b) => {
          resolvido = true;
          A.busy(b, 600, () => {
            if (A.sim().state === 'error') { resolvido = false; A.track('erro_fluxo', { etapa: 'downgrade', motivo: 'indisponivel', evento: ev.id }); A.toast('Não deu para mudar o plano agora. Nada foi alterado. Tente de novo em instantes.', { kind: 'bad' }); return; }
            if (of.ok) { logRet('recusada', camp, ev, { via: 'confirmou' }); A.track('oferta_recusada', { evento: ev.id, campanha: camp.id, via: 'confirmou' }); }
            setPlano(ev.id, 'gratis'); A.track('downgrade_confirmado', { evento: ev.id, fotos_na_hora: u.fotos });
            api.close(); A.toast(`${ev.nome} voltou ao plano Grátis.`); A.later(0, rr);
          });
          return false;
        } },
        { label: 'Voltar sem alterar', variant: 'btn-quiet' },
      ] });
  }
  A.acts['hcr-down'] = (el, e, ds) => abrirDowngrade(ds.id);

  /* ---------- simulação (campanha, pagamento, registros) ---------- */
  A.acts['hpl-camp-save'] = (form) => {
    const v = A.validate(form, { valor: (x) => (+String(x).replace(',', '.') > 0 ? '' : 'Informe um valor maior que zero.'), limite: (x) => (/^\d+$/.test(x) && +x > 0 ? '' : 'Informe um número inteiro maior que zero.'), validade: (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x) ? '' : 'Escolha uma data.') });
    if (!v) return;
    const c = { id: (campanha() || {}).id || 'ret-1', plano: 'completo', tipo: v.tipo, valor: +String(v.valor).replace(',', '.'), validade: v.validade, limite: +v.limite, status: v.status };
    S.set(CAMP, c); S.set('hplSim', true); A.toast('Campanha salva (simulação).'); rr();
  };
  A.acts['hpl-camp-clear'] = () => { S.set(CAMP, null); S.set(USOS, {}); S.set(CRED, []); S.set('hplSim', true); A.toast('Campanha, usos e créditos limpos (simulação).'); rr(); };
  A.acts['hpl-sim-pag'] = (el, e, ds) => {
    const f = ultimaDe(ds.id);
    if (f) S.update('crFaturaSt', (m) => Object.assign({}, m, { [f.id]: ds.v }), {});
    else S.update('crFaturasNovas', (a) => [{ id: 'f' + A.uid(), ev: ds.id, desc: 'Plano Completo', forma: 'Pix', valor: plano('completo').preco, data: HOJE_ISO, status: ds.v }].concat(a), []);
    S.set('hplSim', true); A.toast('Situação do pagamento alterada (simulação).'); rr();
  };
  A.acts['hpl-log-clear'] = () => { S.set('analytics:log', []); S.set(RLOG, []); S.set('hplSim', true); rr(); };

  /* ---------- API para outros módulos ---------- */
  const NUDGE = {
    'apos-criar': (e, u, lim, pr) => `Este evento começa no Grátis, com até ${lim} fotos. Se quiser fotos ilimitadas, telão com 4 modelos e álbum final, o Completo custa ${pr}, pago uma vez por evento. Você decide quando.`,
    'limite-gratis': (e, u, lim, pr) => `Este evento já usou ${u.fotos} das ${lim} fotos do Grátis. No Completo o limite deixa de existir. ${pr}, pagamento único para este evento.`,
    'antes-da-festa': (e, u, lim, pr) => `${u.dias > 0 ? `Faltam ${u.dias} dias para a festa. ` : ''}O Completo libera os 4 modelos de telão e o álbum final. ${pr}, pagamento único. Você pode ativar quando quiser.`,
    telao: (e, u, lim, pr) => `O Grátis usa o telão básico. O Completo traz 4 modelos: ${A.data.telaoModelos.map((m) => m[1]).join(', ')}. ${pr}, pagamento único para este evento.`,
    'recurso-exclusivo': (e, u, lim, pr) => `Este recurso faz parte do plano Completo: ${pr}, pagamento único para este evento.`,
  };
  function nudge(contexto, opts) {
    const o = Object.assign({}, typeof contexto === 'object' && contexto ? contexto : { contexto }, opts || {}), c = o.contexto;
    if (!NUDGE[c] || o.critico || o.superficie === 'convidado' || /^#\/(g|t|w)(\/|$|\?)/.test(location.hash) || !isOwner()) return '';
    const m = location.hash.match(/^#\/h\/e\/([^/?]+)/), id = o.eventId || (m && m[1]) || S.get('crUltimo', ''), e = evById(id);
    if (!e || e.plano === 'completo') return '';
    const pr = A.brl(plano('completo').preco);
    return `<aside class="hpl-nudge" aria-label="Sobre o plano Completo"><p>${esc(NUDGE[c](e, uso(e), limiteGratis(), pr))}</p><button class="hpl-link" data-act="hpl-nudge" data-id="${esc(e.id)}" data-ctx="${esc(c)}">Conhecer o Completo</button></aside>`;
  }
  A.acts['hpl-nudge'] = (el, e, ds) => { A.track('upgrade_clicado', { evento: ds.id, plano: 'gratis', origem: ds.ctx }); goto('#/h/plano?e=' + encodeURIComponent(ds.id) + '&de=' + encodeURIComponent(ds.ctx)); };
  A.plan = { upgrade: (eventId) => upgradeClick(eventId, 'externo'), downgrade: (eventId) => abrirDowngrade(eventId), nudge };

  /* ---------- mapa do protótipo e ⌘K ---------- */
  const G = 'Anfitrião · entrar e criar';
  A.map(G, 'Seus eventos', '#/h', 'Lista com busca, filtro, ordem e estados');
  A.map(G, 'Entrar', '#/h/entrar', 'Google simulado e link por e-mail');
  A.map(G, 'Novo evento (3 passos)', '#/h/novo/1', '3 passos com prévia ao vivo grande');
  A.map(G, 'Pronto (evento criado)', '#/h/novo/pronto', 'Link, QR, mensagem, prontidão e plano');
  A.map(G, 'Plano e cobrança', '#/h/plano', 'Plano por evento, pagamento, retenção e analytics simulados');
  A.palette.add([{ group: 'Anfitrião', label: 'Criar novo evento', icon: 'plus', go: '#/h/novo/1', keys: 'novo festa evento criar' }, { group: 'Anfitrião', label: 'Plano e cobrança', icon: 'wallet', go: '#/h/plano', keys: 'faturas pagamento preço' }, { group: 'Anfitrião', label: 'Sair da conta', icon: 'logout', run: () => A.acts['hcr-sair'](), keys: 'logout' }]);
})();
