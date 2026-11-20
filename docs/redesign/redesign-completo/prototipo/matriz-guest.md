# Matriz de cobertura: superfície do convidado (web + app nativo)

Módulo: `guest.js`. Rotas do protótipo em `#/g/...`. Fonte do inventário: `../inventario/B-convidado-telao-app.md` (Partes 1, 2 e 3; o telão e o pareamento do telão ficam no módulo `wall.js`).
Legenda de implementação: **Funcional** (muda estado persistido e reflete nas outras telas), **Simulado** (comportamento explícito, rotulado na tela), **Depende de integração** (só existe com serviço real; no protótipo há um substituto rotulado).
Slugs fictícios: `marina-rafael` (aberto), `lu-40` (encerrado), `direito-2026` (ainda não começou), `zzz` (inexistente), `lu-40-velho` (código trocado).
Observação de dados (revisão de arte): quando `A.data.photos` não tem fotos aprovadas (fase "Antes"), Explorar, Álbum, entrega e perfis usam 24 fotos de demonstração geradas localmente com `A.photo`, rotuladas na tela como exemplo do protótipo. O estado "vazio" continua no controle de estado.

## Parte 1: web do convidado

### Transversal (A §0)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Resolvedor de link: slug inexistente | `/e/[slug]` not-found | `#/g/zzz` | Funcional | Mantém o botão "Escanear o QR" e acrescenta campo de código na mesma tela. |
| Resolvedor: rascunho | `/e/[slug]` EventNotice | não coberto como estado próprio | Simulado | Ver "Lacunas". Rascunho aparece como "Ainda não começou" quando a data é futura. |
| Resolvedor: código trocado (slug rotacionado) | EventNotice + RescueScanner | `#/g/lu-40-velho` | Funcional | Código da mesa digitável na própria tela de aviso. |
| Resolvedor: encerrado | EventNotice "Essa festa já foi" | `#/g/lu-40` | Funcional | Passa a oferecer saída útil: link de entrega e página da festa. A fase "Depois" do e1 também encerra. |
| Resolvedor: ainda não começou | EventNotice + EventCountdown | `#/g/direito-2026` | Funcional | Mostra data, hora e "Faltam N dias" (texto estático, sem contagem ao vivo). |
| Subrotas com mensagem genérica "Essa festa não está aberta" | todas as subrotas | todas as rotas `#/g/:slug/*` passam pelo mesmo resolvedor | Funcional | **Corrigido**: a causa (encerrada, não começou, trocado) aparece em qualquer rota. |
| Subrotas sem checar sessão do mesmo evento (risco de cruzar eventos) | subrotas | sessão guardada por slug (`g:<slug>:sessao`) | Funcional | **Corrigido por construção**: a sessão de um evento nunca vale em outro. |
| Sem sessão: `NoSession` com emoji | `NoSession` | "Falta você entrar" com ícone SVG e botão para nome + consentimento | Funcional | Sem emoji. |
| Layout com tema do evento | `/e/[slug]/layout` | `A.guestShell` (escuro) + cor do evento só como acento | Funcional | Chão sempre escuro; identidade do casal só no acento (`--ev`). |
| `FloatingNav` (Início, Explorar, câmera, Missões, Perfil) | rótulos de 9 px | barra do núcleo: Explorar, Missões, câmera, Perfil | Funcional | Início e Explorar viram um destino só (Explorar). Álbum, Música, Recado vivem dentro de Explorar e Perfil. Rótulos de 11 px (do núcleo). |
| Cabeçalho sem voltar (`GuestHeader`) | link só no hover | `gx-top` com seta Voltar de 48 px em toda tela interna | Funcional | Voltar sempre leva ao pai lógico, não à capa. |
| `BottomSheet` com `<dialog>` | ui-web | `A.modal` com foco preso, Esc fecha, devolve foco | Funcional | Toast e menus recebem tema escuro para ficarem por cima do sheet. |
| Toast e `LiveAnnouncer` | ui-web | `A.toast` (`role=status`) com tema escuro | Funcional | |
| `OfflineBanner` (`aria-live=assertive`) | layout | faixa fixa sob o cabeçalho com `role=status` (educado) | Simulado | Acionada pelo alternador "Sem sinal". Só aparece com sessão (a promessa só vale com fila). |
| `RouteAnnouncer` | layout | foco no `h1` a cada rota (núcleo) | Funcional | |
| PWA manifest (`start_url=/cover`) | `manifest.ts` | não se aplica no protótipo | Depende de integração | Instalar na tela inicial é descrito em sheet (ver Perfil › app). |
| Título do evento diferente entre telas (pack × `evento.title`) | Home/Feed | sempre `ev.nome` | Funcional | **Corrigido**. |
| Textos de 9 a 11 px, emojis como ícone, coração no card | várias | corpo 14 a 15 px, rótulos 11,5 px só em legendas, ícones SVG, sem coração | Funcional | Reação usa ícone de rosto e lista fechada de quatro palavras. |
| `IdentitySheet` órfão (nome + consentimento tardio) | código morto | substituído pela tela única de entrada | n/a | Removido: o consentimento acontece antes da câmera, nunca depois. |

