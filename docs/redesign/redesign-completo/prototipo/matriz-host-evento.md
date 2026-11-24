# Matriz — host-evento.js (Hoje, Fotos, Convidados)

Rotas do protótipo: `#/h/e/:id/hoje`, `#/h/e/:id/fotos`, `#/h/e/:id/convidados` (aba Números: `?aba=numeros`). Aliases que redirecionam: `/ao-vivo`, `/pre-event` → hoje; `/album` → fotos; `/moderation` → `fotos?f=revisar`; `/guests` → convidados; `/insights` → `convidados?aba=numeros`; `/h/e/:id` → hoje.
Implementação: **F** = funcional (persiste em `A.store`, chaves `hv.<tipo>.<evento>`), **S** = simulado e rotulado na tela, **I** = depende de integração (aparece como simulado).

| ID / funcionalidade | Tela atual | Nova tela | Impl. | Nota de decisão |
|---|---|---|---|---|
| Tela 5 Início (`INI-*`, `/admin/e/[id]`) | Início | Hoje (`/hoje`) | F | Uma tela, três composições por fase (`A.when(id).phase`) e por papel. Arte (2ª passada): sem título de página; cada fase tem o seu herói e o seu `h1` (Antes: o número de dias; Durante: "Festa ao vivo"; Depois: "As fotos são de vocês."). |
| INI-01 Tour de primeiro acesso | Início | — | — | Removido do protótipo: o checklist guiado cumpre o papel. Sem tour em modal. |
| INI-02 Herói com capa e contagem | Início | Hoje › Antes (herói) | F | **Arco-contagem** (`A.arc`): o ponto-sol percorre o arco da marca até a data; o número de dias em Fraunces grande dentro do arco; nome, data, hora e local abaixo; contagem viva em horas/min/s (decorativa, `aria-hidden`). A capa continua pertencendo a Estilo. |
| INI-03 Ações do herói por fase | Início | Hoje (um único botão primário por fase) | F | Antes: o próximo passo. Durante: nenhum primário; só "Pausar tudo" (perigo, discreto). Depois: "Assistir o Reviver". |
| INI-03 "Ver como convidado" | Início (apontava para a própria Home) | Hoje › Antes (herói, próximo passo e checklist) | F | **Correção do bug**: leva a `#/g/<slug>` em nova aba e marca o item como feito. Na arte nova é um botão discreto sob o arco. |
| INI-03 "Copiar link" | Início | Botão Convidar do cabeçalho (núcleo) | F | Vem do shell; não repetido em Hoje. |
| INI-04 Números do evento (3 cartões-link) | Início | Hoje › Durante, ao lado da última foto | F | Três números grandes em Fraunces (fotos no ar, para revisar, participação), separados por filete, sem cartão; "para revisar" é link para `fotos?f=revisar`. "Convidados ativos" virou uma linha de texto com os primeiros nomes. |
| INI-05 Aviso de rascunho + "Publicar evento" | Início | Hoje › Antes (próximo passo vira Publicar) e seção "Evento publicado" | F | A âncora `#controle-publicar` existe sempre (corrige âncora inexistente). Voltar a rascunho pede confirmação. Evento e3 já nasce em rascunho. |
| INI-06 "Decidir agora" (EventControls filtrado) | Início | Hoje › Durante, faixa de controles + Regras da festa | F | Telão (estado, pausar, modelo, conectar) e "Pausar tudo" numa faixa discreta sob a foto viva; publicar, interação e menores ficam em "Regras da festa", recolhido por padrão (o estado aparece no resumo). |
| INI-07 "Todos os ajustes" | Início | Menu da conta (núcleo) | — | Ajustes saiu do eixo principal. |
| INI-08 Próxima ação ("Vale a pena agora") | Início | Hoje › Antes › próximo passo | F | Bloco centrado sob o arco: título, o porquê e um único botão primário + "Já fiz". Primeiro item pendente do checklist (publicar, se for rascunho). Sem rótulo-kicker acima do título. |
| INI-09 Preparo ("N de 6 essenciais") | Início | Hoje › Antes › "No caminho até a festa" (7 itens) | F | Fonte única de "pronto" (substitui Preparo + `/pre-event` de 21 itens, P-06). Itens manuais por caixa de seleção; "missões" e "equipe" derivados e travados com explicação. Sem barra de progresso (o arco já é o tempo): texto "N de 7 prontos". Persistido. |
| INI-10 Ideias para sua festa | Início | Hoje › Antes › fim das regras | F | Reduzido a um link "Ideias para sua festa" para Inspiração (a lista de duas missões saiu: informação aparece uma vez). |
| INI-11 Acesso rápido / No dia da festa / Prévia do convidado | Início | Hoje › Antes (herói) | F | Prévia em moldura de celular substituída por "Ver como convidado" real. Acesso rápido é o menu. A coluna lateral deixou de existir. |
| INI-12 LiveSummary + "Durante a festa" | Início ao vivo / Ao vivo | Hoje › Durante | F | Faixa viva: a **última foto grande** (abre na ampliação, que navega pelas 10 mais recentes) + três números; depois controles, fila, regras e ritmo por hora. Chegada simulada a cada ~6,5 s com a tela aberta; a foto e os números atualizam sozinhos (`aria-live`). Miniaturas "Chegando agora" removidas. |
| INI-13 Payoff depois | Início depois | Hoje › Depois | F | **Capa do álbum como herói** (a foto mais curtida, botão de play) + "As fotos são de vocês." + "Assistir o Reviver"; abaixo, em filete: entrega, álbum, livro, cápsula, agradecimento, retenção. Aviso de fotos sem revisar no topo. Passos sem numeração. |
| INI-14 Reviver (player de capítulos) | Início depois | Hoje › Depois › capa ou "Assistir o Reviver" | F | Player em modal: capítulos pelos momentos da festa, anterior/próximo, pausar, setas e Espaço, tela final (ver todas, ver de novo, copiar link). Foto vertical nunca é cortada. A capa também abre o player. |
| INI-15 Aviso de retenção | Início depois | Hoje › Depois › linha do tempo | F | Dia atual, dia 330 (exportar para a nuvem) e dia 365 (apagar) com datas calculadas. Exportar para a nuvem é S/I; "Apagar tudo agora" é F e pede digitar "apagar". |
| INI-16 Cápsula de memória | Início depois | Hoje › Depois (passo 4) | F | Interruptor persistido, toast, desligar sem fricção. |
| INI-17 CoupleFollowMode | Início (papel couple) | Hoje no papel Casal ("Modo Acompanhar") | F | **Considera a fase** (antes: contagem e "o que falta" só leitura; durante: números, chegando agora, fila só com "Aprovar"; depois: Reviver e cápsula). Interruptor "Ver painel completo" persistido (corrige P-04 item 4). |
| Papel planner (cerimonialista) | — | Hoje › Depois | F | Vê tudo; entregar, baixar, exportar e apagar ficam desabilitados com a explicação "só dono ou casal". |
| Tela 19 Pré-evento (`PRE-01..04`) | Pré-evento | Hoje › Antes › Checklist | F | Consolidado: um checklist de 7 itens em vez de 21. Redirect de `/pre-event`. |
| PRE-03 Prova física do QR | Pré-evento | — | — | Não portado: é runbook interno em papel; fora do escopo do painel. Registrado como lacuna. |
| PRE-04 Roteiro para o microfone | Pré-evento | — | — | Não portado (conteúdo de cerimonial). |
| Âncoras `#controle-interacao`, `#controle-menores`, `#controle-publicar` | Início/Pré-evento (inexistentes antes da festa) | Hoje (Antes e Durante) | F | **Correção do bug**: existem em todas as fases em que o item aparece; o item "Definir quando o feed abre" rola até o controle e foca o campo. |
| Tela 6 Ao vivo (`AOV-01..08`) | Ao vivo | Hoje › Durante | F | Deixa de ser destino; é o modo da Hoje. Redirect de `/ao-vivo`. |
| AOV-02 Telão: pausar/retomar | Ao vivo | Hoje › Durante › Telão | F | Pausar é reversível: aplica e mostra "Desfazer" (sem diálogo). Escolha do modelo do telão (4 modelos dos dados). |
| AOV-03 LiveSummary (participação, fila) | Ao vivo | Hoje › Durante › números | F | Linguagem de quem organiza ("participaram · 27 de 150"); sem "H1" e sem veredito técnico. |
| AOV-04 Fotos que chegaram + ReviewQueue | Ao vivo | Hoje › Durante › Chegando agora e Para revisar | F | Fila resumida (4 itens) com Aprovar/Ocultar e "Ver todas em Fotos". Fila única, mesmo dado de Fotos; o badge do menu baixa na hora. |
| AOV-05 / AOV-06 TV, `WallLinkSender` | Ao vivo | Compartilhar › Telão (outro módulo) | — | Aqui só link "Conectar ou abrir o telão" para Compartilhar. |
| AOV-07 "Ver convite e QR" duplicado | Ao vivo | Botão Convidar do cabeçalho | F | Duplicata removida. |
| AOV-08 Moderação e horário de participação | Ao vivo | Hoje › Durante (interação e menores) | F | Os controles de interação e proteções entram na central ao vivo (no produto só existiam em Ajustes). |
| CTL-02 Telão: pânico em toggle | Ao vivo/Ajustes | Hoje › Durante › "Pausar tudo" | F | **Botão com confirmação** que diz as três consequências (telão, feed, fotos novas na fila); faixa de estado persistente ("Tudo pausado há…") com "Retomar tudo"; fotos que chegam durante a pausa vão para a fila. Papel Casal não vê o botão. |
| CTL-03 Proteções: "Há menores" | Ajustes | Hoje (seção "Há menores…") | F | Ligar é imediato com explicação do efeito; desligar pede confirmação. "Modo endurecido" não portado (ver lacunas). |
| CTL-04 Interação social (abrir/fechar/agendar) | Ajustes/Ao vivo | Hoje › "Interação dos convidados" | F | Quatro modos (depois da cerimônia, desde o começo, em um horário, nunca); salvar automático com toast. Agendar não dispara PATCH cego: o horário aparece dentro do campo. Abrir/Fechar agora (reversível, com Desfazer). |
| CTL-05 Entrega das fotos | Ajustes | Hoje › Depois › passo 1 | S/I | Interruptor + "Enviar agora" (simulado; WhatsApp e e-mail dependem de integração e a tela diz isso). |
| CTL-01 Publicar | Início/Ajustes | Hoje › "Evento publicado" | F | Ver INI-05. |
| CTL-06..11 (ajuda, plano, música, peças, links) | Ajustes | Outros módulos | — | Fora do escopo desta tela. |
| Tela 7 Álbum (`FOT-*`) | Álbum | Fotos (`/fotos`) | F | Título único "Fotos"; sem headline decorativa nem CTA de QR (está no Convidar). |
| FOT-02 Abas Todas/Revisar/Destaques | Álbum | Fotos › filtros em texto | F | Filtros viraram abas em texto com sublinhado âmbar (sem chips-caixa): Todas, Revisar, Aprovadas, Ocultas, No telão, Por missão, Por convidado, com contagem. Revisar é um filtro, não outra tela. "Destaques" virou ordenação "Mais curtidas". |
| FOT-03 Grade do álbum | Álbum | Fotos › grade sem moldura e lista | F | Grade contínua de 3 px, sem raio nem cartão; foto horizontal ocupa duas colunas. Só aparece rótulo em foto **para revisar** ou **oculta** (esmaecida); a bolinha de seleção só surge no hover/foco ou quando há seleção. O resto (autor, hora, missão, telão) está na ampliação e na lista. Modo lista mantido. |
| FOT-03 Busca, ordenação | (inexistentes) | Fotos | F | Busca por pessoa, missão, motivo ou status (sem acento); ordenar por recentes, antigas, mais curtidas, convidado A–Z. |
| FOT-04 Seleção de uma foto (painel abaixo) | Álbum | Fotos › ampliação cinematográfica | F | Ampliação em tela cheia no escuro: foto grande centrada, setas laterais, contador no topo; barra inferior com autor, status, hora, missão, reações e as ações (Aprovar/Restaurar em destaque, Ocultar, Pôr/Tirar do telão, Baixar, Remover de vez); comentários num `<details>`. Aprovar ou ocultar uma foto da fila avança para a próxima. |
| FOT-04 Destacar / Tirar destaque | Álbum | — | — | Substituído por "No telão" (o destaque dos convidados vem de curtidas). Registrado como mudança de fluxo. |
| FOT-04 Ocultar com Desfazer | Álbum | Fotos | F | **Um só caminho de ocultar** (linha, lote, lightbox, tecla R), sempre com toast "Desfazer" (resolve a triplicidade do inventário). |
| FOT-04 Remover foto | Álbum | Fotos (lightbox, lote) | F | Irreversível: `A.confirm` com a consequência escrita; no lote também. Papel Casal não vê "Remover de vez" na ampliação. |
| FOT-04 Ver pessoa | Álbum (`<a>` com recarga) | Lightbox › nome do autor | F | Abre a ficha do convidado sem recarregar a página. |
| FOT-05 Aba Revisar (ModerationPage) | Álbum | Fotos › filtro Revisar | F | Mesma fila da Hoje. Mostra os primeiros 3 comentários denunciados acima da grade, com Manter/Remover. |
| FOT-06 ReviewQueue: aprovar/ocultar em lote | Álbum | Fotos › seleção em lote | F | Seleção por foto, "Selecionar todas (N)" e barra fixa em pílula (Aprovar, Ocultar, Baixar, Remover). **Aprovar/ocultar em lote têm Desfazer** (antes: sem confirmação nem volta). Baixar é simulado. |
| FOT-06 Atalhos | (inexistentes) | Fotos | F | `A` aprova, `R` oculta, `Z` desfaz, `←` `→` navegam na ampliação; valem para a foto em foco ou a seleção. |
| FOT-07 CommentModeration | Álbum | Lightbox (lista de comentários) + Fotos › Revisar | F | Remover comentário agora tem Desfazer (antes: DELETE direto). Comentários denunciados aparecem na fila. |
| FOT-08 Baixar e guardar (livro, ZIP, Drive) | Álbum (`<details>`) | Hoje › Depois (álbum, livro) | S/I | ZIP e livro PDF simulados; Drive e curadoria de álbum não portados (lacuna). Texto técnico (CMYK, sangria) removido. |
| FOT-09 Rodapé "Compartilhar convite" | Álbum | Botão Convidar do cabeçalho | F | Removido (repetição). |
| Badge de pendentes no menu | (ninguém lia o contador) | Menu e barra inferior (núcleo) | F | Atualiza ao aprovar, ocultar, desfazer, ou quando chega foto nova; some quando a fila zera. |
| Tela 21 Moderação (redirect) | `/moderation` | `fotos?f=revisar` | F | Redirect mantido para links antigos. |
| Fotos: vazio, erro, carregando | skeleton próprio | Fotos | F | Os quatro estados do núcleo; vazio diferencia "festa ainda não começou" de "sem foto" e de "álbum apagado". Filtro sem resultado tem estado próprio com "Limpar filtros". |
| Tela 8 Convidados (`CON-*`) | Convidados | Convidados (`/convidados`) | F | Funil como linha tipográfica no topo + abas "Lista" e "Números" (consolida Participação e Insights). |
| CON-01 Faixa "As memórias são feitas juntos" | Convidados | — | — | Removida (headline decorativa; o convite está no cabeçalho). |
| CON-03 Sua lista (busca, ordenação) | Convidados | Convidados › Lista em filete | F | Linhas em filete (nome, entrada, situação) com o **número de fotos em Fraunces** à direita; sem avatar nem cartão. Busca sem acento; filtros em texto por situação com contagem; ordenação por fotos, nome ou entrada. Estados vazio e "sem resultado". "Descobertas da festa" (medalhas) não portado. |
| CON-04 Perfil da pessoa | Convidados | Convidados › ficha em sheet | F | Fotos da pessoa (abrem na ampliação), missões cumpridas, situação, hora de entrada. Aceita `?g=<id>` (vem do nome do autor na ampliação). |
| CON-06 Nomes no telão (trocar/ocultar) | Convidados › Participação | Ficha › "Ocultar nome no telão" | F | Mora onde a pessoa aparece; reversível com Desfazer. "Trocar nome" não portado. |
| (novo) Bloquear/desbloquear | (inexistente) | Ficha | F | Reversível com Desfazer; explica que fotos já enviadas continuam. Há ação separada "Ocultar as N fotos". |
| (novo) Reenviar convite | (inexistente) | Ficha (quem ainda não entrou) | S/I | Simulado e rotulado: envio real depende de WhatsApp ou e-mail. Contagem de reenvios persiste. |
| CON-05 / Tela 20 Participação e Insights (`ANA-01..02`) | Convidados › Participação / `/insights` | Convidados › Números | F | Uma só versão do funil (corrige as três cópias). |
| ANA-01 Estatísticas, veredito, "H1" | Insights | Convidados › Números (frase de veredito) | F | Uma frase com a participação, a meta "4 em cada 10" e a hora de ouro (sem "H1", "espinha", "fricção"). Entraram/fotografaram/% agora estão no funil do topo. |
| CON-05 Funil, canais, ranking de missões, hora de ouro | Participação/Insights | Convidados (funil no topo) › Números (resto) | F | **Funil como uma linha tipográfica**: Esperados → Abriram o link → Entraram → Fotografaram → Com foto no ar, números grandes em Fraunces e % de passagem; antes da festa mostra só os esperados. Canais com porcentagens ilustrativas fixas; ranking calculado das fotos reais; gráfico por hora em SVG (barras em âmbar do produto). |
| CON-05 Confirmar quem apareceu | Participação | Números › formulário | F | Validação 1–2000; troca o denominador de participação. Persistido. |
| ANA-01 Exportar CSV | Insights (sem link na UI) | Convidados › botão "Exportar CSV" | F | Menu com duas planilhas: lista de convidados e números. **Download real** de CSV gerado no cliente (separador `;` para Excel em português). Agora tem entrada na UI do anfitrião. |
| CON-07 Coluna lateral (convidar, permissões) | Convidados | — | — | Removida (Convidar no cabeçalho; consentimento em Ajustes). |
| Convidados: carregando, erro, vazio | — | Convidados | F | Estados do núcleo; vazio por filtro tem estado próprio. |
| Teclado e leitor de tela | — | Todas | F | Abas com setas, foco restaurado após redesenhos, regiões `aria-live` para chegada de foto e contagens, modais com foco preso (núcleo). |

