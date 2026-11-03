/* console — superfície interna de staff (#/c). Dados fictícios próprios, sessão simulada em A.store, ações gravam auditoria. */
(function () {
  const A = window.A;
  const esc = A.esc, st = A.store;
  const BASE = new Date('2026-10-24T14:30:00').getTime(), MIN = 6e4, HR = 36e5, DAY = 864e5;

  /* ================= util ================= */
  const fold = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fd = (t) => new Date(t).toLocaleDateString('pt-BR');
  const fdt = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fh = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ini = (n) => String(n).split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const mask = (e) => { const [u, d] = String(e).split('@'); return (u[0] || '') + '•••@' + (d || ''); };
  const hex10 = (x) => (A.hash(x).toString(16) + A.hash(x + 'z').toString(16)).slice(0, 10);
  const un = (s) => fold(s).replace(/[^a-z0-9]/g, '');
  const t0 = () => { let v = st.get('cx.t0', 0); if (!v) { v = Date.now(); st.set('cx.t0', v); } return v; };
  const now = () => BASE + (Date.now() - t0());
  const dur = (ms) => { const m = Math.round(ms / MIN); return m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : Math.round(m / 1440) + ' d'; };
  const ago = (t) => A.ago(Math.max(0, Math.round((now() - t) / MIN)));
  const bd = (k, t) => `<span class="badge ${k}">${esc(t)}</span>`;
  const lk = (h, t) => `<a href="${h}" class="cx-lk">${esc(t)}</a>`;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const figs = (a) => `<dl class="cx-figs">${a.map(([l, v, c]) => `<div><dt>${esc(l)}</dt><dd class="${c && +v ? 'crit' : ''}">${v}</dd></div>`).join('')}</dl>`;
  const vazio = ({ title, body = '', cta = '', role = '' }) => `<div class="cx-vz" ${role ? `role="${role}"` : ''}><h3>${esc(title)}</h3>${body ? `<p>${esc(body)}</p>` : ''}${cta}</div>`;

  /* ================= dados fictícios ================= */
  const R = A.rand(20261024), rr = (n) => Math.floor(R() * n), pk = (a) => a[rr(a.length)];
  const NOM = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isadora', 'João', 'Karina', 'Lucas', 'Marcela', 'Nicolas', 'Olívia', 'Paulo', 'Rafaela', 'Samuel', 'Tatiana', 'Vitor', 'Yasmin', 'Caio', 'Débora', 'Eduardo', 'Fernanda', 'Guilherme', 'Larissa', 'Mateus', 'Natália', 'Otávio'];
  const SOB = ['Souza', 'Lima', 'Prado', 'Nunes', 'Barros', 'Melo', 'Ramos', 'Teixeira', 'Rocha', 'Dias', 'Almeida', 'Costa', 'Ferraz', 'Moura', 'Andrade', 'Cardoso', 'Viana', 'Pires', 'Seixas', 'Antunes'];
  const PLV = (A.data.vendor && A.data.vendor.planos) || [];
  const PL = Object.assign({ gratis: 'Grátis', completo: 'Completo' }, Object.fromEntries(PLV.map((p) => [p.id, p.nome])));
  const PRECO = Object.fromEntries(PLV.map((p) => [p.id, p.preco])); /* uma só tabela de planos: A.data.vendor.planos (a mesma do marketing, do checkout e da cobrança) */
  const PAPEL = { leitura: 'Leitura', suporte: 'Suporte', admin: 'Administração' };
  const TIPOEV = { casamento: 'Casamento', aniversario: 'Aniversário', formatura: 'Formatura', corporativo: 'Corporativo', celebracao: 'Celebração' };

  const equipe = [
    { id: 'u1', nome: 'Helena Prado', email: 'helena@albora.app', papel: 'admin', status: 'ativo', ult: BASE - 20 * MIN },
    { id: 'u2', nome: 'Rodrigo Teles', email: 'rodrigo@albora.app', papel: 'admin', status: 'ativo', ult: BASE - 5 * HR },
    { id: 'u3', nome: 'Camila Duarte', email: 'camila@albora.app', papel: 'suporte', status: 'ativo', ult: BASE - 50 * MIN },
    { id: 'u4', nome: 'Bruno Nogueira', email: 'bruno@albora.app', papel: 'suporte', status: 'ativo', ult: BASE - 26 * HR },
    { id: 'u5', nome: 'Letícia Faria', email: 'leticia@albora.app', papel: 'leitura', status: 'ativo', ult: BASE - 3 * DAY },
    { id: 'u6', nome: 'Marcos Vidal', email: 'marcos@albora.app', papel: 'leitura', status: 'convite', ult: 0 },
  ];

  const contas = [];
  const emSet = new Set();
  const mkEmail = (n, dom) => { let e = un(n.split(' ')[0]) + '.' + un(n.split(' ').slice(-1)[0]) + '@' + dom, k = 1; while (emSet.has(e)) e = un(n.split(' ')[0]) + '.' + un(n.split(' ').slice(-1)[0]) + (++k) + '@' + dom; emSet.add(e); return e; };
  for (let i = 0; i < 26; i++) {
    const nome = i === 0 ? 'Marina Almeida' : NOM[(i * 7) % NOM.length] + ' ' + SOB[(i * 3 + (i % 5)) % SOB.length];
    const status = i === 4 || i === 11 || i === 17 || i === 22 || i === 25 ? 'trial' : i === 8 ? 'suspensa' : i === 19 ? 'encerrada' : 'ativa';
    contas.push({ id: 'ac-' + String(i + 1).padStart(2, '0'), nome, email: i === 0 ? 'marina@email.com' : mkEmail(nome, i % 3 ? 'email.com' : 'exemplo.com.br'), tipo: 'anfitriao', plano: i % 5 === 1 || i % 4 === 0 ? 'completo' : 'gratis', status, criada: BASE - (20 + rr(380)) * DAY, ult: BASE - (status === 'encerrada' ? 200 * DAY : rr(40 * 24 * 60) * MIN), consent: [{ v: '2026-08', q: BASE - rr(60) * DAY }] });
  }
  [['Estúdio Luz & Grão', 'contato@luzegrao.com.br', 'studio'], ['Foto Aurora Eventos', 'ola@fotoaurora.com.br', 'agency'], ['Cerimonial Bem Viver', 'agenda@bemviver.com.br', 'starter'], ['Casa Lume Fotografia', 'casalume@exemplo.com.br', 'studio'], ['Studio Maré', 'studio@mare.com.br', 'starter'], ['Agência Entre Amigos', 'eventos@entreamigos.com.br', 'agency'], ['Ateliê Contraluz', 'ateliecontraluz@email.com', 'starter'], ['Brilho de Festa Produções', 'producao@brilhodefesta.com.br', 'studio']].forEach(([nome, email, plano], i) => {
    contas.push({ id: 'ac-' + String(27 + i).padStart(2, '0'), nome, email, tipo: 'fornecedor', plano, status: i === 6 ? 'trial' : i === 3 ? 'suspensa' : 'ativa', criada: BASE - (60 + rr(500)) * DAY, ult: BASE - rr(10 * 24 * 60) * MIN, consent: [{ v: '2026-08', q: BASE - rr(50) * DAY }] });
  });
  const hosts = contas.filter((c) => c.tipo === 'anfitriao'), vendors = contas.filter((c) => c.tipo === 'fornecedor');

  const eventos = [];
  const base3 = A.data.events;
  const CURSOS = ['Direito', 'Medicina', 'Engenharia', 'Odontologia', 'Arquitetura', 'Psicologia'], EMP = ['Atlântica', 'Mercato', 'Vértice', 'Nordeste Log', 'Pampa Seguros'];
  const titulo = (i, tipo) => {
    const a = pk(NOM), b = pk(NOM);
    if (tipo === 'casamento') return `Casamento ${a} & ${b}`;
    if (tipo === 'aniversario') return pk([`Os ${30 + rr(30)} da ${a}`, `Aniversário de ${15 + rr(5) * 5} anos do ${b}`, `Festa de ${a}`]);
    if (tipo === 'formatura') return `Formatura ${pk(CURSOS)} 202${5 + rr(2)}`;
    if (tipo === 'corporativo') return `Confraternização ${pk(EMP)}`;
    return pk([`Chá de bebê da ${a}`, `Batizado do ${b}`, `Reunião de família ${pk(SOB)}`]);
  };
  for (let i = 0; i < 44; i++) {
    const tipo = i === 0 ? 'casamento' : i === 1 ? 'aniversario' : i === 2 ? 'formatura' : ['casamento', 'casamento', 'aniversario', 'celebracao', 'formatura', 'corporativo'][rr(6)];
    let off = Math.round(-400 + i * (490 / 43)) + rr(9) - 4;
    if (i === 0) off = 21; if (i === 1) off = -9; if (i === 2) off = 39; if (i === 20 || i === 21) off = 0;
    const data = BASE - 14.5 * HR + off * DAY;
    const status = off < 0 ? 'encerrado' : off === 0 ? 'ativo' : (i % 2 ? 'rascunho' : 'ativo');
    const esp = [40, 60, 80, 120, 150, 220, 300][rr(7)];
    const host = i === 0 ? hosts[0] : hosts[(i * 5 + 1) % hosts.length];
    const done = off <= 0;
    const conv = done ? Math.round(esp * (0.55 + R() * 0.4)) : 0, part = done ? Math.round(28 + R() * 45) : null, fotos = done ? Math.round(conv * (2 + R() * 6)) : 0;
    eventos.push({ id: 'ev-' + String(i + 1).padStart(2, '0'), titulo: i < 3 ? base3[i].nome : titulo(i, tipo), tipo, hostId: host.id, vendorId: i % 3 === 0 ? vendors[i % vendors.length].id : null, data, esp, conv, fotos, part, status, apagado: false, painel: i < 3 ? base3[i].id : null, funil: done ? [Math.round(conv * 1.25), Math.round(conv * 1.08), conv, Math.round(conv * part / 100)] : null, consent: done ? [['2026-08', Math.round(conv * 0.7)], ['2026-05', conv - Math.round(conv * 0.7)]] : [], plano: host.plano });
  }
  eventos.forEach((e) => { const c = contas.find((x) => x.id === e.hostId); });

  const subs = vendors.map((v, i) => {
    const status = i === 2 ? 'atraso' : i === 4 ? 'pendente' : i === 6 ? 'cancelada' : i === 3 ? 'atraso' : 'ativa';
    const valor = PRECO[v.plano], prox = BASE + (3 + i * 3) * DAY;
    return { id: 's-' + String(i + 1).padStart(2, '0'), contaId: v.id, plano: v.plano, status, valor, prox: status === 'cancelada' ? 0 : prox, atrasoDias: status === 'atraso' ? 6 + i * 3 : 0, canceladaEm: status === 'cancelada' ? BASE - 12 * DAY : 0, cortesia: null,
      pags: [0, 1, 2].map((k) => ({ id: 'p-' + (i + 1) + k, valor, data: prox - (k + 1) * 30 * DAY, status: k === 0 && status === 'atraso' ? 'falhou' : 'pago', reemb: 0 })) };
  });

  const tk = (id, assunto, contaId, prio, status, minAgo, msgs, resp) => {
    const sla = { P0: 60, P1: 240, P2: 1440 }[prio];
    return { id, assunto, contaId, prio, status, criado: BASE - minAgo * MIN, due: BASE - minAgo * MIN + sla * MIN, resp, msgs: msgs.map((m, k) => ({ de: m[0], autor: m[0] === 'cliente' ? null : m[1], ts: BASE - (minAgo - k * 25) * MIN, texto: m[m.length - 1] })) };
  };
  const tickets = [
    tk('T-1048', 'Convidados não conseguem abrir o link do evento', 'ac-05', 'P0', 'aberto', 130, [['cliente', 'Hoje à noite temos a festa e três convidados dizem que o link dá página em branco. O que faço?']], null),
    tk('T-1047', 'Telão não conecta pelo link de uso único', 'ac-12', 'P1', 'aberto', 190, [['cliente', 'Gerei o link do telão mas a TV mostra "link já usado".'], ['equipe', 'Camila Duarte', 'Oi! Gerar um link novo invalida o anterior. Pode gerar outro e abrir só na TV?'], ['cliente', 'Gerei de novo e deu certo, mas caiu depois de 20 minutos.']], 'u3'),
    tk('T-1046', 'Cobrança em duplicidade na assinatura', 'ac-28', 'P1', 'aberto', 60 * 7, [['cliente', 'Fui cobrado duas vezes em setembro, podem estornar uma?']], null),
    tk('T-1045', 'Quero trocar o plano do fornecedor', 'ac-29', 'P2', 'pendente', 60 * 30, [['cliente', 'Queremos migrar de Starter para Studio ainda este mês.'], ['equipe', 'Bruno Nogueira', 'Posso fazer a troca hoje. Você confirma que a cobrança proporcional está ok?']], 'u4'),
    tk('T-1044', 'Fotos sumiram da galeria do evento', 'ac-09', 'P0', 'aberto', 25, [['cliente', 'Vinte fotos aprovadas pararam de aparecer na galeria depois que mudei o filtro.']], null),
    tk('T-1043', 'Como exportar o álbum para a minha nuvem?', 'ac-14', 'P2', 'resolvido', 60 * 52, [['cliente', 'Onde conecto minha nuvem para exportar?'], ['equipe', 'Camila Duarte', 'Em Ajustes › Exportar e apagar. Qualquer dúvida é só chamar.'], ['cliente', 'Achei, obrigada!']], 'u3'),
    tk('T-1042', 'Solicitação de exclusão enviada por e-mail', 'ac-20', 'P1', 'pendente', 60 * 20, [['cliente', 'Quero que apaguem a minha conta e as fotos do meu evento.'], ['equipe', 'Camila Duarte', 'Abrimos o pedido de exclusão na LGPD. Você recebe a confirmação em até 15 dias.']], 'u3'),
    tk('T-1041', 'Erro ao gerar o livro em PDF', 'ac-03', 'P1', 'aberto', 60 * 5, [['cliente', 'O botão de gerar o livro fica girando e nunca termina.'], ['equipe', 'Bruno Nogueira', 'Estamos reproduzindo. O evento tem 1.200 fotos, pode ser o tamanho.'], ['cliente', 'Obrigado, aguardo.']], 'u4'),
    tk('T-1040', 'Convidado bloqueado por engano', 'ac-16', 'P2', 'resolvido', 60 * 80, [['cliente', 'Bloqueei uma pessoa sem querer, como desfaço?'], ['equipe', 'Bruno Nogueira', 'Em Convidados, abra a pessoa e toque em Desbloquear. Feito por aqui também.']], 'u4'),
    tk('T-1039', 'Nota fiscal do plano Completo', 'ac-02', 'P2', 'aberto', 60 * 9, [['cliente', 'Preciso da nota fiscal do pagamento de R$ 199 para a empresa.']], null),
    tk('T-1038', 'Placa do QR saiu cortada na gráfica', 'ac-21', 'P1', 'pendente', 60 * 26, [['cliente', 'A gráfica disse que o arquivo da placa tem sangria errada.'], ['equipe', 'Camila Duarte', 'Pode me mandar o nome da gráfica? Gero uma versão com sangria de 3 mm.']], 'u3'),
    tk('T-1037', 'Fornecedor não vê eventos dos clientes', 'ac-31', 'P1', 'aberto', 60 * 3, [['cliente', 'Convidei três clientes ontem e nenhum evento aparece na minha carteira.']], null),
    tk('T-1036', 'Pedido de ajuda com missões personalizadas', 'ac-07', 'P2', 'fechado', 60 * 130, [['cliente', 'Posso criar missões minhas?'], ['equipe', 'Camila Duarte', 'Pode sim, em Estilo › Missões.']], 'u3'),
    tk('T-1035', 'Reembolso de plano contratado por engano', 'ac-18', 'P2', 'aberto', 60 * 14, [['cliente', 'Contratei o Completo sem querer, dá para devolver?']], null),
  ];

  const DS = (id, tipo, contaId, dias, status, extra) => ({ id, tipo, contaId, recebido: BASE - dias * DAY, prazo: BASE - dias * DAY + 15 * DAY, status, comprovante: '', notas: '', ...(extra || {}) });
  const dsar = [
    DS('L-2026-031', 'exclusao', 'ac-20', 20, 'andamento'), DS('L-2026-032', 'acesso', 'ac-03', 5, 'recebido'), DS('L-2026-033', 'portabilidade', 'ac-14', 9, 'andamento'),
    DS('L-2026-034', 'retificacao', 'ac-07', 16, 'recebido'), DS('L-2026-035', 'acesso', 'ac-21', 2, 'recebido'), DS('L-2026-036', 'exclusao', 'ac-23', 12, 'andamento'),
    DS('L-2026-037', 'acesso', 'ac-10', 30, 'concluido', { comprovante: 'https://docs.exemplo.albora.app/comprovantes/L-2026-037.pdf', notas: 'Cópia enviada por e-mail ao titular.' }),
    DS('L-2026-038', 'portabilidade', 'ac-02', 40, 'concluido', { comprovante: 'https://docs.exemplo.albora.app/comprovantes/L-2026-038.pdf' }), DS('L-2026-039', 'retificacao', 'ac-13', 28, 'recusado', { notas: 'Titular não confirmou a identidade no prazo.' }), DS('L-2026-040', 'exclusao', 'ac-15', 3, 'recebido'),
  ];

  const ETAPAS = [['pos48', 'Álbum liberado (48 h depois)', 2], ['d330', 'Exportar para a nuvem do anfitrião (dia 330)', 330], ['d358', 'Avisar sobre a exclusão (dia 358)', 358], ['d365', 'Apagar mídia e dados do evento (dia 365)', 365]];
  const jobs = [];
  eventos.forEach((e, i) => {
    if (e.status === 'rascunho') return;
    ETAPAS.forEach(([k, rot, d], n) => {
      const due = e.data + d * DAY; let status = due <= BASE ? 'concluido' : 'pendente', erro = '', tent = due <= BASE ? 1 : 0;
      if (k === 'd330' && e.plano === 'gratis') { status = 'pulado'; erro = 'Plano Grátis não inclui exportação para a nuvem.'; tent = 0; }
      if (k === 'd330' && due <= BASE && (i === 5 || i === 9 || i === 13)) { status = 'falhou'; erro = 'A nuvem do anfitrião recusou o acesso (permissão revogada). O anfitrião será avisado.'; tent = 3; }
      if (due > BASE && due < BASE + DAY) status = 'rodando';
      jobs.push({ id: 'j-' + e.id + '-' + k, eventoId: e.id, etapa: k, rot, due, status, tent, erro });
    });
  });

  const ACOES = {
    'sessao.entrou': ['Entrou no console', 'plataforma'], 'sessao.saiu': ['Saiu do console', 'plataforma'], 'sessao.reautenticou': ['Confirmou a própria identidade', 'plataforma'],
    'conta.pii_revelado': ['Revelou o e-mail da conta', 'conta'], 'conta.suspensa': ['Suspendeu a conta', 'conta'], 'conta.reativada': ['Reativou a conta', 'conta'],
    'ticket.respondido': ['Respondeu um ticket', 'ticket'], 'ticket.status': ['Mudou o status de um ticket', 'ticket'], 'ticket.prioridade': ['Mudou a prioridade de um ticket', 'ticket'], 'ticket.atribuido': ['Atribuiu um ticket', 'ticket'], 'ticket.criado': ['Abriu um ticket', 'ticket'],
    'assinatura.plano_trocado': ['Trocou o plano da assinatura', 'assinatura'], 'assinatura.cortesia': ['Concedeu cortesia', 'assinatura'], 'assinatura.cancelada': ['Cancelou a assinatura', 'assinatura'], 'assinatura.reembolso': ['Reembolsou um pagamento', 'pagamento'],
    'lgpd.pedido_criado': ['Abriu um pedido de titular', 'lgpd'], 'lgpd.pedido_atualizado': ['Atendeu um pedido de titular', 'lgpd'], 'lgpd.conta_excluida': ['Executou a exclusão de uma conta', 'lgpd'],
    'impersonacao.pedida': ['Pediu para ver como o cliente', 'impersonacao'], 'impersonacao.aprovada': ['Aprovou ver como o cliente', 'impersonacao'], 'impersonacao.negada': ['Negou ver como o cliente', 'impersonacao'], 'impersonacao.iniciada': ['Começou a ver como o cliente', 'impersonacao'], 'impersonacao.encerrada': ['Encerrou a sessão como cliente', 'impersonacao'],
    'retencao.exportado': ['Exportou o evento para a nuvem', 'evento'], 'retencao.apagado': ['Apagou o evento', 'evento'], 'retencao.reprocessado': ['Tentou de novo uma tarefa de retenção', 'evento'],
    'equipe.convidou': ['Convidou uma pessoa para a equipe', 'equipe'], 'equipe.papel_alterado': ['Mudou o papel de alguém da equipe', 'equipe'], 'equipe.desativada': ['Desativou alguém da equipe', 'equipe'], 'equipe.reativada': ['Reativou alguém da equipe', 'equipe'], 'equipe.acesso_pedido': ['Pediu acesso a uma tela', 'equipe'],
    'auditoria.exportada': ['Exportou o registro de auditoria', 'plataforma'], 'seguranca.reconhecido': ['Reconheceu um alerta de segurança', 'plataforma'],
  };
  const ALVOS = { conta: 'Conta', evento: 'Evento', ticket: 'Ticket', assinatura: 'Assinatura', equipe: 'Equipe', plataforma: 'Plataforma', lgpd: 'Pedido de titular', impersonacao: 'Ver como cliente', pagamento: 'Pagamento', fornecedor: 'Fornecedor' };
  const MOT = ['Cliente pediu ajuda no ticket T-1041.', 'Chargeback confirmado pelo financeiro.', 'Pedido do titular por e-mail, protocolo 2026-0412.', 'Reproduzir o problema relatado antes da festa de sábado.', 'Troca solicitada pelo fornecedor por e-mail.', 'Rotina mensal de retenção.', 'Conferência do prazo legal.', 'Conta com tentativa de acesso suspeita.'];
  const auditoria = [];
  { const codes = Object.keys(ACOES).filter((c) => !c.startsWith('sessao.saiu')); let t = BASE - 90 * MIN;
    for (let i = 0; i < 74; i++) {
      t -= (20 + rr(480)) * MIN; const code = codes[(i * 7 + rr(5)) % codes.length], [rot, alvo] = ACOES[code], u = equipe[(i + rr(4)) % 5];
      let rotulo = 'Plataforma', href = '';
      if (alvo === 'conta' || alvo === 'fornecedor') { const c = contas[(i * 3) % contas.length]; rotulo = c.nome; href = '#/c/contas/' + c.id; }
      else if (alvo === 'evento') { const e = eventos[(i * 5) % eventos.length]; rotulo = e.titulo; href = '#/c/eventos/' + e.id; }
      else if (alvo === 'ticket') { const k = tickets[i % tickets.length]; rotulo = k.id + ' · ' + k.assunto; href = '#/c/suporte?t=' + k.id; }
      else if (alvo === 'assinatura') { const s = subs[i % subs.length]; rotulo = contas.find((c) => c.id === s.contaId).nome; href = '#/c/assinaturas'; }
      else if (alvo === 'pagamento') { const s = subs[i % subs.length]; rotulo = 'Pagamento de ' + A.brl(s.valor) + ' · ' + contas.find((c) => c.id === s.contaId).nome; href = '#/c/assinaturas'; }
      else if (alvo === 'equipe') { const m = equipe[i % equipe.length]; rotulo = m.nome; href = '#/c/equipe-interna'; }
      else if (alvo === 'lgpd') { const d = dsar[i % dsar.length]; rotulo = 'Pedido ' + d.id + ' · ' + contas.find((c) => c.id === d.contaId).nome; href = '#/c/lgpd'; }
      else if (alvo === 'impersonacao') { const c = contas[(i * 2) % 26]; rotulo = 'Ver como ' + c.nome; href = '#/c/contas/' + c.id; }
      auditoria.push({ id: 'a' + i, ts: t, ator: u.nome, atorId: u.id, acao: code, alvo, rotulo, href, ip: hex10('ip' + u.id), motivo: code.startsWith('sessao') ? '' : MOT[(i + rr(3)) % MOT.length], meta: code === 'assinatura.reembolso' ? { valor: A.brl(149), forma: 'Cartão' } : code === 'conta.pii_revelado' ? { campo: 'e-mail' } : {} });
    } }

  const SEC = { 'login.failed': 'Falha de login', 'session.reuse': 'Sessão reaproveitada', 'reauth.failed': 'Falha ao confirmar identidade', 'pii.revealed': 'Dado pessoal revelado', 'export.large': 'Exportação grande', 'role.changed': 'Papel alterado' };
  const seguranca = [];
  { let t = BASE - 3 * HR; const mix = ['login.failed', 'login.failed', 'login.failed', 'pii.revealed', 'login.failed', 'reauth.failed', 'pii.revealed', 'export.large', 'login.failed', 'session.reuse', 'role.changed', 'login.failed'];
    for (let i = 0; i < 40; i++) { t -= (30 + rr(900)) * MIN; const tp = mix[i % mix.length]; const u = equipe[rr(5)];
      seguranca.push({ id: 'x' + i, tipo: tp, ts: t, ator: tp === 'login.failed' && i % 2 ? mask(pk(equipe).email) + ' (tentativa)' : u.nome, ip: hex10('s' + (i % 7)), meta: { 'login.failed': 'Link de e-mail inválido ou expirado', 'session.reuse': 'O mesmo link foi aberto em dois aparelhos', 'reauth.failed': 'Link de confirmação expirado', 'pii.revealed': 'Motivo registrado na auditoria', 'export.large': 'Mais de 5.000 linhas', 'role.changed': 'Mudança feita por administração' }[tp], ack: tp === 'session.reuse' && i > 20 }); } }

  A.data.console = { contas, eventos, assinaturas: subs, tickets, dsar, retencao: jobs, auditoria, seguranca, equipe };

  /* ================= estado mutável (persistente) ================= */
  const SEED = { contas, eventos, subs, tickets, dsar, jobs, auditoria, seguranca, equipe };
  const col = (k) => { const v = st.get('cx.' + k, null); if (v) return v; const c = clone(SEED[k]); st.set('cx.' + k, c); return c; };
  const save = (k, v) => st.set('cx.' + k, v);
  const upd = (k, id, patch) => { const a = col(k); const o = a.find((x) => x.id === id); if (o) Object.assign(o, typeof patch === 'function' ? patch(o) : patch); save(k, a); return o; };
  const conta = (id) => col('contas').find((c) => c.id === id);
  const evento = (id) => col('eventos').find((e) => e.id === id);
  const sess = () => st.get('cx.sess', null);
  const papel = () => (sess() || {}).papel || 'leitura';
  const CAPS = {};
  CAPS.leitura = ['contas.ver', 'eventos.ver', 'subs.ver', 'suporte.ver', 'lgpd.ver', 'ret.ver'];
  CAPS.suporte = [...CAPS.leitura, 'suporte.escrever', 'suporte.atribuir', 'pii.revelar', 'imp.pedir', 'lgpd.executar', 'audit.ver'];
  CAPS.admin = [...CAPS.suporte, 'contas.escrever', 'subs.escrever', 'ret.escrever', 'imp.aprovar', 'lgpd.excluir', 'audit.exportar', 'seg.ver', 'equipe.gerir'];
  const can = (c) => !c || CAPS[papel()].includes(c);
  const reauthOk = () => st.get('cx.reauth', 0) > now();
  const REV = new Set();

  const audit = (acao, alvo, rotulo, href, motivo, meta) => {
    const s = sess() || { nome: 'Sistema', id: 'sys' }; const a = col('auditoria');
    a.unshift({ id: 'a-n' + A.uid(), ts: now(), ator: s.nome, atorId: s.id, acao, alvo: alvo || (ACOES[acao] || [])[1] || 'plataforma', rotulo: rotulo || 'Plataforma', href: href || '', ip: hex10('ip' + s.id), motivo: motivo || '', meta: meta || {} }); save('auditoria', a);
  };
  const secAdd = (tipo, ator, meta) => { const a = col('seguranca'); a.unshift({ id: 'x-n' + A.uid(), tipo, ts: now(), ator, ip: hex10('ip' + (sess() || {}).id), meta, ack: false }); save('seguranca', a); };

  /* ================= estilo (prefixo cx-) ================= */
  const css = document.createElement('style');
  css.textContent = `
.cx{min-height:100dvh;background:var(--bg);color:var(--fg);--accent-text:var(--brasa)}
.cx .page{max-width:var(--w-wide)}.cx .btn-sm,.cx .chip{min-height:44px}
.cx a.chip{text-decoration:none}.cx-lk{color:var(--fg);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line);transition:text-decoration-color var(--dur-1) var(--ease)}.cx-lk:hover{text-decoration-color:var(--fg)}
.cx-who{display:flex;gap:var(--space-3);align-items:center;padding:var(--space-3);border-radius:var(--r-2);background:var(--surface);text-align:left;border:0;width:100%}
.cx .avatar{background:var(--fg);color:var(--bg)}
.cx-sec{border-top:1px solid var(--line-2);padding:var(--space-8) 0}.cx-sec>h2,.cx-sec h2{font:600 var(--fs-md)/1.3 var(--font-body)}.cx-sec>h2{margin-bottom:var(--space-3)}
.cx-kv{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-1) var(--space-4);font-size:var(--fs-sm);margin:0}.cx-kv dt{color:var(--fg-2)}.cx-kv dd{margin:0 0 var(--space-2);word-break:break-word}
@media(min-width:600px){.cx-kv{grid-template-columns:minmax(7rem,11rem) minmax(0,1fr);gap:var(--space-2) var(--space-4)}.cx-kv dd{margin:0}}
.cx-bar{height:var(--space-2);background:var(--surface-2);border-radius:var(--space-1);overflow:hidden}.cx-bar>i{display:block;height:100%;background:var(--fg-3)}
.cx-tool{display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-4)}
.cx-fg{display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap}.cx-fg>.t-small{min-width:9ch}
.cx p svg,.cx .t-small svg,.cx dd svg{display:inline;vertical-align:-2px}
.cx-2p{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-6);align-items:start}
@media(min-width:1001px){.cx-2p{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}
@media(max-width:1000px){.cx-has-t .cx-q{display:none}}
.cx-msg{padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)}.cx-msg:last-child{border:0}.cx-msg.eq{padding-left:var(--space-4);border-left:2px solid var(--fg-3)}
.cx-spark{display:flex;align-items:flex-end;gap:var(--space-1);height:var(--space-12)}.cx-spark i{flex:1;background:var(--fg-3);border-radius:2px 2px 0 0;min-height:2px}
.cx-spk{width:7.5rem;height:var(--space-8)}
.cx-pager{display:flex;gap:var(--space-2);align-items:center;justify-content:center;flex-wrap:wrap;margin-top:var(--space-4)}.cx-pager .btn{min-width:44px;padding:0 var(--space-3)}
.cx-pager .btn[aria-current="page"]{background:var(--fg);color:var(--bg)}
.cx-pager .btn:disabled{opacity:.45}
.cx-count{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--space-2) var(--space-4);margin-bottom:var(--space-2)}
.cx-count .t-small{margin:0}.cx-size{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--fs-sm);color:var(--fg-2)}.cx-size .select{width:auto;min-width:6ch;padding-right:var(--space-6)}
.cx-mono{font:500 var(--fs-xs)/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--fg-2)}
.cx-att{display:flex;gap:var(--space-3);align-items:center;padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);text-decoration:none;color:inherit;transition:background var(--dur-1) var(--ease)}.cx-att:last-child{border:0}.cx-att:hover{background:var(--surface)}
.cx details[open]>*:not(summary){animation:cxin var(--dur-2) var(--ease)}
@keyframes cxin{from{opacity:0}to{opacity:1}}
.cx .cx-filt.ds-fold>summary{border:1px solid var(--line);border-radius:var(--r-pill);padding:0 var(--space-4);max-width:max-content;margin-bottom:var(--space-3)}.cx-filt>.ds-fold-b{display:flex;flex-direction:column;gap:var(--space-3)}
@media(min-width:761px){.cx details.cx-filt>summary{display:none}.cx .cx-filt>.ds-fold-b{flex-direction:row;flex-wrap:wrap;gap:var(--space-2) var(--space-8);padding-bottom:0}}
.cx-login{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:var(--space-5)}.cx-login>div{width:min(29rem,100%)}
@media(min-width:901px){.cx-c .app{grid-template-columns:72px minmax(0,1fr)}.cx-c .rail .brand span.w,.cx-c .rail .cx-who .grow,.cx-c .rail .nav span.l,.cx-c .rail .nav-group,.cx-c .rail .rail-foot .l{display:none}.cx-c .rail{align-items:center;padding-left:var(--space-2);padding-right:var(--space-2)}.cx-c .rail .nav a,.cx-c .rail .nav button{justify-content:center;padding:0;width:48px;position:relative}.cx-c .rail .cx-who{width:auto;padding:var(--space-2);background:none}.cx-c .rail .pill-count{position:absolute;top:2px;right:-2px;min-width:20px;height:20px;padding:0 var(--space-1)}}
.cx .pill-count{font-size:var(--fs-xs)}
@media(min-width:901px) and (max-width:1180px){.cx-who{width:auto;justify-content:center;padding:var(--space-2);background:none}.cx-who>.grow,.cx-who>svg{display:none}}.cx .page-head>.flex>.flex{flex-wrap:wrap}.cx .page-head h1{overflow-wrap:anywhere}.cx .nav a,.cx .nav button{min-height:44px}.cx .table td .btn-sm::before{inset:-6px 0}.cx .page-head .t-lead{font-size:var(--fs-md);color:var(--fg-2)}.cx .banner{flex-wrap:wrap;gap:var(--space-2) var(--space-3)}.cx .banner>.grow{flex:1 1 16rem}.cx .tabbar a,.cx .tabbar button{font-size:var(--fs-xs)}
.cx .crumb{font-size:var(--fs-sm);color:var(--fg-2)}.cx .crumb a{position:relative}.cx .crumb a::before{content:"";position:absolute;inset:-12px 0}
.cx .search{min-height:44px}.cx .search input{min-height:44px;font-size:var(--fs-md)}.cx .search .kbd{margin-left:auto}
.cx .t-small,.cx .muted,.cx-kv dt,.cx .table th{color:var(--fg-2)}
.cx :focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.cx .chip{transition:background var(--dur-1) var(--ease),box-shadow var(--dur-1) var(--ease)}
.cx .chip[aria-pressed="true"]{box-shadow:inset 0 -2px var(--ac)}
.cx .nav a[aria-current="page"]{box-shadow:inset 2px 0 var(--ac)}
.cx-c .rail .brand .t-label{display:none}
.cx-ctx{display:flex;align-items:center;gap:0;flex-wrap:wrap;font-size:var(--fs-sm);line-height:1.3;color:var(--fg-2);min-width:0}
.cx-ctx>span+span::before{content:"\\00b7";margin:0 var(--space-2)}
.cx-ctx b{color:var(--fg);font-weight:600}.cx-ctx .on{color:var(--fg)}.cx-ctx .on::before{content:"";display:inline-block;width:var(--space-2);height:var(--space-2);border-radius:50%;background:var(--ac);margin-right:var(--space-2)}
.cx-ctx-m{padding:0 0 var(--space-3);margin-bottom:var(--space-4);border-bottom:1px solid var(--line-2)}
.cx-fila{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.cx-fila>li{display:grid;grid-template-columns:var(--space-5) minmax(0,1fr) var(--space-4);gap:var(--space-1) var(--space-3);align-items:center;border-bottom:1px solid var(--line-2);min-height:44px;padding:var(--space-2) 0;color:inherit;text-decoration:none;transition:background var(--dur-1) var(--ease)}
.cx-fila>li>a{display:contents;color:inherit;text-decoration:none}
.cx-fila .n{font:600 var(--fs-sm) var(--font-body);color:var(--fg-2);font-variant-numeric:tabular-nums;text-align:right}
.cx-fila .w{min-width:0}.cx-fila .w b{display:block;font-weight:600}.cx-fila .w .t-small{display:block;line-height:1.3}
.cx-fila .p{grid-column:2;grid-row:2;font-size:var(--fs-sm);text-align:left}
@media(min-width:641px){.cx-fila>li{grid-template-columns:var(--space-6) minmax(0,1fr) auto var(--space-4)}.cx-fila .p{grid-column:auto;grid-row:auto;text-align:right;white-space:nowrap}.cx-fila .w b,.cx-fila .w .t-small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.cx-fila>li:hover,.cx-fila>li:focus-within{background:var(--surface)}
.cx-fila a:focus-visible{outline:0}.cx-fila>li:focus-within{outline:2px solid var(--ac);outline-offset:-2px}
.cx-areas{display:flex;flex-wrap:wrap;gap:0 var(--space-5);margin-top:var(--space-3);font-size:var(--fs-sm)}.cx-areas a{display:inline-flex;align-items:center;min-height:44px}
.cx-figs{display:flex;flex-wrap:wrap;margin:0 0 var(--space-5);border-top:1px solid var(--line);border-bottom:1px solid var(--line-2)}
.cx-figs>div{padding:var(--space-3) var(--space-6) var(--space-3) 0;margin-right:var(--space-6);min-width:7.5rem}
.cx-figs dt{font-size:var(--fs-sm);color:var(--fg-2)}.cx-figs dd{margin:var(--space-1) 0 0;font:600 var(--fs-xl)/1.1 var(--font-body);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.cx-vz{padding:var(--space-6) 0;border-top:1px solid var(--line-2);max-width:56ch}.cx-vz h3{font:600 var(--fs-md)/1.3 var(--font-body);margin:0 0 var(--space-2)}.cx-vz p{margin:0 0 var(--space-3);color:var(--fg-2)}
.cx-note{display:flex;gap:var(--space-2);align-items:flex-start;font-size:var(--fs-sm);color:var(--fg-2);padding:var(--space-2) 0;border-bottom:1px solid var(--line-2)}
.cx-hist{height:var(--space-6);width:7em;display:inline-flex;vertical-align:middle;margin-right:var(--space-3)}.cx-hist i{height:var(--h,10%)}
.cx-risk{display:flex;align-items:center;gap:var(--space-2);margin:0 0 var(--space-3);font-size:var(--fs-sm);color:var(--fg-2)}
.cx .num{font-variant-numeric:tabular-nums}.cx .table td,.cx-fila .p,.cx-ctx{font-variant-numeric:tabular-nums}
/* tabelas: lista em cartões abaixo de 760 (cada linha = 2–3 campos + "Detalhes"), tabela compacta de 760 a 1099, tabela completa a partir de 1100. Medido no .table-wrap, não na janela. */
.cx .table-wrap{container:cxt/inline-size;overflow-x:auto}
.cx .table:not(.cx-led),.cx .table:not(.cx-led) tbody,.cx .table:not(.cx-led) thead{display:block}
.cx .table:not(.cx-led) thead tr{display:flex;flex-wrap:wrap;align-items:center;gap:0 var(--space-2);border-bottom:1px solid var(--line)}
.cx .table:not(.cx-led) thead tr::before{content:"Ordenar por";font-size:var(--fs-sm);color:var(--fg-2)}
.cx .table:not(.cx-led) thead:not(:has(button)){display:none}
.cx .table:not(.cx-led) th{display:none;border:0;padding:0}
.cx .table:not(.cx-led) th.cx-t:has(button),.cx .table:not(.cx-led) th.cx-s:has(button){display:block}
.cx .table th button{position:relative;min-height:var(--space-8);padding:0 var(--space-1);cursor:pointer}.cx .table th button::before{content:"";position:absolute;inset:-6px 0}
.cx .table:not(.cx-led) tbody tr{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-1) var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);transition:background var(--dur-1) var(--ease)}
.cx .table:not(.cx-led) td{display:block;padding:0;border:0;white-space:normal;max-width:none;overflow:visible;line-height:1.3;font-size:var(--fs-sm);text-align:left}
.cx .table:not(.cx-led) td.cx-t{order:-1;flex:1 1 100%;font-size:var(--fs-md)}
.cx .table:not(.cx-led) td.cx-s::before{content:attr(data-l) ": ";color:var(--fg-2)}
.cx .table:not(.cx-led) td.cx-md,.cx .table:not(.cx-led) td.cx-k{display:none}
.cx-kv>div{display:contents}
.cx .table:not(.cx-led) td.cx-a{margin-left:auto}.cx .table:not(.cx-led) td.cx-tgc{margin-left:auto}.cx .table:not(.cx-led) td.cx-a+td.cx-tgc{margin-left:0}
.cx .table:not(.cx-led) tr.cx-dt{display:none}.cx .table:not(.cx-led) tr.is-open+tr.cx-dt{display:block;border-bottom:1px solid var(--line-2);padding:0 0 var(--space-3)}
.cx .table:not(.cx-led) tr.cx-dt td{display:block}
.cx .table tr.is-open td{background:none}
.cx .table td .btn-sm{min-height:44px}
.cx .table .cx-tg .cx-chev{transition:transform var(--dur-1) var(--ease)}.cx .table .cx-tg[aria-expanded="true"] .cx-chev{transform:rotate(180deg)}
.cx .table:not(.cx-led) tr.is-link:hover td,.cx .table:not(.cx-led) tr:hover td{background:none}.cx .table:not(.cx-led) tbody tr:hover{background:var(--surface)}
.cx-led,.cx-led tbody,.cx-led thead{display:block}.cx-led thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cx-led thead tr{overflow:hidden}.cx-led tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-1) var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)}
.cx-led th,.cx-led td{display:block;padding:0;border:0}.cx-led td:nth-child(3){grid-column:1/-1;font-size:var(--fs-sm)}
.cx-led th{font:400 var(--fs-sm) var(--font-body);letter-spacing:0;color:var(--fg);white-space:normal}.cx-led td:nth-child(2){font:600 var(--fs-md) var(--font-body);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.cx-led tr.sep{border-top:1px solid var(--line)}.cx-led tr:hover td{background:none}
.cx-lt td.cx-s::before{content:attr(data-l) ": ";color:var(--fg-2)}
@container cxt (min-width:760px){
.cx .table:not(.cx-led) thead:not(:has(button)){display:table-header-group}
.cx .table:not(.cx-led){display:table}.cx .table:not(.cx-led) thead{display:table-header-group}.cx .table:not(.cx-led) tbody{display:table-row-group}
.cx .table:not(.cx-led) thead tr,.cx .table:not(.cx-led) tbody tr{display:table-row}.cx .table:not(.cx-led) thead tr::before{content:none}
.cx .table:not(.cx-led) th,.cx .table:not(.cx-led) th.cx-t:has(button),.cx .table:not(.cx-led) th.cx-s:has(button){display:table-cell;padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--line)}
.cx .table:not(.cx-led) th.cx-md,.cx .table:not(.cx-led) td.cx-md{display:none}
.cx .table:not(.cx-led) td.cx-k,.cx .table:not(.cx-led) th.cx-k:has(button),.cx .table:not(.cx-led) th.cx-k{display:table-cell}
.cx-kv>div.cx-kk{display:none}
.cx .table:not(.cx-led) td{display:table-cell;padding:var(--space-1) var(--space-3);border-bottom:1px solid var(--line-2);white-space:nowrap;max-width:16rem;overflow:hidden;text-overflow:ellipsis;font-size:var(--fs-sm)}
.cx .table:not(.cx-led) td.cx-t{font-size:var(--fs-sm)}
.cx .table:not(.cx-led) td.num,.cx .table:not(.cx-led) th.num{text-align:right}
.cx .table:not(.cx-led) td .t-small{white-space:normal}
.cx .table:not(.cx-led) td.cx-s::before,.cx-lt td.cx-s::before{content:none}
.cx .table:not(.cx-led) td.cx-a,.cx .table:not(.cx-led) td.cx-tgc{margin-left:0}
.cx .table:not(.cx-led) tr:hover td{background:var(--surface)}.cx .table:not(.cx-led) tbody tr:hover{background:none}
.cx .table:not(.cx-led) tr.cx-dt,.cx .table:not(.cx-led) tr.is-open+tr.cx-dt{display:none}
.cx .table:not(.cx-led) tr.is-open+tr.cx-dt{display:table-row;border:0;padding:0}.cx .table:not(.cx-led) tr.is-open+tr.cx-dt td{display:table-cell;white-space:normal;max-width:none;background:var(--surface)}
.cx .table:not(.cx-led) tr.is-open td{background:none}
.cx .table:not(.cx-led) td.cx-tgc,.cx .table:not(.cx-led) th.cx-tgc{width:1%}
.cx-q .table:not(.cx-led) td{white-space:normal;max-width:none}.cx-q .table:not(.cx-led) td:first-child{white-space:nowrap;max-width:14rem}
.cx .table td details[open]{white-space:normal}
.cx .table td .btn-sm{min-height:var(--space-8)}
.cx-led,.cx-led tbody,.cx-led thead{display:revert}.cx-led thead{position:static;width:auto;height:auto;overflow:visible;clip:auto}
.cx-led tr{display:table-row;padding:0}.cx-led th,.cx-led td{display:table-cell;padding:var(--space-3);border-bottom:1px solid var(--line-2)}.cx-led thead th{font:500 var(--fs-xs) var(--font-body);color:var(--fg-2);border-bottom:1px solid var(--line)}
.cx-led td:nth-child(3){grid-column:auto}.cx-led th:first-child{width:34%}.cx-led tr.sep th,.cx-led tr.sep td{border-top:1px solid var(--line)}
}
${[[9, 900], [10, 1060], [13, 1300]].map(([k, w]) => `@container cxt (min-width:${w}px){
.cx .table.cx-f${k}:not(.cx-led) th.cx-md,.cx .table.cx-f${k}:not(.cx-led) td.cx-md{display:table-cell}
.cx .table.cx-f${k}:not(.cx-led) td.cx-tgc,.cx .table.cx-f${k}:not(.cx-led) th.cx-tgc,.cx .table.cx-f${k}:not(.cx-led) tr.cx-dt,.cx .table.cx-f${k}:not(.cx-led) tr.is-open+tr.cx-dt{display:none}
}`).join('\n')}
/* sem cursor o :hover gruda depois do toque: devolve o valor base */
@media(hover:none){
.cx-lk:hover{text-decoration-color:var(--line)}
.cx-att:hover{background:none}
.cx-fila>li:hover:not(:focus-within){background:none}
.cx .table:not(.cx-led) tbody tr:hover{background:none}
}
`;
  document.head.appendChild(css);

  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || !location.hash.startsWith('#/c') || document.querySelector('.modal,[role="dialog"],[role="menu"]')) return;
    const t = e.target, tag = (t.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
    const i = A.$('.cx-tool input[type=search]'); e.preventDefault(); if (i) { i.focus(); i.select(); } else A.openPalette && A.openPalette();
  });
  /* ================= tema fixo claro; restaura ao sair ================= */
  const light = () => document.documentElement.setAttribute('data-host-theme', 'light');
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/c')) A.applyTheme(); });

  /* ================= navegação, shell ================= */
  const counts = () => {
    const tk = col('tickets').filter((t) => t.status === 'aberto').length, dl = col('dsar').filter((d) => ['recebido', 'andamento'].includes(d.status)).length, rt = col('jobs').filter((j) => j.status === 'falhou').length, sb = col('subs').filter((s) => s.status === 'atraso').length, sg = col('seguranca').filter((x) => x.tipo === 'session.reuse' && !x.ack).length;
    return { suporte: tk, lgpd: dl, retencao: rt, assinaturas: sb, seguranca: can('seg.ver') ? sg : 0 };
  };
  const NAV = [
    { id: 'visao', label: 'Visão geral', icon: 'chart', href: '#/c' },
    { g: 'Negócio', id: 'contas', label: 'Contas', icon: 'users', href: '#/c/contas', cap: 'contas.ver' }, { g: 'Negócio', id: 'eventos', label: 'Eventos', icon: 'calendar', href: '#/c/eventos', cap: 'eventos.ver' }, { g: 'Negócio', id: 'assinaturas', label: 'Assinaturas', icon: 'wallet', href: '#/c/assinaturas', cap: 'subs.ver' },
    { g: 'Operação', id: 'suporte', label: 'Suporte', icon: 'chat', href: '#/c/suporte', cap: 'suporte.ver' }, { g: 'Operação', id: 'retencao', label: 'Retenção', icon: 'clock', href: '#/c/retencao', cap: 'ret.ver' },
    { g: 'Governança', id: 'lgpd', label: 'LGPD', icon: 'shield', href: '#/c/lgpd', cap: 'lgpd.ver' }, { g: 'Governança', id: 'auditoria', label: 'Auditoria', icon: 'list', href: '#/c/auditoria', cap: 'audit.ver' }, { g: 'Governança', id: 'seguranca', label: 'Segurança', icon: 'lock', href: '#/c/seguranca', cap: 'seg.ver' }, { g: 'Governança', id: 'equipe', label: 'Equipe interna', icon: 'building', href: '#/c/equipe-interna', cap: 'equipe.gerir' },
  ];
  const navFor = () => NAV.filter((n) => can(n.cap));

  function banners() {
    let h = '';
    const imp = st.get('cx.impAtivo', null), s = sess();
    if (imp) { const c = conta(imp), i = imps()[imp];
      if (c && i && i.expira > now()) h += `<div class="banner bad" role="status" style="margin-bottom:var(--space-4)">${A.icon('eye', 20)}<span class="grow"><b>Você está vendo como ${esc(c.nome)}.</b> Sessão da equipe, registrada na auditoria. Termina às ${fh(i.expira)}.</span><button class="btn btn-sm btn-line" data-act="cxdo" data-flow="impEncerrar" data-a="${c.id}">Encerrar sessão</button></div>`; }
    if (can('imp.aprovar')) { const all = imps(); const pend = Object.entries(all).filter(([id, v]) => v.estado === 'pendente' && v.porId !== (s || {}).id);
      pend.slice(0, 2).forEach(([id, v]) => { const c = conta(id); if (!c) return; h += `<div class="banner warn" style="margin-bottom:var(--space-3)">${A.icon('eye', 20)}<span class="grow"><b>${esc(v.porNome)}</b> pede para ver como <b>${esc(c.nome)}</b>: ${esc(v.motivo)}</span><button class="btn btn-sm btn-line" data-act="cxdo" data-flow="impDecidir" data-a="${id}" data-b="aprovar">Aprovar</button><button class="btn btn-sm btn-quiet" data-act="cxdo" data-flow="impDecidir" data-a="${id}" data-b="negar">Negar</button></div>`; }); }
    return h;
  }

  function shell(ctx, o, content) {
    light(); A.applyEvent(null); const s = sess(), n = counts(), collapsed = st.get('cx.collapsed', false);
    const groups = []; navFor().forEach((it) => { const lab = it.g || ''; let g = groups.find((x) => x.label === lab); if (!g) { g = { label: lab, items: [] }; groups.push(g); } g.items.push({ ...it, badge: n[it.id] || '' }); });
    const who = `<button class="cx-who" data-act="cxmenu" aria-haspopup="menu" title="${esc(s.nome)} · ${esc(PAPEL[s.papel])}" aria-label="Menu de ${esc(s.nome)}"><span class="avatar" aria-hidden="true">${esc(ini(s.nome))}</span><span class="grow"><b class="t-h" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.nome)}</b><span class="t-small">${esc(PAPEL[s.papel])}</span></span>${A.icon('chevdown', 16)}</button>`;
    const foot = `<button data-act="cxcollapse" aria-pressed="${collapsed}" class="hide-sm">${A.icon(collapsed ? 'chevron' : 'chevleft', 20)}<span class="l">${collapsed ? 'Expandir menu' : 'Recolher menu'}</span></button>`;
    const imp = st.get('cx.impAtivo', null), ic = imp && conta(imp), ii = imp && imps()[imp], vendo = ic && ii && ii.expira > now();
    const strip = `<span>Papel <b>${esc(PAPEL[s.papel])}</b></span><span class="hide-sm">${esc(s.nome)}</span><span>${reauthOk() ? 'Identidade confirmada' + (st.get('cx.reauth', 0) - now() < DAY ? ' até ' + fh(st.get('cx.reauth', 0)) : '') : 'Identidade não reconfirmada'}</span><span class="${vendo ? 'on' : ''}">${vendo ? `Vendo como <a class="cx-lk" href="#/c/contas/${ic.id}"><b>${esc(ic.nome)}</b></a> até ${fh(ii.expira)}` : 'Ver como: nenhum'}</span>`;
    const top = `<div class="grow only-sm"><span style="display:inline-flex;align-items:center;gap:var(--space-2)"><span role="img" aria-label="Albora">${A.logo(22)}</span><span class="t-label">console</span></span></div><div class="grow cx-ctx hide-sm" role="status" aria-label="Contexto da sessão">${strip}</div><button class="btn btn-quiet btn-icon only-sm" data-act="cxmenu" aria-haspopup="menu" aria-label="Menu de ${esc(s.nome)}"><span class="avatar" aria-hidden="true">${esc(ini(s.nome))}</span></button><button class="btn btn-line btn-sm" data-act="palette" aria-label="Buscar conta, evento ou ticket (Ctrl K)">${A.icon('search', 18)}<span class="hide-sm">Buscar conta, evento, ticket…</span><span class="kbd hide-sm">⌘K</span></button>`;
    const stripM = `<div class="cx-ctx cx-ctx-m only-sm" role="status" aria-label="Contexto da sessão">${strip}</div>`;
    const tabs = [{ id: 'visao', label: 'Visão', icon: 'chart', href: '#/c' }, { id: 'contas', label: 'Contas', icon: 'users', href: '#/c/contas' }, { id: 'eventos', label: 'Eventos', icon: 'calendar', href: '#/c/eventos' }, { id: 'suporte', label: 'Suporte', icon: 'chat', href: '#/c/suporte', badge: n.suporte }, { label: 'Mais', icon: 'more', act: 'cxmore' }];
    const head = o.title ? A.pageHead({ crumbs: o.crumbs || [{ label: 'Console', href: '#/c' }, { label: o.title }], title: o.title, lead: o.lead || '', actions: o.actions || '' }) : '';
    const html = `<div class="cx ${collapsed ? 'cx-c' : ''}">${A.layout({ brand: 'albora', mark: 'a', tag: 'console', ctx: who, groups, active: o.id, foot, top, tabs, pageClass: 'wide', navLabel: 'Domínios do console' }, stripM + banners() + head + content)}</div>`;
    return { title: (o.title || 'Console') + ' · Console', html, after: (root) => { resume(); o.after && o.after(root); } };
  }

  /* ================= erros de rota ================= */
  function negado(ctx, o) {
    const exige = CAPS.suporte.includes(o.cap) ? 'Suporte ou Administração' : 'Administração';
    return shell(ctx, { id: o.id, title: o.nome || 'Sem permissão', crumbs: [{ label: 'Console', href: '#/c' }, { label: o.nome || 'Sem permissão' }] }, `<div class="cx-vz" role="alert"><h2 class="t-title" style="margin-bottom:var(--space-2)">Seu papel não abre esta tela</h2><p>Você está como <b>${esc(PAPEL[papel()])}</b>. “${esc(o.nome)}” é para quem tem o papel <b>${exige}</b>. Nada foi alterado.</p><div class="flex flex-wrap"><button class="btn btn-primary" data-act="cxpedir" data-n="${esc(o.nome)}">Pedir acesso a uma pessoa da administração</button><a class="btn btn-line" href="#/c">Voltar à visão geral</a></div><p class="t-small">Protótipo: troque o papel no menu do seu perfil (canto inferior esquerdo) para ver a tela.</p></div>`);
  }
  function naoAchou(ctx, o = {}) {
    return shell(ctx, { id: o.id, title: 'Página não encontrada', crumbs: [{ label: 'Console', href: '#/c' }, { label: 'Não encontrada' }] }, `<div class="cx-vz" role="alert"><h2 class="t-title" style="margin-bottom:var(--space-2)">${esc(o.msg || 'Esta página não existe no console')}</h2><p>${esc(o.hint || 'O endereço pode estar errado ou o item foi removido. Use o menu ou a busca (Ctrl K) para achar o que procura.')}</p><div class="flex flex-wrap">${o.back ? `<a class="btn btn-primary" href="${o.back[0]}">${esc(o.back[1])}</a>` : '<a class="btn btn-primary" href="#/c">Voltar à visão geral</a>'}<button class="btn btn-line" data-act="palette">Buscar no console</button></div></div>`);
  }
  A.acts.cxpedir = (el) => { audit('equipe.acesso_pedido', 'equipe', el.dataset.n, '', 'Pedido de acesso a ' + el.dataset.n); A.toast('Pedido enviado à administração (simulado: na versão real, chega por e-mail).'); };

  /* ================= roteamento com guarda ================= */
  let lastPath = '';
  function RT(pattern, o, fn) {
    A.route(pattern, (ctx) => {
      light(); const s = sess(); const path = ctx.path + (location.hash.includes('?') ? '?' + location.hash.split('?')[1] : '');
      if (!s) { setTimeout(() => (location.hash = '#/c/entrar?next=' + encodeURIComponent(path)), 0); return { html: '<main class="page narrow" id="main"><div class="empty"><div class="spinner" aria-label="Indo para a entrada"></div></div></main>' }; }
      if (ctx.path !== lastPath) { REV.clear(); lastPath = ctx.path; }
      if (o.cap && !can(o.cap)) return negado(ctx, o);
      return fn(ctx, s);
    });
  }

  /* ================= tabela genérica ================= */
  const TB = {}, TS = {}, DEB = {};
  const tstate = (k) => (TS[k] = TS[k] || { q: '', sort: TB[k].sort || null, page: 1, size: 0, open: {}, f: Object.assign({}, TB[k].def || {}) });
  function rowsOf(k) {
    const c = TB[k], s = tstate(k); let rows = c.rows(); const q = fold(s.q);
    if (q) rows = rows.filter((r) => fold(c.text(r)).includes(q));
    (c.filters || []).forEach((f) => { const v = s.f[f.k]; if (v && v !== 'todos') rows = rows.filter((r) => f.test(r, v)); });
    if (c.extra) rows = c.extra(rows, s);
    if (s.sort) { const col = c.cols.find((x) => x.k === s.sort.k); rows = [...rows].sort((a, b) => { const x = col.sort(a), y = col.sort(b); const d = typeof x === 'string' ? x.localeCompare(y, 'pt-BR') : x - y; return s.sort.dir === 'asc' ? d : -d; }); }
    return rows;
  }
  const active = (k) => { const s = tstate(k); return !!s.q || Object.entries(s.f).some(([a, v]) => v && v !== 'todos' && !(TB[k].def && TB[k].def[a] === v && false)) || (TB[k].hasExtra && TB[k].hasExtra(s)); };
  function tableBody(k) {
    const c = TB[k], s = tstate(k);
    return A.stateful({
      isEmpty: () => c.rows().length === 0,
      empty: vazio({ title: c.empty.title, body: c.empty.body, cta: c.empty.cta || '' }),
      ok: () => {
        const rows = rowsOf(k), n = rows.length, size = s.size || c.size || 15, pages = Math.max(1, Math.ceil(n / size)); s.page = Math.min(s.page, pages);
        const slice = rows.slice((s.page - 1) * size, s.page * size), total = c.rows().length;
        if (!n) return `<div aria-live="polite">${vazio({ title: 'Nada com esses filtros', body: 'Nenhum resultado para a busca e os filtros escolhidos. Limpe os filtros para ver tudo.', cta: `<button class="btn btn-line" data-act="cxclear" data-t="${k}">Limpar busca e filtros</button>` })}</div>`;
        const hasD = c.cols.some((x) => x.m === 'd' || x.m === 'k'), cn = (x) => 'cx-' + x.m + (x.m === 'd' ? ' cx-md' : '');
        const th = c.cols.map((x) => `<th scope="col" class="${cn(x)} ${x.num ? 'num' : ''}" ${x.sort ? `aria-sort="${s.sort && s.sort.k === x.k ? (s.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}>${x.sort ? `<button data-act="cxsort" data-t="${k}" data-c="${x.k}" aria-label="Ordenar por ${esc(x.label)}">${esc(x.label)}${A.icon('sort', 14)}</button>` : esc(x.label)}</th>`).join('') + (hasD ? '<th scope="col" class="cx-tgc"><span class="sr-only">Detalhes</span></th>' : '');
        const tr = slice.map((r) => { const h = c.href ? c.href(r) : '', op = !!s.open[r.id], did = 'dt-' + k + '-' + r.id;
          let o = `<tr class="${h ? 'is-link' : ''} ${c.rowCls ? c.rowCls(r) : ''} ${op ? 'is-open' : ''}" ${h ? `data-act="cxrow" data-href="${esc(h)}"` : ''}>${c.cols.map((x) => `<td class="${cn(x)} ${x.num ? 'num' : ''}" data-l="${esc(x.label)}">${x.render(r)}</td>`).join('')}${hasD ? `<td class="cx-tgc"><button class="btn btn-sm btn-quiet cx-tg" data-act="cxtg" data-t="${k}" data-id="${esc(r.id)}" aria-expanded="${op}" aria-controls="${esc(did)}">Detalhes ${A.icon('chevdown', 16, 'cx-chev')}</button></td>` : ''}</tr>`;
          if (hasD) o += `<tr class="cx-dt" id="${esc(did)}"><td colspan="${c.cols.length + 1}"><dl class="cx-kv">${c.cols.filter((x) => x.m === 'd' || x.m === 'k').map((x) => `<div class="${x.m === 'k' ? 'cx-kk' : ''}"><dt>${esc(x.label)}</dt><dd>${x.render(r)}</dd></div>`).join('')}</dl></td></tr>`;
          return o; }).join('');
        const pg = pages > 1 ? pager(k, s.page, pages) : '';
        const sz = `<label class="cx-size">Linhas por página<select class="select" id="cxsz-${k}" data-change="cxsize" data-t="${k}">${[10, 15, 25, 50].concat([c.size || 15]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((v) => `<option value="${v}" ${v === size ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
        return `<div class="cx-count"><p class="t-small" aria-live="polite">${A.pt(n)} ${n === 1 ? 'resultado' : 'resultados'}${n !== total ? ` de ${A.pt(total)}` : ''} · página ${s.page} de ${pages}${s.sort ? ' · ordenado sobre todos os resultados' : ''}</p>${sz}</div><div class="table-wrap"><table class="table cx-f${c.full || 9}"><caption class="sr-only">${esc(c.caption || c.title || '')}</caption><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>${pg}`;
      },
    });
  }
  function pager(k, p, pages) {
    const set = new Set([1, pages, p, p - 1, p + 1]); if (pages <= 7) for (let i = 1; i <= pages; i++) set.add(i);
    const arr = [...set].filter((x) => x >= 1 && x <= pages).sort((a, b) => a - b); let out = '', prev = 0;
    arr.forEach((x) => { if (prev && x - prev > 1) out += '<span class="muted" aria-hidden="true">…</span>'; out += `<button class="btn btn-sm btn-line" data-act="cxpage" data-t="${k}" data-p="${x}" ${x === p ? 'aria-current="page"' : ''} aria-label="Página ${x}">${x}</button>`; prev = x; });
    return `<nav class="cx-pager" aria-label="Páginas"><button class="btn btn-sm btn-line" data-act="cxpage" data-t="${k}" data-p="${p - 1}" ${p === 1 ? 'disabled' : ''}>${A.icon('chevleft', 16)} Anterior</button>${out}<button class="btn btn-sm btn-line" data-act="cxpage" data-t="${k}" data-p="${p + 1}" ${p === pages ? 'disabled' : ''}>Próxima ${A.icon('chevron', 16)}</button></nav>`;
  }
  function tableHTML(k) {
    const c = TB[k], s = tstate(k);
    const chips = (c.filters || []).map((f) => `<div class="cx-fg" role="group" aria-label="Filtrar por ${esc(f.label)}"><span class="t-small">${esc(f.label)}</span><div class="chips" data-single="1">${[['todos', 'Todos'], ...f.opts].map(([v, l]) => `<button class="chip" data-act="cxflt" data-t="${k}" data-f="${f.k}" data-v="${v}" aria-pressed="${(s.f[f.k] || 'todos') === v}">${esc(l)}</button>`).join('')}</div></div>`).join('');
    const nAct = Object.entries(s.f).filter(([a, v]) => v && v !== "todos").length, chipsBox = chips ? `<details class="cx-filt ds-fold sem-borda" ${innerWidth > 760 ? "open" : ""}><summary>Filtros${nAct ? " (" + nAct + " ativos)" : ""}</summary><div class="ds-fold-b">${chips}</div></details>` : "";
    return `<div class="cx-tool"><div class="search" style="width:min(26rem,100%)">${A.icon('search', 18)}<input type="search" aria-label="${esc(c.searchLabel || 'Buscar')}" placeholder="${esc(c.searchLabel || 'Buscar')}" value="${esc(s.q)}" data-input="cxq" data-t="${k}" autocomplete="off" aria-keyshortcuts="/"><span class="kbd hide-sm" aria-hidden="true">/</span></div>${chipsBox}${c.toolExtra ? c.toolExtra(s) : ''}</div><div data-tbl="${k}">${tableBody(k)}</div>`;
  }
  function refresh(k) {
    const box = A.$('[data-tbl="' + k + '"]'); if (!box) return A.render(); const ae = document.activeElement; let sel = '';
    if (ae && box.contains(ae)) { const d = ae.dataset; sel = d.act ? `[data-act="${d.act}"]` + (d.c ? `[data-c="${d.c}"]` : '') + (d.p ? `[data-p="${d.p}"]` : '') : ''; }
    box.innerHTML = tableBody(k); if (sel) { (A.$(sel, box) || A.$('.cx-pager button:not([disabled])', box))?.focus(); }
  }
  A.inputs.cxq = (el, e, d) => { const s = tstate(d.t); s.q = el.value; clearTimeout(DEB[d.t]); DEB[d.t] = setTimeout(() => { s.page = 1; refresh(d.t); }, 250); };
  A.acts.cxsort = (el, e, d) => { const s = tstate(d.t); s.sort = s.sort && s.sort.k === d.c ? { k: d.c, dir: s.sort.dir === 'asc' ? 'desc' : 'asc' } : { k: d.c, dir: 'asc' }; s.page = 1; refresh(d.t); };
  A.acts.cxpage = (el, e, d) => { tstate(d.t).page = +d.p; refresh(d.t); const r = A.$('[data-tbl="' + d.t + '"]'); r && r.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  A.acts.cxflt = (el, e, d) => { const s = tstate(d.t); s.f[d.f] = d.v; s.page = 1; A.$$('.chip', el.parentElement).forEach((x) => x.setAttribute('aria-pressed', x === el)); refresh(d.t); };
  A.acts.cxclear = (el, e, d) => { const s = tstate(d.t); s.q = ''; s.f = {}; s.page = 1; if (TB[d.t].reset) TB[d.t].reset(s); A.render(); };
  A.acts.cxrow = (el) => { location.hash = el.dataset.href; };
  A.acts.cxtg = (el, e, d) => { const s = tstate(d.t), on = el.getAttribute('aria-expanded') !== 'true'; if (on) s.open[d.id] = 1; else delete s.open[d.id]; el.setAttribute('aria-expanded', on); el.closest('tr').classList.toggle('is-open', on); };
  A.inputs.cxsize = (el, e, d) => { const s = tstate(d.t); s.size = +el.value; s.page = 1; refresh(d.t); const n = A.$('#cxsz-' + d.t); n && n.focus(); };
  const preset = (k, f, v) => { if (v) tstate(k).f[f] = v; };

  /* ================= fluxos de ação (motivo, reauth, confirmação, auditoria) ================= */
  const FLOWS = {};
  A.acts.cxdo = (el, e, d) => { const f = FLOWS[d.flow]; if (f) f({ a: d.a, b: d.b }); };
  A.acts.cxform = (form) => { const b = A.$('[data-mi="1"]', form.closest('.modal')); b && b.click(); };
  const RISCO = { rev: ['ok', 'Dá para desfazer logo depois'], rec: ['warn', 'Dá para reverter depois, com registro'], irrev: ['bad', 'Não dá para desfazer'] };
  const riscoTag = (r) => (r ? `<p class="cx-risk">${bd(RISCO[r][0], RISCO[r][1])}${r === 'irrev' ? '<span>Pedimos confirmação de identidade, motivo e que você digite o nome.</span>' : r === 'rec' ? '<span>Pedimos motivo e confirmação.</span>' : ''}</p>` : '');
  const MOTIVO = 'Explique o motivo em pelo menos 10 caracteres: ele fica no registro de auditoria.';
  function pedirReauth(key, args, title, why) {
    A.modal({ title: 'Confirme que é você primeiro', body: `<p>“${esc(title)}” mexe em dados sensíveis, então pedimos a confirmação da sua identidade. Ela vale 15 minutos. Depois você volta para esta mesma tela e a ação continua de onde parou.</p>`, actions: [{ label: 'Agora não', variant: 'btn-quiet', value: false }, { label: 'Confirmar minha identidade', variant: 'btn-primary', onClick: () => { st.set('cx.pend', { key, args }); const p = location.hash.replace(/^#/, ''); location.hash = '#/c/reauth?next=' + encodeURIComponent(p) + '&why=' + encodeURIComponent(why || title); } }] });
  }
  function resume() { const p = st.get('cx.pend', null); if (p && reauthOk()) { st.set('cx.pend', null); setTimeout(() => FLOWS[p.key] && FLOWS[p.key](p.args), 150); } }
  function run(key, args, S) {
    if (!can(S.cap)) return A.toast(`Seu papel (${PAPEL[papel()]}) não permite isso. Peça a uma pessoa da administração.`, { kind: 'bad' });
    if (S.reauth && !reauthOk()) return pedirReauth(key, args, S.title, S.why);
    let vals = null;
    const m = A.modal({
      title: S.title, wide: !!S.wide,
      body: `<form data-submit="cxform" novalidate class="stack">${riscoTag(S.risk)}${S.intro ? `<p>${S.intro}</p>` : ''}${S.fields || ''}${S.motivo === false ? '' : A.field({ name: 'motivo', label: 'Motivo (fica no registro de auditoria)', rows: 3, required: true, placeholder: S.motivoDica || '' })}</form>`,
      actions: [{ label: 'Cancelar', variant: 'btn-quiet', value: false }, { label: S.next || (S.danger ? 'Continuar' : S.ok || 'Confirmar'), variant: S.danger ? 'btn-danger' : 'btn-primary', onClick: (api) => { const v = A.validate(A.$('form', api.el), Object.assign(S.motivo === false ? {} : { motivo: A.rules.min(10, MOTIVO) }, S.rules || {})); if (!v) return false; vals = v; } }],
    });
    m.onClose = () => { if (!vals) return; if (S.danger) A.confirm({ title: S.title, body: S.consequence(vals), confirm: S.ok || 'Confirmar', danger: true, type: S.type ? S.type(vals) : '' }).then((ok) => ok && S.exec(vals)); else S.exec(vals); };
  }
  const done = (msg, undo) => { A.render(); A.toast(msg, undo ? { undo } : {}); };

  /* --- contas --- */
  FLOWS.reveal = (a) => { const c = conta(a.a); run('reveal', a, { cap: 'pii.revelar', title: 'Revelar o contato de ' + c.nome, intro: 'O e-mail completo aparece nesta tela até você sair dela. O acesso fica registrado com o seu nome e o motivo.', ok: 'Revelar contato', exec: (v) => { REV.add(c.id); audit('conta.pii_revelado', 'conta', c.nome, '#/c/contas/' + c.id, v.motivo, { campo: 'e-mail' }); secAdd('pii.revealed', sess().nome, 'Motivo registrado na auditoria'); done('Contato revelado. Ele volta a ficar oculto quando você sair desta tela.'); } }); };
  FLOWS.suspender = (a) => { const c = conta(a.a), on = c.status === 'suspensa', ant = c.status; run('suspender', a, { risk: 'rev', cap: 'contas.escrever', title: (on ? 'Reativar a conta de ' : 'Suspender a conta de ') + c.nome, intro: on ? 'A pessoa volta a entrar normalmente.' : 'A pessoa não consegue entrar enquanto a conta estiver suspensa. Os eventos e as fotos continuam guardados.', ok: on ? 'Reativar' : 'Suspender', exec: (v) => { upd('contas', c.id, { status: on ? 'ativa' : 'suspensa' }); audit(on ? 'conta.reativada' : 'conta.suspensa', 'conta', c.nome, '#/c/contas/' + c.id, v.motivo); done(on ? 'Conta reativada.' : 'Conta suspensa.', () => { upd('contas', c.id, { status: ant }); audit(on ? 'conta.suspensa' : 'conta.reativada', 'conta', c.nome, '#/c/contas/' + c.id, 'Desfez a última ação'); A.render(); }); } }); };
  FLOWS.excluirConta = (a) => { const c = conta(a.a); run('excluirConta', a, { risk: 'rec', cap: 'lgpd.excluir', title: 'Abrir pedido de exclusão de ' + c.nome, reauth: true, why: 'Abrir pedido de exclusão de conta', intro: 'Isso abre um pedido na tela LGPD com prazo legal. A conta só é apagada quando alguém executa o pedido lá, com nova confirmação.', next: 'Continuar', ok: 'Abrir pedido de exclusão', danger: true, consequence: () => `Será aberto um pedido de exclusão para <b>${esc(c.nome)}</b>, com prazo legal de 15 dias. Ainda não apaga nada.`, exec: (v) => { const d = col('dsar'); const id = 'L-2026-' + String(41 + d.length - 10).padStart(3, '0'); d.unshift({ id, tipo: 'exclusao', contaId: c.id, recebido: now(), prazo: now() + 15 * DAY, status: 'recebido', comprovante: '', notas: v.motivo }); save('dsar', d); audit('lgpd.pedido_criado', 'lgpd', 'Pedido ' + id + ' · ' + c.nome, '#/c/lgpd', v.motivo); location.hash = '#/c/lgpd'; A.toast('Pedido de exclusão aberto. Falta executar a exclusão.'); } }); };

  /* --- ver como (impersonação) --- */
  const imps = () => st.get('cx.imp', null) || { 'ac-05': { estado: 'pendente', porId: 'u3', porNome: 'Camila Duarte', motivo: 'Convidados da festa de sábado não recebem o link; preciso reproduzir o fluxo.', quando: BASE - 35 * MIN } };
  const impSet = (id, patch) => { const all = imps(); all[id] = Object.assign({}, all[id], patch); st.set('cx.imp', all); };
  const impEstado = (id) => { const i = imps()[id]; if (!i) return null; if ((i.estado === 'ativo' || i.estado === 'aprovado') && i.expira && i.expira < now()) return Object.assign({}, i, { estado: 'expirado' }); return i; };
  FLOWS.impPedir = (a) => { const c = conta(a.a); run('impPedir', a, { cap: 'imp.pedir', title: 'Pedir para ver como ' + c.nome, intro: 'Uma pessoa da administração precisa aprovar. Você vê a conta como a pessoa vê, sem poder mudar a senha nem pagar nada.', ok: 'Enviar pedido', exec: (v) => { impSet(c.id, { estado: 'pendente', porId: sess().id, porNome: sess().nome, motivo: v.motivo, quando: now(), expira: 0 }); audit('impersonacao.pedida', 'impersonacao', 'Ver como ' + c.nome, '#/c/contas/' + c.id, v.motivo); done('Pedido enviado. A administração recebe um aviso no topo de todas as telas.'); } }); };
  FLOWS.impDecidir = (a) => { const c = conta(a.a), ap = a.b === 'aprovar'; run('impDecidir', a, { cap: 'imp.aprovar', title: (ap ? 'Aprovar' : 'Negar') + ' ver como ' + c.nome, intro: `Pedido de ${esc((imps()[c.id] || {}).porNome || '')}: ${esc((imps()[c.id] || {}).motivo || '')}`, ok: ap ? 'Aprovar' : 'Negar pedido', exec: (v) => { impSet(c.id, ap ? { estado: 'aprovado', aprovadoPor: sess().nome, expira: now() + 2 * HR } : { estado: 'negado' }); audit(ap ? 'impersonacao.aprovada' : 'impersonacao.negada', 'impersonacao', 'Ver como ' + c.nome, '#/c/contas/' + c.id, v.motivo); done(ap ? 'Pedido aprovado. A pessoa tem 2 horas para iniciar.' : 'Pedido negado.'); } }); };
  FLOWS.impIniciar = (a) => { const c = conta(a.a), i = impEstado(c.id); if (!i || i.estado !== 'aprovado') return A.toast('Este pedido não está mais aprovado. Peça de novo.', { kind: 'bad' }); A.confirm({ title: 'Começar a ver como ' + c.nome, body: 'A sessão dura 30 minutos e fica sinalizada no topo de todas as telas. Tudo o que você fizer fica na auditoria.', confirm: 'Começar a ver como' }).then((ok) => { if (!ok) return; impSet(c.id, { estado: 'ativo', expira: now() + 30 * MIN }); st.set('cx.impAtivo', c.id); audit('impersonacao.iniciada', 'impersonacao', 'Ver como ' + c.nome, '#/c/contas/' + c.id, 'Sessão iniciada'); done('Sessão como ' + c.nome + ' iniciada. Ela termina em 30 minutos.'); }); };
  FLOWS.impEncerrar = (a) => { const c = conta(a.a); impSet(c.id, { estado: 'expirado', expira: now() - 1 }); st.set('cx.impAtivo', null); audit('impersonacao.encerrada', 'impersonacao', 'Ver como ' + c.nome, '#/c/contas/' + c.id, 'Encerrada por quem usava'); done('Sessão encerrada.'); };

  /* --- assinaturas --- */
  const subDe = (id) => col('subs').find((s) => s.id === id);
  const nomeSub = (s) => (conta(s.contaId) || {}).nome || '';
  FLOWS.subPlano = (a) => { const s = subDe(a.a); run('subPlano', a, { risk: 'rev', cap: 'subs.escrever', title: 'Trocar o plano de ' + nomeSub(s), fields: A.field({ name: 'plano', label: 'Novo plano', required: true, value: s.plano, options: Object.keys(PRECO).map((p) => [p, `${PL[p]} · ${A.brl(PRECO[p])}/mês`]) }), ok: 'Trocar plano', exec: (v) => { const ant = { plano: s.plano, valor: s.valor }; upd('subs', s.id, { plano: v.plano, valor: PRECO[v.plano] }); upd('contas', s.contaId, { plano: v.plano }); audit('assinatura.plano_trocado', 'assinatura', nomeSub(s), '#/c/assinaturas', v.motivo, { de: PL[ant.plano], para: PL[v.plano] }); done('Plano trocado para ' + PL[v.plano] + '.', () => { upd('subs', s.id, ant); upd('contas', s.contaId, { plano: ant.plano }); audit('assinatura.plano_trocado', 'assinatura', nomeSub(s), '#/c/assinaturas', 'Desfez a última ação'); A.render(); }); } }); };
  FLOWS.subCortesia = (a) => { const s = subDe(a.a); run('subCortesia', a, { risk: 'rev', cap: 'subs.escrever', title: 'Conceder cortesia a ' + nomeSub(s), fields: `<div class="grid g2 keep">${A.field({ name: 'pct', label: 'Desconto', required: true, value: '100', options: [['25', '25%'], ['50', '50%'], ['100', '100% (gratuito)']] })}${A.field({ name: 'meses', label: 'Por quanto tempo', required: true, value: '3', options: [['1', '1 mês'], ['3', '3 meses'], ['6', '6 meses']] })}</div>`, ok: 'Conceder cortesia', exec: (v) => { upd('subs', s.id, { cortesia: { pct: +v.pct, meses: +v.meses } }); audit('assinatura.cortesia', 'assinatura', nomeSub(s), '#/c/assinaturas', v.motivo, { desconto: v.pct + '%', meses: v.meses }); done('Cortesia de ' + v.pct + '% por ' + v.meses + (v.meses === '1' ? ' mês' : ' meses') + ' concedida.', () => { upd('subs', s.id, { cortesia: null }); audit('assinatura.cortesia', 'assinatura', nomeSub(s), '#/c/assinaturas', 'Desfez a última ação'); A.render(); }); } }); };
  FLOWS.subCancelar = (a) => { const s = subDe(a.a); run('subCancelar', a, { risk: 'irrev', cap: 'subs.escrever', title: 'Cancelar a assinatura de ' + nomeSub(s), reauth: true, why: 'Cancelar uma assinatura', intro: 'O fornecedor perde os recursos pagos na próxima cobrança. Não devolve dinheiro: para isso use Reembolsar.', next: 'Continuar', ok: 'Cancelar assinatura', danger: true, type: () => nomeSub(s), consequence: () => `A assinatura de <b>${esc(nomeSub(s))}</b> será cancelada e não pode ser retomada por aqui: o fornecedor precisa contratar de novo.`, exec: (v) => { upd('subs', s.id, { status: 'cancelada', prox: 0, canceladaEm: now() }); audit('assinatura.cancelada', 'assinatura', nomeSub(s), '#/c/assinaturas', v.motivo); done('Assinatura cancelada.'); } }); };
  FLOWS.subReembolsar = (a) => { const s = subDe(a.a); const pags = s.pags.filter((p) => p.status === 'pago' && !p.reemb); if (!pags.length) return A.toast('Esta assinatura não tem pagamento para reembolsar.', { kind: 'bad' }); run('subReembolsar', a, { risk: 'irrev', cap: 'subs.escrever', title: 'Reembolsar pagamento de ' + nomeSub(s), reauth: true, why: 'Devolver dinheiro a um cliente', wide: false, fields: `${A.field({ name: 'pag', label: 'Qual pagamento', required: true, value: pags[0].id, options: pags.map((p) => [p.id, `${fd(p.data)} · ${A.brl(p.valor)}`]) })}${A.field({ name: 'valor', label: 'Valor a devolver (R$)', required: true, value: String(pags[0].valor).replace('.', ','), hint: 'Padrão: o valor cheio. Acima de R$ 500,00 só administração aprova, e você tem esse papel.' })}`, rules: { valor: (v, o) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')), p = pags.find((x) => x.id === o.pag); return isNaN(n) || n <= 0 ? 'Digite um valor maior que zero. Exemplo: 149,00' : p && n > p.valor ? `O valor passa do pagamento (${A.brl(p.valor)}). Digite até ${A.brl(p.valor)}.` : ''; } }, next: 'Continuar', ok: 'Reembolsar', danger: true, type: () => 'reembolsar', consequence: (v) => `Serão devolvidos <b>R$ ${esc(v.valor)}</b> a <b>${esc(nomeSub(s))}</b>. Dinheiro devolvido não volta atrás. (Simulado: na versão real, o gateway de pagamento executa.)`, exec: (v) => { const n = parseFloat(String(v.valor).replace(/\./g, '').replace(',', '.')); const arr = col('subs'), o = arr.find((x) => x.id === s.id); o.pags.find((p) => p.id === v.pag).reemb = n; save('subs', arr); audit('assinatura.reembolso', 'pagamento', 'Pagamento de ' + A.brl(n) + ' · ' + nomeSub(s), '#/c/assinaturas', v.motivo, { valor: A.brl(n) }); done('Reembolso de ' + A.brl(n) + ' registrado (simulado).'); } }); };

  /* --- suporte --- */
  const tkSet = (id, patch, acao, rot, undoMsg) => { const t = col('tickets').find((x) => x.id === id), ant = {}; Object.keys(patch).forEach((k) => (ant[k] = t[k])); upd('tickets', id, patch); audit(acao, 'ticket', id + ' · ' + t.assunto, '#/c/suporte?t=' + id, '', patch); A.render(); A.toast(rot, { undo: () => { upd('tickets', id, ant); audit(acao, 'ticket', id + ' · ' + t.assunto, '#/c/suporte?t=' + id, 'Desfez a última ação', ant); A.render(); } }); };
  A.inputs.cxtk = (el, e, d) => {
    if (!can('suporte.escrever')) return A.toast('Seu papel só lê tickets.', { kind: 'bad' }); const id = d.id, f = d.f, v = el.value;
    if (f === 'status') tkSet(id, { status: v }, 'ticket.status', 'Status mudou para “' + TKST[v][0] + '”.');
    if (f === 'prio') { const t = col('tickets').find((x) => x.id === id); tkSet(id, { prio: v, due: t.criado + { P0: 60, P1: 240, P2: 1440 }[v] * MIN }, 'ticket.prioridade', 'Prioridade mudou para ' + v + '.'); }
    if (f === 'resp') tkSet(id, { resp: v || null }, 'ticket.atribuido', v ? 'Ticket atribuído a ' + equipe.find((x) => x.id === v).nome + '.' : 'Ticket sem responsável.');
  };
  A.acts.cxreply = (form) => {
    if (!can('suporte.escrever')) return A.toast('Seu papel só lê tickets.', { kind: 'bad' }); const v = A.validate(form, { texto: A.rules.min(5, 'Escreva a resposta (pelo menos 5 caracteres). O cliente recebe por e-mail.') }); if (!v) return;
    const btn = A.$('button[type=submit]', form); A.busy(btn, 500, () => { const id = form.dataset.id, t = col('tickets').find((x) => x.id === id); t.msgs.push({ de: 'equipe', autor: sess().nome, ts: now(), texto: v.texto }); if (t.status === 'aberto') t.status = 'pendente'; const a = col('tickets'); a.splice(a.findIndex((x) => x.id === id), 1, t); save('tickets', a); audit('ticket.respondido', 'ticket', id + ' · ' + t.assunto, '#/c/suporte?t=' + id, '', {}); A.render(); A.toast('Resposta enviada. (Simulado: o e-mail ao cliente não sai de verdade.) O ticket ficou aguardando o cliente.'); });
  };
  FLOWS.novoTicket = (a) => run('novoTicket', a, { cap: 'suporte.escrever', title: 'Abrir ticket', motivo: false, fields: `${A.field({ name: 'conta', label: 'Cliente', required: true, value: a.a || '', options: [['', 'Escolha uma conta…'], ...col('contas').map((c) => [c.id, c.nome])] })}${A.field({ name: 'assunto', label: 'Assunto', required: true, placeholder: 'Ex.: Cliente não recebe o link por e-mail' })}${A.field({ name: 'prio', label: 'Prioridade', required: true, value: 'P1', options: [['P0', 'P0 · urgente (1 hora)'], ['P1', 'P1 · alta (4 horas)'], ['P2', 'P2 · normal (24 horas)']] })}${A.field({ name: 'msg', label: 'Primeira mensagem', rows: 3, required: true })}`, rules: { conta: (v) => (v ? '' : 'Escolha a conta do cliente.') }, ok: 'Abrir ticket', exec: (v) => { const arr = col('tickets'); const id = 'T-' + (1049 + arr.length - 14); arr.unshift({ id, assunto: v.assunto, contaId: v.conta, prio: v.prio, status: 'aberto', criado: now(), due: now() + { P0: 60, P1: 240, P2: 1440 }[v.prio] * MIN, resp: sess().id, msgs: [{ de: 'equipe', autor: sess().nome, ts: now(), texto: v.msg }] }); save('tickets', arr); audit('ticket.criado', 'ticket', id + ' · ' + v.assunto, '#/c/suporte?t=' + id, '', {}); location.hash = '#/c/suporte?t=' + id; A.toast('Ticket ' + id + ' aberto.'); } });

  /* --- LGPD --- */
  const dsDe = (id) => col('dsar').find((d) => d.id === id);
  FLOWS.novoDsar = (a) => run('novoDsar', a, { cap: 'lgpd.executar', title: 'Novo pedido de titular', fields: `${A.field({ name: 'conta', label: 'Titular (conta)', required: true, value: a.a || '', options: [['', 'Escolha a conta…'], ...col('contas').map((c) => [c.id, c.nome + ' · ' + mask(c.email)])] })}${A.field({ name: 'tipo', label: 'O que a pessoa pediu', required: true, value: 'acesso', options: Object.entries(TIPODS) })}${A.field({ name: 'prazo', label: 'Prazo legal', type: 'date', required: true, value: new Date(now() + 15 * DAY).toISOString().slice(0, 10), hint: 'Sugerido: 15 dias a partir de hoje.' })}`, rules: { conta: (v) => (v ? '' : 'Escolha a conta do titular.') }, ok: 'Abrir pedido', exec: (v) => { const arr = col('dsar'); const id = 'L-2026-' + String(41 + arr.length - 10).padStart(3, '0'); arr.unshift({ id, tipo: v.tipo, contaId: v.conta, recebido: now(), prazo: new Date(v.prazo + 'T23:59:00').getTime(), status: 'recebido', comprovante: '', notas: v.motivo }); save('dsar', arr); audit('lgpd.pedido_criado', 'lgpd', 'Pedido ' + id + ' · ' + conta(v.conta).nome, '#/c/lgpd', v.motivo); done('Pedido ' + id + ' aberto.'); } });
  FLOWS.atenderDsar = (a) => { const d = dsDe(a.a); run('atenderDsar', a, { cap: 'lgpd.executar', title: 'Atender pedido ' + d.id, fields: `${A.field({ name: 'status', label: 'Situação', required: true, value: d.status, options: Object.entries(STDS) })}${A.field({ name: 'comprovante', label: 'Link do comprovante', type: 'url', value: d.comprovante, hint: 'Opcional enquanto o pedido está em andamento.', placeholder: 'https://' })}${A.field({ name: 'notas', label: 'Notas para o histórico', rows: 2, value: d.notas })}`, ok: 'Salvar atendimento', exec: (v) => { upd('dsar', d.id, { status: v.status, comprovante: v.comprovante, notas: v.notas }); audit('lgpd.pedido_atualizado', 'lgpd', 'Pedido ' + d.id + ' · ' + conta(d.contaId).nome, '#/c/lgpd', v.motivo, { situacao: STDS[v.status] }); done('Pedido atualizado para “' + STDS[v.status] + '”.'); } }); };
  FLOWS.execExclusao = (a) => { const d = dsDe(a.a), c = conta(d.contaId); run('execExclusao', a, { risk: 'irrev', cap: 'lgpd.excluir', title: 'Excluir a conta de ' + c.nome, reauth: true, why: 'Executar a exclusão de uma conta', intro: `Pedido ${esc(d.id)}. Vai apagar os dados da pessoa e das fotos dos eventos dela.`, next: 'Continuar', ok: 'Excluir conta definitivamente', danger: true, type: () => c.nome, consequence: () => `<p>Isto é <b>irreversível</b>. Serão apagados: o cadastro e o e-mail de <b>${esc(c.nome)}</b>, os ${col('eventos').filter((e) => e.hostId === c.id).length} evento(s) e todas as fotos e consentimentos ligados a eles. A auditoria mantém só que a exclusão aconteceu.</p>`, exec: (v) => { upd('contas', c.id, { status: 'encerrada', nome: 'Conta excluída (' + d.id + ')', email: 'removido@albora.invalid' }); const ev = col('eventos'); ev.filter((e) => e.hostId === c.id).forEach((e) => { e.apagado = true; e.fotos = 0; }); save('eventos', ev); upd('dsar', d.id, { status: 'concluido', notas: (d.notas ? d.notas + ' · ' : '') + 'Conta excluída em ' + fdt(now()) }); audit('lgpd.conta_excluida', 'lgpd', 'Pedido ' + d.id, '#/c/lgpd', v.motivo, { pedido: d.id }); done('Conta excluída. O pedido foi concluído.'); } }); };

  /* --- retenção --- */
  const jobsDe = (eid) => col('jobs').filter((j) => j.eventoId === eid);
  FLOWS.exportar = (a) => { const e = evento(a.a); run('exportar', a, { cap: 'ret.escrever', title: 'Exportar “' + e.titulo + '” agora', intro: 'Envia as fotos e o álbum para a nuvem escolhida pelo anfitrião. (Simulado: na versão real, depende da conexão com a nuvem do anfitrião.)', ok: 'Exportar agora', exec: (v) => { const j = col('jobs'); const x = j.find((y) => y.eventoId === e.id && y.etapa === 'd330'); if (x) { x.status = 'concluido'; x.tent += 1; x.erro = ''; } save('jobs', j); audit('retencao.exportado', 'evento', e.titulo, '#/c/eventos/' + e.id, v.motivo); done('Exportação concluída (simulada).'); } }); };
  FLOWS.apagar = (a) => { const e = evento(a.a); run('apagar', a, { risk: 'irrev', cap: 'ret.escrever', title: 'Apagar “' + e.titulo + '” agora', reauth: true, why: 'Apagar um evento antes do prazo', intro: `Hoje a exclusão automática está marcada para ${fd(e.data + 365 * DAY)} (dia 365).`, next: 'Continuar', ok: 'Apagar evento', danger: true, type: () => e.titulo, consequence: () => `<p>Todas as <b>${A.pt(e.fotos)} fotos</b>, os convidados e o álbum de <b>${esc(e.titulo)}</b> serão apagados agora. Não dá para recuperar. O anfitrião recebe um aviso.</p>`, exec: (v) => { upd('eventos', e.id, { apagado: true, fotos: 0 }); const j = col('jobs'); j.filter((y) => y.eventoId === e.id && y.etapa === 'd365').forEach((y) => { y.status = 'concluido'; y.tent += 1; }); save('jobs', j); audit('retencao.apagado', 'evento', e.titulo, '#/c/eventos/' + e.id, v.motivo); done('Evento apagado.'); } }); };
  FLOWS.retry = (a) => { const j = col('jobs').find((x) => x.id === a.a), e = evento(j.eventoId); run('retry', a, { cap: 'ret.escrever', title: 'Tentar de novo: ' + j.rot, intro: `Evento: ${esc(e.titulo)}.`, ok: 'Tentar de novo', exec: (v) => { upd('jobs', j.id, { status: 'concluido', erro: '', tent: j.tent + 1 }); audit('retencao.reprocessado', 'evento', e.titulo, '#/c/eventos/' + e.id, v.motivo, { etapa: j.rot }); done('Tarefa executada de novo com sucesso (simulado).'); } }); };

  /* --- segurança / equipe --- */
  FLOWS.reconhecer = (a) => run('reconhecer', a, { cap: 'seg.ver', title: 'Reconhecer alerta de sessão reaproveitada', intro: 'Marque quando já investigou o caso. O alerta sai do menu e fica no histórico.', ok: 'Reconhecer', exec: (v) => { const s = col('seguranca'); s.forEach((x) => { if (x.tipo === 'session.reuse') x.ack = true; }); save('seguranca', s); audit('seguranca.reconhecido', 'plataforma', 'Alerta de sessão reaproveitada', '#/c/seguranca', v.motivo); done('Alerta reconhecido.'); } });
  FLOWS.eqConvidar = (a) => run('eqConvidar', a, { cap: 'equipe.gerir', title: 'Convidar pessoa para a equipe', reauth: true, why: 'Gerir a equipe interna', fields: `${A.field({ name: 'nome', label: 'Nome', required: true })}${A.field({ name: 'email', label: 'E-mail de trabalho', type: 'email', required: true, placeholder: 'nome@albora.app' })}${A.field({ name: 'papel', label: 'Papel', required: true, value: 'leitura', options: Object.entries(PAPEL) })}`, rules: { email: A.rules.email }, ok: 'Enviar convite', exec: (v) => { const q = col('equipe'); q.push({ id: 'u' + (q.length + 1), nome: v.nome, email: v.email, papel: v.papel, status: 'convite', ult: 0 }); save('equipe', q); audit('equipe.convidou', 'equipe', v.nome, '#/c/equipe-interna', v.motivo, { papel: PAPEL[v.papel] }); done('Convite enviado a ' + v.email + ' (simulado).'); } });
  FLOWS.eqPapel = (a) => { const m = col('equipe').find((x) => x.id === a.a); if (m.id === sess().id) return A.toast('Você não pode mudar o próprio papel. Peça a outra pessoa da administração.', { kind: 'bad' }); run('eqPapel', a, { cap: 'equipe.gerir', title: 'Mudar o papel de ' + m.nome, reauth: true, why: 'Gerir a equipe interna', fields: A.field({ name: 'papel', label: 'Novo papel', required: true, value: m.papel, options: Object.entries(PAPEL) }), ok: 'Mudar papel', exec: (v) => { upd('equipe', m.id, { papel: v.papel }); audit('equipe.papel_alterado', 'equipe', m.nome, '#/c/equipe-interna', v.motivo, { de: PAPEL[m.papel], para: PAPEL[v.papel] }); secAdd('role.changed', sess().nome, m.nome + ': ' + PAPEL[m.papel] + ' para ' + PAPEL[v.papel]); done(m.nome + ' agora é ' + PAPEL[v.papel] + '.'); } }); };
  FLOWS.eqAtivo = (a) => { const m = col('equipe').find((x) => x.id === a.a), off = m.status === 'desativado'; if (m.id === sess().id) return A.toast('Você não pode desativar a si mesmo.', { kind: 'bad' }); run('eqAtivo', a, { risk: 'rec', cap: 'equipe.gerir', title: (off ? 'Reativar ' : 'Desativar ') + m.nome, reauth: true, why: 'Gerir a equipe interna', danger: !off, next: 'Continuar', ok: off ? 'Reativar' : 'Desativar acesso', consequence: () => `<b>${esc(m.nome)}</b> perde o acesso ao console agora e a sessão aberta cai. Dá para reativar depois.`, intro: off ? 'A pessoa volta a poder entrar.' : '', exec: (v) => { upd('equipe', m.id, { status: off ? 'ativo' : 'desativado' }); audit(off ? 'equipe.reativada' : 'equipe.desativada', 'equipe', m.nome, '#/c/equipe-interna', v.motivo); done(off ? 'Acesso reativado.' : 'Acesso desativado.'); } }); };

  /* ================= rótulos ================= */
  const CST = { trial: ['info', 'Em teste'], ativa: ['ok', 'Ativa'], suspensa: ['warn', 'Suspensa'], encerrada: ['', 'Encerrada'] };
  const EST = { rascunho: ['', 'Rascunho'], ativo: ['ok', 'Ativo'], encerrado: ['', 'Encerrado'] };
  const SBS = { pendente: ['warn', 'Pendente'], ativa: ['ok', 'Ativa'], atraso: ['bad', 'Em atraso'], cancelada: ['', 'Cancelada'] };
  const TKST = { aberto: ['Aberto', 'warn'], pendente: ['Aguardando cliente', 'info'], resolvido: ['Resolvido', 'ok'], fechado: ['Fechado', ''] };
  const TIPODS = { acesso: 'Acesso aos dados', portabilidade: 'Portabilidade', retificacao: 'Correção de dados', exclusao: 'Exclusão de conta' };
  const STDS = { recebido: 'Recebido', andamento: 'Em andamento', concluido: 'Concluído', recusado: 'Recusado' };
  const JST = { pendente: ['', 'Pendente'], rodando: ['info', 'Rodando'], concluido: ['ok', 'Concluído'], pulado: ['', 'Pulado'], falhou: ['bad', 'Falhou'] };
  const stBadge = (m, k) => { const x = m[k] || ['', k]; return bd(x[0], x[1]); };
  const slaOf = (t) => { if (t.status !== 'aberto') return { txt: t.status === 'pendente' ? 'Relógio parado' : '—', bad: false }; const ms = t.due - now(); return ms >= 0 ? { txt: 'Estoura em ' + dur(ms), bad: false } : { txt: 'Estourou há ' + dur(-ms), bad: true }; };
  const dsPrazo = (d) => { const ms = d.prazo - now(), dias = Math.ceil(Math.abs(ms) / DAY); return ['recebido', 'andamento'].includes(d.status) ? (ms >= 0 ? { txt: dias + (dias === 1 ? ' dia restante' : ' dias restantes'), bad: false } : { txt: dias + (dias === 1 ? ' dia em atraso' : ' dias em atraso'), bad: true }) : { txt: 'Encerrado', bad: false }; };
  const atrasoTag = (b, t) => (b ? `<span class="crit">${A.icon('warn', 14)} ${esc(t)}</span>` : esc(t));

  /* ================= TELAS ================= */

  /* --- entrar --- */
  const ERR = {
    google: ['Não conseguimos entrar com o Google', 'O Google não confirmou o acesso: a conta escolhida pode não ser a de trabalho (@albora.app). Escolha a conta de trabalho ou peça um link por e-mail abaixo.'],
    dominio: ['Esse e-mail não é de equipe', 'Só e-mails @albora.app com acesso liberado entram no console. Se você deveria ter acesso, peça a uma pessoa da administração.'],
    expirado: ['O link expirou ou já foi usado', 'Cada link vale 15 minutos e funciona uma vez. Peça um link novo abaixo.'],
    rede: ['Sem conexão com o servidor de acesso', 'O e-mail não foi enviado. Confira a conexão e tente de novo: nada foi alterado.'],
  };
  let LOGIN = { sent: '' };
  const loginShell = (inner) => ({ title: 'Entrar no console', html: `<div class="cx"><main class="cx-login" id="main" tabindex="-1"><div><div class="flex" style="margin-bottom:var(--space-8);align-items:center"><span role="img" aria-label="Albora">${A.logo(30)}</span><span class="t-label" style="margin-left:var(--space-3)">console</span></div>${inner}</div></main></div>` });
  A.route('/c/entrar', (ctx) => {
    light(); A.applyEvent(null);
    if (sess() && !ctx.q.m) { setTimeout(() => (location.hash = '#/c'), 0); return loginShell('<div class="spinner"></div>'); }
    const next = ctx.q.next && ctx.q.next.startsWith('/c') ? ctx.q.next : '/c', er = ERR[ctx.q.error];
    if (ctx.q.m) {
      const ok = ctx.q.m !== 'x', m = ok && col('equipe').find((x) => x.email === ctx.q.m);
      if (!ok || !m || m.status === 'desativado') return loginShell(`<div class="banner bad" role="alert">${A.icon('warn', 20)}<span><b>${ERR.expirado[0]}.</b> ${ERR.expirado[1]}</span></div><a class="btn btn-primary btn-block" style="margin-top:var(--space-6)" href="#/c/entrar">Pedir novo link</a>`);
      return loginShell(`<h1 class="t-display">Entrar no console</h1><p class="t-lead" style="margin:var(--space-3) 0 var(--space-6)">Link confirmado para <b>${esc(m.nome)}</b> (${esc(PAPEL[m.papel])}).</p><button class="btn btn-primary btn-lg btn-block" data-act="cxentrar" data-id="${m.id}" data-next="${esc(next)}">Entrar no console</button>`);
    }
    const eq = col('equipe');
    const form = LOGIN.sent ? `<div class="banner ok" role="status">${A.icon('mail', 20)}<span>Se houver uma conta de equipe com <b>${esc(LOGIN.sent)}</b>, enviamos um link de acesso. Ele vale 15 minutos e funciona uma vez.</span></div><div class="stack" style="margin-top:var(--space-6)"><button class="btn btn-primary btn-block" data-act="cxlink" data-next="${esc(next)}">Simular: abrir o link do e-mail</button><button class="btn btn-quiet btn-block" data-act="cxoutro">Usar outro e-mail</button><p class="t-small">Simulado: o e-mail de verdade não sai. Se o endereço não for de equipe, a tela real responde igual para não revelar quem é da equipe; aqui o link simulado mostra o erro.</p></div>`
      : `<form data-submit="cxlogin" class="stack" novalidate data-next="${esc(next)}">${A.field({ name: 'email', label: 'E-mail da equipe', type: 'email', required: true, placeholder: 'nome@albora.app', hint: 'Enviamos um link de acesso. Sem senha.' })}<button class="btn btn-primary btn-lg btn-block" type="submit">Enviar link de acesso</button></form><div class="hr" style="margin:var(--space-6) 0"></div><button class="btn btn-line btn-block" data-act="cxgoogle" data-next="${esc(next)}">Entrar com Google (simulado)</button><p class="t-small" style="margin-top:var(--space-2)">Simulado: entra como Helena Prado.</p><div class="cx-sec" style="margin-top:var(--space-6)"><h2>Contas de teste do protótipo</h2><div class="chips">${eq.filter((m) => m.status === 'ativo').map((m) => `<button class="chip" data-act="cxfill" data-e="${m.email}">${esc(PAPEL[m.papel])} · ${esc(m.nome.split(' ')[0])}</button>`).join('')}</div><p class="t-small" style="margin-top:var(--space-2)">Toque para preencher o e-mail. Para ver os erros de acesso: <a class="cx-lk" href="#/c/entrar?error=google">Google falhou</a>, <a class="cx-lk" href="#/c/entrar?error=rede">sem rede</a>, <a class="cx-lk" href="#/c/entrar?error=dominio">e-mail fora da equipe</a>.</p></div>`;
    return loginShell(`<h1 class="t-display">Entrar no console</h1><p class="t-lead" style="margin:var(--space-3) 0 var(--space-6)">Área interna da equipe do Albora. Cada ação fica registrada com o seu nome.</p>${er ? `<div class="banner bad" role="alert" style="margin-bottom:var(--space-6)">${A.icon('warn', 20)}<span><b>${esc(er[0])}.</b> ${esc(er[1])}</span></div>` : ''}${form}`);
  });
  A.acts.cxfill = (el) => { const i = A.$('input[name=email]'); if (i) { i.value = el.dataset.e; i.focus(); } };
  A.acts.cxlogin = (form) => { const v = A.validate(form, { email: A.rules.email }); if (!v) return; const b = A.$('button[type=submit]', form); A.busy(b, 700, () => { LOGIN.sent = v.email; A.render(); }); };
  A.acts.cxoutro = () => { LOGIN.sent = ''; A.render(); };
  A.acts.cxlink = (el) => { const m = col('equipe').find((x) => x.email === LOGIN.sent && x.status !== 'desativado'); location.hash = '#/c/entrar?m=' + (m ? encodeURIComponent(m.email) : 'x') + '&next=' + encodeURIComponent(el.dataset.next); };
  A.acts.cxentrar = (el, e, d) => { const m = col('equipe').find((x) => x.id === d.id); st.set('cx.sess', { id: m.id, nome: m.nome, email: m.email, papel: m.papel, real: m.papel }); upd('equipe', m.id, { status: 'ativo', ult: now() }); LOGIN.sent = ''; audit('sessao.entrou', 'plataforma', 'Console', '', ''); location.hash = '#' + d.next; };
  A.acts.cxgoogle = (el) => A.busy(el, 900, () => { const m = col('equipe')[0]; st.set('cx.sess', { id: m.id, nome: m.nome, email: m.email, papel: m.papel, real: m.papel }); audit('sessao.entrou', 'plataforma', 'Console (Google)', '', ''); location.hash = '#' + (el.dataset.next || '/c'); });
  A.acts.cxsair = async () => { const imp = st.get('cx.impAtivo', null); if ((st.get('cx.pend', null) || imp) && !(await A.confirm({ title: 'Sair do console', body: imp ? 'Há uma sessão “ver como” em andamento e ela será encerrada.' : 'Há uma ação esperando a confirmação da sua identidade; ela será descartada.', confirm: 'Sair do console', danger: true }))) return; const s = sess(); if (s) audit('sessao.saiu', 'plataforma', 'Console', '', ''); st.set('cx.sess', null); st.set('cx.reauth', 0); st.set('cx.impAtivo', null); location.hash = '#/c/entrar'; A.toast('Você saiu do console.'); };

  /* --- reauth --- */
  A.route('/c/reauth', (ctx) => {
    light(); A.applyEvent(null); const s = sess(); if (!s) { setTimeout(() => (location.hash = '#/c/entrar'), 0); return loginShell('<div class="spinner"></div>'); }
    const next = ctx.q.next && ctx.q.next.startsWith('/c') ? ctx.q.next : '/c', why = ctx.q.why || 'uma ação sensível', ok = reauthOk(), err = ctx.q.m === 'erro';
    let body;
    if (ctx.q.m === 'ok' || (ok && ctx.q.m)) body = `<div class="banner ok" role="status">${A.icon('check', 20)}<span>Identidade confirmada até <b>${fh(st.get('cx.reauth', 0))}</b>.</span></div><a class="btn btn-primary btn-lg btn-block" style="margin-top:var(--space-6)" href="#${esc(next)}">Continuar de onde parei</a>`;
    else if (err) body = `<div class="banner bad" role="alert">${A.icon('warn', 20)}<span><b>Esse link é inválido, expirou ou não pertence a esta sessão.</b> Peça um novo: ele vale 15 minutos e só funciona nesta sessão.</span></div><a class="btn btn-primary btn-block" style="margin-top:var(--space-6)" href="#/c/reauth?next=${encodeURIComponent(next)}&why=${encodeURIComponent(why)}">Pedir novo link</a>`;
    else if (ctx.q.sent) body = `<div class="banner ok" role="status">${A.icon('mail', 20)}<span>Enviamos um link de confirmação para <b>${esc(mask(s.email))}</b>. Ele vale 15 minutos.</span></div><div class="stack" style="margin-top:var(--space-6)"><button class="btn btn-primary btn-block" data-act="cxreok" data-next="${esc(next)}">Simular: abrir o link do e-mail</button><a class="btn btn-quiet btn-block" href="#/c/reauth?m=erro&next=${encodeURIComponent(next)}&why=${encodeURIComponent(why)}">Simular: link expirado</a><p class="t-small">Simulado: o e-mail de verdade não sai.</p></div>`;
    else body = `<div class="stack"><p>Você está prestes a fazer: <b>${esc(why)}</b>. Para proteger a conta de quem pediu, confirme que é você.</p><p class="t-small">Enviamos um link para ${esc(mask(s.email))}. A confirmação vale 15 minutos e depois você volta para onde estava.</p><a class="btn btn-primary btn-lg btn-block" href="#/c/reauth?sent=1&next=${encodeURIComponent(next)}&why=${encodeURIComponent(why)}">Enviar link de confirmação</a><a class="btn btn-quiet btn-block" href="#${esc(next)}">Cancelar e voltar</a></div>`;
    return loginShell(`<h1 class="t-display">Confirmar que é você</h1><p class="t-lead" style="margin:var(--space-3) 0 var(--space-6)">Passo extra para ações sensíveis.</p>${body}`);
  });
  A.acts.cxreok = (el) => { st.set('cx.reauth', now() + 15 * MIN); audit('sessao.reautenticou', 'plataforma', 'Console', '', ''); location.hash = '#/c/reauth?m=ok&next=' + encodeURIComponent(el.dataset.next); };

  /* --- menu do operador, recolher, mais --- */
  A.acts.cxmenu = (el) => { const s = sess(); const p = location.hash.replace(/^#/, ''); A.menu(el, [{ head: s.nome + ' · ' + s.email }, { head: 'Papel simulado (só no protótipo)' }, ...Object.entries(PAPEL).map(([k, l]) => ({ label: l, icon: 'users', active: s.papel === k, hint: s.papel === k ? 'atual' : '', onClick: () => { st.set('cx.sess', { ...s, papel: k }); A.render(); A.toast('Agora você vê o console como ' + l + '.'); } })), { sep: 1 }, { label: 'Confirmar minha identidade', icon: 'lock', href: '#/c/reauth?next=' + encodeURIComponent(p) + '&why=' + encodeURIComponent('confirmar a identidade') }, { label: 'Sair do console', icon: 'logout', danger: 1, onClick: A.acts.cxsair }]); };
  A.acts.cxcollapse = () => { st.set('cx.collapsed', !st.get('cx.collapsed', false)); A.render(); };
  A.acts.cxmore = () => { const L = (h, i, l) => `<a class="li" href="${h}" data-mclose>${A.icon(i, 20)}<span class="grow">${esc(l)}</span>${A.icon('chevron', 16)}</a>`; A.sheet({ title: 'Console', body: `<div class="list">${navFor().map((n) => L(n.href, n.icon, n.label)).join('')}</div>` }); };

  /* --- visão geral --- */
  const UI = { vis: '' };
  RT('/c', { id: 'visao', nome: 'Visão geral' }, (ctx) => {
    const p = ctx.q.p || '30', dias = p === 'hoje' ? 1 : +p, from = now() - dias * DAY;
    const ev = col('eventos'), sb = col('subs'), tks = col('tickets'), ds = col('dsar'), jb = col('jobs'), sg = col('seguranca');
    const janela = ev.filter((e) => e.status !== 'rascunho' && e.data >= from && e.data <= now() + DAY);
    const conv = janela.reduce((a, e) => a + e.conv, 0), parts = janela.filter((e) => e.part != null), med = parts.length ? Math.round(parts.reduce((a, e) => a + e.part, 0) / parts.length) : null;
    const mrr = sb.filter((s) => s.status === 'ativa' || s.status === 'atraso').reduce((a, s) => a + s.valor * (1 - (s.cortesia ? s.cortesia.pct / 100 : 0)), 0);
    const canc = sb.filter((s) => s.status === 'cancelada' && s.canceladaEm > now() - 30 * DAY).length, base = sb.filter((s) => s.status !== 'pendente').length, churn = base ? Math.round((canc / base) * 1000) / 10 : 0;
    const fila = [], nome = (id) => (equipe.find((m) => m.id === id) || {}).nome;
    col('tickets').forEach((t) => { if (t.status !== 'aberto') return; const ms = t.due - now(); if (ms < 60 * MIN) fila.push({ sev: ms < 0 ? 0 : 1, over: -ms, area: 'suporte', tipo: 'Suporte', txt: t.id + ' · ' + t.assunto, sub: (conta(t.contaId) || {}).nome + ' · ' + t.prio, quando: ms < 0 ? 'Estourou há ' + dur(-ms) : 'Estoura em ' + dur(ms), resp: t.resp ? nome(t.resp) : 'Sem responsável', href: '#/c/suporte?t=' + t.id }); });
    ds.forEach((d) => { if (!['recebido', 'andamento'].includes(d.status)) return; const ms = d.prazo - now(); if (ms < 3 * DAY) fila.push({ sev: ms < 0 ? 0 : 1, over: -ms, area: 'lgpd', tipo: 'LGPD', txt: d.id + ' · ' + TIPODS[d.tipo], sub: (conta(d.contaId) || {}).nome, quando: dsPrazo(d).txt.replace(/^./, (c) => c.toUpperCase()), resp: 'Prazo legal ' + fd(d.prazo), href: '#/c/lgpd' + (ms < 0 ? '?f=vencido' : '') }); });
    jb.forEach((j) => { if (j.status === 'falhou') fila.push({ sev: 0, over: now() - j.due, area: 'retencao', tipo: 'Retenção', txt: j.rot, sub: (evento(j.eventoId) || {}).titulo, quando: 'Falhou · ' + j.tent + ' tentativas', resp: 'Venceu em ' + fd(j.due), href: '#/c/retencao?v=tarefas&f=falhou' }); });
    sb.forEach((x) => { if (x.status === 'atraso') fila.push({ sev: 1, over: x.atrasoDias * DAY, area: 'assinaturas', tipo: 'Assinaturas', txt: nomeSub(x), sub: PL[x.plano] + ' · ' + A.brl(x.valor) + '/mês', quando: '≈ ' + x.atrasoDias + ' dias em atraso', resp: 'Cobrança falhou', href: '#/c/assinaturas?f=atraso' }); });
    if (can('seg.ver')) { const sr = sg.filter((x) => x.tipo === 'session.reuse' && !x.ack); if (sr.length) fila.push({ sev: 0, over: now() - sr[0].ts + 12 * HR, area: 'seguranca', tipo: 'Segurança', txt: sr.length + (sr.length === 1 ? ' sessão reaproveitada' : ' sessões reaproveitadas') + ' sem reconhecer', sub: 'Mesmo link aberto em dois aparelhos', quando: 'Mais recente ' + ago(sr[0].ts), resp: 'Sem responsável', href: '#/c/seguranca' }); }
    if (can('imp.aprovar')) Object.entries(imps()).forEach(([id, v]) => { if (v.estado === 'pendente' && v.porId !== (sess() || {}).id && conta(id)) fila.push({ sev: 1, over: now() - v.quando, area: 'contas', tipo: 'Ver como', txt: v.porNome + ' pede para ver como ' + conta(id).nome, sub: v.motivo, quando: 'Pedido ' + ago(v.quando), resp: 'Aguarda aprovação', href: '#/c/contas/' + id }); });
    fila.sort((x, y) => x.sev - y.sev || y.over - x.over);
    const AREA = { suporte: 'Suporte', lgpd: 'LGPD', retencao: 'Retenção', assinaturas: 'Assinaturas', seguranca: 'Segurança', contas: 'Contas' }, nArea = {}; fila.forEach((x) => (nArea[x.area] = (nArea[x.area] || 0) + 1));
    const TOP = 10, top = fila.slice(0, TOP), areaHref = { suporte: '#/c/suporte?f=estourado', lgpd: '#/c/lgpd?f=vencido', retencao: '#/c/retencao?v=tarefas&f=falhou', assinaturas: '#/c/assinaturas?f=atraso', seguranca: '#/c/seguranca', contas: '#/c/contas' };
    const ativosContas = col('contas'), cad = ativosContas.length, criados = ev.length, pub = ev.filter((e) => e.status !== 'rascunho').length, pagos = ev.filter((e) => e.status !== 'rascunho' && e.plano === 'completo').length;
    const funil = [['Contas criadas', cad], ['Eventos criados', criados], ['Eventos publicados', pub], ['Com plano Completo', pagos]];
    let perda = { i: 0, pct: 0 }; funil.forEach((f, i) => { if (i >= 2) { const pc = Math.round((1 - f[1] / funil[i - 1][1]) * 100); if (pc > perda.pct) perda = { i, pct: pc }; } });
    const serie = ev.filter((e) => e.part != null && e.status !== 'rascunho').sort((a, b) => a.data - b.data).slice(-14);
    const vivo = ev.filter((e) => e.status === 'ativo' && Math.abs(e.data - now()) < DAY).slice(0, 12);
    const periodChips = [['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias']].map(([v, l]) => `<a class="chip" href="#/c?p=${v}" aria-pressed="${p === v}" ${p === v ? 'aria-current="true"' : ''}>${l}</a>`).join('');
    const sec = (t, h, extra = '') => `<section class="cx-sec"><div class="flex between flex-wrap" style="align-items:baseline;margin-bottom:var(--space-3)"><h2 style="margin:0">${t}</h2>${extra}</div>${h}</section>`;
    const row = (l, v, n, cls = '') => `<tr class="${cls}"><th scope="row" style="font-weight:400;color:var(--fg);font-size:var(--fs-sm);letter-spacing:0">${l}</th><td>${v}</td><td class="t-small">${n}</td></tr>`;
    const pct = (a, b, i) => (b ? (i === 1 ? (a / b).toFixed(1).replace('.', ',') + ' evento por conta' : Math.round((a / b) * 100) + '% do passo anterior') : '');
    const html = `<div class="sr-only" aria-live="polite">${fila.length} ${fila.length === 1 ? 'item pede' : 'itens pedem'} atenção.</div>
${sec('Precisa de atenção agora', A.stateful({ isEmpty: () => !fila.length, empty: vazio({ title: 'Nada urgente agora', body: 'Nenhum prazo estourado, nenhuma falha aberta e nenhum pedido esperando a sua decisão.' }), ok: () => `<ol class="cx-fila" aria-label="Itens por urgência, do mais urgente para o menos">${top.map((x, i) => `<li><a href="${x.href}"><span class="n" aria-hidden="true">${i + 1}</span><span class="w"><b>${bd(x.sev === 0 ? 'bad' : 'warn', x.sev === 0 ? 'Urgente' : 'Atenção')} ${esc(x.txt)}</b><span class="t-small">${esc(x.tipo)}${x.sub ? ' · ' + esc(x.sub) : ''}</span></span><span class="p">${esc(x.quando)}<span class="t-small" style="display:block;line-height:1.25">${esc(x.resp)}</span></span><span aria-hidden="true">${A.icon('chevron', 16)}</span></a></li>`).join('')}</ol><p class="cx-areas t-small">${fila.length > TOP ? `Mostrando ${TOP} de ${fila.length}. ` : ''}Por área: ${Object.keys(nArea).map((k) => `<a class="cx-lk" href="${areaHref[k]}">${AREA[k]} ${nArea[k]}</a>`).join(' · ')}</p>` }), `<span class="t-small hide-sm">Ordem: urgentes primeiro, depois o que está atrasado há mais tempo</span>`)}
${sec('Leituras', A.stateful({ empty: vazio({ title: 'Sem dados para ler ainda', body: 'As leituras aparecem quando houver contas, assinaturas e eventos.' }), ok: () => `<div class="table-wrap"><table class="table cx-led"><caption class="sr-only">Indicadores da plataforma</caption><thead><tr><th scope="col">Leitura</th><th scope="col" class="num">Valor</th><th scope="col">Como ler</th></tr></thead><tbody>
${row('Receita recorrente (MRR)', A.brl(mrr), 'Valor de hoje, não muda com o período')}${row('Cancelamentos (30 dias)', churn.toString().replace('.', ',') + '%', `≈ aproximado: ${canc} de ${base} assinaturas`)}${row('Eventos ativos', ev.filter((e) => e.status === 'ativo').length, 'Publicados e ainda sem terminar')}${row('Convidados', A.pt(conv), (p === 'hoje' ? 'Hoje' : 'Nos últimos ' + dias + ' dias') + ' · ' + janela.length + ' eventos')}${row('Participação média', med == null ? '—' : med + '%', serie.length ? `<span class="cx-spark cx-hist" role="img" aria-label="Participação dos últimos ${serie.length} eventos, de ${Math.min(...serie.map((e) => e.part))}% a ${Math.max(...serie.map((e) => e.part))}%">${serie.map((e) => `<i style="height:${e.part}%" title="${esc(e.titulo)}: ${e.part}%"></i>`).join('')}</span>Quem enviou ao menos uma foto, entre quem entrou. Últimos ${serie.length} eventos, do mais antigo ao mais recente.` : 'Sem eventos com dados ainda.')}
${funil.map((f, i) => row(i ? '&nbsp;&nbsp;' + f[0] : f[0], f[1], (i ? pct(f[1], funil[i - 1][1], i) : 'Início do funil') + (i === perda.i ? ` · <b class="crit">${A.icon('warn', 14)} maior perda (${perda.pct}% não seguem)</b>` : ''), i === 0 ? 'sep' : '')).join('')}</tbody></table></div><details class="ds-fold sem-borda" style="margin-top:var(--space-3)"><summary>Como a participação é calculada</summary><div class="ds-fold-b"><p class="t-small" style="max-width:62ch">Para cada evento: convidados que enviaram pelo menos uma foto, divididos pelos convidados que entraram pelo link ou QR. A média do período ignora eventos que ainda não aconteceram.</p></div></details>` }), `<div class="chips" aria-label="Período das leituras">${periodChips}</div>`)}
${sec('Acontecendo agora', A.stateful({ isEmpty: () => !vivo.length, empty: '<p class="muted">Nenhum evento ao vivo neste momento.</p>', ok: () => `<div class="list">${vivo.map((e) => `<a class="li" href="#/c/eventos/${e.id}"><span class="badge live" aria-label="Ao vivo">Ao vivo</span><span class="grow"><b>${esc(e.titulo)}</b><span class="t-small" style="display:block">${A.pt(e.conv)} convidados · ${A.pt(e.fotos)} fotos</span></span>${A.icon('chevron', 16)}</a>`).join('')}</div><p class="t-small">Só monitoramento: o console não mexe em evento ao vivo.</p>` }))}`;
    return shell(ctx, { id: 'visao', title: 'Visão geral', lead: 'O que precisa de você, na ordem em que vence.', crumbs: [{ label: 'Console' }] }, html);
  });

  /* --- contas --- */
  TB.contas = { title: 'Contas', caption: 'Lista de contas', searchLabel: 'Buscar por nome ou e-mail', size: 15, sort: { k: 'criada', dir: 'desc' },
    rows: () => col('contas'), text: (r) => r.nome + ' ' + r.email + ' ' + r.id,
    filters: [{ k: 'tipo', label: 'Tipo', opts: [['anfitriao', 'Anfitrião'], ['fornecedor', 'Fornecedor']], test: (r, v) => r.tipo === v }, { k: 'plano', label: 'Plano', opts: Object.entries(PL), test: (r, v) => r.plano === v }, { k: 'status', label: 'Status', opts: Object.entries(CST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }],
    href: (r) => '#/c/contas/' + r.id, empty: { icon: 'users', title: 'Nenhuma conta ainda', body: 'Quando alguém criar a primeira conta, ela aparece aqui.' },
    cols: [
      { k: 'nome', label: 'Conta', sort: (r) => r.nome, render: (r) => `<a class="cx-lk" href="#/c/contas/${r.id}"><b>${esc(r.nome)}</b></a><span class="t-small" style="display:block">${esc(mask(r.email))}</span>` },
      { k: 'tipo', label: 'Tipo', sort: (r) => r.tipo, render: (r) => (r.tipo === 'fornecedor' ? 'Fornecedor' : 'Anfitrião') },
      { k: 'plano', label: 'Plano', sort: (r) => PL[r.plano], render: (r) => PL[r.plano] },
      { k: 'ev', label: 'Eventos', num: 1, sort: (r) => col('eventos').filter((e) => e.hostId === r.id || e.vendorId === r.id).length, render: (r) => col('eventos').filter((e) => e.hostId === r.id || e.vendorId === r.id).length },
      { k: 'criada', label: 'Criada', sort: (r) => r.criada, render: (r) => fd(r.criada) },
      { k: 'ult', label: 'Último acesso ≈', sort: (r) => r.ult, render: (r) => '≈ ' + ago(r.ult) },
      { k: 'status', label: 'Status', sort: (r) => CST[r.status][1], render: (r) => stBadge(CST, r.status) },
    ] };
  RT('/c/contas', { id: 'contas', nome: 'Contas', cap: 'contas.ver' }, (ctx) => shell(ctx, { id: 'contas', title: 'Contas', lead: 'Anfitriões e fornecedores. Busque, filtre e ordene sobre todas as contas, não só a página aberta.' }, tableHTML('contas') + '<p class="t-small" style="margin-top:var(--space-3)">“Último acesso” é aproximado: atualiza a cada poucos minutos.</p>'));
  RT('/c/contas/:id', { id: 'contas', nome: 'Contas', cap: 'contas.ver' }, (ctx) => {
    const c = conta(ctx.params.id); if (!c) return naoAchou(ctx, { id: 'contas', msg: 'Não achamos essa conta', hint: `Nenhuma conta com o código “${ctx.params.id}”. Ela pode ter sido excluída ou o endereço está errado.`, back: ['#/c/contas', 'Voltar às contas'] });
    const evs = col('eventos').filter((e) => e.hostId === c.id || e.vendorId === c.id), imp = impEstado(c.id), sub = col('subs').find((s) => s.contaId === c.id), me = sess();
    const tr = col('auditoria').filter((a) => a.href === '#/c/contas/' + c.id).slice(0, 6), tks = col('tickets').filter((t) => t.contaId === c.id), dss = col('dsar').filter((d) => d.contaId === c.id);
    const rev = REV.has(c.id), email = rev ? c.email : mask(c.email);
    let ib = '';
    if (!imp || ['negado', 'expirado'].includes(imp.estado)) ib = `<p class="muted">${imp && imp.estado === 'negado' ? 'O último pedido foi negado. ' : imp && imp.estado === 'expirado' ? 'A última sessão terminou. ' : 'Nenhum pedido aberto. '}</p>${can('imp.pedir') ? `<button class="btn btn-line" data-act="cxdo" data-flow="impPedir" data-a="${c.id}">Pedir para ver como esta pessoa</button>` : '<p class="t-small">Seu papel não pede “ver como”.</p>'}`;
    else if (imp.estado === 'pendente') ib = `<p>${bd('warn', 'Pedido aguardando aprovação')} de ${esc(imp.porNome)}: ${esc(imp.motivo)}</p>${can('imp.aprovar') && imp.porId !== me.id ? `<div class="flex flex-wrap"><button class="btn btn-line" data-act="cxdo" data-flow="impDecidir" data-a="${c.id}" data-b="aprovar">Aprovar</button><button class="btn btn-quiet" data-act="cxdo" data-flow="impDecidir" data-a="${c.id}" data-b="negar">Negar</button></div>` : `<p class="t-small">${imp.porId === me.id ? 'Você fez o pedido: outra pessoa da administração precisa aprovar.' : 'Só a administração aprova.'}</p>`}`;
    else if (imp.estado === 'aprovado') ib = `<p>${bd('ok', 'Aprovado')} por ${esc(imp.aprovadoPor || 'administração')}. Vale até ${fh(imp.expira)}.</p>${imp.porId === me.id ? `<button class="btn btn-line" data-act="cxdo" data-flow="impIniciar" data-a="${c.id}">Começar a ver como</button>` : `<p class="t-small">Só ${esc(imp.porNome)} pode iniciar.</p>`}`;
    else if (imp.estado === 'ativo') ib = `<p>${bd('bad', 'Sessão ativa')} até ${fh(imp.expira)}.</p><button class="btn btn-line" data-act="cxdo" data-flow="impEncerrar" data-a="${c.id}">Encerrar sessão</button>`;
    const menu = can('contas.escrever') || can('lgpd.excluir') ? `<button class="btn btn-line" data-act="cxcmenu" data-id="${c.id}" aria-haspopup="menu">Mais ações ${A.icon('chevdown', 16)}</button>` : '';
    const actions = `${can('pii.revelar') && !rev ? `<button class="btn btn-line" data-act="cxdo" data-flow="reveal" data-a="${c.id}">Revelar contato</button>` : rev ? '<button class="btn btn-line" data-act="cxoculta">Ocultar contato</button>' : ''}${menu}`;
    const html = `<div class="flex" style="margin-bottom:var(--space-6)"><span class="avatar lg" aria-hidden="true">${esc(ini(c.nome))}</span><div class="grow"><b class="t-h">${esc(email)}</b><div class="flex flex-wrap" style="gap:var(--space-3)">${stBadge(CST, c.status)}<span class="t-small">${c.tipo === 'fornecedor' ? 'Fornecedor' : 'Anfitrião'} · plano ${PL[c.plano]}${c.plano !== 'gratis' && c.tipo === 'anfitriao' ? ' · ' + A.brl(199) : ''}</span></div></div></div>
<section class="cx-sec"><h2>Identidade</h2><dl class="cx-kv"><dt>Contato</dt><dd>${esc(email)}${rev ? ' <span class="t-small">(revelado, registrado na auditoria)</span>' : ''}</dd><dt>Criada em</dt><dd>${fd(c.criada)}</dd><dt>Último acesso</dt><dd>≈ ${ago(c.ult)} <span class="t-small">(aproximado)</span></dd><dt>Consentimentos</dt><dd>${c.consent.map((x) => `Termo de ${x.v.replace('2026-08', 'agosto/2026')} aceito em ${fd(x.q)}`).join('<br>')}</dd></dl></section>
<section class="cx-sec"><h2>Atividade</h2>${evs.length ? `<div class="list">${evs.map((e) => `<a class="li" href="#/c/eventos/${e.id}"><span class="grow"><b>${esc(e.titulo)}</b><span class="t-small" style="display:block">${fd(e.data)} · ${A.pt(e.conv)} convidados</span></span>${e.apagado ? bd('bad', 'Apagado') : stBadge(EST, e.status)}${A.icon('chevron', 16)}</a>`).join('')}</div>` : '<p class="muted">Esta conta ainda não tem eventos.</p>'}${sub ? `<p style="margin-top:var(--space-3)">Assinatura: <a class="cx-lk" href="#/c/assinaturas">${PL[sub.plano]} · ${A.brl(sub.valor)}/mês</a> ${stBadge(SBS, sub.status)}</p>` : ''}</section>
<section class="cx-sec"><h2>Ver como esta pessoa</h2>${ib}</section>
<section class="cx-sec"><h2>Pedidos e tickets</h2>${tks.length || dss.length ? `<div class="list">${tks.map((t) => `<a class="li" href="#/c/suporte?t=${t.id}"><span class="grow">${esc(t.id)} · ${esc(t.assunto)}</span>${bd(TKST[t.status][1], TKST[t.status][0])}</a>`).join('')}${dss.map((d) => `<a class="li" href="#/c/lgpd"><span class="grow">${esc(TIPODS[d.tipo])} · ${esc(d.id)}</span>${bd(d.status === 'concluido' ? 'ok' : 'warn', STDS[d.status])}</a>`).join('')}</div>` : '<p class="muted">Nenhum ticket nem pedido de titular.</p>'}<div class="flex flex-wrap" style="margin-top:var(--space-3)">${can('suporte.escrever') ? `<button class="btn btn-quiet btn-sm" data-act="cxdo" data-flow="novoTicket" data-a="${c.id}">Abrir ticket para esta conta</button>` : ''}${can('lgpd.executar') ? `<button class="btn btn-quiet btn-sm" data-act="cxdo" data-flow="novoDsar" data-a="${c.id}">Abrir pedido de titular</button>` : ''}</div></section>
<section class="cx-sec"><h2>Trilha: o que a equipe fez nesta conta</h2>${tr.length ? `<div class="list">${tr.map((a) => `<div class="li"><span class="grow">${esc(ACOES[a.acao] ? ACOES[a.acao][0] : a.acao)}<span class="t-small" style="display:block">${esc(a.ator)} · ${fdt(a.ts)}${a.motivo ? ' · ' + esc(a.motivo) : ''}</span></span></div>`).join('')}</div>` : '<p class="muted">Nenhuma ação da equipe registrada ainda.</p>'}</section>`;
    return shell(ctx, { id: 'contas', title: c.nome, crumbs: [{ label: 'Console', href: '#/c' }, { label: 'Contas', href: '#/c/contas' }, { label: c.nome }], actions }, html);
  });
  A.acts.cxoculta = () => { REV.clear(); A.render(); };
  A.acts.cxcmenu = (el, e, d) => { const c = conta(d.id); A.menu(el, [...(can('contas.escrever') ? [{ label: c.status === 'suspensa' ? 'Reativar conta' : 'Suspender conta', icon: 'pause', onClick: () => FLOWS.suspender({ a: c.id }) }] : []), ...(can('lgpd.excluir') ? [{ sep: 1 }, { label: 'Abrir pedido de exclusão…', icon: 'trash', danger: 1, onClick: () => FLOWS.excluirConta({ a: c.id }) }] : [])]); };

  /* --- eventos --- */
  TB.eventos = { full: 10, title: 'Eventos', caption: 'Lista de eventos', searchLabel: 'Buscar por título ou anfitrião', size: 15, sort: { k: 'data', dir: 'desc' },
    rows: () => col('eventos'), text: (r) => r.titulo + ' ' + ((conta(r.hostId) || {}).nome || ''),
    filters: [{ k: 'status', label: 'Status', opts: [['rascunho', 'Rascunho'], ['ativo', 'Ativo'], ['encerrado', 'Encerrado']], test: (r, v) => r.status === v }, { k: 'tipo', label: 'Tipo', opts: Object.entries(TIPOEV), test: (r, v) => r.tipo === v }],
    href: (r) => '#/c/eventos/' + r.id, empty: { icon: 'calendar', title: 'Nenhum evento ainda', body: 'Eventos aparecem aqui assim que alguém os cria.' },
    cols: [
      { k: 'titulo', label: 'Evento', sort: (r) => r.titulo, render: (r) => `<a class="cx-lk" href="#/c/eventos/${r.id}"><b>${esc(r.titulo)}</b></a><span class="t-small" style="display:block">${TIPOEV[r.tipo]}</span>` },
      { k: 'host', label: 'Anfitrião', sort: (r) => (conta(r.hostId) || {}).nome || '', render: (r) => esc((conta(r.hostId) || {}).nome || '—') },
      { k: 'vendor', label: 'Fornecedor', sort: (r) => (conta(r.vendorId) || {}).nome || '', render: (r) => esc((conta(r.vendorId) || {}).nome || '—') },
      { k: 'data', label: 'Data', sort: (r) => r.data, render: (r) => fd(r.data) },
      { k: 'conv', label: 'Convidados', num: 1, sort: (r) => r.conv, render: (r) => A.pt(r.conv) },
      { k: 'fotos', label: 'Fotos', num: 1, sort: (r) => r.fotos, render: (r) => A.pt(r.fotos) },
      { k: 'part', label: 'Participação', num: 1, sort: (r) => (r.part == null ? -1 : r.part), render: (r) => (r.part == null ? '—' : r.part + '%') },
      { k: 'status', label: 'Status', sort: (r) => (r.apagado ? 'Apagado' : EST[r.status][1]), render: (r) => (r.apagado ? bd('bad', 'Apagado') : stBadge(EST, r.status)) },
    ] };
  RT('/c/eventos', { id: 'eventos', nome: 'Eventos', cap: 'eventos.ver' }, (ctx) => shell(ctx, { id: 'eventos', title: 'Eventos', lead: 'Todos os eventos da plataforma. “Participação” é o percentual de convidados que enviaram ao menos uma foto.' }, tableHTML('eventos')));
  RT('/c/eventos/:id', { id: 'eventos', nome: 'Eventos', cap: 'eventos.ver' }, (ctx) => {
    const e = evento(ctx.params.id); if (!e) return naoAchou(ctx, { id: 'eventos', msg: 'Não achamos esse evento', hint: `Nenhum evento com o código “${ctx.params.id}”.`, back: ['#/c/eventos', 'Voltar aos eventos'] });
    const h = conta(e.hostId), v = conta(e.vendorId), js = jobsDe(e.id), j330 = js.find((x) => x.etapa === 'd330'), j365 = js.find((x) => x.etapa === 'd365');
    const funil = e.funil ? [['Abriram o link ou QR', e.funil[0]], ['Informaram o nome', e.funil[1]], ['Aceitaram o consentimento', e.funil[2]], ['Enviaram a 1ª foto', e.funil[3]]] : null;
    const actions = `${can('suporte.escrever') ? `<button class="btn btn-line" data-act="cxdo" data-flow="novoTicket" data-a="${e.hostId}">Abrir ticket para o anfitrião</button>` : ''}${e.painel ? `<a class="btn btn-line" href="#/h/e/${e.painel}/hoje">Ver painel do anfitrião ${A.icon('arrow', 16)}</a>` : ''}`;
    const html = `<p class="flex flex-wrap" style="gap:var(--space-3)">${e.apagado ? bd('bad', 'Apagado') : stBadge(EST, e.status)}<span class="t-small">${TIPOEV[e.tipo]} · ${fd(e.data)}</span>${e.part != null ? `<span class="t-small">Participação: <b>${e.part}%</b></span>` : ''}</p>
<section class="cx-sec"><h2>Identidade</h2><dl class="cx-kv"><dt>Anfitrião</dt><dd>${h ? lk('#/c/contas/' + h.id, h.nome) : '—'}</dd><dt>Fornecedor</dt><dd>${v ? lk('#/c/contas/' + v.id, v.nome) : 'Sem fornecedor'}</dd><dt>Data</dt><dd>${fd(e.data)}</dd><dt>Convidados esperados</dt><dd>${A.pt(e.esp)}</dd><dt>Convidados que entraram</dt><dd>${A.pt(e.conv)}</dd><dt>Fotos</dt><dd>${A.pt(e.fotos)}</dd></dl></section>
<section class="cx-sec"><h2>Participação dos convidados</h2>${funil ? `<div class="stack-3">${funil.map((f) => `<div><div class="flex between"><span>${f[0]}</span><b class="t-mono">${A.pt(f[1])}</b></div><div class="cx-bar" aria-hidden="true"><i style="width:${Math.round((f[1] / funil[0][1]) * 100)}%"></i></div></div>`).join('')}</div><details class="ds-fold sem-borda" style="margin-top:var(--space-3)"><summary>Como a participação é calculada</summary><div class="ds-fold-b"><p class="t-small" style="max-width:62ch">Convidados que enviaram ao menos uma foto, divididos pelos que entraram. Aqui: ${A.pt(e.funil[3])} de ${A.pt(e.funil[2])}.</p></div></details>` : '<p class="muted">O evento ainda não aconteceu: não há dados de participação.</p>'}</section>
<section class="cx-sec"><h2>Consentimento</h2>${e.consent.length ? `<dl class="cx-kv">${e.consent.map((c) => `<dt>Termo de ${c[0].replace('2026-08', 'agosto/2026').replace('2026-05', 'maio/2026')}</dt><dd>${A.pt(c[1])} aceites</dd>`).join('')}</dl>` : '<p class="muted">Ninguém entrou ainda.</p>'}</section>
<section class="cx-sec"><h2>Retenção</h2><dl class="cx-kv"><dt>Exportar para a nuvem</dt><dd>${fd(e.data + 330 * DAY)} (dia 330) ${j330 ? stBadge(JST, j330.status) : ''}</dd><dt>Apagar o evento</dt><dd>${fd(e.data + 365 * DAY)} (dia 365) ${e.apagado ? bd('bad', 'Apagado') : j365 ? stBadge(JST, j365.status) : ''}</dd></dl><p style="margin-top:var(--space-3)"><a class="cx-lk" href="#/c/retencao?e=${e.id}">Ver na tela de retenção</a></p></section>`;
    return shell(ctx, { id: 'eventos', title: e.titulo, crumbs: [{ label: 'Console', href: '#/c' }, { label: 'Eventos', href: '#/c/eventos' }, { label: e.titulo }], actions }, html);
  });

  /* --- assinaturas --- */
  TB.subs = { title: 'Assinaturas', caption: 'Assinaturas de fornecedores', searchLabel: 'Buscar fornecedor', size: 12, sort: { k: 'prox', dir: 'asc' },
    rows: () => col('subs'), text: (r) => nomeSub(r),
    filters: [{ k: 'status', label: 'Status', opts: Object.entries(SBS).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }, { k: 'plano', label: 'Plano', opts: Object.keys(PRECO).map((k) => [k, PL[k]]), test: (r, v) => r.plano === v }],
    empty: { icon: 'wallet', title: 'Nenhuma assinatura', body: 'Assinaturas de fornecedores aparecem aqui.' },
    cols: [
      { k: 'forn', label: 'Fornecedor', sort: (r) => nomeSub(r), render: (r) => lk('#/c/contas/' + r.contaId, nomeSub(r)) },
      { k: 'plano', label: 'Plano', sort: (r) => PL[r.plano], render: (r) => PL[r.plano] + (r.cortesia ? `<span class="t-small" style="display:block">Cortesia ${r.cortesia.pct}% · ${r.cortesia.meses} ${r.cortesia.meses === 1 ? 'mês' : 'meses'}</span>` : '') },
      { k: 'status', label: 'Status', sort: (r) => SBS[r.status][1], render: (r) => stBadge(SBS, r.status) },
      { k: 'prox', label: 'Próxima cobrança', sort: (r) => r.prox || 9e15, render: (r) => (r.prox ? fd(r.prox) : '—') },
      { k: 'atraso', label: 'Atraso', num: 1, sort: (r) => r.atrasoDias, render: (r) => (r.atrasoDias ? atrasoTag(true, '≈ ' + r.atrasoDias + ' dias') : '—') },
      { k: 'valor', label: 'Valor/mês', num: 1, sort: (r) => r.valor, render: (r) => A.brl(r.valor) },
      { k: 'acoes', label: 'Ações', render: (r) => (can('subs.escrever') && r.status !== 'cancelada' ? `<button class="btn btn-sm btn-line" data-act="cxsubmenu" data-id="${r.id}" aria-haspopup="menu" aria-label="Ações de ${esc(nomeSub(r))}">Gerir ${A.icon('chevdown', 14)}</button>` : can('subs.escrever') ? '<span class="muted">Cancelada</span>' : '<span class="muted" title="Seu papel só lê assinaturas">Só leitura</span>') },
    ] };
  RT('/c/assinaturas', { id: 'assinaturas', nome: 'Assinaturas', cap: 'subs.ver' }, (ctx) => {
    preset('subs', 'status', ctx.q.f); const sb = col('subs'), atv = sb.filter((s) => s.status === 'ativa' || s.status === 'atraso'), mrr = atv.reduce((a, s) => a + s.valor * (1 - (s.cortesia ? s.cortesia.pct / 100 : 0)), 0);
    const canc = sb.filter((s) => s.status === 'cancelada' && s.canceladaEm > now() - 30 * DAY).length;
    return shell(ctx, { id: 'assinaturas', title: 'Assinaturas', lead: 'Assinaturas de fornecedores. O plano Completo dos anfitriões é pago por evento e aparece na conta de cada um.' }, figs([['Receita recorrente (MRR)', A.brl(mrr)], ['Ativas', atv.length], ['Em atraso', sb.filter((s) => s.status === 'atraso').length, 1], ['Cancelamentos (30 dias) ≈', canc]]) + tableHTML('subs'));
  });
  A.acts.cxsubmenu = (el, e, d) => A.menu(el, [{ label: 'Trocar plano', icon: 'tag', onClick: () => FLOWS.subPlano({ a: d.id }) }, { label: 'Conceder cortesia', icon: 'gift', onClick: () => FLOWS.subCortesia({ a: d.id }) }, { label: 'Reembolsar pagamento', icon: 'wallet', onClick: () => FLOWS.subReembolsar({ a: d.id }) }, { sep: 1 }, { label: 'Cancelar assinatura…', icon: 'x', danger: 1, onClick: () => FLOWS.subCancelar({ a: d.id }) }]);

  /* --- suporte --- */
  TB.tk = { title: 'Fila de tickets', caption: 'Fila de tickets', searchLabel: 'Buscar por assunto, cliente ou código', size: 10, sort: { k: 'sla', dir: 'asc' },
    rows: () => col('tickets'), text: (r) => r.id + ' ' + r.assunto + ' ' + ((conta(r.contaId) || {}).nome || ''), def: { estado: 'abertos' },
    filters: [{ k: 'estado', label: 'Situação', opts: [['abertos', 'Em aberto'], ['estourado', 'SLA estourado'], ['resolvidos', 'Resolvidos e fechados']], test: (r, v) => (v === 'abertos' ? ['aberto', 'pendente'].includes(r.status) : v === 'estourado' ? slaOf(r).bad : ['resolvido', 'fechado'].includes(r.status)) }, { k: 'prio', label: 'Prioridade', opts: [['P0', 'P0'], ['P1', 'P1'], ['P2', 'P2']], test: (r, v) => r.prio === v }, { k: 'resp', label: 'Responsável', opts: [['eu', 'Meus'], ['nenhum', 'Sem responsável']], test: (r, v) => (v === 'eu' ? r.resp === (sess() || {}).id : !r.resp) }],
    href: (r) => '#/c/suporte?t=' + r.id, rowCls: (r) => (UI.tk === r.id ? 'cx-sel' : ''), empty: { icon: 'chat', title: 'Nenhum ticket', body: 'Quando um cliente pedir ajuda, o ticket entra aqui.', cta: '<button class="btn btn-line" data-act="cxdo" data-flow="novoTicket">Abrir ticket</button>' },
    cols: [
      { k: 'ass', label: 'Ticket', sort: (r) => r.assunto, render: (r) => `<a class="cx-lk" href="#/c/suporte?t=${r.id}"><b>${esc(r.assunto)}</b></a><span class="t-small" style="display:block">${esc(r.id)} · ${esc((conta(r.contaId) || {}).nome || '')}</span>` },
      { k: 'sla', label: 'Prazo', sort: (r) => (r.status === 'aberto' ? r.due : 9e15 + r.due), render: (r) => { const s = slaOf(r); return `<b>${r.prio}</b><span class="t-small" style="display:block">${atrasoTag(s.bad, s.txt)}</span>`; } },
      { k: 'status', label: 'Status', sort: (r) => TKST[r.status][0], render: (r) => bd(TKST[r.status][1], TKST[r.status][0]) },
    ] };
  RT('/c/suporte', { id: 'suporte', nome: 'Suporte', cap: 'suporte.ver' }, (ctx) => {
    preset('tk', 'estado', ctx.q.f === 'estourado' ? 'estourado' : ''); UI.tk = ctx.q.t || '';
    const t = UI.tk ? col('tickets').find((x) => x.id === UI.tk) : null;
    if (UI.tk && !t) return naoAchou(ctx, { id: 'suporte', msg: 'Não achamos esse ticket', hint: `Nenhum ticket com o código “${UI.tk}”.`, back: ['#/c/suporte', 'Voltar à fila'] });
    const open = col('tickets').filter((x) => ['aberto', 'pendente'].includes(x.status)).length, est = col('tickets').filter((x) => slaOf(x).bad).length;
    const detail = t ? ticketDetail(t) : vazio({ title: 'Selecione um ticket', body: 'Escolha um da fila para ler a conversa e responder. Nada é aberto sozinho.' });
    const html = `<p class="t-small" style="margin-bottom:var(--space-4)">${open} em aberto · ${est ? `<span class="crit">${A.icon('warn', 14)} ${est} com prazo estourado</span>` : 'nenhum com prazo estourado'}</p><div class="cx-2p ${t ? 'cx-has-t' : ''}"><div class="cx-q">${tableHTML('tk')}</div><div>${detail}</div></div>`;
    return shell(ctx, { id: 'suporte', title: 'Suporte', lead: 'Fila de tickets por prazo de resposta.', actions: can('suporte.escrever') ? '<button class="btn btn-line" data-act="cxdo" data-flow="novoTicket">Abrir ticket</button>' : '' }, html);
  });
  function ticketDetail(t) {
    const c = conta(t.contaId) || { nome: '—', email: 'x@x', plano: 'gratis' }, w = can('suporte.escrever'), as = can('suporte.atribuir'), eventosN = col('eventos').filter((e) => e.hostId === c.id).length, sub = col('subs').find((s) => s.contaId === c.id);
    const sel = (f, v, opts, dis) => `<div class="field"><label for="tk-${f}">${{ status: 'Status', prio: 'Prioridade', resp: 'Responsável' }[f]}</label><select class="select" id="tk-${f}" data-change="cxtk" data-id="${t.id}" data-f="${f}" ${dis ? 'disabled' : ''}>${opts.map(([a, b]) => `<option value="${a}" ${String(a) === String(v ?? '') ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>`;
    return `<a class="btn btn-quiet btn-sm only-sm" href="#/c/suporte" style="margin-bottom:var(--space-3)">${A.icon('back', 16)} Voltar à fila</a><h2 class="t-title">${esc(t.assunto)}</h2><p class="t-small">${esc(t.id)} · ${lk('#/c/contas/' + c.id, c.nome)} · ${esc(mask(c.email))} · aberto ${ago(t.criado)}</p>
<div class="grid g3" style="margin:var(--space-4) 0">${sel('status', t.status, Object.entries(TKST).map(([k, v]) => [k, v[0]]), !w)}${sel('prio', t.prio, [['P0', 'P0 · urgente'], ['P1', 'P1 · alta'], ['P2', 'P2 · normal']], !w)}${sel('resp', t.resp, [['', 'Sem responsável'], ...equipe.filter((m) => m.papel !== 'leitura' && m.status === 'ativo').map((m) => [m.id, m.nome])], !as)}</div>${!w ? `<p class="cx-note">${A.icon('lock', 16)}<span>Seu papel (${PAPEL[papel()]}) só lê tickets. Para responder ou mudar o status, peça a alguém do suporte.</span></p>` : ''}
<section class="cx-sec"><h2>Conversa</h2>${t.msgs.map((m) => `<div class="cx-msg ${m.de === 'equipe' ? 'eq' : ''}"><div class="flex" style="gap:var(--space-2)"><b>${m.de === 'equipe' ? esc(m.autor) : esc(c.nome) + ' (cliente)'}</b><span class="t-small">${fdt(m.ts)}</span></div><p style="margin-top:var(--space-1);white-space:pre-wrap">${esc(m.texto)}</p></div>`).join('')}</section>
${w ? `<form data-submit="cxreply" data-id="${t.id}" novalidate class="stack-3">${A.field({ name: 'texto', label: 'Responder ao cliente', rows: 5, required: true, hint: 'O cliente recebe por e-mail. O ticket passa a “Aguardando cliente”.' })}<div><button class="btn btn-primary" type="submit">${A.icon('send', 16)} Enviar resposta</button></div></form>` : ''}
<section class="cx-sec"><h2>Sobre o cliente</h2><dl class="cx-kv"><dt>Plano</dt><dd>${PL[c.plano]}</dd><dt>Eventos</dt><dd>${eventosN}</dd>${sub ? `<dt>Assinatura</dt><dd>${stBadge(SBS, sub.status)} ${A.brl(sub.valor)}/mês</dd>${sub.pags.slice(0, 2).map((p) => `<dt>Pagamento de ${fd(p.data)}</dt><dd>${A.brl(p.valor)} · ${p.reemb ? 'reembolsado' : p.status}</dd>`).join('')}` : ''}</dl></section>`;
  }

  /* --- LGPD --- */
  TB.dsar = { title: 'Pedidos de titulares', caption: 'Pedidos de titulares de dados', searchLabel: 'Buscar por titular ou código', size: 10, sort: { k: 'prazo', dir: 'asc' },
    rows: () => col('dsar'), text: (r) => r.id + ' ' + ((conta(r.contaId) || {}).nome || '') + ' ' + TIPODS[r.tipo], def: { estado: 'abertos' },
    filters: [{ k: 'estado', label: 'Situação', opts: [['abertos', 'Em aberto'], ['vencido', 'Vencidos'], ['feitos', 'Concluídos e recusados']], test: (r, v) => (v === 'abertos' ? ['recebido', 'andamento'].includes(r.status) : v === 'vencido' ? dsPrazo(r).bad : ['concluido', 'recusado'].includes(r.status)) }, { k: 'tipo', label: 'Tipo', opts: Object.entries(TIPODS), test: (r, v) => r.tipo === v }],
    empty: { icon: 'shield', title: 'Nenhum pedido de titular', body: 'Quando alguém pedir acesso, correção ou exclusão dos dados, o pedido aparece aqui.' },
    cols: [
      { k: 'tit', label: 'Titular', sort: (r) => (conta(r.contaId) || {}).nome || '', render: (r) => { const c = conta(r.contaId) || { nome: '—', email: '@' }; return `<a class="cx-lk" href="#/c/contas/${r.contaId}"><b>${esc(c.nome)}</b></a><span class="t-small" style="display:block">${esc(mask(c.email))} · ${esc(r.id)}</span>`; } },
      { k: 'tipo', label: 'Pedido', sort: (r) => TIPODS[r.tipo], render: (r) => TIPODS[r.tipo] },
      { k: 'rec', label: 'Recebido', sort: (r) => r.recebido, render: (r) => fd(r.recebido) },
      { k: 'prazo', label: 'Prazo legal', sort: (r) => r.prazo, render: (r) => { const p = dsPrazo(r); return `${fd(r.prazo)}<span class="t-small" style="display:block">${atrasoTag(p.bad, p.txt)}</span>`; } },
      { k: 'status', label: 'Situação', sort: (r) => STDS[r.status], render: (r) => bd({ recebido: 'warn', andamento: 'info', concluido: 'ok', recusado: '' }[r.status], STDS[r.status]) },
      { k: 'ac', label: 'Ações', render: (r) => (['recebido', 'andamento'].includes(r.status) ? (can('lgpd.executar') ? `<button class="btn btn-sm btn-line" data-act="cxdsmenu" data-id="${r.id}" aria-haspopup="menu">Atender ${A.icon('chevdown', 14)}</button>` : '<span class="muted" title="Seu papel só lê pedidos">Só leitura</span>') : r.comprovante ? `<a class="cx-lk" href="${esc(r.comprovante)}" target="_blank" rel="noopener">Comprovante</a>` : '—') },
    ] };
  RT('/c/lgpd', { id: 'lgpd', nome: 'LGPD', cap: 'lgpd.ver' }, (ctx) => {
    preset('dsar', 'estado', ctx.q.f === 'vencido' ? 'vencido' : ''); const d = col('dsar'), ab = d.filter((x) => ['recebido', 'andamento'].includes(x.status)), venc = ab.filter((x) => dsPrazo(x).bad).length;
    const actions = `${can('lgpd.executar') ? '<button class="btn btn-primary" data-act="cxdo" data-flow="novoDsar">Novo pedido</button>' : ''}<a class="btn btn-quiet" href="#/c/retencao">Ver retenção ${A.icon('arrow', 16)}</a>`;
    return shell(ctx, { id: 'lgpd', title: 'LGPD', lead: 'Pedidos de pessoas sobre os próprios dados, com prazo legal de 15 dias.', actions }, figs([['Em aberto', ab.length], ['Vencidos', venc, 1], ['No prazo', ab.length - venc]]) + tableHTML('dsar'));
  });
  A.acts.cxdsmenu = (el, e, d) => { const x = dsDe(d.id); A.menu(el, [{ label: 'Atualizar pedido', icon: 'edit', onClick: () => FLOWS.atenderDsar({ a: d.id }) }, { label: 'Ver conta do titular', icon: 'users', href: '#/c/contas/' + x.contaId }, ...(x.tipo === 'exclusao' && can('lgpd.excluir') ? [{ sep: 1 }, { label: 'Executar exclusão da conta…', icon: 'trash', danger: 1, onClick: () => FLOWS.execExclusao({ a: d.id }) }] : [])]); };

  /* --- retenção --- */
  const UIret = { v: 'eventos' };
  TB.retev = { title: 'Retenção por evento', caption: 'Retenção por evento', searchLabel: 'Buscar evento', size: 12, sort: { k: 'd365', dir: 'asc' },
    rows: () => col('eventos').filter((e) => e.status !== 'rascunho'), text: (r) => r.titulo,
    filters: [{ k: 'sit', label: 'Situação', opts: [['falha', 'Exportação com falha'], ['prox', 'Vence em 30 dias'], ['apagado', 'Já apagados']], test: (r, v) => (v === 'falha' ? jobsDe(r.id).some((j) => j.status === 'falhou') : v === 'apagado' ? r.apagado : !r.apagado && r.data + 365 * DAY > now() && r.data + 365 * DAY < now() + 30 * DAY) }],
    extra: (rows, s) => (s.e ? rows.filter((r) => r.id === s.e) : rows), hasExtra: (s) => !!s.e, reset: (s) => { s.e = ''; },
    empty: { icon: 'clock', title: 'Nenhum evento com retenção', body: 'Eventos publicados entram aqui com as datas de exportação e exclusão.' },
    cols: [
      { k: 'ev', label: 'Evento', sort: (r) => r.titulo, render: (r) => lk('#/c/eventos/' + r.id, r.titulo) + `<span class="t-small" style="display:block">Festa em ${fd(r.data)}</span>` },
      { k: 'd330', label: 'Exportar (dia 330)', sort: (r) => r.data, render: (r) => { const j = jobsDe(r.id).find((x) => x.etapa === 'd330'); return `${fd(r.data + 330 * DAY)}<span class="t-small" style="display:block">${j ? stBadge(JST, j.status) : ''}</span>`; } },
      { k: 'd365', label: 'Apagar (dia 365)', sort: (r) => r.data, render: (r) => { const j = jobsDe(r.id).find((x) => x.etapa === 'd365'); return `${fd(r.data + 365 * DAY)}<span class="t-small" style="display:block">${r.apagado ? bd('bad', 'Apagado') : j ? stBadge(JST, j.status) : ''}</span>`; } },
      { k: 'ac', label: 'Ações', render: (r) => (can('ret.escrever') && !r.apagado ? `<button class="btn btn-sm btn-line" data-act="cxretmenu" data-id="${r.id}" aria-haspopup="menu" aria-label="Ações de ${esc(r.titulo)}">Gerir ${A.icon('chevdown', 14)}</button>` : r.apagado ? '<span class="muted">Apagado</span>' : '<span class="muted" title="Seu papel só lê a retenção">Só leitura</span>') },
    ] };
  TB.retjob = { title: 'Tarefas automáticas', caption: 'Tarefas automáticas de retenção', searchLabel: 'Buscar por evento', size: 12, sort: { k: 'due', dir: 'asc' },
    rows: () => col('jobs'), text: (r) => ((evento(r.eventoId) || {}).titulo || '') + ' ' + r.rot,
    filters: [{ k: 'status', label: 'Situação', opts: Object.entries(JST).map(([k, v]) => [k, v[1]]), test: (r, v) => r.status === v }, { k: 'etapa', label: 'Etapa', opts: ETAPAS.map((x) => [x[0], x[1].split(' (')[0]]), test: (r, v) => r.etapa === v }],
    empty: { icon: 'clock', title: 'Nenhuma tarefa', body: 'As tarefas automáticas aparecem aqui.' },
    cols: [
      { k: 'ev', label: 'Evento', sort: (r) => (evento(r.eventoId) || {}).titulo || '', render: (r) => lk('#/c/eventos/' + r.eventoId, (evento(r.eventoId) || {}).titulo || '—') },
      { k: 'rot', label: 'Etapa', sort: (r) => r.rot, render: (r) => esc(r.rot) },
      { k: 'status', label: 'Situação', sort: (r) => JST[r.status][1], render: (r) => stBadge(JST, r.status) + (r.erro ? `<span class="t-small" style="display:block;max-width:34ch">${esc(r.erro)}</span>` : '') },
      { k: 'due', label: 'Vence', sort: (r) => r.due, render: (r) => atrasoTag(r.status === 'falhou', fd(r.due)) },
      { k: 'tent', label: 'Tentativas', num: 1, sort: (r) => r.tent, render: (r) => r.tent },
      { k: 'ac', label: 'Ações', render: (r) => (r.status === 'falhou' && can('ret.escrever') ? `<button class="btn btn-sm btn-line" data-act="cxdo" data-flow="retry" data-a="${r.id}">Tentar de novo</button>` : '—') },
    ] };
  RT('/c/retencao', { id: 'retencao', nome: 'Retenção', cap: 'ret.ver' }, (ctx) => {
    if (ctx.q.v) UIret.v = ctx.q.v === 'tarefas' ? 'tarefas' : 'eventos'; preset('retjob', 'status', ctx.q.f); tstate('retev').e = ctx.q.e || '';
    const tv = UIret.v === 'tarefas', fal = col('jobs').filter((j) => j.status === 'falhou').length;
    const sw = `<div class="chips" data-single="1" style="margin-bottom:var(--space-4)" role="group" aria-label="Visão"><button class="chip" data-act="cxretv" data-v="eventos" aria-pressed="${!tv}">Por evento</button><button class="chip" data-act="cxretv" data-v="tarefas" aria-pressed="${tv}">Tarefas automáticas${fal ? ` <span class="n">${fal} com falha</span>` : ''}</button></div>`;
    return shell(ctx, { id: 'retencao', title: 'Retenção', lead: 'O que é guardado, exportado e apagado, e quando. Exportação no dia 330, exclusão no dia 365.' }, sw + (ctx.q.e ? `<p class="cx-note" style="margin-bottom:var(--space-4)">${A.icon('filter', 16)}<span class="grow">Mostrando só um evento.</span><a class="cx-lk" href="#/c/retencao">Mostrar todos</a></p>` : '') + tableHTML(tv ? 'retjob' : 'retev'));
  });
  A.acts.cxretv = (el, e, d) => { UIret.v = d.v; A.render(); };
  A.acts.cxretmenu = (el, e, d) => A.menu(el, [{ label: 'Exportar agora', icon: 'download', onClick: () => FLOWS.exportar({ a: d.id }) }, { sep: 1 }, { label: 'Apagar agora…', icon: 'trash', danger: 1, onClick: () => FLOWS.apagar({ a: d.id }) }]);

  /* --- auditoria --- */
  const per = { '24h': 1, '7d': 7, '30d': 30 };
  TB.aud = { full: 13, title: 'Registro de auditoria', caption: 'Registro de auditoria', searchLabel: 'Buscar por ação, alvo ou motivo', size: 15, sort: { k: 'ts', dir: 'desc' }, def: { per: '30d' },
    rows: () => col('auditoria'), text: (r) => (ACOES[r.acao] ? ACOES[r.acao][0] : r.acao) + ' ' + r.acao + ' ' + r.rotulo + ' ' + r.motivo + ' ' + r.ator,
    filters: [{ k: 'per', label: 'Período', opts: [['24h', '24 horas'], ['7d', '7 dias'], ['30d', '30 dias']], test: (r, v) => r.ts >= now() - per[v] * DAY }, { k: 'alvo', label: 'Alvo', opts: Object.entries(ALVOS), test: (r, v) => r.alvo === v }, { k: 'ator', label: 'Quem fez', opts: equipe.slice(0, 5).map((m) => [m.id, m.nome]), test: (r, v) => r.atorId === v }],
    extra: (rows, s) => rows.filter((r) => (!s.de || r.ts >= new Date(s.de + 'T00:00:00').getTime()) && (!s.ate || r.ts <= new Date(s.ate + 'T23:59:59').getTime())), hasExtra: (s) => !!(s.de || s.ate), reset: (s) => { s.de = ''; s.ate = ''; s.f = { per: '30d' }; },
    toolExtra: (s) => `<div class="cx-fg"><span class="t-small">Datas</span><label class="sr-only" for="aud-de">De</label><input class="input" style="width:auto" type="date" id="aud-de" value="${esc(s.de || '')}" data-change="cxaud" data-k="de"><span class="t-small">até</span><label class="sr-only" for="aud-ate">Até</label><input class="input" style="width:auto" type="date" id="aud-ate" value="${esc(s.ate || '')}" data-change="cxaud" data-k="ate"></div>`,
    empty: { icon: 'list', title: 'O registro está vazio', body: 'Toda ação feita no console aparece aqui.' },
    cols: [
      { k: 'ts', label: 'Quando', sort: (r) => r.ts, render: (r) => `${fdt(r.ts)}<span class="t-small" style="display:block">${ago(r.ts)}</span>` },
      { k: 'ator', label: 'Quem', sort: (r) => r.ator, render: (r) => esc(r.ator) },
      { k: 'acao', label: 'O que fez', sort: (r) => (ACOES[r.acao] ? ACOES[r.acao][0] : r.acao), render: (r) => `${esc(ACOES[r.acao] ? ACOES[r.acao][0] : r.acao)}<span class="cx-mono" style="display:block">${esc(r.acao)}</span>` },
      { k: 'alvo', label: 'Alvo', sort: (r) => r.rotulo, render: (r) => `<span class="t-small" style="display:block">${esc(ALVOS[r.alvo] || r.alvo)}</span>${r.href ? lk(r.href, r.rotulo) : esc(r.rotulo)}` },
      { k: 'mot', label: 'Motivo', sort: (r) => r.motivo, render: (r) => (r.motivo ? `<span title="${esc(r.motivo)}">${esc(r.motivo)}</span>` : '<span class="muted">—</span>') },
      { k: 'det', label: 'Detalhes', render: (r) => `<details class="ds-fold sem-borda"><summary>Ver</summary><div class="ds-fold-b t-small">${r.motivo ? 'Motivo: ' + esc(r.motivo) + '<br>' : ''}Origem (IP, resumido): <span class="cx-mono">${esc(r.ip)}</span>${Object.entries(r.meta || {}).map(([k, v]) => `<br>${esc(k)}: ${esc(String(v))}`).join('')}</div></details>` },
    ] };
  A.inputs.cxaud = (el, e, d) => { const s = tstate('aud'); s[d.k] = el.value; s.page = 1; refresh('aud'); };
  RT('/c/auditoria', { id: 'auditoria', nome: 'Auditoria', cap: 'audit.ver' }, (ctx) => shell(ctx, { id: 'auditoria', title: 'Auditoria', lead: 'Registro imutável: ninguém edita nem apaga linhas. Toda ação feita neste console aparece aqui, com quem fez e por quê.', actions: can('audit.exportar') ? `<button class="btn btn-line" data-act="cxexp">${A.icon('download', 16)} Exportar CSV</button>` : '' }, tableHTML('aud')));
  A.acts.cxexp = () => {
    if (!can('audit.exportar')) return A.toast('Só a administração exporta a auditoria.', { kind: 'bad' }); const rows = rowsOf('aud');
    if (!rows.length) return A.toast('Não há linhas com esses filtros para exportar.', { kind: 'bad' });
    const q = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"'; const csv = '﻿' + ['Quando;Quem;Ação;Código;Alvo;Motivo', ...rows.map((r) => [fdt(r.ts), r.ator, (ACOES[r.acao] || [r.acao])[0], r.acao, ALVOS[r.alvo] + ': ' + r.rotulo, r.motivo].map(q).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'auditoria-albora.csv'; document.body.append(a); a.click(); a.remove();
    audit('auditoria.exportada', 'plataforma', 'Registro de auditoria', '#/c/auditoria', '', { linhas: rows.length }); secAdd('export.large', sess().nome, rows.length + ' linhas'); A.toast(rows.length + ' linhas exportadas. A exportação também ficou registrada.'); A.render();
  };

  /* --- segurança --- */
  const SG = { tipo: 'todos', per: '30d' };
  function segBody() {
    return A.stateful({ isEmpty: () => !col('seguranca').length, empty: vazio({ title: 'Nenhum evento de segurança', body: 'Quando algo suspeito acontecer, aparece aqui.' }), ok: () => {
      const all = col('seguranca').filter((x) => x.ts >= now() - per[SG.per] * DAY), rows = SG.tipo === 'todos' ? all : all.filter((x) => x.tipo === SG.tipo);
      if (!rows.length) return vazio({ title: 'Nada neste filtro', body: 'Nenhum evento de segurança neste tipo e período. Experimente 30 dias.' });
      const reu = all.filter((x) => x.tipo === 'session.reuse' && !x.ack);
      const tipos = Object.keys(SEC).filter((t) => SG.tipo === 'todos' || SG.tipo === t);
      const alert = reu.length ? `<div class="banner bad" role="alert" style="margin-bottom:var(--space-6)">${A.icon('warn', 20)}<span class="grow"><b>${reu.length} sessão(ões) reaproveitada(s) sem reconhecer.</b> O mesmo link de acesso foi aberto em dois aparelhos. Pode ser alguém usando o link de outra pessoa.</span>${can('seg.ver') ? '<button class="btn btn-sm btn-line" data-act="cxdo" data-flow="reconhecer">Reconhecer</button>' : ''}</div>` : '';
      return alert + `<p class="t-small" aria-live="polite" style="margin-bottom:var(--space-2)">${rows.length} ocorrências no período (mostrando até 25 por tipo, das mais recentes).</p><div class="stack-5">${tipos.map((tp) => { const rs = rows.filter((x) => x.tipo === tp); if (!rs.length) return '';
        const dias = Array.from({ length: 7 }, (_, i) => rs.filter((x) => now() - x.ts >= i * DAY && now() - x.ts < (i + 1) * DAY).length).reverse(), mx = Math.max(1, ...dias);
        return `<section class="cx-sec" style="padding-top:var(--space-4)"><div class="flex between flex-wrap"><div><h2 style="margin:0">${esc(SEC[tp])} <span class="muted">· ${rs.length}</span></h2><span class="cx-mono">${tp}</span></div><div class="cx-spark cx-spk" role="img" aria-label="Por dia nos últimos 7 dias: ${dias.join(', ')}">${dias.map((n) => `<i style="height:${Math.max(6, Math.round((n / mx) * 100))}%"></i>`).join('')}</div></div><details class="ds-fold sem-borda"><summary>Ver ocorrências</summary><div class="ds-fold-b"><div class="table-wrap"><table class="table cx-lt"><thead><tr><th scope="col" class="cx-s">Quando</th><th scope="col" class="cx-s">Quem</th><th scope="col" class="cx-t">Detalhe</th><th scope="col" class="cx-s">Origem (IP, resumido)</th></tr></thead><tbody>${rs.slice(0, 25).map((x) => `<tr><td class="cx-s" data-l="Quando">${fdt(x.ts)}</td><td class="cx-s" data-l="Quem">${esc(x.ator)}</td><td class="cx-t">${esc(x.meta)}${x.ack ? ' ' + bd('ok', 'Reconhecido') : ''}</td><td class="cx-s cx-mono" data-l="Origem">${esc(x.ip)}</td></tr>`).join('')}</tbody></table></div></div></details></section>`; }).join('')}</div>`;
    } });
  }
  RT('/c/seguranca', { id: 'seguranca', nome: 'Segurança', cap: 'seg.ver' }, (ctx) => {
    const chip = (k, v, l, cur) => `<button class="chip" data-act="cxseg" data-k="${k}" data-v="${v}" aria-pressed="${cur === v}">${esc(l)}</button>`;
    return shell(ctx, { id: 'seguranca', title: 'Segurança', lead: 'Sinais que avisam, mas não provam: falhas de acesso, dados revelados e exportações grandes.' }, `<div class="cx-tool"><div class="cx-fg"><span class="t-small">Tipo</span><div class="chips" data-single="1">${chip('tipo', 'todos', 'Todos', SG.tipo)}${Object.entries(SEC).map(([k, l]) => chip('tipo', k, l, SG.tipo)).join('')}</div></div><div class="cx-fg"><span class="t-small">Período</span><div class="chips" data-single="1">${[['24h', '24 horas'], ['7d', '7 dias'], ['30d', '30 dias']].map(([k, l]) => chip('per', k, l, SG.per)).join('')}</div></div></div><div data-seg>${segBody()}</div>`);
  });
  A.acts.cxseg = (el, e, d) => { SG[d.k] = d.v; A.$$('.chip', el.parentElement).forEach((x) => x.setAttribute('aria-pressed', x === el)); const b = A.$('[data-seg]'); b.innerHTML = segBody(); };

  /* --- equipe interna --- */
  TB.eq = { title: 'Equipe interna', caption: 'Pessoas da equipe com acesso ao console', searchLabel: 'Buscar por nome ou e-mail', size: 12, sort: { k: 'nome', dir: 'asc' },
    rows: () => col('equipe'), text: (r) => r.nome + ' ' + r.email, filters: [{ k: 'papel', label: 'Papel', opts: Object.entries(PAPEL), test: (r, v) => r.papel === v }],
    empty: { icon: 'building', title: 'Ninguém na equipe ainda', body: 'Convide a primeira pessoa.' },
    cols: [
      { k: 'nome', label: 'Pessoa', sort: (r) => r.nome, render: (r) => `<b>${esc(r.nome)}</b>${r.id === (sess() || {}).id ? ' <span class="t-small">(você)</span>' : ''}<span class="t-small" style="display:block">${esc(r.email)}</span>` },
      { k: 'papel', label: 'Papel', sort: (r) => PAPEL[r.papel], render: (r) => PAPEL[r.papel] },
      { k: 'status', label: 'Situação', sort: (r) => r.status, render: (r) => bd({ ativo: 'ok', convite: 'warn', desativado: '' }[r.status], { ativo: 'Ativo', convite: 'Convite pendente', desativado: 'Desativado' }[r.status]) },
      { k: 'ult', label: 'Último acesso', sort: (r) => r.ult, render: (r) => (r.ult ? ago(r.ult) : 'Nunca entrou') },
      { k: 'ac', label: 'Ações', render: (r) => `<button class="btn btn-sm btn-line" data-act="cxeqmenu" data-id="${r.id}" aria-haspopup="menu" aria-label="Ações de ${esc(r.nome)}">Gerir ${A.icon('chevdown', 14)}</button>` },
    ] };
  const CM = { contas: { nome: 't', plano: 's', status: 's', tipo: 'k', ev: 'k' }, eventos: { titulo: 't', data: 's', status: 's', host: 'k', conv: 'k', part: 'k' }, subs: { forn: 't', plano: 's', status: 's', valor: 's', prox: 'k' }, tk: { ass: 't', sla: 's', status: 's' }, dsar: { tit: 't', tipo: 's', prazo: 's', status: 's' }, retev: { ev: 't', d365: 's', d330: 'k' }, retjob: { ev: 't', status: 's', due: 's', rot: 'k' }, aud: { acao: 't', alvo: 's', ts: 's', ator: 's' }, eq: { nome: 't', papel: 's', status: 's' } };
  Object.keys(CM).forEach((k) => TB[k].cols.forEach((c) => { c.m = CM[k][c.k] || (/^(ac|acoes)$/.test(c.k) ? 'a' : 'd'); }));
  RT('/c/equipe-interna', { id: 'equipe', nome: 'Equipe interna', cap: 'equipe.gerir' }, (ctx) => shell(ctx, { id: 'equipe', title: 'Equipe interna', lead: 'Quem entra no console e com qual papel. Mudanças pedem confirmação de identidade e ficam na auditoria.', actions: '<button class="btn btn-primary" data-act="cxdo" data-flow="eqConvidar">Convidar pessoa</button>' }, `<details class="ds-fold sem-borda" style="margin-bottom:var(--space-4)"><summary>O que cada papel pode fazer</summary><div class="ds-fold-b"><p class="t-small" style="max-width:68ch;margin-top:var(--space-2)"><b>Leitura</b> só vê. <b>Suporte</b> responde tickets, atende pedidos de titulares e pede “ver como”. <b>Administração</b> faz tudo, inclusive apagar, reembolsar e gerir a equipe.</p></div></details>` + tableHTML('eq')));
  A.acts.cxeqmenu = (el, e, d) => { const m = col('equipe').find((x) => x.id === d.id); A.menu(el, [{ label: 'Mudar papel', icon: 'edit', onClick: () => FLOWS.eqPapel({ a: d.id }) }, { sep: 1 }, { label: m.status === 'desativado' ? 'Reativar acesso' : 'Desativar acesso…', icon: m.status === 'desativado' ? 'refresh' : 'x', danger: m.status !== 'desativado', onClick: () => FLOWS.eqAtivo({ a: d.id }) }]); };

  /* --- 404 do console (qualquer outra rota /c/...) --- */
  ['/c/:a', '/c/:a/:b', '/c/:a/:b/:c'].forEach((p) => A.route(p, (ctx) => { light(); if (!sess()) { setTimeout(() => (location.hash = '#/c/entrar'), 0); return loginShell('<div class="spinner"></div>'); } return naoAchou(ctx, { hint: `O endereço ${ctx.path} não existe no console. Pode ter sido digitado errado ou a página foi removida.` }); }));

  /* ================= ⌘K e mapa ================= */
  A.palette.add(() => {
    if (!location.hash.startsWith('#/c') || !sess()) return [];
    const items = navFor().map((n) => ({ group: 'Ir para', label: n.label, icon: n.icon, go: n.href.slice(1) && n.href }));
    const acts = [];
    if (can('suporte.escrever')) acts.push({ group: 'Ações', label: 'Abrir ticket', icon: 'plus', hint: 'Suporte', run: () => FLOWS.novoTicket({}) });
    if (can('lgpd.executar')) acts.push({ group: 'Ações', label: 'Novo pedido de titular (LGPD)', icon: 'shield', run: () => FLOWS.novoDsar({}) });
    if (can('audit.exportar')) acts.push({ group: 'Ações', label: 'Exportar auditoria (CSV)', icon: 'download', run: () => { if (location.hash !== '#/c/auditoria') location.hash = '#/c/auditoria'; setTimeout(() => A.acts.cxexp(), 120); } });
    if (can('equipe.gerir')) acts.push({ group: 'Ações', label: 'Convidar pessoa para a equipe', icon: 'plus', run: () => FLOWS.eqConvidar({}) });
    Object.entries(PAPEL).forEach(([k, l]) => acts.push({ group: 'Papel simulado', label: 'Ver como ' + l, icon: 'users', hint: 'protótipo', run: () => { st.set('cx.sess', { ...sess(), papel: k }); A.render(); A.toast('Agora você vê o console como ' + l + '.'); } }));
    acts.push({ group: 'Ações', label: 'Sair do console', icon: 'logout', run: A.acts.cxsair });
    const data = [];
    if (can('contas.ver')) col('contas').forEach((c) => data.push({ group: 'Contas', label: c.nome, icon: 'users', go: '#/c/contas/' + c.id, hint: mask(c.email), keys: c.id + ' ' + fold(c.nome) }));
    if (can('eventos.ver')) col('eventos').forEach((e) => data.push({ group: 'Eventos', label: e.titulo, icon: 'calendar', go: '#/c/eventos/' + e.id, hint: fd(e.data), keys: fold(e.titulo) }));
    if (can('suporte.ver')) col('tickets').forEach((t) => data.push({ group: 'Tickets', label: t.id + ' · ' + t.assunto, icon: 'chat', go: '#/c/suporte?t=' + t.id, keys: fold(t.assunto + ' ' + ((conta(t.contaId) || {}).nome || '')) }));
    return [...items, ...acts, ...data];
  });
  A.map('Console (staff)', 'Console · entrar', '#/c/entrar', 'Login por link de e-mail; erros de acesso simulados');
  A.map('Console (staff)', 'Console · visão geral', '#/c', 'Fila de atenção, números e eventos ao vivo');
  [['Contas', '/c/contas', 'Busca, filtros, detalhe, ver como, exclusão'], ['Eventos', '/c/eventos', 'Lista e detalhe com participação'], ['Assinaturas', '/c/assinaturas', 'Trocar plano, cortesia, reembolso'], ['Suporte', '/c/suporte', 'Tickets: abrir, responder, mudar status'], ['Auditoria', '/c/auditoria', 'Registro filtrável e exportação'], ['LGPD', '/c/lgpd', 'Pedidos de titulares com prazo'], ['Retenção', '/c/retencao', 'Exportar e apagar (dias 330/365)'], ['Segurança', '/c/seguranca', 'Sinais de segurança'], ['Equipe interna', '/c/equipe-interna', 'Papéis e convites'], ['Confirmar identidade', '/c/reauth', 'Passo extra para ações sensíveis']].forEach(([l, h, n]) => A.map('Console (staff)', 'Console · ' + l.toLowerCase(), '#' + h, n));
})();