### Entrada e capa (A §1, §2)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Chegada: capa, "Você foi convidado para", data e local, "Entrar na festa" | `/e/[slug]` ArrivalScreen | `#/g/marina-rafael` | Funcional | Data e local já vêm no primeiro render (sem salto). Sem app, sem cadastro, sem senha. |
| Identidade: nome | EntryFlow `identidade` | `#/g/marina-rafael?passo=nome` | Funcional | Nome e consentimento na **mesma tela**, validação inline (2 a 24 letras). |
| Consentimento versionado e datado | checkbox **pré-marcado** | checkbox **desmarcado** + sheet "Uso das suas fotos" | Funcional | **Corrigido**: aceite explícito. Guarda versão do termo e data/hora (`g:<slug>:sessao.consent`), visíveis em Perfil › Meu consentimento. |
| Rótulo "Versão v1 · 24 de outubro" (jargão) | EntryFlow | "Termo versão 2, de 20 de outubro de 2026" em letra miúda | Funcional | Texto em linguagem comum; o formato "versão" só aparece pequeno. |
| Recusa ("Prefiro não") | beco sem saída | `?passo=recusa` | Funcional | Explica o que significa não aceitar e oferece voltar ou ver a página pública. |
| Erros de rede/limite na entrada | mensagens da API | não aplicável | Depende de integração | Só há erro de validação local. |
| Prefill do nome (`albora:nome`) | EntryFlow | não implementado | n/a | Ver "Lacunas". |
| Capa pós-entrada (herói, nome, "N pessoas fotografando") | `/e/[slug]/cover` | consolidada em Explorar | n/a | Duas homes viraram uma. Quem tem sessão e abre o link cai direto em Explorar; quem acabou de entrar vai direto à câmera. |
| Banner do gate (texto do pack, horário) | cover | Explorar (modo espelho) | Funcional | Lê a chave `gateAberto:<slug>`. |
| Recado dos anfitriões na capa | cover | anel "Recado" no trilho de Explorar + `#/g/marina-rafael/recado` | Funcional | O recado deixou de aparecer em três lugares. |
| Quatro atalhos (Álbum, Feed, Missões, Música) | cover | Álbum e Fotos em abas de Explorar; Missões na barra; Música no Perfil | Funcional | Rótulos "em breve" enganosos eliminados. |
| "Ligar telão" no convidado | cover | removido | n/a | Ação de operador fora da superfície do convidado (ver módulo do telão). |
| `MomentsSection` (momentos do pack) | cover | chips de momento em Explorar e Álbum; seletor "Momento" no editor | Funcional | Filtro real aplicado à lista. |
| "Enviar foto" no fim da página | cover | botão central da barra, sempre visível | Funcional | |
| `InviteButton` ("Convidar amigos" com link de entrada) | cover | Perfil › "Compartilhar a página da festa" | Simulado | O link copiado é o da **página pública** (`#/g/p/:slug`), sem fotos de convidados. |