## Lacunas e limitações

- **2ª passada de arte**: removidos por decisão de composição (informação aparece uma vez) a lista de 2 "ideias" na lateral, a faixa de miniaturas "Chegando agora" e a barra de progresso do checklist; nenhuma funcionalidade foi perdida (as ações continuam nas mesmas rotas e ações `hv-*`). A coluna lateral do Hoje deixou de existir.
- O arco-contagem usa 57 dias de "janela" para eventos semente e a data de criação para eventos criados no assistente; a posição do ponto é ilustrativa.
- A ampliação usa `A.modal` com classe própria (tela cheia, tema noite) para herdar o foco preso e o `Esc`; em celular a barra inferior rola se houver muitos comentários.

- **Telão real**: Hoje só liga para `compartilhar` ("Conectar ou abrir o telão"); a rota do telão pertence a outro módulo. Pausar/retomar e o modelo escolhido são estado do store (`hv.tl.<evento>`) e o telão de outro módulo só reflete se ler esse estado. O telão lê `A.data.photos`, que já reflete aprovações e ocultações.
- **Dados do evento e1 mudam de verdade**: `A.data.photos` e `A.data.guests` são acessores (getters) que reaplicam o store. Na fase "Antes" `A.data.photos` fica **vazia** (a festa não começou); outros módulos que assumirem fotos prontas nessa fase verão lista vazia.
- Eventos e2 e e3: usam os mesmos dados-base (e2 sem fila; e3 sem fotos e com os 14 primeiros convidados). Chegada de foto ao vivo só existe no e1.
- Chegada de foto ao vivo roda enquanto a Hoje (Durante) está aberta e para após 60 fotos simuladas. As fotos novas persistem no store (somem em "Reiniciar dados").
- Não portados: tour de primeiro acesso, "Descobertas da festa" (medalhas), "Trocar nome" no telão, Modo endurecido, destaques manuais de foto, Drive e álbum curado, ZIP real (só simulado), prova física do QR e roteiro de microfone, sugestão de segundo evento.
- Entrega, livro, exportação para a nuvem e reenvio de convite são **simulados** e rotulados; nada sai da máquina.
- Contagens de canais de entrada (QR, WhatsApp, link, código) são porcentagens fixas ilustrativas. A base é de 30 convidados fictícios contra 150 esperados, então a participação fica na faixa de 18–20%; o aviso de meta fala em "4 em cada 10".
- Hora das fotos: todas ocorrem a partir do horário do evento (ex. 18:49 a 22:10); não há calendário por dia.
- Desfazer do toast dura ~6,5 s; a tecla `Z` desfaz as últimas ações da sessão em ordem (até 20).
- Defeitos conhecidos: o botão "Pausar tudo" também aparece na paleta ⌘K e só funciona na fase Durante; a faixa "Tudo pausado há…" não atualiza o tempo sozinha.

## Pedidos de mudança no núcleo

- Nenhum bloqueante. Observação: o shell lê `A.data.photos` para o badge de pendentes; foi preciso redefinir `A.data.photos`/`A.data.guests` como acessores no módulo (sem editar `core.js`). Idealmente o núcleo exporia um hook "antes de renderizar".
- O prefixo `hc-` (classes, ações, chaves de store) colidiu com o módulo `host-config.js`; este módulo usa **`hv-`** e chaves `hv.*`. Um registro de prefixos no brief evitaria o conflito.


## Atualização — 25/10/2026

Fotos conserva filtros, seleção e revisão; busca/ordenação passam a disclosure. Hoje em paisagem mantém próxima ação visível.

Evidências atuais: [relatório da continuação](../10-continuacao-prototipo.md), [JSON de validação](evidencias/validacao-continuacao.json). Os resultados anteriores são históricos.
