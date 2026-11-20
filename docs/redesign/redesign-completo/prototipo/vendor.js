/* Albora protótipo — FORNECEDOR white-label (prefixo #/f) e páginas públicas (#/p).
   Dados fictícios em A.data.vendor (semente); o que muda fica em A.store 'vendorDados' e 'vendorRascunho'.
   Uma só tabela de planos (A.data.vendor.planos) alimenta marketing, onboarding, checkout, cobrança e portal. */
(function () {
  const A = window.A; const $ = A.$, esc = A.esc, ic = A.icon;
  const C = A.data.combos;
  const BASE = new Date('2026-11-14T12:00:00');
  const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const iso = (n) => new Date(BASE.getTime() + n * 86400000).toISOString().slice(0, 10);
  const fmtD = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} de ${MES[m - 1]} de ${y}`; };
  const diasAte = (s) => Math.round((new Date(s + 'T12:00:00') - BASE) / 86400000);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const hm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const ini = (s) => String(s).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const tipoNome = (id) => (A.data.tipos.find((t) => t.id === id) || { nome: id }).nome;

  /* ---------- dados (semente) ---------- */
  const D = (A.data.vendor = {
    planos: [
      { id: 'starter', nome: 'Starter', preco: 149, equipe: 2, eventos: 5, selo: true, para: 'Para quem está começando a oferecer o Albora aos clientes.', itens: ['Até 2 pessoas na equipe', 'Até 5 eventos ativos', 'Cor e logo da sua marca', 'Portal público do fornecedor', 'Insights por evento'] },
      { id: 'studio', nome: 'Studio', preco: 349, equipe: 5, eventos: 20, selo: true, para: 'Para quem faz eventos todo mês.', itens: ['Até 5 pessoas na equipe', 'Até 20 eventos ativos', 'Cor, logo e estilo de tipografia', 'Portal público do fornecedor', 'Insights da carteira inteira'] },
      { id: 'agency', nome: 'Agency', preco: 899, equipe: null, eventos: null, selo: false, para: 'Para agências e redes de cerimonial.', itens: ['Equipe sem limite', 'Eventos ativos sem limite', 'Marca própria, sem o selo "com Albora"', 'Insights da carteira inteira', 'Atendimento prioritário'] },
    ],
    list: [
      { id: 'v1', slug: 'aurora-cerimonial', nome: 'Aurora Cerimonial', cidade: 'Belo Horizonte', cor: C[2][1], tema: 'claro', estilo: 'editorial', logo: '', descricao: 'Cerimonial e assessoria para casamentos, formaturas e eventos corporativos. As fotos de quem estava lá, num lugar só, durante e depois da festa.', email: 'contato@aurora.example', whatsapp: '(31) 99999-0101', publicado: true, plano: 'studio' },
      { id: 'v2', slug: 'noite-clara', nome: 'Noite Clara Festas', cidade: 'Nova Lima', cor: C[3][1], tema: 'escuro', estilo: 'minimal', logo: '', descricao: 'Festas pequenas, bem feitas. Aniversários, batizados e encontros de família.', email: 'ola@noiteclara.example', whatsapp: '(31) 98888-0202', publicado: true, plano: 'starter' },
    ],
    clientes: {
      v1: [{ id: 'c1', nome: 'Marina Almeida', email: 'marina@email.com' }, { id: 'c2', nome: 'Lu Prado', email: 'lu@email.com' }, { id: 'c3', nome: 'Comissão Direito 2026', email: 'formatura@direito26.example' }, { id: 'c4', nome: 'Júlia Ferraz', email: 'julia@email.com' }, { id: 'c5', nome: 'Banco Horizonte (RH)', email: 'rh@bancohorizonte.example' }, { id: 'c6', nome: 'Família Teixeira', email: 'teixeira@email.com' }],
      v2: [{ id: 'c7', nome: 'Condomínio Vista Verde', email: 'sindico@vistaverde.example' }, { id: 'c8', nome: 'Rodrigo e Paula', email: 'rodrigo@email.com' }, { id: 'c9', nome: 'Escola Pequeno Passo', email: 'festa@pequenopasso.example' }],
    },
    eventos: {
      v1: [
        { id: 'e1', ref: 'e1', nome: 'Casamento Marina & Rafael', cliente: 'c1', tipo: 'casamento', esperados: 150, fotos: 48, part: 68 },
        { id: 'e2', ref: 'e2', nome: 'Os 40 da Lu', cliente: 'c2', tipo: 'aniversario', esperados: 60, fotos: 212, part: 82 },
        { id: 'e3', ref: 'e3', nome: 'Formatura Direito 2026', cliente: 'c3', tipo: 'formatura', esperados: 220, fotos: 0, part: 0 },
        { id: 'x1', nome: 'Casamento Júlia & André', cliente: 'c4', tipo: 'casamento', dias: 41, esperados: 120, fotos: 0, part: 0 },
        { id: 'x2', nome: 'Confraternização Banco Horizonte', cliente: 'c5', tipo: 'corporativo', dias: 27, esperados: 300, fotos: 0, part: 0 },
        { id: 'x3', nome: 'Dia da Família Banco Horizonte', cliente: 'c5', tipo: 'celebracao', dias: -23, esperados: 180, fotos: 530, part: 57 },
        { id: 'x4', nome: 'Batizado da Alice', cliente: 'c6', tipo: 'celebracao', dias: -60, esperados: 70, fotos: 164, part: 74 },
        { id: 'x5', nome: '15 anos da Bia', cliente: 'c6', tipo: 'aniversario', dias: 62, esperados: 110, fotos: 0, part: 0 },
      ],
      v2: [
        { id: 'x6', nome: 'Festa junina do condomínio', cliente: 'c7', tipo: 'celebracao', dias: 9, esperados: 90, fotos: 0, part: 0 },
        { id: 'x7', nome: 'Aniversário de 1 ano do Theo', cliente: 'c8', tipo: 'aniversario', dias: 15, esperados: 45, fotos: 0, part: 0 },
        { id: 'x8', nome: 'Formatura do Pequeno Passo', cliente: 'c9', tipo: 'formatura', dias: 33, esperados: 80, fotos: 0, part: 0 },
        { id: 'x9', nome: 'Natal do condomínio', cliente: 'c7', tipo: 'celebracao', dias: 40, esperados: 110, fotos: 0, part: 0 },
        { id: 'x10', nome: 'Bodas de prata Rodrigo e Paula', cliente: 'c8', tipo: 'celebracao', dias: 55, esperados: 60, fotos: 0, part: 0 },
      ],
    },
    equipe: {
      v1: [{ id: 'm1', nome: 'Camila Duarte', email: 'camila@aurora.example', papel: 'admin', voce: true }, { id: 'm2', nome: 'Rogério Santos', email: 'rogerio@aurora.example', papel: 'equipe' }, { id: 'm3', nome: 'Bianca Leal', email: 'bianca@aurora.example', papel: 'equipe' }],
      v2: [{ id: 'm4', nome: 'Daniel Rocha', email: 'daniel@noiteclara.example', papel: 'admin', voce: true }, { id: 'm5', nome: 'Sílvia Prado', email: 'silvia@noiteclara.example', papel: 'equipe' }],
    },
    convites: { v1: [{ id: 'i1', email: 'thiago@aurora.example', papel: 'equipe', min: 2880 }], v2: [] },
    assinatura: {
      v1: { status: 'active', forma: 'pix', proxima: '2026-12-05', mudanca: null, cancelando: false },
      v2: { status: 'overdue', forma: 'cartao', proxima: '2026-10-05', mudanca: null, cancelando: false },
    },
    faturas: {
      v1: [{ id: 'f5', venc: '2026-11-05', status: 'pago', valor: 349, plano: 'studio' }, { id: 'f4', venc: '2026-10-05', status: 'pago', valor: 349, plano: 'studio' }, { id: 'f3', venc: '2026-09-05', status: 'pago', valor: 349, plano: 'studio' }, { id: 'f2', venc: '2026-08-05', status: 'estornada', valor: 149, plano: 'starter' }, { id: 'f1', venc: '2026-07-05', status: 'pago', valor: 149, plano: 'starter' }],
      v2: [{ id: 'f7', venc: '2026-10-05', status: 'atrasada', valor: 149, plano: 'starter' }, { id: 'f6', venc: '2026-09-05', status: 'pago', valor: 149, plano: 'starter' }],
    },
    pacotes: {
      v1: [{ id: 'k1', nome: 'Essencial', preco: 1900, desc: 'Telão, QR e álbum final para até 80 convidados.' }, { id: 'k2', nome: 'Completo', preco: 3400, desc: 'Até 200 convidados, missões fotográficas e livro em PDF.' }, { id: 'k3', nome: 'Assinatura da casa', preco: 5800, desc: 'Até 400 convidados, equipe no dia e telão duplo.' }],
      v2: [{ id: 'k4', nome: 'Festa pequena', preco: 900, desc: 'Até 60 convidados, álbum e telão básico.' }, { id: 'k5', nome: 'Festa grande', preco: 1700, desc: 'Até 150 convidados com missões fotográficas.' }],
    },
    legal: { atualizado: '2026-08-22', versao: '2026-08', contato: 'ola@albora.app' },
  });

  /* ---------- estado persistente ---------- */
  const seed = () => ({ list: clone(D.list), clientes: clone(D.clientes), eventos: clone(D.eventos), equipe: clone(D.equipe), convites: clone(D.convites), faturas: clone(D.faturas), assinatura: clone(D.assinatura), pacotes: clone(D.pacotes), removidos: [] });
  const V = () => { let s = A.store.get('vendorDados', null); if (!s) { s = seed(); A.store.set('vendorDados', s); } return s; };
  const put = (fn) => { const s = V(); fn(s); A.store.set('vendorDados', s); return s; };
  const ven = (id) => { const s = V(); return s.list.find((v) => v.id === id && !s.removidos.includes(id)); };
  const venSlug = (slug) => { const s = V(); return s.list.find((v) => v.slug === slug && !s.removidos.includes(v.id)); };
  const plano = (id) => D.planos.find((p) => p.id === id) || D.planos[0];
  const papel = () => (A.sim().role === 'owner' ? 'admin' : 'equipe');
  const faseOf = (e) => (e.ref ? A.when(e.ref).phase : e.dias > 0 ? 'antes' : e.dias === 0 ? 'durante' : 'depois');
  const dataOf = (e) => (e.ref ? A.when(e.ref).date : fmtD(iso(e.dias)));
  const FASE = { antes: ['Preparando', ''], durante: ['Ao vivo', 'live'], depois: ['Encerrado', 'ok'] };
  const ativos = (vid) => (V().eventos[vid] || []).filter((e) => faseOf(e) !== 'depois').length;
  const sub = (vid) => V().assinatura[vid] || { status: 'none', forma: 'pix', proxima: '', mudanca: null, cancelando: false };
  const adminDe = (vid) => ((V().equipe[vid] || []).find((m) => m.papel === 'admin') || { nome: 'o administrador' }).nome;
  const FATURA = { pago: ['Paga', 'ok'], aberta: ['Em aberto', 'info'], pendente: ['Aguardando pagamento', 'warn'], atrasada: ['Atrasada', 'bad'], cancelada: ['Cancelada', ''], estornada: ['Estornada', ''] };

  /* ---------- contraste (WCAG) ---------- */
  const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rgb = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const fr = (n) => n.toFixed(1).replace('.', ',');
  const hostGround = () => { const t = A.sim().theme; return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'noite' : 'papel'; };
  const groundOf = (tema) => (tema === 'escuro' ? 'noite' : 'papel');
  const brandCheck = (cor, tema) => {
    const r = A.theme.resolve(cor, groundOf(tema)); const aj = r.fill.toLowerCase() !== String(cor).toLowerCase();
    const btn = r.ratios.onFill, fundo = r.ratios.fill;
    const ok = true; // o motor ajusta qualquer cor até ficar legível; nada bloqueia o salvar
    const msg = aj ? `Esse tom ficaria difícil de ler no fundo ${tema === 'escuro' ? 'escuro' : 'claro'}. No portal usamos uma versão um pouco mais ${tema === 'escuro' ? 'clara' : 'escura'}: cor sobre o fundo ${fr(fundo)}:1, texto dos botões ${fr(btn)}:1.` : `Contraste bom: texto nos botões ${fr(btn)}:1, cor sobre o fundo ${fr(fundo)}:1.`;
    return { ok, msg };
  };

  /* ---------- estilo (prefixo vd-) ---------- */
  const st = document.createElement('style'); st.id = 'vd-style';
  st.textContent = `
.vd-portal{display:contents}
/* Elevação: no escuro, mais alto = mais claro. Tokens --elev-* do núcleo; o bloco abaixo repete o que o núcleo ainda não declara para o tema escuro do anfitrião (data-host-theme), pode sair quando o núcleo declarar. */
:root[data-host-theme="dark"]{--elev-1:color-mix(in srgb,var(--papel) 4%,var(--noite));--elev-2:color-mix(in srgb,var(--papel) 7.5%,var(--noite));--elev-3:color-mix(in srgb,var(--papel) 13%,var(--noite))}
@media(prefers-color-scheme:dark){:root[data-host-theme="system"]{--elev-1:color-mix(in srgb,var(--papel) 4%,var(--noite));--elev-2:color-mix(in srgb,var(--papel) 7.5%,var(--noite));--elev-3:color-mix(in srgb,var(--papel) 13%,var(--noite))}}
.vd-portal{--vd-e1:var(--bg);--vd-e2:var(--surface);--vd-e3:var(--surface-2)}
:root[data-host-theme="dark"] .vd-portal{--vd-e1:var(--elev-1);--vd-e2:var(--elev-2);--vd-e3:var(--elev-3)}
@media(prefers-color-scheme:dark){:root[data-host-theme="system"] .vd-portal{--vd-e1:var(--elev-1);--vd-e2:var(--elev-2);--vd-e3:var(--elev-3)}}
.vd-portal .rail{background:var(--vd-e1);border-right-color:var(--line-2)}
.vd-portal .topbar{background:var(--vd-e1);border-bottom:1px solid var(--line-2)}
.vd-portal .tabbar{background:var(--vd-e1)}
.vd-portal .ctx{background:var(--vd-e2)} .vd-portal .ctx:hover{background:var(--vd-e3)}
.vd-portal .nav a:hover,.vd-portal .nav button:hover{background:var(--vd-e2)} .vd-portal .nav a[aria-current="page"]{background:var(--vd-e3)}
.vd-portal .avatar{background:var(--vd-e3)} .vd-portal .avatar.acct:hover{background:var(--line)}
.vd-h2{font:400 var(--fs-xl)/1.25 var(--font-display);letter-spacing:-.01em;margin:0 0 var(--space-4)}
.vd-lead{margin:0 0 var(--space-5);color:var(--fg-2);font-size:var(--fs-sm)}
.vd-panel{background:var(--vd-e2);border-radius:var(--r-3);padding:var(--space-5);margin-bottom:var(--space-8)} .vd-panel .vd-h2{font-size:var(--fs-lg);margin-bottom:var(--space-3)} .vd-panel .vd-lead{margin:var(--space-3) 0 0}
.vd-group{margin-top:var(--space-10)}
.vd-directory>.flex>.field{font-size:var(--fs-sm);font-weight:500;color:var(--fg-3)} .vd-directory>.flex>.field .input,.vd-directory>.flex>.field .select{color:var(--fg);font-weight:400}
.vd-aj{display:flex;flex-direction:column;max-width:var(--w-narrow)}
.vd-aj-nav{display:flex;flex-wrap:wrap;gap:0 var(--space-6);border-bottom:1px solid var(--line-2);margin-bottom:var(--space-8)}
.vd-aj-nav button{background:none;border:0;min-height:44px;padding:var(--space-2) 0;color:var(--fg-3);font-weight:500;position:relative;transition:color var(--dur-1) var(--ease)} .vd-aj-nav button:hover{color:var(--fg)} .vd-aj-nav button[aria-current="true"]{color:var(--fg)} .vd-aj-nav button[aria-current="true"]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--ac)}
.vd-aj-sec{padding:var(--space-8) 0;border-top:1px solid var(--line);scroll-margin-top:var(--space-16);outline:0} .vd-aj-sec:first-of-type{border-top:0;padding-top:0}
.vd-aj-sec>.vd-h2{margin-bottom:var(--space-2)} .vd-aj-sec>.vd-lead{max-width:var(--measure)}
.vd-aj-end{display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-2)}
.vd-aj-danger{border-top:1px solid var(--brasa)} .vd-aj-danger>.vd-h2{color:var(--crit-text)}
.vd-portal .brand-mark{width:36px;height:36px;background:none;border:1.5px solid var(--ac);color:var(--fg);font:420 var(--fs-sm) var(--font-display);letter-spacing:.02em;overflow:hidden;flex:none} .vd-portal .brand-mark img{width:100%;height:100%;object-fit:contain}
.vd-portal .rail .brand .w{font:420 var(--fs-lg)/1.15 var(--font-display);overflow-wrap:anywhere}
.vd-portal .nav a,.vd-portal .nav button{min-height:44px} .vd-portal .tabbar a,.vd-portal .tabbar button{font-size:var(--fs-xs)} .vd-portal .nav a.vd-feito{min-height:44px;font-size:var(--fs-xs);font-weight:450;color:var(--fg-3);gap:var(--space-2)} .vd-portal .nav a.vd-feito:hover{color:var(--fg-2)}
.vd-portal .btn-primary,.vd-portal .btn-accent,.vd-pubwrap .btn-primary,.vd-pubwrap .btn-accent,.vd-prev .btn-accent{background:var(--ac);color:var(--on-ac);border-color:transparent}
.vd-portal .btn-primary:hover,.vd-portal .btn-accent:hover,.vd-pubwrap .btn-primary:hover,.vd-pubwrap .btn-accent:hover{background:var(--ac);text-decoration:underline;text-underline-offset:var(--space-1)}
.vd-portal .btn-primary:disabled,.vd-portal .btn-accent:disabled,.vd-pubwrap .btn-accent:disabled{background:var(--surface-2);color:var(--fg-3)}
.vd-portal .main,.vd-portal .page,.vd-pubmain>*,.vd-portal .split>*,.vd-pubwrap .split>*{min-width:0}
.vd-portal .split,.vd-pubwrap .split{grid-template-columns:minmax(0,1fr)}
@media(min-width:1001px){.vd-portal .split,.vd-pubwrap .split{grid-template-columns:minmax(0,1fr) 340px}}
@media(max-width:900px){.vd-portal .app{grid-template-columns:minmax(0,1fr)}}
.vd-portal .li{flex-wrap:wrap} .vd-portal .li .grow{flex:1 1 12rem;min-width:0;overflow-wrap:anywhere}
.vd-portal .flex,.vd-pubwrap .flex{flex-wrap:wrap} .vd-portal .btn,.vd-pubwrap .btn{max-width:100%;white-space:normal;line-height:1.25;padding-block:var(--space-2)}
.vd-portal .rail .ctx{min-height:44px;min-width:44px}
.vd-inv>*{min-width:0;flex:1 1 12rem} .vd-inv>.btn{flex:none}
.vd-ul{margin:0;padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-1);color:var(--fg-2);font-size:var(--fs-sm)}
.vd-cmpt{display:none} .vd-cmpl{display:flex;flex-direction:column;gap:var(--space-8)}
.vd-pl{display:flex;flex-direction:column;gap:var(--space-3);padding-top:var(--space-4);border-top:1px solid var(--line)} .vd-pl.dest{border-top:2px solid var(--ac)}
.vd-pl .mk{font-size:var(--fs-xs);font-weight:600;color:var(--accent-text)} .vd-pl h3{font:380 var(--fs-title)/1.1 var(--font-display)} .vd-pl .pr{font:350 var(--fs-xl)/1 var(--font-display);font-variant-numeric:tabular-nums} .vd-pl .pr small{font:400 var(--fs-sm) var(--font-body);color:var(--fg-3)} .vd-pl .para{color:var(--fg-2);font-size:var(--fs-sm)}
.vd-pl dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-2) var(--space-4);margin:0;font-size:var(--fs-sm)} .vd-pl dt{color:var(--fg-3)} .vd-pl dd{margin:0;text-align:right;font-variant-numeric:tabular-nums} .vd-pl .btn{width:100%} .vd-pl .atual{display:block;padding:var(--space-3) 0;font-weight:600;font-size:var(--fs-sm)}
.vd-cmp{width:100%;border-collapse:collapse;table-layout:fixed;font-variant-numeric:tabular-nums} .vd-cmp th,.vd-cmp td{padding:var(--space-3) var(--space-4) var(--space-3) 0;text-align:left;vertical-align:top;border-bottom:1px solid var(--line-2);font-size:var(--fs-sm);font-weight:400}
.vd-cmp thead th{border-bottom:1px solid var(--line);padding-bottom:var(--space-5);padding-top:var(--space-3);vertical-align:bottom} .vd-cmp thead th.dest{border-top:2px solid var(--ac)} .vd-cmp thead th:first-child{border-top:0}
.vd-cmp .pn{display:block;font:380 var(--fs-title)/1.1 var(--font-display)} .vd-cmp .pr{display:block;margin-top:var(--space-2);font:350 var(--fs-title)/1 var(--font-display)} .vd-cmp .pr small{font:400 var(--fs-sm) var(--font-body);color:var(--fg-3)} .vd-cmp .para{display:block;margin-top:var(--space-2);font-size:var(--fs-sm);color:var(--fg-3);font-weight:400;line-height:1.35} .vd-cmp .mk{display:block;font-size:var(--fs-xs);font-weight:600;color:var(--accent-text);margin-bottom:var(--space-1)}
.vd-cmp tbody th{width:20%;color:var(--fg-3);font-weight:500;font-size:var(--fs-sm)} .vd-cmp tfoot td{border:0;padding-top:var(--space-5)} .vd-cmp .btn{width:100%;white-space:normal;line-height:1.2;padding-block:var(--space-2)} .vd-cmp .atual{display:block;padding:var(--space-3) 0;font-weight:600;font-size:var(--fs-sm)}
@media(min-width:760px){.vd-cmpt{display:block} .vd-cmpl{display:none}}
.vd-steps{display:flex;gap:var(--space-2) var(--space-8);align-items:center;flex-wrap:wrap;margin:0 0 var(--space-8)} .vd-steps ol{display:flex;gap:var(--space-2) var(--space-5);list-style:none;padding:0;margin:0;flex-wrap:wrap;font-size:var(--fs-sm);color:var(--fg-3)} .vd-steps li[aria-current=step]{color:var(--fg);font-weight:600} .vd-steps li.feito{color:var(--fg-2)}
.vd-tabs{display:flex;gap:var(--space-6);border-bottom:1px solid var(--line-2);margin-bottom:var(--space-6)} .vd-tabs a{padding:var(--space-3) 0;min-height:44px;display:inline-flex;align-items:center;color:var(--fg-3);font-weight:500;text-decoration:none;position:relative} .vd-tabs a[aria-current=page]{color:var(--fg)} .vd-tabs a[aria-current=page]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--ac)}
.vd-prev{border:1px solid var(--line-2);border-radius:var(--r-3);padding:var(--space-5);background:var(--bg);color:var(--fg);display:flex;flex-direction:column;gap:var(--space-4)} .vd-prev .pbar{font:500 var(--fs-xs) var(--font-body);color:var(--fg-3);border-bottom:1px solid var(--line-2);padding-bottom:var(--space-3)}
.vd-prev .top{display:flex;align-items:center;gap:var(--space-3);font:600 var(--fs-md) var(--font-body)} .vd-prev .lg{width:32px;height:32px;border-radius:50%;background:var(--ac);color:var(--on-ac);display:grid;place-items:center;font:500 var(--fs-sm) var(--font-display);overflow:hidden;flex:none} .vd-prev .lg img{width:100%;height:100%;object-fit:contain;background:var(--papel)}
.vd-prev h3{font:350 var(--fs-title)/1.12 var(--font-display)} .vd-prev .btn{pointer-events:none}
.vd-prev2{gap:var(--space-3)} .vd-prev2 .pr-brand{display:flex;align-items:center;gap:var(--space-3);font:420 var(--fs-lg) var(--font-display)} .vd-prev2 ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;font-size:var(--fs-sm);color:var(--fg-2)} .vd-prev2 li{padding:var(--space-2) 0 var(--space-2) var(--space-4);position:relative} .vd-prev2 li.on{color:var(--fg);font-weight:600} .vd-prev2 li.on::before{content:"";position:absolute;left:0;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:var(--ac)}
.vd-selo{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--fs-xs);color:var(--fg-3)} a.vd-selo{min-height:44px}
.vd-bar{height:2px;background:var(--line-2);overflow:hidden;min-width:80px} .vd-bar i{display:block;height:100%;background:var(--ac)}
.vd-uso{display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);font-size:var(--fs-sm);color:var(--fg-2)} .vd-uso .arc{flex:none}
.vd-fases{display:flex;gap:0 var(--space-6);flex-wrap:wrap;margin:var(--space-3) 0 var(--space-4)} .vd-fases button{background:none;border:0;min-height:44px;padding:0;color:var(--fg-3);font-weight:500;position:relative} .vd-fases button .n{margin-left:var(--space-1);font-variant-numeric:tabular-nums;color:var(--fg-3)} .vd-fases button[aria-pressed=true]{color:var(--fg)} .vd-fases button[aria-pressed=true]::after{content:"";position:absolute;left:0;right:0;bottom:var(--space-2);height:2px;background:var(--ac)}
.vd-tools{display:flex;flex-wrap:wrap;gap:var(--space-3)} .vd-tools .search{flex:1 1 14rem} .vd-tools .select{width:auto;min-width:10rem;flex:1 1 10rem}
.vd-ev{display:block} .vd-ev thead{display:none} .vd-ev tbody{display:block}
.vd-ev tbody tr{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-1) var(--space-4);align-items:center;padding:var(--space-2) 0;border-bottom:1px solid var(--line-2)}
.vd-ec{display:flex;align-items:center;gap:var(--space-3);min-width:0} .vd-en{min-width:0;display:block} .vd-th{position:relative;flex:none;width:40px;height:40px;border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-2);color:var(--fg-2);display:grid;place-items:center;font:500 var(--fs-xs) var(--font-body)} .vd-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vd-ev td{display:block;padding:0;border:0} .vd-ev .vd-hs{display:none} .vd-ev tbody tr:hover td{background:none}
.vd-ev .vd-nm{background:none;border:0;padding:0;min-height:44px;display:flex;align-items:center;font:600 var(--fs-md) var(--font-body);color:var(--fg);text-align:left;text-decoration:none} .vd-ev .vd-nm::after{content:"";position:absolute;inset:0} .vd-ev .sub{display:block;font-weight:400;margin-top:calc(var(--space-1)*-1)}
.vd-ev th button{min-height:44px;min-width:44px} .vd-ev th button .d{transition:transform var(--dur-2) var(--ease)} .vd-ev th button .up{transform:rotate(180deg)}
.vd-fase{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--fs-sm);white-space:nowrap} .vd-fase i{width:8px;height:8px;border-radius:50%;border:1.5px solid var(--fg-3);flex:none} .vd-fase[data-f=durante] i{background:var(--ac);border-color:var(--ac)} .vd-fase[data-f=depois] i{background:var(--fg-3)}
.vd-sm{display:inline} .vd-sort-sm{display:block}
@media(min-width:760px){
.vd-sm{display:none} .vd-sort-sm{display:none}
.vd-ev{display:table} .vd-ev thead{display:table-header-group} .vd-ev tbody{display:table-row-group}
.vd-ev tbody tr{display:table-row;padding:0} .vd-ev tbody tr:hover{background:var(--surface)}
.vd-ev td{display:table-cell;padding:var(--space-3);border-bottom:1px solid var(--line-2);vertical-align:middle} .vd-ev .vd-hs{display:table-cell}
.vd-ev .sub{margin-top:0}
}
.vd-head{display:flex;gap:var(--space-6);align-items:flex-end;flex-wrap:wrap;margin:0 0 var(--space-8)} .vd-head .big{font:300 calc(var(--fs-hero)*1.5)/.95 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em} .vd-head p{max-width:46ch;color:var(--fg-2)} .vd-head b{color:var(--fg);font-weight:600}
.vd-plan{margin:var(--space-2) 0 var(--space-12)} .vd-plan h2{font:350 calc(var(--fs-display)*1.1)/1.05 var(--font-display)} .vd-plan p{margin-top:var(--space-2);color:var(--fg-2)}
.vd-pubwrap{min-height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg)}
.vd-pubtop{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-3) var(--gutter);border-bottom:1px solid var(--line-2);flex-wrap:wrap} .vd-pubtop nav{display:flex;gap:0 var(--space-5);align-items:center;flex-wrap:wrap} .vd-pubtop nav a:not(.btn){text-decoration:none;color:var(--fg-2);font-weight:500;min-height:44px;display:inline-flex;align-items:center}
.vd-brand{min-height:44px;display:flex;align-items:center;gap:var(--space-3);text-decoration:none;color:var(--fg);font:420 var(--fs-xl) var(--font-display)} .vd-brand .lg{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--ac);display:grid;place-items:center;font:420 var(--fs-md) var(--font-display);overflow:hidden;flex:none} .vd-brand .lg img{width:100%;height:100%;object-fit:contain}
.vd-pubmain{flex:1;width:100%;max-width:var(--w-page);margin:0 auto;padding:var(--section) var(--gutter);outline:0;display:flex;flex-direction:column;gap:var(--section)}
.vd-pubfoot{padding:var(--space-4) var(--gutter);border-top:1px solid var(--line-2);display:flex;gap:0 var(--space-6);flex-wrap:wrap;justify-content:space-between;align-items:center;font-size:var(--fs-sm);color:var(--fg-2)} .vd-pubfoot a{color:inherit;display:inline-flex;align-items:center;min-height:44px} .vd-fl{display:flex;flex-wrap:wrap;gap:0 var(--space-5)}
.vd-hero{display:flex;flex-direction:column;gap:var(--space-4);max-width:var(--measure)} .vd-hero h1{font:350 calc(var(--fs-display)*1.2)/1.06 var(--font-display);letter-spacing:-.015em;text-wrap:balance}
.vd-vh{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-8);align-items:center} .vd-vh h1{font:300 calc(var(--fs-display)*1.6)/.98 var(--font-display);letter-spacing:-.025em;text-wrap:balance;overflow-wrap:anywhere} .vd-vh .txt{display:flex;flex-direction:column;gap:var(--space-5);align-items:flex-start} .vd-vh .ttl{display:flex;flex-direction:column;gap:var(--space-3)} .vd-vh .cid{font-size:var(--fs-sm);color:var(--fg-2)}
.vd-vh .txt>*{animation:vd-in var(--dur-3) var(--ease) both} .vd-vh .txt>:nth-child(2){animation-delay:var(--dur-1)} .vd-vh .txt>:nth-child(3){animation-delay:var(--dur-2)}
.vd-ph{position:relative;aspect-ratio:1.5/1;animation:vd-fade var(--dur-3) var(--ease) var(--dur-2) both} .vd-ph img{position:absolute;object-fit:cover;border-radius:var(--r-2);display:block} .vd-ph img:nth-child(1){left:0;top:0;width:64%;height:78%} .vd-ph img:nth-child(2){right:0;bottom:0;width:54%;height:58%;outline:var(--space-2) solid var(--bg)}
@keyframes vd-in{from{opacity:0;transform:translateY(var(--space-2))}} @keyframes vd-fade{from{opacity:0}}
@media(min-width:760px){.vd-vh{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(var(--space-6),5vw,var(--space-16))} .vd-ph{aspect-ratio:1/1.05}}
@media(prefers-reduced-motion:reduce){.vd-vh .txt>*,.vd-ph{animation:none}}
.vd-pk{display:flex;flex-direction:column} .vd-pk .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-2) var(--space-6);align-items:baseline;padding:var(--space-6) 0;border-top:1px solid var(--line)} .vd-pk .row:last-child{border-bottom:1px solid var(--line)} .vd-pk .row p{grid-column:1/-1;grid-row:2} .vd-pk .nm{font:380 var(--fs-xl)/1.15 var(--font-display)} .vd-pk .vl{font:350 var(--fs-xl)/1 var(--font-display);font-variant-numeric:tabular-nums} .vd-pk p{color:var(--fg-2);font-size:var(--fs-md);max-width:48ch}
@media(min-width:700px){.vd-pk .row{grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr) auto;gap:var(--space-2) var(--space-8)} .vd-pk .row p{grid-column:auto;grid-row:auto}}
.vd-sec{display:flex;flex-direction:column;gap:var(--space-6)} .vd-sec>h2{font:380 var(--fs-title)/1.15 var(--font-display)} .vd-sec>h2::after{content:"";display:block;width:var(--space-8);height:2px;background:var(--ac);margin-top:var(--space-3)}
.vd-pass{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:var(--space-6);list-style:none;margin:0;padding:0;counter-reset:p} .vd-pass li{border-top:1px solid var(--line);padding-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);counter-increment:p;color:var(--fg-2);font-size:var(--fs-sm)} .vd-pass li b{color:var(--fg);font-size:var(--fs-md)} .vd-pass li::before{content:counter(p);font:380 var(--fs-xl) var(--font-display);color:var(--fg)}
@media(min-width:760px){.vd-cmpt{display:none} .vd-cmpl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4);align-items:stretch}}
.vd-pl{position:relative;padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.vd-pl.dest{background:var(--bg);border-color:var(--ac);box-shadow:0 0 0 1px var(--ac),0 16px 36px color-mix(in srgb,var(--tinta) 10%,transparent)}
.vd-pl .mk{align-self:flex-start;padding:var(--space-1) var(--space-3);border-radius:var(--r-pill);background:var(--ac);color:var(--on-ac)}
.vd-pl h3{font:380 var(--fs-xl)/1.15 var(--font-display)}
.vd-pl .pr{font:350 var(--fs-title)/1 var(--font-display);font-variant-numeric:tabular-nums}
.vd-pl .btn{margin-top:auto;border-radius:var(--r-pill)}
.vd-eyebrow{font:600 var(--fs-xs)/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
.vd-hero2{max-width:none;display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-8);align-items:center}
.vd-hero2 .vd-hero-t{display:flex;flex-direction:column;gap:var(--space-5);max-width:var(--measure)}
.vd-hero2 .btn{border-radius:var(--r-pill)}
.vd-hero-art{position:relative;display:grid;place-items:center;padding:var(--space-6) 0}
.vd-hero-phone{width:min(260px,70%);aspect-ratio:9/16;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:var(--space-2);padding:var(--space-3);background:var(--tinta);border:var(--space-2) solid var(--tinta);border-radius:calc(var(--r-4) * 2);box-shadow:0 24px 48px color-mix(in srgb,var(--tinta) 25%,transparent);overflow:hidden}
.vd-hp-t{display:block;overflow:hidden;border-radius:var(--r-3)} .vd-hp-t img{display:block;width:100%;height:100%;object-fit:cover}
.vd-hero-chip{position:absolute;left:0;bottom:var(--space-12);display:inline-flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-5) var(--space-2) var(--space-2);background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-pill);box-shadow:0 12px 28px color-mix(in srgb,var(--tinta) 16%,transparent);font-weight:600;font-size:var(--fs-sm)}
.vd-hero-ac{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--ac);color:var(--on-ac);font:500 var(--fs-sm) var(--font-display)}
@media(min-width:760px){.vd-hero2{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(var(--space-6),5vw,var(--space-16))}}
.vd-pass li{padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.vd-sec>h2::after{border-radius:var(--r-pill);height:var(--space-1)}
.vd-cmpt .table-wrap,.vd-cmpt{border-radius:var(--r-3)}
.vd-toc{display:flex;flex-direction:column} .vd-toc button{background:none;border:0;text-align:left;padding:var(--space-2) 0;min-height:44px;color:var(--accent-text);text-decoration:underline;text-underline-offset:3px;font-weight:500}
.vd-doc h2{font:380 var(--fs-xl)/1.2 var(--font-display);margin:var(--space-6) 0 var(--space-2)} .vd-doc p,.vd-doc li{color:var(--fg-2);max-width:68ch} .vd-doc ul{padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2)}
.vd-radio{display:flex;gap:var(--space-3);align-items:flex-start;padding:var(--space-4) 0;min-height:44px;border-bottom:1px solid var(--line-2);cursor:pointer} .vd-radio input{width:22px;height:22px;accent-color:var(--ac);margin:var(--space-1) 0 0;flex:none}
.vd-qr svg{color:var(--tinta)!important}
.vd-kv{display:grid;grid-template-columns:auto 1fr;gap:var(--space-2) var(--space-5);margin:0} .vd-kv dt{color:var(--fg-3);font-size:var(--fs-sm)} .vd-kv dd{margin:0;font-weight:500}
.vd-mono{display:grid;place-items:center;width:clamp(72px,12vw,104px);aspect-ratio:1;border-radius:50%;border:2px solid var(--ac);font:300 var(--fs-display) var(--font-display);overflow:hidden} .vd-mono img{width:100%;height:100%;object-fit:contain}
.vd-sw{width:14px;height:14px;border-radius:50%;display:inline-block;flex:none}
.vd-fs{border:0;padding:0;margin:0} .vd-fs legend{margin-bottom:var(--space-2)}
.vd-pix{display:flex;gap:var(--space-6);align-items:flex-start;flex-wrap:wrap} .vd-pix .vd-qr{background:var(--papel);padding:var(--space-3);border-radius:var(--r-2);color:var(--tinta);--qr-bg:var(--papel)} .vd-pix .cod{font-size:var(--fs-xs);word-break:break-all}
.vd-inv{align-items:flex-end;gap:var(--space-4)} .vd-cor{display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap} .vd-cor input[type=color]{width:44px;height:44px;border:0;padding:0;background:none}
.vd-lh{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center} .vd-lh label.btn{cursor:pointer}
.vd-hints{margin-top:var(--space-4)} .vd-gap-t{margin-top:var(--space-4)} .vd-gap-s{margin-top:var(--space-6)} .vd-gap-b{margin-bottom:var(--space-4)} .vd-mb2{margin-bottom:var(--space-2)} .vd-mb3{margin-bottom:var(--space-3)}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){
.vd-portal .ctx:hover{background:var(--vd-e2)}
.vd-portal .nav a:not([aria-current="page"]):hover,.vd-portal .nav button:hover{background:transparent}
.vd-portal .avatar.acct:hover{background:var(--vd-e3)}
.vd-aj-nav button:not([aria-current="true"]):hover,.vd-portal .nav a.vd-feito:hover{color:var(--fg-3)}
.vd-portal .btn-primary:hover,.vd-portal .btn-accent:hover,.vd-pubwrap .btn-primary:hover,.vd-pubwrap .btn-accent:hover{text-decoration:none}
}
.vd-ob1{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6);align-items:start}
.vd-ob1-pv{display:none;flex-direction:column;gap:var(--space-3);position:sticky;top:var(--space-6)}
.vd-bw{background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);box-shadow:var(--elev-2);overflow:hidden}
.vd-bw-bar{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);background:var(--surface-2);border-bottom:1px solid var(--line-2)}
.vd-bw-bar i{width:10px;height:10px;border-radius:50%;background:var(--line)}
.vd-bw-bar span{margin-left:var(--space-3);flex:1;min-width:0;padding:var(--space-1) var(--space-3);background:var(--bg);border-radius:var(--r-pill);font-size:var(--fs-xs);color:var(--fg-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vd-bw-body{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-8) var(--space-5) var(--space-5);text-align:center}
.vd-bw-logo{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:var(--ac);color:var(--on-ac);font:500 var(--fs-lg) var(--font-display)}
.vd-bw-n{font:400 var(--fs-xl)/1.15 var(--font-display);overflow-wrap:anywhere}
.vd-bw-g{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);width:100%;margin-top:var(--space-4)}
.vd-bw-g span{display:block;aspect-ratio:1;overflow:hidden;border-radius:var(--r-2)} .vd-bw-g img{display:block;width:100%;height:100%;object-fit:cover}
@media(min-width:900px){.vd-ob1{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:var(--space-10)}.vd-ob1-pv{display:flex}}
/* v215 — painel do fornecedor: KPIs em cartão, cabeçalho de Insights em cartão */
.vd-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3);margin:0 0 var(--space-6)}
@media(min-width:900px){.vd-kpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-4)}}
.vd-kpi{display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.vd-kpi-l{font-size:var(--fs-sm);color:var(--fg-2)}
.vd-kpi-n{font:350 var(--fs-display)/1 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.vd-kpi-s{font-size:var(--fs-xs);color:var(--fg-3)}
.app .vd-head{padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);align-items:center;gap:var(--space-8)}
.vd-bar{height:8px;border-radius:var(--r-pill);overflow:hidden} .vd-bar i{border-radius:var(--r-pill)}
.vd-fases button{border-radius:var(--r-pill)}
.vd-tools{flex-wrap:wrap}.vd-tools .select{box-sizing:border-box;max-width:100%}
@media(max-width:600px){.vd-fases{flex-wrap:wrap}}
/* v217 — Marca e Cobrança em cartões */
.vd-card{display:flex;flex-direction:column;gap:var(--space-5);padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.vd-card-h{margin:0;font:400 var(--fs-xl)/1.2 var(--font-display)}
.vd-card .input,.vd-card .select,.vd-card .textarea{background:var(--bg)}
.vd-savebar{position:sticky;bottom:var(--space-4);z-index:2;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-pill);box-shadow:var(--elev-2)}
.vd-savebar .btn{border-radius:var(--r-pill)}
.vd-plan2{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--space-6);padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);margin:0 0 var(--space-8)}
.vd-plan2 h2{margin:var(--space-2) 0 0;font:350 var(--fs-hero)/1 var(--font-display);letter-spacing:-.01em}
.vd-plan-d{display:grid;grid-template-columns:repeat(3,auto);gap:var(--space-8);margin:0}
.vd-plan-d dt{font-size:var(--fs-sm);color:var(--fg-2)} .vd-plan-d dd{margin:var(--space-1) 0 0;font:400 var(--fs-xl)/1.2 var(--font-display);font-variant-numeric:tabular-nums} .vd-plan-d small{font:400 var(--fs-sm) var(--font-body);color:var(--fg-2)}
.vd-plan2 .badge{margin-left:var(--space-2);border-radius:var(--r-pill)}
@media(max-width:700px){.vd-plan-d{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-4)}.vd-plan2{padding:var(--space-5)}}
.vd-pl .btn,.vd-pl .atual{border-radius:var(--r-pill)}
.app .list .li{border-radius:var(--r-3)}
/* v218 — Clientes e equipe: abas em pílula, busca em pílula, linhas em cartão */
.app .vd-tabs{display:inline-flex;gap:var(--space-1);padding:var(--space-1);background:var(--surface-2);border:0;border-radius:var(--r-pill);margin-bottom:var(--space-6)}
.vd-tabs a{display:inline-flex;align-items:center;gap:var(--space-2);min-height:44px;padding:0 var(--space-5);border:0;border-radius:var(--r-pill);color:var(--fg-2);font-weight:500;text-decoration:none}
.vd-tabs a::after,.vd-tabs a::before{display:none}
.vd-tabs a[aria-current=page]{background:var(--bg);color:var(--fg);box-shadow:var(--elev-1);border:0}
.vd-tabs .n{font-size:var(--fs-xs);padding:0 var(--space-2);border-radius:var(--r-pill);background:var(--surface-2);color:var(--fg-2)}
.vd-directory .input[type=search]{background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-pill);padding-inline:var(--space-5)}
.vd-directory .select{border-radius:var(--r-pill);background:var(--surface);border:1px solid var(--line-2)}
.vd-directory .list{display:flex;flex-direction:column;gap:var(--space-2)}
.vd-directory .li{padding:var(--space-4) var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3)}
.vd-directory .li .avatar{width:44px;height:44px;border-radius:50%;background:color-mix(in srgb,var(--ac) 16%,var(--surface-2));color:var(--fg);font-weight:600}
.vd-directory .li{flex-wrap:wrap}
.vd-directory .li .select{box-sizing:border-box;max-width:100%;min-width:min(150px,100%);padding:var(--space-2) var(--space-4);font-size:var(--fs-sm)}
.vd-directory .li .btn{border-radius:var(--r-pill)}
.vd-panel{border-radius:var(--r-4);padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);margin-bottom:var(--space-6)}
.vd-panel .btn{border-radius:var(--r-pill)}
.vd-panel .input,.vd-panel .select{background:var(--bg)}
/* v229 — landing 15 anos: hero com mosaico, aviso de menores em cartão, quatro cuidados em grade */
.vd-note15{display:flex;gap:var(--space-4);align-items:flex-start;padding:var(--space-5) var(--space-6);margin:var(--space-8) 0;background:var(--surface);border:1px solid var(--line-2);border-left:4px solid var(--ac);border-radius:var(--r-3)}
.vd-note15 p{margin:var(--space-1) 0 0;color:var(--fg-2)}
.vd-note15-i{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:var(--surface-2)}
.vd-cards15{list-style:none;margin:var(--space-5) 0 0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
@media(min-width:760px){.vd-cards15{grid-template-columns:repeat(2,minmax(0,1fr))}}
.vd-cards15 li{display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.vd-cards15 li>span{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ac);color:var(--on-ac)}
.vd-cards15 p{margin:0;font-size:var(--fs-md);line-height:1.5}
/* v230 — privacidade: três promessas, índice fixo e seções em cartão */
.vd-doc.vd-priv{max-width:72rem}
.vd-priv-h{display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-8)} .vd-priv-h .t-lead{margin:0;max-width:56ch}
.vd-doc .vd-priv-p{list-style:none;margin:0 0 var(--space-10);padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
@media(min-width:760px){.vd-doc .vd-priv-p{grid-template-columns:repeat(3,minmax(0,1fr))}}
.vd-priv-p li{display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
.vd-priv-p li>span{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ac);color:var(--on-ac);margin-bottom:var(--space-2)}
.vd-priv-p p{margin:0;color:var(--fg-2);font-size:var(--fs-sm)}
.vd-priv-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6);align-items:start}
@media(min-width:900px){.vd-priv-grid{grid-template-columns:16rem minmax(0,1fr);gap:var(--space-10)}}
.vd-priv-toc{display:flex;flex-direction:column;gap:var(--space-1)}
@media(min-width:900px){.vd-priv-toc{position:sticky;top:var(--space-6)}}
.vd-priv-toc .t-label{margin-bottom:var(--space-2)}
.vd-priv-toc button{min-height:44px;padding:0 var(--space-4);text-align:left;background:none;border:0;border-radius:var(--r-pill);color:var(--fg-2);font:inherit;font-size:var(--fs-sm);cursor:pointer}
.vd-priv-toc button:hover{background:var(--surface-2);color:var(--fg)}
.vd-priv-body{display:flex;flex-direction:column;gap:var(--space-4)}
.vd-priv-s{padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);scroll-margin-top:var(--space-6)}
.vd-priv-s h2{display:flex;align-items:center;gap:var(--space-3);margin:0 0 var(--space-3);font:400 var(--fs-xl)/1.2 var(--font-display)}
.vd-priv-s p{margin:0;max-width:62ch;line-height:1.6}
.vd-priv-n{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:var(--surface-2);font:600 var(--fs-xs) var(--font-body)}
@media(max-width:600px){.vd-priv-toc{flex-direction:row;overflow-x:auto;padding-bottom:var(--space-2)}.vd-priv-toc .t-label{display:none}.vd-priv-toc button{flex:none;white-space:nowrap;border:1px solid var(--line-2)}}
/* v205 — cadastro do fornecedor: formulário em cartão, etapas em pílula */
.vd-steps{padding:var(--space-3) var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);margin-bottom:var(--space-6)}
.vd-steps ol li{padding:var(--space-1) var(--space-3);border-radius:var(--r-pill)}
.vd-steps li[aria-current=step]{background:var(--ac);color:var(--on-ac)}
main.page form[data-draft]{padding:var(--space-6);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4);box-shadow:var(--elev-1)}
main.page form[data-draft] .input,main.page form[data-draft] .select{background:var(--bg)}
main.page form[data-draft] .btn{border-radius:var(--r-pill)}
@media(max-width:600px){main.page form[data-draft]{padding:var(--space-4)}}
/* v233 — cadastro: campos em caixa arredondada, passos sem arco, endereço em chip */
.vd-steps .arc{display:none}
.app .vd-steps,.vd-steps{padding:var(--space-2);gap:var(--space-2);margin-bottom:var(--space-5)}
.vd-steps ol{flex:1;justify-content:space-between;gap:var(--space-1)}
.vd-steps ol{flex-wrap:nowrap}
.vd-steps ol li{flex:1 1 0;min-width:0;text-align:center;padding:var(--space-2) var(--space-3)}
@media(max-width:600px){.vd-steps ol li{font-size:var(--fs-xs);padding:var(--space-2)}}
main.page form[data-draft]{gap:var(--space-5)}
main.page form[data-draft] h1.t-display{font-size:var(--fs-title);line-height:1.1}
main.page form[data-draft] .t-lead{font-size:var(--fs-md);margin-top:var(--space-1)}
main.page form[data-draft] .field>label,main.page form[data-draft] .field .lbl{font-size:var(--fs-sm);font-weight:600;color:var(--fg)}
main.page form[data-draft] .input,main.page form[data-draft] .select{box-sizing:border-box;min-height:52px;padding:var(--space-3) var(--space-4);background:var(--bg);border:1px solid var(--line);border-radius:var(--r-3);font-style:normal}
main.page form[data-draft] .input::placeholder{font-style:normal;color:var(--fg-3);opacity:.7}
main.page form[data-draft] .input:focus{outline:0;border-color:var(--ac);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac) 25%,transparent)}
main.page form[data-draft] .hint{font-size:var(--fs-xs);color:var(--fg-3)}
.vd-urlchip{display:inline-flex;align-items:center;gap:var(--space-2);align-self:flex-start;margin:0;padding:var(--space-2) var(--space-4);background:var(--surface-2);border-radius:var(--r-pill);font-size:var(--fs-sm);color:var(--fg-2)} .vd-urlchip b{color:var(--fg);overflow-wrap:anywhere}
main.page form[data-draft] .flex.between{align-items:center;padding-top:var(--space-4);border-top:1px solid var(--line-2)}
main.page form[data-draft] .btn[type=submit]{min-height:48px;padding-inline:var(--space-8)}
/* v236 — cadastro estilo assistente do macOS: trilho de etapas, grupos de campos em linhas, laranja acessível */
.vd-obpage{--ac:var(--ambar-fundo);--on-ac:var(--papel);max-width:68rem}
.vd-ob{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6);align-items:start}
@media(min-width:900px){.vd-ob{grid-template-columns:17rem minmax(0,1fr);gap:var(--space-10)}}
.vd-ob-c{min-width:0}
.vd-rail{display:flex;flex-direction:column;gap:var(--space-5);padding:var(--space-5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-4)}
@media(min-width:900px){.vd-rail{position:sticky;top:var(--space-6)}}
.vd-rail-h{display:flex;flex-direction:column;gap:var(--space-1);margin:0}
.vd-rail-h b{font:400 var(--fs-xl)/1.15 var(--font-display)} .vd-rail-h span{font-size:var(--fs-sm);color:var(--fg-2)}
.vd-rail ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-1)}
.vd-rail li{display:flex;gap:var(--space-3);align-items:flex-start;padding:var(--space-3);border-radius:var(--r-3);color:var(--fg-2)}
.vd-rail li.atual{background:var(--surface-2);color:var(--fg)}
.vd-rail-i{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--line);font:600 var(--fs-xs) var(--font-body);background:var(--bg)}
.vd-rail li.atual .vd-rail-i{background:var(--ac);border-color:var(--ac);color:var(--on-ac)}
.vd-rail li.feito .vd-rail-i{background:color-mix(in srgb,var(--ac) 16%,var(--surface-2));border-color:transparent;color:var(--fg)}
.vd-rail-t{display:flex;flex-direction:column;gap:2px;min-width:0} .vd-rail-t b{font-size:var(--fs-sm);font-weight:600} .vd-rail-t small{font-size:var(--fs-xs);color:var(--fg-3);line-height:1.35}
.vd-rail li.atual .vd-rail-t small{color:var(--fg-2)}
.vd-rail-bar{height:6px;border-radius:var(--r-pill);background:var(--surface-2);overflow:hidden} .vd-rail-bar i{display:block;height:100%;border-radius:var(--r-pill);background:var(--ac);transition:width var(--dur-2) var(--ease)}
@media(max-width:899px){.vd-rail{padding:var(--space-4);gap:var(--space-3)}.vd-rail ol{flex-direction:row}.vd-rail li{flex:1 1 0;min-width:0;padding:var(--space-2);justify-content:center}.vd-rail-t small{display:none}.vd-rail li:not(.atual) .vd-rail-t{display:none}.vd-rail li.atual{flex:3 1 0}}
.vd-group{display:flex;flex-direction:column;border:1px solid var(--line-2);border-radius:var(--r-3);background:var(--bg);overflow:hidden}
.vd-group .field{display:grid;grid-template-columns:minmax(0,12rem) minmax(0,1fr);gap:var(--space-1) var(--space-5);align-items:center;margin:0;padding:var(--space-4) var(--space-5)}
.vd-group .field+.field{border-top:1px solid var(--line-2)}
.vd-group .field>label{grid-column:1;grid-row:1 / span 3}
.vd-group .field>*:not(label){grid-column:2}
.vd-group .field .input{min-height:44px;background:var(--surface);border:1px solid var(--line-2)}
@media(max-width:700px){.vd-group .field{grid-template-columns:minmax(0,1fr)}.vd-group .field>label{grid-row:auto;grid-column:1}.vd-group .field>*:not(label){grid-column:1}}
.vd-obpage .vd-steps{display:none}
.vd-obpage{max-width:78rem}
.vd-obpage .vd-ob1{grid-template-columns:minmax(0,1fr);gap:var(--space-5)}
.vd-obpage .vd-ob1-pv{display:flex;position:static;max-width:32rem}
@media(min-width:1380px){.vd-obpage .vd-ob1{grid-template-columns:minmax(0,1fr) 17rem}.vd-obpage .vd-ob1-pv{position:sticky;top:var(--space-6)}}
`;
  document.head.appendChild(st);

  /* ---------- peças compartilhadas ---------- */
  const CMP = [
    ['Equipe', (p) => (p.equipe == null ? 'Sem limite' : 'Até ' + p.equipe)],
    ['Eventos ativos', (p) => (p.eventos == null ? 'Sem limite' : 'Até ' + p.eventos)],
    ['Cor e logo', () => 'Incluídos'],
    ['Estilo dos títulos', (p) => (p.id === 'starter' ? 'Não' : 'Incluído')],
    ['Insights', (p) => (p.id === 'starter' ? 'Por evento' : 'Da carteira inteira')],
    ['Selo “com Albora”', (p) => (p.selo ? 'Discreto' : 'Oculto')],
    ['Atendimento', (p) => (p.id === 'agency' ? 'Prioritário' : 'Padrão')],
  ];
  const planoLista = (p, cta) => `<section class="vd-pl ${p.id === 'studio' ? 'dest' : ''}" aria-labelledby="pll-${p.id}">${p.id === 'studio' ? '<span class="mk">Mais escolhido</span>' : ''}<h3 id="pll-${p.id}">${p.nome}</h3><span class="pr">${A.brl(p.preco).replace(',00', '')}<small> /mês</small></span><p class="para">${p.para}</p><dl>${CMP.map(([l, f]) => `<dt>${l}</dt><dd>${f(p)}</dd>`).join('')}</dl>${cta(p)}</section>`;
  const planosHtml = (cta) => `<div class="vd-cmpl">${D.planos.map((p) => planoLista(p, cta)).join('')}</div><div class="table-wrap vd-cmpt"><table class="vd-cmp"><caption class="sr-only">Comparação dos planos</caption><thead><tr><td><span class="sr-only">Recurso</span></td>${D.planos.map((p) => `<th scope="col" class="${p.id === 'studio' ? 'dest' : ''}" id="pl-${p.id}">${p.id === 'studio' ? '<span class="mk">Mais escolhido</span>' : ''}<span class="pn">${p.nome}</span><span class="pr">${A.brl(p.preco).replace(',00', '')}<small> /mês</small></span><span class="para">${p.para}</span></th>`).join('')}</tr></thead><tbody>${CMP.map(([l, f]) => `<tr><th scope="row">${l}</th>${D.planos.map((p) => `<td>${f(p)}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><td></td>${D.planos.map((p) => `<td>${cta(p)}</td>`).join('')}</tr></tfoot></table></div>`;
  const brandStyle = (b) => `${A.theme.scope(b.cor, groundOf(b.tema))};${(A.data.estilos.find((e) => e.id === b.estilo) || {}).fonte === 'Instrument Sans' ? '--font-display:var(--font-body);' : ''}`;
  const logoHtml = (b) => `<span class="lg" aria-hidden="true">${b.logo ? `<img src="${esc(b.logo)}" alt="">` : esc(ini(b.nome || 'a'))}</span>`;
  const previewInner = (b, selo) => `<div class="pbar" aria-hidden="true">albora.app/f/${esc(b.slug || 'seu-portal')}</div><div class="top">${logoHtml(b)}<span>${esc(b.nome || 'Nome do seu portal')}</span></div><h3>As fotos da festa de quem estava lá.</h3><p class="t-small">${esc(b.descricao || 'Seus clientes veem o telão, o álbum e as missões com a sua marca.')}</p><div><span class="btn btn-accent btn-sm">Falar com a gente</span></div>${selo ? `<span class="vd-selo">${A.mark(14)} feito com Albora</span>` : ''}`;
  const panelInner = (b, selo) => `<div class="pr-brand">${logoHtml(b)}<b>${esc(b.nome || 'Nome do seu portal')}</b></div><ul><li class="on">Eventos</li><li>Clientes e equipe</li><li>Marca</li></ul>${selo ? `<span class="vd-selo">${A.mark(14)} feito com Albora</span>` : ''}`;
  const brandPreview = (b, selo) => `<div class="stack-3"><p class="t-label">Prévia ao vivo (não clicável)</p><div><p class="t-small vd-mb2">Portal público</p><div class="vd-prev" id="vd-prev" data-selo="${selo ? 1 : 0}" data-slug="${esc(b.slug || '')}" ${b.tema === 'escuro' ? 'data-theme="noite"' : ''} style="${brandStyle(b)}">${previewInner(b, selo)}</div></div><div><p class="t-small vd-mb2">Painel da sua equipe</p><div class="vd-prev vd-prev2" id="vd-prev2" style="${brandStyle(b)}">${panelInner(b, selo)}</div></div></div>`;
  const colorField = (cor, tema) => `<div class="field"><span class="lbl" id="vd-cor-l">Cor de destaque</span><div class="chips" role="group" aria-labelledby="vd-cor-l">${C.map(([n, c]) => `<button type="button" class="chip" data-act="vd-cor" data-v="${c}" aria-pressed="${c.toLowerCase() === String(cor).toLowerCase()}" aria-label="${esc(n)}"><i class="vd-sw" style="background:${c}"></i>${esc(n.split(' & ')[0])}</button>`).join('')}</div><label class="vd-cor"><input type="color" name="cor" value="${esc(cor)}" data-input="vd-brand" aria-label="Escolher outra cor"> <span class="t-small">Ou escolha outra cor</span> <code class="t-mono" data-hex>${esc(cor)}</code></label><p class="hint" data-contraste aria-live="polite">${esc(brandCheck(cor, tema).msg)}</p></div>`;
  const temaField = (tema) => `<div class="field"><span class="lbl" id="vd-tema-l">Fundo do portal</span><div class="flex" role="radiogroup" aria-labelledby="vd-tema-l">${[['claro', 'Claro'], ['escuro', 'Escuro']].map(([v, l]) => `<label class="check"><input type="radio" name="tema" value="${v}" ${tema === v ? 'checked' : ''} data-change="vd-brand"><span>${l}</span></label>`).join('')}</div></div>`;
  const estiloField = (estilo) => A.field({ name: 'estilo', label: 'Estilo dos títulos', value: estilo, options: A.data.estilos.map((e) => [e.id, `${e.nome} · ${e.desc}`]), extra: 'data-change="vd-brand"' });
  const logoField = (logo) => `<div class="field"><span class="lbl" id="vd-logo-l">Logo</span><input type="hidden" name="logo" value="${esc(logo || '')}"><div class="vd-lh"><span class="avatar lg" id="vd-logo-prev" aria-hidden="true">${logo ? `<img src="${esc(logo)}" alt="" style="width:100%;height:100%;object-fit:contain">` : ic('image', 22)}</span><label class="btn btn-line btn-sm">${ic('upload', 16)} Enviar logo<input type="file" accept="image/png,image/jpeg,image/svg+xml" data-change="vd-logo" class="sr-only" aria-labelledby="vd-logo-l"></label><button type="button" class="btn btn-quiet btn-sm" data-act="vd-logo-x" ${logo ? '' : 'hidden'} id="vd-logo-x">Remover logo</button></div><span class="hint">PNG, JPG ou SVG, até 300 KB. Sem logo, usamos as iniciais do nome.</span><span class="err" id="vd-logo-e" role="alert"></span></div>`;
  const formVals = (form) => { const o = {}; A.$$('input,select,textarea', form).forEach((el) => { if (!el.name) return; if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o; };
  const paint = (form) => {
    const v = formVals(form); const pv = $('#vd-prev'); const cor = v.cor || C[0][1]; const tema = v.tema || 'claro';
    if (pv) { const b = { nome: v.nome || '', cor, tema, estilo: v.estilo || 'editorial', logo: v.logo || '', descricao: v.descricao || '', slug: pv.dataset.slug }; pv.setAttribute('style', brandStyle(b)); if (tema === 'escuro') pv.setAttribute('data-theme', 'noite'); else pv.removeAttribute('data-theme'); pv.innerHTML = previewInner(b, pv.dataset.selo === '1'); const p2 = $('#vd-prev2'); if (p2) { p2.setAttribute('style', brandStyle(b)); p2.innerHTML = panelInner(b, pv.dataset.selo === '1'); } }
    const c = brandCheck(cor, tema); const t = $('[data-contraste]', form); if (t) { t.textContent = c.msg; t.style.color = c.ok ? '' : 'var(--crit-text)'; }
    const hx = $('[data-hex]', form); if (hx) hx.textContent = cor;
    A.$$('[data-act=vd-cor]', form).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v.toLowerCase() === cor.toLowerCase())));
    return c;
  };
  A.inputs['vd-brand'] = (el) => { const f = el.closest('form'); if (!f.dataset.draft) A.dirty = 'As mudanças da Marca ainda não foram salvas.'; paint(f); if (f.dataset.draft) A.inputs['vd-draft'](el); };
  A.acts['vd-cor'] = (el) => { const f = el.closest('form'); if (!f.dataset.draft) A.dirty = 'As mudanças da Marca ainda não foram salvas.'; $('input[name=cor]', f).value = el.dataset.v; paint(f); if (f.dataset.draft) A.inputs['vd-draft'](el); };
  A.inputs['vd-logo'] = (el) => {
    const f = el.closest('form'); const file = el.files && el.files[0]; const e = $('#vd-logo-e', f); if (!file) return;
    if (file.size > 300 * 1024) { e.textContent = `Esse arquivo tem ${Math.round(file.size / 1024)} KB e o limite é 300 KB. Reduza a imagem e envie de novo.`; e.style.display = 'block'; el.value = ''; return; }
    e.textContent = ''; const r = new FileReader(); r.onload = () => { $('input[name=logo]', f).value = r.result; $('#vd-logo-prev').innerHTML = `<img src="${esc(r.result)}" alt="" style="width:100%;height:100%;object-fit:contain">`; $('#vd-logo-x', f).hidden = false; paint(f); if (f.dataset.draft) A.inputs['vd-draft'](el); }; r.readAsDataURL(file);
  };
  A.acts['vd-logo-x'] = (el) => { const f = el.closest('form'); $('input[name=logo]', f).value = ''; $('#vd-logo-prev').innerHTML = ic('image', 22); el.hidden = true; paint(f); if (f.dataset.draft) A.inputs['vd-draft'](el); };

  /* ---------- shell do fornecedor ---------- */
  const shell = (ctx, { section, title, lead, actions = '', crumbs = [] }, content) => {
    const v = ven(ctx.params.vid); A.applyEvent(null); const b = '#/f/' + v.id; const p = plano(v.plano);
    const items = [{ id: 'eventos', label: 'Eventos', icon: 'calendar', href: b + '/eventos' }, { id: 'equipe', label: 'Clientes e equipe', icon: 'users', href: b + '/equipe' }, { id: 'marca', label: 'Marca', icon: 'brush', href: b + '/marca' }, { id: 'cobranca', label: 'Cobrança', icon: 'wallet', href: b + '/cobranca' }, { id: 'insights', label: 'Insights', icon: 'chart', href: b + '/insights' }];
    const ctxBtn = `<button class="ctx" data-act="vd-switch" aria-haspopup="menu"><span class="grow"><b class="t-h" style="display:block">Plano ${esc(p.nome)}</b><span class="t-small">${papel() === 'admin' ? 'Administrador' : 'Equipe'} · trocar de portal</span></span>${ic('chevdown', 16)}</button>`;
    const foot = `<a href="${b}/ajustes" ${section === 'ajustes' ? 'aria-current="page"' : ''}>${ic('settings', 20)}<span class="l">Ajustes do portal</span></a><a href="#/f/v/${esc(v.slug)}">${ic('globe', 20)}<span class="l">Ver portal público</span></a>${p.selo ? `<a class="vd-feito" href="#/p/fornecedores" aria-label="Feito com Albora">${A.mark(18)}<span class="l">feito com Albora</span></a>` : ''}`;
    const top = `<div class="grow"><span class="t-h only-sm">${esc(v.nome)}</span><span class="t-small hide-sm">albora.app/f/${esc(v.slug)}${v.publicado ? '' : ' · não publicado'}</span></div><button class="btn btn-quiet btn-sm" data-act="palette" aria-label="Buscar (Ctrl K)">${ic('search', 18)}<span class="hide-sm">Buscar</span><span class="kbd hide-sm">⌘K</span></button><a class="btn btn-quiet btn-sm" href="#/f/v/${esc(v.slug)}">${ic('globe', 18)}<span class="hide-sm">Portal público</span></a><button class="avatar acct" data-act="vd-account" aria-haspopup="menu" aria-label="Conta de ${esc(eu(v.id).nome)}" title="Conta">${esc(ini(eu(v.id).nome))}</button>`;
    const head = title ? A.pageHead({ crumbs, title, lead, actions }) : '';
    let html = A.layout({ brand: v.nome, mark: ini(v.nome), ctx: ctxBtn, groups: [{ items }], active: section, foot, top, tabs: items.map((i) => ({ ...i, label: i.id === 'equipe' ? 'Equipe' : i.label })), navLabel: 'Portal do fornecedor' }, head + content);
    if (v.logo) html = html.replace(/<span class="brand-mark"[^>]*>[^<]*<\/span>/, () => `<span class="brand-mark" aria-hidden="true"><img src="${esc(v.logo)}" alt=""></span>`);
    return { title: title, html: `<div class="vd-portal" style="${A.theme.scope(v.cor, hostGround())}">${html}</div>` };
  };
  const eu = (vid) => (V().equipe[vid] || []).find((m) => m.voce) || { nome: 'Você', email: 'voce@email.com' };
  A.acts['vd-account'] = (el) => { const vid = curVid(); const v = ven(vid); if (!v) return; const m = eu(vid); A.menu(el, [{ head: `${m.nome} · ${m.email}` }, { label: 'Ajustes do portal', icon: 'settings', href: `#/f/${vid}/ajustes` }, { label: 'Ver portal público', icon: 'globe', href: `#/f/v/${v.slug}` }, { label: 'Tema: ' + ({ light: 'claro', dark: 'escuro', system: 'sistema' }[A.sim().theme]), icon: 'moon', onClick: () => A.setSim('theme', { light: 'dark', dark: 'system', system: 'light' }[A.sim().theme]) }, { sep: 1 }, { label: 'Sair', icon: 'logout', onClick: vdSair }]); };
  const vdSair = async () => { if (A.dirty || settingsDrafts.size) { const ok = await A.confirm({ title: 'Sair sem salvar?', body: A.dirty || 'Os ajustes ainda não salvos serão descartados.', confirm: 'Sair mesmo assim', cancel: 'Continuar editando', danger: true }); if (!ok) return; A.dirty = null; } settingsDrafts.clear(); location.hash = '#/p/fornecedores'; A.toast('Você saiu do portal.'); };
  window.addEventListener('hashchange', () => { if (!/#\/f\/[^/]+\/marca/.test(location.hash)) A.dirty = null; });
  const naoExiste = (txt = 'Esse portal não existe ou foi removido.') => ({ title: 'Portal não encontrado', html: `<main class="page narrow" id="main" tabindex="-1"><div class="empty" role="alert">${ic('building', 40)}<h1 class="t-title">Portal não encontrado</h1><p>${esc(txt)} Confira o endereço ou crie um portal novo.</p><div class="flex flex-wrap center"><a class="btn btn-primary" href="#/f/novo">Criar meu portal</a><a class="btn btn-line" href="#/p/fornecedores">Conhecer o programa</a></div></div></main>` });
  const route = (pat, fn) => A.route(pat, (ctx) => { if (ctx.params.vid && !ven(ctx.params.vid)) return naoExiste(); return fn(ctx, ven(ctx.params.vid)); });
  const negado = (ctx, v, section, title, oque) => shell(ctx, { section, title }, `<div class="empty" role="status">${ic('lock', 40)}<h2 class="t-title">Só administradores ${oque}</h2><p>Você está como Equipe neste portal. Peça a ${esc(adminDe(v.id))} ou troque o papel em "Protótipo".</p><a class="btn btn-line" href="#/f/${v.id}/eventos">Voltar aos eventos</a></div>`);
  A.acts['vd-switch'] = (el) => { const s = V(); const cur = (location.hash.match(/#\/f\/([^/?]+)/) || [])[1]; A.menu(el, [{ head: 'Seus portais' }, ...s.list.filter((v) => !s.removidos.includes(v.id)).map((v) => ({ label: v.nome, icon: 'building', href: `#/f/${v.id}/eventos`, active: v.id === cur, hint: plano(v.plano).nome })), { sep: 1 }, { label: 'Criar outro portal', icon: 'plus', href: '#/f/novo' }]); };

  /* ---------- /f e /f/novo (onboarding com rascunho) ---------- */
  A.route('/f', () => { const s = V(); const v = s.list.find((x) => !s.removidos.includes(x.id)); A.later(0, () => A.go(v ? `#/f/${v.id}/eventos` : '#/f/novo')); return ''; });
  let rascunhoVisto = false;
  const RESERVADOS = ['albora', 'admin', 'api', 'app', 'suporte', 'f', 'novo'];
  const draftGet = () => A.store.get('vendorRascunho', null);
  const draftSet = (fn) => { const d = draftGet() || { passo: 1, nome: '', slug: '', slugEditado: false, cor: C[0][1], tema: 'claro', estilo: 'editorial', logo: '', plano: 'studio' }; fn(d); d.salvo = hm(); A.store.set('vendorRascunho', d); return d; };
  A.inputs['vd-draft'] = (el) => {
    const f = el.closest('form'); const vals = formVals(f);
    if (el.name === 'nome') { const d = draftGet(); if (!d || !d.slugEditado) { const sl = slugify(vals.nome); const si = $('input[name=slug]', f); if (si) { si.value = sl; vals.slug = sl; } } }
    if (el.name === 'slug') vals.slugEditado = vals.slug !== slugify(vals.nome || (draftGet() || {}).nome || '');
    draftSet((d) => Object.assign(d, vals));
    const u = $('[data-slug-url]', f); if (u) u.textContent = 'albora.app/f/' + (vals.slug || '…');
    const pu = $('[data-pv-url]'); if (pu) pu.textContent = 'albora.app/f/' + (vals.slug || 'seu-portal'); const pn = $('[data-pv-nome]'); if (pn) pn.textContent = vals.nome || 'Seu negócio'; const pi = $('[data-pv-ini]'); if (pi) pi.textContent = ini(vals.nome || 'Seu Portal');
    const s = $('#vd-saved'); if (s) s.textContent = 'Rascunho salvo às ' + hm();
  };
  const OBS = [['Sua operação', 'Nome do negócio e endereço do portal'], ['Sua identidade', 'Cor, fundo, logo e estilo'], ['Seu plano', 'Escolha agora, pague depois']];
  const obSteps = (n) => `<nav class="vd-rail" aria-label="Etapas do cadastro"><p class="vd-rail-h"><b>Criar seu portal</b><span>Etapa ${n} de 3</span></p><ol>${OBS.map(([t, d], i) => `<li class="${i + 1 < n ? 'feito' : i + 1 === n ? 'atual' : ''}" ${i + 1 === n ? 'aria-current="step"' : ''}><span class="vd-rail-i" aria-hidden="true">${i + 1 < n ? ic('check', 14) : i + 1}</span><span class="vd-rail-t"><b>${t}</b><small>${d}</small></span></li>`).join('')}</ol><div class="vd-rail-bar" aria-hidden="true"><i style="width:${Math.round(n / 3 * 100)}%"></i></div></nav>`;
  const obTop = `<div class="flex between vd-gap-b"><a class="vd-brand" href="#/p/fornecedores" aria-label="Albora, página para fornecedores">${A.logo(26)}</a><a class="btn btn-quiet btn-sm" href="#/p/fornecedores">Sair e voltar depois</a></div>`;
  A.route('/f/novo', (ctx) => {
    A.applyEvent(null); const sim = A.sim().state;
    if (ctx.q.pronto) {
      const v = ven(ctx.q.pronto); if (!v) return naoExiste();
      return { title: 'Portal criado', html: `<main class="page narrow" id="main" tabindex="-1">${obTop}<div class="stack-5"><span class="vd-mono" aria-hidden="true" style="${A.theme.scope(v.cor, hostGround())}">${v.logo ? `<img src="${esc(v.logo)}" alt="">` : esc(ini(v.nome))}</span><h1 class="t-display">${esc(v.nome)} está no ar</h1><p class="t-lead">O portal ficou em <b>albora.app/f/${esc(v.slug)}</b>. Falta só escolher como pagar o plano ${plano(v.plano).nome}; você pode fazer isso depois.</p><div class="stack-3"><a class="btn btn-accent btn-lg" href="#/h/novo/1?vendor=${v.id}">${ic('plus', 18)} Criar o primeiro evento de um cliente</a><a class="btn btn-line" href="#/f/${v.id}/checkout?plano=${v.plano}">Assinar o plano ${plano(v.plano).nome}</a><a class="btn btn-quiet" href="#/f/${v.id}/eventos">Ver o painel do portal</a></div></div></main>` };
    }
    if (ctx.q.plano && D.planos.some((p) => p.id === ctx.q.plano)) draftSet((d) => { d.plano = ctx.q.plano; });
    let d = draftGet(); const temDados = d && (d.nome || d.passo > 1);
    if (temDados && !rascunhoVisto) {
      return { title: 'Continuar o rascunho', html: `<main class="page narrow" id="main" tabindex="-1">${obTop}<div class="stack-5"><h1 class="t-display">Você tem um rascunho</h1><p class="t-lead">Portal “${esc(d.nome || 'sem nome ainda')}”, parado na etapa ${d.passo} de 3${d.salvo ? ` (salvo às ${esc(d.salvo)})` : ''}. Nada foi criado ainda.</p><div class="stack-3"><button class="btn btn-primary btn-lg" data-act="vd-rascunho-continuar">Continuar de onde parei</button><button class="btn btn-quiet" data-act="vd-rascunho-zerar">Descartar e começar do zero</button></div></div></main>` };
    }
    d = d || draftSet((x) => { x.passo = 1; });
    rascunhoVisto = true; const n = d.passo; let body;
    if (sim === 'loading') body = A.skel(3, 64);
    else if (n === 1) body = `<div class="vd-ob1"><form class="stack-5" data-submit="vd-ob" data-draft="1" novalidate><div><h1 class="t-display">Sua operação</h1><p class="t-lead">Como seus clientes vão ver o seu portal.</p></div><div class="vd-group">${A.field({ name: 'nome', label: 'Nome do seu negócio', value: d.nome, required: true, placeholder: 'Aurora Cerimonial', extra: 'maxlength="120" autocomplete="organization" data-input="vd-draft"' })}${A.field({ name: 'slug', label: 'Endereço do portal', value: d.slug, required: true, placeholder: 'aurora-cerimonial', hint: 'Letras minúsculas, números e hífen.', extra: 'maxlength="80" autocomplete="off" spellcheck="false" data-input="vd-draft"' })}</div><p class="vd-urlchip" aria-live="polite">${ic('globe', 16)}<span>Seu portal ficará em <b data-slug-url>albora.app/f/${esc(d.slug || '…')}</b></span></p><div class="flex between"><span class="t-small" id="vd-saved" role="status">${d.salvo ? 'Rascunho salvo às ' + esc(d.salvo) : 'O rascunho é salvo enquanto você digita'}</span><button class="btn btn-primary" type="submit">Continuar</button></div></form><aside class="vd-ob1-pv" aria-hidden="true"><div class="vd-bw"><div class="vd-bw-bar"><i></i><i></i><i></i><span data-pv-url>albora.app/f/${esc(d.slug || 'seu-portal')}</span></div><div class="vd-bw-body"><span class="vd-bw-logo" data-pv-ini>${esc(ini(d.nome || 'Seu Portal'))}</span><b class="vd-bw-n" data-pv-nome>${esc(d.nome || 'Seu negócio')}</b><span class="t-small">Portal de fotos dos seus eventos</span><div class="vd-bw-g">${[0, 1, 2, 3, 4, 5].map((i) => `<span>${A.img('forn-' + (i % 4), 'p', '')}</span>`).join('')}</div></div></div><p class="t-small">Assim seus clientes vão ver o portal. Você ajusta cores e logo no próximo passo.</p></aside></div>`;
    else if (n === 2) body = `<form class="stack-5" data-submit="vd-ob" data-draft="1" novalidate><div><h1 class="t-display">Sua identidade</h1><p class="t-lead">Cor, fundo e logo. A prévia muda enquanto você escolhe.</p></div><div class="split"><div class="stack-5"><section class="vd-card"><h2 class="vd-card-h">Cores</h2>${colorField(d.cor, d.tema)}${temaField(d.tema)}</section><section class="vd-card"><h2 class="vd-card-h">Estilo e logo</h2>${estiloField(d.estilo)}${logoField(d.logo)}</section><input type="hidden" name="nome" value="${esc(d.nome)}"></div><div class="aside">${brandPreview(d, plano(d.plano).selo)}</div></div><div class="flex between"><button class="btn btn-quiet" type="button" data-act="vd-ob-voltar">Voltar</button><span class="t-small" id="vd-saved" role="status">${d.salvo ? 'Rascunho salvo às ' + esc(d.salvo) : ''}</span><button class="btn btn-primary" type="submit">Continuar</button></div></form>`;
    else body = `<form class="stack-5" data-submit="vd-ob" data-draft="1" novalidate><div><h1 class="t-display">Seu plano</h1><p class="t-lead">Você escolhe agora e paga depois, no checkout. Dá para mudar quando quiser.</p></div>${planosHtml((p) => `<label class="check"><input type="radio" name="plano" value="${p.id}" ${d.plano === p.id ? 'checked' : ''} data-change="vd-draft"><span>Escolher ${p.nome}</span></label>`)}<div class="banner">${ic('info', 18)}<span>Ao criar, o portal <b>${esc(d.nome)}</b> fica em <b>albora.app/f/${esc(d.slug)}</b>. Só então o cadastro é feito; até aqui, é um rascunho.</span></div><div class="flex between"><button class="btn btn-quiet" type="button" data-act="vd-ob-voltar">Voltar</button><button class="btn btn-accent btn-lg" type="submit">Criar meu portal</button></div></form>`;
    return { title: 'Criar portal · etapa ' + n, html: `<main class="page vd-obpage" id="main" tabindex="-1">${obTop}<div class="vd-ob">${obSteps(n)}<div class="vd-ob-c">${body}</div></div></main>`, after: () => { const f = $('form[data-draft]'); if (f && n === 2) paint(f); } };
  });
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/f/novo')) rascunhoVisto = false; });
  A.acts['vd-rascunho-continuar'] = () => { rascunhoVisto = true; A.render(); };
  A.acts['vd-rascunho-zerar'] = async () => { const ok = await A.confirm({ title: 'Descartar o rascunho?', body: '<p>O que você preencheu nas etapas será apagado. Nenhum portal foi criado, então nada mais é afetado.</p>', confirm: 'Descartar', danger: true }); if (!ok) return; A.store.set('vendorRascunho', null); rascunhoVisto = true; A.render(); };
  A.acts['vd-ob-voltar'] = () => { draftSet((d) => { d.passo = Math.max(1, d.passo - 1); }); A.render(); };
  A.acts['vd-ob'] = (form) => {
    const d = draftGet(); const n = d.passo;
    if (n === 1) {
      const v = A.validate(form, { nome: A.rules.min(2, 'O nome precisa ter pelo menos 2 letras.'), slug: (x) => (/^[a-z0-9-]{1,80}$/.test(x) ? (RESERVADOS.includes(x) ? 'Esse endereço é reservado. Escolha outro.' : '') : 'Use só letras minúsculas sem acento, números e hífen. Exemplo: aurora-cerimonial') });
      if (!v) return; const btn = $('button[type=submit]', form);
      A.busy(btn, 600, () => {
        const usado = V().list.some((x) => x.slug === v.slug);
        if (usado) { const f = $('input[name=slug]', form).closest('.field'); f.classList.add('has-error'); $('.err', f).textContent = `O endereço "${v.slug}" já está em uso. Tente "${v.slug}-2".`; $('input[name=slug]', form).focus(); return; }
        draftSet((x) => { x.nome = v.nome; x.slug = v.slug; x.passo = 2; }); A.render();
      });
    } else if (n === 2) {
      const v = formVals(form); const c = brandCheck(v.cor, v.tema);
      if (!c.ok) { const t = $('[data-contraste]', form); t.style.color = 'var(--crit-text)'; t.textContent = c.msg; $('input[name=cor]', form).focus(); return; }
      draftSet((x) => { Object.assign(x, { cor: v.cor, tema: v.tema, estilo: v.estilo, logo: v.logo, passo: 3 }); }); A.render();
    } else {
      const btn = $('button[type=submit]', form);
      A.busy(btn, 900, () => {
        if (A.sim().state === 'error') { A.toast('Não deu para criar agora. Seu rascunho está salvo; tente de novo em instantes.', { kind: 'bad' }); return; }
        const dd = draftGet(); const id = 'v' + A.uid();
        put((s) => { s.list.push({ id, slug: dd.slug, nome: dd.nome, cidade: '', cor: dd.cor, tema: dd.tema, estilo: dd.estilo, logo: dd.logo, descricao: '', email: '', whatsapp: '', publicado: false, plano: dd.plano }); s.clientes[id] = []; s.eventos[id] = []; s.equipe[id] = [{ id: 'm' + A.uid(), nome: 'Você', email: 'voce@email.com', papel: 'admin', voce: true }]; s.convites[id] = []; s.faturas[id] = []; s.pacotes[id] = []; s.assinatura[id] = { status: 'none', forma: 'pix', proxima: '', mudanca: null, cancelando: false }; });
        A.store.set('vendorRascunho', null); rascunhoVisto = false; A.go('#/f/novo?pronto=' + id);
      });
    }
  };

  /* ---------- /f/:vid/eventos ---------- */
  const FE = { vid: '', q: '', fase: 'todos', cliente: '', ord: 'data', dir: 1 };
  const filtrados = (vid) => {
    const s = V(); const q = FE.q.trim().toLowerCase();
    const cl = (id) => (s.clientes[vid].find((c) => c.id === id) || { nome: '' }).nome;
    let l = (s.eventos[vid] || []).filter((e) => (FE.fase === 'todos' || faseOf(e) === FE.fase) && (!FE.cliente || e.cliente === FE.cliente) && (!q || (e.nome + ' ' + cl(e.cliente)).toLowerCase().includes(q)));
    const dd = (e) => (e.ref ? { antes: 18, durante: 0, depois: -9 }[faseOf(e)] : e.dias); const ok = (e) => { const d = dd(e); return d >= 0 ? d : 1000 - d; };
    const cmp = { nome: (a, b) => a.nome.localeCompare(b.nome), cliente: (a, b) => cl(a.cliente).localeCompare(cl(b.cliente)) || a.nome.localeCompare(b.nome), convidados: (a, b) => a.esperados - b.esperados, fotos: (a, b) => a.fotos - b.fotos, data: (a, b) => ok(a) - ok(b) }[FE.ord] || ((a, b) => ok(a) - ok(b));
    l = l.slice().sort((a, b) => cmp(a, b) * FE.dir);
    return { l, cl };
  };
  const listaEventos = (vid) => {
    const { l, cl } = filtrados(vid);
    if (!l.length) return `<div class="empty">${ic('search', 40)}<h3 class="t-title">Nenhum evento com esses filtros</h3><p>Tente outra busca ou veja todos os eventos.</p><button class="btn btn-line" data-act="vd-limpar">Limpar filtros</button></div>`;
    const th = (k, label, cls = '') => { const on = FE.ord === k; return `<th scope="col" class="${cls}" aria-sort="${on ? (FE.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-act="vd-ord" data-k="${k}">${label}${on ? ic('chevdown', 12, 'd' + (FE.dir > 0 ? ' up' : '')) : ''}</button></th>`; };
    return `<p class="t-small" role="status" aria-live="polite">${l.length} ${l.length === 1 ? 'evento' : 'eventos'}</p><div class="table-wrap"><table class="table vd-ev"><caption class="sr-only">Eventos dos clientes. Use os títulos das colunas para ordenar.</caption><thead><tr>${th('nome', 'Evento')}${th('cliente', 'Cliente', 'vd-hs')}${th('data', 'Data', 'vd-hs')}<th scope="col">Situação</th>${th('convidados', 'Convidados', 'num vd-hs')}${th('fotos', 'Fotos', 'num vd-hs')}</tr></thead><tbody>${l.map((e) => {
      const f = faseOf(e); const fl = FASE[f][0];
      const nome = e.ref ? `<a class="vd-nm" href="${A.hostBase(e.ref)}/hoje">${esc(e.nome)}</a>` : `<button class="vd-nm" data-act="vd-evt" data-id="${e.id}">${esc(e.nome)}</button>`;
      const hev = e.ref ? A.data.events.find((x) => x.id === e.ref) : null; const th0 = `<span class="vd-th" aria-hidden="true">${hev && hev.capa ? `<img src="${esc(hev.capa)}" alt="" style="${A.hero ? A.hero.fotoStyle(hev.id) : ''}">` : esc(ini(e.nome))}</span>`;
      return `<tr><td><span class="vd-ec">${th0}<span class="vd-en">${nome}<span class="t-small sub">${esc(tipoNome(e.tipo))}<span class="vd-sm"> · ${esc(cl(e.cliente) || 'Sem cliente')} · ${esc(dataOf(e))}</span></span></span></span></td><td class="vd-hs">${esc(cl(e.cliente) || 'Sem cliente')}</td><td class="vd-hs">${esc(dataOf(e))}</td><td><span class="vd-fase" data-f="${f}"><i aria-hidden="true"></i>${fl}</span></td><td class="num vd-hs">${A.pt(e.esperados)}</td><td class="num vd-hs">${e.fotos ? A.pt(e.fotos) : '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  };
  const refreshEv = () => { const el = $('#vd-lista'); if (el) el.innerHTML = listaEventos(FE.vid); A.$$('[data-act=vd-fase]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === FE.fase))); const so = $('#vd-ord-sm'); if (so) so.value = FE.ord; };
  A.acts['vd-ord'] = (el) => { const k = el.dataset.k; if (FE.ord === k) FE.dir = -FE.dir; else { FE.ord = k; FE.dir = (k === 'convidados' || k === 'fotos') ? -1 : 1; } refreshEv(); const b = $(`[data-act=vd-ord][data-k=${k}]`); if (b) b.focus(); };
  A.inputs['vd-busca'] = (el) => { FE.q = el.value; refreshEv(); };
  A.inputs['vd-filtro'] = (el) => { FE[el.dataset.k] = el.value; if (el.dataset.k === 'ord') FE.dir = (el.value === 'convidados' || el.value === 'fotos') ? -1 : 1; refreshEv(); };
  A.acts['vd-fase'] = (el) => { FE.fase = el.dataset.v; refreshEv(); };
  A.acts['vd-limpar'] = () => { Object.assign(FE, { q: '', fase: 'todos', cliente: '', ord: 'data', dir: 1 }); A.render(); };
  A.acts['vd-evt'] = (el) => {
    const vid = FE.vid; const e = (V().eventos[vid] || []).find((x) => x.id === el.dataset.id); if (!e) return; const c = V().clientes[vid].find((x) => x.id === e.cliente); const f = faseOf(e);
    A.modal({ title: e.nome, body: `<dl class="vd-kv"><dt>Cliente</dt><dd>${esc(c ? c.nome : 'Sem cliente')}</dd><dt>Tipo</dt><dd>${esc(tipoNome(e.tipo))}</dd><dt>Data</dt><dd>${esc(dataOf(e))}</dd><dt>Situação</dt><dd>${FASE[f][0]}</dd><dt>Convidados esperados</dt><dd>${A.pt(e.esperados)}</dd><dt>Fotos até agora</dt><dd>${A.pt(e.fotos)}</dd></dl><p class="t-small vd-gap-t">Neste protótipo só os três primeiros eventos têm painel. O botão abre o evento de exemplo.</p>`, actions: [{ label: 'Fechar', variant: 'btn-quiet' }, { label: 'Abrir o painel do evento de exemplo', variant: 'btn-primary', onClick: () => { A.go(A.hostBase('e1') + '/hoje'); } }] });
  };
  const bannerLimite = (v) => { const p = plano(v.plano), a = ativos(v.id); if (p.eventos == null) return `<p class="vd-uso">${a} eventos ativos · plano ${p.nome}, sem limite</p>`; return `<div class="vd-uso">${A.arc(Math.min(1, a / p.eventos), 84, `${a} de ${p.eventos} eventos ativos`)}<span>${a} de ${p.eventos} eventos ativos no plano ${p.nome}</span></div>`; };
  route('/f/:vid/eventos', (ctx, v) => {
    if (FE.vid !== v.id) Object.assign(FE, { vid: v.id, q: '', fase: 'todos', cliente: '', ord: 'data', dir: 1 });
    if (ctx.q.cliente) FE.cliente = ctx.q.cliente;
    const s = V(); const sb = sub(v.id); const todos = s.eventos[v.id] || [];
    const cont = (f) => todos.filter((e) => f === 'todos' || faseOf(e) === f).length;
    const aviso = sb.status === 'overdue' ? `<div class="banner bad" role="alert">${ic('warn', 18)}<span class="grow">A mensalidade de ${fmtD(sb.proxima)} está atrasada. Regularize para o portal continuar publicado.</span><a class="btn btn-sm btn-line" href="#/f/${v.id}/checkout">Regularizar</a></div>` : sb.status === 'none' ? `<div class="banner warn">${ic('info', 18)}<span class="grow">Você ainda não assinou um plano. O portal só é publicado depois da assinatura.</span><a class="btn btn-sm btn-line" href="#/f/${v.id}/checkout?plano=${v.plano}">Assinar</a></div>` : '';
    const kp = (l, n, sub) => `<div class="vd-kpi"><span class="vd-kpi-l">${l}</span><b class="vd-kpi-n">${n}</b><span class="vd-kpi-s">${sub}</span></div>`;
    const pl = plano(v.plano), nAt = ativos(v.id), somaF = todos.reduce((a, e) => a + e.fotos, 0), somaC = todos.reduce((a, e) => a + (e.esperados || 0), 0);
    const kpis = `<div class="vd-kpis">${kp('Eventos ativos', nAt, pl.eventos == null ? 'sem limite no plano ' + pl.nome : 'de ' + pl.eventos + ' no plano ' + pl.nome)}${kp('Ao vivo', cont('durante'), cont('durante') ? 'acontecendo agora' : 'nenhum agora')}${kp('Fotos recebidas', A.pt(somaF), 'em ' + todos.length + ' eventos')}${kp('Convidados esperados', A.pt(somaC), 'somando a carteira')}</div>`;
    const ok = () => `${aviso}${bannerLimite(v)}${kpis}<div class="vd-tools"><label class="search">${ic('search', 18)}<input type="search" placeholder="Buscar evento ou cliente" aria-label="Buscar evento ou cliente" value="${esc(FE.q)}" data-input="vd-busca"></label><select class="select" aria-label="Filtrar por cliente" data-change="vd-filtro" data-k="cliente"><option value="">Todos os clientes</option>${s.clientes[v.id].map((c) => `<option value="${c.id}" ${FE.cliente === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select><select class="select vd-sort-sm" id="vd-ord-sm" aria-label="Ordenar por" data-change="vd-filtro" data-k="ord">${[['data', 'Data'], ['nome', 'Nome'], ['cliente', 'Cliente'], ['convidados', 'Convidados'], ['fotos', 'Fotos']].map(([k, l]) => `<option value="${k}" ${FE.ord === k ? 'selected' : ''}>Ordenar: ${l}</option>`).join('')}</select></div><div class="vd-fases" role="group" aria-label="Situação">${[['todos', 'Todos'], ['antes', 'Preparando'], ['durante', 'Ao vivo'], ['depois', 'Encerrados']].map(([k, l]) => `<button data-act="vd-fase" data-v="${k}" aria-pressed="${FE.fase === k}">${l}<span class="n">${cont(k)}</span></button>`).join('')}</div><div id="vd-lista">${listaEventos(v.id)}</div>`;
    const empty = A.emptyState({ art: 'none', icon: 'calendar', title: 'Seus clientes ainda não têm eventos aqui', body: 'Crie o primeiro e mande o link para o cliente acompanhar.', cta: '<button class="btn btn-accent" data-act="vd-novo-evento">Criar evento para um cliente</button>' });
    return shell(ctx, { section: 'eventos', title: 'Eventos', lead: 'Os eventos dos seus clientes, num lugar só.', actions: '<button class="btn btn-accent" data-act="vd-novo-evento">' + ic('plus', 18) + ' Criar evento para um cliente</button>' }, A.stateful({ ok, empty, isEmpty: () => !todos.length }));
  });
  A.acts['vd-novo-evento'] = () => {
    const vid = (location.hash.match(/#\/f\/([^/?]+)/) || [])[1]; const v = ven(vid); if (!v) return; const p = plano(v.plano); const s = V();
    if (p.eventos != null && ativos(vid) >= p.eventos) {
      return A.modal({ title: 'Você chegou ao limite do plano', body: `<p>O plano ${p.nome} permite ${p.eventos} eventos ativos e você tem ${ativos(vid)}. Encerre um evento ou mude de plano para criar mais.</p>`, actions: [{ label: 'Agora não', variant: 'btn-quiet' }, { label: 'Ver planos', variant: 'btn-primary', onClick: () => { A.go(`#/f/${vid}/cobranca`); } }] });
    }
    const body = `<form class="stack" novalidate>${A.field({ name: 'cliente', label: 'Para qual cliente?', value: FE.cliente || '', required: true, options: [['', 'Escolha um cliente'], ...s.clientes[vid].map((c) => [c.id, c.nome]), ['__novo', 'Novo cliente…']] })}<div id="vd-novo-cli" hidden>${A.field({ name: 'novoNome', label: 'Nome do novo cliente', placeholder: 'Ex.: Família Souza' })}</div><p class="t-small">O evento nasce no seu portal e entra na sua cota de ${p.eventos == null ? 'eventos' : p.eventos + ' eventos ativos'}.</p></form>`;
    const m = A.modal({ title: 'Criar evento para um cliente', body, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Continuar', variant: 'btn-primary', onClick: (api) => {
      const f = $('form', api.el); const sel = $('select[name=cliente]', f).value;
      if (!sel) { const fd = $('select[name=cliente]', f).closest('.field'); fd.classList.add('has-error'); $('.err', fd).textContent = 'Escolha um cliente ou crie um novo.'; $('select[name=cliente]', f).focus(); return false; }
      let id = sel; if (sel === '__novo') { const nm = $('input[name=novoNome]', f).value.trim(); if (nm.length < 2) { const fd = $('input[name=novoNome]', f).closest('.field'); fd.classList.add('has-error'); $('.err', fd).textContent = 'Digite o nome do cliente.'; $('input[name=novoNome]', f).focus(); return false; } id = 'c' + A.uid(); put((x) => { x.clientes[vid].push({ id, nome: nm, email: '' }); }); }
      A.go(`#/h/novo/1?vendor=${vid}&cliente=${id}`);
    } }] });
    const sel = $('select[name=cliente]', m.el); sel.addEventListener('change', () => { $('#vd-novo-cli', m.el).hidden = sel.value !== '__novo'; });
  };

  // Busca local: não envia nomes/e-mails para serviços e preserva foco ao filtrar.
  const directory = (body) => `<section class="vd-directory" aria-label="Pessoas"><div class="flex flex-wrap" style="gap:var(--space-3);margin-block:var(--space-4)"><label class="field grow">Buscar por nome ou e-mail<input class="input" type="search" data-input="vd-person-search" autocomplete="off"></label><label class="field">Ordenar<select class="select" data-change="vd-person-sort"><option value="asc">Nome: A–Z</option><option value="desc">Nome: Z–A</option></select></label></div><p class="t-small" data-vd-count role="status"></p><div data-vd-people>${body}</div><div data-vd-no-results hidden><p style="padding-block:var(--space-6)">Nenhuma pessoa encontrada. Tente outro nome ou e-mail.</p><button class="btn btn-line" data-act="vd-person-clear">Limpar busca</button></div></section>`;
  const filterPeople = (el) => {
    const root = el.closest('.vd-directory'); if (!root) return;
    const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const query = normalize($('[data-input="vd-person-search"]', root).value.trim());
    const direction = $('[data-change="vd-person-sort"]', root).value === 'desc' ? -1 : 1;
    let count = 0;
    root.querySelectorAll('[data-vd-people] .list').forEach((list) => {
      [...list.children].sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim(), 'pt-BR') * direction).forEach((row) => {
        const identity = row.querySelector('.grow');
        row.hidden = !normalize(identity ? identity.textContent : row.textContent).includes(query);
        if (!row.hidden) count++;
        list.append(row);
      });
    });
    $('[data-vd-count]', root).textContent = `${count} ${count === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}`;
    $('[data-vd-no-results]', root).hidden = count > 0;
  };
  A.inputs['vd-person-search'] = filterPeople;
  A.inputs['vd-person-sort'] = filterPeople;
  A.acts['vd-person-clear'] = (el) => { const input = $('[data-input="vd-person-search"]', el.closest('.vd-directory')); input.value = ''; filterPeople(input); input.focus(); };
  A.acts['vd-section'] = (el) => { const section = document.getElementById(el.dataset.section); section?.scrollIntoView({ behavior: 'auto', block: 'start' }); section?.focus({ preventScroll: true }); A.$$('.vd-aj-nav button').forEach((b) => b.setAttribute('aria-current', String(b === el))); };
  A.acts['vd-discard-settings'] = async () => { if (await A.confirm({ title: 'Descartar alterações?', body: 'Os dados voltam à última versão salva.', confirm: 'Descartar alterações', cancel: 'Continuar editando', danger: true })) { settingsDrafts.delete(curVid()); A.render(); } };
  const settingsDrafts = new Map(); // Só nesta aba; nenhum dado adicional no armazenamento persistente.
  document.addEventListener('input', (e) => {
    const form = e.target.closest('form[data-submit="vd-ajustes"]'); if (!form) return;
    const values = Object.fromEntries(new FormData(form)); values.publicado = form.elements.publicado.checked;
    settingsDrafts.set(curVid(), values);
    const status = $('[data-vd-save-status]', form); if (status) status.textContent = 'Alterações não salvas. O rascunho fica nesta aba enquanto você navega.';
  });
  window.addEventListener('beforeunload', (e) => { if (settingsDrafts.size) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- /f/:vid/equipe e clientes ---------- */
  const abas = (v, a) => { const s = V(); const ne = (s.equipe[v.id] || []).length + (s.convites[v.id] || []).length, nc = (s.clientes[v.id] || []).length; return `<nav class="vd-tabs" aria-label="Clientes e equipe"><a href="#/f/${v.id}/equipe?aba=equipe" ${a === 'equipe' ? 'aria-current="page"' : ''}>Equipe<span class="n">${ne}</span></a><a href="#/f/${v.id}/equipe?aba=clientes" ${a === 'clientes' ? 'aria-current="page"' : ''}>Clientes<span class="n">${nc}</span></a></nav>`; };
  const pageEquipe = (ctx, v) => {
    const aba = ctx.params.aba || ctx.q.aba || 'equipe'; const s = V(); const adm = papel() === 'admin'; const p = plano(v.plano);
    let corpo;
    if (aba === 'clientes') {
      const l = s.clientes[v.id]; const n = (id) => (s.eventos[v.id] || []).filter((e) => e.cliente === id).length;
      corpo = A.stateful({ ok: () => `<p class="vd-lead">${l.length} ${l.length === 1 ? 'cliente' : 'clientes'} nesta carteira.</p><div class="list">${l.map((c) => `<div class="li"><span class="avatar" aria-hidden="true">${esc(ini(c.nome))}</span><span class="grow"><b class="t-h">${esc(c.nome)}</b><span class="t-small" style="display:block">${esc(c.email || 'Sem e-mail')} · <a href="#/f/${v.id}/eventos?cliente=${c.id}">${n(c.id)} ${n(c.id) === 1 ? 'evento' : 'eventos'}</a></span></span><button class="btn btn-quiet btn-icon" data-act="vd-cli-menu" data-id="${c.id}" aria-haspopup="menu" aria-label="Ações de ${esc(c.nome)}">${ic('more', 18)}</button></div>`).join('')}</div>`, isEmpty: () => !l.length, empty: A.emptyState({ art: 'none', icon: 'users', title: 'Nenhum cliente ainda', body: 'Cadastre quem contrata você para organizar os eventos por cliente.', cta: '<button class="btn btn-accent" data-act="vd-cli-novo">Adicionar cliente</button>' }) });
      return shell(ctx, { section: 'equipe', title: 'Clientes e equipe', lead: 'Quem contrata você e quem trabalha com você.', actions: '<button class="btn btn-accent" data-act="vd-cli-novo">' + ic('plus', 18) + ' Adicionar cliente</button>' }, abas(v, 'clientes') + (l.length && A.sim().state === 'ok' ? directory(corpo) : corpo));
    }
    const m = s.equipe[v.id] || []; const cv = s.convites[v.id] || []; const total = m.length + cv.length; const lim = p.equipe; const cheio = lim != null && total >= lim;
    const convite = !adm ? `<div class="banner vd-group-0">${ic('lock', 18)}<span>Só administradores convidam, mudam papéis ou removem pessoas.</span></div>` : cheio ? `<div class="banner warn">${ic('warn', 18)}<span class="grow">O plano ${p.nome} permite ${lim} pessoas e a equipe está completa (contando convites pendentes).</span><a class="btn btn-sm btn-line" href="#/f/${v.id}/cobranca">Ver planos</a></div>` : `<section class="vd-panel" aria-labelledby="vd-inv-h"><h2 class="vd-h2" id="vd-inv-h">Convidar uma pessoa</h2><form class="flex flex-wrap vd-inv" data-submit="vd-convidar" novalidate><div class="grow">${A.field({ name: 'email', label: 'E-mail da pessoa', type: 'email', required: true, placeholder: 'nome@email.com', extra: 'autocomplete="off" maxlength="320"' })}</div><div>${A.field({ name: 'papel', label: 'Papel', value: 'equipe', options: [['equipe', 'Equipe'], ['admin', 'Administrador']] })}</div><button class="btn btn-primary" type="submit">Enviar convite</button></form><p class="vd-lead">O convite por e-mail é simulado no protótipo.</p></section>`;
    const linhas = [...m].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((x) => `<div class="li"><span class="avatar" aria-hidden="true">${esc(ini(x.nome))}</span><span class="grow"><b class="t-h">${esc(x.nome)}${x.voce ? ' <span class="t-small">(você)</span>' : ''}</b><span class="t-small" style="display:block">${esc(x.email)}</span></span><select class="select" style="width:auto;min-width:140px" aria-label="Papel de ${esc(x.nome)}" data-change="vd-papel" data-id="${x.id}" ${!adm || x.voce ? 'disabled' : ''}><option value="equipe" ${x.papel === 'equipe' ? 'selected' : ''}>Equipe</option><option value="admin" ${x.papel === 'admin' ? 'selected' : ''}>Administrador</option></select><button class="btn btn-quiet btn-sm" data-act="vd-remover" data-id="${x.id}" ${!adm || x.voce ? 'disabled' : ''} aria-label="Remover ${esc(x.nome)}">Remover</button></div>`).join('');
    const pend = cv.length ? `<h2 class="vd-h2 vd-group">Convites pendentes</h2><div class="list">${cv.map((c) => `<div class="li"><span class="grow"><b class="t-h">${esc(c.email)}</b><span class="t-small" style="display:block">${c.papel === 'admin' ? 'Administrador' : 'Equipe'} · enviado ${A.ago(c.min)}</span></span><button class="btn btn-quiet btn-sm" data-act="vd-reenviar" data-id="${c.id}" ${adm ? '' : 'disabled'}>Reenviar</button><button class="btn btn-quiet btn-sm" data-act="vd-cancelar-convite" data-id="${c.id}" ${adm ? '' : 'disabled'}>Cancelar convite</button></div>`).join('')}</div>` : '';
    corpo = `<p class="vd-lead">${total}${lim != null ? ' de ' + lim : ''} ${total === 1 ? 'pessoa' : 'pessoas'} no plano ${p.nome}${lim == null ? ', sem limite' : ''}. Mudanças ficam registradas na auditoria (simulado).</p>${convite}${A.stateful({ ok: () => directory(`<h2 class="vd-h2">Equipe</h2><div class="list">${linhas}</div>${pend}`), isEmpty: () => !m.length, empty: A.emptyState({ art: 'none', icon: 'users', title: 'Sua equipe está vazia', body: 'Convide a primeira pessoa.' }) })}`;
    return shell(ctx, { section: 'equipe', title: 'Clientes e equipe', lead: 'Quem contrata você e quem trabalha com você.' }, abas(v, 'equipe') + corpo);
  };
  route('/f/:vid/equipe', pageEquipe);
  route('/f/:vid/clientes', (ctx, v) => { ctx.params.aba = 'clientes'; return pageEquipe(ctx, v); });
  const curVid = () => (location.hash.match(/#\/f\/([^/?]+)/) || [])[1];
  A.acts['vd-convidar'] = (form) => {
    const vid = curVid(); const vals = A.validate(form, { email: A.rules.email }); if (!vals) return; const email = vals.email.toLowerCase(); const s = V();
    const dup = (s.equipe[vid] || []).some((m) => m.email.toLowerCase() === email) || (s.convites[vid] || []).some((c) => c.email.toLowerCase() === email);
    if (dup) { const f = $('input[name=email]', form); const fd = f.closest('.field'); fd.classList.add('has-error'); $('.err', fd).textContent = 'Esse e-mail já está na equipe ou já tem convite pendente.'; f.setAttribute('aria-invalid', 'true'); f.focus(); return; }
    A.busy($('button[type=submit]', form), 500, () => { const id = 'i' + A.uid(); put((x) => { x.convites[vid].push({ id, email: vals.email, papel: vals.papel, min: 0 }); }); A.render(); A.toast(`Convite enviado para ${vals.email} (e-mail simulado).`, { undo: () => { put((x) => { x.convites[vid] = x.convites[vid].filter((c) => c.id !== id); }); A.render(); } }); });
  };
  A.inputs['vd-papel'] = (el) => {
    const vid = curVid(); const s = V(); const m = s.equipe[vid].find((x) => x.id === el.dataset.id); const novo = el.value; const antes = m.papel;
    if (antes === 'admin' && novo !== 'admin' && s.equipe[vid].filter((x) => x.papel === 'admin').length < 2) { el.value = antes; return A.toast('O portal precisa de pelo menos um administrador. Promova outra pessoa antes.', { kind: 'bad' }); }
    put((x) => { x.equipe[vid].find((y) => y.id === m.id).papel = novo; }); A.render();
    A.toast(`${m.nome} agora é ${novo === 'admin' ? 'Administrador' : 'Equipe'}.`, { undo: () => { put((x) => { x.equipe[vid].find((y) => y.id === m.id).papel = antes; }); A.render(); } });
  };
  A.acts['vd-remover'] = async (el) => {
    const vid = curVid(); const s = V(); const m = s.equipe[vid].find((x) => x.id === el.dataset.id);
    if (m.papel === 'admin' && s.equipe[vid].filter((x) => x.papel === 'admin').length < 2) return A.toast('O portal precisa de pelo menos um administrador. Promova outra pessoa antes.', { kind: 'bad' });
    const ok = await A.confirm({ title: `Remover ${m.nome}?`, body: `<p>${esc(m.nome)} perde o acesso ao portal agora. Os eventos e as fotos continuam como estão. Para voltar, será preciso um novo convite.</p>`, confirm: 'Remover da equipe', danger: true });
    if (!ok) return; put((x) => { x.equipe[vid] = x.equipe[vid].filter((y) => y.id !== m.id); }); A.render(); A.toast(`${m.nome} foi removido(a).`);
  };
  A.acts['vd-reenviar'] = () => A.toast('Convite reenviado (e-mail simulado).');
  A.acts['vd-cancelar-convite'] = (el) => { const vid = curVid(); const c = V().convites[vid].find((x) => x.id === el.dataset.id); put((x) => { x.convites[vid] = x.convites[vid].filter((y) => y.id !== c.id); }); A.render(); A.toast('Convite cancelado.', { undo: () => { put((x) => { x.convites[vid].push(c); }); A.render(); } }); };
  const cliModal = (c) => {
    const vid = curVid(); const novo = !c;
    A.modal({ title: novo ? 'Adicionar cliente' : 'Editar cliente', body: `<form class="stack" novalidate>${A.field({ name: 'nome', label: 'Nome', value: c ? c.nome : '', required: true, extra: 'maxlength="120"' })}${A.field({ name: 'email', label: 'E-mail', type: 'email', value: c ? c.email : '', hint: 'Usado só para você enviar o link do evento.' })}</form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Salvar', variant: 'btn-primary', onClick: (api) => { const v = A.validate($('form', api.el), { nome: A.rules.min(2, 'Digite o nome do cliente.'), email: (x) => (x ? A.rules.email(x) : '') }); if (!v) return false; put((s) => { if (novo) s.clientes[vid].push({ id: 'c' + A.uid(), nome: v.nome, email: v.email }); else Object.assign(s.clientes[vid].find((y) => y.id === c.id), { nome: v.nome, email: v.email }); }); A.render(); A.toast(novo ? 'Cliente adicionado.' : 'Cliente atualizado.'); } }] });
  };
  A.acts['vd-cli-novo'] = () => cliModal(null);
  A.acts['vd-cli-menu'] = (el) => { const vid = curVid(); const c = V().clientes[vid].find((x) => x.id === el.dataset.id); A.menu(el, [{ label: 'Editar', icon: 'edit', onClick: () => cliModal(c) }, { label: 'Ver eventos', icon: 'calendar', href: `#/f/${vid}/eventos?cliente=${c.id}` }, { sep: 1 }, { label: 'Remover cliente', icon: 'trash', danger: 1, onClick: async () => { const n = (V().eventos[vid] || []).filter((e) => e.cliente === c.id).length; const ok = await A.confirm({ title: `Remover ${c.nome}?`, body: `<p>O cadastro some da lista.${n ? ` Os ${n} evento(s) dele continuam existindo e passam a aparecer sem cliente.` : ''}</p>`, confirm: 'Remover cliente', danger: true }); if (!ok) return; put((s) => { s.clientes[vid] = s.clientes[vid].filter((y) => y.id !== c.id); s.eventos[vid].forEach((e) => { if (e.cliente === c.id) e.cliente = ''; }); }); A.render(); A.toast('Cliente removido.'); } }]); };

  /* ---------- /f/:vid/insights ---------- */
  const INS = { cliente: '', ord: 'part' };
  A.inputs['vd-ins'] = (el) => { INS[el.dataset.k] = el.value; A.render(); };
  route('/f/:vid/insights', (ctx, v) => {
    const s = V(); const todos = s.eventos[v.id] || []; const cl = (id) => (s.clientes[v.id].find((c) => c.id === id) || { nome: 'Sem cliente' }).nome;
    const l = todos.filter((e) => !INS.cliente || e.cliente === INS.cliente); const real = l.filter((e) => faseOf(e) !== 'antes' && e.esperados);
    const med = real.length ? Math.round(real.reduce((a, e) => a + e.part, 0) / real.length) : 0; const fotos = l.reduce((a, e) => a + e.fotos, 0);
    const ord = l.slice().sort((a, b) => (INS.ord === 'fotos' ? b.fotos - a.fotos : INS.ord === 'nome' ? a.nome.localeCompare(b.nome) : b.part - a.part));
    const ok = () => `<div class="vd-head"><div><div class="big" aria-label="Participação média: ${med}%">${med}%</div></div><div class="stack-3">${A.arc(med / 100, 150, `Participação média de ${med}%`)}<p><b>Participação média.</b> Parcela dos convidados esperados que mandou ao menos uma foto. ${l.length} ${l.length === 1 ? 'evento' : 'eventos'} nesta carteira (${l.filter((e) => faseOf(e) !== 'depois').length} ainda ativos), ${A.pt(fotos)} fotos publicadas.</p></div></div>
<div class="flex flex-wrap" style="gap:12px;margin-bottom:var(--space-4)"><select class="select" style="width:auto;min-width:170px" aria-label="Filtrar por cliente" data-input="vd-ins" data-k="cliente"><option value="">Todos os clientes</option>${s.clientes[v.id].map((c) => `<option value="${c.id}" ${INS.cliente === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select><select class="select" style="width:auto;min-width:170px" aria-label="Ordenar por" data-input="vd-ins" data-k="ord"><option value="part" ${INS.ord === 'part' ? 'selected' : ''}>Maior participação</option><option value="fotos" ${INS.ord === 'fotos' ? 'selected' : ''}>Mais fotos</option><option value="nome" ${INS.ord === 'nome' ? 'selected' : ''}>Nome (A a Z)</option></select><button class="btn btn-line btn-sm" data-act="vd-exportar">${ic('download', 16)} Exportar planilha</button></div>
<div class="table-wrap"><table class="table"><caption class="sr-only">Participação e fotos por evento</caption><thead><tr><th scope="col">Evento</th><th scope="col">Situação</th><th scope="col">Participação</th><th scope="col" class="num">Fotos</th></tr></thead><tbody>${ord.map((e) => { const f = faseOf(e); const sem = f === 'antes'; const link = e.ref ? `<a href="${A.hostBase(e.ref)}/convidados">${esc(e.nome)}</a>` : esc(e.nome); return `<tr><td><b>${link}</b><div class="t-small">${esc(cl(e.cliente))}</div></td><td><span class="badge ${FASE[f][1]}">${FASE[f][0]}</span></td><td>${sem ? '<span class="muted">Ainda não começou</span>' : `<div class="flex" style="gap:12px"><div class="vd-bar grow" role="img" aria-label="${e.part}% de participação"><i style="width:${e.part}%"></i></div><span class="t-mono">${e.part}%</span></div>`}</td><td class="num">${sem ? '—' : A.pt(e.fotos)}</td></tr>`; }).join('')}</tbody></table></div>
<p class="t-small" style="margin-top:var(--space-4)">Participação é a parcela dos convidados esperados que mandou pelo menos uma foto. Estes números somam só os eventos desta carteira.</p>`;
    return shell(ctx, { section: 'insights', title: 'Insights', lead: 'Como seus clientes estão usando as festas que você organiza.' }, A.stateful({ ok, isEmpty: () => !todos.length, empty: A.emptyState({ art: 'none', icon: 'chart', title: 'Os números aparecem com o primeiro evento', body: 'Quando uma festa começar, a participação e as fotos entram aqui.', cta: `<a class="btn btn-line" href="#/f/${v.id}/eventos">Ir para Eventos</a>` }) }));
  });
  A.acts['vd-exportar'] = () => A.toast('Na versão real baixaria uma planilha .csv com estes números (simulado).');

  /* ---------- /f/:vid/cobranca ---------- */
  const dias = (s) => { const n = diasAte(s); return n; };
  route('/f/:vid/cobranca', (ctx, v) => {
    if (papel() !== 'admin') return negado(ctx, v, 'cobranca', 'Cobrança', 'veem e mudam a cobrança');
    const s = V(); const sb = sub(v.id); const p = plano(v.plano); const fat = s.faturas[v.id] || [];
    let topo = '';
    if (sb.status === 'none') topo = `<div class="banner warn">${ic('info', 18)}<span>Você ainda não assinou um plano. Escolha um para publicar o portal.</span></div>`;
    else {
      const avisos = [];
      if (sb.status === 'overdue') avisos.push(`<div class="banner bad" role="alert">${ic('warn', 18)}<span class="grow">A mensalidade de ${fmtD(sb.proxima)} está atrasada. Se continuar, o portal sai do ar.</span><a class="btn btn-sm btn-line" href="#/f/${v.id}/checkout">Regularizar</a></div>`);
      if (sb.status === 'pending') avisos.push(`<div class="banner warn">${ic('clock', 18)}<span class="grow">Aguardando a confirmação do pagamento.</span><a class="btn btn-sm btn-line" href="#/f/${v.id}/checkout">Abrir pagamento</a></div>`);
      if (sb.cancelando) avisos.push(`<div class="banner">${ic('info', 18)}<span class="grow">O cancelamento está agendado. O portal funciona até ${fmtD(sb.proxima)} e depois para de renovar.</span><button class="btn btn-sm btn-line" data-act="vd-desfazer-cancel">Desfazer cancelamento</button></div>`);
      if (sb.mudanca) avisos.push(`<div class="banner">${ic('info', 18)}<span class="grow">Mudança para o plano ${plano(sb.mudanca).nome} agendada para ${fmtD(sb.proxima)}.</span><button class="btn btn-sm btn-line" data-act="vd-desfazer-mudanca">Desfazer</button></div>`);
      topo = avisos.join('');
      const stb = { active: ['Ativo', 'ok'], overdue: ['Atrasado', 'bad'], pending: ['Pendente', 'warn'] }[sb.status] || ['Ativo', 'ok'];
      topo += `<div class="vd-plan vd-plan2"><div class="vd-plan-m"><span class="vd-kpi-l">Seu plano <span class="badge ${stb[1]}">${stb[0]}</span></span><h2>Plano ${p.nome}</h2></div><dl class="vd-plan-d"><div><dt>Valor</dt><dd>${A.brl(p.preco)}<small> /mês</small></dd></div><div><dt>Próxima cobrança</dt><dd>${sb.proxima ? fmtD(sb.proxima) : '—'}</dd></div><div><dt>Pagamento</dt><dd>${sb.forma === 'pix' ? 'PIX' : 'Cartão'}</dd></div></dl></div>`;
    }
    const cta = (pl) => (sb.status === 'none' || sb.status === 'canceled') ? `<a class="btn ${pl.id === v.plano ? 'btn-accent' : 'btn-line'}" href="#/f/${v.id}/checkout?plano=${pl.id}">Assinar ${pl.nome}</a>` : pl.id === v.plano ? '<span class="atual">Plano atual</span>' : `<button class="btn btn-line" data-act="vd-trocar" data-p="${pl.id}">Mudar para ${pl.nome}</button>`;
    const faturas = A.stateful({ ok: () => `<div class="list">${fat.map((f) => { const [l, c] = FATURA[f.status] || ['Em análise', 'warn']; return `<div class="li"><span class="grow"><b class="t-h">Mensalidade Albora · ${plano(f.plano).nome}</b><span class="t-small" style="display:block">Vencimento ${fmtD(f.venc)}</span></span><span class="badge ${c}">${l}</span><span class="t-mono">${A.brl(f.valor)}</span><button class="btn btn-quiet btn-sm" data-act="vd-recibo" aria-label="Abrir recibo de ${fmtD(f.venc)}">Abrir recibo</button></div>`; }).join('')}</div>`, isEmpty: () => !fat.length, empty: A.emptyState({ art: 'none', icon: 'wallet', title: 'Nenhuma cobrança ainda', body: 'As mensalidades aparecem aqui depois da primeira cobrança.' }), error: A.errorState({ title: 'O histórico não carregou', body: 'Sua assinatura não foi afetada. Tente de novo em instantes.' }) });
    const cancelar = (sb.status === 'active' && !sb.cancelando) ? `<p style="margin-top:var(--space-12)"><button class="btn btn-danger btn-sm" data-act="vd-cancelar">Cancelar assinatura</button></p>` : '';
    return shell(ctx, { section: 'cobranca', title: 'Cobrança', lead: 'Plano, pagamento e histórico do seu portal.' }, `${topo}<h2 class="t-title" style="margin-bottom:var(--space-3)">${sb.status === 'none' ? 'Escolha um plano' : 'Comparar planos'}</h2>${planosHtml(cta)}<h2 class="t-title" style="margin:var(--space-12) 0 var(--space-3)">Histórico de cobranças</h2>${faturas}${cancelar}`);
  });
  A.acts['vd-recibo'] = () => A.toast('Na versão real abriria o recibo em PDF (simulado).');
  A.acts['vd-trocar'] = async (el) => {
    const vid = curVid(); const v = ven(vid); const novo = plano(el.dataset.p), atual = plano(v.plano); const sb = sub(vid); const s = V();
    if (novo.preco > atual.preco) {
      const restam = Math.max(1, dias(sb.proxima)); const prop = Math.round(((novo.preco - atual.preco) * restam) / 30);
      const ok = await A.confirm({ title: `Mudar para ${novo.nome}?`, body: `<p>Vale a partir de agora. Cobramos <b>${A.brl(prop)}</b> proporcionais até ${fmtD(sb.proxima)} (valor simulado) e, depois, ${A.brl(novo.preco)} por mês.</p>`, confirm: `Mudar para ${novo.nome}` });
      if (!ok) return; put((x) => { x.list.find((y) => y.id === vid).plano = novo.id; }); A.render(); return A.toast(`Plano ${novo.nome} ativo. Pagamento da diferença simulado.`);
    }
    const eq = (s.equipe[vid] || []).length + (s.convites[vid] || []).length, ev = ativos(vid); const lim = [];
    if (novo.equipe != null && eq > novo.equipe) lim.push(`a equipe tem ${eq} pessoas (contando convites) e o ${novo.nome} permite ${novo.equipe}`);
    if (novo.eventos != null && ev > novo.eventos) lim.push(`há ${ev} eventos ativos e o ${novo.nome} permite ${novo.eventos}`);
    if (lim.length) return A.modal({ title: `Ainda não dá para mudar para ${novo.nome}`, body: `<p>Antes, ajuste: ${lim.join('; ')}.</p>`, actions: [{ label: 'Entendi', variant: 'btn-quiet' }, { label: 'Ver equipe', variant: 'btn-primary', onClick: () => { A.go(`#/f/${vid}/equipe`); } }] });
    const ok = await A.confirm({ title: `Mudar para ${novo.nome}?`, body: `<p>A mudança vale a partir de ${fmtD(sb.proxima)}, na próxima cobrança. Até lá o plano ${atual.nome} segue valendo, sem custo extra.</p>`, confirm: 'Agendar a mudança' });
    if (!ok) return; put((x) => { x.assinatura[vid].mudanca = novo.id; }); A.render(); A.toast('Mudança agendada.', { undo: () => { put((x) => { x.assinatura[vid].mudanca = null; }); A.render(); } });
  };
  A.acts['vd-desfazer-mudanca'] = () => { const vid = curVid(); put((x) => { x.assinatura[vid].mudanca = null; }); A.render(); A.toast('Mudança de plano desfeita.'); };
  A.acts['vd-cancelar'] = async () => {
    const vid = curVid(); const sb = sub(vid);
    const ok = await A.confirm({ title: 'Cancelar a assinatura?', body: `<p>O portal continua funcionando até ${fmtD(sb.proxima)} e depois para de renovar. Os eventos já criados seguem até acabar; você não poderá criar novos. Até essa data dá para desfazer.</p>`, confirm: 'Cancelar assinatura', danger: true });
    if (!ok) return; put((x) => { x.assinatura[vid].cancelando = true; }); A.render(); A.toast('Cancelamento agendado.', { undo: () => { put((x) => { x.assinatura[vid].cancelando = false; }); A.render(); } });
  };
  A.acts['vd-desfazer-cancel'] = () => { const vid = curVid(); put((x) => { x.assinatura[vid].cancelando = false; }); A.render(); A.toast('Cancelamento desfeito. A assinatura continua.'); };

  /* ---------- /f/:vid/checkout (pagamento simulado) ---------- */
  const CK = {};
  route('/f/:vid/checkout', (ctx, v) => {
    if (papel() !== 'admin') return negado(ctx, v, 'cobranca', 'Assinatura', 'assinam ou mudam o plano');
    const sb = sub(v.id); const crumbs = [{ label: 'Cobrança', href: `#/f/${v.id}/cobranca` }, { label: 'Assinatura' }];
    if (sb.status === 'active' && !(CK[v.id] && CK[v.id].stage === 'ok')) { delete CK[v.id]; A.later(0, () => A.go(`#/f/${v.id}/cobranca`)); return ''; }
    const k = CK[v.id] || (CK[v.id] = { stage: sb.status === 'pending' || sb.status === 'overdue' ? 'pagar' : 'form', erro: '' });
    const pid = ctx.q.plano && D.planos.some((p) => p.id === ctx.q.plano) ? ctx.q.plano : v.plano; const p = plano(k.plano || pid); const forma = k.forma || (sb.forma || 'pix');
    const resumo = (pl) => `<aside class="outline stack-3"><h2 class="t-title">Resumo</h2><dl class="vd-kv"><dt>Plano</dt><dd>${pl.nome}</dd><dt>Equipe</dt><dd>${pl.equipe == null ? 'Sem limite' : 'Até ' + pl.equipe + ' pessoas'}</dd><dt>Eventos ativos</dt><dd>${pl.eventos == null ? 'Sem limite' : 'Até ' + pl.eventos}</dd><dt>Recorrência</dt><dd>Mensal</dd><dt>Total por mês</dt><dd class="t-mono">${A.brl(pl.preco)}</dd></dl><p class="t-small">A cobrança só é criada depois que você confirmar. Pagamento simulado neste protótipo.</p></aside>`;
    let corpo;
    if (A.sim().state === 'error') corpo = A.errorState({ title: 'Não deu para abrir o pagamento', body: 'A conexão caiu e nada foi cobrado. Tente de novo.' });
    else if (A.sim().state === 'loading') corpo = A.skel(3, 70);
    else if (k.stage === 'ok') corpo = `<div class="stack-5"><span class="badge ok">Pagamento confirmado (simulado)</span><h2 class="t-title">Assinatura ativa: plano ${plano(ven(v.id).plano).nome}</h2><p class="t-lead">O portal está publicado. Próxima cobrança em ${fmtD(sub(v.id).proxima)}.</p><div class="flex flex-wrap"><a class="btn btn-accent" href="#/f/${v.id}/eventos">Ir para os eventos</a><a class="btn btn-line" href="#/f/${v.id}/cobranca">Ver a cobrança</a></div></div>`;
    else if (k.stage === 'pagar') {
      const pl = plano(ven(v.id).plano); const valor = pl.preco; const atrasada = sb.status === 'overdue';
      corpo = `<div class="split"><div class="stack-5"><h2 class="t-title">${atrasada ? 'Regularizar a mensalidade' : 'Agora falta pagar'}</h2>${k.erro ? `<div class="banner bad" role="alert">${ic('warn', 18)}<span>${esc(k.erro)}</span></div>` : ''}${forma === 'pix' ? `<div class="vd-pix"><div class="vd-qr">${A.qrSvg('pix-albora-' + v.id, 168)}</div><div class="stack-3 grow"><p>Valor <b>${A.brl(valor)}</b> · vale por 30 minutos.</p><code class="t-mono cod">00020126-ALBORA-SIMULADO-${esc(v.id)}-${valor}</code><button class="btn btn-line btn-sm" data-act="copy" data-text="00020126-ALBORA-SIMULADO">${ic('copy', 16)} Copiar código PIX</button><p class="t-small">O QR é de exemplo e não paga de verdade.</p></div></div>` : `<p>Você seguiria para o ambiente seguro do provedor de pagamento. Nenhum dado de cartão é pedido aqui.</p>`}<div class="stack-3"><button class="btn btn-accent" data-act="vd-pagar" data-r="ok">Simular: pagamento aprovado</button><button class="btn btn-line" data-act="vd-pagar" data-r="falha">Simular: pagamento recusado</button></div></div>${resumo(pl)}</div>`;
    } else corpo = `<div class="split"><form class="stack-5" data-submit="vd-checkout" novalidate><fieldset class="vd-fs"><legend class="t-title">Plano</legend>${D.planos.map((pl) => `<label class="vd-radio"><input type="radio" name="plano" value="${pl.id}" ${pl.id === p.id ? 'checked' : ''} data-change="vd-ck-plano"><span class="grow"><b>${pl.nome}</b> · ${A.brl(pl.preco)}/mês<span class="t-small" style="display:block">${pl.equipe == null ? 'Equipe sem limite' : 'Até ' + pl.equipe + ' pessoas'} · ${pl.eventos == null ? 'eventos sem limite' : 'até ' + pl.eventos + ' eventos ativos'}</span></span></label>`).join('')}</fieldset><fieldset class="vd-fs"><legend class="t-title">Forma de pagamento</legend><div class="flex">${[['pix', 'PIX'], ['cartao', 'Cartão']].map(([f, l]) => `<label class="check"><input type="radio" name="forma" value="${f}" ${forma === f ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>${A.field({ name: 'email', label: 'E-mail para receber as cobranças', type: 'email', value: k.email != null ? k.email : (v.email || ''), required: true, hint: 'Recibos e avisos de vencimento vão para este endereço.', extra: 'autocomplete="email"' })}${k.erro ? `<div class="banner bad" role="alert">${ic('warn', 18)}<span>${esc(k.erro)}</span></div>` : ''}<div class="flex"><button class="btn btn-accent btn-lg" type="submit">Confirmar assinatura</button><a class="btn btn-quiet" href="#/f/${v.id}/cobranca">Voltar</a></div></form><div id="vd-ck-res">${resumo(p)}</div></div>`;
    return { ...shell(ctx, { section: 'cobranca', title: 'Assinatura', lead: 'Escolha o plano, a forma de pagamento e confirme.', crumbs }, corpo), after: () => { if (k.stage === 'ok') delete CK[v.id]; } };
  });
  A.inputs['vd-ck-plano'] = (el) => { const vid = curVid(); const k = CK[vid] || (CK[vid] = {}); const f = el.closest('form'); const fv = formVals(f); k.plano = el.value; k.forma = fv.forma; k.email = fv.email; A.render(); };
  A.acts['vd-checkout'] = (form) => {
    const vid = curVid(); const v = A.validate(form, { email: A.rules.email }); if (!v) return; const fv = formVals(form); v.plano = fv.plano; v.forma = fv.forma; const k = CK[vid] || (CK[vid] = {});
    A.busy($('button[type=submit]', form), 900, () => {
      if (A.sim().state === 'error') { k.erro = 'A conexão caiu e o pedido não foi enviado. Nada foi cobrado; tente de novo.'; return A.render(); }
      const pl = plano(v.plano); k.erro = ''; k.stage = 'pagar'; k.forma = v.forma; put((s) => { s.list.find((x) => x.id === vid).plano = pl.id; s.list.find((x) => x.id === vid).email = s.list.find((x) => x.id === vid).email || v.email; s.assinatura[vid] = { status: 'pending', forma: v.forma, proxima: iso(30), mudanca: null, cancelando: false }; s.faturas[vid].unshift({ id: 'f' + A.uid(), venc: iso(0), status: 'pendente', valor: pl.preco, plano: pl.id }); }); A.render();
    });
  };
  A.acts['vd-pagar'] = (el) => {
    const vid = curVid(); const k = CK[vid] || (CK[vid] = {});
    if (el.dataset.r === 'falha') { k.erro = 'O pagamento não foi aprovado e nada foi cobrado. Tente outra forma de pagamento ou gere um novo código.'; return A.render(); }
    A.busy(el, 700, () => { k.erro = ''; k.stage = 'ok'; put((s) => { const f = s.faturas[vid].find((x) => x.status === 'pendente' || x.status === 'atrasada'); if (f) f.status = 'pago'; s.assinatura[vid].status = 'active'; s.assinatura[vid].proxima = iso(30); s.list.find((x) => x.id === vid).publicado = true; }); A.render(); A.toast('Assinatura ativa (pagamento simulado).'); });
  };

  /* ---------- /f/:vid/marca ---------- */
  route('/f/:vid/marca', (ctx, v) => {
    if (papel() !== 'admin') return negado(ctx, v, 'marca', 'Marca', 'alteram a marca');
    const p = plano(v.plano);
    const seloSw = p.selo ? `<div class="field"><span class="lbl">Selo "com Albora"</span><p class="t-small">Aparece no rodapé do portal e dos eventos. Só o plano Agency pode ocultar. <a href="#/f/${v.id}/cobranca">Ver planos</a></p></div>` : `<div class="field"><span class="lbl">Selo "com Albora"</span><p class="t-small">Oculto: seu plano Agency tem marca própria completa.</p></div>`;
    const form = `<form class="stack-5" data-submit="vd-marca" novalidate><section class="vd-card"><h2 class="vd-card-h">Identidade</h2>${A.field({ name: 'nome', label: 'Nome que aparece no portal', value: v.nome, required: true, extra: 'maxlength="120" data-input="vd-brand"' })}${logoField(v.logo)}</section><section class="vd-card"><h2 class="vd-card-h">Cores</h2>${colorField(v.cor, v.tema)}${temaField(v.tema)}</section><section class="vd-card"><h2 class="vd-card-h">Tipografia e selo</h2>${estiloField(v.estilo)}${seloSw}</section><input type="hidden" name="descricao" value="${esc(v.descricao)}"><div class="flex vd-savebar"><button class="btn btn-primary" type="submit">Salvar marca</button><button class="btn btn-quiet" type="button" data-act="vd-marca-descartar">Descartar mudanças</button></div></form>`;
    return { ...shell(ctx, { section: 'marca', title: 'Marca', lead: 'Cor, fundo, logo e estilo que seus clientes veem.', actions: `<a class="btn btn-line" href="#/f/v/${esc(v.slug)}">${ic('globe', 16)} Ver portal público</a>` }, `<div class="split"><div>${form}</div><div class="aside">${brandPreview(v, p.selo)}</div></div>`), after: () => { const f = $('form[data-submit=vd-marca]'); if (f) paint(f); } };
  });
  A.acts['vd-marca-descartar'] = () => { A.render(); A.toast('Mudanças descartadas.'); };
  A.acts['vd-marca'] = (form) => {
    const vid = curVid(); const v = A.validate(form, { nome: A.rules.min(2, 'O nome precisa ter pelo menos 2 letras.') }); if (!v) return; const vals = formVals(form); const c = brandCheck(vals.cor, vals.tema);
    if (!c.ok) { const t = $('[data-contraste]', form); t.style.color = 'var(--crit-text)'; t.textContent = c.msg; $('input[name=cor]', form).focus(); return A.toast('Ajuste a cor antes de salvar.', { kind: 'bad' }); }
    A.busy($('button[type=submit]', form), 500, () => { A.dirty = null; put((s) => { Object.assign(s.list.find((x) => x.id === vid), { nome: vals.nome, cor: vals.cor, tema: vals.tema, estilo: vals.estilo, logo: vals.logo }); }); A.render(); A.toast('Marca salva. O portal público já usa as novas cores.'); });
  };

  /* ---------- /f/:vid/ajustes ---------- */
  route('/f/:vid/ajustes', (ctx, v) => {
    if (papel() !== 'admin') return negado(ctx, v, 'ajustes', 'Ajustes do portal', 'mudam os ajustes');
    const pk = V().pacotes[v.id] || [];
    const draft = settingsDrafts.get(v.id); if (draft) v = { ...v, ...draft };
    const campos = `${A.field({ name: 'nome', label: 'Nome do negócio', value: v.nome, required: true, extra: 'maxlength="120"' })}${A.field({ name: 'slug', label: 'Endereço do portal', value: v.slug, required: true, hint: 'Mudar o endereço desliga os links antigos.', extra: 'maxlength="80" autocomplete="off"' })}${A.field({ name: 'cidade', label: 'Cidade', value: v.cidade })}${A.field({ name: 'email', label: 'E-mail de contato', type: 'email', value: v.email, hint: 'Aparece na vitrine pública.' })}${A.field({ name: 'whatsapp', label: 'WhatsApp', value: v.whatsapp, placeholder: '(31) 99999-0000' })}${A.field({ name: 'descricao', label: 'Texto da vitrine', value: v.descricao, rows: 3, extra: 'maxlength="300"', hint: 'Até 300 caracteres.' })}<label class="check"><input type="checkbox" name="publicado" ${v.publicado ? 'checked' : ''}><span><b>Portal público publicado</b><span class="t-small" style="display:block">Quando desligado, quem abrir o endereço vê "ainda não publicado".</span></span></label>`;
    const form = `<section class="vd-aj-sec" id="vd-business" tabindex="-1" aria-labelledby="vd-business-h"><h2 class="vd-h2" id="vd-business-h">Dados e publicação</h2><p class="vd-lead">O que aparece na vitrine pública e como as pessoas chegam até ela.</p><form class="stack-5" data-submit="vd-ajustes" novalidate>${campos}<div class="vd-aj-end"><p class="t-small" data-vd-save-status role="status">${draft ? 'Alterações não salvas. O rascunho fica nesta aba enquanto você navega.' : 'As mudanças aparecem na vitrine depois de salvar.'}</p><div class="flex flex-wrap"><button class="btn btn-primary" type="submit">Salvar alterações</button><button class="btn btn-quiet" type="button" data-act="vd-discard-settings">Descartar alterações</button></div></div></form></section>`;
    const pacotes = `<section class="vd-aj-sec" id="vd-packages" tabindex="-1" aria-labelledby="vd-packages-h"><h2 class="vd-h2" id="vd-packages-h">Pacotes da vitrine</h2><p class="vd-lead">Os pacotes que você vende, como o cliente os vê.</p>${A.stateful({ ok: () => `<div class="list">${pk.map((k) => `<div class="li"><span class="grow"><b class="t-h">${esc(k.nome)}</b><span class="t-small" style="display:block">${esc(k.desc)}</span></span><span class="t-mono">${A.brl(k.preco)}</span><button class="btn btn-quiet btn-sm" data-act="vd-pacote-x" data-id="${k.id}" aria-label="Remover pacote ${esc(k.nome)}">Remover</button></div>`).join('')}</div>`, isEmpty: () => !pk.length, empty: A.emptyState({ art: 'none', icon: 'tag', title: 'Nenhum pacote na vitrine', body: 'Adicione os pacotes que você vende para os clientes verem.' }) })}<p class="vd-aj-end"><span><button class="btn btn-line btn-sm" data-act="vd-pacote-novo">${ic('plus', 16)} Adicionar pacote</button></span></p></section>`;
    const perigo = `<section class="vd-aj-sec vd-aj-danger" id="vd-delete" tabindex="-1" aria-labelledby="vd-delete-h"><h2 class="vd-h2" id="vd-delete-h">Excluir este portal</h2><p class="vd-lead">Remove o portal, a vitrine pública e o acesso da equipe. Os eventos dos clientes não são apagados, mas saem da sua carteira. Não dá para desfazer.</p><div><button class="btn btn-danger btn-sm" data-act="vd-excluir">Excluir portal</button></div></section>`;
    return shell(ctx, { section: 'ajustes', title: 'Ajustes do portal', lead: 'Dados do negócio, vitrine pública e pacotes.' }, `<nav class="vd-aj-nav" aria-label="Seções dos ajustes"><button data-act="vd-section" data-section="vd-business" aria-current="true">Dados e publicação</button><button data-act="vd-section" data-section="vd-packages">Pacotes</button><button data-act="vd-section" data-section="vd-delete">Excluir portal</button></nav><div class="vd-aj">${form}${pacotes}${perigo}</div>`);
  });
  A.acts['vd-ajustes'] = async (form) => {
    const vid = curVid(); const v = ven(vid);
    const vals = A.validate(form, { nome: A.rules.min(2, 'O nome precisa ter pelo menos 2 letras.'), slug: (x) => (/^[a-z0-9-]{1,80}$/.test(x) ? (RESERVADOS.includes(x) ? 'Esse endereço é reservado.' : '') : 'Use só letras minúsculas sem acento, números e hífen.'), email: (x) => (x ? A.rules.email(x) : '') }); if (!vals) return;
    if (vals.slug !== v.slug) {
      if (V().list.some((x) => x.slug === vals.slug && x.id !== vid)) { const f = $('input[name=slug]', form); const fd = f.closest('.field'); fd.classList.add('has-error'); $('.err', fd).textContent = `O endereço "${vals.slug}" já está em uso.`; return f.focus(); }
      const ok = await A.confirm({ title: 'Mudar o endereço do portal?', body: `<p>O portal passa de <b>albora.app/f/${esc(v.slug)}</b> para <b>albora.app/f/${esc(vals.slug)}</b>. Os links antigos deixam de funcionar.</p>`, confirm: 'Mudar o endereço' }); if (!ok) return;
    }
    put((s) => { Object.assign(s.list.find((x) => x.id === vid), { nome: vals.nome, slug: vals.slug, cidade: vals.cidade, email: vals.email, whatsapp: vals.whatsapp, descricao: vals.descricao, publicado: vals.publicado }); }); settingsDrafts.delete(vid); A.render(); A.toast('Ajustes salvos.');
  };
  A.acts['vd-pacote-novo'] = () => {
    const vid = curVid();
    A.modal({ title: 'Adicionar pacote', body: `<form class="stack" novalidate>${A.field({ name: 'nome', label: 'Nome do pacote', required: true, extra: 'maxlength="60"' })}${A.field({ name: 'preco', label: 'Preço (R$)', type: 'number', required: true, extra: 'min="0" step="50" inputmode="numeric"' })}${A.field({ name: 'desc', label: 'O que inclui', rows: 2, extra: 'maxlength="140"' })}</form>`, actions: [{ label: 'Cancelar', variant: 'btn-quiet' }, { label: 'Adicionar', variant: 'btn-primary', onClick: (api) => { const v = A.validate($('form', api.el), { preco: (x) => (+x > 0 ? '' : 'Informe um preço maior que zero.') }); if (!v) return false; put((s) => { s.pacotes[vid].push({ id: 'k' + A.uid(), nome: v.nome, preco: +v.preco, desc: v.desc }); }); A.render(); A.toast('Pacote adicionado.'); } }] });
  };
  A.acts['vd-pacote-x'] = (el) => { const vid = curVid(); const k = V().pacotes[vid].find((x) => x.id === el.dataset.id); put((s) => { s.pacotes[vid] = s.pacotes[vid].filter((x) => x.id !== k.id); }); A.render(); A.toast(`Pacote ${k.nome} removido.`, { undo: () => { put((s) => { s.pacotes[vid].push(k); }); A.render(); } }); };
  A.acts['vd-excluir'] = async () => {
    const vid = curVid(); const v = ven(vid);
    const ok = await A.confirm({ title: 'Excluir o portal?', body: `<p>O portal <b>${esc(v.nome)}</b>, a vitrine pública e o acesso da equipe são removidos agora. Os eventos dos clientes continuam existindo, fora da sua carteira. Não dá para desfazer.</p>`, confirm: 'Excluir portal', danger: true, type: v.nome });
    if (!ok) return; put((s) => { s.removidos.push(vid); }); A.toast('Portal excluído.'); A.go('#/f');
  };

  /* ---------- páginas públicas ---------- */
  const pub = (inner, extra = '') => `<a class="skip" href="#main" data-act="skip">Pular para o conteúdo</a><div class="vd-pubwrap"><header class="vd-pubtop"><a class="vd-brand" href="#/p/fornecedores" aria-label="Albora, página para fornecedores">${A.logo(26)}</a><nav aria-label="Páginas públicas"><a href="#/p/fornecedores">Para fornecedores</a><a href="#/p/privacidade">Privacidade</a><a class="btn btn-line btn-sm" href="#/f/novo">Criar meu portal</a></nav></header><main id="main" tabindex="-1" class="vd-pubmain ${extra}">${inner}</main><footer class="vd-pubfoot"><span class="vd-selo">${A.mark(16)} Albora · protótipo, dados fictícios</span><nav class="vd-fl" aria-label="Rodapé"><a href="#/p/privacidade">Privacidade</a><a href="#/p/fornecedores">Fornecedores</a><a href="#/p/15-anos">15 anos</a></nav></footer></div>`;
  A.route('/p/fornecedores', () => {
    A.applyEvent(null);
    return { title: 'Para fornecedores', html: pub(`<section class="vd-hero vd-hero2"><div class="vd-hero-t"><span class="vd-eyebrow">Para cerimonialistas e fornecedores</span><h1>Entregue a festa que seus clientes não conseguiram ver inteira.</h1><p class="t-lead">Você configura um portal com a sua marca. Os convidados mandam as fotos pelo celular, sem baixar nada, e o cliente acompanha tudo, durante e depois da festa.</p><div class="flex flex-wrap"><a class="btn btn-accent btn-lg" href="#/f/novo">Criar meu portal</a><a class="btn btn-line btn-lg" href="#/f/v/aurora-cerimonial">Ver um portal de exemplo</a></div></div><div class="vd-hero-art" aria-hidden="true"><div class="vd-hero-phone">${[0, 1, 2, 3].map((i) => `<span class="vd-hp-t">${A.img('forn-' + i, 'p', '')}</span>`).join('')}</div><div class="vd-hero-chip"><span class="vd-hero-ac">AC</span><span>Aurora Cerimonial</span></div></div></section>
<section class="vd-sec" aria-labelledby="como"><h2 id="como">Como funciona</h2><ol class="vd-pass"><li><b>Você configura</b>Marca, cor e pacotes do seu jeito.</li><li><b>Os convidados participam</b>Um QR, sem cadastro e sem baixar app.</li><li><b>A festa aparece ao vivo</b>Telão e álbum com a identidade do evento.</li><li><b>Você entrega</b>Álbum final e números de cada evento.</li></ol></section>
<section class="vd-sec" aria-labelledby="planos"><h2 id="planos">Planos</h2>${planosHtml((p) => `<a class="btn ${p.id === 'studio' ? 'btn-accent' : 'btn-line'}" href="#/f/novo?plano=${p.id}">Começar com ${p.nome}</a>`)}<p class="t-small">Você escolhe o plano na criação do portal e paga no checkout. Dá para mudar depois.</p></section>`) };
  });
  const secoes = [['Quem controla o quê', 'O Albora cuida da plataforma; quem organiza a festa decide quem participa e o que aparece no telão e no álbum. Cada evento é isolado dos demais.'], ['O que o convidado envia', 'Fotos e vídeos, o primeiro nome e o consentimento. Não pedimos cadastro, senha, e-mail nem telefone.'], ['Sessão e aparelho', 'O convidado é identificado por um token do aparelho, válido para um único evento. Ele não funciona em outros eventos nem pode ser transferido.'], ['O que removemos na origem', 'A localização (GPS) e os demais metadados da foto são removidos no próprio celular, antes do envio.'], ['Consentimento', 'O convidado aceita antes de tirar a primeira foto. O aceite é guardado com versão e data.'], ['Remoção', 'O convidado pode apagar as próprias fotos e revogar o consentimento pelo perfil, a qualquer momento.'], ['Retenção', 'No dia 330 após a festa o anfitrião recebe a exportação para a nuvem dele; no dia 365 tudo é apagado.'], ['App do convidado', 'O app é opcional e o convite aparece só depois da primeira foto. O pareamento usa um código de quatro dígitos.'], ['Anfitrião e fornecedor', 'O fornecedor vê números agregados da carteira e os eventos dos clientes que ele criou. Fotos de convidados nunca viram material de marketing.'], ['Contato', `Dúvidas e pedidos sobre seus dados: ${D.legal.contato}.`]];
  A.route('/p/privacidade', () => {
    A.applyEvent(null);
    return { title: 'Privacidade', html: pub(`<div class="vd-doc vd-priv"><header class="vd-priv-h"><span class="vd-eyebrow">Privacidade</span><h1 class="t-display">O que acontece com as suas fotos e dados</h1><p class="t-lead">Resumo claro do que acontece com as fotos e os dados de quem vai à festa.</p><p class="t-small">Atualizado em ${fmtD(D.legal.atualizado)} · consentimento versão ${D.legal.versao}</p></header><ul class="vd-priv-p"><li><span aria-hidden="true">${ic('lock', 22)}</span><b>Sem cadastro</b><p>Não pedimos cadastro, senha, e-mail nem telefone ao convidado.</p></li><li><span aria-hidden="true">${ic('shield', 22)}</span><b>GPS removido no celular</b><p>A localização e os demais metadados saem da foto antes do envio.</p></li><li><span aria-hidden="true">${ic('trash', 22)}</span><b>Você apaga quando quiser</b><p>Pelo perfil, o convidado apaga as próprias fotos e revoga o consentimento.</p></li></ul><div class="vd-priv-grid"><nav class="vd-priv-toc" aria-label="Nesta página"><b class="t-label">Nesta página</b>${secoes.map(([t], i) => `<button type="button" data-act="p-ancora" data-id="s${i}">${esc(t)}</button>`).join('')}</nav><div class="vd-priv-body">${secoes.map(([t, c], i) => `<section class="vd-priv-s"><h2 id="s${i}" tabindex="-1"><span class="vd-priv-n" aria-hidden="true">${i + 1}</span>${esc(t)}</h2><p>${esc(c)}</p></section>`).join('')}<p class="t-small">Esta é a versão resumida do protótipo; o texto jurídico completo fica na versão final.</p></div></div></div>`) };
  });
  A.acts['p-ancora'] = (el) => { const t = document.getElementById(el.dataset.id); if (t) { t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); t.focus({ preventScroll: true }); } };
  A.route('/p/15-anos', () => {
    A.applyEvent(null);
    return { title: 'Festa de 15 anos', html: pub(`<section class="vd-hero vd-hero2"><div class="vd-hero-t"><span class="vd-eyebrow">Festa de 15 anos</span><h1>Os 15 anos dela, vistos por todo mundo que estava lá.</h1><p class="t-lead">Convidados mandam as fotos pelo celular, sem cadastro, e a festa aparece no telão e num álbum só.</p><div class="flex flex-wrap"><a class="btn btn-accent btn-lg" href="#/h/novo/1?tipo=aniversario&pack=15-anos">Criar um evento de 15 anos</a><a class="btn btn-line btn-lg" href="#/p/privacidade">Ler a privacidade</a></div></div><div class="vd-hero-art" aria-hidden="true"><div class="vd-hero-phone">${[0, 1, 2, 3].map((i) => `<span class="vd-hp-t">${A.img('forn-' + i, 'p', '')}</span>`).join('')}</div><div class="vd-hero-chip"><span class="vd-hero-ac">${ic('check', 16)}</span><span>Revisado pelo anfitrião</span></div></div></section><section class="vd-note15" role="note"><span class="vd-note15-i" aria-hidden="true">${ic('shield', 22)}</span><div><b>Exige consentimento de menores.</b><p>Festas de 15 anos têm muitos convidados com menos de 18 anos. O uso da imagem deles depende do consentimento do responsável legal, então este tipo de evento já vem com cuidados ligados.</p></div></section><section class="vd-sec" aria-labelledby="muda"><h2 id="muda">O que muda neste tipo de evento</h2><ul class="vd-cards15"><li><span aria-hidden="true">${ic('eye', 22)}</span><p>As fotos passam pela revisão do anfitrião antes de ir para o telão e para o álbum.</p></li><li><span aria-hidden="true">${ic('shield', 22)}</span><p>Quem tem menos de 18 anos só participa com o consentimento do responsável legal, registrado com versão e data.</p></li><li><span aria-hidden="true">${ic('lock', 22)}</span><p>Fotos com menores nunca viram material de marketing do Albora nem de fornecedores. Só com autorização escrita e específica do responsável legal.</p></li><li><span aria-hidden="true">${ic('download', 22)}</span><p>O anfitrião pode apagar qualquer foto e exportar o álbum para a própria nuvem.</p></li></ul></section>`) };
  });

  /* ---------- /f/v/:slug (portal público do fornecedor) ---------- */
  A.route('/f/v/:slug', (ctx) => {
    const v = venSlug(ctx.params.slug); const sim = A.sim().state;
    const casca = (inner, vv) => `<div class="vd-pubwrap" ${vv && vv.tema === 'escuro' ? 'data-theme="noite"' : ''} style="${vv ? brandStyle(vv) : ''}">${inner}</div>`;
    if (!v) return { title: 'Portal não encontrado', html: naoExiste('Não existe um portal com esse endereço.').html };
    A.applyEvent({ cor: v.cor });
    const p = plano(v.plano); const pk = V().pacotes[v.id] || [];
    const mono = `<span class="lg" aria-hidden="true">${v.logo ? `<img src="${esc(v.logo)}" alt="">` : esc(ini(v.nome))}</span>`;
    const top = `<a class="skip" href="#main" data-act="skip">Pular para o conteúdo</a><header class="vd-pubtop"><span class="vd-brand">${mono}<span>${esc(v.nome)}</span></span><nav aria-label="Portal"><a href="#/f/v/${esc(v.slug)}" data-act="p-ancora" data-id="pacotes">Pacotes</a><a href="#/f/v/${esc(v.slug)}" data-act="p-ancora" data-id="contato">Contato</a><a href="#/f/${v.id}/eventos">Entrar</a></nav></header>`;
    const foot = `<footer class="vd-pubfoot"><span>${esc(v.nome)}${v.cidade ? ' · ' + esc(v.cidade) : ''}</span>${p.selo ? `<a class="vd-selo" href="#/p/fornecedores">${A.mark(16)} feito com Albora</a>` : '<span></span>'}</footer>`;
    let main;
    if (sim === 'loading') main = A.skel(4, 80);
    else if (sim === 'error') main = A.errorState({ title: 'Não deu para abrir o portal', body: 'Confira a conexão e tente de novo.' });
    else if (!v.publicado) main = `<div class="empty">${ic('lock', 40)}<h1 class="t-title">Este portal ainda não foi publicado</h1><p>${esc(v.nome)} está preparando a vitrine. Volte em breve ou fale direto com o negócio${v.email ? ': ' + esc(v.email) : ''}.</p></div>`;
    else main = `<section class="vd-vh"><div class="txt"><div class="ttl"><h1>${esc(v.nome)}</h1>${v.cidade ? `<p class="cid">${esc(v.cidade)}</p>` : ''}</div><p class="t-lead">${esc(v.descricao || 'As fotos da sua festa, feitas por quem estava lá.')}</p><a class="btn btn-accent btn-lg" href="#/f/v/${esc(v.slug)}" data-act="p-ancora" data-id="contato">Falar com a gente</a></div><div class="vd-ph" aria-hidden="true"><img src="${A.photo('vit-' + v.slug, 'p')}" alt=""><img src="${A.photo('vit2-' + v.slug, 'l')}" alt=""></div></section>
<section class="vd-sec" id="pacotes" tabindex="-1" aria-labelledby="pk"><h2 id="pk">Pacotes</h2>${pk.length ? `<div class="vd-pk">${pk.map((k) => `<div class="row"><span class="nm">${esc(k.nome)}</span><p>${esc(k.desc)}</p><span class="vl">${A.brl(k.preco).replace(',00', '')}</span></div>`).join('')}</div>` : `<p class="muted">Os pacotes serão publicados em breve. Fale com a gente para um orçamento.</p>`}</section>
<section class="vd-sec" id="contato" tabindex="-1" aria-labelledby="ct"><h2 id="ct">Fale com a gente</h2><div class="split"><form class="stack" data-submit="vd-contato" data-v="${v.id}" novalidate>${A.field({ name: 'nome', label: 'Seu nome', required: true, extra: 'autocomplete="name"' })}${A.field({ name: 'email', label: 'Seu e-mail', type: 'email', required: true, extra: 'autocomplete="email"' })}${A.field({ name: 'msg', label: 'Conte da sua festa', rows: 3, required: true, hint: 'Data, tipo de evento e quantos convidados.' })}<div><button class="btn btn-accent" type="submit">Enviar mensagem</button></div></form><aside class="stack-3"><p class="t-small">Se preferir:</p>${v.email ? `<p><b>${esc(v.email)}</b></p>` : ''}${v.whatsapp ? `<button class="btn btn-line" data-act="wa" data-text="Olá! Vi o portal de ${esc(v.nome)}.">${ic('send', 16)} Chamar no WhatsApp (${esc(v.whatsapp)})</button>` : ''}</aside></div></section>`;
    return { title: v.nome, html: casca(`${top}<main id="main" tabindex="-1" class="vd-pubmain">${main}</main>${foot}`, v) };
  });
  A.acts['vd-contato'] = (form) => {
    const v = A.validate(form, { email: A.rules.email, msg: A.rules.min(10, 'Conte um pouco mais, com pelo menos 10 caracteres.') }); if (!v) return;
    A.busy($('button[type=submit]', form), 700, () => { form.innerHTML = `<div class="banner ok" role="status">${ic('check', 18)}<span><b>Mensagem enviada (simulado).</b> Na versão real o fornecedor receberia por e-mail e responderia para ${esc(v.email)}.</span></div>`; });
  };

  /* ---------- mapa ---------- */
  A.map('Fornecedor (portal B2B2C)', 'Criar meu portal (onboarding com rascunho)', '#/f/novo', 'Passos 1 a 3; rascunho salvo');
  A.map('Fornecedor (portal B2B2C)', 'Eventos dos clientes', '#/f/v1/eventos', 'Busca, filtros, criar evento sob o fornecedor');
  A.map('Fornecedor (portal B2B2C)', 'Clientes e equipe', '#/f/v1/equipe', 'Convidar, papéis, remover; aba Clientes');
  A.map('Fornecedor (portal B2B2C)', 'Marca', '#/f/v1/marca', 'Cor, fundo, logo, estilo, prévia, contraste');
  A.map('Fornecedor (portal B2B2C)', 'Cobrança', '#/f/v1/cobranca', 'Planos, faturas, trocar e cancelar');
  A.map('Fornecedor (portal B2B2C)', 'Assinatura (checkout simulado)', '#/f/v1/checkout', 'PIX ou cartão, simulado');
  A.map('Fornecedor (portal B2B2C)', 'Insights da carteira', '#/f/v1/insights', 'Participação e fotos por evento');
  A.map('Fornecedor (portal B2B2C)', 'Ajustes do portal', '#/f/v1/ajustes', 'Dados, vitrine, pacotes, excluir');
  A.map('Fornecedor (portal B2B2C)', 'Portal com mensalidade atrasada e plano no limite', '#/f/v2/eventos', 'Outro fornecedor, plano Starter');
  A.map('Páginas públicas', 'Portal público do fornecedor', '#/f/v/aurora-cerimonial', 'Vitrine com a marca do fornecedor');
  A.map('Páginas públicas', 'Para fornecedores (marketing)', '#/p/fornecedores', 'Uma tela enxuta');
  A.map('Páginas públicas', 'Privacidade', '#/p/privacidade', 'Resumo com índice');
  A.map('Páginas públicas', 'Festa de 15 anos', '#/p/15-anos', 'Aviso de consentimento de menores');
})();