### Explorar: feed, stories, reações, comentários (A §4, §11)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Modo espelho (gate fechado) | `/feed` MirrorGrid | `#/g/marina-rafael/explorar` com gate fechado | Funcional | Grade de duas colunas, só leitura, banner do horário. Controlado por `gateAberto:<slug>` (o anfitrião muda em Estilo). Padrão: fechado na fase "Antes", aberto nas outras. |
| Modo completo (gate aberto) | `/feed` | mesma rota com gate aberto | Funcional | Feed vertical com foto inteira (nunca recorta: `object-fit: contain`). "Ver mais" em vez de rolagem infinita. |
| Reação | estrela única, só no completo | botão Reagir com lista fechada de quatro (Amei, Rindo, Emocionou, Boa foto) | Funcional | **Mudou de fluxo**: antes do gate também não há reação (segue o `CLAUDE.md`: antes do gate só espelho). Persistido por foto. | Revisão de arte: reações viram linha de texto com contagem por reação (lista fechada), sem botões-cartão.
| "Quem curtiu" (`ReactionListSheet`) | PhotoInteraction | removido; só contagem de reações | n/a | Placar social com nomes viola o princípio de não ter ranking de popularidade. |
| `TemporalFilter` e `HourStrip` | feed completo | chips de momento (Chegada a Despedida) + "Minhas" | Funcional | Filtro de verdade sobre toda a lista, não só a página carregada. |
| `FeedFilterPanel` (missões) | feed completo | consolidado nos mesmos chips | n/a | Um filtro só. |
| `PhotoInteraction`: comentar | só no completo | botão de comentário com contagem | Funcional | Trancado com explicação antes do gate (sem botão morto). |
| `CommentSheet` | feed | sheet de comentários (lista, compor, contador de 280, erro inline) | Funcional | Comentário feito sem sinal fica "na fila" e sobe quando volta. |
| Remover meu comentário | CommentSheet | menu ⋯ do comentário | Funcional | Aplica e oferece "Desfazer". |
| Denunciar comentário / bloquear autor do comentário | menu ⋯ do comentário | mesmo menu | Funcional (denúncia simulada) | Denúncia grava e confirma por toast; bloqueio pede confirmação e tem "Desfazer". |
| Menu único ⋯ por foto | só pós-gate; botões mortos na Home | menu com Compartilhar fora, Denunciar, Bloquear {nome}, Remover minha foto | Funcional | **Corrigido**: um único menu, igual em Explorar, Álbum, viewer e perfil; Denunciar e Remover valem também com o gate fechado. |
| `ReportSheet` | feed/álbum | "Denunciar esta foto": motivo, "Sou eu nessa foto" (oculto na minha) | Funcional | Falha não é mais silenciosa: sempre há confirmação. Álbum deixa de usar o rótulo "Pedir para tirar". |
| Bloquear | só no comentário e na denúncia | menu ⋯, perfil de outro convidado, lista em Perfil | Funcional | Confirmação com consequência escrita, "Desfazer" e tela de gestão (Perfil › Pessoas bloqueadas). |
| `ShareConsentSheet` + `MolduraPicker` | my-photos | `#/g/marina-rafael/compartilhar` | Simulado | Formatos (Story, Feed, Quadrado), molduras (Polaroide, Ambiente, Cheia), nome opcional. O envio e o download são simulados e rotulados. Trancado antes do gate. |
| `GateOpenedOverlay` ("A festa está liberada") | feed, 6 s | faixa "A conversa abriu" ao abrir Explorar depois da virada do gate | Funcional | Faixa fixa até a próxima visita, `role=status`, sem emoji e sem sumir sozinha. |
| `NewPhotosButton` ("Novas fotos") | feed | não implementado | n/a | Ver "Lacunas". |
| `Viewer` tela cheia | feed/Home/Perfil | sheet com foto inteira, autor, legenda, ações, Anterior/Próxima e setas do teclado | Funcional | Foco preso, Esc fecha, sem auto-avanço (pausa por padrão: a leitura é do convidado). |
| Stories (`StoryRail`, `StoryViewer`) | Home | trilho no topo de Explorar: Você, Recado, autores recentes | Funcional | "Visto" persistido; abre o viewer com as fotos do autor. Sem avanço automático. |
| `HostMessageCard` | cover/feed | ver Recado | Funcional | |
| Estados: carregando, vazio, erro, mídia indisponível | skeleton/empty/error | `A.stateful` + barra do protótipo | Funcional | Erro oferece "Tentar de novo" e diz que as fotos próprias continuam guardadas. |
| Sessão expirada (3 textos diferentes) | feed/álbum/música | um texto só ("Falta você entrar") | Funcional | |

