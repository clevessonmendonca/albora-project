/* Dados fictícios compartilhados. Nada aqui é real: nomes, números e fotos são inventados para o protótipo. */
(function () {
  const A = window.A, r = A.rand(42);
  const NOMES = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isadora', 'João', 'Karina', 'Lucas', 'Marcela', 'Nicolas', 'Olívia', 'Paulo', 'Rafaela', 'Samuel', 'Tatiana', 'Vitor', 'Yasmin', 'Zeca', 'Beatriz', 'Caio', 'Débora', 'Eduardo', 'Fernanda', 'Guilherme', 'Helena', 'Igor'];
  const SOBRE = ['Souza', 'Lima', 'Prado', 'Nunes', 'Barros', 'Melo', 'Ramos', 'Teixeira', 'Rocha', 'Dias'];

  A.data.events = [
    { id: 'e1', slug: 'marina-rafael', nome: 'Casamento Marina & Rafael', iniciais: 'M&R', cor: '#8A2F42', cor2: '#1F3A56', tipo: 'casamento', capaDemo: true, local: 'Espaço Jardim das Palmeiras, Belo Horizonte', esperados: 150, plano: 'completo', estilo: 'Editorial', hora: '18:00' },
    { id: 'e2', slug: 'lu-40', nome: 'Os 40 da Lu', iniciais: 'L40', cor: '#9A5B14', cor2: '#2D2A24', tipo: 'aniversario', capaDemo: true, local: 'Casa da Lu, Nova Lima', esperados: 60, plano: 'completo', estilo: 'Fotográfico', phaseFixed: 'depois', hora: '20:00' },
    { id: 'e3', slug: 'direito-2026', nome: 'Formatura Direito 2026', iniciais: 'D26', cor: '#245B73', cor2: '#3B2F22', tipo: 'formatura', local: 'Clube Minas Tênis', esperados: 220, plano: 'gratis', estilo: 'Classic', phaseFixed: 'antes', hora: '21:00' },
  ];

  A.data.guests = NOMES.map((n, i) => {
    const photos = Math.floor(r() * 9), st = i === 7 ? 'bloqueado' : i % 9 === 4 ? 'convidado' : 'ativo';
    return { id: 'g' + i, nome: n + ' ' + SOBRE[i % SOBRE.length], primeiro: n, ini: n[0] + SOBRE[i % SOBRE.length][0], fotos: st === 'convidado' ? 0 : photos, missoes: st === 'convidado' ? 0 : Math.floor(r() * 5), entrou: Math.floor(r() * 300) + 5, status: st, mesa: 1 + (i % 12), consentiu: st !== 'convidado' };
  });

  const MISSOES = ['Quem chegou primeiro?', 'O abraço mais apertado', 'A mesa mais animada', 'Um brinde inesperado', 'Os pés de quem dançou até o fim', 'Uma foto com quem você não conhecia', 'O detalhe que ninguém viu', 'O pai/mãe emocionado(a)', 'A pista cheia', 'Sua selfie com o casal'];
  A.data.missions = MISSOES.map((t, i) => ({ id: 'm' + i, titulo: t, on: i < 8, fotos: Math.floor(r() * 14), romano: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] }));

  const ST = ['aprovada', 'aprovada', 'aprovada', 'aprovada', 'aprovada', 'revisar', 'aprovada', 'aprovada', 'oculta', 'aprovada'];
  A.data.photos = Array.from({ length: 48 }, (_, i) => {
    const st = i < 7 ? 'revisar' : ST[i % ST.length];
    return { id: 'p' + i, n: i, autor: 'g' + (i * 7 % 30), status: st, min: Math.floor(i * 4.7) + 1, missao: i % 3 === 0 ? 'm' + (i % 10) : null, curtidas: Math.floor(r() * 24), comentarios: Math.floor(r() * 5), telao: st === 'aprovada' && i % 4 !== 1, ratio: i % 5 === 0 ? 'l' : i % 7 === 0 ? 's' : 'p', motivo: st === 'revisar' ? ['Possível pessoa desfocada', 'Conteúdo sensível?', 'Duplicada', 'Menor de idade identificado?'][i % 4] : '' };
  });

  A.data.team = [
    { id: 't1', nome: 'Marina Almeida', email: 'marina@email.com', papel: 'owner' }, { id: 't2', nome: 'Rafael Costa', email: 'rafael@email.com', papel: 'couple' }, { id: 't3', nome: 'Paula Mendes (Cerimonial)', email: 'paula@cerimonial.com', papel: 'planner' },
  ];
  A.data.papeis = { owner: 'Dono(a)', couple: 'Casal', planner: 'Cerimonialista' };
  A.data.planos = [
    { id: 'gratis', nome: 'Grátis', preco: 0, itens: ['Até 50 fotos', 'Link e QR', 'Telão básico'] },
    { id: 'completo', nome: 'Completo', preco: 199, itens: ['Fotos ilimitadas no evento', 'Missões e identidade completa', 'Telão (4 modelos)', 'Álbum final e livro em PDF', 'Exportar para sua nuvem'] },
  ];
  A.data.momentos = ['Chegada', 'Cerimônia', 'Coquetel', 'Jantar', 'Pista', 'Despedida'];
  A.data.reacoes = ['Amei', 'Rindo', 'Emocionou', 'Boa foto'];

  /* ícones de pack: casamento NÃO usa coração (anti-padrão de marca). */
  A.data.tipos = [
    { id: 'casamento', nome: 'Casamento', icone: 'sparkle', texto: 'Cerimônia, jantar e pista com a cara de vocês.' },
    { id: 'aniversario', nome: 'Aniversário', icone: 'gift', texto: 'De 15 a 100 anos, sem complicação.' },
    { id: 'formatura', nome: 'Formatura', icone: 'book', texto: 'Colação, baile e a turma toda.' },
    { id: 'corporativo', nome: 'Corporativo', icone: 'building', texto: 'Confraternização e eventos de marca.' },
    { id: 'celebracao', nome: 'Celebração', icone: 'zap', texto: 'Chá, batizado, encontro de família.' },
    { id: 'outro', nome: 'Outro', icone: 'calendar', texto: 'Monte do seu jeito.' },
  ];
  A.data.estilos = [
    { id: 'editorial', nome: 'Editorial', fonte: 'Fraunces', desc: 'Títulos grandes, muito ar.' }, { id: 'minimal', nome: 'Minimal', fonte: 'Instrument Sans', desc: 'Só o essencial.' },
    { id: 'contemporaneo', nome: 'Contemporâneo', fonte: 'Instrument Sans', desc: 'Cantos arredondados, leve.' }, { id: 'fotografico', nome: 'Fotográfico', fonte: 'Fraunces', desc: 'A foto manda.' }, { id: 'classic', nome: 'Classic', fonte: 'Fraunces', desc: 'Tradicional e elegante.' },
  ];
  A.data.combos = [['Marsala & Marinho', '#8A2F42', '#1F3A56'], ['Oliva & Areia', '#5A5F2B', '#C9B58A'], ['Terracota & Ocre', '#B2512B', '#C98A1D'], ['Ardósia & Rosé', '#3E4A56', '#B9808C'], ['Vinho & Dourado', '#6B1F34', '#B8893A'], ['Grafite & Champanhe', '#2D2D2F', '#C9B38A']];
  A.data.telaoModelos = [['polaroide', 'Polaroide', 'Fotos com moldura, giram suavemente.'], ['mural', 'Mural', 'Mosaico que vai se completando.'], ['colagem', 'Colagem', 'Fotos sobrepostas, sem cortar.'], ['dump', 'Dump', 'Muitas por vez, ritmo de festa.']];
})();
