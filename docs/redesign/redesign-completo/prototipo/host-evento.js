/* Albora protótipo — painel do anfitrião: Hoje, Fotos, Convidados (+ Números).
   Rotas: /h/e/:id/hoje · /fotos · /convidados. Aliases antigos redirecionam.
   Tudo é fictício. Persistência em A.store (chaves "h.<tipo>.<eventId>") e reflexo em A.data.photos / A.data.guests do evento e1. */
(function () {
  const A = window.A; if (!A) return;
  const ST = A.store, E = A.esc, DAY = 86400000;

  /* ---------- estilo próprio (prefixo hv-) ---------- */
  const css = `
#hv-ibn:empty{display:none}
.hv-sec{padding:var(--space-8) 0;border-bottom:1px solid var(--line-2)} .hv-sec:last-child{border-bottom:0}
.hv-sec>.t-label{display:block;margin-bottom:var(--space-3)}
.hv-hint{font-size:var(--fs-sm);color:var(--fg-3)}
.hv-row{display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap} .hv-row .btn{white-space:normal;max-width:100%;text-align:center;line-height:1.25;padding-block:var(--space-2)}
.hv-big{font:350 var(--fs-display)/1.05 var(--font-display);letter-spacing:-.02em;text-wrap:balance}
.hv-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-2);padding:var(--space-3) 0 var(--space-8)}
.hv-arcwrap{position:relative;width:min(460px,100%)}
@media(max-height:500px){.hv-arcwrap{width:min(260px,100%)}.hv-hero-n{font-size:var(--fs-hero)}}
.hv-arcwrap .arc{width:100%!important} .hv-arcwrap .arc svg{width:100%;height:auto}
.hv-arcwrap .arc .trk{stroke-width:.9} .hv-arcwrap .arc .val{stroke-width:1.3} .hv-arcwrap .arc .sun{r:2.5}
.hv-hero-n{position:absolute;left:0;right:0;bottom:2%;margin:0;font:300 calc(var(--fs-hero)*1.6)/.95 var(--font-display);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.hv-hero-n small{font:350 var(--fs-xl)/1 var(--font-display);letter-spacing:0;margin-left:var(--space-2);color:var(--fg-2)}
.hv-hero-t{font:380 var(--fs-xl)/1.2 var(--font-display);margin:var(--space-3) 0 0}
.hv-poster{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;text-align:left;gap:0;padding:0;aspect-ratio:4/5;max-height:72dvh;border-radius:var(--r-lg,16px);background:var(--surface-2,var(--surface));color:var(--fg)}
.hv-poster.has-foto{--veu-cor:var(--noite);background:var(--noite)}
@media(min-width:901px){.hv-poster{aspect-ratio:auto;min-height:min(520px,64dvh)}}
.has-foto .hv-kick,.has-foto .hv-place,.has-foto .hv-hero-nota,.has-foto .hv-cd-u span,.has-foto .hv-cd-u:last-child b{color:var(--fg)}
.hv-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 38%;z-index:-2}
.hv-hero-veu{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 0%,color-mix(in srgb,var(--veu-cor) calc(var(--veu-a) * 15%),transparent) 30%,color-mix(in srgb,var(--veu-cor) calc(var(--veu-a) * 80%),transparent) 62%,color-mix(in srgb,var(--veu-cor) calc(var(--veu-a) * 100%),transparent) 100%)}
.hv-poster-top{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-4);padding:var(--space-6) var(--space-4) var(--space-4);min-height:0}
.hv-poster-top .arc{opacity:.9}
.has-foto .hv-arcwrap .arc .trk{stroke:var(--fg);opacity:.4}
.hv-poster-top .hv-arcwrap{width:min(240px,66%)}
.hv-poster-in{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-2);padding:var(--space-2) var(--space-6) var(--space-6)}
.hv-kick{margin:0;font-size:var(--fs-sm);letter-spacing:var(--tracking-label,.06em);text-transform:uppercase;color:var(--fg-2)}
.hv-poster .hv-hero-t{margin:0;font:380 var(--fs-display)/1.06 var(--font-display);letter-spacing:-.02em;text-wrap:balance}
.hv-place{margin:0;display:flex;align-items:center;justify-content:center;gap:var(--space-2);font-size:var(--fs-sm);color:var(--fg-2)}
#hv-capa-err:empty{display:none}
.hv-hero-nota{margin:0;max-width:40ch;font-size:var(--fs-sm);color:var(--fg-2)}
.hv-cd{display:flex;align-items:stretch;justify-content:center;margin-top:var(--space-3)}
.hv-cd-u{display:flex;flex-direction:column;align-items:center;gap:var(--space-1);padding:0 var(--space-4);border-left:1px solid var(--line)}
.hv-cd-u:first-child{border-left:0}
.hv-cd-u b{font:300 var(--fs-display)/1 var(--font-display);font-variant-numeric:tabular-nums}
.hv-cd-u:last-child b{color:var(--fg-2)}
.hv-cd-u span{font-size:var(--fs-sm);color:var(--fg-2)}
.hv-capa-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:44px;cursor:pointer}
.hv-capa-btn input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.hv-capa-btn:focus-within{outline:2px solid var(--accent-text);outline-offset:2px}
.has-foto .hv-capa-btn{position:absolute;top:var(--space-3);right:var(--space-3);padding:0 var(--space-3);border:1px solid var(--line);border-radius:var(--r-pill,999px);background:var(--noite);color:var(--fg);font-size:var(--fs-sm)}
.has-foto .hv-capa-lbl{display:none}
@media(min-width:600px){.has-foto .hv-capa-lbl{display:inline}}
@media(max-width:420px){.hv-poster-in{padding:var(--space-2) var(--space-4) var(--space-4)}.hv-cd-u{padding:0 var(--space-3)}}
.hv-next{max-width:520px;margin:0 auto;padding:var(--space-8) 0;border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2);text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--space-3)}
.hv-next p{max-width:46ch;color:var(--fg-2)}
@media(orientation:landscape) and (max-height:500px){
.hv-before{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-6);align-items:center}
.hv-before .hv-hero{padding:0;gap:var(--space-1)}
.hv-before .hv-arcwrap{width:min(140px,100%)}
.hv-before .hv-hero-n{font-size:var(--fs-display)}
.hv-before .hv-hero-t{font-size:var(--fs-lg);margin-top:0}
.hv-before .hv-next{padding:var(--space-3) 0;margin:0;border:0;gap:var(--space-2);text-align:left;align-items:flex-start}
.hv-before .hv-next h2{font-size:var(--fs-xl)}
.hv-before .hv-next p{font-size:var(--fs-sm)}
.hv-before .hv-next .hv-row{justify-content:flex-start!important}
}
.hv-rest{max-width:640px;margin:var(--space-8) auto 0}
.hv-qrow{flex-wrap:wrap} .hv-qrow .grow{flex:1 1 9rem;min-width:0} .hv-gr .grow,.hv-ck .grow{min-width:0;overflow-wrap:anywhere}
.hv-ck{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);min-height:52px} .hv-ck:last-child{border-bottom:0}
.hv-done{text-decoration:line-through;color:var(--fg-3)}
.hv-live{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:var(--space-12);align-items:center;padding:var(--space-2) 0 var(--space-8);border-bottom:1px solid var(--line-2)}
@media(max-width:860px){.hv-live{grid-template-columns:1fr;gap:var(--space-6)}}
@keyframes hv-in{from{opacity:0;transform:scale(.97)}}
.hv-new{animation:hv-in var(--dur-2) var(--ease)}
.hv-last{display:flex;flex-direction:column;gap:var(--space-2)}
.hv-last-in{background:var(--surface-2);border-radius:var(--r-2);overflow:hidden;display:grid;place-items:center}
.hv-last-in button{all:unset;display:grid;place-items:center;width:100%;cursor:pointer;box-sizing:border-box}
.hv-last-in button:focus-visible{outline:3px solid var(--accent-text);outline-offset:-3px}
.hv-last-in img{height:min(54vh,500px);width:auto;max-width:100%;object-fit:contain}
@media(max-width:860px){.hv-last-in img{height:min(36vh,300px)}}
.hv-bn{display:flex;align-items:baseline;gap:var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)} .hv-bn:last-child{border-bottom:0}
.hv-bn b{font:300 var(--fs-hero)/1 var(--font-display);letter-spacing:-.02em;min-width:2.2ch;font-variant-numeric:tabular-nums;font-weight:300}
.hv-bn span{font-size:var(--fs-md);color:var(--fg-2)} .hv-bn a{color:var(--accent-text)}
.hv-ctrl{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3) var(--space-6);padding:var(--space-4) 0;border-bottom:1px solid var(--line-2)}
.hv-ctrl .grow{min-width:0}
.hv-ctrl select{width:auto;min-width:130px}
.hv-det>summary:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
.hv-strip{display:flex;gap:var(--space-1);overflow-x:auto;padding-bottom:var(--space-2)}
.hv-strip .hv-tile{flex:none;width:84px;aspect-ratio:4/5}
.hv-cover{position:relative;display:block;width:100%;max-width:380px;border-radius:var(--r-2);overflow:hidden;background:var(--surface-2)}
.hv-cover>button{all:unset;display:block;width:100%;cursor:pointer;box-sizing:border-box}
.hv-cover>button:focus-visible{outline:3px solid var(--accent-text);outline-offset:-3px}
.hv-cover img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
@media(max-width:860px){.hv-cover img{aspect-ratio:1/1}}
.hv-play{position:absolute;left:var(--space-4);bottom:var(--space-4);width:56px;height:56px;border-radius:50%;background:var(--bg);color:var(--accent-text);display:grid;place-items:center;pointer-events:none}
.hv-rev{display:grid;grid-template-columns:minmax(0,380px) minmax(0,1fr);gap:var(--space-12);align-items:end;padding-bottom:var(--space-8);border-bottom:1px solid var(--line-2)}
@media(max-width:860px){.hv-rev{grid-template-columns:1fr;gap:var(--space-6);align-items:start}}
.hv-disclosure.ds-fold>summary{color:var(--fg-2);font-size:var(--fs-sm)}
.hv-disclosure>summary:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
.hv-photo-body{gap:var(--space-3)}
.hv-tools{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3) var(--space-4);margin-bottom:var(--space-3)}
[data-hv-tabs] .tab{padding-inline:var(--space-2)}
.hv-tools .search input{min-height:44px} .hv-tools .search{background:transparent;padding:0;min-height:44px;min-width:200px;flex:1;border-bottom:1px solid var(--line-2);border-radius:0}
.hv-tools .select{width:auto;min-width:150px;font-size:var(--fs-sm)}
.hv-ibtn{all:unset;box-sizing:border-box;cursor:pointer;width:44px;height:44px;display:inline-grid;place-items:center;color:var(--fg-3);border-radius:var(--r-1)}
.hv-ibtn[aria-pressed="true"]{color:var(--fg)} .hv-ibtn:hover{background:var(--surface)} .hv-ibtn:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
.hv-grid{display:grid;gap:var(--space-1);grid-template-columns:repeat(auto-fill,minmax(150px,1fr));grid-auto-flow:dense}
@media(max-width:600px){.hv-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.hv-tile{position:relative;overflow:hidden;background:var(--surface-2);aspect-ratio:4/5}
.hv-tile.w2{grid-column:span 2;aspect-ratio:8/5}
.hv-tile img{width:100%;height:100%;object-fit:cover;transition:opacity var(--dur)}
.hv-tile.oc img{opacity:.3}
.hv-open{all:unset;display:block;width:100%;height:100%;cursor:pointer;box-sizing:border-box}
.hv-open:focus-visible{outline:3px solid var(--accent-text);outline-offset:-3px}
.hv-sel{position:absolute;right:0;top:0;width:44px;height:44px;background:none;border:0;padding:0;display:grid;place-items:center;color:var(--papel);opacity:0;transition:opacity var(--dur)}
.hv-tile:hover .hv-sel,.hv-tile:focus-within .hv-sel,.hv-selmode .hv-sel,.hv-sel[aria-pressed="true"]{opacity:1}
@media(hover:none){.hv-sel{opacity:.85}}
.hv-sel>span{width:24px;height:24px;border-radius:50%;border:2px solid var(--papel);background:color-mix(in srgb,var(--tinta) 40%,transparent);display:grid;place-items:center}
.hv-sel[aria-pressed="true"]>span{background:var(--ac);border-color:var(--ac)}
.hv-sel svg{opacity:0} .hv-sel[aria-pressed="true"] svg{opacity:1}
.hv-sel:focus-visible>span{outline:2px solid var(--papel);outline-offset:2px}
.hv-tools{flex-wrap:wrap;min-width:0}
.hv-tools .select{max-width:100%;box-sizing:border-box}
.hv-ring{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ac)}
.hv-gp{display:flex;align-items:center;gap:var(--space-4)}
.hv-gp-av{flex:none;width:72px;height:72px;font-size:var(--fs-xl);box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ac)}
.hv-gp-st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex:1;text-align:center;gap:var(--space-2)}
.hv-gp-st b{display:block;font:350 var(--fs-title)/1 var(--font-display);font-variant-numeric:tabular-nums}
.hv-gp-st span{font-size:var(--fs-xs);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-2)}
#hv-gs .hv-row .btn{border-radius:var(--r-pill)}
.hv-qk{position:absolute;right:var(--space-2);bottom:var(--space-2);display:flex;gap:var(--space-1);opacity:0;transition:opacity var(--dur-1) var(--ease)}
.hv-tile:hover .hv-qk,.hv-tile:focus-within .hv-qk{opacity:1}
@media(hover:none){.hv-qk{opacity:1}}
.hv-selmode .hv-qk{display:none}
.hv-qkb{display:grid;place-items:center;width:44px;height:44px;border:0;border-radius:50%;background:var(--bg);color:var(--fg);box-shadow:0 2px 10px color-mix(in srgb,var(--noite) 35%,transparent);cursor:pointer}
.hv-qkb.ok{background:var(--ac);color:var(--on-ac)}
.hv-qkb:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
.hv-tile:has(.hv-qk) .hv-tag{bottom:auto;top:var(--space-2)}
.hv-tag{position:absolute;left:var(--space-2);bottom:var(--space-2);background:var(--bg);color:var(--fg);padding:var(--space-1) var(--space-2);border-radius:var(--r-pill);font-size:var(--fs-xs);font-weight:500;pointer-events:none}
.hv-tile.selected{outline:3px solid var(--ac);outline-offset:-3px}
.hv-thumb{width:44px;height:56px;border-radius:var(--r-1);overflow:hidden;background:var(--surface-2);flex:none}
.hv-thumb img{width:100%;height:100%;object-fit:cover}
.hv-sec .flex.between>div,.hv-rest .flex.between>div{min-width:0}
.hv-nudge{max-width:640px;margin:var(--space-6) auto 0;text-align:center}
#hv-bulk{display:contents}
.hv-bulk{position:sticky;bottom:var(--space-4);z-index:25;display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;background:var(--fg);color:var(--bg);padding:var(--space-2) var(--space-3) var(--space-2) var(--space-5);border-radius:var(--r-pill);box-shadow:var(--shadow-pop);margin-top:var(--space-4)}
.hv-bulk .btn{background:transparent;color:inherit;border-color:color-mix(in srgb,var(--bg) 35%,var(--fg))}
.hv-bulk .btn:hover{background:color-mix(in srgb,var(--bg) 14%,var(--fg))}
.hv-bulk .btn.pri{background:var(--bg);color:var(--fg);border-color:var(--bg)}
@media(max-width:900px){.hv-bulk{bottom:76px}}
.hv-cm{display:flex;gap:var(--space-2);align-items:flex-start;padding:var(--space-2) 0;border-bottom:1px solid var(--line-2);font-size:var(--fs-sm)}
.modal.hv-lbm{left:0;top:0;transform:none;width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:0;background:var(--noite);color:var(--papel);box-shadow:none;overflow:hidden;animation:fade var(--dur-3) var(--ease)}
.hv-lbm .modal-head{position:absolute;left:0;right:0;top:0;z-index:3;margin:0;padding:var(--space-3) var(--space-4);align-items:center}
.hv-lbm .modal-head h2{font:500 var(--fs-xs) var(--font-body);color:var(--fg-3);letter-spacing:.04em}
.hv-lbm .modal-body{height:100%}
.hv-lb{height:100dvh;display:grid;grid-template-rows:minmax(0,1fr) auto}
.hv-lb-stage{position:relative;display:grid;place-items:center;padding:var(--space-16) var(--space-16) var(--space-2);min-height:0}
.hv-lb-img{display:grid;place-items:center;height:100%;width:100%;min-height:0}
.hv-lb-img{position:relative} .hv-lb-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.hv-lb-nav{position:absolute;top:0;bottom:0;margin-block:auto;width:56px;height:56px;border-radius:50%;border:0;background:transparent;color:var(--papel);display:grid;place-items:center}
.hv-lb-nav:hover{background:color-mix(in srgb,var(--papel) 12%,var(--noite))} .hv-lb-nav[disabled]{opacity:.25;pointer-events:none}
.hv-lb-nav.pv{left:8px} .hv-lb-nav.nx{right:8px}
.hv-lb-bar{padding:var(--space-3) var(--space-6) calc(var(--space-4) + env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:var(--space-3) var(--space-6);align-items:center;justify-content:space-between;border-top:1px solid var(--line-2);max-height:34dvh;overflow:auto}
.hv-lb-who{display:flex;flex-direction:column;gap:var(--space-1);min-width:0}
.hv-lb-who .t-small{color:var(--fg-3)}
.hv-lb-act{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}
.hv-lbm .btn-line{border-color:var(--line)} .hv-lbm .btn-quiet{color:var(--fg-2)}
.hv-lbm .btn-primary{background:var(--ac);color:var(--noite)}
.hv-grid{gap:var(--space-2)}
.hv-tile{border-radius:var(--r-3)}
.hv-lbm .modal-head h2{--p:0}
.hv-lbm .modal-head h2::after{content:"";display:block;width:120px;height:3px;margin-top:var(--space-2);border-radius:var(--r-pill);background:linear-gradient(90deg,var(--ac) calc(var(--p) * 1%),var(--line) 0)}
.hv-lb-bar{border-top:0;background:linear-gradient(0deg,var(--noite) 60%,transparent)}
.hv-lbm .hv-lb-act .btn{border-radius:var(--r-pill);min-height:52px;padding:0 var(--space-5)}
.hv-lbm .hv-lb-act .btn-primary{padding:0 var(--space-8);font-weight:600}
.hv-live{padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-last-in{border-radius:var(--r-3);background:var(--noite)}
.hv-bn{padding:var(--space-4);margin-bottom:var(--space-2);background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-3)}
.hv-bn:last-child{border-bottom:1px solid var(--line-2);margin-bottom:0}
.hv-ctrl{padding:var(--space-4);margin-top:var(--space-4);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3)}
#hv-queue .btn-sm{border-radius:var(--r-pill);min-width:44px}
#hv-queue .li .btn-line{background:var(--ac);border-color:var(--ac);color:var(--on-ac);font-weight:600}
#hv-queue .li .btn-quiet{border:1px solid var(--line)}
.hv-poster{border-radius:var(--r-4)}
.hv-poster::before{content:"";position:absolute;left:0;right:0;bottom:0;height:58%;z-index:-1;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);-webkit-mask-image:linear-gradient(180deg,transparent,black 55%);mask-image:linear-gradient(180deg,transparent,black 55%);pointer-events:none}
.hv-before .hv-next{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-pv{padding:var(--space-4);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-lower>.hv-rest{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-lower>.hv-rest.ds-fold,.hv-lower>details.hv-rest{padding:var(--space-2) var(--space-5)}
.hv-lower>p.hv-rest{padding:0;background:none;border:0}
.hv-fun{gap:var(--space-3);padding:var(--space-2) 0 var(--space-6);align-items:stretch}
.hv-fun-i{flex:1 1 9rem;padding:var(--space-4) var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-fun-i:last-child{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 8%,var(--bg))}
.hv-fun-i b{font-size:var(--fs-title)}
.hv-fun-a{display:none}
.stack-5>section.hv-sec .li{background:var(--bg)}
.stack-5>section.hv-sec{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-chkp{height:8px;margin-top:var(--space-3);border-radius:var(--r-pill);overflow:hidden}
.hv-chkp i{border-radius:inherit}
.hv-ck{padding:var(--space-3);margin-top:var(--space-2);background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-3)}
.hv-ck:last-child{border-bottom:1px solid var(--line-2)}
.hv-ck .pos{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,var(--ac) 16%,transparent);color:var(--accent-text)}
.hv-lb-cm{width:100%}
.hv-lb-cm.ds-fold>summary{font-size:var(--fs-sm);color:var(--fg-2)}
@media(max-width:700px){.hv-lb-stage{padding:var(--space-12) var(--space-2) var(--space-1)}.hv-lb-nav{width:44px;height:44px;background:color-mix(in srgb,var(--noite) 55%,transparent)}.hv-lb-nav.pv{left:4px}.hv-lb-nav.nx{right:4px}.hv-lb-bar{padding:var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom))}}
.hv-bar{height:8px;border-radius:4px;background:var(--line-2);overflow:hidden;flex:1} .hv-bar>i{display:block;height:100%;background:var(--ac)}
.hv-tline{position:relative;height:6px;border-radius:3px;background:var(--line-2);margin:var(--space-5) 0 var(--space-3)} .hv-tline>i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:var(--ac)}
.hv-tline>b{position:absolute;top:-5px;width:2px;height:16px;background:var(--fg-3)}
.hv-dl{display:grid;grid-template-columns:auto 1fr;gap:var(--space-2) var(--space-4);margin:0;font-size:var(--fs-sm)} .hv-dl dt{color:var(--fg-3)} .hv-dl dd{margin:0}
.hv-fun{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--space-3) var(--space-6);padding:var(--space-2) 0 var(--space-8)}
.hv-fun-i{display:flex;flex-direction:column;gap:var(--space-2)}
.hv-fun-i b{font:300 var(--fs-display)/1 var(--font-display);letter-spacing:-.02em;font-variant-numeric:tabular-nums;font-weight:300}
.hv-fun-i span{font-size:var(--fs-sm);color:var(--fg-3)}
.hv-fun-a{color:var(--fg-3);padding-bottom:20px;display:flex}
@media(max-width:600px){.hv-fun-a{display:none}.hv-fun{gap:var(--space-4) var(--space-6)}.hv-fun-i{min-width:calc(50% - var(--space-6))}}
.hv-gr .n{font:300 var(--fs-title)/1 var(--font-display);min-width:3ch;text-align:right;font-variant-numeric:tabular-nums}
.hv-gr .ini{font:400 var(--fs-xs) var(--font-body);color:var(--fg-3);width:28px;flex:none}
.app:has(.hv-pg) .btn.top-cta{background:transparent;color:var(--fg-2);border-color:var(--line)} .app:has(.hv-pg) .btn.top-cta:hover{background:var(--surface)}
.hv-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);grid-template-areas:"a p" "l p";gap:0 var(--space-12);align-items:start}
.hv-top .hv-before{grid-area:a;min-width:0} .hv-top .hv-pv{grid-area:p} .hv-top .hv-lower{grid-area:l;min-width:0}
.hv-lower>.hv-rest{max-width:none;margin:var(--space-6) 0 0} .hv-lower .hv-nudge{margin-inline:0;text-align:left}
@media(max-width:900px){.hv-top{grid-template-columns:minmax(0,1fr);grid-template-areas:"a" "p" "l";gap:var(--space-8) 0}}
.hv-pg [tabindex="-1"]:focus{outline:none}
.hv-lnk{display:inline-flex;align-items:center;min-height:44px}
.hv-khint{display:block}
@media(hover:none),(max-width:900px){.hv-khint{display:none}}
.hv-pv{display:flex;flex-direction:column;gap:var(--space-3)} .hv-pv .hcr-pv{position:relative;isolation:isolate;border:1px solid color-mix(in srgb,var(--fg) 10%,transparent);border-radius:var(--r-4,28px);box-shadow:0 1px 0 color-mix(in srgb,var(--papel) 10%,transparent) inset,0 22px 44px -24px color-mix(in srgb,var(--noite) 55%,transparent)}
.hv-pv .hcr-cover{aspect-ratio:16/10} .hv-pv .hcr-pv-t{font-size:var(--fs-xl)}
.hv-pv .hcr-pv .btn-accent{border-radius:999px;min-height:48px;font-weight:600}
.hv-pv .hcr-pv-meta{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-4);margin:0} .hv-pv .hcr-pv-meta span{display:inline-flex;align-items:center;gap:var(--space-2);min-width:0}
.hv-pv .hcr-pv[data-theme="noite"]{display:flex;flex-direction:column;justify-content:flex-end;aspect-ratio:4/5;max-height:34rem;background:var(--noite)}
.hv-pv .hcr-pv[data-theme="noite"] .hcr-cover{position:absolute;inset:0;aspect-ratio:auto;z-index:-2}
.hv-pv .hcr-pv[data-theme="noite"]::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,transparent 30%,color-mix(in srgb,var(--noite) 58%,transparent) 55%,color-mix(in srgb,var(--noite) 94%,transparent) 100%)}
.hv-pv .hcr-pv[data-theme="noite"] .hcr-pv-body{padding:var(--space-8) var(--space-5) var(--space-5);gap:var(--space-2);background:none}
.hv-pv .hcr-pv[data-theme="noite"] .hcr-pv-body>.t-small:first-child{font-size:var(--fs-xs);letter-spacing:.16em;text-transform:uppercase;color:var(--fg-2)}
.hv-pv .hcr-pv[data-theme="noite"] .hcr-pv-t{font-size:clamp(var(--fs-xl),3.4vw,var(--fs-title));line-height:1.08;text-wrap:balance}
.hv-pv .hcr-pv[data-theme="noite"] .hcr-pv-meta{color:var(--fg-2)}
.hv-pv .hcr-pv[data-theme="noite"] .btn-accent{margin-top:var(--space-3)!important}
@media(min-width:901px){.hv-pv{position:sticky;top:var(--space-6)}}
.hv-sd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-2);padding:var(--space-3) 0 var(--space-8)}
.hv-sd .hv-arcwrap{width:min(280px,100%)}
.hv-sd h1{font:350 var(--fs-display)/1.1 var(--font-display);letter-spacing:-.015em;text-wrap:balance;overflow-wrap:anywhere}
.hv-risk{margin-top:var(--space-12);padding-top:var(--space-6);border-top:1px solid var(--line);display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-2)}
.hv-risk p{max-width:56ch}
.hv-keys{margin-top:var(--space-3)} .hv-keys.ds-fold>summary{color:var(--fg-3);font-size:var(--fs-sm)}
@media(hover:none),(max-width:900px){.hv-keys{display:none}}
.hv-cnt{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--space-2) var(--space-4)}
.hv-cnt .act{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-1)}
.hv-sk-chips{height:44px;margin-bottom:var(--space-3)} .hv-sk-chips.t{height:10px}.hv-sk-chips.u{height:33px}.hv-sk-chips.m{display:none} @media(max-width:600px){.hv-sk-chips.m{display:block}} .hv-sk-row{height:56px;margin-bottom:var(--space-2)}
.hv-sk-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:var(--space-12)} .hv-sk-top .a{height:320px} .hv-sk-top .b{height:400px}
@media(max-width:900px){.hv-sk-top{grid-template-columns:minmax(0,1fr);gap:var(--space-8)}}
.hv-lb-risk{margin-left:auto}
.hv-imp-t{min-height:128px}
.hv-ir{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:var(--space-2) var(--space-3);padding:var(--space-1) 0;border-bottom:1px solid var(--line-2)}
.hv-ir .check{min-width:44px;min-height:44px;justify-content:center;align-items:center}
.hv-ir .input{min-height:44px}
.hv-ir .badge{white-space:nowrap}
@media(max-width:480px){.hv-ir{grid-template-columns:44px minmax(0,1fr)}.hv-ir .badge{grid-column:2}}
.hv-iscroll{max-height:min(40vh,360px);overflow:auto;border-top:1px solid var(--line-2);background:var(--elev-1)}
.hv-ibanner{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-4);padding:var(--space-3) var(--space-4);border-radius:var(--r-2);background:var(--elev-2)}
.hv-ibanner .grow{min-width:12rem}
.hv-gdanger{display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-2);padding-top:var(--space-4);border-top:1px solid var(--line)}
.hv-bulk .grow{min-width:0}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){
.hv-ibtn:not([aria-pressed="true"]):hover{background:transparent}
.hv-grid:not(.hv-selmode) .hv-tile:hover:not(:focus-within) .hv-sel:not([aria-pressed="true"]){opacity:.85}
.hv-bulk .btn:hover{background:transparent}
.hv-lb-nav:hover{background:transparent}
.app:has(.hv-pg) .btn.top-cta:hover{background:transparent}
}
/* v212 — Hoje (depois): passos em cartões numerados, linha do tempo em cartão */
.hv-steps{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);margin-top:var(--space-6)}
@media(min-width:900px){.hv-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
.app .hv-step{position:relative;display:flex;gap:var(--space-4);align-items:flex-start;margin:0;padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-stn{display:grid;place-items:center;flex:none;width:var(--space-8);height:var(--space-8);border-radius:50%;background:var(--ac);color:var(--on-ac);font-weight:600;font-size:var(--fs-sm)}
.hv-step .stack-3{flex:1;min-width:0}
.hv-step .btn{border-radius:var(--r-pill)}
.hv-disclosure .hv-stn{display:none}
.hv-disclosure .hv-step{border:0;padding:0;background:none}
.app .hv-sec:has(.hv-tline){padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);margin-top:var(--space-6)}
.app .hv-risk{padding:var(--space-5);border:1px solid color-mix(in srgb,var(--crit-text) 30%,var(--line-2));border-radius:var(--r-4);background:var(--surface)}
.hv-rev{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-rev .btn{border-radius:var(--r-pill)}
.hv-cover img{border-radius:var(--r-3)}
.app .hv-rev{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6);align-items:center;margin:0}
.app .hv-rev .hv-cover{width:100%;max-width:15rem;margin:0}
.app .hv-rev .hv-cover img{aspect-ratio:4/5;object-fit:cover;width:100%}
@media(min-width:760px){.app .hv-rev{grid-template-columns:15rem minmax(0,1fr)}}
/* v243 — Fotos em masonry estilo Pinterest: colunas, proporções reais, cantos grandes */
.hv-grid{display:block;column-width:210px;column-gap:var(--space-3);grid-template-columns:none}
@media(max-width:600px){.hv-grid{column-count:2;column-width:auto;column-gap:var(--space-2)}}
.hv-grid>.hv-tile{display:block;break-inside:avoid;margin:0 0 var(--space-3);border-radius:var(--r-3);aspect-ratio:3/4;transition:transform var(--dur-2) var(--ease),box-shadow var(--dur-2) var(--ease)}
@media(max-width:600px){.hv-grid>.hv-tile{margin-bottom:var(--space-2);border-radius:var(--r-2)}}
.hv-grid>.hv-tile.w2{grid-column:auto;aspect-ratio:4/3}
.hv-grid>.hv-tile.r-p:nth-child(3n){aspect-ratio:2/3}
.hv-grid>.hv-tile.r-p:nth-child(4n+2){aspect-ratio:4/5}
.hv-grid>.hv-tile.r-l{aspect-ratio:4/3}
@media(hover:hover){.hv-grid>.hv-tile:hover{transform:translateY(-2px);box-shadow:0 14px 28px -10px color-mix(in srgb,var(--tinta) 30%,transparent)}}
@media(prefers-reduced-motion:reduce){.hv-grid>.hv-tile{transition:none}.hv-grid>.hv-tile:hover{transform:none}}

/* v243 — Hoje (durante) em painel de duas colunas: ao vivo e fila à esquerda, controles em cartões à direita */
.hv-dash{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-5);align-items:start}
@media(min-width:1180px){.hv-dash{grid-template-columns:minmax(0,1fr) 23rem;gap:var(--space-6)}.hv-dash-side{position:sticky;top:var(--space-16)}}
.hv-dash-main,.hv-dash-side{display:flex;flex-direction:column;gap:var(--space-5);min-width:0}
.hv-dash-side>*{margin:0;padding:var(--space-4) var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-dash-side>details{padding:var(--space-2) var(--space-5)}
.hv-dash .hv-live .hv-bn{font-size:clamp(var(--fs-xl),2.4vw,var(--fs-hero));white-space:nowrap}
.hv-dash-main>.hv-sec{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);margin:0}

/* v243 — Convidados em grade de duas colunas no desktop */
@media(min-width:1100px){.app .list:has(>.hv-gr){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2) var(--space-3)}.app .list:has(>.hv-gr)>.hv-gr{margin:0}}

/* v272 — Hoje mobile first: ação primária no topo, checklist antes da prévia, ao vivo compacto, depois enxuto */
@media(max-width:900px){
  .hv-top{display:flex;flex-direction:column;gap:var(--space-5)}
  .hv-top>.hv-before{order:0} .hv-top>.hv-lower{order:1} .hv-top>.hv-pv{order:2}
  .hv-before .hv-next{order:-1;margin:0;padding:var(--space-4) var(--space-5);text-align:left;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
  .hv-before .hv-next h2{font-size:var(--fs-xl);line-height:1.15;margin:0}
  .hv-before .hv-next p{margin:var(--space-1) 0 var(--space-3);font-size:var(--fs-sm);color:var(--fg-2)}
  .hv-before .hv-next .hv-row{justify-content:flex-start!important} .hv-before .hv-next .btn-lg{width:100%}
}
@media(max-width:600px){
  .hv-dash .hv-live{grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
  .hv-dash .hv-last-in img{width:100%;max-height:15rem;object-fit:cover}
  .hv-dash .hv-live>div:last-child{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
  .hv-dash .hv-live .hv-bn{flex-direction:column;align-items:flex-start;gap:var(--space-1);padding:var(--space-3)}
  .hv-dash .hv-live .hv-bn b{font-size:var(--fs-xl)} .hv-dash .hv-live .hv-bn{min-width:0;overflow:hidden} .hv-dash .hv-live .hv-bn span{font-size:var(--fs-xs);line-height:1.25;white-space:normal;overflow-wrap:anywhere;min-width:0}
  .app .hv-rev .hv-cover{max-width:9rem}
  .hv-ck{flex-wrap:wrap} .hv-ck>.grow{flex:1 1 0;min-width:10rem} .hv-ck>.flex{flex:1 1 100%;padding-left:calc(20px + var(--space-3))}
}

/* v280 — revisão por deslizar: cartão acompanha o dedo, rótulos Aprovar/Ocultar aparecem conforme o arrasto */
.hv-lb-img{position:relative;touch-action:pan-y;--sw:0;will-change:transform}
.hv-sw{position:absolute;top:var(--space-5);padding:var(--space-2) var(--space-4);border-radius:var(--r-pill);font:700 var(--fs-md) var(--font-body);letter-spacing:.04em;text-transform:uppercase;opacity:0;pointer-events:none;border:2px solid currentColor;background:color-mix(in srgb,var(--noite) 55%,transparent)}
.hv-sw-ap{left:var(--space-5);color:var(--positivo);rotate:-8deg} .hv-sw-oc{right:var(--space-5);color:var(--crit-text);rotate:8deg}
.hv-lb-img[data-dir=ap] .hv-sw-ap{opacity:var(--sw)} .hv-lb-img[data-dir=oc] .hv-sw-oc{opacity:var(--sw)}
.hv-sw-hint{display:none;margin:0;text-align:center;font-size:var(--fs-xs);color:var(--fg-3)}
@media(pointer:coarse){.hv-sw-hint{display:block}}

.hv-flag{padding:var(--space-2) var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.hv-flag>summary{min-height:44px;display:flex;align-items:center}

/* v285 — Convidados mobile first: ações compactas, linha em grade sem nome quebrado */
@media(max-width:600px){
  .page-head .btn:has(.hv-lbl){min-width:44px;padding-inline:var(--space-3)} .page-head .hv-lbl{display:none}
  .hv-gr{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;grid-template-areas:"av name n chev" "av badge n chev";align-items:center;column-gap:var(--space-3);row-gap:2px}
  .hv-gr>.avatar{grid-area:av} .hv-gr>.grow{grid-area:name;min-width:0} .hv-gr>.badge{grid-area:badge;justify-self:start} .hv-gr>.n{grid-area:n} .hv-gr>svg{grid-area:chev}
  .hv-gr>.grow b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .modal .stack>.stack-2:has(.hv-row){position:sticky;bottom:0;z-index:2;margin:0 calc(-1 * var(--space-5));padding:var(--space-3) var(--space-5) calc(var(--space-3) + env(safe-area-inset-bottom));background:var(--elev-3);border-top:1px solid var(--line-2)}
}

.modal .hv-grid{display:grid;column-width:auto;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:var(--space-2)}
.modal .hv-grid>.hv-tile{margin:0;aspect-ratio:4/5!important}

/* v400 — varredura: faixa ao vivo cabe na coluna do painel (desktop) */
@media(min-width:901px){.hv-dash .hv-live{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-6)}.hv-dash .hv-live>*{min-width:0}.hv-dash .hv-last-in,.hv-dash .hv-last-in img{max-width:100%}.hv-dash .hv-live .hv-bn{flex-wrap:wrap;min-width:0}}

/* v420 — ficha do convidado como inspetor à direita no desktop; no celular continua folha */
@media(min-width:1100px){
  .modal.hv-insp{left:auto;right:var(--space-3);top:var(--space-3);bottom:auto;transform:none;width:26rem;max-height:calc(100dvh - var(--space-6));height:auto;border-radius:var(--r-4);animation:hv-insp-in .24s var(--ease)}
  .modal.hv-insp .hv-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@keyframes hv-insp-in{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.modal.hv-insp{animation:none}}

`;
  const st = document.createElement('style'); st.id = 'hv-style'; st.textContent = css; document.head.append(st);

  /* ---------- helpers de dados ---------- */
  const EV = (id) => A.data.events.find((e) => e.id === id) || A.data.events[0];
  const PH = (id) => A.when(id).phase;
  const ROLE = () => A.sim().role;
  const base = (id) => A.hostBase(id);
  const get = (n, id, d) => ST.get(`hv.${n}.${id}`, d);
  const put = (n, id, v) => ST.set(`hv.${n}.${id}`, v);
  const upd = (n, id, fn, d) => ST.update(`hv.${n}.${id}`, fn, d);
  const hhmm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const startMin = (ev) => { const [h, m] = (ev.hora || '18:00').split(':'); return +h * 60 + +m; };
  const toMin = (s) => { const [h, m] = String(s || '0:0').split(':'); return +h * 60 + +m; };
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nudge = (ctxName, ev) => (ev && ev.plano === 'completo') || !(A.plan && A.plan.nudge) ? '' : A.plan.nudge(ctxName) || '';
  const plural = (n, a, b) => (n === 1 ? a : b);
  const iniciais = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const curId = () => (location.hash.match(/\/h\/e\/([^/?]+)/) || [])[1] || 'e1';
  const LBL = { aprovada: 'Aprovada', revisar: 'Para revisar', oculta: 'Oculta' };
  const MOT = ['Possível pessoa desfocada', 'Conteúdo sensível?', 'Duplicada', 'Menor de idade identificado?'];
  const CT = ['Que foto linda!', 'Olha a cara de todo mundo', 'Essa ficou demais', 'Quero uma cópia dessa', 'Que noite boa', 'Impagável', 'Alguém me marca nessa?', 'Guardei essa'];
  const BASE = { photos: JSON.parse(JSON.stringify(A.data.photos)), guests: JSON.parse(JSON.stringify(A.data.guests)) };
  const LOAD = Date.now();

  /* ---------- modelo: reaplica o store sobre os dados-base ---------- */
  const cache = {};
  function compute(id) {
    const ev = EV(id), phase = PH(id), over = get('ph', id, {}), ex = get('ex', id, []), gu = get('gu', id, {}), wipe = get('wipe', id, false);
    const now = startMin(ev) + 250;
    let ph = [];
    if (phase !== 'antes' && !wipe) {
      ph = BASE.photos.map((p) => { const q = Object.assign({}, p, { ck: now - p.min }); let a = +q.autor.slice(1); while (BASE.guests[a % BASE.guests.length].status === 'convidado') a++; q.autor = 'g' + (a % BASE.guests.length); if (id !== 'e1') { q.n = p.n + 200; if (q.status === 'revisar') { q.status = 'aprovada'; q.motivo = ''; q.telao = true; } } return q; });
      if (id === 'e1') ph = ph.concat(ex.map((x) => Object.assign({}, x)));
    }
    ph = ph.map((p) => Object.assign(p, over[p.id] || {})).filter((p) => p.status !== 'removida');
    ph.sort((a, b) => b.ck - a.ck || b.n - a.n);
    const gl = get('gl', id, []).map((x) => ({ id: x.id, nome: x.nome, primeiro: x.nome.split(' ')[0], ini: iniciais(x.nome), fotos: 0, missoes: 0, entrou: 999, status: 'convidado', mesa: 0, consentiu: false, importado: true, lote: x.lote }));
    const bg = (ev._x ? [] : id === 'e3' ? BASE.guests.slice(0, 14) : BASE.guests).concat(gl); const byA = {};
    ph.forEach((p) => (byA[p.autor] = byA[p.autor] || []).push(p));
    const guests = bg.map((b) => {
      const o = gu[b.id] || {}, mine = byA[b.id] || [];
      const bloq = o.bloq !== undefined ? o.bloq : b.status === 'bloqueado';
      const entered = phase !== 'antes' && (b.status !== 'convidado' || mine.length > 0 || !!o.entrou);
      const miss = [...new Set(mine.filter((p) => p.missao).map((p) => p.missao))];
      const st2 = bloq ? 'bloqueado' : !entered ? 'nao' : mine.length ? 'fotografou' : 'entrou';
      return Object.assign({}, b, { bloq, entered, nf: mine.length, fotos: mine.length, miss, missoes: miss.length, st2, oculto: !!o.oculto, convites: o.convites || 0, ck: o.ck || now - Math.min(b.entrou, 245), status: bloq ? 'bloqueado' : entered ? 'ativo' : 'convidado' });
    });
    return { photos: ph, guests, gmap: Object.fromEntries(guests.map((g) => [g.id, g])), pmap: Object.fromEntries(ph.map((p) => [p.id, p])) };
  }
  function model(id) {
    const sig = [PH(id), get('ph', id, {}), get('ex', id, []), get('gu', id, {}), get('wipe', id, false), get('gl', id, []), !!EV(id)._x];
    const key = JSON.stringify(sig); const c = cache[id];
    if (c && c.key === key) return c.m;
    const m = compute(id); cache[id] = { key, m }; return m;
  }
  /* o evento e1 reflete o store em A.data.* (o menu e outras superfícies leem daqui) */
  Object.defineProperty(A.data, 'photos', { configurable: true, get: () => model('e1').photos, set() {} });
  Object.defineProperty(A.data, 'guests', { configurable: true, get: () => model('e1').guests, set() {} });
  const P = (id) => model(id).photos;
  const G = (id) => model(id).guests;
  const gname = (id, gid) => (model(id).gmap[gid] || { nome: 'Convidado' }).nome;
  const mtitle = (mid) => (A.data.missions.find((m) => m.id === mid) || {}).titulo || '';
  const agoOf = (p) => (p.t ? A.ago(Math.floor((Date.now() - p.t) / 60000)) : '');

  function stats(id) {
    const ev = EV(id), ph = P(id), gs = G(id), phase = PH(id);
    const entraram = gs.filter((g) => g.entered).length, foto = gs.filter((g) => g.nf > 0).length;
    const noAr = ph.filter((p) => p.status === 'aprovada').length, pend = ph.filter((p) => p.status === 'revisar').length;
    const actual = get('actual', id, null), denom = actual || ev.esperados;
    return { ev, phase, entraram, foto, noAr, pend, total: ph.length, ativos: gs.filter((g) => g.entered && !g.bloq).length, actual, denom, part: denom ? Math.round((foto / denom) * 100) : 0, abriram: phase === 'antes' ? 0 : Math.round(entraram * 1.3), destaques: ph.filter((p) => p.status === 'aprovada' && p.curtidas >= 15).length };
  }

  /* ---------- utilidades de interface ---------- */
  let CUR = null; let TM = []; const clearTimers = () => { TM.forEach(clearInterval); TM = []; };
  window.addEventListener('hashchange', clearTimers);
  const redraw = () => { if (CUR && CUR.draw) CUR.draw(); };
  function setRegion(sel, html) {
    const el = A.$(sel); if (!el) return; const a = document.activeElement; const fk = a && el.contains(a) ? a.dataset.fk : null;
    el.innerHTML = html; if (fk) { const n = el.querySelector(`[data-fk="${fk}"]`); n && n.focus({ preventScroll: true }); }
  }
  function refreshBadge() {
    const pend = P('e1').filter((p) => p.status === 'revisar').length;
    const a = A.$('.rail .nav a[href$="/e1/fotos"]');
    if (a) { let b = A.$('.pill-count', a); if (pend) { if (!b) { b = document.createElement('span'); b.className = 'pill-count'; a.append(b); } b.textContent = pend; b.setAttribute('aria-label', pend + ' pendentes'); } else if (b) b.remove(); }
    const t = A.$('.tabbar a[href$="/e1/fotos"]');
    if (t) { let d = A.$('.dot', t); if (pend && !d) { d = document.createElement('i'); d.className = 'dot'; t.append(d); } else if (!pend && d) d.remove(); }
  }
  const UNDO = [];
  function withUndo(msg, fn) { const ent = { fn, msg, t: Date.now() }; UNDO.push(ent); if (UNDO.length > 20) UNDO.shift(); A.toast(msg, { undo: () => { const i = UNDO.indexOf(ent); if (i >= 0) UNDO.splice(i, 1); fn(); } }); }
  function undoLast() { const u = UNDO.pop(); if (!u) return A.toast('Nada para desfazer.'); u.fn(); A.toast('Desfeito.'); }
  function dl(name, text, type = 'text/csv;charset=utf-8') { const b = new Blob(['﻿' + text], { type }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
  const redirect = (to) => () => ({ title: '', html: '', after: () => location.replace(location.pathname + location.search + '#' + to) });
  const badge = (s) => `<span class="badge ${s === 'aprovada' ? 'ok' : s === 'revisar' ? 'warn' : ''}">${LBL[s] || s}</span>`;
  const sw = (on, act, label, fk, extra = '') => `<button class="switch" role="switch" aria-checked="${!!on}" aria-label="${E(label)}" data-act="${act}" data-fk="${fk}" ${extra}></button>`;
  const stateWrap = (id, ok, emptyOpt) => A.stateful({ ok, empty: A.emptyState(emptyOpt), isEmpty: () => false });

  /* ---------- mutações de fotos ---------- */
  function afterChange(id) { refreshBadge(); redraw(); lbRefresh(); }
  function setPhotos(id, ids, patchFn, msg, opts = {}) {
    const m = model(id); const cur = get('ph', id, {}); const before = {};
    ids.forEach((i) => (before[i] = cur[i] ? JSON.parse(JSON.stringify(cur[i])) : null));
    const patches = {}; ids.forEach((i) => { const p = m.pmap[i]; if (p) patches[i] = patchFn(p); });
    upd('ph', id, (o) => { Object.keys(patches).forEach((i) => (o[i] = Object.assign({}, o[i], patches[i]))); return o; }, {});
    afterChange(id);
    if (opts.noUndo) { msg && A.toast(msg); return; }
    withUndo(msg, () => { upd('ph', id, (o) => { ids.forEach((i) => { if (before[i]) o[i] = before[i]; else delete o[i]; }); return o; }, {}); afterChange(id); });
  }
  const approve = (id, ids) => { const n = ids.length; setPhotos(id, ids, () => ({ status: 'aprovada', telao: true, motivo: '' }), n === 1 ? 'Foto aprovada. Já pode aparecer no telão.' : `${n} fotos aprovadas.`); };
  const hide = (id, ids) => { const n = ids.length; setPhotos(id, ids, () => ({ status: 'oculta', telao: false, motivo: '' }), n === 1 ? 'Foto oculta. Ninguém mais vê.' : `${n} fotos ocultas. Ninguém mais vê.`); };
  const restore = (id, ids) => setPhotos(id, ids, () => ({ status: 'aprovada', telao: true }), ids.length === 1 ? 'Foto restaurada.' : `${ids.length} fotos restauradas.`);
  async function removeForever(id, ids) {
    const n = ids.length;
    const ok = await A.confirm({ title: n === 1 ? 'Remover esta foto de vez?' : `Remover ${n} fotos de vez?`, body: 'Elas somem do álbum, do telão e de tudo que os convidados veem. Não dá para desfazer.', confirm: 'Remover de vez', danger: true });
    if (!ok) return false;
    const sel = SEL(id); ids.forEach((i) => sel.delete(i));
    setPhotos(id, ids, () => ({ status: 'removida' }), n === 1 ? 'Foto removida.' : `${n} fotos removidas.`, { noUndo: true }); return true;
  }

  /* ---------- gráfico por hora ---------- */
  function chart(id) {
    const ev = EV(id), ph = P(id), s0 = Math.floor(startMin(ev) / 60), hrs = [0, 1, 2, 3, 4].map((i) => s0 + i);
    const cnt = hrs.map((h) => ph.filter((p) => Math.floor(p.ck / 60) === h).length), mx = Math.max(1, ...cnt), bw = 40, gap = (320 - 5 * bw) / 6;
    const best = cnt.indexOf(Math.max(...cnt));
    const desc = hrs.map((h, i) => `${h % 24}h: ${cnt[i]}`).join('; ');
    const bars = cnt.map((c, i) => { const x = Math.round(gap + i * (bw + gap)), h = Math.round((c / mx) * 76), y = 94 - h; return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 2)}" rx="4" style="fill:var(--ac);opacity:${i === best && c ? 1 : 0.55}"/><text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" style="fill:var(--fg-2);font-size:var(--fs-xs)">${c}</text><text x="${x + bw / 2}" y="112" text-anchor="middle" style="fill:var(--fg-3);font-size:var(--fs-xs)">${hrs[i] % 24}h</text>`; }).join('');
    return { svg: `<svg viewBox="0 0 320 120" role="img" aria-label="Fotos por hora. ${E(desc)}" style="width:100%;height:auto">${bars}</svg>`, peak: ph.length ? `${hrs[best] % 24}h` : '—', cnt, hrs };
  }

  /* ---------- fotos: estado da tela ---------- */
  const V = {}; const vs = (id) => (V[id] = V[id] || { f: 'todas', q: '', sort: 'recentes', view: 'grade', mis: '', gue: '', gtab: 'lista', gq: '', gf: 'todos', gsort: 'fotos' });
  const SELS = {}; const SEL = (id) => (SELS[id] = SELS[id] || new Set());
  function filtered(id) {
    const v = vs(id); let l = P(id).slice();
    if (v.f === 'revisar') l = l.filter((p) => p.status === 'revisar');
    else if (v.f === 'aprovadas') l = l.filter((p) => p.status === 'aprovada');
    else if (v.f === 'ocultas') l = l.filter((p) => p.status === 'oculta');
    else if (v.f === 'telao') l = l.filter((p) => p.status === 'aprovada' && p.telao);
    else if (v.f === 'missao') l = l.filter((p) => p.missao && (!v.mis || p.missao === v.mis));
    else if (v.f === 'convidado') l = l.filter((p) => !v.gue || p.autor === v.gue);
    const q = norm(v.q.trim());
    if (q) l = l.filter((p) => norm(gname(id, p.autor) + ' ' + mtitle(p.missao) + ' ' + p.motivo + ' ' + LBL[p.status]).includes(q));
    if (v.sort === 'antigas') l.sort((a, b) => a.ck - b.ck || a.n - b.n);
    else if (v.sort === 'curtidas') l.sort((a, b) => b.curtidas - a.curtidas || b.ck - a.ck);
    else if (v.sort === 'convidado') l.sort((a, b) => gname(id, a.autor).localeCompare(gname(id, b.autor), 'pt-BR') || b.ck - a.ck);
    return l;
  }
  const tile = (id, p, sel, ids) => {
    const nome = gname(id, p.autor); const lab = `${nome}, ${hhmm(p.ck)}, ${LBL[p.status].toLowerCase()}`;
    return `<div class="hv-tile ${p.ratio === 'l' ? 'w2' : ''} r-${p.ratio} ${p.status === 'oculta' ? 'oc' : ''} ${sel ? 'selected' : ''}" data-pid="${p.id}"><button class="hv-open" data-act="hv-open" data-id="${p.id}" data-fk="o-${p.id}" aria-label="Abrir foto de ${E(lab)}">${A.img(p.n, p.ratio, '')}</button><button class="hv-sel" data-act="hv-sel" data-id="${p.id}" data-fk="s-${p.id}" aria-pressed="${sel}" aria-label="Selecionar foto de ${E(nome)}"><span>${A.icon('check', 14)}</span></button>${p.status !== 'aprovada' ? `<span class="hv-tag">${LBL[p.status]}</span>` : ''}${p.status === 'revisar' ? `<div class="hv-qk"><button class="hv-qkb ok" data-act="hv-ap" data-id="${p.id}" data-fk="qa-${p.id}" aria-label="Aprovar foto de ${E(nome)}">${A.icon('check', 20)}</button><button class="hv-qkb" data-act="hv-oc" data-id="${p.id}" data-fk="qo2-${p.id}" aria-label="Ocultar foto de ${E(nome)}">${A.icon('eyeoff', 20)}</button></div>` : p.status === 'oculta' ? `<div class="hv-qk"><button class="hv-qkb ok" data-act="hv-rs1" data-id="${p.id}" data-fk="qr-${p.id}" aria-label="Restaurar foto de ${E(nome)}">${A.icon('undo', 20)}</button></div>` : ''}</div>`;
  };
  const EXTRAS = ['telao', 'missao', 'convidado'];
  function exHtml(id) {
    const v = vs(id), all = P(id);
    const misOpts = A.data.missions.map((m) => [m.id, m.titulo + ` (${all.filter((p) => p.missao === m.id).length})`]).filter((o) => all.some((p) => p.missao === o[0]));
    const gOpts = [...new Set(all.map((p) => p.autor))].map((g) => [g, gname(id, g) + ` (${all.filter((p) => p.autor === g).length})`]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    const subSel = v.f === 'missao' ? `<label class="sr-only" for="hv-sub">Escolher missão</label><select class="select" id="hv-sub" data-change="hv-mis" data-fk="sub" style="max-width:340px"><option value="">Todas as missões</option>${misOpts.map(([a, b]) => `<option value="${a}" ${v.mis === a ? 'selected' : ''}>${E(b)}</option>`).join('')}</select>` : v.f === 'convidado' ? `<label class="sr-only" for="hv-sub">Escolher convidado</label><select class="select" id="hv-sub" data-change="hv-gue" data-fk="sub" style="max-width:340px"><option value="">Todos os convidados</option>${gOpts.map(([a, b]) => `<option value="${a}" ${v.gue === a ? 'selected' : ''}>${E(b)}</option>`).join('')}</select>` : '';
    return `<div class="flex" style="gap:8px;flex-wrap:wrap"><label for="hv-fx" class="t-small">Mostrar</label><select class="select" id="hv-fx" data-change="hv-fx" data-fk="fx"><option value="" ${EXTRAS.includes(v.f) ? '' : 'selected'}>Pelos filtros acima</option><option value="telao" ${v.f === 'telao' ? 'selected' : ''}>Só as do telão</option><option value="missao" ${v.f === 'missao' ? 'selected' : ''}>Por missão</option><option value="convidado" ${v.f === 'convidado' ? 'selected' : ''}>Por convidado</option></select>${subSel}</div>`;
  }
  function ctlHtml(id) {
    const v = vs(id), all = P(id), n = (f) => all.filter(f).length, l = filtered(id), sel = SEL(id);
    [...sel].forEach((i) => { if (!all.find((p) => p.id === i)) sel.delete(i); });
    const pend = n((p) => p.status === 'revisar'), ext = EXTRAS.includes(v.f);
    const chips = [['todas', 'Todas', all.length], ['revisar', 'Para revisar', pend], ['aprovadas', 'Aprovadas', n((p) => p.status === 'aprovada')], ['ocultas', 'Ocultas', n((p) => p.status === 'oculta')]];
    const extLbl = v.f === 'telao' ? 'No telão' : v.f === 'missao' ? (v.mis ? 'Missão: ' + mtitle(v.mis) : 'Por missão') : v.f === 'convidado' ? (v.gue ? 'Convidado: ' + gname(id, v.gue) : 'Por convidado') : '';
    const pill = ext ? `<button class="chip" aria-pressed="true" data-act="hv-f" data-f="todas" data-fk="c-x" aria-label="Remover filtro: ${E(extLbl)}">${E(extLbl)} ${A.icon('x', 14)}</button>` : '';
    const rev = pend ? `<button class="btn btn-primary" data-act="hv-startrev" data-fk="startrev">Revisar ${pend} ${plural(pend, 'foto', 'fotos')}</button>` : '';
    return `<div class="ds-fl" role="group" aria-label="Filtrar fotos">${chips.map(([k, lab, c]) => `<button data-act="hv-f" data-f="${k}" data-fk="c-${k}" aria-pressed="${v.f === k}">${lab} <span class="n">${c}</span></button>`).join('')}${pill ? `<span style="display:inline-flex;align-items:center;flex:none">${pill}</span>` : ''}</div><div class="hv-cnt"><p class="t-small" aria-live="polite">${l.length} ${plural(l.length, 'foto', 'fotos')}${v.q ? ` para “${E(v.q)}”` : ''}${sel.size ? ` · ${sel.size} ${plural(sel.size, 'selecionada', 'selecionadas')}` : ''}</p><div class="act">${rev}<button class="btn btn-quiet btn-sm" data-act="hv-selall" data-fk="selall">${l.length && l.every((p) => sel.has(p.id)) ? 'Limpar seleção' : `Selecionar todas (${l.length})`}</button><span role="group" aria-label="Modo de exibição" class="flex" style="gap:0"><button class="hv-ibtn" data-act="hv-view" data-v="grade" data-fk="v-g" aria-pressed="${v.view === 'grade'}" aria-label="Ver em grade">${A.icon('grid', 18)}</button><button class="hv-ibtn" data-act="hv-view" data-v="lista" data-fk="v-l" aria-pressed="${v.view === 'lista'}" aria-label="Ver em lista">${A.icon('list', 18)}</button></span></div></div>`;
  }
  function flaggedComments(id) {
    const out = []; P(id).forEach((p) => commentsOf(id, p).forEach((c) => { if (c.flag && !c.state) out.push(Object.assign({ photo: p }, c)); })); return out;
  }
  function resHtml(id) {
    const v = vs(id), l = filtered(id), sel = SEL(id);
    let flagged = '';
    if (v.f === 'revisar') { const fc = flaggedComments(id); if (fc.length) flagged = `<details class="hv-sec hv-flag ds-fold sem-borda" ${matchMedia('(min-width:901px)').matches ? 'open' : ''} aria-label="Comentários para revisar"><summary><span class="t-label">Comentários denunciados (${fc.length})${fc.length > 3 ? ' · mostrando 3' : ''}</span></summary><div class="ds-fold-b">${fc.slice(0, 3).map((c) => `<div class="hv-cm"><div class="grow"><b>${E(c.autor)}</b> <span class="t-small">na foto de ${E(gname(id, c.photo.autor))}</span><div>${E(c.texto)}</div></div><button class="btn btn-sm btn-line" data-act="hv-cmkeep" data-id="${c.photo.id}" data-c="${c.id}" data-fk="ck-${c.id}">Manter</button><button class="btn btn-sm btn-danger" data-act="hv-cmrm" data-id="${c.photo.id}" data-c="${c.id}" data-fk="cr-${c.id}">Remover</button></div>`).join('')}</div></details>`; }
    if (!l.length) { const fila = v.f === 'revisar' && !v.q; return flagged + A.emptyState({ icon: fila ? 'check' : v.q ? 'search' : 'image', title: fila ? 'Fila limpa' : v.q ? `Nenhuma foto para “${v.q.trim().slice(0, 40)}”` : 'Nenhuma foto com esse filtro', body: fila ? 'Nada esperando revisão. Quando chegar algo suspeito, o número aparece no menu.' : v.q ? 'Confira a escrita do nome, da missão ou do motivo. As fotos continuam todas aqui.' : 'Neste filtro ainda não há fotos. Volte para Todas para ver o álbum inteiro.', cta: fila ? '' : `<button class="btn btn-line" data-act="hv-clear" data-fk="clr">Limpar busca e filtros</button>` }); }
    if (v.view === 'lista') return flagged + `<div class="list" role="list">${l.map((p) => { const nome = gname(id, p.autor); return `<div class="li" role="listitem" data-pid="${p.id}"><button class="hv-thumb hv-open" data-act="hv-open" data-id="${p.id}" data-fk="o-${p.id}" aria-label="Abrir foto de ${E(nome)}, ${hhmm(p.ck)}">${A.img(p.n, p.ratio, '')}</button><div class="grow"><b>${E(nome)}</b><div class="t-small">${hhmm(p.ck)} · ${p.missao ? E(mtitle(p.missao)) : 'Foto livre'}${p.motivo ? ' · ' + E(p.motivo) : ''}</div></div>${badge(p.status)}<div class="flex hide-sm" style="gap:4px">${p.status !== 'aprovada' ? `<button class="btn btn-sm btn-line" data-act="hv-ap1" data-id="${p.id}" data-fk="a-${p.id}">Aprovar</button>` : ''}${p.status !== 'oculta' ? `<button class="btn btn-sm btn-quiet" data-act="hv-oc1" data-id="${p.id}" data-fk="h-${p.id}">Ocultar</button>` : `<button class="btn btn-sm btn-quiet" data-act="hv-rs1" data-id="${p.id}" data-fk="r-${p.id}">Restaurar</button>`}</div><button class="hv-sel" style="position:static;color:var(--fg);opacity:1" data-act="hv-sel" data-id="${p.id}" data-fk="s-${p.id}" aria-pressed="${sel.has(p.id)}" aria-label="Selecionar foto de ${E(nome)}"><span style="border-color:var(--fg-3)">${A.icon('check', 14)}</span></button></div>`; }).join('')}</div>`;
    return flagged + `<div class="hv-grid ${sel.size ? 'hv-selmode' : ''}">${l.map((p) => tile(id, p, sel.has(p.id))).join('')}</div>`;
  }
  function bulkHtml(id) {
    const sel = SEL(id); const n = sel.size; if (!n) return '';
    return `<div class="hv-bulk" role="region" aria-label="Ações em lote"><b>${n} ${plural(n, 'selecionada', 'selecionadas')}</b><span class="grow"></span><button class="btn btn-sm pri" data-act="hv-bap" data-fk="b-ap">Aprovar</button><button class="btn btn-sm" data-act="hv-boc" data-fk="b-oc">Ocultar</button><button class="btn btn-sm" data-act="hv-bdl" data-fk="b-dl">${A.icon('download', 16)} Baixar</button>${ROLE() === 'couple' ? '' : `<button class="btn btn-sm" data-act="hv-bmore" data-fk="b-more" aria-haspopup="menu" aria-label="Mais ações">${A.icon('more', 16)}</button>`}<span style="width:var(--space-4)" aria-hidden="true"></span><button class="btn btn-sm" data-act="hv-bclr" data-fk="b-cl" aria-label="Limpar seleção">${A.icon('x', 16)}</button></div>`;
  }
  const drawFotos = (id) => () => { setRegion('#hv-ctl', ctlHtml(id)); setRegion('#hv-ex', exHtml(id)); setRegion('#hv-res', resHtml(id)); setRegion('#hv-bulk', bulkHtml(id)); refreshBadge(); };

  A.route('/h/e/:id/fotos', (ctx) => {
    clearTimers(); const id = ctx.params.id, v = vs(id), ev = EV(id), phase = PH(id);
    if (v._h !== location.hash) { v._h = location.hash; Object.assign(v, { f: ctx.q.f || 'todas', mis: ctx.q.m || '', gue: ctx.q.g || '', q: '' }); SEL(id).clear(); }
    const total = P(id).length, wiped = get('wipe', id, false);
    const body = () => { const abre = v.q || v.sort !== 'recentes' || EXTRAS.includes(v.f); return `<div class="stack hv-photo-body"><div id="hv-ctl">${ctlHtml(id)}</div><details class="hv-disclosure ds-fold b-baixo" ${abre ? 'open' : ''}><summary>${A.icon("search", 18)}<span class="grow">Buscar, ordenar e filtrar</span></summary><div class="ds-fold-b"><div class="hv-tools"><label class="search"><span class="sr-only">Buscar fotos</span>${A.icon('search', 18)}<input type="search" id="hv-q" data-input="hv-q" value="${E(v.q)}" placeholder="Buscar por pessoa, missão ou motivo" autocomplete="off"></label><div class="flex" style="gap:8px"><label for="hv-sort" class="t-small">Ordenar</label><select class="select" id="hv-sort" data-change="hv-sort"><option value="recentes" ${v.sort === 'recentes' ? 'selected' : ''}>Mais recentes</option><option value="antigas" ${v.sort === 'antigas' ? 'selected' : ''}>Mais antigas</option><option value="curtidas" ${v.sort === 'curtidas' ? 'selected' : ''}>Mais curtidas</option><option value="convidado" ${v.sort === 'convidado' ? 'selected' : ''}>Por convidado (A–Z)</option></select></div></div><div id="hv-ex" style="margin-bottom:var(--space-3)">${exHtml(id)}</div></div></details><div id="hv-res">${resHtml(id)}</div><div id="hv-bulk">${bulkHtml(id)}</div><details class="hv-keys ds-fold sem-borda"><summary>Atalhos de teclado</summary><div class="ds-fold-b"><p class="hv-hint"><span class="kbd">A</span> aprova · <span class="kbd">R</span> oculta · <span class="kbd">Z</span> desfaz · <span class="kbd">←</span> <span class="kbd">→</span> trocam de foto na ampliação. Funcionam na foto em foco ou nas selecionadas.</p></div></details></div>`; };
    const emptyOpt = wiped ? { icon: 'trash', title: 'As fotos foram apagadas', body: 'Você apagou o álbum deste evento. Para ver o protótipo de novo, use “Reiniciar dados” na barra Protótipo.' } : phase === 'antes' ? { icon: 'image', title: 'As fotos chegam na festa', body: 'Quando o primeiro convidado enviar, ela aparece aqui para você revisar. Dá para ensaiar o caminho do convidado antes.', cta: `<a class="btn btn-line" href="#/g/${ev.slug}" target="_blank" rel="noopener">${A.icon('eye', 16)} Ver como convidado</a>` } : { icon: 'image', title: 'Nenhuma foto por aqui', body: 'Quando alguém enviar, ela aparece aqui.' };
    const nd = phase !== 'durante' && total >= 40 ? nudge('limite-gratis', ev) : '';
    const skFotos = `<div class="stack hv-photo-body" aria-busy="true" aria-label="Carregando as fotos">${'<div class="skeleton hv-sk-chips"></div>'.repeat(2)}${'<div class="skeleton hv-sk-chips m"></div>'.repeat(1)}<div class="skeleton hv-sk-chips t"></div><div class="hv-grid">${Array.from({ length: 12 }, () => '<div class="hv-tile skeleton"></div>').join('')}</div></div>`;
    const content = A.stateful({ ok: body, loading: skFotos, error: A.errorState({ title: 'Não deu para carregar as fotos', body: 'As fotos da festa continuam guardadas. Confira a conexão e tente de novo.' }), isEmpty: () => total === 0, empty: A.emptyState(emptyOpt) }) + (nd ? `<div class="hv-nudge">${nd}</div>` : '');
    CUR = { kind: 'fotos', id, draw: drawFotos(id) };
    return { title: 'Fotos', html: A.hostShell(ctx, { section: 'fotos', title: 'Fotos', pageClass: 'hv-pg' }, content), after: () => refreshBadge() };
  });
  A.inputs['hv-q'] = (el) => { const id = curId(); vs(id).q = el.value; setRegion('#hv-ctl', ctlHtml(id)); setRegion('#hv-res', resHtml(id)); };
  A.inputs['hv-sort'] = (el) => { const id = curId(); vs(id).sort = el.value; drawFotos(id)(); };
  A.inputs['hv-mis'] = (el) => { const id = curId(); vs(id).mis = el.value; drawFotos(id)(); };
  A.inputs['hv-gue'] = (el) => { const id = curId(); vs(id).gue = el.value; drawFotos(id)(); };
  A.acts['hv-f'] = (el) => { const id = curId(), v = vs(id); v.f = el.dataset.f; if (v.f !== 'missao') v.mis = ''; if (v.f !== 'convidado') v.gue = ''; drawFotos(id)(); };
  A.acts['hv-view'] = (el) => { const id = curId(); vs(id).view = el.dataset.v; drawFotos(id)(); };
  A.acts['hv-clear'] = () => { const id = curId(), v = vs(id); Object.assign(v, { f: 'todas', q: '', mis: '', gue: '', sort: 'recentes' }); const q = A.$('#hv-q'); if (q) q.value = ''; const s = A.$('#hv-sort'); if (s) s.value = 'recentes'; drawFotos(id)(); };
  A.acts['hv-sel'] = (el) => { const id = curId(), s = SEL(id), i = el.dataset.id; s.has(i) ? s.delete(i) : s.add(i); drawFotos(id)(); };
  A.acts['hv-selall'] = () => { const id = curId(), s = SEL(id), l = filtered(id); if (l.length && l.every((p) => s.has(p.id))) l.forEach((p) => s.delete(p.id)); else l.forEach((p) => s.add(p.id)); drawFotos(id)(); };
  A.acts['hv-bclr'] = () => { const id = curId(); SEL(id).clear(); drawFotos(id)(); };
  const selIds = (id) => [...SEL(id)].filter((i) => model(id).pmap[i]);
  A.acts['hv-bap'] = () => { const id = curId(), ids = selIds(id); SEL(id).clear(); approve(id, ids); };
  A.acts['hv-boc'] = () => { const id = curId(), ids = selIds(id); SEL(id).clear(); hide(id, ids); };
  A.acts['hv-bmore'] = (el) => { const id = curId(); A.menu(el, [{ label: `Remover ${selIds(id).length === 1 ? 'a foto' : 'as ' + selIds(id).length + ' fotos'} de vez`, icon: 'trash', danger: 1, onClick: () => removeForever(id, selIds(id)) }]); };
  A.acts['hv-startrev'] = () => { const id = curId(), ids = P(id).filter((p) => p.status === 'revisar').map((p) => p.id); if (ids.length) openLB(id, ids, ids[0]); };
  A.inputs['hv-fx'] = (el) => { const id = curId(), v = vs(id); if (el.value) v.f = el.value; else if (EXTRAS.includes(v.f)) v.f = 'todas'; v.mis = ''; v.gue = ''; drawFotos(id)(); };
  A.acts['hv-bdl'] = () => A.toast(`Na versão real, o Albora baixaria um ZIP com as ${selIds(curId()).length} fotos originais (simulado).`);
  A.acts['hv-ap1'] = (el) => approve(curId(), [el.dataset.id]);
  A.acts['hv-oc1'] = (el) => hide(curId(), [el.dataset.id]);
  A.acts['hv-rs1'] = (el) => restore(curId(), [el.dataset.id]);
  A.acts['hv-ap'] = (el) => approve(curId(), [el.dataset.id]);
  A.acts['hv-oc'] = (el) => hide(curId(), [el.dataset.id]);

  /* ---------- comentários ---------- */
  function commentsOf(id, p) {
    const rm = get('cm', id, {}), out = [], gs = G(id), base0 = p.ck;
    for (let i = 0; i < p.comentarios; i++) { const cid = p.id + '-c' + i, h = A.hash(cid); out.push({ id: cid, autor: gs[h % gs.length].nome, texto: CT[h % CT.length], ck: base0 + 3 + (h % 40), flag: h % 9 === 0, state: rm[cid] || '' }); }
    return out;
  }
  function setComment(id, pid, cid, state, msg) {
    const prev = (get('cm', id, {}))[cid]; upd('cm', id, (o) => { o[cid] = state; return o; }, {}); afterChange(id);
    withUndo(msg, () => { upd('cm', id, (o) => { if (prev) o[cid] = prev; else delete o[cid]; return o; }, {}); afterChange(id); });
  }
  A.acts['hv-cmrm'] = (el) => setComment(curId(), el.dataset.id, el.dataset.c, 'removido', 'Comentário removido.');
  A.acts['hv-cmkeep'] = (el) => setComment(curId(), el.dataset.id, el.dataset.c, 'mantido', 'Comentário mantido.');

  /* ---------- lightbox ---------- */
  let LB = null;
  function openLB(id, ids, pid) {
    if (LB && LB.api.el.isConnected) LB.api.close();
    const i = Math.max(0, ids.indexOf(pid));
    const api = A.modal({ title: 'Foto', wide: true, label: 'Foto ampliada', body: '<div id="hv-lb-body"></div>' });
    api.el.classList.add('hv-lbm'); api.el.setAttribute('data-theme', 'noite');
    LB = { id, ids: ids.slice(), i, api }; api.onClose = () => { LB = null; redraw(); }; lbDraw();
  }
  function lbPhoto() {
    const m = model(LB.id);
    while (LB.ids.length) { const p = m.pmap[LB.ids[LB.i]]; if (p) return p; LB.ids.splice(LB.i, 1); if (LB.i >= LB.ids.length) LB.i = LB.ids.length - 1; }
    return null;
  }
  function lbDraw() {
    if (!LB) return; const p = lbPhoto(); if (!p) { LB.api.close(); return; }
    const id = LB.id, nome = gname(id, p.autor), g = model(id).gmap[p.autor], cm = commentsOf(id, p).filter((c) => c.state !== 'removido'), role = ROLE();
    const h = A.$('.modal-head h2', LB.api.el); if (h) { h.textContent = `${LB.i + 1} de ${LB.ids.length}`; h.style.setProperty('--p', Math.round(((LB.i + 1) / LB.ids.length) * 100)); }
    const wasOpen = !!A.$('.hv-lb-cm[open]', LB.api.el);
    const pri = p.status === 'revisar' ? `<button class="btn btn-primary" data-act="hv-lbact" data-a="ap" data-fk="l-ap">${A.icon('check', 16)} Aprovar <span class="kbd">A</span></button>` : p.status === 'oculta' ? `<button class="btn btn-primary" data-act="hv-lbact" data-a="rs" data-fk="l-rs">${A.icon('undo', 16)} Restaurar</button>` : '';
    const meta = [hhmm(p.ck) + (agoOf(p) ? ' · ' + agoOf(p) : ''), p.missao ? mtitle(p.missao) : 'Foto livre', `${p.curtidas} ${plural(p.curtidas, 'reação', 'reações')}`, p.status === 'aprovada' && p.telao ? 'No telão' : ''].filter(Boolean).map(E).join(' · ');
    A.$('#hv-lb-body', LB.api.el).innerHTML = `<div class="hv-lb"><div class="hv-lb-stage"><button class="hv-lb-nav pv" data-act="hv-lbnav" data-d="-1" data-fk="l-pv" ${LB.i === 0 ? 'disabled' : ''} aria-label="Foto anterior (seta para a esquerda)">${A.icon('chevleft', 26)}</button><div class="hv-lb-img" data-rv="${p.status === 'revisar' ? '1' : ''}">${A.img(p.n, p.ratio, `Foto de ${nome} (ilustração do protótipo)`)}${p.status === 'revisar' ? '<span class="hv-sw hv-sw-ap" aria-hidden="true">Aprovar</span><span class="hv-sw hv-sw-oc" aria-hidden="true">Ocultar</span>' : ''}</div><button class="hv-lb-nav nx" data-act="hv-lbnav" data-d="1" data-fk="l-nx" ${LB.i >= LB.ids.length - 1 ? 'disabled' : ''} aria-label="Próxima foto (seta para a direita)">${A.icon('chevron', 26)}</button></div>${p.status === 'revisar' ? '<p class="hv-sw-hint">Deslize para a direita para aprovar e para a esquerda para ocultar.</p>' : ''}<div class="hv-lb-bar"><div class="hv-lb-who"><span class="flex" style="gap:var(--space-3)"><button class="link" data-act="hv-lbact" data-a="gu" data-fk="l-gu">${E(nome)}</button>${badge(p.status)}</span><span class="t-small">${meta}${g && g.oculto ? ' · nome oculto no telão' : ''}${p.motivo ? ' · motivo da revisão: ' + E(p.motivo) : ''}</span></div><div class="hv-lb-act">${pri}${p.status !== 'oculta' ? `<button class="btn btn-line" data-act="hv-lbact" data-a="oc" data-fk="l-oc">${A.icon('eyeoff', 16)} Ocultar <span class="kbd">R</span></button>` : ''}${p.status === 'aprovada' ? `<button class="btn btn-quiet" data-act="hv-lbact" data-a="tl" data-fk="l-tl">${A.icon('tv', 16)} ${p.telao ? 'Tirar do telão' : 'Pôr no telão'}</button>` : ''}<button class="btn btn-quiet" data-act="hv-lbact" data-a="dl" data-fk="l-dl">${A.icon('download', 16)} Baixar</button>${role === 'couple' ? '' : `<span class="hv-lb-risk"><button class="btn btn-quiet" data-act="hv-lbmore" data-fk="l-more" aria-haspopup="menu" aria-label="Mais ações">${A.icon('more', 18)}</button></span>`}</div>${cm.length ? `<details class="hv-lb-cm ds-fold" ${wasOpen ? 'open' : ''}><summary>${cm.length} ${plural(cm.length, 'comentário', 'comentários')}</summary><div class="ds-fold-b">${cm.map((c) => `<div class="hv-cm"><div class="grow"><b>${E(c.autor)}</b>${c.flag ? ' <span class="badge warn">Denunciado</span>' : ''}<div>${E(c.texto)}</div></div><button class="btn btn-sm btn-quiet" data-act="hv-lbcm" data-c="${c.id}" data-fk="lc-${c.id}" aria-label="Remover comentário de ${E(c.autor)}">${A.icon('trash', 16)}</button></div>`).join('')}</div></details>` : ''}</div></div>`;
  }
  function lbRefresh() { if (LB && LB.api.el.isConnected) { const a = document.activeElement, fk = a && LB.api.el.contains(a) ? a.dataset.fk : null; lbDraw(); if (fk && LB) { const n = LB.api.el.querySelector(`[data-fk="${fk}"]`); if (n && !n.disabled) n.focus(); } } }
  function lbAct(a) {
    if (!LB) return; const p = lbPhoto(); if (!p) return; const id = LB.id, was = p.status;
    const adv = () => { if (was === 'revisar' && LB && LB.i < LB.ids.length - 1) LB.i++; };
    if (a === 'ap') { approve(id, [p.id]); adv(); }
    else if (a === 'oc') { hide(id, [p.id]); adv(); }
    else if (a === 'rs') restore(id, [p.id]);
    else if (a === 'tl') setPhotos(id, [p.id], (x) => ({ telao: !x.telao }), p.telao ? 'Foto fora do telão.' : 'Foto no telão.');
    else if (a === 'dl') { const link = document.createElement('a'); link.href = A.photo(p.n, p.ratio); link.download = `foto-${p.n}.svg`; document.body.append(link); link.click(); link.remove(); A.toast('Baixando a ilustração de exemplo. Na versão real, sai a foto original sem localização.'); }
    else if (a === 'rm') removeForever(id, [p.id]).then((ok) => { if (ok) lbRefresh(); });
    else if (a === 'gu') { const gid = p.autor; LB.api.close(); location.hash = `#/h/e/${id}/convidados?g=${gid}`; return; }
    lbRefresh();
  }
  A.acts['hv-open'] = (el) => {
    const id = curId(); let ids;
    const strip = el.closest('[data-ids]'); if (strip) ids = strip.dataset.ids.split(',');
    else if (CUR && CUR.kind === 'fotos') ids = filtered(id).map((p) => p.id); else ids = P(id).map((p) => p.id);
    if (!ids.includes(el.dataset.id)) ids = [el.dataset.id, ...ids];
    openLB(id, ids, el.dataset.id);
  };

  /* revisão por deslizar: direita aprova, esquerda oculta (só fotos em revisão); nas outras, navega. Botões e teclado continuam */
  (() => {
    let st = null; const TH = 90, EDGE = 24;
    const reset = (el) => { el.style.transition = 'transform .18s ease'; el.style.transform = ''; el.style.setProperty('--sw', '0'); setTimeout(() => { el.style.transition = ''; }, 200); };
    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest && e.target.closest('.hv-lb-img'); if (!el || !LB || e.button > 0) return;
      if (e.clientX < EDGE || e.clientX > innerWidth - EDGE) return;
      st = { el, x: e.clientX, y: e.clientY, dx: 0, lock: false, id: e.pointerId };
    });
    document.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.lock) { if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { st = null; return; } if (Math.abs(dx) > 8) { st.lock = true; try { st.el.setPointerCapture(e.pointerId); } catch (_) { /* sem captura */ } } else return; }
      st.dx = dx; const rv = st.el.dataset.rv === '1'; st.el.style.transform = `translateX(${dx}px) rotate(${dx / 24}deg)`; st.el.style.setProperty('--sw', rv ? String(Math.min(1, Math.abs(dx) / TH)) : '0'); st.el.dataset.dir = dx > 0 ? 'ap' : 'oc';
    });
    const end = (e) => {
      if (!st || e.pointerId !== st.id) return; const { el, dx } = st; st = null; if (!el.isConnected) return;
      const rv = el.dataset.rv === '1';
      if (Math.abs(dx) >= TH) {
        if (rv) { el.style.transition = 'transform .16s ease,opacity .16s ease'; el.style.transform = `translateX(${dx > 0 ? 140 : -140}%) rotate(${dx > 0 ? 18 : -18}deg)`; el.style.opacity = '0'; setTimeout(() => lbAct(dx > 0 ? 'ap' : 'oc'), 150); return; }
        LB.i = Math.min(LB.ids.length - 1, Math.max(0, LB.i + (dx < 0 ? 1 : -1))); lbRefresh(); return;
      }
      reset(el);
    };
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  })();
  A.acts['hv-lbact'] = (el) => lbAct(el.dataset.a);
  A.acts['hv-lbmore'] = (el) => { const m = A.menu(el, [{ label: 'Remover esta foto de vez', icon: 'trash', danger: 1, onClick: () => lbAct('rm') }]); m.style.zIndex = 130; };
  A.acts['hv-lbnav'] = (el) => { if (!LB) return; LB.i = Math.min(LB.ids.length - 1, Math.max(0, LB.i + +el.dataset.d)); lbRefresh(); };
  A.acts['hv-lbcm'] = (el) => { if (!LB) return; const p = lbPhoto(); setComment(LB.id, p.id, el.dataset.c, 'removido', 'Comentário removido.'); };
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; const t = e.target;
    if (t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key.toLowerCase(); if (!['a', 'r', 'z', 'arrowleft', 'arrowright'].includes(k)) return;
    if (LB && LB.api.el.isConnected) {
      if (A.$$('.modal').pop() !== LB.api.el) return;
      e.preventDefault();
      if (k === 'arrowleft') { LB.i = Math.max(0, LB.i - 1); lbRefresh(); } else if (k === 'arrowright') { LB.i = Math.min(LB.ids.length - 1, LB.i + 1); lbRefresh(); }
      else if (k === 'a') { const p = lbPhoto(); if (p && p.status !== 'aprovada') lbAct(p.status === 'oculta' ? 'rs' : 'ap'); }
      else if (k === 'r') { const p = lbPhoto(); if (p && p.status !== 'oculta') lbAct('oc'); }
      else if (k === 'z') undoLast();
      return;
    }
    if (!CUR || CUR.kind !== 'fotos' || !A.$('#hv-res') || A.$('.modal,.palette,.menu')) return;
    if (k === 'z') { e.preventDefault(); undoLast(); return; }
    const tl = t.closest && t.closest('[data-pid]'); const sel = selIds(CUR.id); const ids = sel.length ? sel : tl ? [tl.dataset.pid] : [];
    if (!ids.length) return;
    if (k === 'a') { e.preventDefault(); SEL(CUR.id).clear(); approve(CUR.id, ids); } else if (k === 'r') { e.preventDefault(); SEL(CUR.id).clear(); hide(CUR.id, ids); }
  });

  /* ---------- Hoje: peças ---------- */
  const STRINGS = { cerimonia: 'Depois da cerimônia', agora: 'Desde o começo da festa', horario: 'Em um horário que eu escolho', nunca: 'Nunca: só envio e telão' };
  const gateOf = (id) => get('gate', id, { mode: 'cerimonia', hora: '21:00', aberta: null, set: false });
  const panic = (id) => get('pn', id, { on: false });
  function gateOpen(id) {
    if (panic(id).on) return false; const g = gateOf(id), phase = PH(id), ev = EV(id);
    if (g.aberta !== null && g.aberta !== undefined) return g.aberta;
    if (g.mode === 'nunca') return false; if (g.mode === 'agora') return phase !== 'antes';
    if (g.mode === 'horario') return phase === 'depois' || (phase === 'durante' && startMin(ev) + 250 >= toMin(g.hora));
    return phase === 'depois';
  }
  const telao = (id) => get('tl', id, { paused: false, modelo: 'polaroide' });
  const published = (id) => get('pub', id, id !== 'e3');
  const minors = (id) => get('mn', id, false);

  function rulesHtml(id, ro) {
    const phase = PH(id), g = gateOf(id), open = gateOpen(id), pn = panic(id).on, pub = published(id);
    const gateField = A.field({ name: 'mode', label: 'Quando o feed, as reações e os comentários abrem', required: true, value: g.mode, options: Object.entries(STRINGS), extra: 'data-change="hv-gate" data-k="mode"' });
    const horaField = g.mode === 'horario' ? A.field({ name: 'hora', label: 'Horário de abertura', type: 'time', required: true, value: g.hora, extra: 'data-change="hv-gate" data-k="hora"' }) : '';
    const btn = phase === 'antes' || ro ? '' : `<button class="btn btn-line btn-sm" data-act="hv-gateopen" data-fk="gate-btn" ${pn ? 'disabled' : ''}>${open ? 'Fechar agora' : 'Abrir agora'}</button>`;
    return `<section class="hv-sec" id="controle-publicar"><div class="flex between" style="align-items:flex-start;gap:16px"><div><h3 class="t-h">Evento publicado</h3><p class="t-small">${pub ? 'Quem tem o link ou o QR entra na festa.' : 'Rascunho: o link ainda não abre para convidados.'}</p></div>${ro ? `<span class="badge ${pub ? 'ok' : 'warn'}">${pub ? 'Publicado' : 'Rascunho'}</span>` : sw(pub, 'hv-pub', 'Evento publicado', 'sw-pub')}</div></section>
    <section class="hv-sec" id="controle-interacao"><h3 class="t-h">Interação dos convidados</h3><p class="t-small" style="margin-bottom:12px">Antes de abrir, o convidado só envia fotos e vê o espelho do telão. Quem organiza decide o momento.</p>${ro ? `<p>${E(STRINGS[g.mode])}</p>` : `<div class="stack-3">${gateField}${horaField}</div>`}<div class="flex between flex-wrap" style="margin-top:12px"><span class="badge ${open ? 'ok' : ''}" aria-live="polite">${pn ? 'Fechada pela pausa geral' : open ? 'Aberta agora' : 'Fechada agora'}</span>${ro ? '' : btn}</div></section>
    <section class="hv-sec" id="controle-menores"><div class="flex between" style="align-items:flex-start;gap:16px"><div><h3 class="t-h">Há menores de idade na festa</h3><p class="t-small">${minors(id) ? 'Denúncias seguram a foto na fila, ninguém compartilha para fora e a interação respeita o horário acima.' : 'Ligue se houver crianças ou adolescentes: as fotos passam a ter mais proteção.'}</p></div>${ro ? `<span class="badge">${minors(id) ? 'Sim' : 'Não'}</span>` : sw(minors(id), 'hv-menores', 'Há menores de idade na festa', 'sw-men')}</div></section>`;
  }
  A.acts['hv-pub'] = async () => { const id = curId(), on = published(id); if (on) { const ok = await A.confirm({ title: 'Voltar para rascunho?', body: 'Quem abrir o link ou o QR vai ver que o evento ainda não está no ar. Quem já entrou continua entrando.', confirm: 'Voltar para rascunho', danger: true }); if (!ok) return; } put('pub', id, !on); A.toast(on ? 'Evento em rascunho.' : 'Evento publicado. O link já abre para os convidados.'); redraw(); };
  A.acts['hv-publish'] = () => { const id = curId(); put('pub', id, true); A.toast('Evento publicado. O link já abre para os convidados.'); redraw(); };
  A.acts['hv-menores'] = async () => { const id = curId(), on = minors(id); if (on) { const ok = await A.confirm({ title: 'Desligar a proteção de menores?', body: 'Denúncias deixam de segurar a foto na fila e o compartilhamento para fora volta a ser possível.', confirm: 'Desligar', danger: true }); if (!ok) return; } put('mn', id, !on); A.toast(on ? 'Proteção de menores desligada.' : 'Proteção de menores ligada.'); redraw(); };
  A.inputs['hv-gate'] = (el, e, ds) => { const id = curId(), g = Object.assign({}, gateOf(id)); g[ds.k] = el.value; if (ds.k === 'mode') g.aberta = null; g.set = true; put('gate', id, g); A.toast(ds.k === 'mode' ? `Salvo: o feed abre — ${STRINGS[g.mode].toLowerCase()}.` : `Salvo: o feed abre às ${g.hora}.`); redraw(); };
  A.acts['hv-gateopen'] = () => { const id = curId(), g = Object.assign({}, gateOf(id)), open = gateOpen(id), prev = g.aberta; g.aberta = !open; g.set = true; put('gate', id, g); redraw(); withUndo(open ? 'Interação fechada.' : 'Interação aberta. Feed, reações e comentários já funcionam.', () => { const h = Object.assign({}, gateOf(id)); h.aberta = prev; put('gate', id, h); redraw(); }); };
  A.acts['hv-telao'] = () => { const id = curId(), t = Object.assign({}, telao(id)), was = t.paused; t.paused = !was; put('tl', id, t); redraw(); withUndo(was ? 'Telão voltou ao ar.' : 'Telão pausado. A tela mostra “Já já voltamos”.', () => { put('tl', id, Object.assign({}, telao(id), { paused: was })); redraw(); }); };
  A.inputs['hv-modelo'] = (el) => { const id = curId(), t = Object.assign({}, telao(id)), prev = t.modelo; t.modelo = el.value; put('tl', id, t); redraw(); const nome = (A.data.telaoModelos.find((m) => m[0] === el.value) || [])[1]; withUndo(`Telão agora no modelo ${nome}.`, () => { put('tl', id, Object.assign({}, telao(id), { modelo: prev })); redraw(); }); };
  A.acts['hv-scroll'] = (el) => { const n = document.getElementById(el.dataset.to); if (!n) return; const dt = n.closest('details'); if (dt) { dt.open = true; RULES_OPEN = true; } n.scrollIntoView({ behavior: 'smooth', block: 'center' }); const f = A.$('select,input,button', n); f && f.focus({ preventScroll: true }); };
  A.acts['hv-invite'] = () => { markDone(curId(), 'convite'); A.acts.invite(); redraw(); };
  A.acts['hv-previa'] = (el) => { markDone(curId(), 'previa'); window.open(el.getAttribute('href'), '_blank', 'noopener'); redraw(); };
  A.acts['hv-full'] = () => { ST.set('hv.full', !ST.get('hv.full', false)); redraw(); };

  /* completar data, hora e local de um evento criado sem eles */
  A.acts['hv-quando'] = () => {
    const id = curId(), ev = EV(id); if (!ev._x || !A.evt) return;
    A.sheet({ title: 'Data e local da festa', body: `<form class="stack stack-5" data-submit="hv-quando-ok" novalidate><p class="t-small">Preencha só o que já sabe. O que ficar em branco aparece como “a definir” para os convidados.</p>${A.field({ name: 'data', label: 'Data', type: 'date', value: ev.dataIso || '', hint: 'A partir de amanhã.', extra: `min="${A.evt.minData}"` })}${A.field({ name: 'hora', label: 'Hora', type: 'time', value: ev.dataIso ? ev.hora : '', hint: 'Sem hora, usamos 18:00 (Brasília).' })}${A.field({ name: 'local', label: 'Local', value: ev.local || '', placeholder: 'Nome do espaço e cidade', extra: 'maxlength="80" autocomplete="off"' })}<div class="modal-actions"><button type="button" class="btn btn-quiet" data-mclose>Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div></form>` });
  };
  A.acts['hv-quando-ok'] = (f) => {
    const id = curId(), ev = EV(id), min = A.evt.minData;
    const v = A.validate(f, { data: (x) => (!x || x >= min ? '' : 'Escolha uma data a partir de amanhã ou deixe em branco.') }); if (!v) return;
    if (A.sim().state === 'error') { let b = f.querySelector('.hv-qerr'); if (!b) { b = document.createElement('div'); b.className = 'hv-qerr banner bad'; b.setAttribute('role', 'alert'); f.querySelector('.modal-actions').before(b); } b.innerHTML = `${A.icon('warn', 20)}<div>Não deu para salvar agora. O que você digitou continua aqui: tente de novo. <span class="t-small">(Protótipo: erro simulado pelo estado “Erro” da barra Protótipo.)</span></div>`; return; }
    A.evt.patch(id, { dataIso: v.data || '', hora: v.hora || (v.data ? '18:00' : ev.hora), local: v.local });
    A.$$('.modal').pop()?.querySelector('[data-mclose]')?.click();
    A.toast(v.data ? 'Data e local salvos. A contagem já está no ar.' : v.local ? 'Local salvo. A data continua “a definir”.' : 'Nada foi definido ainda. O convite mostra “a definir”.');
    A.render();
  };

  /* pânico */
  A.acts['hv-panic'] = async () => {
    const id = curId(); if (panic(id).on) return;
    const ok = await A.confirm({ title: 'Pausar tudo agora?', body: 'Três coisas acontecem na hora: o telão sai do ar, o feed e as reações fecham para os convidados, e toda foto nova fica na fila para você revisar. Ninguém perde foto e nada é apagado. Você retoma quando quiser.', confirm: 'Pausar tudo', danger: true });
    if (!ok) return; put('pn', id, { on: true, at: Date.now() }); A.toast('Tudo pausado. Telão fora do ar, feed fechado, fotos novas na fila.', { kind: 'bad' }); redraw(); refreshBadge();
  };
  A.acts['hv-resume'] = () => { const id = curId(); put('pn', id, { on: false }); A.toast('Festa retomada. Telão e feed voltaram ao que estava antes.'); redraw(); };

  /* checklist: o que falta, derivado do estado real sempre que dá; só capa e convite dependem de "já fiz" */
  const telaoOn = (id) => (ST.get('hc:telao:' + id, null) || {}).st === 'conectado';
  function itemsState(id) {
    const ev = EV(id), ck = get('ck', id, {}), g = gateOf(id), x = !!ev._x;
    const mOn = x ? (ev.missoes || []).length : A.data.missions.filter((m) => m.on).length, team = x ? 1 : A.data.team.length, gn = G(id).length;
    const quando = !ev.dataIso && !ev.local ? 'Definir data e local' : !ev.dataIso ? 'Definir a data' : 'Definir o local';
    const L = [
      { k: 'capa', t: 'Escolher a capa e o estilo', why: 'É a primeira coisa que o convidado vê ao abrir o link.', cta: 'Abrir Estilo', href: base(id) + '/estilo', done: !!(ev.capa || ev.capaDemo || ck.capa), manual: true },
      { k: 'lista', t: 'Trazer a lista de convidados', why: 'Cole os nomes de uma planilha ou de outra lista e acompanhe quem já entrou na festa.', cta: 'Colar a lista', href: base(id) + '/convidados?importar=1', done: gn > 0, note: gn ? `${gn} ${plural(gn, 'pessoa', 'pessoas')} na lista` : '' },
      { k: 'convite', t: 'Convidar: link e QR', why: 'Sem convite ninguém entra. O mesmo link serve para todos, sem criar conta.', cta: 'Abrir o convite', act: 'hv-invite', done: !!ck.convite, manual: true },
      { k: 'telao', t: 'Conectar o telão', why: 'Dá para ligar por código ou por link. Teste antes do dia, com a TV do salão.', cta: 'Abrir Compartilhar', href: base(id) + '/compartilhar', done: telaoOn(id) || !!ck.telao },
      { k: 'interacao', t: 'Definir quando o feed abre', why: 'Antes desse momento o convidado só envia fotos. Quem organiza decide.', cta: 'Escolher momento', act: 'hv-scroll', to: 'controle-interacao', done: !!g.set || !!ck.interacao },
      { k: 'equipe', t: 'Chamar quem vai ajudar', why: 'Equipe revisa fotos e acompanha a festa com você.', cta: 'Abrir equipe', href: base(id) + '/ajustes/equipe', done: team > 1, note: team > 1 ? `${team} pessoas na equipe` : '' },
      { k: 'missoes', t: 'Escolher as missões', why: 'Missões dão motivo para o convidado fotografar.', cta: 'Rever missões', href: base(id) + '/estilo', done: mOn > 0, note: mOn > 0 ? `${mOn} ${plural(mOn, 'missão ligada', 'missões ligadas')}` : '' },
    ];
    if (x) L.push({ k: 'quando', t: quando, why: 'Com a data, o convidado sabe quando é a festa e você ganha a contagem. Sem ela, o convite e o link já funcionam.', cta: quando, act: 'hv-quando', done: !!(ev.dataIso && ev.local), note: ev.dataIso && ev.local ? 'Data e local definidos' : '' });
    return L;
  }
  function markDone(id, k) { upd('ck', id, (o) => { o[k] = true; return o; }, {}); }
  A.acts['hv-done'] = (el) => { markDone(curId(), el.dataset.k); redraw(); };
  const ctaOf = (it, cls, id) => it.act ? `<button class="${cls}" data-act="${it.act}" ${it.to ? `data-to="${it.to}"` : ''} data-fk="cta-${it.k}">${it.cta}</button>` : `<a class="${cls}" href="${it.href}" data-fk="cta-${it.k}">${it.cta} ${A.icon('arrow', 16)}</a>`;

  /* contagem regressiva */
  /* contagem até a hora marcada da festa (não até "agora + N dias"): evento recém-criado mostra o tempo real que falta */
  const HOJE_SIM = new Date('2026-11-14T12:00:00');
  function cdMoment(id) {
    const ev = EV(id), w = A.when(id), hm = /^(\d{1,2}):(\d{2})$/.exec(ev.hora || '') || [0, 18, 0];
    const dia = ev.dataIso ? new Date(ev.dataIso + 'T12:00:00') : new Date(HOJE_SIM.getTime() + w.days * DAY);
    dia.setHours(+hm[1], +hm[2], 0, 0);
    return { ms: dia - HOJE_SIM, key: `${w.days}|${ev.hora}|${ev.dataIso || ''}` };
  }
  function cdTarget(id) { const m = cdMoment(id), c = get('cdt', id, null); if (c && c.key === m.key) return c.ts; const ts = Date.now() + m.ms; put('cdt', id, { key: m.key, ts }); return ts; }
  function cdParts(id) { let d = Math.max(0, cdTarget(id) - Date.now()); const dd = Math.floor(d / DAY); d -= dd * DAY; const hh = Math.floor(d / 3600000); d -= hh * 3600000; const mm = Math.floor(d / 60000); const ss = Math.floor((d - mm * 60000) / 1000); return { dd, hh, mm, ss }; }

  A.inputs['hv-capa'] = async (el) => {
    const f = el.files && el.files[0]; if (!f) return; const er = A.$('#hv-capa-err'); if (er) er.textContent = '';
    try { const r = await A.evt.lerImagem(f); if (!A.evt.setCapa(curId(), r.url)) throw 'Não consegui guardar a foto neste navegador. Tente uma menor.'; A.toast('Foto principal atualizada. Ela já aparece no convite.'); A.render(); }
    catch (m) { if (er) er.textContent = String(m); el.value = ''; }
  };

  /* ---------- Hoje: ANTES (arco-contagem) ---------- */
  const HOJE0 = new Date('2026-11-14T12:00:00');
  function arcP(id) { const ev = EV(id), w = A.when(id); const el = ev.criadoEm ? Math.max(0, Math.round((HOJE0 - new Date(ev.criadoEm + 'T12:00:00')) / DAY)) : 57; return Math.min(0.97, Math.max(0.04, el / (el + Math.max(1, w.days)))); }
  function antesHtml(id, couple) {
    const ev = EV(id), w = A.when(id), items = itemsState(id), done = items.filter((i) => i.done).length, pub = published(id);
    const pending = items.filter((i) => !i.done); const next = couple ? null : !pub ? { k: 'pub', t: 'Publicar o evento', why: 'Enquanto estiver em rascunho, o link e o QR não abrem para os convidados.', cta: 'Publicar evento', act: 'hv-publish' } : pending[0];
    const heroBtn = w.semData && !couple && !(next && next.k === 'quando');
    const cd = cdParts(id), emHoras = cd.dd < 1, nCd = emHoras ? cd.hh : cd.dd, uCd = emHoras ? plural(cd.hh, 'hora', 'horas') : plural(cd.dd, 'dia', 'dias');
    const foto = ev.capa || '';
    const un = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    const cdLbl = `Faltam ${un(cd.dd, 'dia', 'dias')}, ${un(cd.hh, 'hora', 'horas')} e ${un(cd.mm, 'minuto', 'minutos')}`;
    const capaBtn = couple ? '' : foto ? `<button type="button" class="hv-capa-btn" data-act="hh-edit" data-fk="hero-capa">${A.icon('image', 18)}<span class="hv-capa-lbl">Ajustar capa</span></button>` : `<label class="hv-capa-btn btn btn-primary" data-fk="hero-capa">${A.icon('image', 18)}<span class="hv-capa-lbl">Escolher foto principal</span><input type="file" accept="image/jpeg,image/png,image/webp" data-change="hv-capa" aria-label="Escolher a foto principal do evento"></label>`;
    const cdHtml = `<div class="hv-cd" role="timer" aria-label="${cdLbl}">${[[cd.dd, 'dias'], [cd.hh, 'horas'], [cd.mm, 'min'], [cd.ss, 'seg']].map(([n, l], k) => `<div class="hv-cd-u"><b data-cd="${k}" aria-hidden="true">${String(n).padStart(2, '0')}</b><span aria-hidden="true">${l}</span></div>`).join('')}</div>`;
    const kick = w.semData ? 'Data a definir' : `${E(w.date)} · ${E(ev.hora)}`;
    const tail = w.semData
      ? `<p class="hv-hero-nota">Sem data, quem abrir o link vê que a festa ainda não começou.</p>${heroBtn ? `<div><button class="btn btn-quiet" data-act="hv-quando" data-fk="hero-quando">Definir data e local</button></div>` : ''}`
      : cdHtml;
    if (!w.semData) A.after((root) => {
      const el = A.$('.hv-cd', root); if (!el) return; let t;
      const tick = () => { if (!el.isConnected) return clearInterval(t); const c = cdParts(id); [c.dd, c.hh, c.mm, c.ss].forEach((n, k) => { const b = el.querySelector(`[data-cd="${k}"]`); const v = String(n).padStart(2, '0'); if (b && b.textContent !== v) b.textContent = v; }); const lb = `Faltam ${un(c.dd, 'dia', 'dias')}, ${un(c.hh, 'hora', 'horas')} e ${un(c.mm, 'minuto', 'minutos')}`; if (el.getAttribute('aria-label') !== lb) el.setAttribute('aria-label', lb); };
      t = setInterval(tick, 1000); TM.push(t);
    });
    const arc = `<div class="hv-arcwrap">${A.arc(w.semData ? 0.04 : arcP(id), 460, w.semData ? 'Data da festa ainda não definida' : cdLbl)}</div>`;
    const place = `${A.icon('pin', 16)}<span>${E(ev.local || 'Local a definir')}</span>`;
    (A._heroCtx = A._heroCtx || {})[id] = { _arc: arc, _kick: kick, _tail: tail, _ini: ev.iniciais, _rot: String(ev.nome || '').match(/^Casamento\s/i) ? 'Nosso casamento' : 'Nossa festa', _nome: String(ev.nome || '').replace(/^Casamento\s+/i, '') };
    if (foto) A.after((root) => A.hero.montar(root, () => A.hero.getCfg(id)));
    const nomeCurto = String(ev.nome || '').replace(/^Casamento\s+/i, ''); const rot = /^Casamento\s/i.test(ev.nome || '') ? 'Nosso casamento' : 'Nossa festa';
    const hero = A.hero.poster({ foto, cfg: null, rot, arc, title: E(nomeCurto), kick, place, tail, btn: capaBtn, fam: A.hero.getCfg(id).familia, ini: ev.iniciais, aria: w.semData ? 'Data do evento' : 'Contagem regressiva' });
    const nextBlock = couple ? '' : next ? `<section class="hv-next" aria-labelledby="hv-next"><h2 class="t-title" id="hv-next">${E(next.t)}</h2><p>${E(next.why)}</p><div class="hv-row" style="justify-content:center">${ctaOf(next, 'btn btn-primary btn-lg', id)}${next.manual ? `<button class="btn btn-quiet" data-act="hv-done" data-k="${next.k}" data-fk="done-${next.k}">Já fiz</button>` : ''}</div></section>` : `<section class="hv-next" aria-labelledby="hv-next"><h2 class="t-title" id="hv-next">Tudo pronto para a festa</h2><p>Nada pendente. Volte aqui no dia: o painel vira o acompanhamento ao vivo.</p></section>`;
    const prev = `<aside class="hv-pv" aria-labelledby="hv-pvt"><h2 class="t-h" id="hv-pvt">Como o convidado vê o convite</h2>${A.evt && A.evt.convite ? A.evt.convite(ev) : ''}<a class="btn btn-quiet btn-sm" href="#/g/${ev.slug}" target="_blank" rel="noopener" data-fk="hero-prev">${A.icon('eye', 16)} Abrir como convidado</a></aside>`;
    const rest = (couple ? pending : pending.slice(1)).filter((i) => !(i.k === 'quando' && heroBtn)), ready = items.filter((i) => i.done);
    const rows = rest.map((it) => couple ? `<div class="hv-ck"><span class="muted">${A.icon('clock', 20)}</span><div class="grow">${E(it.t)}<span class="sr-only"> (falta)</span></div></div>` : `<div class="hv-ck"><span class="muted">${A.icon('clock', 20)}</span><span class="grow">${E(it.t)}</span><span class="flex" style="gap:var(--space-1)">${ctaOf(it, 'btn btn-quiet btn-sm', id)}${it.manual ? `<button class="btn btn-quiet btn-sm" data-act="hv-done" data-k="${it.k}" data-fk="done-${it.k}">Já fiz</button>` : ''}</span></div>`).join('');
    const readyRows = ready.map((it) => `<div class="hv-ck"><span class="pos">${A.icon('check', 20)}</span><div class="grow"><span class="hv-done">${E(it.t)}</span><span class="sr-only"> (feito)</span>${it.note ? `<div class="hv-hint">${E(it.note)}</div>` : ''}</div>${couple ? '' : `<a class="btn btn-quiet btn-sm" href="${it.href || '#'}" aria-label="Rever ${E(it.t)}" ${it.act ? `data-act="${it.act}" ${it.to ? `data-to="${it.to}"` : ''}` : ''}>Rever</a>`}</div>`).join('');
    const checklist = `<section class="hv-rest" aria-labelledby="hv-chk"><div class="flex between"><h2 class="t-h" id="hv-chk">${couple ? 'O que falta' : 'No caminho até a festa'}</h2><span class="t-small">${done} de ${items.length} prontos</span></div><div class="progress hv-chkp" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}" aria-label="Etapas prontas"><i style="width:${Math.round((done / Math.max(items.length, 1)) * 100)}%"></i></div>${couple ? '<p class="t-small" style="margin-top:var(--space-2)">Quem organiza cuida dessas etapas. Você acompanha por aqui e aprova fotos na festa.</p>' : ''}${rows ? `<div style="margin-top:8px">${rows}</div>` : ''}${ready.length ? `<details class="hv-disclosure ds-fold b-baixo" style="margin-top:var(--space-3)"><summary>${A.icon('check', 16)}<span class="grow">Já está pronto (${ready.length})</span></summary><div class="ds-fold-b">${readyRows}</div></details>` : ''}</section>`;
    const open = gateOpen(id);
    const rules = `<details class="hv-det hv-sec hv-rest ds-fold sem-borda" ${RULES_OPEN ? 'open' : ''}><summary><span class="grow">Regras da festa <span class="t-small">· ${pub ? 'publicado' : 'rascunho'} · interação ${open ? 'aberta' : 'fechada'}</span></span></summary><div class="ds-fold-b">${rulesHtml(id, couple)}</div></details>`;
    const nd = couple ? '' : nudge('antes-da-festa', ev);
    return `<div class="hv-top"><div class="hv-before">${hero}${nextBlock}</div>${prev}<div class="hv-lower">${checklist}${rules}<p class="t-small hv-rest"><a class="link" href="${base(id)}/inspiracao">Ideias para sua festa</a></p>${nd ? `<div class="hv-nudge">${nd}</div>` : ''}</div></div>`;
  }

  /* ---------- Hoje: DURANTE (faixa viva) ---------- */
  function liveHtml(id) {
    const s = stats(id), ph = P(id), last = ph.find((p) => p.status === 'aprovada') || ph[0];
    const left = last ? `<div class="hv-last" data-ids="${ph.slice(0, 10).map((p) => p.id).join(',')}"><div class="hv-last-in"><button data-act="hv-open" data-id="${last.id}" data-fk="last-open" aria-label="Ampliar a última foto, de ${E(gname(id, last.autor))}">${A.img(last.n, last.ratio, `Última foto, de ${gname(id, last.autor)} (ilustração do protótipo)`)}</button></div><p class="t-small">Última foto · ${E(gname(id, last.autor))} · ${agoOf(last) || hhmm(last.ck)}${last.status === 'revisar' ? ' · na fila de revisão' : ''}</p></div>` : A.emptyState({ icon: 'camera', title: 'A primeira foto aparece aqui', body: 'Assim que alguém enviar, ela chega nesta faixa.' });
    const right = `<div><div class="hv-bn"><b>${s.noAr}</b><span>${plural(s.noAr, 'foto no ar', 'fotos no ar')}</span></div><div class="hv-bn"><b>${s.pend}</b><span>${s.pend ? `<a class="hv-lnk" href="${base(id)}/fotos?f=revisar">${plural(s.pend, 'foto para revisar', 'fotos para revisar')}</a>` : 'para revisar · fila limpa'}</span></div><div class="hv-bn"><b>${s.part}%</b><span>participaram · ${s.foto} de ${s.denom}</span></div></div>`;
    return left + right;
  }
  function queueHtml(id, couple) {
    const q = P(id).filter((p) => p.status === 'revisar'); const show = q.slice(0, 4);
    const head = `<div class="flex between flex-wrap" style="margin-bottom:var(--space-3)"><h2 class="t-h">Para revisar${q.length ? ` (${q.length})` : ''}</h2>${q.length ? `<a class="btn btn-primary" href="${base(id)}/fotos?f=revisar" data-fk="q-all">Revisar ${q.length > show.length ? 'as ' + q.length : 'tudo'} em Fotos</a>` : ''}</div>`;
    if (!q.length) return head + `<p class="t-small">Fila limpa: nada esperando revisão agora.</p>`;
    return head + `<div class="list" data-ids="${show.map((p) => p.id).join(',')}">${show.map((p) => `<div class="li hv-qrow"><button class="hv-thumb hv-open" data-act="hv-open" data-id="${p.id}" data-fk="qo-${p.id}" aria-label="Ampliar foto de ${E(gname(id, p.autor))}">${A.img(p.n, p.ratio, '')}</button><div class="grow"><b>${E(gname(id, p.autor))}</b><div class="t-small">${hhmm(p.ck)} · ${E(p.motivo || 'Revisão pedida')}</div></div><button class="btn btn-sm btn-line" data-act="hv-ap" data-id="${p.id}" data-fk="qa-${p.id}">Aprovar</button>${couple ? '' : `<button class="btn btn-sm btn-quiet" data-act="hv-oc" data-id="${p.id}" data-fk="qh-${p.id}">Ocultar</button>`}</div>`).join('')}</div>${q.length > show.length ? `<p class="t-small" style="margin-top:var(--space-2)">Mostrando ${show.length} de ${q.length}.</p>` : ''}<p class="hv-hint hv-khint" style="margin-top:var(--space-2)">Em Fotos: A aprova, R oculta, Z desfaz.</p>`;
  }
  function ctrlHtml(id, ro) {
    const t = telao(id), pn = panic(id).on, off = t.paused || pn;
    const modelos = A.data.telaoModelos.map((m) => [m[0], m[1]]);
    return `<div class="hv-ctrl"><div class="flex" style="gap:var(--space-3)">${A.icon('tv', 20)}<b class="t-h">Telão</b><span class="badge ${off ? 'warn' : 'ok'}" aria-live="polite">${pn ? 'Pausado pela pausa geral' : off ? 'Pausado' : 'No ar'}</span></div>${ro ? `<span class="t-small">Modelo: ${E((modelos.find((m) => m[0] === t.modelo) || [])[1] || '')}</span>` : `<button class="btn btn-quiet btn-sm" data-act="hv-telao" data-fk="tl-btn" ${pn ? 'disabled' : ''}>${A.icon(t.paused ? 'play' : 'pause', 16)} ${t.paused ? 'Retomar telão' : 'Pausar telão'}</button>`}<span class="grow"></span><a class="btn btn-quiet btn-sm" href="${base(id)}/compartilhar">Conectar ou abrir ${A.icon('arrow', 16)}</a></div>${ro ? '' : `<details class="hv-disclosure ds-fold b-baixo"><summary>Modelo do telão</summary><div class="ds-fold-b" style="max-width:260px">${A.field({ name: 'modelo', label: 'Modelo do telão', required: true, value: t.modelo, options: modelos, extra: 'data-change="hv-modelo"' })}</div></details>`}`;
  }
  const riskHtml = (id) => `<section class="hv-risk" aria-labelledby="hv-rk"><h2 class="t-h" id="hv-rk">Se algo der errado</h2><p class="t-small">Tira o telão do ar, fecha o feed e segura toda foto nova na fila. Nada é apagado e você retoma quando quiser.</p><button class="btn btn-danger" data-act="hv-panic" data-fk="panic">${A.icon('pause', 16)} Pausar tudo</button></section>`;
  function panicBanner(id, couple) {
    const pn = panic(id); if (!pn.on) return '';
    return `<div class="banner bad" role="status" style="margin-bottom:24px">${A.icon('pause', 22)}<div class="grow"><b>Tudo pausado ${A.ago(Math.floor((Date.now() - pn.at) / 60000))}.</b><div>Telão fora do ar, feed e reações fechados, e as fotos novas ficam na fila (${stats(id).pend} esperando). Nada foi apagado.</div></div>${couple ? '' : `<button class="btn btn-primary btn-sm" data-act="hv-resume" data-fk="resume">Retomar tudo</button>`}</div>`;
  }
  let RULES_OPEN = false;
  document.addEventListener('toggle', (e) => { if (e.target && e.target.matches && e.target.matches('.hv-det')) RULES_OPEN = e.target.open; }, true);
  function duranteHtml(id, couple) {
    const open = gateOpen(id), pub = published(id), pn = panic(id).on;
    const head = `<div class="flex between flex-wrap" style="margin-bottom:var(--space-6);gap:12px;align-items:flex-end"><h1 class="t-display">Festa ao vivo</h1><p class="t-small" style="max-width:38ch">${couple ? 'Modo Acompanhar: você vê tudo e aprova fotos. Para pausar a festa, fale com quem organiza.' : 'As fotos chegam sozinhas. Você só decide o que aparece.'}</p></div>`;
    const rules = `<details class="hv-det hv-sec ds-fold sem-borda" ${RULES_OPEN ? 'open' : ''}><summary><span class="grow">Regras da festa <span class="t-small">· interação ${pn ? 'fechada pela pausa' : open ? 'aberta' : 'fechada'}${pub ? '' : ' · rascunho'}</span></span></summary><div class="ds-fold-b">${rulesHtml(id, couple)}</div></details>`;
    return `<div id="hv-panic">${panicBanner(id, couple)}</div>${head}<div class="hv-dash"><div class="hv-dash-main"><div id="hv-live" class="hv-live">${liveHtml(id)}</div><p class="sr-only" id="hv-say" aria-live="polite"></p><section class="hv-sec" id="hv-queue">${queueHtml(id, couple)}</section></div><aside class="hv-dash-side" aria-label="Controles da festa">${ctrlHtml(id, couple)}${rules}${couple || pn ? '' : riskHtml(id)}</aside></div>`;
  }
  function drawLive(id) {
    if (A.sim().state !== 'ok' || !A.$('#hv-live')) return;
    const couple = ROLE() === 'couple' && !ST.get('hv.full', false);
    setRegion('#hv-live', liveHtml(id)); setRegion('#hv-queue', queueHtml(id, couple)); refreshBadge();
  }
  function startLive(id) {
    const tick = () => {
      if (!A.$('#hv-live')) return; if (get('ex', id, []).length >= 60) return;
      const m = model(id), pool = m.guests.filter((g) => !g.bloq); if (!pool.length) return;
      const ev = EV(id), pn = panic(id).on, g = pool[Math.floor(Math.random() * pool.length)], c = get('xc', id, 0) + 1; put('xc', id, c);
      const ck = startMin(ev) + 250 + Math.floor((Date.now() - LOAD) / 60000), mis = A.data.missions.filter((x) => x.on), rev = pn || Math.random() < 0.22;
      const p = { id: 'x' + c, n: 100 + c, autor: g.id, status: rev ? 'revisar' : 'aprovada', min: 0, ck, t: Date.now(), missao: Math.random() < 0.35 ? mis[Math.floor(Math.random() * mis.length)].id : null, curtidas: 0, comentarios: 0, telao: !rev, ratio: Math.random() < 0.25 ? 'l' : 'p', motivo: rev ? (pn ? 'Chegou durante a pausa' : MOT[c % MOT.length]) : '' };
      upd('ex', id, (l) => l.concat([p]), []);
      if (!g.entered) upd('gu', id, (o) => { o[g.id] = Object.assign({}, o[g.id], { entrou: true, ck }); return o; }, {});
      drawLive(id); const nova = A.$('#hv-live .hv-last-in'); if (nova) nova.classList.add('hv-new'); const say = A.$('#hv-say'); if (say) say.textContent = `Nova foto de ${g.primeiro}${rev ? ', na fila de revisão' : ''}.`;
    };
    TM.push(setInterval(tick, 6500));
  }

  /* ---------- Hoje: DEPOIS (Reviver) ---------- */
  const fmtD = (days, id) => { const off = A.when(id).days; const d = new Date(new Date('2026-11-14T12:00:00').getTime() + (off + days) * DAY); return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const dep = (id) => get('dep', id, {});
  const setDep = (id, patch) => upd('dep', id, (o) => Object.assign({}, o, patch), {});
  function depoisHtml(id, couple) {
    const ev = EV(id), s = stats(id), d = dep(id), role = ROLE(), canExp = role !== 'planner', day = -A.when(id).days, wiped = get('wipe', id, false), P_ = A.data.papeis;
    const lock = canExp ? '' : `<p class="hv-hint">Só ${E(P_.owner)} ou ${E(P_.couple)} baixa, exporta e apaga.</p>`;
    if (wiped) return A.emptyState({ icon: 'trash', title: 'As fotos foram apagadas', body: 'Você apagou o álbum deste evento. Para ver o protótipo de novo, use “Reiniciar dados” na barra Protótipo.' });
    const pend = s.pend ? `<div class="banner warn" style="margin-bottom:20px">${A.icon('warn', 20)}<div class="grow">${s.pend} ${plural(s.pend, 'foto ainda espera', 'fotos ainda esperam')} revisão e ${plural(s.pend, 'fica', 'ficam')} fora do álbum final. <a class="link hv-lnk" href="${base(id)}/fotos?f=revisar">Revisar agora</a></div></div>` : '';
    const best = P(id).filter((p) => p.status === 'aprovada').sort((x, y) => y.curtidas - x.curtidas || y.ck - x.ck)[0];
    const cover = best ? `<div class="hv-cover"><button data-act="hv-reviver" data-fk="rev-cover" aria-label="Assistir o Reviver, a noite em capítulos">${A.img(best.n, best.ratio === 'l' ? 'p' : best.ratio, 'Capa do álbum: a foto mais curtida da festa (ilustração do protótipo)')}<span class="hv-play" aria-hidden="true">${A.icon('play', 24)}</span></button></div>` : '';
    const hero = `<section class="hv-rev" aria-label="Reviver">${cover}<div class="stack"><h1 class="hv-big">As fotos são de vocês.</h1><p class="t-lead" style="max-width:46ch">${s.noAr} ${plural(s.noAr, 'foto', 'fotos')} de ${s.foto} ${plural(s.foto, 'pessoa', 'pessoas')} · ${E(A.when(id).label.toLowerCase())}. Assista a noite em capítulos e depois decida o que entregar.</p><div class="hv-row"><button class="btn btn-primary btn-lg" data-act="hv-reviver" data-fk="rev">${A.icon('play', 18)} Assistir o Reviver</button><a class="btn btn-quiet" href="${base(id)}/fotos?f=aprovadas">Ver o álbum final</a></div></div></section>`;
    if (couple) return pend + hero + `<section class="hv-sec"><div class="flex between" style="align-items:flex-start;gap:16px"><div><h3 class="t-h">Cápsula de memória</h3><p class="t-small">Guardar meus destaques para a lembrança anual.</p></div>${sw(d.cap, 'hv-cap', 'Guardar meus destaques para a lembrança anual', 'sw-cap')}</div></section><p class="t-small">Entrega aos convidados, livro e exportação ficam com quem organiza. Para ver tudo, ligue “Ver painel completo”.</p>`;
    const step = (n, title, body) => `<section class="hv-sec hv-step"><span class="hv-stn" aria-hidden="true">${n}</span><div class="stack-3"><h3 class="t-h">${title}</h3>${body}</div></section>`;
    const entrega = step('1', 'Entregar as fotos aos convidados', `<div class="flex between" style="gap:16px"><p class="t-small">Cada convidado recebe um link com as fotos dele e as da festa.</p>${canExp ? sw(d.entrega, 'hv-entrega', 'Liberar entrega das fotos', 'sw-ent') : ''}</div>${d.entrega ? `<div class="hv-row"><button class="btn btn-line btn-sm" data-act="hv-enviar" data-fk="enviar" ${canExp ? '' : 'disabled'}>${A.icon('send', 16)} Enviar agora</button><span class="t-small" aria-live="polite">${d.enviado ? `${d.enviado} enviadas · simulado: WhatsApp e e-mail dependem de integração` : 'Ainda não enviou.'}</span></div>` : ''}${lock}`);
    const album = step('2', 'Álbum final', `<p class="t-small">${s.noAr} ${plural(s.noAr, 'foto aprovada', 'fotos aprovadas')}, ${s.destaques} ${plural(s.destaques, 'destacada', 'destacadas')} pelos convidados.</p><div class="hv-row"><a class="btn btn-line btn-sm" href="${base(id)}/fotos?f=aprovadas">Abrir em Fotos</a><button class="btn btn-line btn-sm" data-act="hv-zip" data-fk="zip" ${canExp ? '' : 'disabled'}>${A.icon('download', 16)} Baixar tudo (ZIP)</button></div>`);
    const livro = step('3', 'Livro em PDF', d.livro ? `<p class="t-small">Livro pronto, formato A4. Simulado: o PDF real é gerado pelo servidor.</p><div class="hv-row"><button class="btn btn-line btn-sm" data-act="hv-bookdl" data-fk="bookdl">${A.icon('download', 16)} Baixar PDF</button><button class="btn btn-quiet btn-sm" data-act="hv-book" data-fk="book" ${canExp ? '' : 'disabled'}>Gerar de novo</button></div>` : `<p class="t-small">Monta as melhores fotos em páginas, para imprimir.</p><div class="hv-row"><button class="btn btn-line btn-sm" data-act="hv-book" data-fk="book" ${canExp ? '' : 'disabled'}>Gerar livro (simulado)</button></div>`);
    const cap = step('5', 'Cápsula de memória', `<div class="flex between" style="gap:16px"><p class="t-small">Guardar meus destaques para a lembrança anual. Dá para desligar quando quiser, sem perguntas.</p>${sw(d.cap, 'hv-cap', 'Guardar meus destaques para a lembrança anual', 'sw-cap')}</div>`);
    const th = d.thanks ? `<p class="t-small">Agradecimento enviado ${E(d.thanks.quando)}: “${E(d.thanks.txt)}”</p><button class="btn btn-quiet btn-sm" data-act="hv-thanks" data-fk="thx">Escrever outro</button>` : `<p class="t-small">Uma mensagem sua para todos que entraram na festa.</p><button class="btn btn-line btn-sm" data-act="hv-thanks" data-fk="thx">Escrever agradecimento</button>`;
    const thanks = step('4', 'Agradecer aos convidados', th);
    const exportDay = 330, delDay = 365, pct = Math.min(100, Math.round((day / delDay) * 100));
    const tl = `<section class="hv-sec"><h3 class="t-h" style="margin-bottom:var(--space-3)">As fotos ficam com você por um ano</h3><div class="hv-tline" role="img" aria-label="Linha do tempo: hoje é o dia ${day} de 365"><i style="width:${pct}%"></i><b style="left:${(exportDay / delDay) * 100}%"></b><b style="left:99.4%"></b></div><div class="list"><div class="li"><b style="min-width:92px">Hoje · dia ${day}</b><span class="grow">Tudo guardado e acessível.</span></div><div class="li"><b style="min-width:92px">Dia ${exportDay}</b><span class="grow">${E(fmtD(exportDay, id))}: mandamos tudo para a sua nuvem.</span></div><div class="li"><b style="min-width:92px">Dia ${delDay}</b><span class="grow">${E(fmtD(delDay, id))}: apagamos tudo do Albora.</span></div></div><div class="hv-row" style="margin-top:12px"><button class="btn btn-line btn-sm" data-act="hv-cloud" data-fk="cloud" ${canExp ? '' : 'disabled'}>${A.icon('upload', 16)} Exportar para minha nuvem (simulado)</button></div>${d.cloud ? `<p class="t-small" aria-live="polite" style="margin-top:8px">Exportação simulada concluída ${E(d.cloud)}. Na versão real depende da nuvem que você conectar.</p>` : ''}${lock}</section>`;
    const mais = `<details class="hv-disclosure hv-sec ds-fold sem-borda"><summary>Cápsula de memória e agradecimento</summary><div class="ds-fold-b">${cap}${thanks}</div></details>`;
    const risk = `<section class="hv-risk" aria-labelledby="hv-rk"><h2 class="t-h" id="hv-rk">Apagar as fotos</h2><p class="t-small">Apaga o álbum, o telão e o Reviver deste evento, e os convidados perdem o acesso. Baixe ou exporte antes: depois não dá para recuperar.</p><button class="btn btn-danger" data-act="hv-wipe" data-fk="wipe" ${canExp ? '' : 'disabled'}>${A.icon('trash', 16)} Apagar tudo agora</button></section>`;
    return pend + hero + `<div class="hv-steps">${entrega}${album}${livro}${thanks}</div>` + `<details class="hv-disclosure hv-sec ds-fold sem-borda"><summary>Cápsula de memória</summary><div class="ds-fold-b">${cap}</div></details>` + tl + risk;
  }
  A.acts['hv-cap'] = () => { const id = curId(), d = dep(id), on = !d.cap; setDep(id, { cap: on }); A.toast(on ? 'Destaques guardados para a lembrança anual.' : 'Cápsula desligada. Nada será guardado.'); redraw(); };
  A.acts['hv-entrega'] = () => { const id = curId(), d = dep(id), on = !d.entrega; setDep(id, { entrega: on }); withUndo(on ? 'Entrega liberada. Falta enviar.' : 'Entrega desligada.', () => { setDep(id, { entrega: !on }); redraw(); }); redraw(); };
  A.acts['hv-enviar'] = (el) => { const id = curId(); A.busy(el, 1200, () => { const n = G(id).filter((g) => g.entered && !g.bloq).length; setDep(id, { enviado: n }); A.toast(`${n} entregas enviadas (simulado).`); redraw(); }); };
  A.acts['hv-zip'] = (el) => A.busy(el, 1200, () => A.toast('Na versão real, baixaria um ZIP com todas as fotos aprovadas (simulado).'));
  A.acts['hv-book'] = (el) => A.busy(el, 1800, () => { setDep(curId(), { livro: true }); A.toast('Livro gerado (simulado).'); redraw(); });
  A.acts['hv-bookdl'] = () => A.toast('Na versão real, baixaria o PDF do livro (simulado).');
  A.acts['hv-cloud'] = (el) => A.busy(el, 1500, () => { setDep(curId(), { cloud: 'agora' }); redraw(); });
  A.acts['hv-wipe'] = async () => { const id = curId(); const ok = await A.confirm({ title: 'Apagar todas as fotos agora?', body: 'O álbum, o telão e o Reviver deste evento ficam vazios. Os convidados perdem o acesso. Baixe antes se quiser guardar: depois não dá para recuperar.', confirm: 'Apagar tudo', danger: true, type: 'apagar' }); if (!ok) return; put('wipe', id, true); refreshBadge(); A.toast('Fotos apagadas.'); redraw(); };
  A.acts['hv-thanks'] = () => {
    const id = curId(), ev = EV(id), txt = `Obrigado por fazer parte do ${ev.nome}. Cada foto de vocês é parte da memória dessa noite.`;
    A.modal({ title: 'Agradecer aos convidados', body: `<form data-submit="hv-thx-send" class="stack">${A.field({ name: 'msg', label: 'Sua mensagem', rows: 4, value: txt, required: true })}<p class="hv-hint">Simulado: o envio por WhatsApp e e-mail depende de integração.</p><div class="modal-actions"><button type="button" class="btn btn-quiet" data-mclose>Cancelar</button><button class="btn btn-primary" type="submit">Enviar a todos</button></div></form>` });
  };
  A.acts['hv-thx-send'] = (f) => { const v = A.validate(f, { msg: A.rules.min(10, 'Escreva pelo menos 10 caracteres.') }); if (!v) return; const id = curId(); setDep(id, { thanks: { txt: v.msg, quando: 'agora' } }); A.$$('.modal').pop()?.querySelector('[data-mclose]')?.click(); A.toast('Agradecimento enviado (simulado).'); redraw(); };

  /* Reviver: player de capítulos */
  A.acts['hv-reviver'] = () => {
    const id = curId(), ph = P(id).filter((p) => p.status === 'aprovada').sort((a, b) => a.ck - b.ck);
    if (!ph.length) return A.toast('Ainda não há fotos aprovadas para o Reviver.');
    const moms = A.data.momentos, per = Math.ceil(ph.length / moms.length), chap = moms.map((m, i) => ({ t: m, f: ph.slice(i * per, i * per + per) })).filter((c) => c.f.length);
    let i = 0, playing = true, tm = null; const slug = EV(id).slug;
    const api = A.modal({ title: 'Reviver', wide: true, label: 'Reviver: a noite em capítulos', body: '<div id="hv-rv"></div>' });
    const draw = () => {
      const el = A.$('#hv-rv', api.el); if (!el) return; const last = i >= chap.length;
      if (last) { el.innerHTML = `<div class="empty" style="padding:24px 0"><h3 class="t-title">Foi essa a noite</h3><p>${ph.length} fotos de ${new Set(ph.map((p) => p.autor)).size} pessoas.</p><div class="hv-row" style="justify-content:center"><a class="btn btn-primary" href="${base(id)}/fotos?f=aprovadas" data-mclose>Ver todas as fotos</a><button class="btn btn-line" data-act="hv-rv" data-d="again">Ver de novo</button><button class="btn btn-line" data-act="copy" data-text="https://albora.app/e/${slug}/reviver">${A.icon('copy', 16)} Copiar link</button></div></div>`; return; }
      const c = chap[i]; el.innerHTML = `<div class="flex" style="gap:4px;margin-bottom:16px" role="progressbar" aria-label="Capítulos" aria-valuemin="1" aria-valuemax="${chap.length}" aria-valuenow="${i + 1}">${chap.map((_, k) => `<div class="progress grow" style="height:4px"><i style="width:${k < i ? 100 : k === i ? 100 : 0}%;${k === i ? '' : ''}"></i></div>`).join('')}</div><span class="t-label">Capítulo ${i + 1} de ${chap.length}</span><h3 class="t-title" style="margin:var(--space-2) 0 var(--space-4)" aria-live="polite">${E(c.t)}</h3><div class="flex" style="gap:8px;overflow-x:auto;align-items:flex-start;padding-bottom:var(--space-2)">${c.f.slice(0, 5).map((p) => `<div style="flex:none;height:min(34vh,300px);border-radius:var(--r-2);overflow:hidden;background:var(--surface-2)">${A.img(p.n, p.ratio, '').replace('<img ', '<img style="height:100%;width:auto;object-fit:contain" ')}</div>`).join('')}</div><p class="t-small" style="margin-top:8px">${c.f.length} ${plural(c.f.length, 'foto', 'fotos')} neste capítulo</p>`;
    };
    const go = (d) => { i = Math.max(0, Math.min(chap.length, i + d)); draw(); ctl(); };
    const ctl = () => { const el = A.$('#hv-rvc', api.el); if (!el) return; el.innerHTML = `<button class="btn btn-line btn-sm" data-act="hv-rv" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Capítulo anterior">${A.icon('chevleft', 16)}</button><button class="btn btn-line btn-sm" data-act="hv-rv" data-d="play">${A.icon(playing ? 'pause' : 'play', 16)} ${playing ? 'Pausar' : 'Continuar'}</button><button class="btn btn-line btn-sm" data-act="hv-rv" data-d="1" ${i >= chap.length ? 'disabled' : ''} aria-label="Próximo capítulo">${A.icon('chevron', 16)}</button><span class="hv-hint grow" style="text-align:right">Setas e Espaço também funcionam.</span>`; };
    api.el.querySelector('.modal-body').insertAdjacentHTML('beforeend', '<div class="flex" id="hv-rvc" style="margin-top:16px"></div>');
    const onKey = (e) => { if (!api.el.isConnected) return document.removeEventListener('keydown', onKey); if (A.$$('.modal').pop() !== api.el) return; if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); toggle(); } };
    const toggle = () => { playing = !playing; ctl(); };
    api.el.addEventListener('click', (e) => { const b = e.target.closest('[data-act="hv-rv"]'); if (!b) return; e.stopPropagation(); const d = b.dataset.d; if (d === 'play') toggle(); else if (d === 'again') { i = 0; playing = true; go(0); } else go(+d); });
    document.addEventListener('keydown', onKey);
    tm = setInterval(() => { if (!api.el.isConnected) return clearInterval(tm); if (playing && i < chap.length) go(1); }, 4200);
    const oc = api.close; api.close = (r) => { clearInterval(tm); document.removeEventListener('keydown', onKey); oc(r); };
    A.acts['hv-rv'] = () => {}; draw(); ctl();
  };

  /* ---------- Hoje: rota ---------- */
  A.route('/h/e/:id/hoje', (ctx) => {
    clearTimers(); const id = ctx.params.id, ev = EV(id), phase = PH(id);
    const body = () => {
      const role = ROLE(), couple = role === 'couple' && !ST.get('hv.full', false);
      const switchRow = role === 'couple' ? `<div class="flex between flex-wrap" style="margin-bottom:24px;gap:12px"><div><b class="t-h">${couple ? 'Modo Acompanhar' : 'Painel completo'}</b><p class="t-small">${couple ? 'Você vê o que importa e aprova fotos. Quem organiza cuida do resto.' : 'Você está vendo os mesmos controles de quem organiza.'}</p></div><label class="flex" style="gap:var(--space-3);cursor:pointer"><span class="t-small">Ver painel completo</span>${sw(!couple, 'hv-full', 'Ver painel completo', 'sw-full')}</label></div>` : '';
      const inner = phase === 'antes' ? antesHtml(id, couple) : phase === 'durante' ? duranteHtml(id, couple) : depoisHtml(id, couple);
      return switchRow + inner;
    };
    const empty = { icon: 'sun', title: 'Nada para mostrar agora', body: 'Quando a festa começar, as fotos e os controles aparecem aqui.' };
    const sk = phase === 'antes' ? `<div aria-busy="true" aria-label="Carregando o painel"><div class="hv-sk-top"><div class="skeleton a"></div><div class="skeleton b"></div></div></div>` : `<div aria-busy="true" aria-label="Carregando o painel"><div class="skeleton" style="height:486px;margin-bottom:var(--space-6)"></div><div class="skeleton hv-sk-chips"></div><div class="skeleton hv-sk-row"></div><div class="skeleton hv-sk-row"></div></div>`;
    const st = () => A.stateful({ ok: body, loading: sk, error: A.errorState({ title: 'Não deu para carregar o painel', body: 'Os dados da festa continuam salvos. Confira a conexão e tente de novo.' }), empty: A.emptyState(empty) });
    const content = `<div id="hv-body">${st()}</div>`;
    const draw = () => { const b = A.$('#hv-body'); if (!b) return; setRegion('#hv-body', st()); refreshBadge(); };
    CUR = { kind: 'hoje', id, draw };
    return { title: 'Hoje', html: A.hostShell(ctx, { section: 'hoje', title: A.sim().state === 'ok' ? '' : 'Hoje', pageClass: 'hv-pg' }, content), after: () => {
      refreshBadge();
      if (phase === 'durante' && id === 'e1') startLive(id);
      if (ctx.q.quando && A.sim().state === 'ok' && EV(id)._x) { history.replaceState(null, '', location.pathname + location.search + '#/h/e/' + id + '/hoje'); A.acts['hv-quando'](); }
    } };
  });
  A.route('/h/e/:id', (ctx) => redirect(`/h/e/${ctx.params.id}/hoje`)(ctx));
  A.route('/h/e/:id/ao-vivo', (ctx) => redirect(`/h/e/${ctx.params.id}/hoje`)(ctx));
  A.route('/h/e/:id/pre-event', (ctx) => redirect(`/h/e/${ctx.params.id}/hoje`)(ctx));
  A.route('/h/e/:id/album', (ctx) => redirect(`/h/e/${ctx.params.id}/fotos`)(ctx));
  A.route('/h/e/:id/moderation', (ctx) => redirect(`/h/e/${ctx.params.id}/fotos?f=revisar`)(ctx));
  A.route('/h/e/:id/guests', (ctx) => redirect(`/h/e/${ctx.params.id}/convidados`)(ctx));
  A.route('/h/e/:id/insights', (ctx) => redirect(`/h/e/${ctx.params.id}/convidados?aba=numeros`)(ctx));

  /* ---------- Convidados ---------- */
  const ST2 = { fotografou: ['Fotografou', 'ok'], entrou: ['Entrou', 'info'], nao: ['Ainda não entrou', ''], bloqueado: ['Bloqueado', 'bad'] };
  const sbadge = (s) => `<span class="badge ${ST2[s][1]}">${ST2[s][0]}</span>`;
  function guestList(id) {
    const v = vs(id); let l = G(id).slice();
    if (v.gf !== 'todos') l = l.filter((g) => g.st2 === v.gf);
    const q = norm(v.gq.trim()); if (q) l = l.filter((g) => norm(g.nome).includes(q));
    if (v.gsort === 'fotos') l.sort((a, b) => b.nf - a.nf || a.nome.localeCompare(b.nome, 'pt-BR'));
    else if (v.gsort === 'menos') l.sort((a, b) => a.nf - b.nf || a.nome.localeCompare(b.nome, 'pt-BR'));
    else if (v.gsort === 'nome') l.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    else l.sort((a, b) => b.ck - a.ck);
    return l;
  }
  const canImport = () => !(ROLE() === 'couple' && !ST.get('hv.full', false));
  const guestEmpty = (id) => { const antes = PH(id) === 'antes'; return A.emptyState({ icon: 'users', title: antes ? 'Sua lista de convidados está vazia' : 'Ninguém entrou ainda', body: antes ? 'Cole os nomes de uma planilha ou de outra lista e confira antes de salvar. Quem abrir o link da festa também aparece aqui.' : 'Quando o primeiro convidado abrir o link, ele aparece aqui.', cta: antes && canImport() ? `<button class="btn btn-primary btn-lg" data-act="hv-importar" data-fk="imp-empty">${A.icon('upload', 18)} Colar lista de convidados</button>` : '' }); };
  function bannerImport(id) {
    const li = vs(id).lastImport; if (!li) return '';
    const n = (get('gl', id, [])).filter((x) => x.lote === li.lote).length; if (!n) return '';
    return `<div class="hv-ibanner" role="status"><span class="grow"><b>${n} ${plural(n, 'convidado adicionado', 'convidados adicionados')}</b> agora há pouco. Errou a lista? Dá para desfazer.</span><button class="btn btn-line btn-sm" data-act="hv-imp-undo" data-fk="imp-undo">Desfazer importação</button><button class="btn btn-quiet btn-sm" data-act="hv-imp-fechar" data-fk="imp-fechar">Fechar aviso</button></div>`;
  }
  function listaHtml(id) {
    const v = vs(id), gs = G(id), cnt = (s) => gs.filter((g) => g.st2 === s).length, l = guestList(id), phase = PH(id), antes = phase === 'antes';
    if (!gs.length) return guestEmpty(id);
    const chips = [['todos', 'Todos', gs.length], ['fotografou', 'Fotografaram', cnt('fotografou')], ['entrou', 'Entraram', cnt('entrou')], ['nao', 'Não entraram', cnt('nao')], ['bloqueado', 'Bloqueados', cnt('bloqueado')]].filter(([k, , c]) => k === 'todos' || (antes ? k === 'bloqueado' && c > 0 : true));
    const filtrando = v.gq || v.gf !== 'todos';
    const rows = l.length ? `<div class="list">${l.map((g) => `<button class="li hv-gr" data-act="hv-guest" data-gid="${g.id}" data-fk="g-${g.id}"><span class="avatar${g.nf ? ' hv-ring' : ''}" aria-hidden="true">${E(String(g.nome || '').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</span><span class="grow"><b>${E(g.nome)}</b>${g.oculto ? ' <span class="t-small">(nome oculto no telão)</span>' : ''}<span class="t-small" style="display:block">${g.entered ? `entrou às ${hhmm(g.ck)}` : [g.mesa ? `Mesa ${g.mesa}` : g.importado ? 'Da sua lista' : '', g.convites ? `convite reenviado ${g.convites}×` : ''].filter(Boolean).join(' · ') || '&nbsp;'}</span></span>${antes && g.st2 === 'nao' ? '' : sbadge(g.st2)}${antes ? '' : `<span class="n"><span class="sr-only">${g.nf} ${plural(g.nf, 'foto', 'fotos')}</span><span aria-hidden="true">${g.entered ? g.nf : '–'}</span></span>`}${A.icon('chevron', 16)}</button>`).join('')}</div>` : A.emptyState({ icon: 'search', title: v.gq ? `Ninguém para “${v.gq.trim().slice(0, 40)}”` : 'Ninguém neste filtro', body: v.gq ? 'Confira a escrita do nome. A lista completa continua aqui.' : 'Nenhum convidado está nessa situação agora. Volte para Todos para ver a lista inteira.', cta: filtrando ? `<button class="btn btn-line" data-act="hv-gclear" data-fk="gclr">Limpar busca e filtros</button>` : '' });
    const sort = antes ? '' : `<div class="flex" style="gap:8px"><label for="hv-gsort" class="t-small">Ordenar</label><select class="select" id="hv-gsort" data-change="hv-gsort"><option value="fotos" ${v.gsort === 'fotos' ? 'selected' : ''}>Mais fotos</option><option value="menos" ${v.gsort === 'menos' ? 'selected' : ''}>Menos fotos</option><option value="nome" ${v.gsort === 'nome' ? 'selected' : ''}>Nome (A–Z)</option><option value="recentes" ${v.gsort === 'recentes' ? 'selected' : ''}>Entraram agora há pouco</option></select></div>`;
    return `<div class="stack"><div id="hv-ibn">${bannerImport(id)}</div><div class="hv-tools"><label class="search" style="flex:1"><span class="sr-only">Buscar convidado</span>${A.icon('search', 18)}<input type="search" id="hv-gq" data-input="hv-gq" value="${E(v.gq)}" placeholder="Buscar convidado" autocomplete="off"></label>${sort}</div>${chips.length > 1 ? `<div class="ds-fl" role="group" aria-label="Filtrar por situação">${chips.map(([k, lab, c]) => `<button data-act="hv-gf" data-f="${k}" data-fk="gf-${k}" aria-pressed="${v.gf === k}">${lab} <span class="n">${c}</span></button>`).join('')}</div>` : ''}<p class="t-small" aria-live="polite">${l.length} ${plural(l.length, 'pessoa', 'pessoas')}</p><div id="hv-glist">${rows}</div></div>`;
  }
  function funnelHtml(id) {
    const s = stats(id), gs = G(id), ph = P(id);
    const steps = [[s.actual ? 'apareceram' : 'esperados', s.denom], ['entraram', s.entraram], ['fotografaram', s.foto], ['com foto no ar', gs.filter((g) => ph.some((p) => p.autor === g.id && p.status === 'aprovada')).length]];
    return `<div class="hv-fun" role="group" aria-label="Caminho dos convidados, da estimativa à foto no ar">${steps.map(([l, n], i) => (i ? `<span class="hv-fun-a" aria-hidden="true">${A.icon('arrow', 20)}</span>` : '') + `<div class="hv-fun-i"><b>${n}</b><span>${l}${i && steps[i - 1][1] ? ` · ${Math.round((n / steps[i - 1][1]) * 100)}%` : ''}</span></div>`).join('')}</div>`;
  }
  function numerosHtml(id) {
    const s = stats(id), ev = s.ev, c = chart(id), ph = P(id);
    const verdict = s.part >= 40 ? ['ok', 'check', 'Acima da meta: mais de 4 em cada 10 convidados já fotografaram.'] : s.part >= 25 ? ['warn', 'info', 'Quase na meta de 4 em cada 10. Uma missão ou um aviso no telão ajuda.'] : ['warn', 'info', 'Abaixo da meta de 4 em cada 10. Placa na mesa e uma missão nova costumam ajudar.'];
    const rank = A.data.missions.filter((m) => m.on).map((m) => ({ m, n: ph.filter((p) => p.missao === m.id).length })).sort((a, b) => b.n - a.n).slice(0, 6);
    const rk = rank.some((r) => r.n) ? rank.map((r) => `<div class="li"><span class="t-label" style="width:28px">${E(r.m.romano)}</span><span class="grow">${E(r.m.titulo)}</span><b class="t-mono">${r.n} ${plural(r.n, 'foto', 'fotos')}</b></div>`).join('') : '<p class="t-small">Nenhuma missão fotografada ainda.</p>';
    const form = `<form data-submit="hv-actual" class="flex flex-wrap" style="align-items:flex-end;gap:12px" novalidate><div style="min-width:200px">${A.field({ name: 'n', label: 'Quantas pessoas apareceram de verdade?', type: 'number', value: s.actual || '', required: true, hint: s.actual ? 'Número confirmado por você.' : ev.esperados ? `Hoje usamos a estimativa: ${ev.esperados}.` : 'Sem estimativa ainda: informe o número que você viu.' })}</div><button class="btn btn-line" type="submit">Confirmar</button></form>`;
    return `<div class="stack-5">${funnelHtml(id)}<p class="banner ${verdict[0]}">${A.icon(verdict[1], 18)}<span><b>${s.part}% de participação.</b> ${verdict[2]} Hora de ouro: ${c.peak}.</span></p><section class="hv-sec"><h3 class="t-h" style="margin-bottom:var(--space-3)">Confirmar quem apareceu</h3>${form}</section><section class="hv-sec"><h3 class="t-h" style="margin-bottom:var(--space-3)">Missões mais fotografadas</h3><div class="list">${rk}</div></section><section class="hv-sec"><h3 class="t-h" style="margin-bottom:var(--space-3)">Ritmo por hora</h3>${c.svg}</section></div>`;
  }
  const guestBody = (id) => {
    const v = vs(id), antes = PH(id) === 'antes'; if (antes && v.gtab === 'numeros') v.gtab = 'lista';
    const tabs = antes ? '' : `<div class="tabs" role="tablist" aria-label="Convidados" data-hv-tabs><button class="tab" role="tab" id="hv-t-lista" aria-selected="${v.gtab === 'lista'}" aria-controls="hv-p" tabindex="${v.gtab === 'lista' ? 0 : -1}" data-act="hv-gtab" data-t="lista" data-fk="t-lista">Lista</button><button class="tab" role="tab" id="hv-t-numeros" aria-selected="${v.gtab === 'numeros'}" aria-controls="hv-p" tabindex="${v.gtab === 'numeros' ? 0 : -1}" data-act="hv-gtab" data-t="numeros" data-fk="t-numeros">Números</button></div>`;
    return `${tabs}<div id="hv-p" class="hv-painel" ${antes ? '' : `role="tabpanel" aria-labelledby="hv-t-${v.gtab}"`}>${v.gtab === 'lista' || antes ? listaHtml(id) : numerosHtml(id)}</div>`;
  };
  const guestSk = `<div aria-busy="true" aria-label="Carregando os convidados">${'<div class="skeleton hv-sk-chips"></div>'.repeat(4)}${'<div class="skeleton hv-sk-chips m"></div>'.repeat(2)}<div class="skeleton hv-sk-chips u"></div>${Array.from({ length: 6 }, () => '<div class="skeleton hv-sk-row"></div>').join('')}</div>`;
  const guestContent = (id) => A.stateful({ ok: () => guestBody(id), loading: guestSk, error: A.errorState({ title: 'Não deu para carregar os convidados', body: 'Sua lista continua salva. Confira a conexão e tente de novo.' }), empty: guestEmpty(id), isEmpty: () => false });
  const drawGuests = (id) => () => { setRegion('#hv-gbody', guestContent(id)); };

  A.route('/h/e/:id/convidados', (ctx) => {
    clearTimers(); const id = ctx.params.id, v = vs(id), gs = G(id), antes = PH(id) === 'antes';
    if (ctx.q.aba) v.gtab = ctx.q.aba === 'numeros' ? 'numeros' : 'lista';
    const imp = canImport() ? `<button class="btn ${antes ? 'btn-primary' : 'btn-line'}" data-act="hv-importar" data-fk="imp" aria-label="Importar lista">${A.icon('upload', 18)}<span class="hv-lbl"> Importar lista</span></button>` : '';
    const exp = gs.length ? `<button class="btn btn-quiet" data-act="hv-export" aria-haspopup="menu" data-fk="exp" aria-label="Exportar">${A.icon('download', 18)}<span class="hv-lbl"> Exportar</span></button>` : '';
    const inv = `<button class="btn btn-accent" data-act="invite">${A.icon('send', 18)} Convidar pessoas</button>`;
    const actions = A.sim().state === 'ok' ? inv + (gs.length ? imp + exp : '') : '';
    const content = `<div id="hv-gbody">${guestContent(id)}</div>`;
    CUR = { kind: 'convidados', id, draw: drawGuests(id) };
    return { title: 'Convidados', html: A.hostShell(ctx, { section: 'convidados', title: 'Convidados', actions, pageClass: 'hv-pg' }, content), after: () => { refreshBadge(); if (ctx.q.g && model(id).gmap[ctx.q.g]) openGuest(id, ctx.q.g); if (ctx.q.importar && A.sim().state === 'ok' && canImport()) { history.replaceState(null, '', location.pathname + location.search + '#/h/e/' + id + '/convidados'); A.acts['hv-importar'](); } } };
  });
  A.inputs['hv-gq'] = (el) => { const id = curId(); vs(id).gq = el.value; drawGuestList(id); };
  function drawGuestList(id) { const p = A.$('#hv-p'); if (!p || vs(id).gtab !== 'lista') return; const l = guestList(id); const full = listaHtml(id); const tmp = document.createElement('div'); tmp.innerHTML = full; const nl = A.$('#hv-glist', tmp), cnt = A.$('[aria-live]', tmp); const gl = A.$('#hv-glist'), gc = A.$('#hv-p [aria-live]'); if (gl && nl) gl.innerHTML = nl.innerHTML; if (gc && cnt) gc.textContent = cnt.textContent; }
  A.inputs['hv-gsort'] = (el) => { const id = curId(); vs(id).gsort = el.value; drawGuestList(id); };
  A.acts['hv-gf'] = (el) => { const id = curId(); vs(id).gf = el.dataset.f; drawGuests(id)(); };
  A.acts['hv-gclear'] = () => { const id = curId(); Object.assign(vs(id), { gq: '', gf: 'todos' }); drawGuests(id)(); };
  A.acts['hv-gtab'] = (el) => { const id = curId(); vs(id).gtab = el.dataset.t; drawGuests(id)(); };
  document.addEventListener('keydown', (e) => { const tl = e.target.closest && e.target.closest('[data-hv-tabs]'); if (!tl || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; const tabs = A.$$('[role=tab]', tl); const i = tabs.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.click(); setTimeout(() => A.$(`[data-fk="${n.dataset.fk}"]`)?.focus()); });
  A.acts['hv-guest'] = (el) => openGuest(curId(), el.dataset.gid);
  A.acts['hv-export'] = (el) => {
    const id = curId(), ev = EV(id);
    A.menu(el, [{ head: 'Baixar como planilha' }, { label: 'Lista de convidados', icon: 'users', onClick: () => { const rows = [['Nome', 'Situação', 'Fotos', 'Missões', 'Entrou às', 'Nome oculto no telão']].concat(G(id).map((g) => [g.nome, ST2[g.st2][0], g.nf, g.missoes, g.entered ? hhmm(g.ck) : '', g.oculto ? 'sim' : 'não'])); dl(`albora-${ev.slug}-convidados.csv`, rows.map((r) => r.join(';')).join('\r\n')); A.toast('Planilha baixada.'); } }, { label: 'Números da festa', icon: 'chart', onClick: () => { const s = stats(id), c = chart(id); const rows = [['Medida', 'Valor'], ['Esperados', s.denom], ['Entraram', s.entraram], ['Fotografaram', s.foto], ['Participação (%)', s.part], ['Fotos no ar', s.noAr], ['Fotos para revisar', s.pend], ['Hora de ouro', c.peak]]; dl(`albora-${ev.slug}-numeros.csv`, rows.map((r) => r.join(';')).join('\r\n')); A.toast('Planilha baixada.'); } }]);
  };
  A.inputs.dummy = () => {};
  A.acts['hv-actual'] = (f) => { const v = A.validate(f, { n: A.rules.int(1, 2000) }); if (!v) return; const id = curId(); put('actual', id, +v.n); A.toast(`Confirmado: ${v.n} pessoas apareceram.`); drawGuests(id)(); };

  /* ---------- importar lista por colagem ---------- */
  const MINUSC = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const bonito = (n) => n.split(' ').map((w, i) => { const l = w.toLowerCase(); return i && MINUSC.has(l) ? l : l.split('-').map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('-'); }).join(' ');
  const chaveNome = (n) => norm(n).replace(/\s+/g, ' ').trim();
  const MIMP = { '': ['Novo', 'ok'], ja: ['Já está na lista', 'warn'], rep: ['Repetido acima', 'warn'], curto: ['Muito curto', 'bad'], longo: ['Nome muito longo', 'bad'], email: ['Parece um e-mail', 'bad'], fone: ['Parece um telefone', 'bad'], nome: ['Não parece um nome', 'bad'] };
  const INVALIDO = ['curto', 'longo', 'email', 'fone', 'nome'];
  const MAXIMP = 999;
  function lerNomes(txt) {
    const rows = []; let ignoradas = 0;
    String(txt || '').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').split(/\r\n|\r|\n/).forEach((linha) => {
      if (!linha.trim()) return;
      linha.split(/[;,\t]/).forEach((pedaco) => {
        let n = pedaco.replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '');
        n = n.replace(/^(?:\(?\d{1,4}\s*[.)\]:\-–—]+\s*|\d{1,4}\s+|[-–—•*·▪●]+\s*)/, '').replace(/\s+/g, ' ').trim();
        if (!n) return;
        if (!/[A-Za-zÀ-ÿ]/.test(n)) { ignoradas++; return; }
        const aj = n.length > 3 && !/@/.test(n) && (n === n.toUpperCase() || n === n.toLowerCase());
        rows.push({ orig: pedaco.trim(), nome: aj ? bonito(n) : n, ajustado: aj });
      });
    });
    return { rows, ignoradas };
  }
  function classificar(rows, existentes) {
    const vistos = new Set();
    rows.forEach((r) => {
      const n = r.nome.trim(), k = chaveNome(n); let m = '';
      if (!/[A-Za-zÀ-ÿ]/.test(n)) m = 'nome'; else if (n.length < 2) m = 'curto'; else if (n.length > 60) m = 'longo'; else if (/@/.test(n)) m = 'email'; else if ((n.match(/\d/g) || []).length >= 4) m = 'fone'; else if (existentes.has(k)) m = 'ja'; else if (vistos.has(k)) m = 'rep';
      if (!INVALIDO.includes(m)) vistos.add(k);
      r.mot = m;
      const o = IMP && IMP.over[r.orig]; r.inc = INVALIDO.includes(m) ? false : o && o.inc !== undefined ? o.inc : m === '';
    });
  }
  let IMP = null;
  function impLer() {
    const I = IMP, r = lerNomes(I.text); I.ign = r.ignoradas; I.cortadas = Math.max(0, r.rows.length - MAXIMP); I.rows = r.rows.slice(0, MAXIMP);
    I.rows.forEach((x) => { const o = I.over[x.orig]; if (o && o.nome !== undefined) { x.nome = o.nome; x.ajustado = false; } });
    classificar(I.rows, new Set(G(I.id).map((g) => chaveNome(g.nome))));
  }
  function impLinha(r, i) {
    const [lab, cls] = MIMP[r.mot], inv = INVALIDO.includes(r.mot);
    return `<div class="hv-ir" data-r="${i}"><label class="check"><input type="checkbox" data-change="hv-imp-inc" data-i="${i}" aria-label="Importar a linha ${i + 1}" ${r.inc ? 'checked' : ''} ${inv ? 'disabled' : ''}></label><input class="input" value="${E(r.nome)}" data-input="hv-imp-nome" data-i="${i}" aria-label="Nome na linha ${i + 1}" maxlength="80" autocomplete="off"><span class="badge ${cls}" data-b="${i}">${lab}${r.ajustado ? ' · maiúsculas ajustadas' : ''}</span></div>`;
  }
  function impResumo() {
    const I = IMP, n = I.rows.filter((r) => r.inc).length, ja = I.rows.filter((r) => r.mot === 'ja').length, rep = I.rows.filter((r) => r.mot === 'rep').length, inv = I.rows.filter((r) => INVALIDO.includes(r.mot)).length;
    const sum = $impSum(); const go = A.$('#hv-imp-go');
    const partes = [`${n} ${plural(n, 'pessoa será adicionada', 'pessoas serão adicionadas')}`, ja ? `${ja} já ${plural(ja, 'está', 'estão')} na lista` : '', rep ? `${rep} ${plural(rep, 'repetida', 'repetidas')} no texto` : '', inv ? `${inv} ${plural(inv, 'não parece nome', 'não parecem nome')}` : '', I.ign ? `${I.ign} ${plural(I.ign, 'item ignorado', 'itens ignorados')} (sem letras)` : '', I.cortadas ? `só as primeiras ${MAXIMP} linhas entram` : ''].filter(Boolean);
    if (sum) sum.textContent = I.text.trim() ? (I.rows.length ? partes.join(' · ') : 'Não encontramos nomes nesse texto. Cole um nome por linha.') : 'Cole a lista acima para ver a prévia aqui.';
    if (go) { go.textContent = `Importar ${n} ${plural(n, 'convidado', 'convidados')}`; go.disabled = !n; go.setAttribute('aria-disabled', n ? 'false' : 'true'); }
  }
  const $impSum = () => A.$('#hv-imp-sum');
  function impPintar() {
    const box = A.$('#hv-imp-list'); if (!IMP || !box) return;
    box.innerHTML = IMP.rows.length ? `<div class="hv-iscroll" role="group" aria-label="Prévia dos convidados que serão criados">${IMP.rows.map(impLinha).join('')}</div>` : '';
    impResumo();
  }
  function impSync() {
    if (!IMP) return; classificar(IMP.rows, new Set(G(IMP.id).map((g) => chaveNome(g.nome))));
    IMP.rows.forEach((r, i) => {
      const [lab, cls] = MIMP[r.mot], b = A.$(`[data-b="${i}"]`), c = A.$(`[data-change="hv-imp-inc"][data-i="${i}"]`);
      if (b) { b.className = 'badge ' + cls; b.textContent = lab + (r.ajustado ? ' · maiúsculas ajustadas' : ''); }
      if (c) { c.checked = r.inc; c.disabled = INVALIDO.includes(r.mot); }
    });
    impResumo();
  }
  let impRaf = 0;
  A.inputs['hv-imp-text'] = (el) => { if (!IMP) return; IMP.text = el.value; cancelAnimationFrame(impRaf); impRaf = requestAnimationFrame(() => { if (!IMP) return; impLer(); impPintar(); const e = A.$('#hv-imp-err'); if (e) e.innerHTML = ''; }); };
  A.inputs['hv-imp-nome'] = (el) => { if (!IMP) return; const r = IMP.rows[+el.dataset.i]; if (!r) return; r.nome = el.value; r.ajustado = false; IMP.over[r.orig] = Object.assign({}, IMP.over[r.orig], { nome: el.value }); impSync(); };
  A.inputs['hv-imp-inc'] = (el) => { if (!IMP) return; const r = IMP.rows[+el.dataset.i]; if (!r) return; IMP.over[r.orig] = Object.assign({}, IMP.over[r.orig], { inc: el.checked }); r.inc = el.checked; impResumo(); };
  A.acts['hv-importar'] = () => {
    const id = curId(); IMP = { id, text: '', over: {}, rows: [], ign: 0, cortadas: 0 };
    const api = A.sheet({ title: 'Importar lista de convidados', wide: true, label: 'Importar lista de convidados', body: `<div class="stack"><div class="field"><label for="hv-imp-t">Cole os nomes, um por linha <span class="muted">(vindos de uma planilha ou de outra lista)</span></label><textarea class="textarea hv-imp-t" id="hv-imp-t" rows="5" data-input="hv-imp-text" aria-describedby="hv-imp-h" autocomplete="off" spellcheck="false"></textarea><span class="hint" id="hv-imp-h">Aceitamos numeração (1. Ana), vírgula, ponto e vírgula e espaços sobrando. Nada é salvo antes de você confirmar.</span></div><p class="t-small" id="hv-imp-sum" role="status" aria-live="polite">Cole a lista acima para ver a prévia aqui.</p><div id="hv-imp-list"></div><div id="hv-imp-err" role="alert"></div><div class="modal-actions"><button type="button" class="btn btn-quiet" data-mclose>Cancelar</button><button class="btn btn-primary" id="hv-imp-go" data-act="hv-imp-go" disabled aria-disabled="true">Importar 0 convidados</button></div></div>` });
    IMP.api = api; api.onClose = () => { IMP = null; };
  };
  A.acts['hv-imp-go'] = (btn) => {
    const I = IMP; if (!I) return; const sel = I.rows.filter((r) => r.inc); if (!sel.length) return;
    const er = A.$('#hv-imp-err'); er.innerHTML = '';
    A.busy(btn, 700, () => {
      if (!IMP) return;
      if (A.sim().state === 'error') { er.innerHTML = `<div class="banner bad">${A.icon('warn', 20)}<div class="grow"><b>Não deu para salvar a lista agora.</b> O texto e as correções continuam aqui. Tente de novo. <span class="t-small">(Protótipo: erro simulado pelo estado “Erro” da barra Protótipo.)</span></div></div>`; return; }
      const lote = 'b' + Date.now().toString(36), novos = sel.map((r, i) => ({ id: 'i' + lote + i, nome: r.nome.trim().replace(/\s+/g, ' '), lote }));
      upd('gl', I.id, (a) => a.concat(novos), []);
      const v = vs(I.id); v.lastImport = { lote }; v.gtab = 'lista'; v.gf = 'todos'; v.gq = '';
      const fora = I.rows.length - novos.length; I.api.close();
      withUndo(`${novos.length} ${plural(novos.length, 'convidado adicionado', 'convidados adicionados')}${fora ? `; ${fora} ficaram de fora` : ''}.`, () => desfazerLote(I.id, lote, false));
      A.render(); A.$('h1')?.focus({ preventScroll: true });
    });
  };
  function desfazerLote(id, lote, avisar) {
    if (!get('gl', id, []).some((x) => x.lote === lote)) return;
    upd('gl', id, (a) => a.filter((x) => x.lote !== lote), []);
    const v = vs(id); if (v.lastImport && v.lastImport.lote === lote) delete v.lastImport;
    if (avisar) A.toast('Importação desfeita. A lista voltou ao que era.');
    if (CUR && CUR.kind === 'convidados') A.render();
  }
  A.acts['hv-imp-undo'] = () => { const id = curId(), li = vs(id).lastImport; if (li) desfazerLote(id, li.lote, true); };
  A.acts['hv-imp-fechar'] = () => { const id = curId(); delete vs(id).lastImport; setRegion('#hv-ibn', ''); };

  /* ficha do convidado (sheet) */
  let GS = null;
  function openGuest(id, gid) {
    const api = A.sheet({ title: gname(id, gid), label: 'Ficha do convidado', body: '<div id="hv-gs"></div>' }); api.el.classList.add('hv-insp'); GS = { id, gid, api }; api.onClose = () => { GS = null; redraw(); }; drawGuestSheet();
  }
  function drawGuestSheet() {
    if (!GS || !GS.api.el.isConnected) return; const { id, gid } = GS, g = model(id).gmap[gid]; if (!g) return;
    const ph = P(id).filter((p) => p.autor === gid), hidden = ph.filter((p) => p.status === 'oculta').length;
    const el = A.$('#hv-gs', GS.api.el); const fk = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
    const rx = ph.reduce((n, p) => n + (p.curtidas || 0), 0); const ini = String(gname(id, gid) || '').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    el.innerHTML = `<div class="stack"><div class="hv-gp"><span class="avatar lg hv-gp-av" aria-hidden="true">${E(ini)}</span><div class="hv-gp-st"><div><b>${ph.length}</b><span>${ph.length === 1 ? 'foto' : 'fotos'}</span></div><div><b>${rx}</b><span>${rx === 1 ? 'reação' : 'reações'}</span></div><div><b>${g.miss.length}</b><span>${g.miss.length === 1 ? 'missão' : 'missões'}</span></div></div></div><div class="flex flex-wrap" style="gap:12px">${sbadge(g.st2)}<span class="t-small">${g.entered ? `Entrou às ${hhmm(g.ck)} · ` : ''}${g.mesa ? `Mesa ${g.mesa} · ` : g.importado ? 'Da sua lista · ' : ''}${g.consentiu ? 'aceitou a privacidade' : 'ainda não aceitou a privacidade'}</span></div>${g.entered ? `<div><span class="t-label">Fotos (${ph.length})</span>${ph.length ? `<div class="hv-grid" style="margin-top:8px;grid-template-columns:repeat(auto-fill,minmax(84px,1fr))" data-ids="${ph.map((p) => p.id).join(',')}">${ph.map((p) => tile(id, p, false).replace(/<button class="hv-sel"[\s\S]*?<\/button>/, '')).join('')}</div>` : '<p class="t-small" style="margin-top:var(--space-2)">Entrou na festa, mas ainda não enviou foto.</p>'}</div>` : ''}${g.miss.length ? `<div><span class="t-label">Missões cumpridas</span><div class="list" style="margin-top:4px">${g.miss.map((m) => `<div class="li" style="min-height:44px"><span class="grow">${E(mtitle(m))}</span></div>`).join('')}</div></div>` : ''}<div class="hr"></div><div class="stack-2"><span class="t-label">Ações</span><div class="hv-row">${g.entered ? `<button class="btn btn-line btn-sm" data-act="hv-gname" data-fk="gs-name" aria-pressed="${g.oculto}">${A.icon(g.oculto ? 'eye' : 'eyeoff', 16)} ${g.oculto ? 'Mostrar nome no telão' : 'Ocultar nome no telão'}</button>` : ''}${ph.length && hidden < ph.length ? `<button class="btn btn-line btn-sm" data-act="hv-ghide" data-fk="gs-hide">Ocultar as ${ph.length - hidden} fotos</button>` : ''}${g.st2 === 'nao' && !g.importado ? `<button class="btn btn-line btn-sm" data-act="invite" data-fk="gs-res">${A.icon('send', 16)} Convidar de novo</button>` : ''}${g.st2 === 'nao' && g.importado ? `<button class="btn btn-line btn-sm" data-act="invite" data-fk="gs-link">${A.icon('send', 16)} Compartilhar o link da festa</button>` : ''}</div>${g.st2 === 'nao' && !g.importado ? '<p class="hv-hint">O Albora não envia nada: você manda o convite pelo seu e-mail ou WhatsApp.</p>' : ''}${g.st2 === 'nao' && g.importado ? '<p class="hv-hint">Esta pessoa veio de uma lista só de nomes, sem contato. Mande o link da festa por onde você já fala com ela.</p>' : ''}<div class="hv-gdanger"><span class="t-label">Cuidado</span><div class="hv-row"><button class="btn btn-sm ${g.bloq ? 'btn-line' : 'btn-danger'}" data-act="hv-gblock" data-fk="gs-blk">${g.bloq ? 'Desbloquear' : 'Bloquear'}</button>${g.importado && !g.entered ? `<button class="btn btn-sm btn-danger" data-act="hv-gremove" data-fk="gs-rm">${A.icon('trash', 16)} Tirar da lista</button>` : ''}</div>${g.bloq ? '<p class="hv-hint">Bloqueado: não consegue enviar fotos novas. As que já enviou continuam como estão.</p>' : ''}</div></div></div>`;
    if (fk) A.$(`[data-fk="${fk}"]`, GS.api.el)?.focus();
  }
  function setGuest(id, gid, patch, msg, fnUndo) {
    const prev = (get('gu', id, {}))[gid] ? JSON.parse(JSON.stringify(get('gu', id, {})[gid])) : null;
    upd('gu', id, (o) => { o[gid] = Object.assign({}, o[gid], patch); return o; }, {}); drawGuestSheet(); redraw();
    withUndo(msg, () => { upd('gu', id, (o) => { if (prev) o[gid] = prev; else delete o[gid]; return o; }, {}); drawGuestSheet(); redraw(); });
  }
  A.acts['hv-gremove'] = () => { const { id, gid } = GS, g = get('gl', id, []).find((x) => x.id === gid); if (!g) return; upd('gl', id, (a) => a.filter((x) => x.id !== gid), []); GS.api.close(); A.toast(`${g.nome} saiu da lista.`, { undo: () => { upd('gl', id, (a) => a.concat([g]), []); A.render(); } }); A.render(); };
  A.acts['hv-gname'] = () => { const { id, gid } = GS, g = model(id).gmap[gid]; setGuest(id, gid, { oculto: !g.oculto }, g.oculto ? 'Nome volta a aparecer no telão.' : 'Nome oculto no telão. As fotos continuam.'); };
  A.acts['hv-gblock'] = () => { const { id, gid } = GS, g = model(id).gmap[gid]; setGuest(id, gid, { bloq: !g.bloq }, g.bloq ? `${g.primeiro} desbloqueado.` : `${g.primeiro} bloqueado. Não envia fotos novas.`); };
  A.acts['hv-gresend'] = (el) => { const { id, gid } = GS, g = model(id).gmap[gid]; A.busy(el, 900, () => { upd('gu', id, (o) => { o[gid] = Object.assign({}, o[gid], { convites: (o[gid] && o[gid].convites || 0) + 1 }); return o; }, {}); drawGuestSheet(); redraw(); A.toast(`Convite reenviado a ${g.primeiro} (simulado).`); }); };
  A.acts['hv-ghide'] = () => { const { id, gid } = GS; const ids = P(id).filter((p) => p.autor === gid && p.status !== 'oculta').map((p) => p.id); setPhotos(id, ids, () => ({ status: 'oculta', telao: false, motivo: '' }), `${ids.length} ${plural(ids.length, 'foto oculta', 'fotos ocultas')}.`); drawGuestSheet(); };

  /* ---------- mapa e paleta ---------- */
  A.map('Anfitrião · evento', 'Hoje (muda por fase e papel)', '#/h/e/e1/hoje', 'Próximo passo, modo festa e Reviver');
  A.map('Anfitrião · evento', 'Fotos: revisar e moderar', '#/h/e/e1/fotos', 'Grade, lista, lote, ampliação e atalhos');
  A.map('Anfitrião · evento', 'Fotos para revisar', '#/h/e/e1/fotos?f=revisar', 'Filtro Revisar');
  A.map('Anfitrião · evento', 'Convidados', '#/h/e/e1/convidados', 'Lista, ficha e bloqueio');
  A.map('Anfitrião · evento', 'Números da festa', '#/h/e/e1/convidados?aba=numeros', 'Funil, ranking e CSV');
  A.palette.add(() => [{ group: 'Ações', label: 'Pausar tudo (festa ao vivo)', icon: 'pause', hint: 'Hoje', run: () => { if (PH(curId()) !== 'durante') return A.toast('A pausa geral só existe durante a festa.'); if (location.hash.indexOf('/hoje') < 0) location.hash = `#/h/e/${curId()}/hoje`; setTimeout(() => A.acts['hv-panic'](), 200); } }, { group: 'Ações', label: 'Importar lista de convidados', icon: 'upload', keys: 'colar planilha nomes', run: () => { location.hash = `#/h/e/${curId()}/convidados?importar=1`; if (location.hash.indexOf('?importar') < 0) A.render(); } }, { group: 'Ações', label: 'Desfazer a última ação', icon: 'undo', run: undoLast }]);
})();