### Missões (A §6)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Progresso | barra sem `progressbar` | filete com `role=progressbar` e "N de M missões" | Funcional | |
| Missão atual em destaque | card com emoji | numeral romano grande + título + "Fotografar" | Funcional | Uma numeração só (romana na lista, contagem em texto). |
| Lista "Outras missões" (listava a atual e as feitas) | `/missions` | "Todas as missões" com Feita/Pendente | Funcional | Título honesto; feitas permitem desmarcar. |
| Concluir | só pela câmera | foto com missão marca ao **subir**; botão visto "marcar como feita" com Desfazer | Funcional | A missão só vale quando a foto chega (antes valia ao enfileirar). |
| `CelebrationOverlay` (tela cheia + partículas) | allDone | faixa discreta "Você fez todas as missões" | Funcional | **Removido**: recompensa discreta; não repete a cada visita. |
| `MissionCompletionToast` | missions | linha "Missão III feita" + filete na confirmação da foto | Funcional | |
| Modo livre / "Fotografar sem missão" | missions | "Sem missão" no editor; "Tirar outra, sem missão" na confirmação | Funcional | |
| `localStorage` de missões global (não escopado) | missions | chave `g:<slug>:missoes` por evento | Funcional | **Corrigido**. |

### Álbum, Minhas fotos, perfil de outro convidado (A §5, §10, §12)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Álbum em capítulos por hora | `/album` | `#/g/marina-rafael/album`: seções por momento + filtro | Funcional | Contadores em texto ("32 fotos · 21 pessoas · 1 missão feita"). Miniaturas recortam; a foto aberta aparece inteira. |
| Lightbox sem autor/hora/posição | album | viewer com autor, momento, "i de N", ações | Funcional | |
| Álbum com um `GET` gigante | album | lista local (sem paginação) | n/a | Escala não é tema de protótipo. |
| Minhas fotos (grade, pendentes locais) | `/my-photos` | `#/g/marina-rafael/minhas` | Funcional | Estados honestos por foto: Na fila, Enviando, Enviada, Aguardando, Aprovada, Não enviou. |
| Abrir foto, estado, remover | só pelo viewer, "×" sem texto | sheet "Minha foto" com status, legenda, missão e **Excluir** com confirmação | Funcional | **Corrigido**: "Excluir esta foto" visível, com consequência escrita. |
| Aviso `revisaoAntesDoTelao` | página | texto do estado "Aguardando aprovação" e botão "Simular: o anfitrião aprovou" (só protótipo) | Simulado | A aprovação real é do anfitrião; o botão existe para ver a foto entrar em Explorar e no Álbum. |
| `RetrySection` | página | faixa "Algumas fotos não subiram" + "Tentar de novo"; fila em `#/g/marina-rafael/fila` | Funcional | |
| `RecapCard` / `RecapSection` / `RecapSheet` | página | "Recap da noite" (≥ 3 fotos) em sheet com Anterior/Próximo | Funcional (envio simulado) | Sem IA: só as fotos do próprio convidado, em sequência. |
| `ColagemSection` | página (4 primeiras, sem escolha) | "Colagem da noite": escolha de 2 a 4 fotos | Simulado | **Corrigido**: o convidado escolhe; a imagem final é simulada. |
| `RetentionCard` / `ClaimPhotosButton` (login Google tardio) | página | "Guardar minhas fotos": link pessoal sem conta | Simulado | **Mudou de fluxo**: sem login, de acordo com a regra de convidado sem conta. O link abre `#/g/entrega/meu-...`. |
| `AlbumFooterCta` (compartilhar álbum + "Crie o álbum") | página | Perfil › "Compartilhar a página da festa"; link de venda só na página pública | Simulado | O link público não tem fotos de convidados, então não precisa de sheet de consentimento. Venda não ocupa mais a tela de lembrança. |
| `ThemeSetting` (claro/escuro) | final de Minhas fotos | removido | n/a | Convidado é sempre escuro (regra do BRIEF). |
| Revogar consentimento e apagar tudo (inexistente) | **ausente** | `#/g/marina-rafael/consentimento` | Funcional | **Novo**: mostra termo/versão/data; "Revogar e apagar tudo" exige digitar APAGAR, apaga fotos, comentários, reações e encerra a entrada. |
| Editar o nome (inexistente) | **ausente** | Perfil › Nome | Funcional | |
| Perfil de autor | `/g/[autorId]` | `#/g/marina-rafael/p/g0` | Funcional | Sem total de curtidas (placar). Bloquear no menu ⋯. Perfil bloqueado, inexistente ou de quem não entrou mostra estado próprio. |

