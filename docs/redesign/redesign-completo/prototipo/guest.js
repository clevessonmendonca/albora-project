/* Albora protótipo — superfície do CONVIDADO (web + app nativo simulado).
   Rotas: #/g/... · escuro, sem login · tudo em A.store (prefixo g:<slug>:) · CSS com prefixo .gx- */
(function () {
  const A = window.A;

  /* ---------------------------------------------------------------- dados próprios do módulo */
  const GX = (A.data.gx = {
    termo: {
      versao: 2, data: '20 de outubro de 2026',
      itens: [
        'Suas fotos aparecem no álbum e, se os anfitriões aprovarem, no telão deste evento.',
        'Só quem está na festa vê o álbum. Nada vai para redes sociais sem você compartilhar.',
        'A localização (GPS) da foto é removida antes do envio.',
        'Nenhuma foto sua vira propaganda da Albora, nem de terceiros.',
        'Você apaga uma foto, ou tudo, quando quiser, em Perfil.',
      ],
    },
    anfitrioes: { 'marina-rafael': 'Marina e Rafael', 'lu-40': 'Lu', 'direito-2026': 'a comissão de formatura' },
    marco: { 'marina-rafael': 'a cerimônia', 'lu-40': 'o parabéns', 'direito-2026': 'a colação' },
    gateHora: { 'marina-rafael': '20:30', 'lu-40': '21:00', 'direito-2026': '22:00' },
    recomendado: { 'marina-rafael': 'calor', 'lu-40': 'filme', 'direito-2026': 'vivido' },
    recado: {
      'marina-rafael': { texto: 'Que bom ter vocês aqui. Tirem foto de tudo: das mesas, da pista, dos pés descalços depois da meia-noite. A gente só vai ver as fotos depois, e vai ser a melhor parte da festa. Obrigada por estarem com a gente.', duracao: 42 },
      'lu-40': { texto: 'Gente, obrigada por virem! Fotografem à vontade e não deixem ninguém fugir da pista.', duracao: 18 },
      'direito-2026': { texto: 'Turma, a festa é nossa. Fotos de todos os cantos, sem timidez.', duracao: 0 },
    },
    musica: {
      'marina-rafael': { lista: 'Trilha da festa, por Marina e Rafael', provedor: 'Spotify' },
      'lu-40': { lista: 'Os 40 da Lu', provedor: 'YouTube Music' },
      'direito-2026': { lista: 'Baile da turma', provedor: 'Spotify' },
    },
    catalogo: [
      { id: 's1', t: 'Pista Cheia', a: 'Coletivo Aurora' }, { id: 's2', t: 'Madrugada de Sábado', a: 'Duo Faróis' }, { id: 's3', t: 'Sem Pressa', a: 'Marcela Torres' },
      { id: 's4', t: 'Brinde', a: 'Os Carvalhos' }, { id: 's5', t: 'Última Dança', a: 'Estação Norte' }, { id: 's6', t: 'Fim de Tarde', a: 'Rio Claro' },
      { id: 's7', t: 'Todo Mundo Junto', a: 'Banda Calçada' }, { id: 's8', t: 'Janela Aberta', a: 'Noa Prado' }, { id: 's9', t: 'Só Mais Uma', a: 'Vento Sul' }, { id: 's10', t: 'Volta pra Casa', a: 'Lia e Os Parentes' },
    ],
    filaInicial: ['s1', 's3', 's5', 's2'], votosBase: { s1: 14, s3: 9, s5: 7, s2: 4 },
    confissao: {
      'marina-rafael': { titulo: 'Confessionário', lede: 'Deixe uma mensagem para os anfitriões, em texto ou em áudio. Só eles veem; eles decidem o que entra no livro.', prompts: [{ id: 'c1', t: 'Uma lembrança com eles' }, { id: 'c2', t: 'Um conselho para a vida a dois' }, { id: 'c3', t: 'O que você mais gostou hoje' }] },
      'lu-40': { titulo: 'Recado para a Lu', lede: 'Deixe um recado em texto ou áudio. Só a Lu vê.', prompts: [{ id: 'c1', t: 'Uma história com a Lu' }, { id: 'c2', t: 'Um desejo para os próximos 40' }] },
      'direito-2026': null,
    },
    legendas: ['Chegamos cedo e a luz do jardim estava perfeita', 'Quem chegou primeiro ficou com a melhor mesa', 'A pista não esvaziou nem um minuto', '', 'O brinde que ninguém esperava', 'A mesa do fundo ficou com a melhor vista do jardim, e ninguém quis sair dali até a hora do parabéns, nem para buscar mais um doce.', 'Cheguei no começo e já valeu', 'Detalhe que quase passou batido'],
    comentarios: ['Essa ficou linda.', 'Quem é esse atrás?', 'Preciso dessa foto no álbum.', 'Foi exatamente assim.', 'Rindo até agora.', 'Que noite.'],
    faq: [
      ['Preciso criar conta ou instalar algo?', 'Não. Você entra pelo QR, diz seu primeiro nome e pronto. O app é opcional.'],
      ['Quem vê minhas fotos?', 'Os anfitriões revisam cada foto. Depois de aprovadas, só quem está na festa vê o álbum. O telão mostra as aprovadas.'],
      ['Como apago uma foto?', 'Em Perfil, Minhas fotos, toque na foto e escolha Excluir. Para apagar tudo, use Meu consentimento.'],
      ['Estou sem sinal. E agora?', 'Pode continuar fotografando. As fotos ficam guardadas no celular e sobem quando o sinal voltar.'],
      ['Posso postar nas redes?', 'Pode, depois de ${marco}, pela opção Compartilhar fora da festa. Você escolhe a moldura e se seu nome aparece.'],
    ],
    entrega: { 'tk-ana-8f3k': 'ok', 'tk-vazio-2a9d': 'vazio', 'tk-expirado-77ab': 'expirado' },
  });

  const PRE = [
    { id: 'original', nome: 'Original', f: '' },
    { id: 'calor', nome: 'Calor', f: 'sepia(.28) saturate(1.18) brightness(1.04) contrast(1.02)' },
    { id: 'filme', nome: 'Filme', f: 'contrast(1.1) saturate(.82) sepia(.16)' },
    { id: 'vivido', nome: 'Vívido', f: 'saturate(1.45) contrast(1.06)' },
    { id: 'suave', nome: 'Suave', f: 'brightness(1.07) contrast(.92) saturate(.94)' },
    { id: 'pb', nome: 'Preto e branco', f: 'grayscale(1) contrast(1.12)' },
  ];

  /* ---------------------------------------------------------------- estilo */
  const css = `
  @media(max-width:699px){.phone{height:100dvh;min-height:0}}
  @media(orientation:landscape) and (max-height:500px){.guest-stage{padding:0;align-items:stretch;background:var(--bg)}.phone{max-width:none;width:100%;height:100dvh;min-height:0;border-radius:0;box-shadow:none}}
  [data-theme="noite"]{--st-hover:color-mix(in srgb,var(--fg) 8%,transparent);--st-press:color-mix(in srgb,var(--fg) 14%,transparent)}
  .modal[data-theme="noite"]{background:var(--elev-2);color:var(--fg)}
  @media(max-width:640px){.modal[data-theme="noite"]{border-top:1px solid var(--line)}}
  .menu[data-theme="noite"]{position:fixed;background:var(--elev-3);color:var(--fg)}
  .menu[data-theme="noite"] button:hover,.menu[data-theme="noite"] a:hover,.menu[data-theme="noite"] [data-active]{background:var(--st-hover)}
  .menu[data-theme="noite"] .sep{background:var(--line)}
  .menu[data-theme="noite"] button,.menu[data-theme="noite"] a{min-height:44px}
  .modal[data-theme="noite"] [data-mclose]{width:44px;min-width:44px;min-height:44px}
  .toast[data-theme="noite"] button{min-height:44px;min-width:44px;padding:0 var(--space-2)}
  .guest-stage .gnav{background:var(--elev-2);border-top:1px solid var(--line)}
  .phone>.skip{position:absolute}
  .phone .btn:not(.btn-sm){min-height:48px;white-space:normal;max-width:100%;line-height:1.25}
  .phone .chip{min-height:44px}
  .gx-top{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3) var(--space-2) var(--space-2);min-height:56px;flex:none;background:var(--elev-2);border-bottom:1px solid var(--line-2)}
  .gx-top h1{font:380 var(--fs-xl)/1.15 var(--font-display);letter-spacing:-.01em;flex:1 1 120px;min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;padding-left:var(--space-3)}
  .gx-top h1:focus{outline:0}
  .gx-top.nob h1{padding-left:var(--space-4)}
  .gx-back{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;color:var(--fg);text-decoration:none;flex:none}
  .gx-back:hover{background:var(--st-hover)}.gx-back:active{background:var(--st-press)}
  .gx-pill{display:inline-flex;align-items:center;gap:var(--space-2);min-height:44px;padding:0 var(--space-4);border-radius:var(--r-pill);border:1px solid var(--line);font-size:var(--fs-sm);font-weight:500;text-decoration:none;color:var(--fg-2);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .gx-pill i{width:8px;height:8px;border-radius:50%;background:var(--atencao)}
  .gx-pill.off i{background:var(--crit-text)}
  .gx-off{display:flex;gap:var(--space-3);align-items:center;padding:var(--space-3) var(--space-4);background:var(--elev-1);border-bottom:1px solid var(--line-2);color:var(--fg-2);font-size:var(--fs-sm);flex:none}
  .gx-pad{padding:0 var(--space-6) var(--space-8)}
  .gx-slim{display:flex;align-items:center;gap:var(--space-3);margin:var(--space-2) var(--space-4) var(--space-4)}
  .gx-slim-av{position:relative;flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;overflow:hidden;background:var(--ac);color:var(--on-ac);font:500 var(--fs-sm) var(--font-display);box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ac)}
  .gx-slim-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .gx-slim-tx{display:flex;flex-direction:column;min-width:0;line-height:1.25}
  .gx-slim-tx b{font:380 var(--fs-lg) var(--font-display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-slim-tx span{font-size:var(--fs-sm);color:var(--fg-2)}
  .gx-apph{display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-2);padding:var(--space-6) var(--space-5);border-radius:var(--r-4);background:linear-gradient(135deg,var(--ac),var(--noite));color:var(--fg)}
  .gx-apph .gx-name{font:350 var(--fs-title)/1.1 var(--font-display);color:var(--fg)}
  .gx-apph .gx-eyebrow{color:var(--fg-2)}
  .gx-apph p{margin:0;color:var(--fg-2)}
  .gx-pad.stack>section[aria-labelledby=gx-pc],.gx-pad.stack>section[aria-labelledby=gx-app-t]{padding:var(--space-5);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-4)}
  .gx-pad.stack>.gx-rule[aria-labelledby=gx-sim],.gx-pad.stack>.gx-rule[aria-labelledby=gx-sm]{padding:var(--space-4);border:1px dashed var(--line);border-radius:var(--r-3)}
  .gx-pair{display:flex;flex-direction:column;align-items:center;gap:var(--space-3);padding:var(--space-5);background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-code{color:var(--accent-text)}
  .phone .gx-pad .btn{border-radius:var(--r-pill)}
  .gx-pad .gx-q+.gx-q{margin-top:var(--space-2)}
  .gx-pad .gx-q{padding:var(--space-3);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-pad.stack>section[aria-label=Formato],.gx-pad.stack>section[aria-label=Moldura]{padding:var(--space-4);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-sh{filter:drop-shadow(0 12px 28px color-mix(in srgb,var(--noite) 45%,transparent))}
  #gx-prev{border-radius:var(--r-4);overflow:hidden;box-shadow:0 12px 32px color-mix(in srgb,var(--noite) 50%,transparent)}
  .gx-pre .th{border-radius:var(--r-3);overflow:hidden}
  .gx-pre[aria-pressed=true] .th{outline:2px solid var(--ac);outline-offset:2px}
  .gx-conf .stack-2 .btn{width:100%}
  [data-rpanel][hidden]{display:none}
  .gx-rec-l{display:flex;align-items:center;justify-content:center;min-height:44px;color:var(--fg-2);font-size:var(--fs-sm);text-decoration:underline;text-underline-offset:4px}
  .gx-rec-l:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-rec-h{display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-2);padding:var(--space-6) var(--space-5);border-radius:var(--r-4);background:linear-gradient(135deg,var(--ac),var(--noite));color:var(--fg)}
  .gx-rec-h .gx-name{font:350 var(--fs-title)/1.1 var(--font-display);color:var(--fg)}
  .gx-rec-h .gx-eyebrow{color:var(--fg-2)}
  .gx-rec-h p{margin:0;color:var(--fg-2)}
  .gx-rec .gx-ptabs{margin:0}
  .gx-rtab{min-height:44px;padding:0 var(--space-2);background:none;border:0;border-radius:var(--r-pill);color:var(--fg-3);font:600 var(--fs-sm) var(--font-body);cursor:pointer}
  .gx-rtab[aria-selected=true]{background:var(--ac);color:var(--on-ac)}
  .gx-rtab:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gx-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-2)}
  .gx-steps li{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3);font-size:var(--fs-sm)}
  .gx-steps li span{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ac);color:var(--on-ac);font-weight:600}
  .gx-conf{position:relative;align-items:stretch;padding-top:var(--space-12)}
  .gx-sent-x{position:absolute;left:var(--space-4);top:var(--space-3);display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--elev-1);color:var(--fg)}
  .gx-sent-x:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-sent{position:relative;display:grid;place-items:center;width:fit-content;margin:0 auto;padding:var(--space-2)}
  .gx-sent-ph{position:relative;display:block;width:128px;aspect-ratio:1;border-radius:50%;overflow:hidden;box-shadow:0 0 0 3px var(--bg),0 0 0 6px var(--ac)}
  .gx-sent-ph .gx-fx{display:block;width:100%;height:100%}
  .gx-sent-ph img,.gx-sent-ph video{width:100%;height:100%;object-fit:cover}
  .gx-sent-ck{position:absolute;right:0;bottom:var(--space-2);display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--ac);color:var(--on-ac);border:3px solid var(--bg)}
  .gx-conf .gx-stat{padding:0;background:none;border:0;text-align:center}
  .gx-conf .gx-stat-r{display:flex;flex-direction:column;align-items:center;gap:var(--space-2)}
  .gx-conf .gx-stat-th{display:none}
  .gx-conf .gx-stat h1{font:350 var(--fs-title)/1.1 var(--font-display)}
  .gx-conf .gx-stat p{margin:0}
  button.gx-mchip{border:1px solid color-mix(in srgb,var(--fg) 28%,transparent);background:color-mix(in srgb,var(--fg) 12%,transparent);cursor:pointer;font-family:inherit}
  button.gx-mchip.acc{border-color:var(--ac);background:var(--ac)}
  .gx-mchip-t{max-width:20ch;overflow:hidden;text-overflow:ellipsis}
  .gx-mchip .gx-roman{min-width:0;font-size:var(--fs-md)}
  .gx-opts{display:flex;flex-direction:column;gap:var(--space-2)}
  .gx-opt{display:flex;align-items:center;gap:var(--space-3);min-height:52px;padding:0 var(--space-4);border:1px solid var(--line-2);border-radius:var(--r-3);background:var(--elev-1);color:var(--fg);font:inherit;text-align:left;cursor:pointer}
  .gx-opt[aria-pressed=true]{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,transparent)}
  .gx-opt .gx-roman{min-width:28px;font-size:var(--fs-lg)}
  .gx-opt:focus-visible,.gx-row:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gx-ed{display:flex;flex-direction:column;gap:var(--space-3);padding:0 0 var(--space-3);height:calc(100dvh - 140px);min-height:480px}
  .gx-ed>:not(.gx-ed-stage){margin-inline:var(--space-4);flex:none}
  .gx-ed-stage{position:relative;flex:1 1 0;min-height:0;display:grid;place-items:center;padding:var(--space-3) var(--space-4);background:var(--noite)}
  .gx-ed-stage #gx-prev{max-width:100%;max-height:100%;width:auto;height:auto;min-height:0}
  .gx-ed-tag{position:absolute;left:var(--space-6);top:var(--space-5);display:inline-flex;align-items:center;gap:var(--space-2);min-height:32px;padding:0 var(--space-3);border-radius:var(--r-pill);background:color-mix(in srgb,var(--noite) 60%,transparent);color:var(--fg);font-size:var(--fs-xs);font-weight:600;letter-spacing:.06em;text-transform:uppercase}
  .gx-int{position:absolute;left:var(--space-8);right:var(--space-8);bottom:var(--space-5);display:flex;align-items:center;gap:var(--space-3);padding:0 var(--space-3);border-radius:var(--r-pill);background:color-mix(in srgb,var(--noite) 60%,transparent);color:var(--fg);font-size:var(--fs-xs);font-variant-numeric:tabular-nums}
  .gx-int .gx-range{flex:1;min-height:44px}
  .gx-flt{margin-inline:0!important}
  .gx-ed .gx-strip{padding:var(--space-1) var(--space-4)}
  .gx-ed .gx-pre{width:68px;min-height:44px;gap:var(--space-1)}
  .gx-ed .gx-pre .th{width:52px;height:52px;border-radius:50%}
  .gx-ed .gx-pre .gx-badge{display:none}
  .gx-capr{display:flex;gap:var(--space-3);align-items:center;padding:var(--space-2) var(--space-3);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-capr:focus-within{border-color:var(--ac)}
  .gx-capr-th{position:relative;flex:none;width:36px;height:44px;border-radius:var(--r-1);overflow:hidden;background:var(--surface-2)}
  .gx-capr textarea{flex:1;min-width:0;min-height:44px;resize:none;background:none;border:0;outline:0;padding:var(--space-1) 0;color:var(--fg);font:inherit;font-size:16px;line-height:1.35}
  .gx-ed-opts{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}
  .gx-opill{display:flex;align-items:center;gap:var(--space-2);min-height:48px;padding:0 var(--space-4);border:1px solid var(--line);border-radius:var(--r-pill);background:var(--elev-1);color:var(--fg);font:inherit;font-size:var(--fs-sm);cursor:pointer;min-width:0}
  .gx-opill>svg:first-child{flex:none;color:var(--accent-text)}
  .gx-opill>svg:last-child{flex:none;margin-left:auto;color:var(--fg-3)}
  .gx-opill-t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-opill:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-ed-n{margin-top:0;margin-bottom:0;font-size:var(--fs-xs);text-align:center;line-height:1.2}
  .gx-ed~.gx-bar{background:var(--bg);border-top:0}
  .gx-ed~.gx-bar .btn-accent{flex:2}
  .phone .empty{padding:var(--space-8) var(--space-6);gap:var(--space-3)}
  .phone .empty>svg{box-sizing:content-box;width:32px;height:32px;padding:var(--space-5);border-radius:50%;background:var(--elev-1);border:1px solid var(--line-2);opacity:1;color:var(--accent-text)}
  .phone .empty .t-title{font-size:var(--fs-xl)}
  .phone .empty p{margin:0;max-width:32ch;color:var(--fg-2)}
  .phone .banner{border-radius:var(--r-3);border:1px solid var(--line-2);background:var(--elev-1)}
  .gx-wel{display:inline-flex;align-items:center;gap:var(--space-3);align-self:flex-start;padding:var(--space-1) var(--space-4) var(--space-1) var(--space-1);border:1px solid var(--line);border-radius:var(--r-pill);background:var(--elev-1)}
  .gx-wel-av{position:relative;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;overflow:hidden;background:var(--ac);color:var(--on-ac);font:500 var(--fs-sm) var(--font-display)}
  .gx-wel-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .gx-sign .input-sign{padding:var(--space-4);background:var(--elev-1);border:1px solid var(--line);border-radius:var(--r-3)}
  .gx-sign .input-sign:focus{border-color:var(--ac)}
  .gx-sign label.gx-check{padding:var(--space-4);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-cel{isolation:isolate}
  .gx-cel::before{content:"";position:absolute;inset:-28px -40px;z-index:-1;background:radial-gradient(circle,color-mix(in srgb,var(--ac) 38%,transparent),transparent 68%)}
  .gx-stat{padding:var(--space-4);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-4)}
  .gx-stat-th{border-radius:var(--r-3);overflow:hidden;box-shadow:0 0 0 2px var(--ac)}
  .gx-stat .gx-st{display:inline-flex;align-items:center;min-height:28px;padding:0 var(--space-3);border-radius:var(--r-pill);background:color-mix(in srgb,var(--ac) 18%,transparent);color:var(--fg);font-size:var(--fs-xs);letter-spacing:.06em}
  .gx-conf .progress{height:8px;border-radius:var(--r-pill);overflow:hidden}
  .gx-conf .progress i{border-radius:inherit}
  .gx-rw{padding:var(--space-4) var(--space-4) var(--space-4) var(--space-5);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-4);position:relative;overflow:hidden}
  .gx-rw::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--ac)}
  .gx-rw .gx-num{font-size:var(--fs-hero);color:var(--accent-text)}
  .gx-eyebrow{font:600 var(--fs-xs)/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
  .gx-mu{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-3);margin-top:var(--space-2);padding:var(--space-6) var(--space-5);border-radius:var(--r-4);background:linear-gradient(135deg,var(--ac),var(--noite));color:var(--fg);overflow:hidden;isolation:isolate}
  .gx-mu-bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;filter:blur(14px);transform:scale(1.2)}
  .gx-mu::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,var(--noite) 35%,transparent),color-mix(in srgb,var(--noite) 85%,transparent))}
  .gx-mu .gx-name{font:350 var(--fs-title)/1.1 var(--font-display);color:var(--fg)}
  .gx-mu .muted{color:var(--fg-2)}
  .gx-mu .gx-note{color:var(--fg-3)}
  .gx-mu-btn{border-radius:var(--r-pill)}
  .gx-mu .gx-eyebrow{color:var(--fg-2)}
  .gx-rank .gx-q .btn,.gx-rank .gx-q .link{padding:0 var(--space-3);font-size:var(--fs-sm)}
  .stack>.gx-play{position:static}
  .gx-rank{display:flex;flex-direction:column;gap:var(--space-2)}
  .gx-rank .gx-q{padding:var(--space-3) var(--space-4);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3);flex-wrap:nowrap;align-items:center}
  .gx-rank .gx-roman{min-width:36px;font-size:var(--fs-title);color:var(--accent-text)}
  .gx-rank .gx-q .btn{border-radius:var(--r-pill);flex:none;white-space:nowrap}
  .gx-rank .gx-voted{background:color-mix(in srgb,var(--ac) 18%,transparent)}
  .gx-rank .gx-q .link{color:var(--fg);flex:none;min-height:44px;padding:0 var(--space-4);border:1px solid var(--ac);border-radius:var(--r-pill);text-decoration:none;font-weight:600}
  .gx-rank .gx-q .link[data-act=g-conf-del]{border-color:var(--line);color:var(--fg-2)}
  .gx-lede{font-size:var(--fs-xl);color:var(--fg)}
  .gx-letter{position:relative;display:flex;flex-direction:column;gap:var(--space-4);margin-top:var(--space-2);padding:var(--space-6) var(--space-5);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-4);overflow:hidden}
  .gx-letter::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--ac)}
  .gx-qm{position:absolute;right:var(--space-4);top:var(--space-1);font:350 72px/1 var(--font-display);color:var(--accent-text);pointer-events:none}
  .gx-letter .gx-recado{font-size:var(--fs-xl);line-height:1.5}
  .gx-letter .gx-sign-off{font-size:var(--fs-lg);color:var(--fg)}
  .stack>.gx-play{padding:var(--space-3) var(--space-4);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-pill)}
  .stack>.gx-play .btn{width:48px;height:48px;min-height:48px;padding:0;border-radius:50%;background:var(--ac);border-color:var(--ac);color:var(--on-ac)}
  .guest-stage .gnav{margin:0 var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom));padding:var(--space-1) var(--space-2);border:1px solid var(--line);border-radius:var(--r-pill);background:var(--elev-2);box-shadow:0 8px 24px color-mix(in srgb,var(--noite) 35%,transparent)}
  .gnav-d{border-radius:var(--r-pill);min-height:52px}
  .gnav-d[aria-current="page"]{background:color-mix(in srgb,var(--ac) 18%,transparent)}
  .gnav-d[aria-current="page"] span{color:var(--fg)}
  .gnav-d:focus-visible,.gnav-cam:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gnav .gnav-cam{min-height:52px;overflow:visible}
  .gnav .shutter{width:60px;height:60px;border:4px solid var(--elev-2);background:var(--ac);box-shadow:0 0 0 1px var(--line);translate:0 -14px;transition:translate var(--dur-1) var(--ease)}
  .gnav .shutter::after{width:22px;height:22px;background:none;border:2.5px solid var(--on-ac);border-radius:50%}
  .gnav .gnav-cam:active .shutter{translate:0 -12px}
  .gx-top{background:var(--bg);border-bottom:0;min-height:64px;padding:var(--space-3) var(--space-4) var(--space-2)}
  .gx-top h1{font:350 var(--fs-title)/1.1 var(--font-display);letter-spacing:-.02em;padding-left:var(--space-2)}
  .gx-top.nob h1{padding-left:var(--space-2)}
  .gx-top h1::after{content:"";display:block;width:28px;height:3px;margin-top:var(--space-2);border-radius:var(--r-pill);background:var(--ac)}
  .gx-back{width:44px;height:44px;border:1px solid var(--line);background:var(--elev-1)}
  .gx-sec>h2,.gx-cfgh{font:600 var(--fs-xs)/1.3 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
  .gx-pad .list{gap:var(--space-2)}
  .gx-pad .li{background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3);padding:var(--space-3) var(--space-4);min-height:56px}
  .gx-pad .li:last-child{border:1px solid var(--line-2)}
  .gx-pad .li svg:first-child{flex:none;color:var(--accent-text)}
  .gx-in{padding:0 var(--space-6)}
  .phone-body>.gx-pad:first-child{padding-top:var(--space-4)}
  .gx-sec{margin-top:var(--space-8)}
  .gx-sec>h2{font:380 var(--fs-xl)/1.2 var(--font-display);margin-bottom:var(--space-3)}
  .gx-subh{display:flex;gap:var(--space-1);flex:none}
  .gx-subh a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0 var(--space-2);color:var(--fg-3);text-decoration:none;font-weight:500;position:relative}
  .gx-subh a[aria-current="page"]{color:var(--fg)}
  .gx-subh a[aria-current="page"]::after{content:"";position:absolute;left:var(--space-2);right:var(--space-2);bottom:var(--space-1);height:2px;background:var(--ac)}
  .gx-sub{display:none;gap:var(--space-6);padding:0 var(--space-6);border-bottom:1px solid var(--line-2);flex:none}
  .gx-sub a{display:flex;align-items:center;min-height:48px;color:var(--fg-3);text-decoration:none;font-weight:500;position:relative;min-width:44px;justify-content:center}
  .gx-sub a[aria-current="page"]{color:var(--fg)}
  .gx-sub a[aria-current="page"]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--ac)}
  .gx-fx{position:relative;display:block;width:100%;height:100%}
  .gx-fx img{display:block;width:100%;height:100%;object-fit:contain}
  .gx-fx.cover img{object-fit:cover}
  .gx-fxo{position:absolute;inset:0}
  .gx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-1)}
  .gx-grid.two{grid-template-columns:repeat(2,1fr);gap:var(--space-1)}
  .gx-tile{position:relative;aspect-ratio:1;border:0;padding:0;background:var(--surface-2);overflow:hidden;border-radius:var(--r-2);display:block;width:100%}
  .gx-tile .tg{position:absolute;left:var(--space-2);bottom:var(--space-2);right:var(--space-2);font-size:var(--fs-xs);font-weight:500;color:var(--papel);background:color-mix(in srgb,var(--noite) 72%,transparent);padding:var(--space-1) var(--space-2);border-radius:var(--r-pill);width:fit-content;max-width:calc(100% - var(--space-4));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-tile.dim img{opacity:.55}
  .gx-ph{position:relative;background:var(--surface);border-radius:var(--r-2);overflow:hidden;width:100%;border:0;padding:0;display:block}
  .gx-ph.full{border-radius:0}
  .gx-ph.r-p{aspect-ratio:4/5}.gx-ph.r-l{aspect-ratio:3/2}.gx-ph.r-s{aspect-ratio:1}.gx-ph.r-a{max-height:68dvh}
  .phone .link{display:inline-flex;align-items:center;min-height:44px}
  .phone .banner .link{color:var(--fg)}
  .phone .switch{flex:none}
  .phone .flex.between>span{min-width:0;overflow-wrap:anywhere}
  .phone .switch::before{content:"";position:absolute;inset:-8px 0}
  .gx-rc{display:flex;flex-direction:column;gap:var(--space-3)}
  .gx-col{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-1);border-radius:var(--r-2);overflow:hidden}
  .gx-col span{aspect-ratio:1;display:block;overflow:hidden}
  .gx-pk{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)}
  .gx-pk label{position:relative;display:block;aspect-ratio:1;border-radius:var(--r-2);overflow:hidden;cursor:pointer}
  .gx-pk input{position:absolute;top:var(--space-2);right:var(--space-2);width:24px;height:24px;accent-color:var(--ac);z-index:2}
  .gx-pk label:focus-within{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-ib{display:inline-flex;align-items:center;gap:var(--space-2);min-height:48px;min-width:48px;padding:0 var(--space-4);border-radius:var(--r-pill);border:1px solid var(--line);background:transparent;color:var(--fg);font-size:var(--fs-sm);font-weight:500;justify-content:center}
  .gx-ib:hover{background:var(--st-hover)}.gx-ib:active{background:var(--st-press)}
  .gx-ib.q{border-color:transparent}
  .gx-ib.sm{min-width:44px;min-height:44px;padding:0}
  .gx-demo{margin:var(--space-6) var(--space-6) var(--space-8);padding-top:var(--space-3);border-top:1px solid var(--line-2);font-size:var(--fs-xs);color:var(--fg-3)}
  .gx-demo-top{margin:0;padding:var(--space-1) var(--space-4) var(--space-2);font-size:var(--fs-xs);color:var(--fg-2)}
  .gx-gate{display:flex;gap:var(--space-2);align-items:center;margin:var(--space-3) var(--space-4) 0;padding:0 var(--space-1) 0 var(--space-3);min-height:44px;background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-pill);font-size:var(--fs-xs);color:var(--fg-2)}
  .gx-gate svg{flex:none;color:var(--ac)}
  .gx-gate p{flex:1;margin:0}
  .gx-gate .gx-ib{flex:none;color:var(--fg-2)}
  .gx-gate b{color:var(--fg);font-weight:600}
  .gx-rail{padding:var(--space-3) 0 var(--space-2)}
  .gx-rail-h{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-3);padding:0 var(--space-4) var(--space-2)}
  .gx-rail-h h2{font:500 var(--fs-sm)/1.3 var(--font-body);color:var(--fg-2);margin:0}
  .gx-rail-h span{font-size:var(--fs-xs);color:var(--fg-2)}
  .gx-rail-l{display:flex;gap:var(--space-2);overflow-x:auto;padding:0 var(--space-4) var(--space-1);scroll-snap-type:x proximity;scroll-padding-inline:var(--space-4);scrollbar-width:none;list-style:none;margin:0}
  .gx-rail-l::-webkit-scrollbar{display:none}
  .gx-rail-l>li{flex:none;scroll-snap-align:start}
  .gx-rt{position:relative;display:block;width:80px;height:104px;border:0;padding:0;border-radius:var(--r-2);overflow:hidden;background:var(--surface-2);color:var(--fg);text-decoration:none}
  .gx-rt .gx-fx{position:absolute;inset:0}
  .gx-rt.seen .gx-fx{opacity:.55}
  .gx-rt:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-rt .nw{position:absolute;left:var(--space-1);top:var(--space-1);padding:2px var(--space-2);border-radius:var(--r-pill);background:var(--ac);color:var(--on-ac);font-size:var(--fs-xs);font-weight:600;line-height:1.4}
  .gx-rt .tg{position:absolute;left:var(--space-1);bottom:var(--space-1);right:var(--space-1);width:fit-content;max-width:calc(100% - var(--space-2));padding:2px var(--space-2);border-radius:var(--r-pill);background:color-mix(in srgb,var(--noite) 78%,transparent);color:var(--papel);font-size:var(--fs-xs);font-weight:500;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-rt.add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-2);background:var(--elev-1);border:1px solid var(--line);font-size:var(--fs-sm);font-weight:500;text-align:center;line-height:1.25}
  .gx-rt.add svg{color:var(--accent-text)}
  .gx-rail-l{gap:var(--space-3);padding-bottom:var(--space-2)}
  .gx-rail-l>li{width:72px;padding-bottom:var(--space-6)}
  .gx-rt{width:68px;height:68px;border-radius:50%;overflow:visible;margin:var(--space-1) auto 0;box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ac)}
  .gx-rt.seen{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--line)}
  .gx-rt .gx-fx{border-radius:50%;overflow:hidden}
  .gx-rt.seen .gx-fx{opacity:.6}
  .gx-rt .tg{left:50%;right:auto;bottom:auto;top:calc(100% + var(--space-3));translate:-50% 0;max-width:72px;padding:0;background:none;color:var(--fg-2);font-size:var(--fs-xs);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-rt .nw{left:auto;top:0;right:0;width:14px;height:14px;padding:0;font-size:var(--fs-xs);color:var(--on-ac);overflow:hidden;white-space:nowrap;text-indent:-9999px;border:2px solid var(--bg)}
  .gx-rt.add{border-radius:50%;background:var(--elev-1);border:1.5px dashed var(--accent-text);box-shadow:none;gap:0}
  .gx-rt.add>span:not(.nw){position:absolute;left:50%;top:calc(100% + var(--space-3));translate:-50% 0;font-size:var(--fs-xs);color:var(--fg-2);white-space:nowrap}
  .gx-rt.add.rec.new{border-style:solid;border-color:var(--ac)}
  .gx-rt.add:hover{background:var(--st-hover)}
  .gx-rec{display:flex;align-items:center;gap:var(--space-3);margin:var(--space-3) var(--space-4) 0;padding:var(--space-3) var(--space-3) var(--space-3) var(--space-4);min-height:64px;background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-2);color:var(--fg);text-decoration:none}
  .gx-rec:hover{background:var(--elev-2)}
  .gx-rec:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-rec .gx-rec-ic{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);color:var(--fg)}
  .gx-rec.new .gx-rec-ic{background:var(--ac);color:var(--on-ac)}
  .gx-rec .tx{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.35}
  .gx-rec .tx b{font-weight:600;overflow-wrap:anywhere}
  .gx-rec .tx span{font-size:var(--fs-sm);color:var(--fg-2)}
  .gx-rec>svg{flex:none;color:var(--fg-2)}
  .gx-chips{display:flex;gap:var(--space-5);overflow-x:auto;padding:0 var(--space-4);scrollbar-width:none;flex:none;border-bottom:1px solid var(--line-2);margin-bottom:var(--space-3)}
  .gx-chips::-webkit-scrollbar{display:none}
  .gx-chips .chip{flex:none;border:0;border-radius:0;background:transparent;padding:0 var(--space-1);min-width:44px;justify-content:center;color:var(--fg-3);min-height:48px;font-weight:500}
  .gx-chips .chip:hover{background:transparent;color:var(--fg)}
  .gx-chips .chip[aria-pressed="true"]{background:transparent;color:var(--fg);box-shadow:inset 0 -2px 0 var(--ac)}

  /* post: PostHeader, PostMedia, PostActions, ReactionButton, ReactionSummary. Fundo da publicação = --elev-1; o espaço entre elas é o fundo --bg */
  .gx-post{display:flex;flex-direction:column;background:transparent;border:0;padding-bottom:var(--space-2);margin-bottom:var(--space-5)}
  .gx-post .gx-phd{min-height:56px;padding:0 var(--space-1) 0 var(--space-3)}
  .gx-post .gx-who{gap:var(--space-3);min-height:56px}
  .gx-post .gx-who .nm{font-size:var(--fs-sm);font-weight:600;letter-spacing:.005em}
  .gx-post .gx-who .mt{font-size:var(--fs-xs);color:var(--fg-2)}
  .gx-post .gx-av{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--ac)}
  .gx-post .gx-pm{max-height:min(82dvh,calc(var(--w-feed) * 1.25))}
  .gx-post .gx-act{padding:var(--space-1) var(--space-1) 0 var(--space-1)}
  .gx-post .gx-ab.gx-rb{padding-left:var(--space-3)}
  .gx-post .gx-rs{color:var(--fg-2)}.gx-post .gx-rs b{color:var(--fg);font-weight:600}.gx-post .gx-rs span{color:var(--fg-2)}.gx-post .gx-rs span.on{color:var(--fg)}
  .gx-post .gx-cap{font-size:var(--fs-sm);line-height:1.45}
  .gx-post .gx-cl{font-size:var(--fs-sm)}
  .gx-post .gx-ts{display:block;margin-top:var(--space-1);font-size:var(--fs-xs);letter-spacing:.06em;text-transform:uppercase;color:var(--fg-3)}
  .gx-post:last-of-type{margin-bottom:0}
  .gx-phd{display:flex;align-items:center;gap:var(--space-1);min-height:56px;padding:0 var(--space-2) 0 var(--space-4)}
  .gx-who{display:flex;align-items:center;gap:var(--space-3);flex:1;min-width:0;min-height:56px;color:var(--fg);text-decoration:none}
  .gx-who .tx{display:flex;flex-direction:column;min-width:0;line-height:1.3}
  .gx-who .nm{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-who .mt{font-size:var(--fs-sm);color:var(--fg-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-av.me{box-shadow:0 0 0 2px var(--elev-1),0 0 0 3px var(--ac)}
  .gx-pm{position:relative;display:block;width:100%;border:0;padding:0;background:var(--surface-2);overflow:hidden;touch-action:manipulation;cursor:pointer;max-height:min(78dvh,calc(var(--w-feed) * 1.25))}
  .gx-pm:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gx-pop{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;color:var(--papel)}
  .gx-pop.on{animation:gxpop var(--dur-3) var(--ease)}
  @keyframes gxpop{0%{opacity:0;transform:scale(.6)}35%{opacity:1;transform:scale(1.08)}100%{opacity:0;transform:scale(1)}}
  .gx-act{display:flex;align-items:center;padding:var(--space-1) var(--space-2) 0}
  .gx-ab{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-1);min-width:44px;min-height:44px;padding:0 var(--space-2);background:none;border:0;border-radius:var(--r-pill);color:var(--fg);font-size:var(--fs-sm);font-weight:500;touch-action:manipulation;transition:transform var(--dur-1) var(--ease),background var(--dur-1) var(--ease)}
  .gx-ab:hover{background:var(--st-hover)}
  .gx-ab:active{transform:scale(.94);background:var(--st-press)}
  .gx-ab:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gx-ab.end{margin-left:auto;color:var(--fg-2)}
  .gx-ab.end.on{color:var(--fg)}
  .gx-mr{font-size:var(--fs-sm);font-weight:500;color:var(--fg)}
  .gx-ab.end.on svg{color:var(--accent-text)}
  .gx-n{display:inline-block;min-width:2ch;text-align:left;font-variant-numeric:tabular-nums}
  .gx-n:empty{min-width:0}
  .gx-rb[aria-pressed="true"] svg{color:var(--accent-text)}
  .gx-rb.pulse svg{animation:gxbeat var(--dur-2) var(--ease)}
  @keyframes gxbeat{40%{transform:scale(1.28)}}
  .gx-body{display:flex;flex-direction:column;gap:var(--space-1);padding:0 var(--space-4)}
  .gx-rs{font-size:var(--fs-sm);color:var(--fg-2);margin:0}
  .gx-rs b{font-weight:500;color:var(--fg);font-variant-numeric:tabular-nums}
  .gx-rs .on{color:var(--fg);text-decoration:underline;text-decoration-color:var(--ac);text-decoration-thickness:2px;text-underline-offset:4px}
  .gx-cap{font-size:var(--fs-md);line-height:1.45;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .gx-cap b{font-weight:600;margin-right:var(--space-1)}
  .gx-capw{display:flex;flex-direction:column;align-items:flex-start;padding-top:var(--space-1)}
  .gx-cap.open{display:block}
  .gx-capb{background:none;border:0;padding:0;min-height:44px;min-width:44px;color:var(--fg-2);font-weight:500;font-size:var(--fs-sm);display:inline-flex;align-items:center}
  .gx-cl{align-self:flex-start;background:none;border:0;padding:0;min-height:44px;display:inline-flex;align-items:center;color:var(--fg-2);font-size:var(--fs-sm)}
  .gx-cl:hover{color:var(--fg)}
  .gx-tray{position:fixed;z-index:var(--z-flutuante);display:flex;flex-wrap:wrap;gap:var(--space-1);padding:var(--space-1);max-width:calc(100vw - var(--space-4));background:var(--elev-3);border:1px solid var(--line);border-radius:var(--r-3);color:var(--fg);animation:gxtray var(--dur-1) var(--ease)}
  @keyframes gxtray{from{opacity:0;transform:scale(.96)}}
  .gx-tb{min-height:44px;min-width:44px;padding:0 var(--space-4);border:0;border-radius:var(--r-pill);background:none;color:var(--fg);font-size:var(--fs-sm);font-weight:500;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation}
  .gx-tb:hover{background:var(--st-hover)}
  .gx-tb:active{background:var(--st-press)}
  .gx-tb[aria-pressed="true"]{background:var(--ac);color:var(--on-ac)}
  .gx-tb:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-gatebar{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-6) 0;color:var(--fg-3);font-size:var(--fs-sm)}

  /* comentários: CommentSheet */
  .gx-cs{display:flex;flex-direction:column;overflow:hidden;padding:0;height:min(72dvh,640px)}
  .gx-grab{display:none}
  @media(max-width:640px){
    .gx-cs.full{height:100dvh;max-height:100dvh}
    .gx-grab{display:flex;justify-content:center;align-items:center;flex:none;width:100%;height:var(--space-8);background:none;border:0;padding:0;cursor:grab;touch-action:none}
    .gx-grab:active{cursor:grabbing}
    .gx-grab i{display:block;width:var(--space-10);height:var(--space-1);border-radius:var(--r-pill);background:color-mix(in srgb,var(--fg) 30%,transparent)}
    .gx-grab:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
    .gx-cs .modal-head{padding:0 var(--space-5);touch-action:none}
  }
  .gx-cs .modal-head{padding:var(--space-5) var(--space-5) 0;margin-bottom:var(--space-2)}
  .gx-cs .modal-body{flex:1;min-height:0;display:flex;flex-direction:column;padding:0}
  .gx-cctx{flex:none;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-5) var(--space-3);border-bottom:1px solid var(--line-2)}
  .gx-cctx .th{flex:none;width:48px;height:48px;border-radius:var(--r-1);overflow:hidden;background:var(--surface-2)}
  .gx-cctx .tx{min-width:0;display:flex;flex-direction:column;line-height:1.35}
  .gx-cctx .tx b{font-weight:600;font-size:var(--fs-sm)}
  .gx-cctx .tx span{font-size:var(--fs-sm);color:var(--fg-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-cm{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:var(--space-5);padding:var(--space-4) var(--space-5) var(--space-4)}
  .gx-cm .gx-cempty{margin:auto;display:flex;flex-direction:column;align-items:center;gap:var(--space-2);text-align:center;color:var(--fg-2);max-width:30ch}
  .gx-cm .gx-cempty b{color:var(--fg);font-weight:600}
  .gx-cm .gx-cempty p{margin:0;font-size:var(--fs-sm)}
  .gx-cm:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gx-cmi{display:flex;gap:var(--space-3);align-items:flex-start}
  .gx-cmi .b{flex:1;min-width:0;font-size:var(--fs-sm);line-height:1.45}
  .gx-cmi .b b{font-weight:600;margin-right:var(--space-2)}
  .gx-cmi .au{margin-right:var(--space-2);font-size:var(--fs-xs);font-weight:500;color:var(--fg-2);border:1px solid var(--line);border-radius:var(--r-pill);padding:0 var(--space-2);white-space:nowrap}
  .gx-cmi .t{color:var(--fg-2);font-size:var(--fs-xs)}
  .gx-cmi.sending .b{color:var(--fg-2)}
  .gx-cf{flex:none;display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-3) var(--space-5) calc(var(--space-3) + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--elev-2)}
  .gx-cf .row{display:flex;align-items:center;gap:var(--space-2)}
  .gx-cf .input{flex:1;min-width:0;scroll-margin-bottom:var(--space-8);background:var(--bg);border:1px solid var(--line);border-radius:var(--r-pill);padding:0 var(--space-4);min-height:48px}
  .gx-cf .input:focus{border:1px solid var(--accent-text);box-shadow:0 0 0 1px var(--accent-text);padding:0 var(--space-4)}
  .gx-cf .input[aria-invalid="true"]{border-color:var(--crit-text);box-shadow:0 0 0 1px var(--crit-text)}
  .gx-cf .err{color:var(--crit-text);font-size:var(--fs-sm)}
  .gx-cf .hint{font-size:var(--fs-xs);color:var(--fg-2)}
  .gx-cf .gx-send{flex:none;width:48px;height:48px;padding:0;border-radius:50%;background:var(--ac);color:var(--on-ac);border:0;display:grid;place-items:center}
  .gx-cf .gx-send:disabled{opacity:1;background:var(--surface-2);color:var(--fg-3)}
  .gx-cf .gx-send:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}

  .gx-cover{min-height:100%;display:flex;flex-direction:column;justify-content:space-between;gap:var(--space-6);padding:var(--space-12) var(--space-6) var(--space-8)}
  .gx-cv{position:relative;isolation:isolate;overflow:hidden;--veu-cor:var(--noite);background:var(--noite);color:var(--fg);justify-content:flex-end}
  .gx-cv-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
  .gx-cv-blur{position:absolute;left:0;right:0;bottom:0;height:62%;z-index:-1;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);-webkit-mask-image:linear-gradient(180deg,transparent,black 55%);mask-image:linear-gradient(180deg,transparent,black 55%)}
  .gx-cv-veu{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,var(--veu-cor) calc(var(--veu-a) * 22%),transparent) 0%,color-mix(in srgb,var(--veu-cor) calc(var(--veu-a) * 100%),transparent) 38%,color-mix(in srgb,var(--veu-cor) calc(var(--veu-a) * 100%),transparent) 100%)}
  .gx-cv .gx-cv-cred{color:var(--fg-3)}
  .gx-mono{position:relative;isolation:isolate;flex:1;min-width:0;max-width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-6);min-height:180px;padding-bottom:var(--space-4)}
  .gx-mono::before{content:"";position:absolute;inset:-30px 0;z-index:-1;background:radial-gradient(closest-side,color-mix(in srgb,var(--ambar) 9%,transparent),transparent)}
  .gx-mono .monogram{font-size:clamp(56px,28vw,124px);color:var(--fg);max-width:100%;overflow-wrap:anywhere;text-align:center}
  @supports (text-box:trim-both cap alphabetic){.gx-mono .monogram{text-box:trim-both cap alphabetic}}
  .gx-mono i{width:44px;height:2px;border-radius:2px;background:var(--ac)}
  .gx-ci{display:flex;flex-direction:column;gap:var(--space-3);width:100%;max-width:var(--w-feed);margin:0 auto}
  .gx-lead{font-size:var(--fs-md);color:var(--fg-2);margin:0}
  .gx-ev{font:350 clamp(28px,8.4vw,38px)/1.08 var(--font-display);letter-spacing:-.015em;overflow-wrap:anywhere;margin:0}
  .gx-when{display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-3) 0 var(--space-2);border-top:1px solid var(--line)}
  .gx-when span:first-child{font:380 var(--fs-xl)/1.25 var(--font-display)}
  .gx-when span+span{color:var(--fg-2);font-size:var(--fs-sm)}
  .gx-cta{display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-3)}
  .gx-cta .gx-note{text-align:center;margin:0}
  @media(orientation:landscape) and (max-height:500px){
    .gx-cover{flex-direction:row;align-items:center;justify-content:center;gap:var(--space-12);padding:var(--space-6) var(--space-12)}
    .gx-mono{flex:1;min-height:0;padding-bottom:0}
    .gx-mono .monogram{font-size:clamp(72px,16vw,112px)}
    .gx-ci{flex:1;margin:0;gap:var(--space-2)}
    .gx-ev{font-size:var(--fs-title)}
    .gx-cta{margin-top:var(--space-2);gap:var(--space-2)}
  }
  @media(max-height:640px) and (orientation:portrait){.gx-cover{padding-top:var(--space-6);gap:var(--space-4)}.gx-mono{min-height:120px;gap:var(--space-4)}.gx-mono .monogram{font-size:clamp(64px,22vw,88px)}.gx-cta{margin-top:var(--space-2)}}
  @media(orientation:landscape) and (max-height:500px){.gx-submit{position:sticky;bottom:0;flex-direction:row;align-items:center;background:var(--bg);padding:var(--space-3) 0;margin-top:var(--space-2)}.gx-submit .btn{flex:1}}
  .gx-sign .input{scroll-margin-bottom:calc(var(--space-16) * 2.5)}
  .gx-submit{position:sticky;bottom:0;background:var(--bg);padding:var(--space-3) 0 calc(var(--space-3) + env(safe-area-inset-bottom))}
  .gx-sign .input-sign::placeholder{font-style:normal;color:var(--fg-3)}
  .gx-cam{min-height:100%;display:flex;flex-direction:column;gap:var(--space-4)}
  .gx-mis{display:flex;align-items:center;gap:var(--space-4);padding-bottom:var(--space-3);border-bottom:1px solid var(--line-2)}
  .gx-vf{position:relative;flex:1;min-height:280px;margin:0 calc(-1 * var(--space-6));background:var(--surface);display:grid;place-items:center;text-align:center;padding:var(--space-6);color:var(--fg-2);font-size:var(--fs-sm)}
  .gx-vf p{max-width:28ch}
  .gx-vf span{position:absolute;width:24px;height:24px;border:0 solid var(--fg-3)}
  .gx-vf .c1{top:20px;left:20px;border-top-width:2px;border-left-width:2px}.gx-vf .c2{top:20px;right:20px;border-top-width:2px;border-right-width:2px}.gx-vf .c3{bottom:20px;left:20px;border-bottom-width:2px;border-left-width:2px}.gx-vf .c4{bottom:20px;right:20px;border-bottom-width:2px;border-right-width:2px}
  .gx-ctl{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;justify-items:center}
  .gx-shut{display:grid;place-items:center;width:96px;height:96px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer}
  .gx-shut:focus-visible{outline:2px solid var(--accent-text);outline-offset:4px}
  .gx-vf video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:var(--surface)}
  .gx-vf video.mir{transform:scaleX(-1)}
  .gx-vf span{z-index:1}
  .gx-vf.on p{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .gx-flip{position:absolute;right:40px;bottom:40px;z-index:2;display:grid;place-items:center;min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--fg);cursor:pointer}
  .gx-flip[hidden],.gx-rectime[hidden]{display:none}
  .gx-rectime{position:absolute;top:40px;left:50%;transform:translateX(-50%);z-index:2;padding:4px 12px;border-radius:var(--r-pill,999px);background:var(--surface);color:var(--fg);font-size:var(--fs-sm);font-variant-numeric:tabular-nums}
  .gx-shut.rec .shutter::after{border-radius:12px;transform:scale(.6)}
  .gx-cm2{position:relative;height:100dvh;overflow:hidden;background:var(--noite);color:var(--fg);isolation:isolate}
  .gx-cm2 .gx-vf{position:absolute;inset:0;margin:0;min-height:0;padding:0;background:var(--noite);color:var(--fg-2)}
  .gx-cm2 .gx-vf video{object-fit:cover;background:var(--noite)}
  .gx-vf-m{position:relative;display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:0 var(--space-8);max-width:30ch;text-align:center}
  .gx-vf-m small{font-size:var(--fs-xs);color:var(--fg-3)}
  .gx-vf.on .gx-vf-m small{display:none}
  .gx-cm2 .gx-rectime{top:calc(var(--space-12) + var(--space-8))}
  .gx-ctop{position:absolute;top:0;left:0;right:0;z-index:3;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-3) var(--space-8);background:linear-gradient(180deg,color-mix(in srgb,var(--noite) 70%,transparent),transparent)}
  .gx-cbtn{display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:color-mix(in srgb,var(--noite) 45%,transparent);color:var(--fg);cursor:pointer;text-decoration:none}
  .gx-cbtn:focus-visible,.gx-mchip:focus-visible,.gx-mode:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
  .gx-cm2 .gx-flip{position:static;min-width:44px;min-height:44px;border:0}
  .gx-cmis{display:flex;justify-content:center;gap:var(--space-2);flex-wrap:wrap}
  .gx-mchip{display:inline-flex;align-items:center;gap:var(--space-2);min-height:44px;padding:0 var(--space-4);border-radius:var(--r-pill);background:color-mix(in srgb,var(--noite) 55%,transparent);color:var(--fg);font-size:var(--fs-sm);font-weight:500;text-decoration:none;white-space:nowrap}
  .gx-mchip.acc{background:var(--ac);color:var(--on-ac)}
  .gx-cbot{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-8) var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom));background:linear-gradient(0deg,color-mix(in srgb,var(--noite) 78%,transparent),transparent)}
  .gx-modes{display:flex;gap:var(--space-6)}
  .gx-mode{position:relative;min-height:44px;min-width:44px;padding:0 var(--space-2);background:none;border:0;color:var(--fg-2);font:600 var(--fs-sm) var(--font-body);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
  .gx-mode[aria-pressed=true]{color:var(--fg)}
  .gx-mode[aria-pressed=true]::after{content:"";position:absolute;left:50%;bottom:var(--space-1);width:6px;height:6px;border-radius:50%;background:var(--ac);translate:-50% 0}
  .gx-cm2 .gx-ctl{width:100%;max-width:26rem}
  .gx-cm2 #gx-flip{display:none}
  .gx-tools{position:absolute;right:var(--space-3);top:50%;translate:0 -50%;z-index:3;display:flex;flex-direction:column;gap:var(--space-4)}
  .gx-tool{display:flex;flex-direction:column;align-items:center;gap:var(--space-1);min-width:44px;min-height:44px;padding:0;background:none;border:0;color:var(--fg);font-size:var(--fs-xs);font-weight:600;cursor:pointer}
  .gx-tool-i{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:color-mix(in srgb,var(--noite) 50%,transparent);border:1px solid color-mix(in srgb,var(--fg) 22%,transparent)}
  .gx-tool[aria-pressed=true] .gx-tool-i{background:var(--ac);border-color:var(--ac);color:var(--on-ac)}
  .gx-tool:focus-visible{outline:2px solid var(--fg);outline-offset:2px;border-radius:var(--r-3)}
  .gx-gridov{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,transparent calc(33.33% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) calc(33.33% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) 33.33%,transparent 33.33%,transparent calc(66.66% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) calc(66.66% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) 66.66%,transparent 66.66%),linear-gradient(0deg,transparent calc(33.33% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) calc(33.33% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) 33.33%,transparent 33.33%,transparent calc(66.66% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) calc(66.66% - 1px),color-mix(in srgb,var(--fg) 40%,transparent) 66.66%,transparent 66.66%)}
  .gx-count{position:absolute;inset:0;z-index:4;display:grid;place-items:center;font:300 calc(var(--fs-hero) * 3)/1 var(--font-display);color:var(--fg);background:color-mix(in srgb,var(--noite) 35%,transparent)}
  .gx-cm2 .gx-side{width:48px;height:48px;min-width:48px;min-height:48px;color:var(--fg);background:color-mix(in srgb,var(--noite) 55%,transparent);border:1px solid color-mix(in srgb,var(--fg) 25%,transparent);border-radius:var(--r-2)}
  .gx-cm2 .shutter{width:84px;height:84px;border-width:4px;border-color:var(--fg)}.gx-cm2 .shutter::after{width:64px;height:64px}
  @media(min-width:861px){.gx-cm2{height:min(calc(100dvh - var(--space-8)),52rem);max-width:30rem;margin:var(--space-4) auto;border-radius:var(--r-3)}}
  .gx-side[aria-pressed=true]{color:var(--accent-text)}
  .gx-vid{position:relative;display:block}
  .gx-vid video{display:block;width:100%;height:100%;object-fit:cover}
  .gx-play{position:absolute;right:8px;bottom:8px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--surface);color:var(--fg)}
  .gx-file{position:relative;display:grid;place-items:center;width:96px;height:96px}
  .gx-file input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
  .gx-file:focus-within{outline:2px solid var(--accent-text);outline-offset:4px;border-radius:50%}
  .shutter.big{width:88px;height:88px;margin:0;border-width:4px}
  .shutter.big::after{width:68px;height:68px}
  .gx-side{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-2);min-width:64px;min-height:64px;background:none;border:0;color:var(--fg-2);font-size:var(--fs-xs);font-weight:500;border-radius:var(--r-2)}
  .gx-side:hover{color:var(--fg)}
  .gx-side input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
  .gx-side:focus-within{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-amostras{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)}
  .gx-strip{display:flex;gap:var(--space-3);overflow-x:auto;padding:var(--space-1) 2px var(--space-2);scrollbar-width:none}
  .gx-strip::-webkit-scrollbar{display:none}
  @media(max-width:699px){body .guest-stage ~ .proto-bar{bottom:88px}}
  .gx-pre{flex:none;width:84px;background:none;border:0;padding:0;display:flex;flex-direction:column;gap:var(--space-2);align-items:center;font-size:var(--fs-xs);color:var(--fg-2);min-height:48px}
  .gx-pre .th{width:68px;height:68px;border-radius:var(--r-2);overflow:hidden;border:2px solid transparent;background:var(--surface-2)}
  .gx-pre[aria-pressed="true"] .th{border-color:var(--ac)}
  .gx-pre[aria-pressed="true"]{color:var(--fg);font-weight:600}
  .gx-bar{position:sticky;bottom:0;display:flex;gap:var(--space-3);padding:var(--space-3) var(--space-6) calc(var(--space-3) + env(safe-area-inset-bottom));background:var(--elev-2);border-top:1px solid var(--line)}
  .gx-bar .btn{flex:1}
  .gx-range{width:100%;accent-color:var(--ac);min-height:44px}
  .gx-num{font:350 56px/1 var(--font-display);letter-spacing:-.01em;font-variant-numeric:tabular-nums}
  .gx-roman{font:380 26px/1 var(--font-display);min-width:48px;flex:none;color:var(--fg-2)}
  .gx-roman.big{font-size:var(--fs-hero);width:auto;color:var(--accent-text);font-weight:300}
  .gx-mp{display:flex;align-items:baseline;gap:var(--space-3);margin-bottom:var(--space-3)}
  .gx-cur{display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-6)}
  .gx-cur .btn{margin-top:var(--space-3)}
  .gx-done{margin-top:var(--space-6);font:380 var(--fs-xl)/1.3 var(--font-display)}
  .gx-mrow{display:grid;grid-template-columns:48px minmax(0,1fr) auto;column-gap:var(--space-3);align-items:start;padding:var(--space-4) 0;border-bottom:1px solid var(--line-2);min-height:64px}
  .gx-mrow .gx-t{grid-column:2}
  .gx-mrow .gx-badge{grid-column:3;grid-row:1;align-self:center}
  .gx-macts{grid-column:2 / 4;display:flex;flex-wrap:wrap;gap:0 var(--space-5)}
  .gx-mrow.done{border-bottom-color:var(--ac)}
  .gx-mrow.done .gx-t{color:var(--fg-2)}
  .gx-t{font-weight:500;flex:1 1 120px;min-width:0;overflow-wrap:anywhere}
  .gx-q{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-3);align-items:center;padding:var(--space-3) 0;border-bottom:1px solid var(--line-2)}
  .gx-q .th{width:56px;height:56px;border-radius:var(--r-1);overflow:hidden;flex:none;background:var(--surface-2)}
  .gx-q .grow{flex:1 1 120px;min-width:0;overflow-wrap:anywhere}
  .gx-qa{flex:1 0 100%;display:flex;flex-wrap:wrap;gap:var(--space-2)}
  .phone .gx-qa .btn{flex:1 1 auto;white-space:nowrap}
  .gx-voted{color:var(--accent-text);border-color:var(--ac)}
  .gx-code{font:350 56px/1 var(--font-display);letter-spacing:.28em;padding-left:.28em;font-variant-numeric:tabular-nums}
  .gx-play{display:flex;align-items:center;gap:var(--space-3)}
  .gx-wave{flex:1;height:4px;border-radius:2px;background:var(--line-2);overflow:hidden}
  .gx-wave i{display:block;height:100%;width:0;background:var(--ac)}
  .gx-play[data-on="1"] .gx-wave i{animation:gxplay linear forwards;animation-duration:var(--d)}
  @keyframes gxplay{to{width:100%}}
  .gx-sh{margin:0 auto;max-height:50dvh;display:flex;justify-content:center}
  .gx-sh-in{position:relative;overflow:hidden;background:var(--surface);width:100%}
  .gx-sh.f-916 .gx-sh-in{aspect-ratio:9/16;max-height:50dvh;width:auto}
  .gx-sh.f-45 .gx-sh-in{aspect-ratio:4/5;max-height:50dvh;width:auto}
  .gx-sh.f-11 .gx-sh-in{aspect-ratio:1;max-height:50dvh;width:auto}
  .gx-sh.m-polaroide .gx-sh-in{background:var(--papel);color:var(--tinta);padding:var(--space-3) var(--space-3) 40px}
  .gx-sh.m-polaroide .gx-sh-in .gx-fx{position:relative}
  .gx-sh.m-ambiente .gx-sh-in{background:var(--ev-2)}
  .gx-sh .nm{position:absolute;left:0;right:0;bottom:var(--space-3);text-align:center;font:380 var(--fs-md) var(--font-display)}
  .gx-sh.m-cheia .nm,.gx-sh.m-ambiente .nm{color:var(--papel);background:color-mix(in srgb,var(--noite) 55%,transparent);padding:var(--space-1) var(--space-3);width:fit-content;left:50%;transform:translateX(-50%);border-radius:var(--r-pill);font-size:var(--fs-sm);bottom:var(--space-3)}
  .gx-rad{display:flex;gap:var(--space-3);align-items:flex-start;min-height:48px;cursor:pointer}
  .gx-rad input{margin-top:var(--space-1);width:20px;height:20px;accent-color:var(--ac);flex:none}
  .gx-filebtn{position:relative;overflow:hidden}
  .gx-filebtn input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
  .gx-filebtn:focus-within{outline:2px solid var(--accent-text);outline-offset:2px}
  label.gx-check{display:flex;gap:var(--space-3);align-items:flex-start;cursor:pointer;color:var(--fg);font-size:var(--fs-md);line-height:1.4}
  label.gx-check input{appearance:none;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--fg-3);flex:none;margin:0;display:grid;place-items:center;background:transparent}
  label.gx-check input:checked{background:var(--ac);border-color:var(--ac)}
  label.gx-check input:checked::after{content:"";width:12px;height:6px;border-left:2.5px solid var(--on-ac);border-bottom:2.5px solid var(--on-ac);transform:rotate(-45deg) translate(1px,-1px)}
  label.gx-check input:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-scan{position:relative;aspect-ratio:1;border-radius:var(--r-3);background:var(--surface);overflow:hidden;display:grid;place-items:center;color:var(--fg-2);text-align:center}
  .gx-scan::before{content:"";position:absolute;inset:16%;border:2px solid var(--fg-2);border-radius:var(--r-2)}
  .gx-scan i{position:absolute;left:16%;right:16%;height:2px;background:var(--ac);top:20%;animation:gxscan calc(var(--dur-3) * 8) ease-in-out infinite alternate}
  @keyframes gxscan{to{top:78%}}
  .gx-stat{display:flex;flex-direction:column;gap:var(--space-3)}
  .gx-stat-r{display:grid;grid-template-columns:88px minmax(0,1fr);gap:var(--space-4);align-items:center}
  .gx-stat-th{display:block;width:88px;aspect-ratio:1;border-radius:var(--r-sm,12px);overflow:hidden;background:var(--surface-2,var(--surface))}
  .gx-stat-th .gx-fx{display:block;width:100%;height:100%}
  .gx-stat-th img,.gx-stat-th video{width:100%;height:100%;object-fit:cover}
  .gx-stat h1{margin:var(--space-1) 0}
  .gx-stat p{margin:0;max-width:34ch}
  .gx-st{display:inline-block;font-size:var(--fs-sm);font-weight:500;color:var(--fg-2)}
  .gx-cel-s{display:block;width:fit-content;margin:0 auto}
  .gx-cel-s .gx-star{right:-24px;top:-12px}
  .gx-who .mt:has(.gx-pend){white-space:normal;overflow:visible;text-overflow:clip}
  .gx-pend{display:block;width:fit-content;margin-top:var(--space-1);padding:0 var(--space-2);border:1px solid var(--line);border-radius:var(--r-pill);font-size:var(--fs-sm);color:var(--fg-2)}
  .gx-conf{display:flex;flex-direction:column;gap:var(--space-5);padding-top:var(--space-6)}
  .gx-cel{position:relative;width:fit-content;margin:0 auto}
  .gx-cel .gx-star{position:absolute;right:-30px;top:-20px}
  .gx-state{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:var(--space-3)}
  .gx-state h1,.gx-state h2{font-size:var(--fs-title)}
  .gx-state p{max-width:32ch}
  .gx-state .btn{margin-top:var(--space-3)}
  .gx-state{gap:var(--space-4)}
  .gx-state-art{position:relative;display:grid;place-items:center;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--ac) 30%,transparent),transparent 68%)}
  .gx-state h1,.gx-state h2{font:350 var(--fs-title)/1.15 var(--font-display);letter-spacing:-.01em}
  .gx-state p{color:var(--fg-2);line-height:1.5}
  .gx-state .btn{border-radius:var(--r-pill);min-width:14rem}
  .gx-priv{display:flex;align-items:flex-start;gap:var(--space-3);margin:0;padding:var(--space-4);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3);font-size:var(--fs-sm);color:var(--fg-2)}
  .gx-priv svg{flex:none;color:var(--accent-text)}
  .gx-rule{border-top:1px solid var(--line-2);padding-top:var(--space-5)}
  .gx-offcard{display:flex;gap:var(--space-4);align-items:center}
  .gx-offcard .mascot{flex:none}
  .gx-name{font:300 var(--fs-title)/1.15 var(--font-display);letter-spacing:-.01em;overflow-wrap:anywhere}
  .gx-terms{list-style:none;margin:0;padding:0}
  .gx-terms li{padding:var(--space-3) 0;border-bottom:1px solid var(--line-2);font-size:var(--fs-md)}
  .gx-viewer .gx-phd,.gx-viewer .gx-body{padding-left:0;padding-right:0}
  .gx-viewer .gx-act{padding-left:0;padding-right:0}
  .gx-viewer .gx-ph{background:var(--surface)}
  .gx-imm .gx-viewer{touch-action:pan-y}.gx-sev{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);font-size:var(--fs-sm);color:var(--fg-2)}.gx-sev img{width:24px;height:24px;border-radius:var(--r-pill);object-fit:cover}
  .gx-imm .gx-viewer .gx-ph{border-radius:var(--radius-sm)}
  .gx-vprog{display:flex;gap:var(--space-1);margin-bottom:var(--space-3)}
  .gx-story{padding:0!important;overflow:hidden!important;background:var(--noite);color:var(--fg);border-radius:var(--r-3)}
  .gx-story .modal-head{position:absolute;top:calc(var(--space-3) * 2 + var(--space-1));right:var(--space-1);z-index:5;margin:0;padding:0;pointer-events:none}
  .gx-story .modal-head h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .gx-story .modal-head .btn{pointer-events:auto;border-radius:50%;color:var(--fg);background:none}
  .gx-story .modal-body{position:absolute;inset:0;padding:0}
  .gx-story .gx-viewer{position:absolute;inset:0;touch-action:manipulation}
  .gx-sv{position:absolute;inset:0;overflow:hidden;isolation:isolate}
  .gx-sv-blur{position:absolute;inset:0;z-index:-2;background:var(--noite)}.gx-sv-blur img{width:100%;height:100%;object-fit:cover;filter:blur(32px) brightness(.55) saturate(1.2);transform:scale(1.25)}
  .gx-sv-media{position:absolute;inset:0;z-index:-1;display:grid;place-items:center}
  .gx-sv-media .gx-ph{border-radius:0;background:none}.gx-sv-media .gx-fx img:first-child{object-fit:cover}
  .gx-sv-tap{position:absolute;top:calc(var(--space-12) * 2);bottom:30%;width:32%;z-index:2;background:none;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .gx-sv-tap.l{left:0}.gx-sv-tap.r{right:0;width:68%}
  .gx-sv-tap:focus-visible{outline:2px solid var(--fg);outline-offset:-4px}
  .gx-sv-top{position:absolute;left:0;right:0;top:0;z-index:3;padding:var(--space-3) var(--space-3) var(--space-8);background:linear-gradient(180deg,color-mix(in srgb,var(--noite) 70%,transparent),transparent);pointer-events:none}
  .gx-sv-top>*{pointer-events:auto}
  .gx-sv-top .gx-vprog{margin:0 0 var(--space-3);gap:var(--space-1)}
  .gx-sv-top .gx-vprog i{height:2px;background:color-mix(in srgb,var(--fg) 32%,transparent)}.gx-sv-top .gx-vprog i b,.gx-sv-top .gx-vprog i.on{background:var(--fg)}
  .gx-sv-top .gx-sev{margin:0 0 var(--space-1);font-size:var(--fs-xs);color:var(--fg-2);opacity:.85}
  .gx-sv-hd{display:flex;align-items:center;min-height:48px;padding-right:var(--space-12)}
  .gx-sv-top .gx-phd{flex:1;min-width:0;padding:0;min-height:48px}
  .gx-sv-top .gx-ab{color:var(--fg)}
  .gx-sv-pause{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:none;color:var(--fg);display:grid;place-items:center;cursor:pointer}
  .gx-sv-top .gx-sev{margin:var(--space-1) 0 0}
  .gx-sv-top .gx-who{min-height:48px;color:var(--fg)}.gx-sv-top .gx-who .nm{font-size:var(--fs-md)}.gx-sv-top .gx-who .mt{color:var(--fg-2);font-size:var(--fs-xs)}
  .gx-sv-bot{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:var(--space-12) var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom));background:linear-gradient(0deg,color-mix(in srgb,var(--noite) 88%,transparent) 0%,color-mix(in srgb,var(--noite) 55%,transparent) 55%,transparent 100%);display:flex;flex-direction:column;gap:var(--space-2);pointer-events:none}
  .gx-sv-bot>*{pointer-events:auto}.gx-sv-bot .gx-body,.gx-sv-bot .gx-capw,.gx-sv-bot .gx-act{padding-left:0;padding-right:0}
  .gx-sv-bot .gx-cap{color:var(--fg);font-size:var(--fs-md);line-height:1.4;text-shadow:0 1px 8px color-mix(in srgb,var(--noite) 60%,transparent)}
  .gx-sv-bot .gx-cap b{margin-right:var(--space-2)}
  @media(min-width:641px){.gx-story{width:auto!important;height:min(calc(100dvh - var(--space-8)),50rem);aspect-ratio:9/16;max-width:calc(100vw - var(--space-8))}}
  @media(max-width:640px){.gx-story{left:0!important;right:0!important;top:0!important;bottom:0!important;transform:none!important;width:100%!important;height:100dvh;max-height:none!important;border-radius:0}}
  .gx-vprog i{flex:1;height:3px;border-radius:2px;background:var(--line)}
  .gx-vprog i.on{background:var(--fg)}
  .gx-vprog i{position:relative;overflow:hidden}.gx-vprog i b{position:absolute;inset:0 auto 0 0;width:0;background:var(--fg)}.gx-vprog i.on b{width:100%}.gx-vpause{margin:calc(var(--space-2)*-1) 0 var(--space-2) auto;display:block}
  .gx-note{font-size:var(--fs-sm);color:var(--fg-2);margin:0}
  .gx-badge{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--fs-xs);font-weight:500;color:var(--fg-2)}
  .gx-badge{align-items:flex-start}
  .gx-badge::before{content:"";flex:none;width:8px;height:8px;margin-top:.35em;border-radius:50%;background:var(--fg-3)}
  .gx-badge.ok::before{background:var(--positivo)}.gx-badge.warn::before{background:var(--atencao)}.gx-badge.bad::before{background:var(--crit-text)}.gx-badge.acc::before{background:var(--ac)}
  .gx-det p{color:var(--fg-2);font-size:var(--fs-sm)}
  .gx-rev{display:flex;gap:var(--space-2);flex-wrap:wrap}
  .gx-rank{list-style:none;margin:0;padding:0}
  .gx-recado{font:300 24px/1.5 var(--font-display);letter-spacing:.005em;color:var(--fg);max-width:34ch}
  .gx-sign-off{font:350 var(--fs-xl)/1.2 var(--font-display);color:var(--fg-2)}
  .gx-pr{font:380 var(--fs-xl)/1.25 var(--font-display)}
  .gx-ta{font:300 var(--fs-xl)/1.45 var(--font-display)}
  .gx-lg{font-size:var(--fs-xl)}
  .gx-pin{letter-spacing:.3em;font-variant-numeric:tabular-nums}
  .gx-pair{display:flex;flex-direction:column;align-items:center;gap:var(--space-3);text-align:center;padding:var(--space-4) 0}
  .phone-body{line-height:1.55}
  @media(orientation:landscape) and (max-height:500px){
    .gx-cam{display:grid;grid-template-columns:minmax(0,1fr) 260px;column-gap:var(--space-6);align-content:start}
    .gx-cam>*{grid-column:1}
    .gx-cam>.gx-ctl{grid-column:2;grid-row:1 / span 3;align-self:center}
    .gx-vf{min-height:96px;margin:0}
    .gx-conf>div.stack-2{position:sticky;bottom:0;flex-direction:row;flex-wrap:wrap;align-items:center;background:var(--bg);padding:var(--space-3) 0}
    .gx-conf>div.stack-2 .btn{flex:1 1 160px}
  }
  .gx-hero{display:flex;align-items:baseline;gap:var(--space-3);padding-top:var(--space-6);padding-bottom:var(--space-4)}
  .gx-capb[hidden]{display:none}
  .gx-dcta{display:none}
  .gx-aside{display:none}
  .gx-dnav{display:none}

  /* desktop >=1024: layout próprio de Explorar e Álbum, sem moldura de celular */
  @media(min-width:1024px){
    .gx-stage{display:block;min-height:100dvh;padding:0;background:var(--bg)}
    .gx-stage .phone{max-width:none;width:100%;height:auto;min-height:100dvh;border-radius:0;box-shadow:none;overflow:visible;display:block}
    .gx-stage .phone::before{display:none}
    .gx-stage .phone-body{overflow:visible}
    .gx-stage .gnav{display:none}
    .gx-stage .gx-top{position:sticky;top:0;z-index:20;background:var(--elev-2);border-bottom:1px solid var(--line-2);padding:var(--space-2) max(var(--gutter),calc((100% - var(--w-page)) / 2));gap:var(--space-8)}
    .gx-stage .gx-top h1{flex:0 1 auto;padding-left:0;font-size:var(--fs-xl)}
    .gx-stage .gx-top{background:var(--elev-2);border-bottom:1px solid var(--line-2);min-height:0}
    .gx-stage .gx-top h1::after{display:none}
    .gx-stage .gx-top.nob h1{padding-left:0}
    .gx-stage .gx-dnav{display:flex;align-items:center;gap:var(--space-6);flex:1}
    .gx-dnav a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:48px;color:var(--fg-3);text-decoration:none;font-weight:500;position:relative}
    .gx-dnav a:hover{color:var(--fg)}
    .gx-dnav a[aria-current="page"]{color:var(--fg)}
    .gx-dnav a[aria-current="page"]::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:2px;background:var(--ac)}
    .gx-stage .gx-top .btn{flex:none}
    .gx-stage .gx-dcta{display:inline-flex}
    .gx-layout{display:grid;grid-template-columns:minmax(0,var(--w-feed)) minmax(0,320px);gap:var(--space-16);justify-content:space-between;align-items:start;width:min(100%,calc(var(--w-page) + 2 * var(--gutter)));margin:0 auto;padding:var(--space-8) var(--gutter) var(--space-16)}
    .gx-layout.alb{grid-template-columns:minmax(0,1fr) minmax(0,320px)}
    .gx-layout .gx-in,.gx-layout .gx-pad,.gx-layout .gx-sub,.gx-layout .gx-chips,.gx-layout .gx-gatebar,.gx-layout .gx-rail-h,.gx-layout .gx-rail-l{padding-left:0;padding-right:0}
    .gx-layout .gx-rec{margin-left:0;margin-right:0}
    .gx-layout .gx-demo-top{padding-left:0;padding-right:0}
    .gx-layout .gx-gate{border-radius:var(--r-2);border:1px solid var(--line-2);margin:var(--space-3) 0}
    .gx-layout .gx-pad{padding-bottom:0}
    .gx-layout .gx-post{border:1px solid var(--line-2);border-radius:var(--r-3);overflow:hidden;margin-bottom:var(--space-4)}
    .gx-layout .gx-chips{display:none}
    .gx-layout .gx-sub{display:flex}
    .gx-stage .gx-subh{display:none}
    .gx-layout .gx-grid{grid-template-columns:repeat(4,1fr)}
    .gx-layout .gx-demo{margin-left:0;margin-right:0}
    .gx-aside{display:flex;flex-direction:column;gap:var(--space-10);position:sticky;top:calc(56px + var(--space-8));padding-top:var(--space-4)}
    .gx-aside h2{font:380 var(--fs-xl)/1.2 var(--font-display);margin:0 0 var(--space-3)}
    .gx-mom{display:flex;flex-direction:column}
    .gx-mom button{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);min-height:44px;padding:0 0 0 var(--space-3);background:none;border:0;border-left:2px solid var(--line-2);color:var(--fg-2);font-weight:500;text-align:left}
    .gx-mom button:hover{color:var(--fg)}
    .gx-mom button[aria-pressed="true"]{color:var(--fg);border-left-color:var(--ac)}
    .gx-mom .c{font-variant-numeric:tabular-nums;color:var(--fg-3);font-weight:400;padding-right:var(--space-1)}
    .gx-as-num{display:flex;align-items:baseline;gap:var(--space-2);margin-bottom:var(--space-3)}
    .gx-as-num b{font:350 var(--fs-hero)/1 var(--font-display);font-variant-numeric:tabular-nums}
    .gx-aside .progress{margin-bottom:var(--space-3)}
  }
  @media(min-width:1024px) and (max-height:760px){
    .gx-aside{position:static}
  }
  /* sem cursor o :hover gruda depois do toque: devolve o valor base */
  @media(hover:none){
  .menu[data-theme="noite"] button:hover:not([data-active]):not(:active),.menu[data-theme="noite"] a:hover:not([data-active]):not(:active){background:transparent}
  .gx-back:hover:not(:active),.gx-ib:hover:not(:active),.gx-ab:hover:not(:active){background:transparent}
  .gx-tb:hover:not([aria-pressed="true"]):not(:active){background:transparent}
  .gx-rt.add:hover{background:var(--elev-1)}
  .gx-rec:hover{background:var(--elev-1)}
  .gx-chips .chip:not([aria-pressed="true"]):hover{color:var(--fg-3)}
  .gx-cl:hover,.gx-side:hover{color:var(--fg-2)}
  }
  `;
  const stl = document.createElement('style'); stl.id = 'gx-style'; stl.textContent = css; document.head.append(stl);
  const stl2 = document.createElement('style'); stl2.id = 'gx-style2'; stl2.textContent = `
  .gx-fh,.gx-sp{--bg:rgb(247 241 232);--fg:rgb(43 33 28);--fg-2:rgb(112 98 86);--line:rgb(43 33 28 / .22);background:var(--bg);color:var(--fg);text-align:center}
  @media(max-width:860px){body .gx-fh{padding:var(--space-3) var(--space-4);gap:var(--space-1)}.gx-fh .gx-fh-div,.gx-fh .gx-fh-d{display:none}}
  .gx-fh{display:flex;flex-direction:column;align-items:center;gap:var(--space-3);padding:var(--space-5) var(--space-4);margin:var(--space-3) var(--space-3);border-radius:var(--space-3)}
  .gx-fh-ph{overflow:hidden;background:rgb(0 0 0 / .06)}
  .gx-fh-ph img{width:100%;height:100%;object-fit:cover;display:block}
  .gx-fh h2{margin:0;font-family:var(--font-display);font-size:var(--fs-xl);line-height:1.1;color:var(--fg)}
  .gx-fh-k{font-size:var(--fs-xs);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
  .gx-fh-d,.gx-fh-n{margin:0;font-size:var(--fs-sm);color:var(--fg-2)}
  .gx-fh-div{display:flex;align-items:center;gap:var(--space-3);width:min(60%,200px);color:var(--fg-2)}
  .gx-fh-div i{flex:1;height:1px;background:var(--line)}
  .gx-fh-div b{width:7px;height:7px;rotate:45deg;border:1px solid currentColor}
  .gx-fh-mono{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--fg);font-family:var(--font-display);font-size:var(--fs-sm);letter-spacing:.06em}
  .gx-fh[data-fam=romantico] .gx-fh-ph{width:92px;aspect-ratio:3/4;border-radius:999px 999px var(--space-2) var(--space-2)}
  .gx-fh[data-fam=classico]{border:1px solid var(--line);outline:1px solid var(--line);outline-offset:calc(-1 * var(--space-2))}
  .gx-fh[data-fam=classico] .gx-fh-ph{width:80px;aspect-ratio:4/5;border-radius:var(--space-1)}
  .gx-fh[data-fam=classico] h2{text-transform:uppercase;letter-spacing:.12em;font-size:var(--fs-lg)}
  .gx-fh[data-fam=minimal]{align-items:stretch;text-align:left;padding:var(--space-3)}
  .gx-fh[data-fam=minimal] .gx-fh-ph{aspect-ratio:21/9;border-radius:var(--space-2)}
  .gx-fh[data-fam=minimal] h2{font-weight:300;letter-spacing:-.02em;font-size:var(--fs-2xl,var(--fs-xl))}
  .gx-fh[data-fam=minimal] .gx-fh-div{width:100%}
  .gx-fh[data-fam=minimal] .gx-fh-div b{display:none}
  .gx-fh[data-fam=imersivo]{--bg:rgb(14 12 12);--fg:rgb(255 255 255);--fg-2:rgb(255 255 255 / .82);--line:rgb(255 255 255 / .3);position:relative;min-height:148px;justify-content:flex-end;padding:var(--space-7,var(--space-6)) var(--space-4) var(--space-4);overflow:hidden;isolation:isolate}
  .gx-fh[data-fam=imersivo] .gx-fh-ph{position:absolute;inset:0;z-index:-2}
  .gx-fh[data-fam=imersivo]::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(to top,rgb(14 12 12 / .82),rgb(14 12 12 / .35) 60%,rgb(14 12 12 / .1))}
  .gx-fh[data-fam=imersivo] .gx-fh-div{display:none}
  .gx-pf{display:flex;flex-direction:column;gap:var(--space-5)}
  .gx-pcov{position:relative;height:132px;margin:calc(-1 * var(--space-4)) calc(-1 * var(--space-6)) 0;background:linear-gradient(135deg,var(--ac),var(--noite));overflow:hidden}
  .gx-pcov img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(5px) saturate(1.1);transform:scale(1.08)}
  .gx-pcov::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,var(--bg))}
  .gx-pf-top{display:flex;align-items:flex-end;gap:var(--space-4);margin-top:calc(-1 * var(--space-12))}
  .gx-pav{position:relative;flex:none;display:grid;place-items:center;width:96px;height:96px;border-radius:50%;background:conic-gradient(from 200deg,var(--ac),var(--accent-text),var(--ac))}
  .gx-pav::before{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--bg)}
  .gx-pav>span{position:relative;display:grid;place-items:center;width:80px;height:80px;border-radius:50%;background:var(--ac);font:380 var(--fs-title) var(--font-display);color:var(--on-ac)}
  .gx-pst{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)}
  .gx-pst>div{display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-3);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-pst b{font:350 var(--fs-title)/1 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
  .gx-pst b i{font-style:normal;font-size:var(--fs-md);color:var(--fg-3)}
  .gx-pst span{font-size:var(--fs-xs);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-2)}
  .gx-pbio{display:flex;flex-direction:column;gap:var(--space-1);min-width:0;padding-bottom:var(--space-1)}
  .gx-pbio .nm{font:380 var(--fs-xl)/1.1 var(--font-display);letter-spacing:-.01em;overflow-wrap:anywhere}
  .gx-pbio p{margin:0;font-size:var(--fs-sm);color:var(--fg-2)}
  .gx-pact{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}
  .gx-pact .btn{border-radius:var(--r-pill);font-weight:600}
  .gx-hls{list-style:none;margin:0 calc(-1 * var(--space-6));padding:0 var(--space-6);display:flex;gap:var(--space-4);overflow-x:auto;scrollbar-width:none}
  .gx-hls::-webkit-scrollbar{display:none}
  .gx-hl{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);width:88px;color:var(--fg);text-decoration:none;font-size:var(--fs-xs)}
  .gx-hl:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px;border-radius:var(--r-2)}
  .gx-hl-c{position:relative;display:grid;place-items:center;width:64px;height:64px;border-radius:50%;border:2px solid var(--ac);box-shadow:0 0 0 3px var(--bg) inset;background:var(--elev-1)}
  .gx-hl-b{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:var(--ac);border:2px solid var(--bg)}
  .gx-hl>span:last-child{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gx-ptabs{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-1);padding:var(--space-1);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-pill)}
  .gx-ptab{display:grid;place-items:center;min-height:44px;background:none;border:0;border-radius:var(--r-pill);color:var(--fg-3);cursor:pointer}
  .gx-ptab[aria-selected=true]{background:var(--ac);color:var(--on-ac)}
  .gx-ptab:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
  .gx-pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-1);margin:0}
  .gx-pgrid .gx-tile{border-radius:var(--r-2)}
  .gx-tl{position:absolute;left:var(--space-2);bottom:var(--space-2);display:inline-flex;align-items:center;color:var(--papel)}
  .gx-pempty{display:flex;flex-direction:column;align-items:center;gap:var(--space-3);padding:var(--space-6) var(--space-4);text-align:center;color:var(--fg-2)}
  .gx-pempty b{color:var(--fg);font-size:var(--fs-md)}.gx-pempty p{margin:0;font-size:var(--fs-sm);max-width:30ch}
  .gx-pempty-i{display:grid;place-items:center;width:72px;height:72px;border-radius:50%;border:2px solid var(--line);color:var(--fg)}
  .gx-cfgh{font:600 var(--fs-sm)/1.3 var(--font-body);letter-spacing:.06em;text-transform:uppercase;color:var(--fg-2)}
  .gx-mhead{display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);margin-top:var(--space-3);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-ring{--p:0;flex:none;position:relative;display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--ac) calc(var(--p) * 1%),var(--line) 0)}
  .gx-ring::before{content:"";position:absolute;inset:6px;border-radius:50%;background:var(--elev-1)}
  .gx-ring b{position:relative;font:500 var(--fs-sm) var(--font-body);font-variant-numeric:tabular-nums}
  .gx-mhead .tx{display:flex;flex-direction:column;gap:var(--space-1);min-width:0}
  .gx-mhead .tx>b{font:380 var(--fs-xl)/1.15 var(--font-display)}
  .gx-cur{position:relative;margin-top:var(--space-4);padding:var(--space-5) var(--space-5) var(--space-5) var(--space-6);background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3);overflow:hidden}
  .gx-cur::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--ac)}
  .gx-cur .btn{border-radius:var(--r-pill)}
  .gx-ck{font-size:var(--fs-xs);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
  .gx-ml{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-2)}
  .gx-mi{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;column-gap:var(--space-3);padding:var(--space-3);min-height:68px;background:var(--elev-1);border:1px solid var(--line-2);border-radius:var(--r-3)}
  .gx-mnum{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);font:380 var(--fs-md) var(--font-display);color:var(--fg-2)}
  .gx-mi.done .gx-mnum{background:var(--ac);border-color:var(--ac);color:var(--on-ac)}
  .gx-mt{display:flex;flex-direction:column;min-width:0;line-height:1.3}
  .gx-mt b{font-weight:500;overflow-wrap:anywhere}
  .gx-mi.done .gx-mt{color:var(--fg-2)}
  .gx-mac{display:flex;align-items:center;gap:var(--space-1)}
  .gx-mcam{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ac);color:var(--on-ac)}
  .gx-mcam:focus-visible,.gx-mbtn:focus-visible{outline:2px solid var(--accent-text);outline-offset:2px}
  .gx-mbtn{min-height:44px;padding:0 var(--space-2);background:none;border:0;color:var(--fg-2);font-size:var(--fs-sm);cursor:pointer;text-decoration:underline;text-underline-offset:4px}
  .alb .gx-sec{margin-top:var(--space-6)}
  .alb .gx-sec>h2{font:600 var(--fs-sm)/1.3 var(--font-body);letter-spacing:.06em;text-transform:uppercase;color:var(--fg-2)}
  .alb .gx-sec>h2 .t-small{font-weight:400;letter-spacing:0;text-transform:none}
  .gx-mos[data-fam=imersivo]{gap:calc(var(--space-1) / 2)}
  .gx-mos[data-fam=imersivo] .gx-tile{border-radius:0}
  @media(max-width:860px){.alb .gx-mos{margin-inline:calc(-1 * var(--space-6))}}
  .gx-fh.gx-fh-c{min-height:0;padding:var(--space-3) var(--space-4);gap:var(--space-1)}
  .gx-fh.gx-fh-c .gx-fh-k,.gx-fh.gx-fh-c .gx-fh-d,.gx-fh.gx-fh-c .gx-fh-div{display:none}
  .gx-fh.gx-fh-c h2{font-size:var(--fs-lg)}
  .gx-fh[data-fam=imersivo].gx-fh-c{min-height:88px;justify-content:center}
  .gx-rt.rec.new svg{color:var(--ac)}
  .gx-sp{margin:var(--space-4) var(--space-3);padding:var(--space-4);border-radius:var(--space-3);display:flex;flex-direction:column;align-items:center;gap:var(--space-2)}
  .gx-sp p{margin:0}
  .gx-sp-k{font-size:var(--fs-xs);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
  .gx-sp-t{font-family:var(--font-display);font-size:var(--fs-lg);line-height:1.25}
  .gx-sp-n{font-family:var(--font-display);font-size:var(--fs-2xl,var(--fs-xl));line-height:1}
  .gx-sp a.link{color:var(--fg);min-height:44px;display:inline-flex;align-items:center}
  .gx-sp[data-fam=romantico]{border-radius:999px 999px var(--space-3) var(--space-3);padding-top:var(--space-7,var(--space-6))}
  .gx-sp[data-fam=classico]{border:1px solid var(--line);outline:1px solid var(--line);outline-offset:calc(-1 * var(--space-2));border-radius:var(--space-1)}
  .gx-sp[data-fam=classico] .gx-sp-t{text-transform:uppercase;letter-spacing:.1em;font-size:var(--fs-md)}
  .gx-sp[data-fam=minimal]{align-items:flex-start;text-align:left;border-left:3px solid var(--fg);border-radius:var(--space-1)}
  .gx-sp[data-fam=minimal] .gx-sp-t{font-weight:300}
  .gx-sp[data-fam=imersivo]{--bg:rgb(14 12 12);--fg:rgb(255 255 255);--fg-2:rgb(255 255 255 / .8);--line:rgb(255 255 255 / .3)}
  .gx-mos .gx-tile:first-child:nth-last-child(n+5){grid-column:span 2;grid-row:span 2}
  @media(max-width:860px){.gx-mos:has(.gx-tile:nth-child(4):last-child),.gx-mos:has(.gx-tile:nth-child(2):last-child){grid-template-columns:repeat(2,minmax(0,1fr))}.gx-mos:has(.gx-tile:only-child){grid-template-columns:minmax(0,1fr)}}
  .gx-pad .gx-sec>h2{font:600 var(--fs-xs)/1.3 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2)}
  .gx-mos[data-fam=romantico] .gx-tile:first-child{border-radius:50% 50% var(--space-2) var(--space-2) / 42% 42% var(--space-2) var(--space-2)}
  .gx-mos[data-fam=romantico] .gx-tile:nth-child(4n+3){border-radius:var(--space-3)}
  .gx-mos[data-fam=minimal]{grid-template-columns:repeat(2,1fr);gap:var(--space-2)}
  .gx-mos[data-fam=minimal] .gx-tile:first-child{grid-column:span 2;grid-row:auto;aspect-ratio:16/9}
  .gx-mos[data-fam=classico]{gap:var(--space-2)}
  .gx-mos[data-fam=classico] .gx-tile{outline:1px solid rgb(255 255 255 / .25);outline-offset:2px}
  .gx-mos[data-fam=classico] .gx-tile:first-child{grid-column:span 3;grid-row:auto;aspect-ratio:4/3}
  .gx-mos[data-fam=imersivo] .gx-tile:nth-child(7n+4):not(:last-child){grid-column:span 2;grid-row:span 2}
  `; document.head.append(stl2);

  /* ---------------------------------------------------------------- store helpers */
  const K = (s, k) => `g:${s}:${k}`;
  const get = (s, k, d) => { const v = A.store.get(K(s, k), d); return v === null || v === undefined ? d : v; };
  const set = (s, k, v) => A.store.set(K(s, k), v);
  const upd = (s, k, fn, d) => A.store.update(K(s, k), (x) => fn(x === null || x === undefined ? d : x), d);
  const SKEYS = ['sessao', 'uploads', 'offline', 'falhar', 'missoes', 'reacoes', 'comentarios', 'bloqueados', 'denuncias', 'votos', 'pedidos', 'lido', 'confissoes', 'pareamento', 'app', 'conviteApp', 'vistosF', 'share', 'primeira', 'token', 'shown', 'falharCm', 'gateVisto', 'fm', 'avisoGate', 'falharRx'];
  const curSlug = () => (location.hash.match(/#\/g\/([^/?]+)/) || [])[1] || 'marina-rafael';
  const evOf = (s) => A.data.events.find((e) => e.slug === s);
  const sess = (s) => get(s, 'sessao', null);
  const anf = (s) => GX.anfitrioes[s] || 'os anfitriões';
  const marco = (s) => GX.marco[s] || 'o início';
  const gateOpen = (s) => { const v = A.store.get('gateAberto:' + s); if (v === undefined || v === null) { const c = A.sim().conversa; return c === 'aberta' ? true : c === 'fechada' ? false : A.sim().phase !== 'antes'; } return !!v; };
  const gateHora = (s) => GX.gateHora[s] || '20:30';
  const B = (s) => '#/g/' + s;
  const fmtDT = (iso) => new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const hhmm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const plural = (n, a, b) => `${A.pt(n)} ${n === 1 ? a : b}`;
  const nFV = (l) => { const v = l.filter((u) => u.tipo === 'video').length; const f = l.length - v; return [f || !v ? plural(f, 'foto', 'fotos') : '', v ? plural(v, 'vídeo', 'vídeos') : ''].filter(Boolean).join(' e '); };

  function resolve(slug) {
    const ev = evOf(slug);
    if (!ev) return slug === 'lu-40-velho' ? { estado: 'rotacionado', ev: evOf('lu-40') } : { estado: 'desconhecido' };
    if (ev.id === 'e1') { const ph = A.sim().phase; return { estado: ph === 'depois' ? 'encerrado' : 'aberto', ev, ph }; }
    const ph = ev.phaseFixed; return { estado: ph === 'antes' ? 'nao_comecou' : ph === 'depois' ? 'encerrado' : 'aberto', ev, ph };
  }

  /* ---------------------------------------------------------------- overlays no tema escuro do convidado */
  const night = (el) => { el && el.setAttribute('data-theme', 'noite'); return el; };
  const sheet = (o) => { const po = o.onOpen; return A.modal({ ...o, onOpen: (m, api) => { night(m); po && po(m, api); } }); };
  const gmenu = (anchor, items) => night(A.menu(anchor, items));
  const toast = (msg, o) => night(A.toast(msg, o));
  const confirm = ({ title, body = '', confirm: ok = 'Confirmar', cancel = 'Cancelar', danger = false, type = '' }) => new Promise((res) => {
    let done = false;
    const m = sheet({
      title,
      body: body + (type ? `<div class="field" style="margin-top:16px"><label for="cf-t">Para confirmar, digite <b>${A.esc(type)}</b></label><input class="input" id="cf-t" autocomplete="off"></div>` : ''),
      actions: [{ label: cancel, variant: 'btn-quiet', value: false }, { label: ok, variant: danger ? 'btn-danger solid' : 'btn-primary', onClick: (api) => { if (type && A.$('#cf-t', api.el).value.trim() !== type) { A.$('#cf-t', api.el).focus(); return false; } done = true; } }],
    });
    m.onClose = () => res(done);
  });
  const rerender = () => { const m = A.$('#main'); const y = m ? m.scrollTop : 0; A.render(); const m2 = A.$('#main'); if (m2) m2.scrollTop = y; };

  /* ---------------------------------------------------------------- fotos */
  const MEDIA = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((ok, no) => { if (!window.indexedDB) return no(new Error('sem-idb')); const r = indexedDB.open('albora-proto-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
    const tx = async (mode, fn) => { const db = await open(); return new Promise((ok, no) => { const t = db.transaction('m', mode); fn(t.objectStore('m')); t.oncomplete = () => ok(); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('abortada')); }); };
    return {
      put: (id, blob) => tx('readwrite', (st) => st.put(blob, id)),
      del: (ids) => tx('readwrite', (st) => ids.forEach((id) => st.delete(id))),
      clear: () => tx('readwrite', (st) => st.clear()),
      all: async () => { const db = await open(); return new Promise((ok, no) => { const out = []; const r = db.transaction('m').objectStore('m').openCursor(); r.onsuccess = () => { const c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else ok(out); }; r.onerror = () => no(r.error); }); },
    };
  })();
  const MURL = {}; const VIDSRC = new Set();
  const isVideoBlob = (b) => /^video\//.test(b.type);
  const mediaUrl = (id, blob) => { if (MURL[id]) URL.revokeObjectURL(MURL[id]); const u = URL.createObjectURL(blob); MURL[id] = u; if (isVideoBlob(blob)) VIDSRC.add(u); return u; };
  const dropMedia = (ids) => { ids.forEach((id) => { if (MURL[id]) { URL.revokeObjectURL(MURL[id]); VIDSRC.delete(MURL[id]); delete MURL[id]; } }); MEDIA.del(ids).catch(() => {}); };
  MEDIA.all().then((l) => { if (!l.length) return; l.forEach(([id, blob]) => mediaUrl(id, blob)); A.render(); }).catch(() => {});
  const resetOrig = A.acts.reset; A.acts.reset = (el) => { MEDIA.clear().catch(() => {}); Object.keys(MURL).forEach((k) => { URL.revokeObjectURL(MURL[k]); delete MURL[k]; }); VIDSRC.clear(); return resetOrig(el); };
  const fx = (src, filtro, inten = 100, alt = 'Foto (ilustração do protótipo)', cls = '') => {
    if (!src) return `<span class="gx-fx ${cls}"></span>`;
    if (VIDSRC.has(src)) { const ctl = /\bctl\b/.test(cls); return `<span class="gx-fx gx-vid ${cls}"><video src="${src}#t=0.1" ${ctl ? 'controls' : 'muted'} playsinline preload="metadata" aria-label="${A.esc(alt)}"></video>${ctl ? '' : `<span class="gx-play" aria-hidden="true">${A.icon('video', 16)}</span>`}</span>`; }
    const p = PRE.find((x) => x.id === filtro);
    return `<span class="gx-fx ${cls}"><img src="${src}" alt="${A.esc(alt)}" draggable="false">${p && p.f ? `<img class="gx-fxo" src="${src}" alt="" aria-hidden="true" draggable="false" style="filter:${p.f};opacity:${inten / 100}">` : ''}</span>`;
  };
  const uploads = (s) => get(s, 'uploads', []).map((u) => (u.mid && MURL[u.mid] ? { ...u, src: MURL[u.mid] } : u));
  const authorOf = (s, id) => {
    if (id === 'me') { const n = (sess(s) || {}).nome || 'Você'; return { id: 'me', nome: n, primeiro: n, ini: n.slice(0, 1).toUpperCase() }; }
    return A.data.guests.find((g) => g.id === id) || { id, nome: 'Convidado', primeiro: 'Convidado', ini: '?' };
  };
  const momentoN = (n) => A.data.momentos[Math.min(5, Math.max(0, Math.floor((47 - n) / 8)))];
  const legendaN = (n) => GX.legendas[(n + (n >> 1)) % GX.legendas.length];
  const ownToPhoto = (s, u) => ({ id: u.id, own: true, src: u.src, filtro: u.filtro, inten: u.inten, ratio: 'a', autor: 'me', min: Math.max(0, Math.floor((Date.now() - u.ts) / 60000)), momento: u.momento || 'Pista', legenda: u.legenda || '', missao: u.missao || null, curtidas: 0, comentarios: 0, status: u.status, ar: u.ar, tipo: u.tipo || 'foto', pendente: u.status !== 'aprovada' });
  const DEMO_CURT = [11, 4, 0, 17, 6, 2, 9, 0, 13, 3, 8, 1, 15, 5, 0, 10, 7, 2, 12, 4, 0, 9, 6, 14];
  const DEMO = Array.from({ length: 24 }, (_, i) => ({ id: 'd' + i, n: i * 2, autor: 'g' + ((i * 7 + 1) % 30), status: 'aprovada', min: 3 + i * 6, ratio: i % 5 === 0 ? 'l' : i % 7 === 0 ? 's' : 'p', curtidas: DEMO_CURT[i % DEMO_CURT.length], comentarios: i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0 }));
  const isDemo = () => !A.data.photos.some((p) => p.status === 'aprovada');
  const pool = () => (isDemo() ? DEMO : A.data.photos.filter((p) => p.status === 'aprovada'));
  const asPhoto = (p) => ({ ...p, own: false, src: A.photo(p.id, p.ratio), momento: momentoN(p.n), legenda: legendaN(p.n), filtro: 'original', inten: 100 });
  const demoNote = () => (isDemo() ? `<p class="gx-demo">Exemplo do protótipo: estas fotos são ilustrações só para a demonstração. Na festa de verdade aparecem as fotos dos convidados.</p>` : '');
  const allPhotos = (s) => {
    const bl = get(s, 'bloqueados', []);
    const base = pool().filter((p) => { const a = authorOf(s, p.autor); return a.status !== 'bloqueado' && !bl.includes(p.autor); }).map(asPhoto);
    const own = uploads(s).filter((u) => ['aguardando', 'aprovada'].includes(u.status)).map((u) => ownToPhoto(s, u));
    return [...own, ...base].sort((a, b) => a.min - b.min);
  };
  const filtered = (s) => { const f = get(s, 'fm', 'tudo'); const l = allPhotos(s); return f === 'tudo' ? l : f === 'minhas' ? l.filter((p) => p.own) : l.filter((p) => p.momento === f); };
  const photoById = (s, id) => { const u = uploads(s).find((x) => x.id === id); if (u) return ownToPhoto(s, u); const p = A.data.photos.find((x) => x.id === id) || DEMO.find((x) => x.id === id); return p ? asPhoto(p) : null; };
  const altOf = (s, p) => `Foto de ${authorOf(s, p.autor).primeiro}, ${p.momento.toLowerCase()} (ilustração do protótipo)`;
  const phHtml = (s, p, cls = '') => `<span class="gx-ph r-${p.ratio} ${cls}" style="${p.ratio === 'a' && p.ar ? 'aspect-ratio:' + p.ar : ''}">${fx(p.src, p.filtro, p.inten, altOf(s, p))}</span>`;
  const ago = (p) => A.ago(p.min);

  /* ---------------------------------------------------------------- reações e comentários */
  const reacaoMinha = (s, id) => (get(s, 'reacoes', {}))[id] || '';
  const commentsOf = (s, p) => {
    const r = A.rand(A.hash('cm' + p.id)); const seeded = Array.from({ length: p.comentarios || 0 }, (_, i) => { const g = A.data.guests[Math.floor(r() * 30)]; return { id: p.id + 'c' + i, autor: g.id, texto: GX.comentarios[Math.floor(r() * GX.comentarios.length)], min: Math.max(0, p.min - 1 - i * 2) }; })
      .filter((c) => authorOf(s, c.autor).status !== 'bloqueado' && !get(s, 'bloqueados', []).includes(c.autor));
    const mine = (get(s, 'comentarios', {})[p.id] || []).map((c) => ({ ...c, autor: 'me', min: Math.max(0, Math.floor((Date.now() - c.ts) / 60000)) }));
    return [...seeded, ...mine];
  };
  const reactCounts = (p, mine) => { const n = p.curtidas || 0; const r = A.rand(A.hash('rc' + p.id)); const out = {}; A.data.reacoes.forEach((x) => (out[x] = 0)); for (let i = 0; i < n; i++) out[A.data.reacoes[Math.floor(r() * r() * A.data.reacoes.length)]]++; if (mine) out[mine]++; return out; };
  /* ícone Lucide smile-plus (ausente de icons-lucide.js): registrado aqui até entrar no núcleo */
  if (window.LUCIDE && !window.LUCIDE['smile-plus']) window.LUCIDE['smile-plus'] = '<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/>'; 
  /* ---- componentes locais do post: UserAvatar, ActionMenu, PostHeader, PostMedia, PostActions, ReactionButton, ReactionSummary, CommentSheet ---- */
  const userAvatar = (a, size = 36, me = false) => `<span class="avatar${size === 28 ? ' sm' : size === 56 ? ' lg' : ''} gx-av${me ? ' me' : ''}" aria-hidden="true">${A.esc(a.ini)}</span>`;
  const actionMenu = (p) => `<button class="gx-ab" data-act="g-more" data-id="${p.id}" aria-haspopup="menu" aria-label="Mais opções desta foto">${A.icon('more', 24)}</button>`;
  const postHeader = (s, p, inModal = false, feed = false) => {
    const a = authorOf(s, p.autor); const href = p.own ? B(s) + '/minhas' : B(s) + '/p/' + a.id; const ts = Date.now() - p.min * 60000;
    return `<div class="gx-phd"><a class="gx-who" href="${href}" ${inModal ? 'data-mclose' : ''}>${userAvatar(a, 36, p.own)}<span class="tx"><span class="nm">${A.esc(p.own ? 'Você' : a.nome)}</span><span class="mt">${feed ? '' : `<time datetime="${new Date(ts).toISOString()}" title="${hhmm(ts)}">${ago(p)}</time> · `}${A.esc(p.momento)}${p.pendente ? '<span class="gx-pend">Aguardando aprovação · só você vê</span>' : ''}</span></span></a>${actionMenu(p)}</div>`;
  };
  const ratioOf = (p) => {
    if (p.ratio === 'l') return 1.5; if (p.ratio === 's') return 1;
    if (p.ratio === 'a' && p.ar) { const [w, h] = String(p.ar).split('/').map(Number); if (w && h) return w / h; }
    return 0.8;
  };
  const boxOf = (p) => Math.max(ratioOf(p), 0.8).toFixed(3);
  const postMedia = (s, p) => {
    const a = authorOf(s, p.autor); const g = gateOpen(s);
    return `<button class="gx-pm" style="aspect-ratio:${boxOf(p)}" data-act="g-open" data-ctx="feed" data-id="${p.id}" data-dbl="${g ? 1 : 0}" aria-label="Abrir a foto de ${A.esc(p.own ? 'você' : a.primeiro)} em destaque${g ? '. Duplo toque para reagir' : ''}">${fx(p.src, p.filtro, p.inten, altOf(s, p))}${g ? `<span class="gx-pop" aria-hidden="true">${A.icon('heart', 88, '', { fill: true })}</span>` : ''}</button>`;
  };
  const rtotal = (cnt) => Object.values(cnt).reduce((x, y) => x + y, 0);
  const postActions = (s, p, o = {}) => {
    const mine = reacaoMinha(s, p.id); const tot = rtotal(reactCounts(p, mine)); const nC = commentsOf(s, p).length; const other = mine && mine !== A.data.reacoes[0] ? mine : '';
    return `<div class="gx-act" role="group" aria-label="Ações da foto"><button class="gx-ab gx-rb${o.pulse ? ' pulse' : ''}" data-act="g-react" data-lp="1" data-id="${p.id}" aria-pressed="${!!mine}" aria-label="${mine ? `Sua reação: ${A.esc(mine)}. Toque para tirar` : `Reagir com ${A.esc(A.data.reacoes[0])}`}">${A.icon('heart', 24, '', { fill: !!mine })}<span class="gx-n">${tot || ''}</span></button><button class="gx-ab" data-act="g-comments" data-id="${p.id}" aria-label="Comentar${nC ? `, ${plural(nC, 'comentário', 'comentários')}` : ''}">${A.icon('chat', 24)}<span class="gx-n">${nC || ''}</span></button><button class="gx-ab" data-act="g-sharephoto" data-id="${p.id}" aria-label="Compartilhar fora da festa">${A.icon('share', 24)}</button><button class="gx-ab end${other ? ' on' : ''}" data-act="g-react-pick" data-id="${p.id}" aria-expanded="false" aria-label="${mine ? `Sua reação: ${A.esc(mine)}. Escolher outra` : 'Escolher uma reação'}">${A.icon('smile-plus', 24)}${other ? `<span class="gx-mr">${A.esc(other)}</span>` : ''}</button></div>`;
  };
  const reactionSummary = (s, p) => {
    const mine = reacaoMinha(s, p.id); const cnt = reactCounts(p, mine); const tot = rtotal(cnt);
    if (!tot) return '<p class="gx-rs">Seja o primeiro a reagir.</p>';
    const tops = A.data.reacoes.filter((r) => cnt[r]).sort((x, y) => cnt[y] - cnt[x]).slice(0, 3);
    const quem = mine ? (tot === 1 ? 'Você reagiu' : `Você e mais ${plural(tot - 1, 'pessoa', 'pessoas')} reagiram`) : (tot === 1 ? '1 pessoa reagiu' : `${A.pt(tot)} pessoas reagiram`);
    const parts = tops.map((r) => `<span class="${r === mine ? 'on' : ''}">${A.esc(r)}${tops.length > 1 ? ` ${cnt[r]}` : ''}</span>`).join(' · ');
    return `<p class="gx-rs"><b>${quem}</b> · ${parts}</p>`;
  };
  const actionsBlock = (s, p, o) => (gateOpen(s) ? `${postActions(s, p, o)}<div class="gx-body">${reactionSummary(s, p)}</div>` : '');
  const commentLink = (s, p) => { if (!gateOpen(s)) return ''; const n = commentsOf(s, p).length; return n ? `<button class="gx-cl" data-act="g-comments" data-id="${p.id}" data-ver="1">${n === 1 ? 'Ver o comentário' : `Ver os ${A.pt(n)} comentários`}</button>` : ''; };
  const capHtml = (s, p) => (p.legenda ? `<div class="gx-capw gx-body"><p class="gx-cap" data-cap><b>${A.esc(p.own ? 'Você' : authorOf(s, p.autor).primeiro)}</b>${A.esc(p.legenda)}</p><button class="gx-capb" data-act="g-cap" aria-expanded="false" hidden>mais</button></div>` : '');
  const fitCaps = (root) => A.$$('[data-cap]', root).forEach((c) => { const b = c.nextElementSibling; if (b && b.classList.contains('gx-capb')) b.hidden = !(c.scrollHeight > c.clientHeight + 1 || c.classList.contains('open')); });
  A.acts['g-cap'] = (el) => { const c = el.previousElementSibling; const on = !c.classList.contains('open'); c.classList.toggle('open', on); el.textContent = on ? 'menos' : 'mais'; el.setAttribute('aria-expanded', on); };
  const announce = (msg) => { let l = A.$('#gx-live'); if (!l) { l = document.createElement('div'); l.id = 'gx-live'; l.className = 'sr-only'; l.setAttribute('role', 'status'); l.setAttribute('aria-live', 'polite'); document.body.append(l); } l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); };
  const updActions = (id, o = {}) => {
    const s = curSlug(); const p = photoById(s, id); if (!p) return; const ae = document.activeElement; const key = ae && ae.dataset && ae.closest && ae.closest('[data-actions]') ? ae.dataset.act : null;
    A.$$(`[data-actions="${id}"]`).forEach((el) => { el.innerHTML = actionsBlock(s, p, o); });
    A.$$(`[data-cmlink="${id}"]`).forEach((el) => { el.innerHTML = commentLink(s, p); });
    if (key) { const all = A.$$(`[data-actions="${id}"] [data-act="${key}"]`); const t = all[all.length - 1]; t && t.focus({ preventScroll: true }); }
  };
  const RX = {};
  const setReaction = (s, id, r) => {
    const prev = reacaoMinha(s, id); const seq = (RX[id] = (RX[id] || 0) + 1);
    const put = (v) => upd(s, 'reacoes', (o) => { const n = { ...o }; if (v) n[id] = v; else delete n[id]; return n; }, {});
    put(r); updActions(id, { pulse: !!r }); announce(r ? `Você reagiu: ${r}.` : 'Reação retirada.');
    if (get(s, 'offline', false)) return toast('Sem sinal: a reação sobe quando o sinal voltar.');
    setTimeout(() => {
      if (RX[id] !== seq || !get(s, 'falharRx', false)) return;
      set(s, 'falharRx', false); put(prev); updActions(id); announce('A reação não foi registrada e voltou ao que estava.');
      const t = toast(r ? 'Não deu para registrar sua reação. Ela voltou ao que estava.' : 'Não deu para retirar sua reação. Ela voltou ao que estava.', { kind: 'bad', undo: () => setReaction(s, id, r) });
      const b = A.$('button', t); if (b) b.textContent = 'Tentar de novo';
    }, 700);
  };
  let TRAY = null; let TRAYLAST = null;
  const closeTray = (back) => {
    if (!TRAY) return; const { el, anchor, off } = TRAY; TRAY = null; off(); el.remove();
    if (anchor.isConnected) { anchor.setAttribute('aria-expanded', 'false'); if (back) anchor.focus({ preventScroll: true }); }
  };
  const openTray = (anchor, s, id) => {
    if (TRAYLAST && TRAYLAST.anchor === anchor && Date.now() - TRAYLAST.t < 400) { TRAYLAST = null; return; }
    closeTray(false); const cur = reacaoMinha(s, id);
    const el = night(document.createElement('div')); el.className = 'gx-tray'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Como você reagiu?');
    el.innerHTML = A.data.reacoes.map((r) => `<button type="button" class="gx-tb" data-r="${A.esc(r)}" aria-pressed="${r === cur}">${A.esc(r)}</button>`).join('');
    document.body.append(el);
    const r = anchor.getBoundingClientRect(); const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.min(Math.max(8, anchor.dataset.act === 'g-react-pick' ? r.right - w : r.left), innerWidth - w - 8);
    let y = r.top - h - 8; if (y < 8) y = Math.min(r.bottom + 8, innerHeight - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px'; anchor.setAttribute('aria-expanded', 'true');
    const btns = A.$$('.gx-tb', el);
    const onDown = (e) => { if (el.contains(e.target)) return; if (anchor.contains(e.target)) TRAYLAST = { anchor, t: Date.now() }; closeTray(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); return closeTray(true); }
      if (e.key === 'Tab') return closeTray(true);
      const i = btns.indexOf(document.activeElement); if (i < 0) return;
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[e.key]; if (k === undefined) return;
      e.preventDefault(); btns[(k + btns.length) % btns.length].focus();
    };
    const onScroll = () => closeTray(false);
    document.addEventListener('pointerdown', onDown, true); document.addEventListener('keydown', onKey, true); document.addEventListener('scroll', onScroll, true); window.addEventListener('resize', onScroll);
    TRAY = { el, anchor, off: () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); } };
    el.addEventListener('click', (e) => { const b = e.target.closest('.gx-tb'); if (!b) return; closeTray(true); setReaction(s, id, b.dataset.r === cur ? '' : b.dataset.r); });
    (btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0]).focus();
  };

  A.acts['g-react'] = (el) => { const s = curSlug(), id = el.dataset.id; setReaction(s, id, reacaoMinha(s, id) ? '' : A.data.reacoes[0]); };
  A.acts['g-react-pick'] = (el) => { if (TRAY && TRAY.anchor === el) return closeTray(true); openTray(el, curSlug(), el.dataset.id); };
  A.acts['g-sharephoto'] = (el) => { const s = curSlug(); A.$$('.modal,.scrim').forEach((x) => x.remove()); A.go(`${B(s)}/compartilhar?foto=${el.dataset.id}`); };

  /* toque longo no coração abre o seletor de reações; o clique que segue é descartado */
  const LP = { t: 0, fired: false };
  document.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('[data-lp]'); if (!b || e.pointerType === 'mouse') return; clearTimeout(LP.t); LP.t = setTimeout(() => { LP.fired = true; A.acts['g-react-pick'](b); }, 450); });
  ['pointerup', 'pointercancel', 'pointermove'].forEach((n) => document.addEventListener(n, () => clearTimeout(LP.t)));
  document.addEventListener('click', (e) => { if (LP.fired) { LP.fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('[data-lp]')) e.preventDefault(); });

  /* ---- comentários: CommentSheet com campo fixo na base, envio otimista, reversão com texto recuperável ---- */
  const cmRow = (s, p) => (c) => {
    const a = authorOf(s, c.autor); const st = c.sending ? 'Enviando…' : c.pend ? 'Na fila, sobe quando o sinal voltar' : A.ago(c.min);
    return `<div class="gx-cmi ${c.sending ? 'sending' : ''}">${userAvatar(a, 28, c.autor === 'me')}<div class="b"><b>${A.esc(c.autor === 'me' ? 'Você' : a.primeiro)}</b>${c.autor !== 'me' && c.autor === p.autor ? '<span class="au">Autor da foto</span>' : ''}${A.esc(c.texto)}<div class="t">${st}</div></div>${c.sending ? '' : `<button class="gx-ib q sm" data-act="g-cmenu" data-pid="${p.id}" data-cid="${c.id}" aria-haspopup="menu" aria-label="Opções do comentário de ${A.esc(c.autor === 'me' ? 'você' : a.primeiro)}">${A.icon('more', 20)}</button>`}</div>`;
  };
  const drawCm = (m, bottom) => {
    const s = curSlug(); const p = photoById(s, m.dataset.pid); if (!p) return; const l = commentsOf(s, p); const box = A.$('#gx-cm', m);
    A.$('h2', m).textContent = l.length ? `Comentários · ${l.length}` : 'Comentários';
    box.innerHTML = l.length ? l.map(cmRow(s, p)).join('') : `<div class="gx-cempty">${A.icon('chat', 28)}<b>Ainda sem comentários</b><p>Seja a primeira pessoa a comentar a foto de ${A.esc(p.own ? 'você' : authorOf(s, p.autor).primeiro)}.</p></div>`;
    if (bottom) box.scrollTop = box.scrollHeight;
  };
  const refreshCm = (id) => { const m = A.$('.modal.gx-cs'); if (m && m.dataset.pid === id) drawCm(m, true); updActions(id); };
  /* bottom sheet arrastável (só em tela estreita): alça no topo; arrastar para cima expande a 100%, para baixo reduz ou fecha; toque na alça e ↑/↓ alternam */
  function sheetDrag(el, api, fit) {
    const grab = document.createElement('button'); grab.type = 'button'; grab.className = 'gx-grab'; grab.innerHTML = '<i aria-hidden="true"></i>'; el.prepend(grab);
    let full = false; let d = null; let justDragged = false;
    const vh = () => (window.visualViewport ? window.visualViewport.height : innerHeight);
    const ms = () => (reduceMotion() ? 0 : 240);
    const setFull = (on) => { full = on; el.classList.toggle('full', on); grab.setAttribute('aria-label', on ? 'Reduzir os comentários' : 'Expandir os comentários'); grab.setAttribute('aria-expanded', String(on)); fit && fit(); };
    grab.setAttribute('aria-label', 'Expandir os comentários'); grab.setAttribute('aria-expanded', 'false');
    grab.addEventListener('click', () => { if (justDragged) { justDragged = false; return; } setFull(!full); });
    grab.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' && !full) { e.preventDefault(); setFull(true); } else if (e.key === 'ArrowDown' && full) { e.preventDefault(); setFull(false); } });
    const move = (e) => {
      if (!d) return; const dy = e.clientY - d.y; if (Math.abs(dy) > 6) d.moved = true; if (!d.moved) return;
      d.cur = Math.min(vh(), Math.max(96, d.h - dy)); el.style.height = d.cur + 'px'; el.style.maxHeight = vh() + 'px';
    };
    const up = (e) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (!d) return; const x = d; d = null; el.style.transition = '';
      if (!x.moved) return; justDragged = true; setTimeout(() => { justDragged = false; }, 0);
      const dy = e.clientY - x.y; const v = dy / Math.max(1, Date.now() - x.t);
      const mid = Math.min(innerHeight * 0.72, 640); let t;
      if (dy > 0) t = x.full ? (dy > 80 || v > 0.5 ? 'mid' : 'full') : (dy > 110 || v > 0.6 ? 'close' : 'mid');
      else t = (-dy > 50 || v < -0.5 || x.full) ? 'full' : 'mid';
      el.style.transition = `height ${ms()}ms var(--ease), transform ${ms()}ms var(--ease)`;
      if (t === 'close') { el.style.transform = 'translateY(100%)'; setTimeout(() => api.close(), ms()); return; }
      el.style.height = (t === 'full' ? vh() : mid) + 'px';
      setTimeout(() => { if (!el.isConnected) return; el.style.transition = ''; el.style.height = ''; setFull(t === 'full'); }, ms());
    };
    el.addEventListener('pointerdown', (e) => {
      if (innerWidth > 640 || e.button || !e.target.closest('.gx-grab,.modal-head') || e.target.closest('[data-mclose]')) return;
      d = { y: e.clientY, t: Date.now(), h: el.getBoundingClientRect().height, full, moved: false }; el.style.transition = 'none';
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }
  function commentSheet(s, p, listFirst) {
    const vv = window.visualViewport;
    const m = sheet({
      title: 'Comentários',
      body: `<div class="gx-cctx"><span class="th" aria-hidden="true">${fx(p.src, p.filtro, p.inten, '', 'cover')}</span><div class="tx"><b>Foto de ${A.esc(p.own ? 'você' : authorOf(s, p.autor).primeiro)}</b><span>${A.esc(p.legenda || p.momento)}</span></div></div><div class="gx-cm" id="gx-cm" role="log" aria-label="Lista de comentários" tabindex="-1"></div><form class="gx-cf" data-submit="g-comentar" data-id="${p.id}" novalidate><div class="row"><label class="sr-only" for="gx-ct">Seu comentário</label><input class="input" id="gx-ct" name="texto" maxlength="280" autocomplete="off" enterkeyhint="send" placeholder="Escreva algo gentil" data-input="g-count" aria-describedby="gx-cc gx-ce"><button class="gx-send" type="submit" aria-label="Enviar comentário">${A.icon('send', 20)}</button></div><span class="err" id="gx-ce" role="alert"></span><span class="hint" id="gx-cc">280 caracteres restantes</span></form>`,
      onOpen: (el, api) => { el.classList.add('gx-cs'); el.dataset.pid = p.id; sheetDrag(el, api, () => fit()); },
    });
    const fit = () => { if (!m.el.isConnected || !vv) return; const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop); m.el.style.bottom = innerWidth <= 640 ? kb + 'px' : ''; m.el.style.maxHeight = `${Math.round(vv.height - (m.el.classList.contains('full') ? 0 : 16))}px`; };
    if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
    m.onClose = () => {
      if (vv) { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); }
      if (!document.activeElement || document.activeElement === document.body) { const t = A.$$(`[data-act="g-comments"][data-id="${p.id}"]`).pop(); if (t) t.focus({ preventScroll: true }); }
    };
    fit(); drawCm(m.el, true); const inp = A.$('#gx-ct', m.el); const dr = G.cdraft[p.id];
    if (dr) { inp.value = dr; A.inputs['g-count'](inp); }
    if (listFirst) A.$('#gx-cm', m.el).focus({ preventScroll: true });
    return m;
  }
  A.acts['g-comments'] = (el) => { const s = curSlug(); const p = photoById(s, el.dataset.id); if (p) commentSheet(s, p, el.dataset.ver === '1'); };
  A.inputs['g-count'] = (el) => { const f = el.closest('form'); const c = A.$('#gx-cc', f); if (c) c.textContent = `${280 - el.value.length} caracteres restantes`; if (f.dataset.id) G.cdraft[f.dataset.id] = el.value; };
  function settleComment(s, id, cid, v) {
    if (get(s, 'falharCm', false)) {
      set(s, 'falharCm', false); upd(s, 'comentarios', (o) => ({ ...o, [id]: (o[id] || []).filter((x) => x.id !== cid) }), {});
      const m = A.$('.modal.gx-cs'); const inp = m && m.dataset.pid === id ? A.$('#gx-ct', m) : null;
      if (inp) { if (!inp.value) { inp.value = v; A.inputs['g-count'](inp); } A.$('#gx-ce', m).textContent = 'Não deu para enviar agora. Seu texto continua aqui: toque em Enviar para tentar de novo.'; inp.setAttribute('aria-invalid', 'true'); inp.focus(); }
      else { G.cdraft[id] = v; toast('Seu comentário não foi enviado. O texto ficou guardado nos comentários dessa foto.', { kind: 'bad' }); }
    } else upd(s, 'comentarios', (o) => ({ ...o, [id]: (o[id] || []).map((x) => (x.id === cid ? { ...x, sending: false } : x)) }), {});
    refreshCm(id);
  }
  A.acts['g-comentar'] = (form) => {
    const s = curSlug(), id = form.dataset.id; const inp = A.$('input[name=texto]', form); const v = inp.value.trim(); const err = A.$('#gx-ce', form);
    if (!v) { err.textContent = 'Escreva alguma coisa antes de enviar.'; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
    inp.removeAttribute('aria-invalid'); err.textContent = '';
    const off = get(s, 'offline', false); const cid = 'mc' + A.uid();
    upd(s, 'comentarios', (o) => ({ ...o, [id]: [...(o[id] || []), { id: cid, texto: v, ts: Date.now(), pend: off, sending: !off }] }), {});
    inp.value = ''; A.inputs['g-count'](inp); delete G.cdraft[id]; refreshCm(id);
    if (off) toast('Sem sinal: o comentário sobe quando o sinal voltar.'); else setTimeout(() => settleComment(s, id, cid, v), 700);
  };
  A.acts['g-cmenu'] = (el) => {
    const s = curSlug(), pid = el.dataset.pid, cid = el.dataset.cid; const p = photoById(s, pid); const c = commentsOf(s, p).find((x) => x.id === cid); if (!c) return;
    const a = authorOf(s, c.autor); const mod = el.closest('.modal');
    if (c.autor === 'me') return gmenu(el, [{ label: 'Remover meu comentário', icon: 'trash', danger: 1, onClick: () => { const bak = get(s, 'comentarios', {}); upd(s, 'comentarios', (o) => ({ ...o, [pid]: (o[pid] || []).filter((x) => x.id !== cid) }), {}); refreshCm(pid); toast('Comentário removido.', { undo: () => { set(s, 'comentarios', bak); refreshCm(pid); } }); } }]);
    gmenu(el, [
      { label: 'Denunciar comentário', icon: 'flag', onClick: () => { upd(s, 'denuncias', (l) => [...l, { tipo: 'comentario', id: cid, ts: Date.now() }], []); toast('Recebido. Os anfitriões vão revisar o comentário.'); } },
      { label: `Bloquear ${a.primeiro}`, icon: 'lock', danger: 1, onClick: () => bloquear(s, a.id, mod) },
    ]);
  };

  /* ---------------------------------------------------------------- menu "⋯" único por foto */
  A.acts['g-more'] = (el) => {
    const s = curSlug(), id = el.dataset.id; const p = photoById(s, id); if (!p) return; const a = authorOf(s, p.autor);
    const items = [{ label: 'Compartilhar fora da festa', icon: 'share', hint: gateOpen(s) ? '' : 'depois d' + marco(s).replace(/^(a|o) /, '$1 '), onClick: () => { if (!gateOpen(s)) return toast(`Compartilhar fora abre depois d${marco(s)}. Antes disso a festa fica entre quem está nela.`.replace('d a ', 'da ').replace('d o ', 'do ')); A.$$('.modal,.scrim').forEach((x) => x.remove()); A.go(`${B(s)}/compartilhar?foto=${id}`); } },
      { label: 'Denunciar', icon: 'flag', onClick: () => denunciar(s, p) }];
    if (!p.own) items.push({ label: `Bloquear ${a.primeiro}`, icon: 'lock', danger: 1, onClick: () => bloquear(s, a.id) });
    if (p.own) items.push({ sep: 1 }, { label: 'Remover minha foto', icon: 'trash', danger: 1, onClick: () => excluirFoto(s, id) });
    gmenu(el, items);
  };
  function denunciar(s, p) {
    const a = authorOf(s, p.autor);
    sheet({
      title: 'Denunciar esta foto',
      body: `<form data-submit="g-denunciar" data-id="${p.id}" class="stack" novalidate><fieldset style="border:0;padding:0;margin:0" class="stack-2"><legend class="t-small" style="margin-bottom:var(--space-2)">O que aconteceu?</legend><label class="gx-rad"><input type="radio" name="kind" value="naoDeveria" checked><span>Esta foto não deveria estar no evento</span></label>${p.own ? '' : '<label class="gx-rad"><input type="radio" name="kind" value="eu"><span>Sou eu nessa foto e quero que tirem do telão e do álbum</span></label>'}</fieldset>${A.field({ name: 'motivo', label: 'Motivo', rows: 3, extra: 'maxlength="280"', hint: 'Até 280 caracteres. Só os anfitriões leem.' })}<button class="btn btn-danger solid" type="submit">Enviar denúncia</button><p class="gx-note">${p.own ? '' : `${A.esc(a.primeiro)} não é avisado de que você denunciou.`}</p></form>`,
    });
  }
  A.acts['g-denunciar'] = (form) => {
    const s = curSlug(); const kind = (A.$('input[name=kind]:checked', form) || {}).value; const motivo = (A.$('textarea[name=motivo]', form) || {}).value || '';
    upd(s, 'denuncias', (l) => [...l, { tipo: 'foto', id: form.dataset.id, kind, motivo: motivo.slice(0, 280), ts: Date.now() }], []);
    form.closest('.modal').querySelector('[data-mclose]').click();
    toast(kind === 'eu' ? 'Recebido. Os anfitriões vão avaliar tirar a foto do telão e do álbum.' : 'Recebido. Os anfitriões vão revisar. Enquanto isso, você pode bloquear quem enviou.');
  };
  function bloquear(s, id, mod) {
    const a = authorOf(s, id);
    confirm({ title: `Bloquear ${a.primeiro}?`, body: `<p>Você deixa de ver as fotos e os comentários de ${A.esc(a.primeiro)} nesta festa. ${A.esc(a.primeiro)} não é avisado. Dá para desbloquear em Perfil.</p>`, confirm: 'Bloquear', danger: true }).then((ok) => {
      if (!ok) return;
      upd(s, 'bloqueados', (l) => (l.includes(id) ? l : [...l, id]), []);
      A.$$('.modal,.scrim').forEach((x) => x.remove());
      rerender();
      toast(`${a.primeiro} bloqueado.`, { undo: () => { upd(s, 'bloqueados', (l) => l.filter((x) => x !== id), []); rerender(); } });
    });
  }
  function excluirFoto(s, id) {
    confirm({ title: 'Remover esta foto?', body: '<p>A foto sai do álbum, do feed e do telão, e é apagada dos servidores. Isso não dá para desfazer.</p>', confirm: 'Remover foto', danger: true }).then((ok) => {
      if (!ok) return; dropMedia([id]); upd(s, 'uploads', (l) => l.filter((u) => u.id !== id), []); A.$$('.modal,.scrim').forEach((x) => x.remove()); rerender(); toast('Foto removida.');
    });
  }

  /* ---------------------------------------------------------------- viewer (foto em tela grande) */
  const listFor = (s, ctx, extra) => (ctx === 'autor' ? allPhotos(s).filter((p) => p.autor === extra) : filtered(s));
  const reduceMotion = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const flip = (from, to) => {
    if (!from || !from.isConnected || !to || reduceMotion()) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(); if (!a.width || !b.width) return;
    const k = a.width / b.width; const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    to.style.transformOrigin = '50% 50%'; to.style.transition = 'none'; to.style.transform = `translate(${dx}px,${dy}px) scale(${k})`; void to.offsetWidth;
    to.style.transition = 'transform var(--dur-3) var(--ease)'; to.style.transform = 'none';
    to.addEventListener('transitionend', () => { to.style.transition = ''; to.style.transform = ''; to.style.transformOrigin = ''; }, { once: true });
  };
  const viewerMedia = (s, p, imm) => `<span class="gx-ph" style="--box:${boxOf(p)};aspect-ratio:var(--box);width:min(100%,calc(${imm ? 72 : 56}dvh * var(--box)));margin:0 auto">${fx(p.src, p.filtro, p.inten, altOf(s, p), 'ctl')}</span>`;
  const storyEv = (s) => { const ev = evOf(s); const src = capaDe(ev); return `<div class="gx-sev">${src ? `<img src="${src}" alt="" aria-hidden="true">` : ''}<span>${A.esc(ev.nome)}</span></div>`; };
  function openViewer(s, list, idx, label, from, onSee, story, imm) {
    if (!list.length) return; let i = idx; let firstDraw = true;
    const m = sheet({ title: '', body: '<div class="gx-viewer"></div>', wide: false, label: label || 'Foto' });
    if (imm) m.el.classList.add('gx-imm');
    if (story) { m.el.classList.add('gx-story'); m.el.setAttribute('data-theme', 'noite'); }
    if (from && !reduceMotion()) m.el.style.animation = 'none';
    const draw = () => {
      const p = list[i]; onSee && onSee(p); const auto = story && !reduceMotion(); const bars = (story || list.length <= 12) ? `<div class="gx-vprog" aria-hidden="true">${list.map((_, k) => `<i class="${k < i ? 'on' : k === i ? (auto ? 'cur' : 'on') : ''}"><b></b></i>`).join('')}</div>` : '';
      const pauseBtn = auto ? (story ? `<button class="gx-sv-pause" data-vpause aria-pressed="${ST.pausa}" aria-label="${ST.pausa ? 'Continuar' : 'Pausar'}">${ST.pausa ? A.icon('play', 20) : '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'}</button>` : `<button class="btn btn-quiet btn-sm gx-vpause" data-vpause aria-pressed="${ST.pausa}">${ST.pausa ? 'Continuar' : 'Pausar'}</button>`) : '';
      A.$('h2', m.el).textContent = `${i + 1} de ${list.length}`;
      if (story) {
        const last = i === list.length - 1; const bot = `${gateOpen(s) ? `<div data-actions="${p.id}">${actionsBlock(s, p)}</div>` : ''}${capHtml(s, p)}<div class="gx-body" data-cmlink="${p.id}">${commentLink(s, p)}</div>`;
        A.$('.gx-viewer', m.el).innerHTML = `<div class="gx-sv"><div class="gx-sv-blur" aria-hidden="true">${VIDSRC.has(p.src) ? '' : `<img src="${p.src}" alt="">`}</div><div class="gx-sv-media"><span class="gx-ph" style="--box:${boxOf(p)};aspect-ratio:var(--box);width:100%;max-height:100%">${fx(p.src, p.filtro, p.inten, altOf(s, p), 'ctl')}</span></div><button class="gx-sv-tap l" data-vn="-1" aria-label="Foto anterior" ${i === 0 ? 'disabled' : ''}></button><button class="gx-sv-tap r" data-vn="1" aria-label="${last ? 'Fechar histórias' : 'Próxima foto'}"></button><div class="gx-sv-top">${bars}<div class="gx-sv-hd">${postHeader(s, p, true)}${pauseBtn}</div>${storyEv(s)}</div><div class="gx-sv-bot">${bot}</div></div>`;
      } else {
        A.$('.gx-viewer', m.el).innerHTML = `${bars}${pauseBtn}${postHeader(s, p, true)}${viewerMedia(s, p, imm)}<div data-actions="${p.id}">${actionsBlock(s, p)}</div>${capHtml(s, p)}<div class="gx-body" data-cmlink="${p.id}">${commentLink(s, p)}</div><div class="flex between" style="margin-top:var(--space-3)"><button class="btn btn-line" data-vn="-1" ${i === 0 ? 'disabled' : ''}>${A.icon('chevleft', 18)} Anterior</button><button class="btn btn-line" data-vn="1" ${i === list.length - 1 ? 'disabled' : ''}>Próxima ${A.icon('chevron', 18)}</button></div>`;
      }
      fitCaps(m.el);
      if (firstDraw) { firstDraw = false; flip(from, A.$('.gx-viewer .gx-ph', m.el)); }
    };
    m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-vn]'); if (b) { if (story && +b.dataset.vn > 0 && i === list.length - 1) { A.$('[data-mclose]', m.el)?.click(); return; } i = Math.min(list.length - 1, Math.max(0, i + +b.dataset.vn)); draw(); if (!story) (A.$('[data-vn]:not([disabled])', m.el) || A.$('[data-mclose]', m.el)).focus(); } });
    m.el.addEventListener('keydown', (e) => { if (e.target.closest('input,textarea')) return; if (e.key === 'ArrowRight' && i < list.length - 1) { i++; draw(); } if (e.key === 'ArrowLeft' && i > 0) { i--; draw(); } });
    if (imm) { let x0 = null; m.el.addEventListener('pointerdown', (e) => { x0 = e.target.closest('button,a,input,textarea') ? null : e.clientX; }); m.el.addEventListener('pointerup', (e) => { if (x0 === null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 60) { const n = Math.min(list.length - 1, Math.max(0, i + (d < 0 ? 1 : -1))); if (n !== i) { i = n; draw(); } } }); }
    /* histórias: avança sozinho (5 s foto, 12 s vídeo), pausa ao segurar, ao interagir, ao ocultar a página e no botão; sem avanço com movimento reduzido */
    const ST = { pausa: false, seg: false, el: 0 };
    if (story && !reduceMotion()) {
      const bar = () => A.$('.gx-vprog i.cur b', m.el);
      const tick = setInterval(() => {
        if (!m.el.isConnected) return clearInterval(tick);
        if (ST.pausa || ST.seg || document.hidden || m.el.contains(document.activeElement) && /input|textarea/i.test(document.activeElement.tagName)) return;
        const dur = list[i].tipo === 'video' ? 12000 : 5000; ST.el += 100; const b = bar(); if (b) b.style.width = Math.min(100, (ST.el / dur) * 100) + '%';
        if (ST.el >= dur) { ST.el = 0; if (i < list.length - 1) { i++; draw(); } else { clearInterval(tick); A.$('[data-mclose]', m.el)?.click(); } }
      }, 100);
      const hold = (on) => (e) => { if (e.target.closest('button,a,input,textarea,[role=menuitem]') && !e.target.closest('.gx-sv-tap')) return; if (on) ST.t0 = Date.now(); ST.seg = on; };
      m.el.addEventListener('click', (e) => { const lg = ST.t0 && Date.now() - ST.t0 > 320; ST.t0 = 0; if (lg && e.target.closest('.gx-sv-tap')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
      m.el.addEventListener('pointerdown', hold(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => m.el.addEventListener(t, hold(false)));
      m.el.addEventListener('click', (e) => { if (e.target.closest('[data-vpause]')) { ST.pausa = !ST.pausa; draw(); A.$('[data-vpause]', m.el)?.focus(); } if (e.target.closest('[data-vn]')) ST.el = 0; });
      m.el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ST.el = 0; });
    }
    draw(); return m;
  }
  const DT = { t: 0, id: '', timer: 0 };
  A.acts['g-open'] = (el, ev) => {
    const s = curSlug(); const id = el.dataset.id; const l = listFor(s, el.dataset.ctx, el.dataset.extra);
    const open = () => openViewer(s, l, Math.max(0, l.findIndex((p) => p.id === id)), el.dataset.ctx === 'album' ? 'Álbum em tela grande' : 'Foto em tela grande', el, null, false, el.dataset.ctx === 'album');
    if (el.dataset.dbl === '1' && ev && ev.detail > 0) {
      const now = Date.now(); clearTimeout(DT.timer);
      if (DT.id === id && now - DT.t < 320) { DT.t = 0; DT.id = ''; const pop = A.$('.gx-pop', el); if (pop) { pop.classList.remove('on'); void pop.offsetWidth; pop.classList.add('on'); } if (!reacaoMinha(s, id)) setReaction(s, id, A.data.reacoes[0]); return; }
      DT.t = now; DT.id = id; DT.timer = setTimeout(open, 260); return;
    }
    open();
  };

  /* ---------------------------------------------------------------- fila de envio (simulada, persistente) */
  const pend = (s) => uploads(s).filter((u) => ['fila', 'enviando', 'falhou'].includes(u.status));
  const qLabel = (u, off) => ({ fila: off ? 'Na fila · sem sinal' : 'Na fila', enviando: 'Enviando…', enviada: 'Enviada', aguardando: 'Aguardando aprovação', aprovada: 'Aprovada', falhou: 'Não enviou' }[u.status]);
  const qTone = (u) => ({ fila: 'warn', enviando: 'warn', enviada: 'ok', aguardando: 'acc', aprovada: 'ok', falhou: 'bad' }[u.status]);
  const qPillTxt = (s) => { const n = pend(s).length; const off = get(s, 'offline', false); return off ? (n ? `Sem sinal · ${n} na fila` : 'Sem sinal') : n ? `${n} na fila` : 'Tudo enviado'; };
  const qpill = (s) => { if (!sess(s)) return ''; const n = pend(s).length, off = get(s, 'offline', false); if (!n && !off) return ''; return `<a class="gx-pill ${off ? 'off' : ''}" href="${B(s)}/fila" data-q-badge><i aria-hidden="true"></i><span>${qPillTxt(s)}</span></a>`; };
  const offBar = (s) => (get(s, 'offline', false) && sess(s) ? `<div class="gx-off" role="status">${A.icon('wifioff', 20)}<span>Sem sinal por aqui. Pode continuar: as fotos ficam no celular e sobem sozinhas.</span></div>` : '');
  const markMissao = (s, m) => upd(s, 'missoes', (o) => ({ ...o, [m]: true }), {});

  setInterval(() => {
    const now = Date.now(); let any = false;
    A.data.events.forEach((ev) => {
      const s = ev.slug; const up = get(s, 'uploads', []); const off = get(s, 'offline', false); let ch = false;
      if (up.length) {
        up.forEach((u) => {
          if (u.status === 'enviando' && off) { u.status = 'fila'; ch = true; }
          else if (u.status === 'enviando' && now - u.t >= 1500) { u.status = 'enviada'; u.t = now; ch = true; if (u.missao) markMissao(s, u.missao); }
          else if (u.status === 'enviada' && now - u.t >= 2000) { u.status = 'aguardando'; u.t = now; ch = true; }
        });
        if (!off && !up.some((u) => u.status === 'enviando')) {
          const nx = up.find((u) => u.status === 'fila');
          if (nx) { if (get(s, 'falhar', false)) { nx.status = 'falhou'; nx.motivo = 'O envio falhou (simulado).'; set(s, 'falhar', false); } else { nx.status = 'enviando'; nx.t = now; } ch = true; }
        }
        if (ch) { set(s, 'uploads', up); any = true; }
      }
      if (!off) { const cm = get(s, 'comentarios', {}); let c2 = false; Object.keys(cm).forEach((k) => cm[k].forEach((c) => { if (c.pend) { c.pend = false; c2 = true; } })); if (c2) set(s, 'comentarios', cm); }
    });
    if (any) refresh();
  }, 1000);

  const PROG = { fila: 0.1, enviando: 0.5, enviada: 0.82, aguardando: 1, aprovada: 1, falhou: 0.3 };
  const swap = (st, html) => {
    const ov = A.$('.val', st), os = A.$('.sun', st); const o = ov && os ? [ov.getAttribute('stroke-dashoffset'), os.getAttribute('cx'), os.getAttribute('cy')] : null;
    st.innerHTML = html; const nv = A.$('.val', st), ns = A.$('.sun', st); if (!o || !nv || !ns) return;
    const t = [nv.getAttribute('stroke-dashoffset'), ns.getAttribute('cx'), ns.getAttribute('cy')];
    nv.setAttribute('stroke-dashoffset', o[0]); ns.style.cx = o[1] + 'px'; ns.style.cy = o[2] + 'px'; void nv.getBoundingClientRect();
    nv.setAttribute('stroke-dashoffset', t[0]); ns.style.cx = t[1] + 'px'; ns.style.cy = t[2] + 'px';
  };
  const statusBlock = (s, u) => {
    const off = get(s, 'offline', false);
    if (!u) return '';
    const m = {
      fila: off ? ['Foto guardada no celular.', 'Sem sinal agora. Ela sobe quando o sinal voltar, com esta página aberta.'] : ['Foto na fila.', 'Já vai subir.'],
      enviando: ['Enviando a foto.', 'Mantenha esta tela aberta por alguns segundos.'],
      enviada: ['Enviada.', 'Os anfitriões revisam antes de ela entrar no álbum.'],
      aguardando: ['Aguardando aprovação.', 'Só você vê no feed até os anfitriões aprovarem.'],
      aprovada: ['Aprovada.', 'Já está no álbum. O telão escolhe sozinho o que mostrar.'],
      falhou: ['Não conseguimos enviar.', 'A foto continua guardada no celular.'],
    }[u.status];
    const lab = { fila: off ? 'Guardada, sem sinal' : 'Na fila', enviando: 'Enviando', enviada: 'Enviada', aguardando: 'Enviada, aguardando aprovação', aprovada: 'Aprovada', falhou: 'Não enviou' }[u.status];
    const pc = Math.round((PROG[u.status] || 0) * 100); const video = u.tipo === 'video';
    return `<div class="gx-stat"><div class="gx-stat-r"><span class="gx-stat-th">${fx(u.src, u.filtro, u.inten, video ? 'O vídeo que você enviou' : 'A foto que você enviou', 'cover')}</span><div><span class="gx-st">${lab}</span><h1 class="t-title" tabindex="-1">${video ? m[0].replace(/^Foto/, 'Vídeo') : m[0]}</h1><p class="muted">${video ? m[1].replace(/^Foto/, 'Vídeo') : m[1]}</p></div></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}" aria-label="${lab}"><i style="width:${pc}%"></i></div>${u.status === 'falhou' ? `<button class="btn btn-line" data-act="g-retry" data-id="${u.id}">${A.icon('refresh', 18)} Tentar de novo</button>` : ''}</div>`;
  };
  const rewardHtml = (s, u) => {
    const m = u.missao ? A.data.missions.find((x) => x.id === u.missao) : null; const done = mDone(s); const total = missionsOn().length; const nDone = Object.keys(done).length;
    return m ? `<div class="stack-2 gx-rw"><div class="flex"><span class="gx-roman big">${m.romano}</span><div class="grow"><div class="t-small">${done[m.id] ? 'Missão feita' : 'A missão vale quando a foto subir'}</div><b>${A.esc(m.titulo)}</b></div></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${nDone}" aria-label="Missões feitas"><i style="width:${(nDone / total) * 100}%"></i></div><span class="t-small">${nDone} de ${total} missões</span></div>` : `<div class="stack-2 gx-rw"><div class="gx-num">${A.pt(uploads(s).length)}</div><span class="t-small">${uploads(s).length === 1 ? 'Sua primeira foto desta festa' : 'fotos suas nesta festa'}</span></div>`;
  };
  function refresh() {
    const s = curSlug(); A.$$('[data-q-badge] span').forEach((e) => (e.textContent = qPillTxt(s)));
    const h = location.hash; const st = A.$('#gx-status');
    if (st) { const id = (h.match(/id=([^&]+)/) || [])[1]; const u = uploads(s).find((x) => x.id === id); swap(st, statusBlock(s, u)); const rw = A.$('#gx-reward'); if (rw && u) rw.innerHTML = rewardHtml(s, u); }
    if (/^#\/g\/[^/?]+\/(fila|minhas)/.test(h) && !A.$('.modal')) rerender();
  }
  A.acts['g-retry'] = (el) => { const s = curSlug(); if (get(s, 'offline', false)) { toast('Ainda sem sinal. Tentamos de novo assim que voltar.'); return; } upd(s, 'uploads', (l) => l.map((u) => (u.id === el.dataset.id || el.dataset.id === 'all' ? (u.status === 'falhou' ? { ...u, status: 'fila' } : u) : u)), []); refresh(); toast('Tentando enviar de novo.'); };
  A.acts['g-retry-all'] = (el) => { A.acts['g-retry']({ dataset: { id: 'all' } }); };
  A.acts['g-descartar-fila'] = (el) => confirm({ title: 'Tirar da fila?', body: '<p>A foto guardada no celular é apagada e não será enviada. Isso não dá para desfazer.</p>', confirm: 'Apagar foto', danger: true }).then((ok) => { if (!ok) return; const s = curSlug(); dropMedia([el.dataset.id]); upd(s, 'uploads', (l) => l.filter((u) => u.id !== el.dataset.id), []); rerender(); toast('Foto apagada da fila.'); });
  A.acts['g-offline'] = (el) => { A.$('.modal [data-mclose]')?.click(); const s = curSlug(); const on = el.getAttribute('aria-checked') !== 'true'; set(s, 'offline', on); rerender(); toast(on ? 'Simulando sem sinal.' : 'Sinal de volta. A fila volta a enviar.'); };
  A.acts['g-falhar-cm'] = (el) => { const s = curSlug(); set(s, 'falharCm', el.getAttribute('aria-checked') !== 'true'); rerender(); };
  A.acts['g-falhar-rx'] = (el) => { const s = curSlug(); set(s, 'falharRx', el.getAttribute('aria-checked') !== 'true'); rerender(); };
  A.acts['g-falhar'] = (el) => { const s = curSlug(); const on = el.getAttribute('aria-checked') !== 'true'; set(s, 'falhar', on); rerender(); };

  /* ---------------------------------------------------------------- casca e blocos comuns */
  const dnav = (s, active) => `<nav class="gx-dnav" aria-label="Navegação do convidado"><a href="${B(s)}/explorar" ${active === 'explorar' ? 'aria-current="page"' : ''}>Explorar</a><a href="${B(s)}/missoes" ${active === 'missoes' ? 'aria-current="page"' : ''}>Missões</a><a href="${B(s)}/perfil" ${active === 'perfil' ? 'aria-current="page"' : ''}>Perfil</a></nav>`;
  const head = (s, { title, back, right = '', desk = false, active = '' }) => `<a class="skip" href="#main" data-act="skip">Pular para o conteúdo</a><header class="gx-top ${back ? '' : 'nob'}">${back ? `<a class="gx-back" href="${back}" aria-label="Voltar">${A.icon('back', 22)}</a>` : ''}<h1 title="${A.esc(title)}">${A.esc(title)}</h1>${desk ? dnav(s, active) : ''}${right}${qpill(s)}${desk ? `<a class="btn btn-accent btn-sm gx-dcta" href="${B(s)}/camera">${A.icon('camera', 18)} Tirar foto</a>` : ''}</header>${offBar(s)}`;
  const page = (ctx, { title, active = 'explorar', body, nav = true, back, right, bare = false, hideHead = false, desk = false }) => {
    const s = ctx.params.slug || 'marina-rafael';
    const top = bare ? '' : hideHead ? '' : head(s, { title, back, right, desk, active });
    const html = A.guestShell({ ...ctx, params: { ...ctx.params, slug: s } }, { active, body, nav, top });
    return { title, html: desk ? html.replace('class="guest-stage"', 'class="guest-stage gx-stage"') : html };
  };
  const stateScreen = ({ title, body, cta = '', link = '', tag = 'h1', pad = true }) => `<div class="gx-state ${pad ? 'gx-pad' : ''}"><span class="gx-state-art">${A.mascot(132, 'mascote')}</span><${tag} class="t-title" tabindex="-1">${A.esc(title)}</${tag}><p class="muted">${body}</p>${cta}${link}</div>`;
  const capaDe = (ev) => ev.capa || (ev.capaDemo ? A.capa(ev.id, ev.cor, ev.cor2) : '');
  const cover = (ev, inner) => {
    const src = capaDe(ev); const fam = (A.hero && ev.capa) ? A.hero.getCfg(ev.id).familia : 'imersivo';
    if (src && fam !== 'imersivo') return `<div class="gx-cover gx-fam" data-fam="${fam}"><div class="gx-fam-ph"><img src="${src}" alt="" aria-hidden="true" style="${A.hero.fotoStyle(ev.id)}"></div><div class="gx-ci">${inner}</div></div>`;
    if (!src) return `<div class="gx-cover"><div class="gx-mono" aria-hidden="true"><span class="monogram">${A.esc(ev.iniciais)}</span><i></i></div><div class="gx-ci">${inner}</div></div>`;
    A.after((root) => A.aplicarVeu(A.$('.gx-cv', root), src, { de: 0.38 }));
    return `<div class="gx-cover gx-cv" data-theme="noite" style="--veu-a:${A.veu.seguro}"><img class="gx-cv-img" src="${src}" alt="" aria-hidden="true"><span class="gx-cv-blur" aria-hidden="true"></span><span class="gx-cv-veu" aria-hidden="true"></span><div class="gx-ci">${inner}${ev.capa ? '' : '<p class="gx-note gx-cv-cred">Capa de demonstração: ilustração gerada pelo protótipo, não é uma fotografia.</p>'}</div></div>`;
  };
  const quandoLinhas = (ev, w) => {
    const data = w.semData ? 'Data a definir' : w.date;
    const det = [w.semData ? '' : ev.hora, ev.local || 'Local a definir'].filter(Boolean).join(' · ');
    return `<div class="gx-when"><span>${A.esc(data)}</span><span>${A.esc(det)}</span></div>`;
  };
  const noSession = (ctx, ev) => page(ctx, { title: 'Falta você entrar', nav: false, back: null, hideHead: true, body: stateScreen({ title: 'Falta você entrar', body: 'Para mandar fotos e ver o álbum, diga seu primeiro nome e aceite o uso das fotos. Leva dez segundos.', cta: `<a class="btn btn-accent" href="${B(ev.slug)}?passo=nome">Entrar na festa</a>` }) });
  function codeForm(ctx, label = 'Código ou link da festa') {
    return `<form data-submit="g-codigo" class="stack" novalidate>${A.field({ name: 'codigo', label, required: true, placeholder: 'marina-rafael', extra: 'maxlength="120" autocomplete="off" autocapitalize="off"' })}<button class="btn btn-primary" type="submit">Entrar</button></form>`;
  }
  const extractSlug = (v) => { v = String(v || '').trim().toLowerCase(); const m = v.match(/\/(?:e|g|p)\/([a-z0-9-]+)/); const c = m ? m[1] : v.replace(/^https?:\/\//, '').replace(/^(www\.)?albora\.app\//, '').split(/[/?#]/)[0]; return c.replace(/[^a-z0-9-]/g, ''); };
  A.acts['g-codigo'] = (form) => {
    const out = A.validate(form, { codigo: (v) => (evOf(extractSlug(v)) || extractSlug(v) === 'lu-40-velho' ? '' : 'Esse código não abre nenhuma festa. Confira de novo: às vezes é um zero no lugar do O.') });
    if (!out) return; A.go(B(extractSlug(out.codigo)));
  };
  function notice(ctx, r) {
    const s = ctx.params.slug; const ev = r.ev; let o;
    const digitar = (l) => `<details class="gx-det ds-fold b-baixo" style="width:100%;text-align:left"><summary>${l}</summary><div class="ds-fold-b" style="padding-top:8px">${codeForm(ctx)}</div></details>`;
    if (r.estado === 'desconhecido') o = { title: 'Não achamos essa festa', body: 'O código pode ter uma letra trocada, ou o link veio incompleto. O QR da mesa abre direto.', cta: `<a class="btn btn-accent" href="#/g/scan">${A.icon('qr', 18)} Escanear o QR</a>`, link: digitar('Prefiro digitar o código') };
    if (r.estado === 'rotacionado') o = { title: 'Esse QR foi trocado', body: 'Os anfitriões geraram um QR novo. Escaneie o da mesa, ou digite o código impresso nele.', cta: `<a class="btn btn-accent" href="#/g/scan">${A.icon('qr', 18)} Escanear o QR</a>`, link: digitar('Digitar o código da mesa') };
    if (r.estado === 'nao_comecou') { const w = A.when(ev.id); o = { title: 'Ainda não começou', body: w.semData ? `${A.esc(ev.nome)} ainda não tem data definida. Guarde este QR: ele continua valendo quando a data sair.` : `${A.esc(ev.nome)} abre ${A.esc(w.date)}, às ${A.esc(ev.hora)}. ${A.esc(w.label)}. Volte pelo mesmo QR nesse dia.`, cta: `<a class="btn btn-accent" href="#/g/p/${s}">Ver a página da festa</a>` }; }
    if (r.estado === 'encerrado') o = { title: 'Essa festa já foi', body: 'O envio de fotos ficou aberto por 48 horas depois do fim. Se você participou, suas fotos chegam por um link pessoal que os anfitriões enviam.', cta: `<a class="btn btn-accent" href="#/g/entrega/tk-ana-8f3k">Abrir um link de entrega de exemplo</a>`, link: `<a class="link" href="#/g/p/${s}">Ver a página da festa</a>` };
    const out = page(ctx, { title: o.title, nav: false, bare: true, body: stateScreen(o) });
    if (!ev) A.applyEvent(null);
    return out;
  }
  const guard = (ctx, needSession = true) => { const r = resolve(ctx.params.slug); if (r.estado !== 'aberto') return notice(ctx, r); if (needSession && !sess(ctx.params.slug)) return noSession(ctx, r.ev); return null; };

  /* ---------------------------------------------------------------- 1. entrada: capa -> nome + consentimento -> câmera */
  A.route('/g/scan', (ctx) => {
    ctx.params.slug = 'marina-rafael';
    if (ctx.q.codigo) { const sl = extractSlug(ctx.q.codigo); if (evOf(sl) || sl === 'lu-40-velho') { setTimeout(() => A.go(B(sl)), 0); return page(ctx, { title: 'Abrindo a festa', nav: false, back: '#/', body: `<div class="gx-pad">${A.skel(3, 40)}</div>` }); } }
    const bad = ctx.q.codigo ? `<div class="banner bad" role="alert">${A.icon('warn', 20)}<span>Esse código não abre nenhuma festa. Confira de novo: às vezes é um zero no lugar do O.</span></div>` : '';
    return page(ctx, { title: 'Entrar na festa', nav: false, back: '#/', body: `<div class="gx-pad stack">${bad}<div class="gx-scan" role="img" aria-label="Visor de leitura de QR, simulado"><i aria-hidden="true"></i><span style="position:relative;padding:0 24px;font-size:14px">Simulado: este protótipo não abre a câmera.<br>No celular, o visor lê o QR da mesa.</span></div><button class="btn btn-accent" data-act="g-scan-sim">${A.icon('qr', 18)} Simular leitura do QR</button><details class="gx-det ds-fold b-baixo" open><summary>Prefiro digitar o código</summary><div class="ds-fold-b" style="padding-top:8px">${codeForm(ctx)}</div></details><p class="gx-note">Sem câmera, ou se o navegador não deixar escanear, o código impresso no QR resolve do mesmo jeito.</p></div>` });
  });
  A.acts['g-scan-sim'] = () => { toast('QR lido (simulado).'); A.go(B('marina-rafael')); };

  A.route('/g/entrega/:token', (ctx) => {
    ctx.params.slug = 'marina-rafael'; const t = ctx.params.token; const ev = evOf('marina-rafael');
    const kind = GX.entrega[t] || (t.startsWith('meu-') ? 'meu' : 'invalido');
    let body;
    if (kind === 'expirado') body = stateScreen({ title: 'Este link de fotos expirou', body: 'Links de entrega valem por 60 dias. Peça um novo a quem organizou a festa; o contato está no convite.', cta: '<button class="btn btn-accent" data-act="g-pedir-link">Pedir um link novo</button>', tag: 'h2', pad: false });
    else if (kind === 'invalido') body = stateScreen({ title: 'Esse link não abre fotos', body: 'Pode ter sido copiado incompleto. Abra de novo a mensagem original ou peça outro link aos anfitriões.', cta: '<button class="btn btn-accent" data-act="g-pedir-link">Pedir um link novo</button>', tag: 'h2', pad: false });
    else {
      const own = kind === 'meu' ? uploads('marina-rafael').filter((u) => ['aguardando', 'aprovada', 'enviada'].includes(u.status)).map((u) => ownToPhoto('marina-rafael', u)) : [];
      const base = kind === 'ok' ? pool().slice(0, 9).map(asPhoto) : [];
      const l = kind === 'vazio' ? [] : [...own, ...base];
      body = l.length ? `<div class="stack"><div class="gx-slim" style="margin-inline:0"><span class="gx-slim-av" aria-hidden="true">${capaDe(ev) ? `<img src="${capaDe(ev)}" alt="">` : A.esc(ev.iniciais || '')}</span><div class="gx-slim-tx"><b>${A.esc(ev.nome)}</b><span>${plural(l.length, 'foto', 'fotos')} suas</span></div></div><p class="gx-priv">${A.icon('lock', 18)}<span>Este link é só seu: quem tiver o endereço abre as fotos, então não compartilhe.</span></p><div class="gx-pgrid">${l.map((p) => `<button class="gx-tile" data-act="g-entrega-foto" data-id="${p.id}" aria-label="Abrir ${A.esc('foto ' + p.momento.toLowerCase())}">${fx(p.src, p.filtro, p.inten, '', 'cover')}</button>`).join('')}</div><button class="btn btn-accent btn-block" data-act="g-baixar" data-n="${l.length}" data-v="${l.filter((p) => p.tipo === 'video').length}">${A.icon('download', 18)} Baixar tudo (${l.length})</button><p class="gx-note">Simulado: na versão real vem um arquivo .zip com as fotos em alta qualidade, sem localização, e os vídeos como foram gravados.</p></div>`
        : A.emptyState({ title: 'Nenhuma foto por aqui', body: 'As fotos da sua sessão aparecem aqui quando os anfitriões publicarem o álbum.' });
    }
    return page(ctx, { title: kind === 'meu' || kind === 'ok' ? 'Suas fotos' : 'Entrega de fotos', nav: false, back: kind === 'meu' ? B('marina-rafael') + '/perfil' : '#/', body: `<div class="gx-pad">${body}</div>` });
  });
  A.acts['g-pedir-link'] = () => toast('Na versão real, o pedido iria por mensagem aos anfitriões, que geram um link novo (simulado).');
  A.acts['g-baixar'] = (el) => toast(`Baixaria ${+el.dataset.n - +(el.dataset.v || 0)} foto(s)${+el.dataset.v ? ` e ${el.dataset.v} vídeo(s)` : ''} em .zip (simulado).`);
  A.acts['g-entrega-foto'] = (el) => { const p = photoById('marina-rafael', el.dataset.id); const m = sheet({ title: 'Sua foto', body: `<div class="stack">${phHtml('marina-rafael', { ...p, ratio: p.ratio || 'p' })}<button class="btn btn-primary" data-act="g-baixar" data-n="1">${A.icon('download', 18)} Baixar esta foto</button></div>` }); return m; };

  A.route('/g/p/:slug', (ctx) => {
    const r = resolve(ctx.params.slug); const ev = r.ev;
    if (r.estado === 'desconhecido' || r.estado === 'rotacionado') return notice(ctx, { estado: 'desconhecido' });
    const w = A.when(ev.id); const n = ev.id === 'e1' ? A.data.photos.filter((p) => p.status === 'aprovada').length : ev.id === 'e2' ? 212 : 0; const people = ev.id === 'e1' ? 31 : ev.id === 'e2' ? 47 : 0;
    const lineTxt = r.estado === 'nao_comecou' ? (w.semData ? 'A data ainda não foi definida. Quem organiza avisa você.' : `Começa ${w.date}. ${w.label}.`) : r.estado === 'encerrado' ? `Álbum encerrado. ${plural(n, 'foto', 'fotos')} de ${plural(people, 'pessoa', 'pessoas')}.` : n ? `${plural(n, 'foto', 'fotos')} de ${plural(people, 'pessoa', 'pessoas')} até agora.` : 'A festa ainda não tem fotos.';
    const cta = r.estado === 'aberto' ? `<a class="btn btn-accent btn-lg btn-block" href="${B(ev.slug)}">Entrar na festa</a>` : r.estado === 'nao_comecou' ? '' : `<a class="btn btn-accent btn-lg btn-block" href="#/g/entrega/tk-ana-8f3k">Tenho um link de fotos</a>`;
    return page(ctx, { title: ev.nome, nav: false, bare: true, body: cover(ev, `<h1 class="gx-ev">${A.esc(ev.nome)}</h1>${quandoLinhas(ev, w)}<p class="muted">${A.esc(lineTxt)}</p><div class="gx-cta">${cta}<p class="gx-note">As fotos ficam só para quem estava lá: esta página não mostra fotos de convidados.</p><a class="link" href="#/h/novo/1" style="align-self:center">Quero criar o álbum da minha festa</a></div>`) });
  });

  A.route('/g/:slug', (ctx) => {
    const s = ctx.params.slug; const r = resolve(s); if (r.estado !== 'aberto') return notice(ctx, r); const ev = r.ev;
    if (sess(s) && ctx.q.passo !== 'nome') { setTimeout(() => A.go(`${B(s)}/explorar`), 0); return page(ctx, { title: ev.nome, nav: false, bare: true, body: '<div class="gx-pad">' + A.skel(3, 40) + '</div>' }); }
    const w = A.when(ev.id);
    if (ctx.q.passo === 'recusa') return page(ctx, { title: 'Tudo bem', nav: false, back: `${B(s)}?passo=nome`, body: `<div class="gx-pad stack"><h2 class="t-display">Tudo bem.</h2><p class="t-lead">Sem aceitar o uso das fotos, não dá para mandar fotos nem aparecer no álbum. Esta etapa não cria uma participação na festa.</p><a class="btn btn-accent" href="${B(s)}?passo=nome">Mudei de ideia, quero entrar</a><a class="btn btn-line" href="#/g/p/${s}">Ver só a página pública da festa</a></div>` });
    if (ctx.q.passo === 'nome') {
      const t = GX.termo;
      return page(ctx, { title: 'Quase lá', nav: false, back: B(s), body: `<form data-submit="g-entrar" data-slug="${s}" class="gx-pad stack gx-sign" novalidate><div class="stack-2"><span class="gx-wel"><span class="gx-wel-av" aria-hidden="true">${ev.capa ? `<img src="${A.esc(ev.capa)}" alt="" style="${A.hero ? A.hero.fotoStyle(ev.id) : ''}">` : A.esc(ev.iniciais)}</span><span class="gx-eyebrow">${A.esc(ev.nome)}</span></span><h2 class="t-display">Como você assina?</h2><p class="muted">Só o primeiro nome. Sem senha, sem e-mail.</p></div><div class="field"><label for="gx-nm">Seu primeiro nome</label><input class="input input-sign" id="gx-nm" name="nome" required aria-required="true" aria-describedby="gx-nm-e" placeholder="Tio João" maxlength="24" autocomplete="given-name" autofocus><span class="err" id="gx-nm-e" role="alert"></span></div><div class="field"><label class="gx-check"><input type="checkbox" name="consent" aria-describedby="gx-cs-e"><span>Aceito que minhas fotos apareçam no álbum e no telão desta festa. Posso gerenciar minhas fotos e revogar esta autorização em Perfil.</span></label><span class="err" id="gx-cs-e" role="alert"></span></div><p class="gx-note">Demonstração: use um nome fictício. O aceite fica somente neste navegador. Termo de exemplo, versão ${t.versao}, de ${t.data}. <button type="button" class="link" data-act="g-termo" style="font-size:var(--fs-xs);min-height:44px">Ler o termo</button></p><div class="stack-2 gx-submit"><button class="btn btn-accent btn-lg" type="submit">Entrar e tirar a primeira foto</button><a class="btn btn-quiet" href="${B(s)}?passo=recusa">Prefiro não</a><a class="gx-rec-l" href="${B(s)}/recuperar">Já entrou antes? Recuperar minhas fotos</a></div></form>` });
    }
    return page(ctx, { title: ev.nome, nav: false, bare: true, body: cover(ev, `<p class="gx-lead">Você foi convidado para</p><h1 class="gx-ev">${A.esc(ev.nome)}</h1>${quandoLinhas(ev, w)}<div class="gx-cta"><a class="btn btn-accent btn-lg btn-block" href="${B(s)}?passo=nome">Entrar na festa</a><p class="gx-note">Sem app, sem cadastro, sem senha. É só chegar.</p><a class="gx-rec-l" href="${B(s)}/recuperar">Já entrou antes? Recuperar minhas fotos</a></div>`) });
  });
  A.acts['g-termo'] = () => { const s = curSlug(); const t = GX.termo; sheet({ title: 'Uso das suas fotos', body: `<div class="stack"><ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:var(--space-3)">${t.itens.map((i) => `<li>${A.esc(i)}</li>`).join('')}</ul><p class="gx-note">Termo versão ${t.versao}, de ${t.data}. Neste protótipo, versão, data e hora ficam neste navegador. Este texto demonstra o fluxo; o termo definitivo depende de validação jurídica e operacional.</p></div>`, actions: [{ label: 'Entendi', variant: 'btn-primary' }] }); };
  A.acts['g-entrar'] = (form) => {
    const s = form.dataset.slug;
    const out = A.validate(form, { nome: (v) => (v.length < 2 ? 'Use pelo menos 2 letras.' : v.length > 24 ? 'Use até 24 letras.' : ''), consent: (v) => (v ? '' : 'Para entrar, aceite o uso das fotos. Se preferir não aceitar, toque em Prefiro não.') });
    if (!out) return;
    set(s, 'sessao', { id: 'me', nome: out.nome, consent: { versao: GX.termo.versao, em: new Date().toISOString() }, entrou: Date.now() });
    toast(`Tudo certo, ${out.nome}. Vamos à primeira foto.`); A.go(`${B(s)}/camera`);
  };

  /* ---------------------------------------------------------------- 2. câmera: captura, editor, publicar, confirmação */
  const G = { draft: null, cdraft: {} };
  const readImg = (file) => new Promise((ok, no) => {
    const fr = new FileReader(); fr.onerror = no;
    fr.onload = () => { const im = new Image(); im.onerror = no; im.onload = () => { const M = 900, k = Math.min(1, M / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok({ src: c.toDataURL('image/jpeg', 0.72), ar: `${c.width}/${c.height}` }); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
  const missionsOn = () => A.data.missions.filter((m) => m.on);
  const mDone = (s) => get(s, 'missoes', {});
  const newDraft = (s, q, o) => ({ src: o.src, ar: o.ar || '4/5', filtro: o.tipo === 'video' ? 'original' : GX.recomendado[s] || 'original', inten: 100, legenda: '', missao: q.missao || null, momento: null, fonte: o.fonte, tipo: o.tipo || 'foto', blob: o.blob || null });
  const VMAX = 30; const VMAXB = 60 * 1024 * 1024;
  const readVid = (file) => new Promise((ok, no) => {
    const url = URL.createObjectURL(file); const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => { VIDSRC.add(url); ok({ src: url, ar: v.videoWidth && v.videoHeight ? `${v.videoWidth}/${v.videoHeight}` : '9/16', tipo: 'video', blob: file }); };
    v.onerror = () => { URL.revokeObjectURL(url); no(new Error('tipo')); }; v.src = url;
  });

  const CAM = { stream: null, facing: 'environment', failed: false, mode: 'foto', rec: null, tick: null, ar: '9/16', q: '', grid: false, timer: 0, counting: false, cdt: null };
  const camMsg = (t) => { const p = A.$('#gx-camMsg'); if (p) p.textContent = t; };
  const camStop = () => {
    if (CAM.rec) { CAM.rec.onstop = null; if (CAM.rec.state !== 'inactive') CAM.rec.stop(); CAM.rec = null; }
    clearInterval(CAM.tick); const rt = A.$('#gx-rectime'); if (rt) rt.hidden = true; A.$('#gx-shut')?.classList.remove('rec');
    if (CAM.stream) { CAM.stream.getTracks().forEach((t) => t.stop()); CAM.stream = null; }
    const v = A.$('#gx-video'); if (v) { v.srcObject = null; v.hidden = true; }
    A.$('#gx-vf')?.classList.remove('on'); const f = A.$('#gx-flip'); if (f) f.hidden = true;
  };
  const camStart = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { CAM.failed = true; camMsg('Este navegador não liga a câmera aqui. O obturador abre a câmera do celular ou o seletor de arquivos.'); return false; }
    camStop();
    try { CAM.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: CAM.facing }, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: CAM.mode === 'video' }); }
    catch (e) { CAM.failed = true; camMsg(e.name === 'NotAllowedError' ? 'A câmera ou o microfone estão bloqueados neste navegador. Libere nas permissões do site ou use a Galeria.' : e.name === 'NotFoundError' ? 'Nenhuma câmera encontrada. Use a Galeria.' : 'Não consegui ligar a câmera. Use a Galeria.'); return false; }
    const v = A.$('#gx-video'); if (!v) { camStop(); return false; }
    const fm = CAM.stream.getVideoTracks()[0]?.getSettings().facingMode;
    v.classList.toggle('mir', (fm || 'user') === 'user'); v.srcObject = CAM.stream; v.hidden = false; await v.play().catch(() => {});
    A.$('#gx-vf').classList.add('on'); A.$('#gx-flip').hidden = false; return true;
  };
  const camShot = (s, q) => {
    const v = A.$('#gx-video'); if (!v || !v.videoWidth) return camMsg('A câmera ainda está abrindo. Tente de novo.');
    const k = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const src = c.toDataURL('image/jpeg', 0.72); camStop();
    G.draft = newDraft(s, { missao: q || null }, { src, ar: `${c.width}/${c.height}`, fonte: 'camera' }); A.go(`${B(s)}/camera/editar`);
  };
  const recStop = () => { if (CAM.rec && CAM.rec.state !== 'inactive') CAM.rec.stop(); };
  const recStart = (s, q) => {
    if (!window.MediaRecorder) return camMsg('Este navegador não grava vídeo aqui. Use a Galeria para enviar um vídeo.');
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
    const st = CAM.stream.getVideoTracks()[0].getSettings(); CAM.ar = st.width && st.height ? `${st.width}/${st.height}` : '9/16';
    const chunks = []; let r; try { r = new MediaRecorder(CAM.stream, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined); } catch { return camMsg('Não consegui iniciar a gravação neste navegador. Use a Galeria.'); }
    CAM.rec = r; r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      clearInterval(CAM.tick); CAM.rec = null; const blob = new Blob(chunks, { type: r.mimeType || mime || 'video/webm' }); const ar = CAM.ar; camStop();
      if (!blob.size) return camMsg('A gravação saiu vazia. Tente de novo.');
      if (blob.size > VMAXB) return camMsg('O vídeo passou de 60 MB. Grave um mais curto.');
      const src = URL.createObjectURL(blob); VIDSRC.add(src); G.draft = newDraft(s, { missao: q || null }, { src, ar, fonte: 'camera', tipo: 'video', blob }); A.go(`${B(s)}/camera/editar`);
    };
    r.start(1000); const t0 = Date.now(); A.$('#gx-shut')?.classList.add('rec'); const rt = A.$('#gx-rectime'); if (rt) rt.hidden = false;
    const upd2 = () => { const t = Math.floor((Date.now() - t0) / 1000); if (rt) rt.textContent = `● ${t}s de ${VMAX}s`; if (t >= VMAX) recStop(); };
    upd2(); CAM.tick = setInterval(upd2, 500); camMsg('Gravando. Toque no obturador para parar.');
  };
  A.acts['g-shutter'] = async (el) => {
    if (CAM.counting) { clearInterval(CAM.cdt); CAM.counting = false; cdHide(); return; }
    if (CAM.rec) return recStop();
    if (CAM.timer && CAM.stream) return countdown(el.dataset.q);
    if (CAM.stream && CAM.mode === 'video') return recStart(curSlug(), el.dataset.q);
    if (CAM.stream) return camShot(curSlug(), el.dataset.q);
    if (CAM.failed) return A.$('#gx-cap')?.click();
    const unsupported = !navigator.mediaDevices?.getUserMedia || !window.isSecureContext;
    await camStart(); if (unsupported) A.$('#gx-cap')?.click();
  };
  A.acts['g-t-grade'] = (el) => { CAM.grid = !CAM.grid; el.setAttribute('aria-pressed', String(CAM.grid)); const g = A.$('#gx-gridov'); if (g) g.hidden = !CAM.grid; };
  A.acts['g-t-timer'] = (el) => { CAM.timer = CAM.timer === 0 ? 3 : CAM.timer === 3 ? 10 : 0; el.setAttribute('aria-pressed', String(CAM.timer > 0)); const t = A.$('#gx-tt'); if (t) t.textContent = CAM.timer ? CAM.timer + ' s' : 'Timer'; };
  const cdHide = () => { const c = A.$('#gx-count'); if (c) { c.hidden = true; c.textContent = ''; } };
  const countdown = (q) => {
    let n = CAM.timer; CAM.counting = true; const c = A.$('#gx-count'); const show = () => { if (c) { c.hidden = false; c.textContent = String(n); } }; show();
    CAM.cdt = setInterval(() => { n--; if (n > 0) return show(); clearInterval(CAM.cdt); CAM.counting = false; cdHide(); if (CAM.mode === 'video') recStart(curSlug(), q); else camShot(curSlug(), q); }, 1000);
  };
  A.acts['g-flip'] = async () => { if (CAM.rec) return; CAM.facing = CAM.facing === 'user' ? 'environment' : 'user'; if (CAM.stream) await camStart(); else camMsg(CAM.facing === 'user' ? 'Câmera frontal escolhida. Toque no obturador para ligar.' : 'Câmera traseira escolhida. Toque no obturador para ligar.'); };
  window.addEventListener('hashchange', () => { if (!/\/camera(\?|$)/.test(location.hash)) { clearInterval(CAM.cdt); CAM.counting = false; camStop(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && CAM.stream) { camStop(); camMsg('Câmera pausada. Toque no obturador para ligar de novo.'); } });

  A.route('/g/:slug/camera', (ctx) => {
    camStop(); CAM.failed = false; CAM.mode = 'foto';
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const off = get(s, 'offline', false);
    const m = ctx.q.missao ? A.data.missions.find((x) => x.id === ctx.q.missao) : null;
    const done = mDone(s); const pending = missionsOn().find((x) => !done[x.id]);
    const chips = `<button type="button" class="gx-mchip ${m ? 'acc' : ''}" data-act="g-pick-m" aria-haspopup="dialog" aria-label="${m ? 'Missão: ' + A.esc(m.titulo) + '. Trocar' : 'Escolher uma missão'}">${A.icon('target', 18)}<span class="gx-mchip-t">${m ? `${m.romano}. ${A.esc(m.titulo)}` : 'Missão'}</span>${A.icon('chevron', 14)}</button>`;
    const q = m ? m.id : '';
    return page(ctx, { title: 'Câmera', active: 'camera', nav: false, bare: true, body: `<div class="gx-cm2" data-theme="noite"><div class="gx-vf" id="gx-vf"><video id="gx-video" playsinline muted autoplay hidden></video><div class="gx-vf-m"><p id="gx-camMsg" role="status" aria-live="polite">Toque no obturador para ligar a câmera. Se ela não abrir, use a Galeria.</p><small>A localização da foto é removida antes do envio.</small></div><span class="gx-rectime" id="gx-rectime" aria-hidden="true" hidden></span></div><div class="gx-ctop"><a class="gx-cbtn" href="${B(s)}/explorar" aria-label="Fechar a câmera">${A.icon('x', 24)}</a><div class="gx-cmis">${chips}</div><button type="button" class="gx-cbtn gx-flip" id="gx-flip" data-act="g-flip" aria-label="Virar a câmera" hidden>${A.icon('refresh', 22)}</button></div><div class="gx-tools" role="group" aria-label="Ferramentas da câmera"><button type="button" class="gx-tool" data-act="g-flip"><span class="gx-tool-i">${A.icon('refresh', 22)}</span><span>Virar</span></button><button type="button" class="gx-tool" data-act="g-t-grade" aria-pressed="${CAM.grid}"><span class="gx-tool-i">${A.icon('grid', 22)}</span><span>Grade</span></button><button type="button" class="gx-tool" data-act="g-t-timer" aria-pressed="${CAM.timer > 0}"><span class="gx-tool-i">${A.icon('clock', 22)}</span><span id="gx-tt">${CAM.timer ? CAM.timer + ' s' : 'Timer'}</span></button></div><div class="gx-gridov" id="gx-gridov" aria-hidden="true" ${CAM.grid ? '' : 'hidden'}></div><div class="gx-count" id="gx-count" role="status" aria-live="assertive" hidden></div><div class="gx-cbot"><div class="gx-modes" role="group" aria-label="Tipo de captura"><button type="button" class="gx-mode" data-act="g-video" data-mode="foto" aria-pressed="true">Foto</button><button type="button" class="gx-mode" data-act="g-video" data-mode="video" aria-pressed="false">Vídeo</button></div><div class="gx-ctl"><label class="gx-side" title="Galeria">${A.icon('image', 24)}<span class="sr-only">Galeria</span><input type="file" accept="image/*,video/*" multiple data-change="g-file" data-q="${q}" aria-label="Escolher fotos ou vídeos da galeria (até 10)"></label><button type="button" class="gx-shut" id="gx-shut" data-act="g-shutter" data-q="${q}" aria-label="Ligar a câmera e tirar a foto"><span class="shutter big" aria-hidden="true"></span></button><input type="file" accept="image/*" capture="environment" id="gx-cap" data-change="g-file" data-q="${q}" hidden aria-hidden="true" tabindex="-1"><button type="button" class="gx-side" data-act="g-amostras" data-q="${q}" aria-label="Fotos de amostra do protótipo" title="Fotos de amostra">${A.icon('grid', 24)}</button></div></div></div>` });
  });
  A.acts['g-pick-m'] = () => {
    const s = curSlug(); const cur = new URLSearchParams((location.hash.split('?')[1] || '')).get('missao') || ''; const done = mDone(s);
    sheet({ title: 'Missão desta foto', body: `<div class="gx-opts"><button class="gx-opt" data-act="g-go-m" data-id="" aria-pressed="${!cur}">${A.icon('camera', 20)}<span class="grow">Foto livre</span></button>${missionsOn().map((m) => `<button class="gx-opt" data-act="g-go-m" data-id="${m.id}" aria-pressed="${cur === m.id}"><span class="gx-roman">${m.romano}</span><span class="grow">${A.esc(m.titulo)}</span>${done[m.id] ? '<span class="gx-badge acc">Feita</span>' : ''}</button>`).join('')}</div>` });
  };
  A.acts['g-go-m'] = (el) => { const s = curSlug(); A.$('.modal [data-mclose]')?.click(); A.go(`${B(s)}/camera${el.dataset.id ? '?missao=' + el.dataset.id : ''}`); };
  A.acts['g-amostras'] = (el) => {
    const s = curSlug(); const q = el.dataset.q || ''; const off = get(s, 'offline', false);
    const grid = Array.from({ length: 6 }, (_, i) => `<button class="gx-tile" data-act="g-amostra" data-seed="amostra-${s}-${i}" data-q="${q}" aria-label="Usar foto de amostra ${i + 1}">${A.img('amostra-' + s + '-' + i, 'p', '')}</button>`).join('');
    sheet({ title: 'Fotos de amostra', body: `<div class="stack"><p class="gx-note">Sem câmera aqui? Escolha uma ilustração. Só do protótipo.</p><div class="gx-amostras">${grid}</div><div class="flex between"><span class="gx-note">Só no protótipo</span><button class="chip" role="switch" aria-checked="${off}" data-act="g-offline" style="min-height:44px;border:1px solid var(--line);padding:0 var(--space-4)">${A.icon('wifioff', 16)} Simular sem sinal${off ? ': ligado' : ''}</button></div></div>` });
  };
  A.inputs['g-file'] = async (el) => {
    const s = curSlug(); const files = [...el.files].slice(0, 10); el.value = ''; if (!files.length) return; const q = { missao: el.dataset.q || null };
    try {
      const items = [];
      for (const f of files) {
        const vid = /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name);
        if (!vid && !/^image\//.test(f.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) throw new Error('tipo');
        if (vid && f.size > VMAXB) throw new Error('grande');
        items.push(vid ? await readVid(f) : await readImg(f));
      }
      if (items.length > 1) { let last; for (const it of items) last = await enqueue(s, newDraft(s, q, { ...it, fonte: 'arquivo' })); toast(`${items.length} itens na fila.`); return A.go(`${B(s)}/camera/enviada?id=${last}&n=${items.length}`); }
      G.draft = newDraft(s, q, { ...items[0], fonte: 'arquivo' }); A.go(`${B(s)}/camera/editar`);
    } catch (e) { toast(e.message === 'grande' ? 'Esse vídeo passa de 60 MB. Escolha um mais curto.' : e.message === 'salvar' ? 'Não consegui guardar no aparelho. Libere espaço e tente de novo.' : 'Não consegui abrir esse arquivo. Escolha uma imagem JPG ou PNG, ou um vídeo MP4 ou WebM.', { kind: 'bad' }); }
  };
  A.acts['g-amostra'] = (el) => { A.$('.modal [data-mclose]')?.click(); const s = curSlug(); G.draft = newDraft(s, { missao: el.dataset.q || null }, { src: A.photo(el.dataset.seed, 'p'), ar: '4/5', fonte: 'amostra' }); A.go(`${B(s)}/camera/editar`); };
  A.acts['g-video'] = async (el) => {
    if (CAM.rec) return; const want = el.dataset.mode || (CAM.mode === 'video' ? 'foto' : 'video'); if (want === CAM.mode) return; CAM.mode = want; const on = CAM.mode === 'video';
    A.$$('[data-act="g-video"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode ? b.dataset.mode === want : on))); const sh = A.$('#gx-shut'); if (sh) sh.setAttribute('aria-label', on ? 'Gravar vídeo' : 'Ligar a câmera e tirar a foto');
    camMsg(on ? `Modo vídeo: toque no obturador para gravar, até ${VMAX} segundos.` : 'Modo foto.'); if (CAM.stream || on) await camStart();
  };

  A.route('/g/:slug/camera/editar', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const d = G.draft;
    if (!d) return page(ctx, { title: 'Sua foto', active: 'camera', back: `${B(s)}/camera`, body: `<div class="gx-pad"><div class="empty">${A.icon('camera', 40)}<h2 class="t-title">Nenhuma foto escolhida</h2><p>Ao recarregar, a foto em edição se perde. Nada foi enviado.</p><a class="btn btn-accent" href="${B(s)}/camera">Voltar à câmera</a></div></div>` });
    const rec = GX.recomendado[s];
    const strip = d.tipo === 'video' ? '' : PRE.map((p) => `<button type="button" class="gx-pre" data-act="g-preset" data-id="${p.id}" aria-pressed="${d.filtro === p.id}"><span class="th">${fx(d.src, p.id, 100, '', 'cover')}</span>${p.nome}${p.id === rec ? '<span class="gx-badge acc">Recomendado</span>' : ''}</button>`).join('');
    const ms = missionsOn(); const done = mDone(s);
    const mo = ms.find((x) => x.id === d.missao); const fnome = (PRE.find((x) => x.id === d.filtro) || PRE[0]).nome; const video = d.tipo === 'video';
    return page(ctx, { title: video ? 'Novo vídeo' : 'Nova publicação', active: 'camera', nav: false, back: `${B(s)}/camera`, body: `<div class="gx-pad gx-ed"><div class="gx-ed-stage"><div class="gx-ph r-a" style="aspect-ratio:${d.ar}" id="gx-prev">${fx(d.src, d.filtro, d.inten, video ? 'Prévia do seu vídeo' : 'Prévia da sua foto com o filtro escolhido', 'ctl')}</div>${video ? '' : `<span class="gx-ed-tag">${A.icon('sparkle', 14)} ${A.esc(fnome)}${d.filtro === rec ? ' · recomendado' : ''}</span>`}${!video && d.filtro !== 'original' ? `<div class="gx-int"><label class="sr-only" for="gx-in">Intensidade do filtro</label><input class="gx-range" id="gx-in" type="range" min="0" max="100" value="${d.inten}" data-input="g-inten" aria-valuetext="${d.inten}%"><span id="gx-inv" aria-hidden="true">${d.inten}%</span></div>` : ''}</div>${video ? '<p class="gx-note">Vídeo enviado como gravado, sem filtro. A localização do arquivo não é lida pelo protótipo.</p>' : `<section aria-label="Filtros" class="gx-flt"><div class="gx-strip" role="group" aria-label="Filtros de cor">${strip}</div></section>`}<div class="gx-capr"><span class="gx-capr-th" aria-hidden="true">${fx(d.src, d.filtro, d.inten, '', 'cover')}</span><label class="sr-only" for="gx-lg">Legenda</label><textarea class="gx-lg" id="gx-lg" name="legenda" rows="2" maxlength="140" placeholder="Escreva uma legenda…" data-input="g-leg">${A.esc(d.legenda || '')}</textarea></div><div class="gx-ed-opts"><button type="button" class="gx-opill" data-act="g-ed-pickm" aria-haspopup="dialog">${A.icon('target', 18)}<span class="gx-opill-t">${mo ? `${mo.romano}. ${A.esc(mo.titulo)}` : 'Missão'}</span>${A.icon('chevron', 14)}</button><button type="button" class="gx-opill" data-act="g-ed-pickmo" aria-haspopup="dialog">${A.icon('clock', 18)}<span class="gx-opill-t">${d.momento ? A.esc(d.momento) : 'Momento'}</span>${A.icon('chevron', 14)}</button></div>${video ? '' : '<p class="gx-note gx-ed-n">Filtro no seu celular, sem IA.</p>'}</div><div class="gx-bar"><button class="btn btn-quiet" data-act="g-descartar">Descartar</button><button class="btn btn-accent" data-act="g-publicar">Publicar</button></div>` });
  });
  A.acts['g-preset'] = (el) => { G.draft.filtro = el.dataset.id; G.draft.inten = 100; rerender(); };
  A.inputs['g-inten'] = (el) => { G.draft.inten = +el.value; const o = A.$('#gx-prev .gx-fxo'); if (o) o.style.opacity = el.value / 100; A.$('#gx-inv').textContent = el.value + '%'; };
  A.inputs['g-leg'] = (el) => { G.draft.legenda = el.value; };
  A.acts['g-missao'] = (el) => { G.draft.missao = el.dataset.id || null; rerender(); };
  A.acts['g-momento'] = (el) => { G.draft.momento = G.draft.momento === el.dataset.id ? null : el.dataset.id; rerender(); };
  A.acts['g-ed-pickm'] = () => {
    const s = curSlug(); const d = G.draft; const done = mDone(s);
    sheet({ title: 'Missão desta foto', body: `<div class="gx-opts"><button class="gx-opt" data-act="g-ed-m" data-id="" aria-pressed="${!d.missao}"><span class="grow">Sem missão</span></button>${missionsOn().map((m) => `<button class="gx-opt" data-act="g-ed-m" data-id="${m.id}" aria-pressed="${d.missao === m.id}"><span class="gx-roman">${m.romano}</span><span class="grow">${A.esc(m.titulo)}</span>${done[m.id] ? '<span class="gx-badge acc">Feita</span>' : ''}</button>`).join('')}</div>` });
  };
  A.acts['g-ed-m'] = (el) => { A.$('.modal [data-mclose]')?.click(); G.draft.missao = el.dataset.id || null; rerender(); };
  A.acts['g-ed-pickmo'] = () => {
    const d = G.draft;
    sheet({ title: 'Momento da festa', body: `<div class="gx-opts"><button class="gx-opt" data-act="g-ed-mo" data-id="" aria-pressed="${!d.momento}"><span class="grow">Automático, pelo horário</span></button>${A.data.momentos.map((m) => `<button class="gx-opt" data-act="g-ed-mo" data-id="${m}" aria-pressed="${d.momento === m}"><span class="grow">${m}</span></button>`).join('')}</div>` });
  };
  A.acts['g-ed-mo'] = (el) => { A.$('.modal [data-mclose]')?.click(); G.draft.momento = el.dataset.id || null; rerender(); };
  A.acts['g-descartar'] = () => { const s = curSlug(); confirm({ title: 'Descartar esta foto?', body: '<p>Ela ainda não foi enviada. Se descartar, precisa tirar outra.</p>', confirm: 'Descartar', danger: true }).then((ok) => { if (ok) { G.draft = null; A.go(`${B(s)}/camera`); } }); };
  async function enqueue(s, d) {
    const id = 'u' + A.uid(); const video = d.tipo === 'video';
    let blob; try { blob = d.blob || await (await fetch(d.src)).blob(); await MEDIA.put(id, blob); } catch { throw new Error('salvar'); }
    const u = { id, mid: id, tipo: video ? 'video' : 'foto', ar: d.ar, filtro: video ? 'original' : d.filtro, inten: d.inten, legenda: d.legenda, missao: d.missao, momento: d.momento, ts: Date.now(), status: 'fila', t: Date.now(), n: uploads(s).length + 1 };
    upd(s, 'uploads', (l) => [...l, u], []);
    if (A.store.erro) { dropMedia([id]); upd(s, 'uploads', (l) => l.filter((x) => x.id !== id), []); throw new Error('salvar'); }
    mediaUrl(id, blob); return id;
  }
  A.acts['g-publicar'] = async (el) => {
    const s = curSlug(); const d = G.draft; if (!d || el.disabled) return; el.disabled = true; const first = !get(s, 'primeira', false);
    try { const id = await enqueue(s, d); set(s, 'primeira', true); G.draft = null; A.go(`${B(s)}/camera/enviada?id=${id}${first ? '&primeira=1' : ''}`); }
    catch { el.disabled = false; toast('Não consegui guardar a foto no aparelho, então ela não foi publicada. Libere espaço e tente de novo.', { kind: 'bad' }); }
  };

  A.route('/g/:slug/camera/enviada', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const u = uploads(s).find((x) => x.id === ctx.q.id); const n = +ctx.q.n || 1;
    if (!u) return page(ctx, { title: 'Foto enviada', active: 'camera', back: `${B(s)}/camera`, body: `<div class="gx-pad"><div class="empty">${A.icon('image', 40)}<h2 class="t-title">Essa foto não está mais por aqui</h2><p>Ela pode ter sido removida da fila.</p><a class="btn btn-accent" href="${B(s)}/camera">Tirar outra</a></div></div>` });
    const done = mDone(s);
    const next = missionsOn().find((x) => !done[x.id] && x.id !== u.missao);
    const first = !!ctx.q.primeira;
    const invite = first && !get(s, 'app', null) && get(s, 'conviteApp', '') !== 'dispensado' ? `<section class="gx-rule stack-2" aria-labelledby="gx-app-t"><h2 class="t-h" id="gx-app-t">Levar a festa no app</h2><p class="muted">Opcional. O app envia suas fotos mesmo com o celular bloqueado e guarda o álbum no aparelho.</p><div class="flex"><a class="btn btn-line" href="${B(s)}/app" style="flex:1">Ver como</a><button class="btn btn-quiet" data-act="g-dispensar-app" style="flex:1">Agora não</button></div></section>` : '';
    const hero = `<div class="gx-cel gx-sent" id="gx-cel"><span class="gx-sent-ph">${fx(u.src, u.filtro, u.inten, '', 'cover')}</span><span class="gx-sent-ck" aria-hidden="true">${A.icon('check', 22)}</span></div>`;
    const thumb = n > 1 ? `<p class="muted">${n} itens da galeria entraram na fila de uma vez.</p>` : '';
    const out = page(ctx, { title: n > 1 ? `${n} itens na fila` : u.tipo === 'video' ? 'Vídeo enviado' : 'Foto enviada', active: 'camera', nav: false, hideHead: true, body: `<div class="gx-pad gx-conf"><a class="gx-sent-x" href="${B(s)}/explorar" aria-label="Fechar e ver o feed">${A.icon('x', 22)}</a>${hero}<div id="gx-status" role="status" aria-live="polite">${statusBlock(s, u)}</div>${thumb}<div id="gx-reward">${rewardHtml(s, u)}</div><div class="stack-2"><a class="btn btn-accent" href="${B(s)}/explorar">Ver o feed</a><a class="btn btn-line" href="${next ? `${B(s)}/camera?missao=${next.id}` : `${B(s)}/camera`}">${next ? `Próxima: ${next.romano}. ${A.esc(next.titulo)}` : 'Tirar outra'}</a><a class="btn btn-quiet" href="${B(s)}/minhas">Ver minhas fotos</a>${next ? `<a class="btn btn-quiet" href="${B(s)}/camera">Tirar outra, sem missão</a>` : ''}</div>${invite}</div>` });
    out.after = (root) => A.celebrate(A.$('#gx-cel', root));
    return out;
  });
  A.acts['g-dispensar-app'] = () => { set(curSlug(), 'conviteApp', 'dispensado'); rerender(); };

  /* ---------------------------------------------------------------- 3. explorar: feed e stories, espelho antes do gate */
  const momentChips = (s) => { const f = get(s, 'fm', 'tudo'); const mk = (id, l) => `<button class="chip" data-act="g-fm" data-id="${id}" aria-pressed="${f === id}">${l}</button>`; return `<div class="gx-chips" role="group" aria-label="Filtrar por momento">${mk('tudo', 'Tudo')}${A.data.momentos.map((m) => mk(m, m)).join('')}${mk('minhas', 'Minhas')}</div>`; };
  A.acts['g-fm'] = (el) => { set(curSlug(), 'fm', el.dataset.id); rerender(); };
  /* trilho "Fotos recentes": miniaturas das últimas fotos da festa, com "Nova" nas que você ainda não abriu; o recado dos anfitriões tem lugar próprio acima */
  const RAILN = 12;
  const railList = (s) => allPhotos(s).slice(0, RAILN);
  const railSection = (s) => {
    const list = railList(s); const seen = get(s, 'vistosF', []); const fresh = (p) => !p.own && !seen.includes(p.id); const nNew = list.filter(fresh).length;
    const tiles = list.map((p, i) => { const a = authorOf(s, p.autor); const nv = fresh(p); const who = p.own ? 'Você' : a.primeiro; return `<li><button class="gx-rt${nv ? '' : ' seen'}" data-act="g-rail" data-i="${i}" aria-label="Foto de ${A.esc(p.own ? 'você' : a.primeiro)}, ${A.esc(ago(p))}, ${nv ? 'nova' : 'já vista'}">${fx(p.src, p.filtro, p.inten, '', 'cover')}${nv ? '<span class="nw" aria-hidden="true">Nova</span>' : ''}<span class="tg" aria-hidden="true">${A.esc(who)}</span></button></li>`; }).join('');
    return `<section class="gx-rail" data-rail aria-labelledby="gx-rail-t"><h2 class="sr-only" id="gx-rail-t">Fotos recentes${nNew ? `, ${plural(nNew, 'nova', 'novas')}` : ''}</h2><ul class="gx-rail-l" role="list"><li><a class="gx-rt add" href="${B(s)}/camera">${A.icon('camera', 24)}<span>Sua foto</span></a></li>${recadoTile(s)}${tiles}</ul></section>`;
  };
  const recadoTile = (s) => {
    const rec = GX.recado[s]; if (!rec) return ''; const lido = get(s, 'lido', false);
    const kind = rec.duracao ? `áudio de ${Math.floor(rec.duracao / 60)}:${String(rec.duracao % 60).padStart(2, '0')}` : 'mensagem em texto';
    return `<li><a class="gx-rt add rec${lido ? '' : ' new'}" href="${B(s)}/recado" aria-label="Recado de ${A.esc(anf(s))}, ${kind}, ${lido ? 'lido' : 'novo'}">${A.icon('mic', 24)}<span>Recado</span>${lido ? '' : '<span class="nw" aria-hidden="true">Novo</span>'}</a></li>`;
  };
  const railHtml = (s) => railSection(s);
  A.acts['g-rail'] = (el) => {
    const s = curSlug(); const l = railList(s); const m = openViewer(s, l, +el.dataset.i, 'Fotos recentes', el, (p) => { if (!p.own) upd(s, 'vistosF', (v) => (v.includes(p.id) ? v : [...v, p.id]), []); }, true);
    m.onClose = () => A.$$('[data-rail]').forEach((r) => { const x = r.querySelector('.gx-rail-l'); const left = x ? x.scrollLeft : 0; const t = document.createElement('div'); t.innerHTML = railSection(s); r.replaceWith(t.firstElementChild); const y = A.$('.gx-rail-l'); if (y) y.scrollLeft = left; });
  };
  const postHtml = (s, p) => { const a = authorOf(s, p.autor); return `<article class="gx-post" aria-label="Foto de ${A.esc(p.own ? 'você' : a.primeiro)}">${postHeader(s, p, false, true)}${postMedia(s, p)}<div data-actions="${p.id}">${actionsBlock(s, p)}</div>${capHtml(s, p)}<div class="gx-body" data-cmlink="${p.id}">${commentLink(s, p)}</div><div class="gx-body"><time class="gx-ts" datetime="${new Date(Date.now() - p.min * 60000).toISOString()}">${ago(p)}</time></div></article>`; };
  /* coluna lateral do desktop: momentos como filtro vertical, missões e convite para o telão */
  const asideHtml = (s) => {
    const all = allPhotos(s); const f = get(s, 'fm', 'tudo'); const ms = missionsOn(); const done = mDone(s); const nD = ms.filter((m) => done[m.id]).length; const cur = ms.find((m) => !done[m.id]);
    const mk = (id, l, n) => `<button data-act="g-fm" data-id="${id}" aria-pressed="${f === id}"><span>${l}</span><span class="c">${A.pt(n)}</span></button>`;
    return `<aside class="gx-aside" aria-label="Sobre a festa"><section aria-labelledby="gx-a1"><h2 id="gx-a1">Momentos</h2><div class="gx-mom" role="group" aria-label="Filtrar por momento">${mk('tudo', 'Tudo', all.length)}${A.data.momentos.map((m) => mk(m, A.esc(m), all.filter((p) => p.momento === m).length)).join('')}${mk('minhas', 'Minhas', all.filter((p) => p.own).length)}</div></section>${ms.length ? `<section aria-labelledby="gx-a2"><h2 id="gx-a2">Suas missões</h2><div class="gx-as-num"><b>${nD}</b><span class="muted">de ${ms.length} feitas</span></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${ms.length}" aria-valuenow="${nD}" aria-label="Missões feitas"><i style="width:${(nD / ms.length) * 100}%"></i></div>${cur ? `<a class="link" href="${B(s)}/camera?missao=${cur.id}">Fotografar: ${A.esc(cur.titulo)}</a>` : '<p class="muted">Você fez todas. As próximas fotos são livres.</p>'}</section>` : ''}<section aria-labelledby="gx-a3"><h2 id="gx-a3">No telão</h2><p class="muted">As fotos aprovadas passam no telão do salão. Olhe para lá: a sua pode estar na vez.</p><a class="link" href="#/t/display">Ver como o telão aparece</a><p class="gx-note" style="margin-top:var(--space-2)">Só no protótipo: abre o telão em tela cheia.</p></section></aside>`;
  };
  const famDe = (ev) => (A.hero && ev.capa ? A.hero.getCfg(ev.id).familia : 'imersivo');
  const feedHead = (s, kick = 'Álbum ao vivo', compact = false) => {
    const ev = evOf(s); const w = A.when(ev.id); const fam = famDe(ev); const src = capaDe(ev); const all = allPhotos(s); const people = new Set(all.map((p) => p.autor)).size;
    const ph = src ? `<div class="gx-fh-ph"><img src="${src}" alt="" aria-hidden="true" style="${ev.capa && A.hero ? A.hero.fotoStyle(ev.id) : ''}"></div>` : '';
    const mono = !src ? `<span class="gx-fh-mono" aria-hidden="true">${A.esc(ev.iniciais || '')}</span>` : '';
    const data = [w.semData ? '' : w.date, ev.local].filter(Boolean).join(' · ');
    if (compact) return `<header class="gx-slim"><span class="gx-slim-av" aria-hidden="true">${src ? `<img src="${src}" alt="" style="${ev.capa && A.hero ? A.hero.fotoStyle(ev.id) : ''}">` : A.esc(ev.iniciais || '')}</span><div class="gx-slim-tx"><b>${A.esc(ev.nome)}</b><span>${all.length ? `${plural(all.length, 'foto', 'fotos')} de ${plural(people, 'pessoa', 'pessoas')}` : 'Nenhuma foto ainda'}</span></div></header>`;
    return `<header class="gx-fh${compact ? ' gx-fh-c' : ''}" data-fam="${src ? fam : 'minimal'}">${ph}${mono}<span class="gx-fh-k">${kick}</span><h2>${A.esc(ev.nome)}</h2><div class="gx-fh-div" aria-hidden="true"><i></i><b></b><i></i></div>${data ? `<p class="gx-fh-d">${A.esc(data)}</p>` : ''}<p class="gx-fh-n">${all.length ? `${plural(all.length, 'foto', 'fotos')} de ${plural(people, 'pessoa', 'pessoas')}` : 'Nenhuma foto ainda'}</p></header>`;
  };
  const specialCard = (s, kind) => {
    const ev = evOf(s); const fam = famDe(ev);
    if (kind === 'missao') {
      const done = mDone(s); const cur = missionsOn().find((m) => !done[m.id]); if (!cur) return '';
      return `<aside class="gx-sp" data-fam="${fam}" aria-label="Missão para você"><span class="gx-sp-k">Missão</span><p class="gx-sp-t">${A.esc(cur.titulo)}</p><a class="link" href="${B(s)}/camera?missao=${cur.id}">Fotografar agora</a></aside>`;
    }
    const all = allPhotos(s); const people = new Set(all.map((p) => p.autor)).size;
    return `<aside class="gx-sp" data-fam="${fam}" aria-label="Resumo da festa"><span class="gx-sp-k">Até agora</span><p class="gx-sp-n">${A.pt(all.length)}</p><p class="gx-sp-t">fotos de ${plural(people, 'pessoa', 'pessoas')}</p></aside>`;
  };
  const feedPosts = (s, list, to, from = 0) => list.slice(from, to).map((p, k) => { const i = from + k; return postHtml(s, p) + (i === 1 ? specialCard(s, 'missao') : i === 4 ? specialCard(s, 'marco') : ''); }).join('');
  const SHOWN = 8;
  A.acts['g-gate-x'] = () => { const s = curSlug(); set(s, 'avisoGate', gateOpen(s) ? 'aberto' : 'fechado'); rerender(); };
  const endNote = () => { const t = document.createElement('template'); t.innerHTML = '<p class="gx-note gx-end" style="text-align:center;padding:var(--space-3)">Você viu tudo até agora.</p>'; return t.content.firstElementChild; };
  const loadMore = (root) => {
    const s = curSlug(); const list = filtered(s); const from = Math.max(SHOWN, get(s, 'shown', SHOWN)); const to = Math.min(list.length, from + 8); const host = A.$('#gx-feed', root);
    if (!host || from >= list.length) return false;
    host.insertAdjacentHTML('beforeend', feedPosts(s, list, to, from)); set(s, 'shown', to); fitCaps(host);
    if (to >= list.length) { const m = A.$('[data-more]', root); if (m) m.replaceWith(endNote()); }
    return to < list.length;
  };
  const armMore = (root) => {
    if (G.moreOn) { removeEventListener('scroll', G.moreOn, true); G.moreOn = null; }
    const sent = A.$('[data-more]', root); if (!sent) return;
    let busy = false;
    const stop = () => { removeEventListener('scroll', on, true); if (G.moreOn === on) G.moreOn = null; };
    const check = () => {
      busy = false; if (!sent.isConnected) return stop();
      if (sent.getBoundingClientRect().top > innerHeight + 800) return;
      if (!loadMore(root)) return stop();
      busy = true; setTimeout(check, 60);
    };
    const on = () => { if (busy) return; busy = true; setTimeout(check, 80); };
    G.moreOn = on; addEventListener('scroll', on, true); on();
  };
  A.acts['g-mais'] = () => { loadMore(document); };
  A.route('/g/:slug/explorar', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const ev = evOf(s); const open = gateOpen(s); const list = filtered(s);
    const was = get(s, 'gateVisto', null); set(s, 'gateVisto', open); const justOpened = open && was === false;
    const dis = get(s, 'avisoGate', '') === (open ? 'aberto' : 'fechado');
    const ban = dis ? '' : `<div class="gx-gate" role="status">${A.icon(open ? 'check' : 'clock', 20)}<p>${open ? 'A conversa abriu: reaja e comente à vontade.' : `A conversa abre depois d${marco(s).replace(/^(a|o) /, '$1 ')}, às ${gateHora(s)}.`}</p><button class="gx-ib q sm" data-act="g-gate-x" aria-label="Dispensar este aviso">${A.icon('x', 18)}</button></div>`;
    const shown = Math.max(SHOWN, get(s, 'shown', SHOWN));
    const content = A.stateful({
      isEmpty: () => !list.length,
      empty: A.emptyState({ icon: 'image', title: get(s, 'fm', 'tudo') === 'tudo' ? 'Ainda não tem foto aqui' : 'Nenhuma foto neste filtro', body: get(s, 'fm', 'tudo') === 'tudo' ? 'Seja o primeiro a fotografar.' : 'Tire outro filtro ou fotografe esse momento.', cta: `<a class="btn btn-accent" href="${B(s)}/camera">Tirar foto</a>` }),
      loading: `<div class="gx-pad">${A.skel(2, 280)}</div>`,
      error: `<div class="gx-pad">${A.errorState({ body: 'Não consegui carregar as fotos agora. Se estiver sem sinal, as suas continuam guardadas.' })}</div>`,
      ok: () => `<div><div id="gx-feed">${feedPosts(s, list, shown)}</div><div class="gx-in">${list.length > shown ? `<div class="gx-more" data-more role="status" aria-label="Carregando mais fotos">${A.skel(1, 200)}</div>` : '<p class="gx-note gx-end" style="text-align:center;padding:var(--space-3)">Você viu tudo até agora.</p>'}</div></div>`,
    });
    const out = page(ctx, { title: 'Explorar', active: 'explorar', desk: true, body: `<div class="gx-layout"><div class="gx-colmain">${feedHead(s, 'Álbum ao vivo', true)}${railHtml(s)}${ban}${momentChips(s)}${content}${demoNote()}</div>${asideHtml(s)}</div>` });
    out.after = (root) => { fitCaps(root); armMore(root); };
    return out;
  });

  A.route('/g/:slug/album', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const list = filtered(s); const all = allPhotos(s);
    const groups = A.data.momentos.map((m) => [m, list.filter((p) => p.momento === m)]).filter(([, l]) => l.length);
    const people = new Set(all.map((p) => p.autor)).size; const nm = Object.keys(mDone(s)).length;
    const own = list.filter((p) => p.own); const grouped = get(s, 'fm', 'tudo') === 'minhas' ? [['Minhas', own]] : groups;
    const content = A.stateful({
      isEmpty: () => !list.length, empty: A.emptyState({ icon: 'image', title: 'Nada neste filtro', body: 'Escolha outro momento ou tire a primeira foto dele.', cta: `<a class="btn btn-accent" href="${B(s)}/camera">Tirar foto</a>` }),
      loading: `<div class="gx-pad">${A.skel(3, 120)}</div>`, error: `<div class="gx-pad">${A.errorState({ body: 'Não consegui carregar o álbum agora. Confira a conexão e tente de novo.' })}</div>`,
      ok: () => `<div class="gx-pad">${grouped.map(([m, l]) => `<section class="gx-sec" aria-label="${A.esc(m)}"><h2>${A.esc(m)} <span class="t-small">· ${plural(l.length, 'foto', 'fotos')}</span></h2><div class="gx-grid gx-mos" data-fam="${famDe(evOf(s))}">${l.map((p) => `<button class="gx-tile" data-act="g-open" data-ctx="album" data-id="${p.id}" aria-label="Abrir foto de ${A.esc(authorOf(s, p.autor).primeiro)}, ${A.esc(m.toLowerCase())}">${fx(p.src, p.filtro, p.inten, '', 'cover')}</button>`).join('')}</div></section>`).join('')}</div>`,
    });
    return page(ctx, { title: 'Álbum', active: 'album', desk: true, body: `<div class="gx-layout alb"><div class="gx-colmain">${feedHead(s, 'Álbum', true)}${nm ? `<p class="gx-in muted" style="margin:0 var(--space-4)">${plural(nm, 'missão feita', 'missões feitas')}</p>` : ''}${momentChips(s)}${content}${demoNote()}</div>${asideHtml(s)}</div>` });
  });

  /* ---------------------------------------------------------------- 4. missões */
  A.route('/g/:slug/missoes', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const ms = missionsOn(); const done = mDone(s); const nD = ms.filter((m) => done[m.id]).length; const cur = ms.find((m) => !done[m.id]);
    const content = A.stateful({
      isEmpty: () => !ms.length, empty: A.emptyState({ icon: 'target', title: 'Sem missões nesta festa', body: 'Os anfitriões não escolheram missões. Fotografe o que quiser.', cta: `<a class="btn btn-accent" href="${B(s)}/camera">Tirar foto</a>` }),
      loading: `<div class="gx-pad">${A.skel(5, 60)}</div>`, error: `<div class="gx-pad">${A.errorState({ body: 'Não carreguei as missões agora. Tente de novo.' })}</div>`,
      ok: () => `<div class="gx-pad"><div class="gx-mhead"><span class="gx-ring" style="--p:${Math.round((nD / ms.length) * 100)}" role="progressbar" aria-valuemin="0" aria-valuemax="${ms.length}" aria-valuenow="${nD}" aria-label="Missões feitas"><b>${nD}/${ms.length}</b></span><div class="tx"><b>${nD === ms.length ? 'Todas as missões feitas' : `${nD} de ${ms.length} missões feitas`}</b><span class="t-small muted">${nD === ms.length ? 'As próximas fotos podem ser livres.' : 'Escolha uma e fotografe.'}</span></div></div>${cur ? `<section class="gx-cur" aria-label="Missão atual"><span class="gx-ck">Sua missão agora</span><span class="gx-roman big">${cur.romano}</span><h2 class="t-title">${A.esc(cur.titulo)}</h2><span class="t-small">${plural(cur.fotos, 'foto', 'fotos')} já feitas</span><a class="btn btn-accent btn-block" href="${B(s)}/camera?missao=${cur.id}">${A.icon('camera', 18)} Fotografar</a></section>` : `<p class="gx-done" role="status">Você fez todas as missões. As próximas fotos podem ser livres.</p>`}<section class="gx-sec" aria-label="Todas as missões"><h2>${cur ? 'Outras missões' : 'Todas as missões'}</h2><ul class="gx-ml" role="list">${ms.filter((m) => !cur || m.id !== cur.id).map((m) => `<li class="gx-mi ${done[m.id] ? 'done' : ''}"><span class="gx-mnum" aria-hidden="true">${done[m.id] ? A.icon('check', 20) : m.romano}</span><div class="gx-mt"><b>${A.esc(m.titulo)}</b><span class="t-small">${plural(m.fotos + (done[m.id] ? 1 : 0), 'foto', 'fotos')}${done[m.id] ? ' · Feita' : ''}</span></div><div class="gx-mac">${done[m.id] ? `<button class="gx-mbtn" data-act="g-desfazer-m" data-id="${m.id}" aria-label="Desmarcar ${A.esc(m.titulo)}">Desmarcar</button>` : `<a class="gx-mcam" href="${B(s)}/camera?missao=${m.id}" aria-label="Fotografar: ${A.esc(m.titulo)}">${A.icon('camera', 20)}</a><button class="gx-mbtn" data-act="g-concluir-m" data-id="${m.id}" aria-label="Já fiz a missão ${A.esc(m.titulo)} fora do app">Já fiz</button>`}</div></li>`).join('')}</ul><p class="gx-note" style="margin-top:var(--space-3)">Já fiz marca como feita uma missão cuja foto você tirou por conta própria. As contagens de fotos por missão são de exemplo do protótipo.</p></section></div>`,
    });
    return page(ctx, { title: 'Missões', active: 'missoes', body: `${feedHead(s, 'Missões', true)}${content}` });
  });
  A.acts['g-concluir-m'] = (el) => { const s = curSlug(); markMissao(s, el.dataset.id); rerender(); toast('Missão marcada como feita.', { undo: () => { upd(s, 'missoes', (o) => { const n = { ...o }; delete n[el.dataset.id]; return n; }, {}); rerender(); } }); };
  A.acts['g-desfazer-m'] = (el) => { const s = curSlug(); upd(s, 'missoes', (o) => { const n = { ...o }; delete n[el.dataset.id]; return n; }, {}); rerender(); toast('Missão desmarcada.'); };

  /* ---------------------------------------------------------------- 5. minhas fotos, consentimento, perfil de outro convidado */
  A.route('/g/:slug/minhas', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const l = [...uploads(s)].reverse(); const off = get(s, 'offline', false); const np = pend(s).length;
    const content = A.stateful({
      isEmpty: () => !l.length, empty: A.emptyState({ icon: 'image', title: 'Suas fotos vão aparecer aqui', body: 'Quando você tirar a primeira, ela sobe sozinha e fica aqui, com o estado de cada uma.', cta: `<a class="btn btn-accent" href="${B(s)}/camera">Tirar foto</a>` }),
      loading: `<div class="gx-pad">${A.skel(2, 130)}</div>`, error: `<div class="gx-pad">${A.errorState({ body: 'Não carreguei suas fotos agora. Elas continuam guardadas.' })}</div>`,
      ok: () => `<div class="gx-pad"><p class="muted" style="margin-bottom:12px">${nFV(l)}${np ? ` · ${np} ainda sobe${np > 1 ? 'm' : ''}` : ''}</p><div class="gx-grid">${l.map((u) => `<button class="gx-tile ${['fila', 'falhou'].includes(u.status) ? 'dim' : ''}" data-act="g-minha" data-id="${u.id}" aria-label="Abrir minha foto: ${A.esc(qLabel(u, off))}">${fx(u.src, u.filtro, u.inten, '', 'cover')}<span class="tg">${({ fila: 'Na fila', enviando: 'Enviando', enviada: 'Enviada', aguardando: 'Aguardando', aprovada: 'Aprovada', falhou: 'Não enviou' })[u.status]}</span></button>`).join('')}</div>${l.some((u) => u.status === 'falhou') ? `<div class="banner warn" style="margin-top:var(--space-4)" role="alert">${A.icon('warn', 20)}<div>Algumas fotos não subiram e estão guardadas no celular.<br><button class="link" data-act="g-retry-all">Tentar de novo</button></div></div>` : ''}</div>`,
    });
    return page(ctx, { title: 'Minhas fotos', active: 'perfil', back: `${B(s)}/perfil`, body: `${content}<div class="gx-pad">${recapHtml(s)}<div class="gx-sec"><h2>Suas fotos, do seu jeito</h2><div class="list"><a class="li is-link" href="${B(s)}/fila">${A.icon('upload', 20)}<span class="grow">Fila de envio</span>${A.icon('chevron', 16)}</a><button class="li is-link" data-act="g-guardar">${A.icon('download', 20)}<span class="grow">Guardar minhas fotos<span class="t-small" style="display:block">Link pessoal, sem conta</span></span>${A.icon('chevron', 16)}</button><a class="li is-link" href="${B(s)}/consentimento">${A.icon('shield', 20)}<span class="grow">Meu consentimento e apagar tudo</span>${A.icon('chevron', 16)}</a></div></div></div>` });
  });
  A.acts['g-minha'] = (el) => {
    const s = curSlug(); const u = uploads(s).find((x) => x.id === el.dataset.id); if (!u) return; const off = get(s, 'offline', false); const m = u.missao ? A.data.missions.find((x) => x.id === u.missao) : null;
    const msg = { fila: off ? 'Guardada no celular. Sobe quando o sinal voltar.' : 'Na fila, vai subir em instantes.', enviando: 'Enviando agora.', enviada: 'Chegou. Os anfitriões revisam antes de ela entrar no álbum e no telão.', aguardando: 'Chegou e aguarda aprovação dos anfitriões. Ainda não está no álbum nem no telão.', aprovada: 'Aprovada: já está no álbum. O telão escolhe sozinho o que mostrar.', falhou: 'Não subiu. Está guardada no celular.' }[u.status];
    sheet({ title: 'Minha foto', body: `<div class="stack">${`<span class="gx-ph r-a" style="aspect-ratio:${u.ar || '4/5'};max-height:42dvh;width:auto;margin:0 auto;display:block">${fx(u.src, u.filtro, u.inten, 'Minha foto')}</span>`}<div><span class="gx-badge ${qTone(u)}">${A.esc(qLabel(u, off))}</span><p class="muted" style="margin-top:var(--space-2)">${msg}</p></div>${u.legenda ? `<p class="gx-cap">${A.esc(u.legenda)}</p>` : ''}${m ? `<p class="t-small">Missão ${m.romano}: ${A.esc(m.titulo)}</p>` : ''}<div class="stack-2">${u.status === 'falhou' ? `<button class="btn btn-accent" data-act="g-retry" data-id="${u.id}" data-mclose>Tentar de novo</button>` : ''}${u.status === 'aguardando' ? `<button class="btn btn-line" data-act="g-simular-aprov" data-id="${u.id}">Simular: o anfitrião aprovou (só no protótipo)</button>` : ''}${u.status === 'aprovada' ? `<a class="btn btn-line" href="${B(s)}/compartilhar?foto=${u.id}" data-mclose>${A.icon('share', 18)} Compartilhar fora da festa</a>` : ''}<button class="btn btn-danger" data-act="g-excluir" data-id="${u.id}">${A.icon('trash', 18)} Excluir esta foto</button></div></div>` });
  };
  A.acts['g-excluir'] = (el) => excluirFoto(curSlug(), el.dataset.id);
  A.acts['g-simular-aprov'] = (el) => { const s = curSlug(); upd(s, 'uploads', (l) => l.map((u) => (u.id === el.dataset.id ? { ...u, status: 'aprovada' } : u)), []); A.$$('.modal,.scrim').forEach((x) => x.remove()); rerender(); toast('Aprovada (simulado). Agora ela aparece em Explorar e no Álbum.'); };
  A.acts['g-guardar'] = () => {
    const s = curSlug(); const tok = get(s, 'token', null) || (() => { const t = 'meu-' + A.uid(); set(s, 'token', t); return t; })(); const url = `albora.app/g/${tok}`;
    sheet({ title: 'Guardar minhas fotos', body: `<div class="stack"><p>Este é o seu link pessoal. Depois que os anfitriões publicarem o álbum, ele abre suas fotos em alta qualidade, sem conta e sem e-mail.</p><div class="flex"><code class="t-mono grow" style="font-size:14px;overflow-wrap:anywhere">${url}</code></div><p class="gx-note">Quem tiver o endereço abre as fotos. Não compartilhe.</p></div>`, actions: [{ label: 'Copiar link', variant: 'btn-line', close: false, onClick: () => { (navigator.clipboard ? navigator.clipboard.writeText('https://' + url) : Promise.reject()).catch(() => {}); toast('Link copiado.'); return false; } }, { label: 'Abrir agora', variant: 'btn-primary', onClick: () => { setTimeout(() => A.go(`#/g/entrega/${tok}`), 0); } }] });
  };

  const sendable = (s) => uploads(s).filter((u) => u.status !== 'falhou');
  const recapHtml = (s) => { const n = sendable(s).length; const nc = sendable(s).filter((u) => u.tipo !== 'video').length; return `<section class="gx-sec" aria-labelledby="gx-rcp"><h2 id="gx-rcp">Para guardar</h2><div class="list"><button class="li is-link" data-act="g-recap" ${n >= 3 ? '' : 'aria-disabled="true"'}>${A.icon('play', 20)}<span class="grow">Recap da noite<span class="t-small" style="display:block">${n >= 3 ? 'Suas fotos e vídeos, em sequência' : 'Disponível com 3 fotos ou vídeos seus'}</span></span>${A.icon('chevron', 16)}</button><button class="li is-link" data-act="g-colagem" ${nc >= 2 ? '' : 'aria-disabled="true"'}>${A.icon('grid', 20)}<span class="grow">Colagem da noite<span class="t-small" style="display:block">${nc >= 2 ? 'Escolha até 4 fotos suas' : 'Disponível com 2 fotos suas'}</span></span>${A.icon('chevron', 16)}</button></div></section>`; };
  A.acts['g-recap'] = () => {
    const s = curSlug(); const l = sendable(s).slice(-10).reverse(); if (l.length < 3) return toast('O recap aparece quando você tiver 3 fotos ou vídeos seus.'); let i = 0;
    const m = sheet({ title: 'Recap', body: '<div class="gx-rc"></div>' });
    const draw = () => { const u = l[i]; A.$('h2', m.el).textContent = `Recap · ${i + 1} de ${l.length}`; A.$('.gx-rc', m.el).innerHTML = `<span class="gx-ph r-a" style="aspect-ratio:${u.ar || '4/5'};max-height:46dvh;width:auto;margin:0 auto;display:block">${fx(u.src, u.filtro, u.inten, u.tipo === 'video' ? 'Vídeo do recap' : 'Quadro do recap', 'ctl')}</span>${u.legenda ? `<p class="gx-cap" style="text-align:center">${A.esc(u.legenda)}</p>` : ''}<div class="flex between"><button class="btn btn-line" data-vn="-1" ${i === 0 ? 'disabled' : ''}>${A.icon('chevleft', 18)} Anterior</button><button class="btn btn-line" data-vn="1" ${i === l.length - 1 ? 'disabled' : ''}>Próximo ${A.icon('chevron', 18)}</button></div>${i === l.length - 1 ? `<button class="btn btn-accent" data-act="g-share-go">${A.icon('share', 18)} Compartilhar recap</button>` : ''}`; };
    m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-vn]'); if (b) { i = Math.min(l.length - 1, Math.max(0, i + +b.dataset.vn)); draw(); } }); draw();
  };
  A.acts['g-colagem'] = () => {
    const s = curSlug(); const all = sendable(s); const l = all.filter((u) => u.tipo !== 'video'); if (l.length < 2) return toast('A colagem aparece quando você tiver 2 fotos suas. Vídeos ficam de fora: a colagem é uma imagem.');
    sheet({ title: 'Colagem da noite', body: `<form data-submit="g-colagem-ok" class="stack" novalidate><fieldset style="border:0;padding:0;margin:0"><legend class="t-small" style="margin-bottom:8px">Escolha de 2 a 4 fotos${all.length > l.length ? '. Vídeos ficam de fora: a colagem é uma imagem' : ''}</legend><div class="gx-pk">${l.map((u) => `<label><input type="checkbox" name="f" value="${u.id}" aria-label="Foto ${A.esc(u.legenda || u.id)}">${fx(u.src, u.filtro, u.inten, '', 'cover')}</label>`).join('')}</div></fieldset><p class="err crit" id="gx-ce" role="alert" style="display:none"></p><button class="btn btn-primary" type="submit">Montar colagem</button></form>` });
  };
  A.acts['g-colagem-ok'] = (form) => {
    const s = curSlug(); const ids = [...form.querySelectorAll('input[name=f]:checked')].map((x) => x.value); const e = A.$('#gx-ce', form);
    if (ids.length < 2 || ids.length > 4) { e.style.display = 'block'; e.textContent = 'Escolha de 2 a 4 fotos.'; return; }
    const us = ids.map((id) => uploads(s).find((u) => u.id === id)); const mod = form.closest('.modal');
    mod.querySelector('h2').textContent = 'Sua colagem';
    mod.querySelector('.modal-body').innerHTML = `<div class="stack"><div class="gx-col">${us.map((u) => `<span>${fx(u.src, u.filtro, u.inten, '', 'cover')}</span>`).join('')}</div><button class="btn btn-accent" data-act="g-share-go">${A.icon('share', 18)} Compartilhar colagem</button><p class="gx-note">Simulado: a imagem final seria gerada no seu celular.</p></div>`;
  };

  A.route('/g/:slug/consentimento', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const se = sess(s); const c = se.consent;
    return page(ctx, { title: 'Meu consentimento', active: 'perfil', back: `${B(s)}/perfil`, body: `<div class="gx-pad stack"><div class="stack-2"><h2 class="t-display" style="font-size:var(--fs-title)">Você aceitou</h2><p class="muted">Termo versão ${c.versao}, aceito em ${A.esc(fmtDT(c.em))}. Você pode conferir e revogar a qualquer momento.</p></div><ul class="gx-terms">${GX.termo.itens.map((i) => `<li>${A.esc(i)}</li>`).join('')}</ul><section class="stack-2 gx-rule" aria-labelledby="gx-rv"><h2 class="t-title" id="gx-rv">Mudou de ideia?</h2><p class="muted">Nesta demonstração, revogar remove os dados locais da sua participação: ${plural(uploads(s).length, 'foto', 'fotos')}, comentários e reações, e encerra sua entrada neste aparelho. Nenhum aviso é enviado e nenhum servidor é alterado.</p><button class="btn btn-danger" data-act="g-revogar">${A.icon('trash', 18)} Revogar e apagar tudo</button></section></div>` });
  });
  A.acts['g-revogar'] = () => {
    const s = curSlug(); confirm({ title: 'Revogar e apagar tudo?', body: `<p>Esta simulação apaga deste navegador ${nFV(uploads(s))}, seus comentários e reações, e encerra sua entrada neste aparelho. O aviso aos anfitriões e a exclusão no servidor dependem de integração. <b>Não dá para desfazer.</b></p>`, confirm: 'Apagar tudo', danger: true, type: 'APAGAR' }).then((ok) => {
      if (!ok) return; dropMedia(uploads(s).map((u) => u.mid).filter(Boolean)); SKEYS.forEach((k) => A.store.set(K(s, k), null)); G.draft = null; A.go(B(s)); toast('Participação removida deste navegador. Nenhum aviso foi enviado.');
    });
  };

  A.route('/g/:slug/p/:autorId', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const id = ctx.params.autorId; const a = A.data.guests.find((x) => x.id === id);
    if (!a || a.status === 'bloqueado' || (a.status === 'convidado' && !isDemo())) return page(ctx, { title: 'Perfil', active: 'explorar', back: `${B(s)}/explorar`, body: `<div class="gx-pad"><div class="empty">${A.icon('face', 40)}<h2 class="t-title">Esse perfil não está disponível</h2><p>Pode ser um link antigo ou alguém que ainda não mandou fotos.</p><a class="btn btn-line" href="${B(s)}/explorar">Voltar às fotos</a></div></div>` });
    const bl = get(s, 'bloqueados', []).includes(id); const l = bl ? [] : allPhotos(s).filter((p) => p.autor === id);
    const body = bl ? `<div class="empty">${A.icon('lock', 40)}<h2 class="t-title">Você bloqueou ${A.esc(a.primeiro)}</h2><p>Você não vê as fotos nem os comentários dessa pessoa.</p><button class="btn btn-line" data-act="g-desbloquear" data-id="${id}">Desbloquear</button></div>` : A.stateful({ isEmpty: () => !l.length, empty: A.emptyState({ icon: 'image', title: 'Ainda não tem foto aqui', body: `Quando ${a.primeiro} mandar uma foto aprovada, ela aparece aqui.` }), loading: A.skel(2, 130), error: A.errorState({ body: 'Não carreguei este perfil agora.' }), ok: () => `<div class="gx-pgrid">${l.map((p) => `<button class="gx-tile" data-act="g-open" data-ctx="autor" data-extra="${id}" data-id="${p.id}" aria-label="Abrir foto, ${A.esc(p.momento.toLowerCase())}">${fx(p.src, p.filtro, p.inten, '', 'cover')}</button>`).join('')}</div>` });
    return page(ctx, { title: a.nome, active: 'explorar', back: `${B(s)}/explorar`, right: bl ? '' : `<button class="gx-ib q" data-act="g-perfil-menu" data-id="${id}" aria-haspopup="menu" aria-label="Mais opções sobre ${A.esc(a.primeiro)}">${A.icon('more', 22)}</button>`, body: `<div class="gx-pad gx-pf"><div class="gx-pcov" data-theme="noite">${evOf(s).capa ? `<img src="${A.esc(evOf(s).capa)}" alt="" style="${A.hero ? A.hero.fotoStyle(evOf(s).id) : ''}">` : ''}</div><div class="gx-pf-top"><span class="gx-pav" aria-hidden="true"><span>${A.esc(a.ini)}</span></span><div class="gx-pbio"><div class="nm">${A.esc(a.nome)}</div><p>${bl ? '' : plural(l.length, 'foto', 'fotos') + ' no álbum'}</p></div></div>${body}</div>` });
  });
  A.acts['g-perfil-menu'] = (el) => { const s = curSlug(); const a = authorOf(s, el.dataset.id); gmenu(el, [{ label: `Bloquear ${a.primeiro}`, icon: 'lock', danger: 1, onClick: () => bloquear(s, a.id) }]); };
  A.acts['g-desbloquear'] = (el) => { const s = curSlug(); upd(s, 'bloqueados', (l) => l.filter((x) => x !== el.dataset.id), []); rerender(); toast('Desbloqueado.'); };

  /* ---------------------------------------------------------------- 6. música: pedir e votar em lista fechada */
  A.route('/g/:slug/musica', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const open = gateOpen(s); const mu = GX.musica[s] || { lista: 'Trilha da festa', provedor: 'Spotify' };
    const votos = get(s, 'votos', []); const pedidos = get(s, 'pedidos', []); const ids = [...GX.filaInicial, ...pedidos];
    const rows = ids.map((id) => { const c = GX.catalogo.find((x) => x.id === id); const base = GX.votosBase[id] || 1; const v = base + (votos.includes(id) ? 1 : 0); return { c, v, mine: votos.includes(id), user: pedidos.includes(id) }; }).sort((a, b) => b.v - a.v);
    const content = A.stateful({
      isEmpty: () => !rows.length, empty: A.emptyState({ icon: 'music', title: 'Nenhum pedido ainda', body: 'Seja o primeiro a pedir uma música.' }),
      loading: A.skel(4, 56), error: A.errorState({ body: 'Não carreguei os pedidos agora. Tente de novo.' }),
      ok: () => `<ol class="gx-rank">${rows.map((r, i) => `<li class="gx-q"><span class="gx-roman">${i + 1}</span><div class="grow"><b>${A.esc(r.c.t)}</b><div class="t-small">${A.esc(r.c.a)}</div><div class="t-small">${plural(r.v, 'voto', 'votos')}${r.user ? ' · pedido por você' : ''}</div></div><button class="btn btn-line ${r.mine ? 'gx-voted' : ''}" data-act="g-votar" data-id="${r.c.id}" aria-pressed="${r.mine}" ${open ? '' : 'disabled'}>${r.mine ? 'Você votou' : 'Também quero'}</button></li>`).join('')}</ol>`,
    });
    return page(ctx, { title: 'Música', active: 'perfil', back: `${B(s)}/perfil`, body: `<div class="gx-pad stack"><section class="gx-mu" aria-labelledby="gx-tr" data-theme="noite">${evOf(s).capa ? `<img class="gx-mu-bg" src="${A.esc(evOf(s).capa)}" alt="" aria-hidden="true">` : ''}<span class="gx-eyebrow">Trilha da festa</span><h2 class="gx-name" id="gx-tr">${A.esc(mu.lista)}</h2><p class="muted">Trilha escolhida por ${A.esc(anf(s))}.</p><button class="btn btn-accent gx-mu-btn" data-act="g-abrir-musica" data-p="${A.esc(mu.provedor)}">${A.icon('music', 18)} Abrir no ${A.esc(mu.provedor)}</button><p class="gx-note">Nada toca aqui: a lista abre em outro app (simulado).</p></section><section class="stack-2 gx-rule" aria-labelledby="gx-pd"><h2 class="t-title" id="gx-pd" style="font-size:22px">Pedidos da pista</h2>${open ? '<p class="muted">Vote nas músicas dos outros ou peça a sua. Os anfitriões aprovam o que sobe no telão.</p>' : `<div class="gx-gate" style="padding:0;border:0" role="status">${A.icon('clock', 20)}<span>Os pedidos abrem depois d${marco(s).replace(/^(a|o) /, '$1 ')}, às ${gateHora(s)}. Por enquanto você só vê a fila.</span></div>`}${content}<p class="gx-note">Os votos desta fila são de exemplo: o protótipo parte de uma fila simulada.</p><button class="btn btn-accent" data-act="g-pedir" ${open ? '' : 'disabled aria-disabled="true"'}>${A.icon('plus', 18)} Pedir uma música</button></section></div>` });
  });
  A.acts['g-abrir-musica'] = (el) => toast(`Abriria o ${el.dataset.p} com a lista da festa (simulado).`);
  A.acts['g-votar'] = (el) => { const s = curSlug(); const id = el.dataset.id; upd(s, 'votos', (l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]), []); rerender(); };
  A.acts['g-pedir'] = () => {
    const s = curSlug(); const pedidos = get(s, 'pedidos', []);
    if (pedidos.length >= 2) return toast('Você já pediu 2 músicas. Vote nas dos outros.');
    const free = GX.catalogo.filter((c) => !GX.filaInicial.includes(c.id) && !pedidos.includes(c.id));
    sheet({ title: 'Pedir uma música', body: `<form data-submit="g-pedir-ok" class="stack" novalidate><fieldset style="border:0;padding:0;margin:0" class="stack-2"><legend class="t-small" style="margin-bottom:var(--space-2)">Escolha na lista (${2 - pedidos.length} pedido${2 - pedidos.length > 1 ? 's' : ''} restante${2 - pedidos.length > 1 ? 's' : ''})</legend>${free.map((c, i) => `<label class="gx-rad"><input type="radio" name="song" value="${c.id}" ${i === 0 ? 'checked' : ''}><span><b>${A.esc(c.t)}</b><span class="t-small" style="display:block">${A.esc(c.a)}</span></span></label>`).join('')}</fieldset><button class="btn btn-primary" type="submit">Pedir</button></form>` });
  };
  A.acts['g-pedir-ok'] = (form) => { const s = curSlug(); const v = (A.$('input[name=song]:checked', form) || {}).value; if (!v) return; upd(s, 'pedidos', (l) => [...l, v], []); upd(s, 'votos', (l) => [...l, v], []); form.closest('.modal').querySelector('[data-mclose]').click(); rerender(); toast('Pedido enviado.'); };

  /* ---------------------------------------------------------------- 7. recado e confessionário */
  A.route('/g/:slug/recado', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const r = GX.recado[s]; const lido = get(s, 'lido', false);
    if (!r) return page(ctx, { title: 'Recado', active: 'perfil', back: `${B(s)}/perfil`, body: stateScreen({ title: 'Sem recado por enquanto', body: `${A.esc(anf(s))} não deixaram recado.`, tag: 'h2' }) });
    return page(ctx, { title: 'Recado', active: 'perfil', back: `${B(s)}/perfil`, body: `<div class="gx-pad stack"><article class="gx-letter"><span class="gx-eyebrow">Recado de ${A.esc(anf(s))}</span><span class="gx-qm" aria-hidden="true">“</span><p class="gx-recado">${A.esc(r.texto)}</p><p class="gx-sign-off">${A.esc(anf(s))}</p></article>${r.duracao ? `<div class="gx-play" id="gx-play" style="--d:${r.duracao}s"><button class="btn btn-line" data-act="g-play" aria-pressed="false" aria-label="Ouvir recado em áudio" style="min-width:48px;padding:0 var(--space-4)">${A.icon('play', 18)}</button><div class="gx-wave" aria-hidden="true"><i></i></div><span class="t-small t-mono">0:${String(r.duracao).padStart(2, '0')}</span></div><p class="gx-note">Áudio simulado: a barra anda, mas não há som neste protótipo.</p>` : ''}<button class="btn ${lido ? 'btn-line' : 'btn-accent'}" data-act="g-lido">${lido ? 'Marcar como não lido' : 'Li, obrigado'}</button></div>` });
  });
  A.acts['g-play'] = (el) => { const box = el.closest('.gx-play'); const on = box.dataset.on !== '1'; box.dataset.on = on ? '1' : '0'; el.setAttribute('aria-pressed', on); el.innerHTML = A.icon(on ? 'pause' : 'play', 18); el.setAttribute('aria-label', on ? 'Pausar recado' : 'Ouvir recado em áudio'); const bar = A.$('.gx-wave i', box); bar.style.animation = 'none'; if (on) { void bar.offsetWidth; bar.style.animation = ''; } bar.onanimationend = () => { box.dataset.on = '0'; el.setAttribute('aria-pressed', false); el.innerHTML = A.icon('play', 18); }; };
  A.acts['g-lido'] = () => { const s = curSlug(); set(s, 'lido', !get(s, 'lido', false)); rerender(); };

  A.route('/g/:slug/confissionario', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const c = GX.confissao[s]; const mine = get(s, 'confissoes', []);
    if (!c) return page(ctx, { title: 'Confessionário', active: 'perfil', back: `${B(s)}/perfil`, body: stateScreen({ title: 'Confessionário indisponível', body: 'Este evento não tem confessionário ativo.', tag: 'h2' }) });
    return page(ctx, { title: c.titulo, active: 'perfil', back: `${B(s)}/perfil`, body: `<div class="gx-pad stack"><p class="gx-recado gx-lede">${A.esc(c.lede)}</p><ol class="gx-rank">${c.prompts.map((p) => { const d = mine.find((x) => x.p === p.id); return `<li class="gx-q" style="align-items:flex-start"><div class="grow"><div class="gx-pr">${A.esc(p.t)}</div><div class="t-small">${d ? `Você deixou ${d.tipo === 'audio' ? 'um áudio de ' + d.seg + ' s' : 'um texto'}` : 'Ainda não deixou'}</div></div>${d ? `<button class="link" data-act="g-conf-del" data-id="${p.id}">Apagar</button>` : `<button class="link" data-act="g-conf" data-id="${p.id}">Responder</button>`}</li>`; }).join('')}</ol><p class="gx-note">Só ${A.esc(anf(s))} veem. Eles decidem o que entra no livro. Você apaga quando quiser.</p></div>` });
  });
  A.acts['g-conf'] = (el) => {
    const s = curSlug(); const c = GX.confissao[s]; const p = c.prompts.find((x) => x.id === el.dataset.id); const st = { rec: false, seg: 0, t: null };
    const m = sheet({ title: p.t, body: `<div class="stack"><div role="tablist" class="tabs" aria-label="Como responder"><button class="tab" role="tab" aria-selected="true" data-act="tab" data-panel="tx">Escrever</button><button class="tab" role="tab" aria-selected="false" data-act="tab" data-panel="au">Gravar áudio</button></div><div data-tabpanel="tx"><form data-submit="g-conf-tx" data-id="${p.id}" class="stack" novalidate><div class="field"><label for="gx-tx">Sua mensagem</label><textarea class="textarea gx-ta" id="gx-tx" name="texto" rows="4" required aria-required="true" maxlength="400" aria-describedby="gx-tx-e"></textarea><span class="err" id="gx-tx-e" role="alert"></span></div><button class="btn btn-primary" type="submit">Enviar mensagem</button></form></div><div data-tabpanel="au" hidden class="stack"><p class="muted">Simulado: não há microfone neste protótipo. A gravação só conta os segundos.</p><div class="flex"><button class="btn btn-line" data-act="g-rec" aria-pressed="false" id="gx-rec">${A.icon('mic', 18)} Gravar</button><span id="gx-rarc" style="flex:1">${A.arc(0, 130, 'Tempo de gravação')}</span><span class="t-mono" id="gx-rs" aria-live="off">0 s</span></div><button class="btn btn-primary" data-act="g-conf-au" data-id="${p.id}" disabled id="gx-au-ok">Enviar áudio</button></div></div>` });
    m.onClose = () => { clearInterval(G.rec); };
  };
  A.acts['g-rec'] = (el) => {
    const on = el.getAttribute('aria-pressed') !== 'true'; el.setAttribute('aria-pressed', on); clearInterval(G.rec);
    if (on) { G.recSeg = 0; el.innerHTML = A.icon('stop', 18) + ' Parar'; G.rec = setInterval(() => { G.recSeg++; A.$('#gx-rs').textContent = G.recSeg + ' s'; swap(A.$('#gx-rarc'), A.arc(G.recSeg / 30, 130, 'Tempo de gravação')); if (G.recSeg >= 30) el.click(); }, 1000); } else { el.innerHTML = A.icon('mic', 18) + ' Gravar de novo'; A.$('#gx-au-ok').disabled = !G.recSeg; }
  };
  A.acts['g-conf-au'] = (el) => { const s = curSlug(); const seg = G.recSeg || 1; upd(s, 'confissoes', (l) => [...l.filter((x) => x.p !== el.dataset.id), { p: el.dataset.id, tipo: 'audio', seg, ts: Date.now() }], []); el.closest('.modal').querySelector('[data-mclose]').click(); rerender(); toast('Áudio enviado (simulado).'); };
  A.acts['g-conf-tx'] = (form) => { const s = curSlug(); const out = A.validate(form, { texto: (v) => (v.length < 3 ? 'Escreva pelo menos algumas palavras.' : '') }); if (!out) return; upd(s, 'confissoes', (l) => [...l.filter((x) => x.p !== form.dataset.id), { p: form.dataset.id, tipo: 'texto', texto: out.texto, ts: Date.now() }], []); form.closest('.modal').querySelector('[data-mclose]').click(); rerender(); toast('Mensagem enviada.'); };
  A.acts['g-conf-del'] = (el) => { const s = curSlug(); const bak = get(s, 'confissoes', []); upd(s, 'confissoes', (l) => l.filter((x) => x.p !== el.dataset.id), []); rerender(); toast('Resposta apagada.', { undo: () => { set(s, 'confissoes', bak); rerender(); } }); };

  /* ---------------------------------------------------------------- 8. perfil, app, ajuda */
  A.route('/g/:slug/perfil', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const se = sess(s); const nb = get(s, 'bloqueados', []).length; const app = get(s, 'app', null); const rec = GX.recado[s]; const lido = get(s, 'lido', false);
    const row = (h, ic, l, sub = '') => `<a class="li is-link" href="${h}">${A.icon(ic, 20)}<span class="grow">${l}${sub ? `<span class="t-small" style="display:block">${sub}</span>` : ''}</span>${A.icon('chevron', 16)}</a>`;
    const btn = (act, ic, l, sub = '') => `<button class="li is-link" data-act="${act}">${A.icon(ic, 20)}<span class="grow">${l}${sub ? `<span class="t-small" style="display:block">${sub}</span>` : ''}</span>${A.icon('chevron', 16)}</button>`;
    const ms = missionsOn(); const done = mDone(s); const nD = ms.filter((m) => done[m.id]).length; const ev = evOf(s);
    const mine = uploads(s); const own = allPhotos(s).filter((x) => x.own);
    const rx = own.reduce((n, x) => n + rtotal(reactCounts(x, reacaoMinha(s, x.id))), 0);
    const liked = Object.keys(get(s, 'reacoes', {})).map((id) => photoById(s, id)).filter(Boolean);
    const off = get(s, 'offline', false);
    const hl = (href, ic, label, full, badge) => `<li><a class="gx-hl" href="${href}" aria-label="${A.esc(full || label)}"><span class="gx-hl-c">${A.icon(ic, 24)}${badge ? '<i class="gx-hl-b" aria-hidden="true"></i>' : ''}</span><span>${A.esc(label)}</span></a></li>`;
    const hls = [hl(B(s) + '/missoes', 'target', 'Missões', `Missões, ${nD} de ${ms.length} feitas`), hl(B(s) + '/musica', 'music', 'Música', 'Música da festa'), rec ? hl(B(s) + '/recado', 'mic', 'Recado', 'Recado de ' + anf(s) + (lido ? ', lido' : ', novo'), !lido) : '', GX.confissao[s] !== undefined ? hl(B(s) + '/confissionario', 'chat', 'Confessionário', (GX.confissao[s] || { titulo: 'Confessionário' }).titulo) : '', hl(B(s) + '/app', 'phone', 'App', 'Levar a festa no app')].join('');
    const myTiles = mine.slice().reverse().map((u) => `<button class="gx-tile ${['fila', 'falhou'].includes(u.status) ? 'dim' : ''}" data-act="g-minha" data-id="${u.id}" aria-label="Abrir minha foto: ${A.esc(qLabel(u, off))}">${fx(u.src, u.filtro, u.inten, '', 'cover')}<span class="tg">${({ fila: 'Na fila', enviando: 'Enviando', enviada: 'Enviada', aguardando: 'Aguardando', aprovada: 'Aprovada', falhou: 'Não enviou' })[u.status]}</span></button>`).join('');
    const likedTiles = liked.map((x) => `<button class="gx-tile" data-act="g-open" data-ctx="album" data-id="${x.id}" aria-label="Abrir foto de ${A.esc(x.own ? 'você' : authorOf(s, x.autor).primeiro)}, que você reagiu">${fx(x.src, x.filtro, x.inten, '', 'cover')}<span class="gx-tl" aria-hidden="true">${A.icon('heart', 14, '', { fill: true })}</span></button>`).join('');
    const empty = (ic, t, d, cta = '') => `<div class="gx-pempty"><span class="gx-pempty-i" aria-hidden="true">${A.icon(ic, 32)}</span><b>${t}</b><p>${d}</p>${cta}</div>`;
    const out = page(ctx, { title: 'Perfil', active: 'perfil', body: `<div class="gx-pad gx-pf"><div class="gx-pcov" data-theme="noite">${ev.capa ? `<img src="${A.esc(ev.capa)}" alt="" style="${A.hero ? A.hero.fotoStyle(ev.id) : ''}">` : ''}</div><div class="gx-pf-top"><span class="gx-pav" aria-hidden="true"><span>${A.esc(se.nome.slice(0, 1).toUpperCase())}</span></span><div class="gx-pbio"><div class="nm">${A.esc(se.nome)}</div><p>Convidado desde as ${hhmm(se.entrou)}</p></div></div><div class="gx-pst" role="list"><div role="listitem"><b>${A.pt(mine.length)}</b><span>${mine.length === 1 ? 'foto' : 'fotos'}</span></div><div role="listitem"><b>${A.pt(rx)}</b><span>${rx === 1 ? 'reação' : 'reações'}</span></div><div role="listitem"><b>${nD}<i>/${ms.length}</i></b><span>missões</span></div></div><div class="gx-pact"><button class="btn btn-line" data-act="g-nome">Editar nome</button><button class="btn btn-line" data-act="g-compartilhar-album">Compartilhar</button></div><ul class="gx-hls" role="list" aria-label="Atalhos">${hls}</ul><div class="gx-ptabs" role="tablist" aria-label="Fotos do perfil"><button class="gx-ptab" role="tab" id="gx-pt-f" aria-selected="true" aria-controls="gx-pp-f" data-act="g-ptab" data-tab="fotos" aria-label="Minhas fotos">${A.icon('grid', 24)}</button><button class="gx-ptab" role="tab" id="gx-pt-r" aria-selected="false" tabindex="-1" aria-controls="gx-pp-r" data-act="g-ptab" data-tab="reagi" aria-label="Fotos em que reagi">${A.icon('heart', 24)}</button></div><div role="tabpanel" id="gx-pp-f" aria-labelledby="gx-pt-f" data-ppanel="fotos">${mine.length ? `<div class="gx-pgrid">${myTiles}</div>` : empty('camera', 'Suas fotos aparecem aqui', 'Quando você tirar a primeira, ela sobe sozinha e fica aqui.', `<a class="btn btn-accent" href="${B(s)}/camera">Tirar foto</a>`)}</div><div role="tabpanel" id="gx-pp-r" aria-labelledby="gx-pt-r" data-ppanel="reagi" hidden>${liked.length ? `<div class="gx-pgrid">${likedTiles}</div>` : empty('heart', 'Nada por aqui ainda', 'As fotos em que você reagir aparecem aqui.')}</div><section class="stack-2" aria-labelledby="gx-cfg"><h2 class="gx-cfgh" id="gx-cfg">Configurações</h2><div class="list">${row(B(s) + '/minhas', 'image', 'Minhas fotos e fila de envio', plural(mine.length, 'foto', 'fotos'))}${row(B(s) + '/consentimento', 'shield', 'Meu consentimento', 'Termo versão ' + se.consent.versao)}${btn('g-ajuda', 'help', 'Ajuda')}</div></section>${nb ? `<section class="stack-2" id="bloqueados"><h2 class="t-title" style="font-size:var(--fs-xl)">Pessoas bloqueadas</h2>${get(s, 'bloqueados', []).map((id) => `<div class="gx-q"><span class="avatar" aria-hidden="true">${A.esc(authorOf(s, id).ini)}</span><div class="grow"><b>${A.esc(authorOf(s, id).nome)}</b></div><button class="btn btn-line" data-act="g-desbloquear" data-id="${id}">Desbloquear</button></div>`).join('')}</section>` : ''}</div>` });
    out.after = (root) => {
      const tl = A.$('.gx-ptabs', root); if (!tl) return;
      tl.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
        const tabs = A.$$('.gx-ptab', tl); const i = tabs.indexOf(document.activeElement); const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); n.click();
      });
    };
    return out;
  });
  A.acts['g-ptab'] = (el) => { const root = el.closest('.gx-pf'); A.$$('.gx-ptab', root).forEach((b) => { const on = b === el; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }); A.$$('[data-ppanel]', root).forEach((pn) => { pn.hidden = pn.dataset.ppanel !== el.dataset.tab; }); };
  A.acts['g-nome'] = () => { const s = curSlug(); sheet({ title: 'Seu nome na festa', body: `<form data-submit="g-nome-ok" class="stack" novalidate><div class="field"><label for="gx-n2">Seu primeiro nome</label><input class="input input-sign" id="gx-n2" name="nome" value="${A.esc(sess(s).nome)}" required aria-required="true" maxlength="24" aria-describedby="gx-n2-e"><span class="err" id="gx-n2-e" role="alert"></span></div><button class="btn btn-primary" type="submit">Salvar</button></form>` }); };
  A.acts['g-nome-ok'] = (form) => { const s = curSlug(); const out = A.validate(form, { nome: (v) => (v.length < 2 ? 'Use pelo menos 2 letras.' : '') }); if (!out) return; upd(s, 'sessao', (x) => ({ ...x, nome: out.nome }), {}); form.closest('.modal').querySelector('[data-mclose]').click(); rerender(); toast('Nome atualizado. Suas fotos passam a mostrar o novo nome.'); };
  A.acts['g-compartilhar-album'] = () => { const s = curSlug(); const url = `albora.app/g/p/${s}`; (navigator.clipboard ? navigator.clipboard.writeText('https://' + url) : Promise.reject()).catch(() => {}); toast('Link da página da festa copiado. Ela não mostra fotos de convidados.'); };
  A.acts['g-ajuda'] = () => { const s = curSlug(); sheet({ title: 'Ajuda', body: `<div>${GX.faq.map(([q, a]) => `<details class="gx-det ds-fold b-baixo"><summary>${A.esc(q)}</summary><div class="ds-fold-b"><p>${A.esc(a.replace('${marco}', marco(s)))}</p></div></details>`).join('')}</div><p class="gx-note" style="margin-top:12px">Ainda com dúvida? Fale com ${A.esc(anf(s))}, na festa.</p>`, actions: [{ label: 'Fechar', variant: 'btn-primary' }] }); };

  A.route('/g/:slug/recuperar', (ctx) => {
    const s = ctx.params.slug || 'marina-rafael'; const ev = evOf(s); const ja = !!sess(s);
    const field = (tipo, id, label, ph, extra = '') => `<form data-submit="g-rec-ok" data-slug="${s}" data-tipo="${tipo}" class="stack" novalidate><div class="field"><label for="${id}">${label}</label><input class="input input-sign" id="${id}" name="${tipo === 'link' ? 'link' : 'cod'}" required aria-required="true" placeholder="${ph}" autocomplete="off" autocapitalize="off" ${extra} aria-describedby="${id}-e"><span class="err" id="${id}-e" role="alert"></span></div><button class="btn btn-accent btn-lg" type="submit">${A.icon('refresh', 18)} Recuperar minhas fotos</button></form>`;
    const body = `<div class="gx-pad stack gx-sign gx-rec"><section class="gx-rec-h" data-theme="noite"><span class="gx-eyebrow">Sem senha, sem e-mail</span><h2 class="gx-name">Trocou de celular?</h2><p>Traga suas fotos para este aparelho com o seu link pessoal ou com um código do aparelho antigo.</p></section>${ja ? `<div class="banner ok" role="status">${A.icon('check', 20)}<div>Você já está dentro da festa neste aparelho. <a class="link" href="${B(s)}/explorar">Ver o feed</a></div></div>` : ''}<div class="gx-ptabs" role="tablist" aria-label="Como recuperar"><button class="gx-rtab" role="tab" id="gx-rt-l" aria-selected="true" aria-controls="gx-rp-l" data-act="g-rec-tab" data-tab="link" data-rtab="link">Link pessoal</button><button class="gx-rtab" role="tab" id="gx-rt-c" aria-selected="false" tabindex="-1" aria-controls="gx-rp-c" data-act="g-rec-tab" data-tab="cod" data-rtab="cod">Código de 4 dígitos</button></div><div role="tabpanel" id="gx-rp-l" aria-labelledby="gx-rt-l" data-rpanel="link" class="stack"><p class="muted">É o link que aparece em Perfil, Minhas fotos, Guardar minhas fotos. Cole aqui.</p>${field('link', 'gx-rl', 'Seu link pessoal', 'albora.app/g/meu-…')}<p class="gx-note">No protótipo, qualquer link que comece com meu- funciona. Gere o seu em Minhas fotos.</p></div><div role="tabpanel" id="gx-rp-c" aria-labelledby="gx-rt-c" data-rpanel="cod" class="stack" hidden><ol class="gx-steps"><li><span>1</span>No aparelho antigo, abra Perfil e toque em Levar a festa no app.</li><li><span>2</span>Toque em Gerar código.</li><li><span>3</span>Digite aqui os 4 números. Ele vale por 15 minutos.</li></ol>${field('cod', 'gx-rc', 'Código de 4 dígitos', '0000', 'inputmode="numeric" maxlength="4"')}</div><p class="gx-note">Seu primeiro nome e o aceite do uso das fotos voltam junto. Nada de senha, e-mail ou SMS.</p></div>`;
    return page(ctx, { title: 'Recuperar minhas fotos', nav: false, back: ja ? `${B(s)}/perfil` : B(s), body });
  });
  A.acts['g-rec-tab'] = (el) => {
    const t = el.dataset.tab;
    A.$$('[data-rtab]').forEach((b) => { const on = b.dataset.rtab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    A.$$('[data-rpanel]').forEach((x) => { x.hidden = x.dataset.rpanel !== t; });
  };
  A.acts['g-rec-ok'] = (form) => {
    const s = form.dataset.slug; const tipo = form.dataset.tipo; const pr = get(s, 'pareamento', null);
    const rules = tipo === 'link'
      ? { link: (v) => (!/(^|\/)meu-[a-z0-9]+\/?$/i.test(v.trim()) ? 'Não reconheci esse link. Ele termina com meu- e letras ou números.' : '') }
      : { cod: (v) => (!/^\d{4}$/.test(v) ? 'Digite os 4 números.' : !pr ? 'Gere um código no aparelho antigo, em Perfil e Levar a festa no app.' : pr.ate < Date.now() ? 'Esse código venceu. Gere outro no aparelho antigo.' : v !== pr.codigo ? 'Código não confere. Confira os números e tente de novo.' : '') };
    const out = A.validate(form, rules); if (!out) return;
    const base = get(s, 'sessao', null) || { id: 'me', nome: 'Convidado', consent: { versao: GX.termo.versao, em: new Date().toISOString() }, entrou: Date.now() };
    set(s, 'sessao', base); if (tipo === 'cod') set(s, 'pareamento', null);
    toast('Pronto. Suas fotos voltaram para este aparelho (simulado).'); A.go(`${B(s)}/perfil`);
  };

  A.route('/g/:slug/app', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const ev = evOf(s); const app = get(s, 'app', null); const p = get(s, 'pareamento', null); const valido = p && p.ate > Date.now();
    const rest = valido ? Math.max(0, (p.ate - Date.now()) / (15 * 60000)) : 0;
    const pairBox = app ? `<div class="banner ok" role="status">${A.icon('check', 20)}<div>O app está ligado a este aparelho desde ${hhmm(app.em)}.<br><button class="link" data-act="g-despar">Desligar o app</button></div></div>` : `<section class="stack" aria-labelledby="gx-pc"><h2 class="t-title" id="gx-pc">Ligar o app a esta festa</h2>${valido ? `<div class="gx-pair"><div class="gx-code" aria-label="Código ${p.codigo.split('').join(' ')}">${p.codigo}</div>${A.arc(rest, 170, 'Tempo restante do código')}<p class="t-small">Vale até ${hhmm(p.ate)}. Serve para um aparelho só.</p></div>` : '<p class="muted">O código de 4 dígitos liga o app a esta festa sem login. Ele vale por 15 minutos.</p>'}<div class="flex"><button class="btn btn-accent" data-act="g-gerar" style="flex:1">${valido ? 'Gerar outro código' : 'Gerar código'}</button>${valido ? `<button class="btn btn-line" data-act="g-copiar-cod" data-c="${p.codigo}">Copiar</button>` : ''}</div></section>`;
    const sim = app ? '' : `<section class="gx-rule stack" aria-labelledby="gx-sim"><h2 class="t-h" id="gx-sim">Simulador do app (só no protótipo)</h2><p class="muted">No app, você toca em Já tenho um código e digita os 4 números.</p><form data-submit="g-app-parear" class="stack" novalidate><div class="field"><label for="gx-cd">Código de 4 dígitos</label><input class="input input-sign gx-pin" id="gx-cd" name="cod" required aria-required="true" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000" aria-describedby="gx-cd-e"><span class="err" id="gx-cd-e" role="alert"></span></div><button class="btn btn-line" type="submit">Ligar o app</button></form><p class="gx-note">No app real não existe login: o código é a única identificação.</p></section>`;
    return page(ctx, { title: 'Levar a festa no app', active: 'perfil', back: `${B(s)}/perfil`, body: `<div class="gx-pad stack"><section class="gx-apph" data-theme="noite"><span class="gx-eyebrow">App opcional</span><h2 class="gx-name">Leve a festa no bolso</h2><p>Ele guarda suas fotos no celular, envia com a tela bloqueada e mostra o álbum de ${A.esc(ev.nome)}.</p></section>${pairBox}${sim}<button class="link" data-act="g-pwa" style="align-self:flex-start">Prefiro instalar na tela inicial, sem loja</button><div class="list"><a class="li is-link" href="${B(s)}/fila">${A.icon('upload', 20)}<span class="grow">Fila de envio<span class="t-small" style="display:block">Tela que o app mostra para reenviar fotos</span></span>${A.icon('chevron', 16)}</a></div></div>` });
  });
  A.acts['g-gerar'] = () => { const s = curSlug(); set(s, 'pareamento', { codigo: String(Math.floor(1000 + Math.random() * 9000)), ate: Date.now() + 15 * 60000 }); rerender(); toast('Código novo. O anterior parou de valer.'); };
  A.acts['g-copiar-cod'] = (el) => { (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.c) : Promise.reject()).catch(() => {}); toast('Código copiado.'); };
  A.acts['g-app-parear'] = (form) => {
    const s = curSlug(); const p = get(s, 'pareamento', null);
    const out = A.validate(form, { cod: (v) => (!/^\d{4}$/.test(v) ? 'Digite os 4 números.' : !p ? 'Gere um código na tela do navegador primeiro.' : p.ate < Date.now() ? 'Esse código venceu. Gere outro.' : v !== p.codigo ? 'Código não confere. Confira os números e tente de novo.' : '') });
    if (!out) return; set(s, 'app', { em: Date.now() }); set(s, 'pareamento', null); rerender(); toast('App ligado a esta festa (simulado).');
  };
  A.acts['g-despar'] = () => { const s = curSlug(); const bak = get(s, 'app', null); set(s, 'app', null); rerender(); toast('App desligado deste aparelho.', { undo: () => { set(s, 'app', bak); rerender(); } }); };
  A.acts['g-pwa'] = () => sheet({ title: 'Instalar na tela inicial', body: `<div class="stack"><p><b>iPhone:</b> toque em Compartilhar, depois em Adicionar à Tela de Início.</p><p><b>Android:</b> toque em Instalar na tela inicial quando o navegador oferecer, ou abra o menu e escolha Instalar app.</p><p class="gx-note">Simulado: o protótipo não instala nada de verdade.</p></div>`, actions: [{ label: 'Entendi', variant: 'btn-primary' }] });

  /* ---------------------------------------------------------------- 9. compartilhar fora da festa */
  A.route('/g/:slug/compartilhar', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug;
    if (!gateOpen(s)) return page(ctx, { title: 'Compartilhar fora', active: 'explorar', back: `${B(s)}/explorar`, body: stateScreen({ title: 'Ainda não dá para compartilhar fora', body: `Compartilhar abre depois d${marco(s).replace(/^(a|o) /, '$1 ')}, às ${gateHora(s)}. Até lá a festa fica entre quem está nela.`, tag: 'h2', cta: `<a class="btn btn-accent" href="${B(s)}/explorar">Voltar às fotos</a>` }) });
    const p = (ctx.q.foto && photoById(s, ctx.q.foto)) || allPhotos(s)[0]; const sh = { fmt: '916', mold: 'polaroide', nome: true, ...get(s, 'share', {}) }; const nome = sess(s).nome;
    const chip = (k, v, l) => `<button class="chip" data-act="g-share-set" data-k="${k}" data-v="${v}" aria-pressed="${String(sh[k]) === v}">${l}</button>`;
    return page(ctx, { title: 'Compartilhar fora', active: 'explorar', back: `${B(s)}/explorar`, body: `<div class="gx-pad stack"><div class="gx-sh f-${sh.fmt} m-${sh.mold}" role="img" aria-label="Prévia da imagem para compartilhar"><div class="gx-sh-in">${fx(p.src, p.filtro, p.inten, '', sh.mold === 'polaroide' ? '' : 'cover')}${sh.nome ? `<span class="nm">${A.esc(nome)}</span>` : ''}</div></div><section aria-label="Formato"><div class="t-small" style="margin-bottom:var(--space-2)">Formato</div><div class="chips" data-single="1">${chip('fmt', '916', 'Story 9:16')}${chip('fmt', '45', 'Feed 4:5')}${chip('fmt', '11', 'Quadrado')}</div></section><section aria-label="Moldura"><div class="t-small" style="margin-bottom:var(--space-2)">Moldura</div><div class="chips">${chip('mold', 'polaroide', 'Polaroide')}${chip('mold', 'ambiente', 'Ambiente')}${chip('mold', 'cheia', 'Cheia')}</div></section><label class="gx-check"><input type="checkbox" data-change="g-share-nome" ${sh.nome ? 'checked' : ''}><span>Incluir meu primeiro nome na moldura</span></label><p class="gx-note">Ao compartilhar, a imagem sai da festa. Quem receber vê as pessoas que aparecem nela. Termo versão ${sess(s).consent.versao}.</p><div class="stack-2"><button class="btn btn-accent" data-act="g-share-go">${A.icon('share', 18)} Compartilhar</button><button class="btn btn-quiet" data-act="g-share-dl">${A.icon('download', 18)} Baixar imagem</button></div></div>` });
  });
  A.acts['g-share-set'] = (el) => { const s = curSlug(); upd(s, 'share', (o) => ({ ...o, [el.dataset.k]: el.dataset.v }), {}); rerender(); };
  A.inputs['g-share-nome'] = (el) => { const s = curSlug(); upd(s, 'share', (o) => ({ ...o, nome: el.checked }), {}); rerender(); };
  /* exportação real: composição em canvas (moldura, filtro e nome), sem metadados de localização por construção (PNG novo) */
  const shareBlob = async (s) => {
    const p = (photoById(s, new URLSearchParams((location.hash.split('?')[1] || '')).get('foto')) || allPhotos(s)[0]);
    if (!p || VIDSRC.has(p.src)) throw new Error('video');
    const sh = { fmt: '916', mold: 'polaroide', nome: true, ...get(s, 'share', {}) }; const nome = sess(s).nome;
    const [W, H] = sh.fmt === '916' ? [1080, 1920] : sh.fmt === '45' ? [1080, 1350] : [1080, 1080];
    const img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = p.src; });
    const css = (v, d) => (getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d);
    const papel = css('--papel', 'white'), noite = css('--noite', 'black');
    try { await document.fonts.load('400 44px Fraunces'); } catch { /* usa a fonte reserva */ }
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const pre = PRE.find((q) => q.id === p.filtro);
    const desenha = (dx, dy, dw, dh, cover) => {
      const k = cover ? Math.max(dw / img.width, dh / img.height) : Math.min(dw / img.width, dh / img.height); const w = img.width * k, h = img.height * k; const ox = dx + (dw - w) / 2, oy = dy + (dh - h) / 2;
      x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); x.drawImage(img, ox, oy, w, h);
      if (pre && pre.f && 'filter' in x) { x.filter = pre.f; x.globalAlpha = (p.inten ?? 100) / 100; x.drawImage(img, ox, oy, w, h); }
      x.restore();
    };
    x.fillStyle = sh.mold === 'polaroide' ? papel : noite; x.fillRect(0, 0, W, H);
    if (sh.mold === 'polaroide') desenha(60, 60, W - 120, H - 240, false);
    else if (sh.mold === 'ambiente') desenha(0, 0, W, H, false);
    else desenha(0, 0, W, H, true);
    if (sh.nome) {
      x.font = '400 44px Fraunces, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (sh.mold === 'polaroide') { x.fillStyle = noite; x.fillText(nome, W / 2, H - 100); }
      else { const w = x.measureText(nome).width + 72; x.globalAlpha = 0.55; x.fillStyle = noite; x.beginPath(); x.roundRect(W / 2 - w / 2, H - 150, w, 76, 38); x.fill(); x.globalAlpha = 1; x.fillStyle = papel; x.fillText(nome, W / 2, H - 112); }
    }
    return { blob: await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('png'))), 'image/png')), ext: 'png' };
  };
  const shareErr = (e) => toast(e.message === 'video' ? 'Vídeo não vira imagem. Escolha uma foto para compartilhar.' : 'Não consegui montar a imagem. Tente outra foto.', { kind: 'bad' });
  A.acts['g-share-dl'] = async () => {
    try { const { blob } = await shareBlob(curSlug()); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'albora-foto.png'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Imagem salva, sem localização.'); }
    catch (e) { shareErr(e); }
  };
  A.acts['g-share-go'] = async () => {
    try {
      const { blob } = await shareBlob(curSlug()); const file = new File([blob], 'albora-foto.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Albora' }).catch((e) => { if (e.name !== 'AbortError') throw e; }); return; }
      toast('Este navegador não abre o compartilhar com imagem. Use Baixar imagem.');
    } catch (e) { shareErr(e); }
  };

  /* ---------------------------------------------------------------- 10. fila de envio (web e app nativo) */
  A.route('/g/:slug/fila', (ctx) => {
    const g = guard(ctx); if (g) return g; const s = ctx.params.slug; const l = uploads(s).filter((u) => ['fila', 'enviando', 'falhou'].includes(u.status)); const off = get(s, 'offline', false); const falhar = get(s, 'falhar', false);
    const content = A.stateful({
      isEmpty: () => !l.length, empty: A.emptyState({ icon: 'check', title: 'Nada pendente', body: 'Tudo o que você mandou já chegou aos anfitriões. Pode fechar.', cta: `<a class="btn btn-line" href="${B(s)}/minhas">Ver minhas fotos</a>` }),
      loading: A.skel(3, 70), error: A.errorState({ body: 'Não consegui ler a fila agora. As fotos continuam guardadas no celular.' }),
      ok: () => `<div>${l.map((u) => `<div class="gx-q"><span class="th">${fx(u.src, u.filtro, u.inten, '', 'cover')}</span><div class="grow"><b>Foto${u.legenda ? ': ' + A.esc(u.legenda.slice(0, 28)) : ''}</b><div><span class="gx-badge ${qTone(u)}">${A.esc(qLabel(u, off))}</span></div>${u.motivo ? `<div class="t-small">${A.esc(u.motivo)}</div>` : ''}</div>${u.status === 'falhou' ? `<div class="gx-qa"><button class="btn btn-line" data-act="g-retry" data-id="${u.id}">${A.icon('refresh', 18)} Tentar de novo</button><button class="btn btn-quiet" data-act="g-descartar-fila" data-id="${u.id}">${A.icon('trash', 18)} Apagar da fila</button></div>` : ''}</div>`).join('')}</div>${l.length ? `<button class="btn btn-accent btn-block" style="margin-top:var(--space-4)" data-act="g-retry-all" ${off ? '' : ''}>${A.icon('refresh', 18)} Tentar agora</button>` : ''}`,
    });
    return page(ctx, { title: 'Fila de envio', active: 'camera', back: `${B(s)}/camera`, body: `<div class="gx-pad stack">${off ? `<div class="gx-offcard">${A.mascot(96, 'mascote')}<div><h2 class="t-title" style="font-size:22px">Sem sinal, sem problema</h2><p class="muted">As fotos ficam guardadas no celular e sobem sozinhas quando o sinal voltar.</p></div></div>` : l.length ? '<p class="muted">Enviando uma de cada vez. Pode usar o celular normalmente.</p>' : ''}${content}<section class="gx-rule stack-2" aria-labelledby="gx-sm"><h2 class="t-h" id="gx-sm">Teste a fila (só no protótipo)</h2><div class="flex between"><span id="gx-l1">Sem sinal</span><button class="switch" role="switch" aria-checked="${off}" aria-labelledby="gx-l1" data-act="g-offline"></button></div><div class="flex between"><span id="gx-l2">O próximo envio falha</span><button class="switch" role="switch" aria-checked="${falhar}" aria-labelledby="gx-l2" data-act="g-falhar"></button></div><div class="flex between"><span id="gx-l3">O próximo comentário falha</span><button class="switch" role="switch" aria-checked="${get(s, 'falharCm', false)}" aria-labelledby="gx-l3" data-act="g-falhar-cm"></button></div><div class="flex between"><span id="gx-l4">A próxima reação falha</span><button class="switch" role="switch" aria-checked="${get(s, 'falharRx', false)}" aria-labelledby="gx-l4" data-act="g-falhar-rx"></button></div></section><section class="stack-2"><h2 class="t-h">No app instalado</h2><p class="muted">O app continua enviando em segundo plano, mesmo com a tela bloqueada. O sistema do celular pode limitar isso para poupar bateria. Aqui isso é só descrito.</p><a class="link" href="${B(s)}/app" style="align-self:flex-start">Levar a festa no app</a></section></div>` });
  });

  /* ---------------------------------------------------------------- mapa do protótipo e ⌘K */
  const M = (l, h, n) => A.map('Convidado (celular, escuro)', l, h, n);
  M('Entrada: capa do evento', '#/g/marina-rafael', 'Sem login; depois nome + consentimento numa tela');
  M('Entrada: nome e consentimento', '#/g/marina-rafael?passo=nome', 'Termo versionado e datado');
  M('Câmera e captura', '#/g/marina-rafael/camera', 'Editor, fila e confirmação saem daqui');
  M('Explorar: fotos e histórias', '#/g/marina-rafael/explorar', 'Espelho antes da hora, feed depois (chave Estilo)');
  M('Missões', '#/g/marina-rafael/missoes', 'Progresso e numeração romana');
  M('Álbum', '#/g/marina-rafael/album', 'Por momento');
  M('Minhas fotos', '#/g/marina-rafael/minhas', 'Excluir, estados da fila');
  M('Música: pedir e votar', '#/g/marina-rafael/musica', 'Lista fechada');
  M('Recado dos anfitriões', '#/g/marina-rafael/recado', 'Texto e áudio simulado');
  M('Confessionário', '#/g/marina-rafael/confissionario', 'Texto e áudio simulado');
  M('Perfil', '#/g/marina-rafael/perfil', 'Nome, app, consentimento, ajuda');
  M('Levar a festa no app', '#/g/marina-rafael/app', 'Código de 4 dígitos e simulador do app');
  M('Recuperar minhas fotos', '#/g/marina-rafael/recuperar', 'Trocou de celular: link pessoal ou código de 4 dígitos, sem senha');
  M('Fila de envio (app nativo)', '#/g/marina-rafael/fila', 'Sem sinal e retry');
  M('Meu consentimento / revogar', '#/g/marina-rafael/consentimento', 'Apaga tudo');
  M('Compartilhar fora da festa', '#/g/marina-rafael/compartilhar', 'Molduras e formatos simulados');
  M('Perfil de outro convidado', '#/g/marina-rafael/p/g0', 'Sem placar de curtidas');
  M('Scanner de QR de resgate', '#/g/scan', 'Simulado, com código manual');
  M('Entrega: link com fotos (ok)', '#/g/entrega/tk-ana-8f3k', 'Também: vazio, expirado, inválido');
  M('Entrega: link expirado', '#/g/entrega/tk-expirado-77ab', '');
  M('Entrega: sem fotos', '#/g/entrega/tk-vazio-2a9d', '');
  M('Entrega: link inválido', '#/g/entrega/xyz', '');
  M('Página pública do evento', '#/g/p/marina-rafael', 'Sem miniaturas de convidados');
  M('Estado: festa encerrada', '#/g/lu-40', 'Resolvedor de link');
  M('Estado: ainda não começou', '#/g/direito-2026', 'Resolvedor de link');
  M('Estado: endereço inexistente', '#/g/zzz', 'Resolvedor de link');
  M('Estado: código trocado', '#/g/lu-40-velho', 'Resolvedor de link');
})();
