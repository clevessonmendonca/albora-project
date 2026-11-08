/* Estúdio: documentos independentes do renderer; mídia e projetos em IndexedDB. */
(function () {
  'use strict';
  const A = window.A, E = A.esc, uid = () => crypto.randomUUID(), clone = x => JSON.parse(JSON.stringify(x));
  const palette = { paper: '#FAF7F2', ink: '#1A1613', white: '#FFFFFF', night: '#14100E' };
  const formats = { convite: [1080, 1350], story: [1080, 1920], post: [1080, 1080] };
  const templates = [
    { id: 'editorial', name: 'O nosso encontro', category: 'Elegante', purpose: 'Convite principal', format: 'convite', layout: 'editorial' },
    { id: 'romance', name: 'Uma data, nós dois', category: 'Romântico', purpose: 'Save the date', format: 'convite', layout: 'frame' },
    { id: 'minimal', name: 'Só o essencial', category: 'Minimalista', purpose: 'Convite para WhatsApp', format: 'convite', layout: 'type' },
    { id: 'moderno', name: 'O dia é nosso', category: 'Moderno', purpose: 'Publicação quadrada', format: 'post', layout: 'split' },
    { id: 'floral', name: 'Jardim em festa', category: 'Floral', purpose: 'Convite digital', format: 'convite', layout: 'frame' },
    { id: 'divertido', name: 'Vai ter festa', category: 'Divertido', purpose: 'Contagem regressiva', format: 'post', layout: 'type' },
    { id: 'story', name: 'Um dia para guardar', category: 'Stories', purpose: 'Story para Instagram', format: 'story', layout: 'editorial' },
    { id: 'obrigado', name: 'Foi bonito com vocês', category: 'Convite digital', purpose: 'Agradecimento', format: 'post', layout: 'split' },
    { id: 'imersivo', name: 'A foto é a festa', category: 'Elegante', purpose: 'Convite com foto inteira', format: 'convite', layout: 'full' },
    { id: 'polaroide', name: 'Um instante de nós', category: 'Divertido', purpose: 'Publicação polaroide', format: 'post', layout: 'polaroide' },
    { id: 'memorias', name: 'A festa continua aqui', category: 'Elegante', purpose: 'Memórias', format: 'story', layout: 'frame' }
  ];
  let dbPromise, active = null;
  function db() { return dbPromise ||= new Promise((resolve, reject) => { const r = indexedDB.open('albora-studio-v1', 1); r.onupgradeneeded = () => { r.result.createObjectStore('projects', { keyPath: 'id' }); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
  async function storage(method, value) { const d = await db(); return new Promise((resolve, reject) => { const t = d.transaction('projects', method === 'getAll' ? 'readonly' : 'readwrite'); const r = t.objectStore('projects')[method](...(value === undefined ? [] : [value])); t.oncomplete = () => resolve(r.result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); }); }
  const eventOf = id => A.data.events.find(e => e.id === id);
  function eventData(ev) { const cfg = A.store.get('hc:evento:' + ev.id, {}); return { name: cfg.nome || ev.nome, date: cfg.data || ev.dataIso || (A.when(ev.id).semData ? '' : new Date(new Date('2026-11-14T12:00:00').getTime() + A.when(ev.id).days * 86400000).toISOString().slice(0,10)), time: cfg.hora || ev.hora || '', place: cfg.local || ev.local || '', color: ev.cor, color2: ev.cor2, link: new URL('#/g/' + ev.slug, location.href).href }; }
  function dateLabel(d) { return d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Data a definir'; }
  function element(type, values) { return { id: uid(), type, ...values }; }
  function makeDoc(ev, tpl) {
    const info = eventData(ev), [w, h] = formats[tpl.format], dark = tpl.layout === 'split' || tpl.id === 'story';
    const fg = dark ? palette.white : palette.ink, bg = dark ? info.color2 : palette.paper;
    const text = (role, content, x, y, width, size, more = {}) => element('text', { role, text: content, x, y, w: width, h: size * 2.8, size, color: fg, font: 'Fraunces', align: 'left', ...more });
    const names = info.name.replace(/^Casamento\s+/i, '');
    const els = [];
    const photo = element('photo', { role: 'photo', x: 70, y: 70, w: w - 140, h: h * .43, src: ev.capaSrc || ev.foto || ev.capa || (ev.capaDemo && A.capa ? A.capa(ev.id, ev.cor, ev.cor2) : ''), color: info.color });
    if (tpl.layout !== 'type') els.push(photo);
    const y = tpl.layout === 'type' ? h * .25 : h * .55;
    let label = tpl.purpose === 'Save the date' ? 'Reserve essa data' : tpl.id === 'obrigado' ? 'Obrigado por fazer parte' : tpl.id === 'memorias' ? 'Memórias da nossa festa' : 'Vamos celebrar';
    if (tpl.id === 'divertido') { const days = info.date ? Math.max(0, Math.ceil((new Date(info.date + 'T' + (info.time || '12:00')) - Date.now()) / 86400000)) : null; label = days === null ? 'A festa vem aí' : `Faltam ${days} dias`; }
    els.push(text('heading', label, 76, y, w - 152, 28, { font: 'Instrument Sans' }));
    els.push(text('name', names, 70, y + 58, w - 140, tpl.layout === 'type' ? 104 : 80));
    els.push(text('date', dateLabel(info) + (info.time ? ' · ' + info.time : ''), 76, h - 220, w - 152, 29, { font: 'Instrument Sans' }));
    els.push(text('place', info.place, 76, h - 158, w - 152, 24, { font: 'Instrument Sans' }));
    if (tpl.layout === 'frame') els.unshift(element('frame', { x: 32, y: 32, w: w - 64, h: h - 64, color: info.color }));
    if (tpl.layout === 'split') { photo.x = w * .52; photo.y = 0; photo.w = w * .48; photo.h = h; els.filter(x => x.type === 'text').forEach(x => { x.w = w * .4; x.x = 50; }); els.find(x => x.role === 'name').size = 64; els.find(x => x.role === 'name').y = h * .32; els.find(x => x.role === 'heading').y = h * .17; }
    if (tpl.id === 'floral') els.push(element('floral', { x: w - 180, y: h - 400, w: 110, h: 180, color: info.color }));
    if (tpl.layout === 'frame') {
      els.filter(e=>e.type==='text').forEach(e=>e.align='center');
      const name=els.find(e=>e.role==='name');name.text=names.replace(/ & /,'\n&\n');name.size=62;name.y=h*.53;name.h=h*.29;
      els.find(e=>e.role==='heading').y=h*.49;
    }
    if(tpl.id==='minimal') { const name=els.find(e=>e.role==='name');name.text=names.replace(/ & /,'\n& ');name.size=114;name.y=h*.30;name.h=h*.38;els.push(element('frame',{x:76,y:h*.18,w:w-152,h:2,color:info.color})); }
    if(tpl.id==='divertido'){els.filter(e=>e.type==='text').forEach(e=>{e.font='Instrument Sans';e.color=palette.white;});const name=els.find(e=>e.role==='name');name.text=names.replace(/ & /,'\n& ');name.size=120;name.y=h*.31;name.h=h*.4;}
    if (tpl.layout === 'full') {
      photo.x = 0; photo.y = 0; photo.w = w; photo.h = h;
      const T = els.filter(e => e.type === 'text'); T.forEach(e => { e.color = palette.white; e.align = 'center'; e.x = 70; e.w = w - 140; });
      const hd = els.find(e => e.role === 'heading'), nm = els.find(e => e.role === 'name'), dt = els.find(e => e.role === 'date'), pl = els.find(e => e.role === 'place');
      hd.y = h * .66; nm.text = names.replace(/ & /, '\n& '); nm.size = 96; nm.y = h * .70; nm.h = h * .2; dt.y = h - 150; pl.y = h - 100;
      els.splice(els.indexOf(photo) + 1, 0, element('frame', { role: 'veil', veil: true, x: 0, y: h * .42, w, h: h * .58, color: palette.night }));
    }
    if (tpl.layout === 'polaroide') {
      const T = els.filter(e => e.type === 'text'); T.forEach(e => { e.align = 'center'; e.x = 90; e.w = w - 180; });
      const hd = els.find(e => e.role === 'heading'), nm = els.find(e => e.role === 'name'), dt = els.find(e => e.role === 'date'), pl = els.find(e => e.role === 'place');
      photo.x = 110; photo.y = 96; photo.w = w - 220; photo.h = h * .6;
      els.splice(els.indexOf(photo), 0, element('frame', { role: 'cartao', fill: palette.white, x: 70, y: 56, w: w - 140, h: h * .91, color: palette.white }));
      hd.text = ''; hd.y = h * .7; nm.size = 58; nm.y = h * .72; nm.h = h * .1; dt.size = 26; dt.y = h * .84; pl.y = h * .89; pl.size = 22;
    }
    if(tpl.id==='story'){photo.x=0;photo.y=0;photo.w=w;photo.h=h*.57;els.find(e=>e.role==='heading').y=h*.63;els.find(e=>e.role==='name').y=h*.69;}
    return { version: 1, id: uid(), eventId: ev.id, name: tpl.name, template: tpl.id, w, h, bg:tpl.id==='divertido'?info.color:bg, bg2: bg, gradient: false, elements: els, eventSnapshot: info, updated: Date.now() };
  }
  const loader = src => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.append(s); });
  let libraries;
  function libs() { return libraries ||= Promise.all([window.Konva ? null : loader('assets/lib/konva-9.3.18.min.js'), window.qrcode ? null : loader('assets/lib/qrcode-1.4.4.js')]).catch(e => { libraries = null; throw e; }); }
  const imageCache = new Map();
  function img(src) { if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => { imageCache.delete(src); reject(new Error('Não foi possível abrir a fotografia.')); }; i.src = src; })); return imageCache.get(src); }
  function qrSrc(link) { const q = qrcode(0, 'M'); q.addData(link, 'Byte'); q.make(); return q.createDataURL(8, 32); }
  async function nodeFor(e,background) {
    const base = { id: e.id, x: e.x, y: e.y, width: e.w, height: e.h };
    if (e.type === 'text') return new Konva.Text({ ...base, text: e.text, fontFamily: e.font, fontSize: e.size, fill: e.color, align: e.align, lineHeight: 1.12, wrap: 'word' });
    if (e.type === 'frame' && e.veil) return new Konva.Rect({ ...base, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: e.h }, fillLinearGradientColorStops: [0, 'rgba(20,16,14,0)', .55, 'rgba(20,16,14,.62)', 1, 'rgba(20,16,14,.88)'] });
    if (e.type === 'frame' && e.fill) return new Konva.Rect({ ...base, fill: e.fill, shadowColor: 'rgba(20,16,14,.28)', shadowBlur: 36, shadowOffsetY: 14 });
    if (e.type === 'frame') return new Konva.Rect({ ...base, stroke: e.color, strokeWidth: 2 });
    if (e.type === 'floral') { const g = new Konva.Group(base); g.add(new Konva.Line({ points: [0,e.h,e.w/2,e.h/2,e.w,0], stroke: e.color, strokeWidth: 3, tension:.4 })); [0,1,2,3,4].forEach(i => g.add(new Konva.Ellipse({ x:e.w*(i+1)/6, y:e.h*(5-i)/6, radiusX:e.w*.16, radiusY:e.h*.055, rotation:i%2?35:-35, stroke:e.color, strokeWidth:2 }))); return g; }
    if (e.type === 'qr' || e.src) { const bitmap = await img(e.type === 'qr' ? qrSrc(e.link) : e.src); const ratio = Math.max(e.w / bitmap.width, e.h / bitmap.height); return new Konva.Image({ ...base, image: bitmap, crop: { x:(bitmap.width-e.w/ratio)/2,y:(bitmap.height-e.h/ratio)/2,width:e.w/ratio,height:e.h/ratio } }); }
    const g = new Konva.Group(base); g.add(new Konva.Rect({ width:e.w,height:e.h,fill:e.color,opacity:.12 })); g.add(new Konva.Text({ width:e.w-48,x:24,y:e.h/2-28,text:'Escolha uma fotografia',align:'center',fontFamily:'Instrument Sans',fontSize:28,fill:A.contrast(palette.ink,background||palette.paper)>4.5?palette.ink:palette.white })); return g;
  }
  async function renderDocument(doc, container, width, editable = false) {
    const scale = width / doc.w, stage = new Konva.Stage({ container, width, height: doc.h * scale, scale: { x:scale,y:scale } });
    const layer = new Konva.Layer(); stage.add(layer);
    layer.add(new Konva.Rect({ width:doc.w,height:doc.h,fill:doc.bg, ...(doc.gradient ? { fillPriority:'linear-gradient',fillLinearGradientStartPoint:{x:0,y:0},fillLinearGradientEndPoint:{x:doc.w,y:doc.h},fillLinearGradientColorStops:[0,doc.bg,1,doc.bg2] } : {}) }));
    for (const el of doc.elements) { const n = await nodeFor(el,doc.bg); if (editable && !active) { stage.destroy(); throw new Error('Edição encerrada.'); } n.setAttr('studioElement', true); layer.add(n); if (editable) bindNode(n, el); }
    layer.draw(); return { stage, layer };
  }
  function message(text, error = false) { const el = document.getElementById('st-status'); if (el) { el.textContent = text; el.setAttribute('role', error ? 'alert' : 'status'); } }
  let saveQueue = Promise.resolve();
  function persist() { if (!active) return; const snapshot = clone(active.doc); const ticket=++active.saveTicket; snapshot.updated = Date.now(); message('Salvando…'); saveQueue = saveQueue.catch(() => {}).then(() => storage('put',snapshot)); saveQueue.then(() => { if (active?.doc.id === snapshot.id && active.saveTicket===ticket) message('Salvo neste navegador'); }).catch(() => message('Não foi possível salvar. Baixe uma cópia do projeto antes de sair.',true)); return saveQueue; }
  function checkpoint() { const s = active; s.past.push(clone(s.doc)); if(s.past.length>40)s.past.shift(); s.future=[]; }
  function mutate(fn, redraw=true) { checkpoint(); fn(active.doc); persist(); if(redraw) draw(); }
  function selected() { return active?.doc.elements.find(e=>e.id===active.selected); }
  function clampElement(e) { e.w=Math.max(40,Math.min(active.doc.w,e.w));e.h=Math.max(30,Math.min(active.doc.h,e.h));e.x=Math.max(0,Math.min(active.doc.w-e.w,e.x));e.y=Math.max(0,Math.min(active.doc.h-e.h,e.y)); }
  function bindNode(n,e) {
    n.draggable(active.advanced); n.preventDefault(active.advanced); n.on('click tap',()=>select(e.id));
    n.on('dblclick dbltap',()=> { select(e.id); document.getElementById('st-text')?.focus(); });
    n.on('dragstart transformstart',()=>checkpoint());
    n.on('dragmove',()=> { const d=active.doc; const cx=n.x()+e.w/2,cy=n.y()+e.h/2; if(Math.abs(cx-d.w/2)<12)n.x((d.w-e.w)/2); if(Math.abs(cy-d.h/2)<12)n.y((d.h-e.h)/2); n.x(Math.max(0,Math.min(d.w-e.w,n.x())));n.y(Math.max(0,Math.min(d.h-e.h,n.y()))); active.guides.visible(Math.abs(n.x()+e.w/2-d.w/2)<1||Math.abs(n.y()+e.h/2-d.h/2)<1); });
    n.on('dragend transformend',()=> { e.x=n.x();e.y=n.y();e.w*=n.scaleX();e.h*=n.scaleY();if(e.type==='text')e.size*=n.scaleX();n.scale({x:1,y:1});clampElement(e);persist();draw(); });
  }
  function select(id, reveal=true) { active.selected=id; if(reveal && matchMedia('(max-width:900px)').matches) document.getElementById('st-editor')?.classList.add('st-panel-open'); const n=active.layer?.findOne('#'+id); active.transformer?.nodes(active.advanced&&n?[n]:[]); properties(); }
  let drawVersion=0;
  async function draw() {
    const s=active, el=document.getElementById('st-canvas'); if(!s||!el)return; const v=++drawVersion; const canvasFocused=document.activeElement===el;
    s.stage?.destroy();el.innerHTML='';const max=Math.min(el.parentElement.clientWidth-32,560,Math.max(300,innerHeight*.58)*s.doc.w/s.doc.h), width=Math.max(120,max*s.zoom);
    try { const result=await renderDocument(s.doc,el,width,true); if(active!==s||v!==drawVersion){result.stage.destroy();return;}Object.assign(s,result);
      s.guides=new Konva.Group({visible:false,listening:false});s.guides.add(new Konva.Line({points:[s.doc.w/2,0,s.doc.w/2,s.doc.h],stroke:s.doc.eventSnapshot.color,strokeWidth:2,dash:[8,8]}));s.guides.add(new Konva.Line({points:[0,s.doc.h/2,s.doc.w,s.doc.h/2],stroke:s.doc.eventSnapshot.color,strokeWidth:2,dash:[8,8]}));s.layer.add(s.guides);
      s.transformer=new Konva.Transformer({rotateEnabled:false,keepRatio:true,enabledAnchors:['top-left','top-right','bottom-left','bottom-right'],anchorSize:14/ (width/s.doc.w),borderStroke:s.doc.eventSnapshot.color,boundBoxFunc:(old,b)=>b.width<30||b.height<30?old:b});s.layer.add(s.transformer);select(s.selected,false); s.stage.on('click tap',e=>{if(!e.target.getAttr('studioElement')&&e.target===s.layer.children[0])select(null);});
      document.getElementById('st-dim').textContent=`${s.doc.w} × ${s.doc.h} px`;
      document.getElementById('st-undo').disabled=!s.past.length;document.getElementById('st-redo').disabled=!s.future.length;if(canvasFocused)el.focus({preventScroll:true});
    } catch(e){message(e.message||'A prévia não carregou. Tente reabrir o projeto.',true);}
  }
  const actionIcons={undo:'undo',redo:'history',photo:'image','add-photo':'image','add-text':'type',qr:'qr',front:'arrowup',back:'arrowdown','duplicate-element':'copy','delete-element':'trash',sync:'refresh',background:'sliders',format:'expand',backup:'download',restore:'refresh',png:'download',jpeg:'download',native:'share',link:'link','copy-project':'copy','remove-project':'trash',size:'expand'};
  const button=(action,label,extra='')=>`<button type="button" class="btn btn-line btn-sm" data-st="${action}" ${extra}>${actionIcons[action]?A.icon(actionIcons[action],18):''}<span>${label}</span></button>`;
  const input=(label,key,value,type='text',extra='')=>`<label class="st-field">${label}<input type="${type}" data-prop="${key}" value="${E(String(value??''))}" ${extra}></label>`;
  function properties() {
    const s=active,e=selected(),panel=document.getElementById('st-properties');if(!panel)return;
    panel.innerHTML=`<h2 class="t-h">${e ? e.type==='text'?'Editar texto':e.type==='photo'?'Fotografia':'Elemento' : 'Sua arte'}</h2>${e?.type==='text'?`<label class="st-field">Texto<textarea id="st-text" data-prop="text" rows="3" maxlength="500">${E(e.text)}</textarea></label><label class="st-field">Fonte<select data-prop="font">${['Fraunces','Instrument Sans','Georgia'].map(f=>`<option ${e.font===f?'selected':''}>${f}</option>`).join('')}</select></label><div class="st-pair">${input('Tamanho','size',e.size,'number','min="12" max="240"')}${input('Cor','color',e.color,'color')}</div><label class="st-field">Alinhamento<select data-prop="align">${[['left','Esquerda'],['center','Centro'],['right','Direita']].map(([v,l])=>`<option value="${v}" ${e.align===v?'selected':''}>${l}</option>`).join('')}</select></label>`:''}
    ${e?.type==='photo'?`<p class="t-small">Use uma foto de vocês. O enquadramento acompanha a moldura.</p>${button('photo','Escolher fotografia')}<div id="st-event-photos"></div>`:''}
    ${!e?`${input('Nome do projeto','projectName',s.doc.name)}<div class="st-pair">${input('Fundo','bg',s.doc.bg,'color')}${input('Segunda cor','bg2',s.doc.bg2,'color')}</div><label class="st-check"><input type="checkbox" data-prop="gradient" ${s.doc.gradient?'checked':''}> Usar gradiente</label>${button('add-text','Adicionar texto')} ${button('add-photo','Adicionar foto')} ${button('qr','Inserir QR do convite')}`:''}
    ${e&&s.advanced?`<div class="st-pair">${input('X','x',Math.round(e.x),'number')}${input('Y','y',Math.round(e.y),'number')}${input('Largura','w',Math.round(e.w),'number','min="40"')}${input('Altura','h',Math.round(e.h),'number','min="30"')}</div>${button('front','Trazer à frente')}${button('back','Enviar para trás')}`:''}
    ${e?`<div class="st-actions">${button('duplicate-element','Duplicar elemento')}${button('delete-element','Excluir elemento')}</div>`:''}
    <details ${s.advanced?'open':''}><summary>${A.icon('layers',18)} Elementos e camadas</summary><div class="st-layers">${s.doc.elements.slice().reverse().map(x=>`<button class="st-layer" data-st="select" data-id="${x.id}" aria-pressed="${x.id===s.selected}">${A.icon(({text:'type',photo:'image',qr:'qr',frame:'scan',floral:'brush'})[x.type],18)}<span>${E(x.type==='text'?x.text.slice(0,45):({photo:'Fotografia',qr:'QR do convite',frame:'Moldura',floral:'Ramo floral'}[x.type]))}</span></button>`).join('')}</div></details>
    <p class="t-small">Textos da arte não alteram o cadastro do evento.</p>${button('sync','Atualizar dados do evento')}`;
    if(e?.type==='photo')storage('getAll').then(list=>{const box=document.getElementById('st-event-photos');if(!box||selected()?.id!==e.id)return;const photos=[...new Set(list.filter(p=>p.eventId===s.ev.id).flatMap(p=>p.elements.filter(x=>x.type==='photo'&&x.src).map(x=>x.src)))].slice(0,12);box.innerHTML=photos.length?'<p class="t-small">Fotos usadas neste evento</p><div class="st-photo-library">'+photos.map((src,i)=>'<button type="button" data-st="event-photo" data-photo="'+i+'" aria-label="Usar fotografia '+(i+1)+'"><img src="'+E(src)+'" alt=""></button>').join('')+'</div>':'';s.photos=photos;}).catch(()=>{});
  }
  function dispose() { if(!active)return;active.stage?.destroy();active.observer?.disconnect();active.abort.abort();active=null;drawVersion++; }
  window.addEventListener('hashchange',dispose);
  function gallery(ctx,ev) {
    return {title:'Estúdio de convites',html:A.hostShell(ctx,{section:'compartilhar',title:'Um convite com a cara de vocês',lead:'Escolha um modelo. A história já é de vocês.',actions:`<a class="btn btn-line btn-sm" href="${A.hostBase(ev.id)}/materiais">${A.icon('tv',18)} Telão e peças para imprimir</a>`,pageClass:'wide'},`<section id="st-gallery" class="st-gallery"><div class="st-gallery-head"><h2 class="t-h">Feito para seu casamento</h2><button class="btn btn-line btn-sm" id="st-copy-link">${A.icon('link',18)} Copiar link do convite</button></div><div class="st-categories" role="group" aria-label="Estilo do modelo">${['Todos',...new Set(templates.map(t=>t.category))].map((c,i)=>`<button class="btn btn-sm ${i?'btn-quiet':'btn-line'}" data-cat="${c}" aria-pressed="${i===0}">${c}</button>`).join('')}</div><div id="st-models" class="st-models" aria-busy="true"><p>Preparando seus modelos…</p></div><section class="st-saved"><h2 class="t-h">Seus projetos</h2><p class="t-small">Salvos neste navegador. Você pode baixar uma cópia para guardar.</p><div id="st-projects"></div><label class="btn btn-line btn-sm">${A.icon('folder',18)} Abrir cópia de projeto<input id="st-import" type="file" accept="application/json,.json" hidden></label></section><p id="st-status" role="status"></p></section>`),after:()=>initGallery(ctx,ev)};
  }
  async function initGallery(ctx,ev) {
    const root=document.getElementById('st-gallery');let previews=[];
    try { await libs();await document.fonts.ready;if(!root.isConnected)return;const saved=await storage('getAll');const eventPhoto=saved.filter(p=>p.eventId===ev.id).sort((a,b)=>b.updated-a.updated).flatMap(p=>p.elements).find(e=>e.type==='photo'&&e.src);if(eventPhoto)ev={...ev,capaSrc:eventPhoto.src};
      const models=root.querySelector('#st-models');models.innerHTML=templates.map(t=>`<button class="st-template" data-template="${t.id}" data-category="${t.category}"><span class="st-thumb" id="st-thumb-${t.id}" aria-hidden="true"></span><span class="st-template-title">${E(t.name)}</span><span class="t-small">${E(t.purpose)} · ${t.format==='story'?'9:16':t.format==='post'?'1:1':'4:5'}</span></button>`).join('');
      for(const t of templates){if(!root.isConnected)break;const container=document.getElementById('st-thumb-'+t.id),doc=makeDoc(ev,t),width=Math.max(80,Math.min(container.clientWidth-24,(container.clientHeight-24)*doc.w/doc.h));const p=await renderDocument(doc,container,width);previews.push(p.stage);}models.setAttribute('aria-busy','false');
      const projects=(await storage('getAll')).filter(p=>p.eventId===ev.id).sort((a,b)=>b.updated-a.updated);
      root.querySelector('#st-projects').innerHTML=projects.length?projects.map(p=>`<div class="st-project"><a href="${A.hostBase(ev.id)}/compartilhar?projeto=${p.id}">${E(p.name)}</a><span class="t-small">${p.w} × ${p.h}</span>${button('copy-project','Duplicar',`data-id="${p.id}"`)}${button('remove-project','Excluir',`data-id="${p.id}"`)}</div>`).join(''):'<p>Sua primeira arte começa em um dos modelos acima.</p>';
      root.onclick=async e=>{const t=e.target.closest('[data-template]'),cat=e.target.closest('[data-cat]'),act=e.target.closest('[data-st]');
        if(t){const doc=makeDoc(ev,templates.find(x=>x.id===t.dataset.template));try{await storage('put',doc);location.hash=A.hostBase(ev.id)+'/compartilhar?projeto='+doc.id;}catch{message('Não foi possível criar o projeto. Verifique o armazenamento do navegador.',true);}}
        if(cat){root.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',x===cat));root.querySelectorAll('[data-template]').forEach(x=>x.hidden=cat.dataset.cat!=='Todos'&&x.dataset.category!==cat.dataset.cat);}
        if(act){const p=projects.find(x=>x.id===act.dataset.id);if(act.dataset.st==='remove-project'){if(!confirm('Excluir este projeto salvo?'))return;await storage('delete',p.id);A.render();}if(act.dataset.st==='copy-project'){const copy=clone(p);copy.id=uid();copy.name+=' · cópia';copy.updated=Date.now();await storage('put',copy);A.render();}}
      };
      root.querySelector('#st-copy-link').onclick=()=>copyLink(eventData(ev).link);
      root.querySelector('#st-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>25000000)throw Error('Cópia muito grande.');const p=JSON.parse(await file.text());validateDoc(p);p.id=uid();p.eventId=ev.id;p.updated=Date.now();await storage('put',p);location.hash=A.hostBase(ev.id)+'/compartilhar?projeto='+p.id;}catch(err){message(err.message||'Não foi possível abrir esta cópia.',true);}};
    }catch{message('Não foi possível carregar o estúdio. Recarregue para tentar novamente.',true);}
    window.addEventListener('hashchange',()=>previews.forEach(s=>s.destroy()),{once:true});
  }
  function validateDoc(p){
    const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
    if(!p||p.version!==1||typeof p.name!=='string'||p.name.length>100||!Array.isArray(p.elements)||p.elements.length>100||!Number.isFinite(p.w)||!Number.isFinite(p.h)||p.w<320||p.h<320||p.w>4096||p.h>4096||!color(p.bg)||!color(p.bg2)||!p.eventSnapshot||typeof p.eventSnapshot.link!=='string')throw Error('Formato de projeto inválido.');
    for(const e of p.elements){
      if(!['text','photo','qr','frame','floral'].includes(e.type)||!['x','y','w','h'].every(k=>Number.isFinite(e[k])&&e[k]>=0&&e[k]<=4096)||e.w<1||e.h<1)throw Error('Elemento inválido.');
      if(e.type==='text'&&(typeof e.text!=='string'||e.text.length>500||!['Fraunces','Instrument Sans','Georgia'].includes(e.font)||!Number.isFinite(e.size)||e.size<12||e.size>240||!color(e.color)))throw Error('Texto inválido na cópia.');
      if(e.src&&!/^data:image\/(jpeg|png|webp);base64,/.test(e.src))throw Error('Imagem não suportada na cópia.');
      if(e.type==='qr'&&(typeof e.link!=='string'||!/^https?:\/\//.test(e.link)))throw Error('Link inválido no QR.');
      e.id=uid();
    }
  }

  async function copyLink(link){try{await navigator.clipboard.writeText(link);message('Link copiado.');}catch{message('Não foi possível copiar. Abra o convite e copie o endereço.',true);}}
  function editor(ctx,ev) {
    return {title:'Editar convite',html:A.hostShell(ctx,{section:'compartilhar',title:'',pageClass:'wide'},`<div id="st-editor" class="st-editor"><header class="st-toolbar"><a class="btn btn-quiet btn-sm" href="${A.hostBase(ev.id)}/compartilhar">${A.icon('back',18)} Modelos e projetos</a><div class="st-history">${button('undo','Desfazer','id="st-undo"')}${button('redo','Refazer','id="st-redo"')}</div><button class="btn btn-primary btn-sm" data-st="export">${A.icon('download',18)}<span>Baixar e compartilhar</span></button></header><p id="st-status" role="status">Abrindo seu projeto…</p><div class="st-workspace"><section class="st-artboard"><div class="st-canvas-scroll"><div id="st-canvas" tabindex="0" role="group" aria-label="Arte editável. Selecione elementos no painel para editar por teclado."></div></div><div class="st-canvas-tools"><span id="st-dim" class="t-small"></span><label>Zoom <select id="st-zoom"><option value="1">Ajustar</option><option value=".75">75%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label>${button('background','Personalizar')}${button('format','Adaptar formato')}</div></section><aside class="st-panel" aria-label="Ferramentas de edição"><button class="btn btn-quiet st-panel-close" data-st="close-panel" type="button">${A.icon('check',18)} Concluir edição</button><label class="st-check"><input type="checkbox" id="st-advanced"> ${A.icon('sliders',18)} Edição avançada</label><p class="t-small" id="st-help">Toque em um texto ou foto para personalizar.</p><div id="st-properties"></div><details class="st-project-options"><summary>Opções do projeto</summary>${button('backup','Baixar cópia editável')}${button('restore','Restaurar modelo original')}</details></aside></div><input type="file" id="st-photo" accept="image/jpeg,image/png,image/webp" hidden></div>`),after:()=>initEditor(ctx,ev)};
  }
  async function initEditor(ctx,ev){
    const root=document.getElementById('st-editor');try{await libs();await document.fonts.ready;const list=await storage('getAll'),doc=list.find(p=>p.id===ctx.q.projeto&&p.eventId===ev.id);if(!root.isConnected)return;if(!doc){message('Projeto não encontrado. Volte aos modelos para criar uma arte.',true);return;}
      active={doc,ev,saveTicket:0,past:[],future:[],selected:null,advanced:false,zoom:1,abort:new AbortController()};await draw();message('Salvo neste navegador');
      if(JSON.stringify(doc.eventSnapshot)!==JSON.stringify(eventData(ev)))message('Os dados do evento mudaram. Use “Atualizar dados do evento” antes de compartilhar.');
      root.addEventListener('click',async e=>{const b=e.target.closest('[data-st]');if(b)try{await action(b.dataset.st,b);}catch(err){message(err.message||'Não foi possível concluir. Tente novamente.',true);}});
      root.addEventListener('focusin',()=>{active.liveEdit=null;});
      root.addEventListener('input',ev=>{const t=ev.target,k=t.dataset.prop,el=selected();if(!el||!['text','size','color','x','y','w','h'].includes(k))return;if(active.liveEdit!==t){checkpoint();active.liveEdit=t;}el[k]=['size','x','y','w','h'].includes(k)?Number(t.value)||0:t.value;if(k==='size')el.size=Math.max(12,Math.min(240,el.size));clampElement(el);const node=active.layer.findOne('#'+el.id);node?.setAttrs({text:el.text,fontSize:el.size,fill:el.color,x:el.x,y:el.y,width:el.w,height:el.h});active.transformer?.forceUpdate();persist();});
      root.addEventListener('change',e=>{const t=e.target;if(active.liveEdit===t){active.liveEdit=null;draw();return;}if(t.dataset.prop){const k=t.dataset.prop;mutate(d=>{if(k==='projectName')d.name=t.value.slice(0,100);else if(['bg','bg2','gradient'].includes(k))d[k]=k==='gradient'?t.checked:t.value;else{const el=selected();if(!el)return;el[k]=['x','y','w','h','size'].includes(k)?Math.max(k==='size'?12:0,Number(t.value)||0):t.value;if(k==='size'){el.size=Math.min(240,el.size);el.h=Math.max(el.h,el.size*2.8);}clampElement(el);}});}if(t.id==='st-advanced'){active.advanced=t.checked;document.getElementById('st-help').textContent=t.checked?'Arraste ou use as alças. Setas movem o elemento selecionado.':'Toque em um texto ou foto para personalizar.';draw();}if(t.id==='st-zoom'){active.zoom=+t.value;draw();}});
      root.querySelector('#st-photo').onchange=loadPhoto;
      root.addEventListener('keydown',e=>{if(e.key==='Escape'){action('close-panel');return;}if(e.target.matches('input,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();action(e.shiftKey?'redo':'undo');}if(e.target.closest('#st-canvas')&&selected()){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();mutate(()=>{const el=selected(),delta=e.shiftKey?10:1;el.x+=e.key==='ArrowRight'?delta:e.key==='ArrowLeft'?-delta:0;el.y+=e.key==='ArrowDown'?delta:e.key==='ArrowUp'?-delta:0;clampElement(el);});}if(e.key==='Delete'){e.preventDefault();action('delete-element');}}});
      let timer;active.observer=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(root.isConnected)draw();},150);});active.observer.observe(root.querySelector('.st-artboard'));
    }catch{message('Não foi possível abrir o projeto. Recarregue para tentar novamente.',true);}
  }
  async function loadPhoto(e){const file=e.target.files[0];if(!file)return;const s=active,target=s.selected;try{if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20000000)throw Error('Escolha uma imagem JPG, PNG ou WebP de até 20 MB.');message('Preparando fotografia…');const url=URL.createObjectURL(file);let im;try{im=await img(url);}finally{URL.revokeObjectURL(url);imageCache.delete(url);}const scale=Math.min(1,2000/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*scale;c.height=im.height*scale;c.getContext('2d').drawImage(im,0,0,c.width,c.height);if(active!==s)return;mutate(d=>{const el=d.elements.find(x=>x.id===target);if(el)el.src=c.toDataURL('image/jpeg',.9);});}catch(err){message(err.message,true);}e.target.value='';}
  function adapt(w,h){mutate(d=>{
    const oldW=d.w,oldH=d.h,sx=w/oldW,sy=h/oldH,scale=Math.min(sx,sy),horizontal=w/h>=.95;
    d.w=w;d.h=h;
    d.elements.forEach(e=>{e.x*=sx;e.y*=sy;e.w*=sx;e.h*=sy;if(e.type==='text')e.size*=scale;if(e.type==='qr')e.w=e.h=Math.min(e.w,e.h);});
    const photo=d.elements.find(e=>e.role==='photo');
    if(photo){photo.x=horizontal?w*.52:w*.065;photo.y=horizontal?0:h*.05;photo.w=horizontal?w*.48:w*.87;photo.h=horizontal?h:h*.45;}
    const x=horizontal&&photo?w*.045:w*.07,width=horizontal&&photo?w*.41:w*.86;
    d.elements.filter(e=>['name','heading','date','place'].includes(e.role)).forEach(e=>{e.x=x;e.w=width;e.align='left';
      if(e.role==='heading'){e.y=horizontal&&photo?h*.15:photo?h*.54:h*.2;e.size=w*.026;e.h=h*.08;}
      if(e.role==='name'){e.y=horizontal&&photo?h*.26:photo?h*.60:h*.31;e.size=w*(horizontal&&photo ? .065 : .078);e.h=h*.22;}
      if(e.role==='date'){e.y=h*.82;e.size=w*.026;e.h=h*.065;}
      if(e.role==='place'){e.y=h*.90;e.size=w*.022;e.h=h*.075;}
    });d.elements.forEach(clampElement);
  });}

  function dialog(title,body,onOpen){A.modal({title,body,onOpen});}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
  async function exportBlob(type){await document.fonts.ready;const tmp=document.createElement('div');tmp.style.cssText='position:fixed;left:-10000px;top:0';document.body.append(tmp);let result;try{result=await renderDocument(active.doc,tmp,active.doc.w);return await result.stage.toBlob({mimeType:type,quality:.95,pixelRatio:1});}finally{result?.stage.destroy();tmp.remove();}}
  async function action(act,b){const s=active;if(!s)return;
    if(act==='select')return select(b.dataset.id);
    if(act==='close-panel'){document.getElementById('st-editor').classList.remove('st-panel-open');document.querySelector('[data-st=background]').focus();return;}
    if(act==='background')return select(null);
    if(act==='undo'||act==='redo'){const from=act==='undo'?s.past:s.future,to=act==='undo'?s.future:s.past;if(!from.length)return;to.push(clone(s.doc));s.doc=from.pop();persist();return draw();}
    if(act==='event-photo'){mutate(()=>{selected().src=s.photos[+b.dataset.photo];});return;}
    if(act==='photo')return document.getElementById('st-photo').click();
    if(act==='add-photo'){mutate(d=>{const e=element('photo',{x:60,y:60,w:d.w*.6,h:d.h*.4,src:'',color:d.eventSnapshot.color});d.elements.push(e);s.selected=e.id;});return;}
    if(act==='add-text'){mutate(d=>{const e=element('text',{x:60,y:60,w:d.w-120,h:140,text:'Escreva sua mensagem',size:48,font:'Fraunces',color:palette.ink,align:'left'});d.elements.push(e);s.selected=e.id;});return;}
    if(act==='qr'){mutate(d=>{d.elements.filter(e=>['date','place'].includes(e.role)).forEach(e=>e.w=Math.min(e.w,d.w-420));const e=element('qr',{x:d.w-300,y:d.h-300,w:240,h:240,link:eventData(s.ev).link});d.elements.push(e);s.selected=e.id;});return;}
    if(act==='delete-element'){mutate(d=>{d.elements=d.elements.filter(x=>x.id!==s.selected);s.selected=null;});return;}
    if(act==='duplicate-element'&&selected()){mutate(d=>{const e=clone(selected());e.id=uid();e.x+=20;e.y+=20;clampElement(e);d.elements.push(e);s.selected=e.id;});return;}
    if((act==='front'||act==='back')&&selected()){mutate(d=>{const e=selected();d.elements=d.elements.filter(x=>x.id!==e.id);d.elements[act==='front'?'push':'unshift'](e);});return;}
    if(act==='backup')return download(new Blob([JSON.stringify(s.doc,null,2)],{type:'application/json'}),'albora-projeto.json');
    if(act==='restore'){if(confirm('Restaurar o modelo? Você poderá desfazer esta alteração.'))mutate(d=>{const fresh=makeDoc(s.ev,templates.find(t=>t.id===d.template)||templates[0]);const id=d.id;Object.assign(d,fresh,{id});s.selected=null;});return;}
    if(act==='sync'){mutate(d=>{const info=eventData(s.ev);d.eventSnapshot=info;d.elements.forEach(e=>{if(e.role==='name')e.text=info.name.replace(/^Casamento\s+/i,'');if(e.role==='date')e.text=dateLabel(info)+(info.time?' · '+info.time:'');if(e.role==='place')e.text=info.place;if(e.type==='qr')e.link=info.link;});});return;}
    if(act==='format'){dialog('Adaptar formato',`<p>Crie uma versão para outro destino. A original fica salva.</p><div class="st-actions">${Object.entries(formats).map(([k,v])=>button('size',`${{convite:'Convite · 4:5',story:'Story · 9:16',post:'Publicação · 1:1'}[k]}`,`data-w="${v[0]}" data-h="${v[1]}"`)).join('')}</div><form id="st-custom"><div class="st-pair"><label>Largura<input class="input" type="number" name="w" min="320" max="4096" value="1080" required></label><label>Altura<input class="input" type="number" name="h" min="320" max="4096" value="1350" required></label></div><button class="btn btn-line" type="submit">Criar formato personalizado</button></form>`,(m,api)=>{const go=async(w,h)=>{const copy=clone(s.doc);copy.id=uid();copy.name+=' · '+w+'×'+h;s.doc=copy;adapt(w,h);await saveQueue;api.close();location.hash=A.hostBase(s.ev.id)+'/compartilhar?projeto='+copy.id;};m.querySelectorAll('[data-st="size"]').forEach(el=>el.onclick=()=>go(+el.dataset.w,+el.dataset.h));m.querySelector('form').onsubmit=e=>{e.preventDefault();go(+e.target.w.value,+e.target.h.value);};});return;}
    if(act==='export'){if(s.doc.elements.some(e=>e.type==='photo'&&!e.src)){select(s.doc.elements.find(e=>e.type==='photo'&&!e.src).id);message('Escolha a fotografia antes de exportar, ou exclua a moldura para uma arte só com texto.',true);return;}dialog('Sua arte, pronta para sair',`<p>Baixe a imagem ou envie pelo compartilhamento do dispositivo.</p><div class="st-actions">${button('png','Baixar PNG')}${button('jpeg','Baixar JPEG')}${button('native','Compartilhar imagem')}</div><hr><p>Envie o link pelo WhatsApp e anexe a imagem baixada na conversa.</p><div class="st-actions">${button('link','Copiar link')}<a class="btn btn-line btn-sm" href="https://wa.me/?text=${encodeURIComponent(s.doc.eventSnapshot.link)}" target="_blank" rel="noopener">${A.icon('send',18)} Abrir WhatsApp</a></div><p class="t-small">Neste ambiente, o convite aponta para ${E(location.host)}. Um endereço local só abre no aparelho que está executando o protótipo.</p><p id="st-export-status" role="status"></p>`,(m)=>{m.querySelectorAll('[data-st]').forEach(el=>el.onclick=async()=>{const status=m.querySelector('#st-export-status');if(el.dataset.st==='link'){try{await navigator.clipboard.writeText(s.doc.eventSnapshot.link);status.textContent='Link copiado.';}catch{status.textContent='Não foi possível copiar o link.';}return;}el.disabled=true;status.textContent='Preparando a imagem…';try{const type=el.dataset.st==='jpeg'?'image/jpeg':'image/png',blob=await exportBlob(type),name='albora-convite.'+(type==='image/jpeg'?'jpg':'png');if(!blob)throw Error('Falha ao gerar a imagem.');if(el.dataset.st==='native'){const file=new File([blob],name,{type});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:s.doc.name,text:s.doc.eventSnapshot.link});status.textContent='Compartilhamento aberto.';}else{download(blob,name);status.textContent='Imagem baixada. Anexe-a no aplicativo de sua escolha.';}}else{download(blob,name);status.textContent='Imagem pronta e download iniciado.';}}catch(err){status.textContent=err.name==='AbortError'?'Compartilhamento cancelado.':'Não foi possível exportar. Tente baixar novamente.';}finally{el.disabled=false;}});});}
  }
  A.route('/h/e/:id/compartilhar',ctx=>{const ev=eventOf(ctx.params.id);if(!ev)return{title:'Evento não encontrado',html:'<p>Evento não encontrado.</p>'};return ctx.q.projeto?editor(ctx,ev):gallery(ctx,ev);});
  A.studio={templates,makeDoc,validateDoc,storage,exportBlob,get active(){return active;}};
})();