### Música, Recado, Confessionário (A §7, §8, §9)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Trilha dos anfitriões (`NowPlaying` com onda animada) | music | `#/g/marina-rafael/musica`, bloco "A trilha" | Simulado | Sem onda (prometia reprodução). "Abrir no Spotify" é um toast; o texto diz que nada toca aqui. |
| Sugerir música colando link | `TextField` + colar | pedido por **lista fechada** (catálogo fictício), máximo de 2 por convidado | Funcional | **Mudou de fluxo**: lista fechada, sem link nem permissão da área de transferência. |
| "Também quero" (voto) | sem estado "já votei" | botão com estado "Você votou", desfazível | Funcional | |
| Gate da música sem polling | music | pedidos trancados com o gate fechado; liberam ao reabrir a rota | Funcional | Texto explica o horário. |
| Falha de rede sem retry | music | `A.stateful` com "Tentar de novo" | Funcional | |
| Confessionário (lista de prompts) | `/confessional` | `#/g/marina-rafael/confissionario` | Funcional | Resposta em **texto** ou **áudio simulado** (contador de segundos). Mostra "já respondi", apagar com Desfazer e quem vê. Alcançável pelo Perfil (antes só por link de 12 px). Evento sem confessionário mostra estado próprio. |
| Gravação de vídeo do confessionário | `/photo?prompt=&video=1` | não implementado | Depende de integração | Substituído por áudio simulado (BRIEF). |
| Recado: card, "Seguir" (dispensar) | cover/feed | `#/g/marina-rafael/recado`; botão "Li, obrigado" / "Marcar como não lido" | Funcional | Rótulo claro e reversível; não some para sempre. |
| `VoiceNotePlayer` | texto + áudio | player com play/pausa e barra que anda | Simulado | Rotulado: não há som no protótipo. |
| `RecadoStory` | Home | anel "Recado" no trilho, com indicação de novo para leitor de tela | Funcional | |

## Parte 2: captura, scan, entrega, página pública, pareamento (convidado)

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| Câmera: captura | `/photo` com `<input capture>` e visor vazio | `#/g/marina-rafael/camera` | Funcional | Usa `<input type=file accept=image/* capture=environment>` real (no computador abre o seletor). **O texto agora explica** que a câmera do celular abre (HDR e modo noturno). |
| Foto de amostra | n/a | seis ilustrações na própria tela | Simulado | Para quem não tem câmera. Rotulado como ilustração. |
| Galeria / rolo (multi-seleção) | input `multiple` | botão Galeria (até 10) | Funcional | Várias fotos vão direto para a fila, sem editor (como hoje). |
| "Gravar vídeo" e cota de vídeo | botão + aviso | botão "Vídeo" | Depende de integração | Toast explica: câmera em modo vídeo e 1 vídeo por convidado no plano grátis. |
| Remoção de EXIF | reencode no cliente | **real**: a imagem é redesenhada em canvas antes de guardar | Funcional | A frase "A localização da foto é removida antes do envio" é verdadeira no protótipo para fotos reais. Vídeo: pendência de produto. |
| Validação de arquivo (tipo/tamanho) | código morto | tipo validado; erro explica e diz o que fazer | Funcional | Tamanho não é limitado. |
| HEIC não decodificável | aviso | cai no mesmo erro de arquivo ilegível | Simulado | |
| Banner da missão e chips de lugar | câmera | linha de missão na câmera; momento e missão como chips no editor | Funcional | Lugar/momento não se perde em lote (todo o lote usa a missão atual). |
| Editor: filtros (presets, "sugerido", intensidade) | editor Filtros | `#/g/marina-rafael/camera/editar` | Funcional | Presets de **filtro CSS de cliente**, com o recomendado pelos anfitriões marcado e pré-selecionado, e "Original" sempre disponível. Intensidade 0 a 100. Nenhuma IA. |
| Editor: Ajustes (luz, calor, contraste, vinheta) | aba Ajustes | removido | n/a | Ajuste fino fere a coerência "idêntica em todas as fotos". Só presets. |
| Editor: Texto sobre a foto | aba Texto | removido | n/a | Fora do escopo desta tela (BRIEF: presets, legenda, missão, momento). |
| Editor: Música sobre a foto / `story` | aba Música | removido | n/a | Idem. |
| Editor: "Tirar outra" sem confirmar | header | "Descartar" com confirmação | Funcional | |
| Editor: prévia sem indicador | canvas | prévia imediata (sem espera) | Funcional | |
| Detalhes (legenda, lugar), "Pronto" e "Pular" iguais | `details` | legenda, missão e momento na mesma tela do editor; um só botão Publicar | Funcional | Duas etapas viraram uma. |
| Envio: fila persistente, retry, mutex, relógio | `use-upload` | fila em `g:<slug>:uploads` com avanço automático | Simulado | Estados: Na fila, Enviando, Enviada, Aguardando aprovação, Aprovada, Não enviou. |
| Alternador "sem sinal" | n/a | chip na câmera e interruptor na fila | Simulado | Pílula "Sem sinal · N na fila" no cabeçalho e faixa informativa. |
| Falha de envio e "Tentar de novo" | só no painel da fila | interruptor "O próximo envio falha"; retry por item e global | Simulado | O retry é visível na confirmação, na fila e em Minhas fotos. |
| Confirmação "Já tá no telão" | `Confirmacao` | `#/g/marina-rafael/camera/enviada` | Funcional | **Corrigido**: copy honesta por estado ("Chegou e aguarda aprovação", "O telão escolhe sozinho o que mostrar"). Nunca promete telão. |
| Recompensa da primeira foto | cartão carregado com 4 a 5 botões | linha discreta (número da foto ou missão cumprida com filete) | Funcional | Uma ação principal: próxima missão ou tirar outra. |
| Convite para instalar o app | sempre na foto 1 | só na confirmação da **primeira** foto, com "Agora não" persistido | Funcional | Cumpre a regra: convite só depois da primeira foto. |
| `PwaInstallCta` / "Instalar na tela inicial" | confirmação | Perfil › app › "Como instalar" (sheet iPhone/Android) | Simulado | |
| `AppOpenCta` ("Abrir no app" por esquema) | confirmação | substituído por código de 4 dígitos | Simulado | Sem esquema customizado sem fallback. |
| Fila: `QueueHeader`, `queue-panel`, `UploadArc` | câmera | `#/g/marina-rafael/fila` e pílula no cabeçalho | Funcional | Item com miniatura, estado, motivo da falha, tentar de novo e apagar da fila (com confirmação). |
| `GlobalQueue` em todas as páginas | layout | pílula no cabeçalho de todas as telas com sessão | Funcional | |
| Scanner de QR de resgate (`/scan`) | `scan-page` | `#/g/scan` | Simulado | Visor com varredura rotulado como simulado e botão "Simular leitura do QR". Código manual com validação e mensagem única. Aceita link, `/e/slug`, `albora.app/slug` e `?codigo=` (link do WhatsApp). |
| Câmera negada / sem `BarcodeDetector` | falha silenciosa | texto único do campo de código | Simulado | Em produção o aviso explicaria o motivo. |
| URL curta `/[slug]` | redirect | `#/g/:slug` é a entrada | Funcional | |
| Galeria de entrega `/g/[token]` | `guest-gallery-view` | `#/g/entrega/tk-ana-8f3k` (ok), `tk-vazio-2a9d`, `tk-expirado-77ab`, qualquer outro = inválido | Funcional (download simulado) | **Corrigido**: expirado e inválido são telas diferentes; mostra o nome do evento; "Baixar tudo" e por foto (simulados). |
| Link mágico pessoal | n/a | Minhas fotos › "Guardar minhas fotos" gera `meu-...` | Simulado | Mesma tela de entrega com as fotos do próprio convidado. |
| Página pública `/p/[slug]` | vitrine com miniaturas | `#/g/p/marina-rafael` | Funcional | **Corrigido**: sem miniaturas de convidados (mídia de convidado não vira vitrine). Mostra contadores e "Entrar na festa" quando aberta; estados encerrado, ainda não começou e inexistente. CTA de venda vira link discreto. |
| Pareamento web ↔ app: código de 4 dígitos | `/e/[slug]/pair` | `#/g/marina-rafael/app` | Funcional | Código com validade de 15 min, "Gerar outro" invalida o anterior, copiar. Texto de bastidor ("domínio verificado") removido. |
| `/app/parear` (digitar o código) | WebView | bloco "Simulador do app" na mesma tela | Simulado | Valida código errado, vencido e correto; mostra "app ligado" com Desligar e Desfazer. |

## Parte 3: app nativo (Expo), cobertura pelas mesmas telas

O app nativo não tem tela própria no protótipo, exceto a fila. As telas do convidado são responsivas e valem como a versão do app; as diferenças do app estão nas notas.

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| `_layout`, `index` (entrada), deep link | app | pareamento descrito em `#/g/marina-rafael/app` | Simulado | O app não tem login nem nome: o código de 4 dígitos é a identificação. |
| `pair` e `e/[slug]/pair` (universal link) | app | simulador do app em `#/g/marina-rafael/app` | Simulado | |
| Abas feed, missions, album, mine | app | Explorar, Missões, Álbum, Minhas fotos | Funcional | Paridade com a web (o inventário listava lacunas: filtros, contadores, celebração, consentimento, bloquear). |
| `photo` (câmera, revisão) | app | `#/g/marina-rafael/camera` e editor | Funcional | Presets e legenda; sem Ajustes/Texto/Música por decisão. |
| `photo-detail` (lightbox) | app | viewer | Funcional | Os três sheets duplicados viram um só. |
| `guest-profile` | app | `#/g/marina-rafael/p/g0` | Funcional | |
| `music`, `recado`, `confessional` | app | Música, Recado, Confessionário | Funcional / Simulado | O app explicava o gate só na Música; agora todas explicam. |
| `queue` (fila de envio) | app | `#/g/marina-rafael/fila` | Simulado | Sem o jargão "Background fetch": "O app continua enviando em segundo plano" (descrição). "Tentar de novo" avisa quando não há sinal. |
| Sessão expirada sem ação | app | texto "Falta você entrar" com botão | Funcional | |
| Classes de estilo inexistentes, safe area, emojis, alvos pequenos | app | n/a | n/a | Problemas do código nativo; no protótipo há alvos ≥ 44 px e ícones SVG. |

## Lacunas e limitações

- **Câmera real e vídeo**: só o seletor/câmera do navegador via `capture`; vídeo, microfone, HEIC e PWA/app de verdade são simulados ou apenas descritos.
- **Editor**: só presets de filtro CSS. Ajustes finos, texto sobre a foto e música sobre a foto foram retirados de propósito.
- **"Novas fotos" no feed**, polling e atualização ao vivo entre abas: não há. O feed mostra o estado ao abrir a tela; o gate é reavaliado ao renderizar (a faixa "A conversa abriu" aparece na próxima visita).
- **Estado "rascunho"** do resolvedor e **prefill do nome** da entrada não foram implementados.
- **Aprovação do anfitrião**: as fotos do convidado ficam em "Aguardando aprovação" e só entram em Explorar/Álbum pelo botão rotulado "Simular". Não conversa com a fila de moderação do painel nem com o telão.
- **Dados do evento**: o conjunto de demonstração só entra quando `A.data.photos` está sem aprovadas; se o anfitrião apagar tudo na fase Durante, o convidado também vê o exemplo rotulado (o vazio puro vem de Estado > Vazio).
- **Telão e pareamento do telão** não fazem parte deste módulo.
- **Fila e relógio**: o envio é uma máquina de estados com temporizador de 1 s; fechar a aba pausa o avanço, que continua ao reabrir.
- **Armazenamento**: as fotos escolhidas são reduzidas para 900 px e guardadas no `localStorage` (limite do navegador, cerca de 5 MB); muitas fotos grandes podem estourar a cota sem aviso.
- **Entrega e página pública** usam fotos de `A.data.photos` como se fossem do convidado; o conteúdo da página pública não depende de nenhuma foto.


## Revisão de arte (2ª passada): o que mudou de lugar

- Resolvedor (inexistente, QR trocado): o campo de código agora fica atrás de "Prefiro digitar o código" (details) na própria tela de aviso; a ação visível é só Escanear o QR.
- Câmera e confirmação passam a esconder a barra inferior (o obturador da tela substitui o da barra). Voltar continua no cabeçalho (câmera) e a confirmação oferece Próxima missão / Ver minhas fotos.
- Confirmação da 1ª foto: mascote, estrela e arco de envio; o convite para o app só aparece abaixo, na primeira foto.
- Explorar antes do gate: feed em largura total sem ações (um aviso único explica o gate); depois do gate: linha de reações, Reagir e Comentar em texto. O menu ⋯ fica na linha de metadados.
- Missões: numeração romana em Fraunces, progresso em filete; "Fotografar" virou link de texto por linha.
- Link de entrega expirado/inválido: botão "Pedir um link novo" (simulado, com toast).
- Música: lista de pedidos numerada em romano; "Abrir no provedor" virou link. Recado: assinatura e mensagem em Fraunces. Confessionário: Responder/Apagar em link; gravação com `A.arc`. App: arco do tempo de validade do código; instalação na tela inicial virou link. Editor de filtros: Missão e Momento recolhidos em "Missão e momento (opcional)". Compartilhar externo (bloqueado): mascote + volta às fotos. Nenhuma funcionalidade removida.


## 3ª passada (sistema e emoção): o que mudou de lugar

- **Explorar e Álbum, experiência social** (linhas Reação, `PhotoInteraction` e Lightbox): o post ganhou componentes locais `userAvatar`, `postHeader`, `postMedia`, `postActions`, `reactionSummary`, `actionMenu` e `commentSheet`. Reagir virou o coração (padrão "Amei", preenchido quando reagido; toque de novo tira), com duplo toque na foto como atalho e botão equivalente. A lista fechada de 4 reações abre por toque longo no coração ou pelo ícone auxiliar (Funcional). Comentar abre `CommentSheet` (campo fixo na base, respeita teclado e safe-area; envio otimista; falha simulada devolve o texto ao campo, ver chave "O próximo comentário falha" em Fila de envio, só no protótipo). Compartilhar (ícone) só aparece com o gate aberto e leva a `#/g/marina-rafael/compartilhar?foto=`. Menu ⋯ continua com Compartilhar, Denunciar, Bloquear e Remover minha foto.
- **Mídia**: retrato até 4:5, paisagem 3:2; foto mais alta que 4:5 aparece inteira sobre fundo neutro. Abrir a foto usa transição FLIP (transform) e respeita `prefers-reduced-motion`.
- **Desktop ≥1024** (`#/g/:slug/explorar` e `#/g/:slug/album`): layout próprio sem moldura de celular, barra superior (Explorar, Missões, Perfil, Tirar foto) e coluna lateral com Momentos (filtro vertical, mesma chave `fm`), progresso de missões e convite para o telão (Simulado: abre `#/t/display`). As demais rotas do convidado mantêm a moldura.
- **Capa e Nome**: paisagem curta (≤500px de altura) vira duas colunas (monograma e convite) sem moldura; o CTA fica sempre visível (no Nome, barra fixa na base). Cor do botão = acento do evento por `A.theme` (personalização legítima, rótulo `--on-ac`).
- **Fila de envio**: nova chave de simulação "O próximo comentário falha" (Simulado).

### Lacunas desta passada
- O toque longo só funciona com ponteiro de toque (no mouse, o ícone auxiliar faz o mesmo). Verificado por código, não em aparelho real.
- O teclado virtual foi tratado por `visualViewport`; não testado em iOS/Android reais.
- Ícone `smile-plus` registrado dentro do módulo (ausente em `icons-lucide.js`): pedido ao núcleo.


## Atualização — 25/10/2026

Texto de consentimento/revogação explicita a demonstração local; não promete aviso aos anfitriões ou exclusão no backend. Não altera a necessidade de integração.

Evidências atuais: [relatório da continuação](../10-continuacao-prototipo.md), [JSON de validação](evidencias/validacao-continuacao.json). Os resultados anteriores são históricos.
