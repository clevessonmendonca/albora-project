# Matriz consolidada de rastreabilidade

Consolidação em 25/10/2026. As tabelas abaixo preservam as declarações dos módulos; não significam que todas as funções foram revalidadas nesta sessão. Consulte o relatório 10 para a validação atual.


## matriz-console

[Origem e limitações](prototipo/matriz-console.md).

| ID / funcionalidade | Tela atual | Nova tela (protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| F76 `ConsoleFrame` (sidebar recolhível, gaveta mobile) | `/console` layout | todas as rotas `/c/*` via `A.layout` | Funcional | “Recolher menu” persiste em `cx.collapsed`. Abaixo de 900 px a barra inferior (Visão, Contas, Eventos, Suporte, Mais) substitui a gaveta; “Mais” abre um sheet com todos os domínios. Entre 901 e 1180 px o menu já nasce em ícones (núcleo). |
| F77 `ConsoleNav` por capability, badges | `/console` menu | menu em 3 grupos (Negócio, Operação, Governança) + Visão geral | Funcional | **Corrigido:** badges de pendência agora aparecem e são calculados dos dados (tickets abertos, pedidos LGPD abertos, tarefas de retenção com falha, assinaturas em atraso, alertas de segurança sem reconhecer). Itens sem capability somem (não ficam desabilitados). |
| F78 `ConsoleProfileMenu` | rodapé da sidebar | cartão do perfil no topo do menu lateral (`cxmenu`) | Funcional | Mostra nome e e-mail em vez de UUID e iniciais do UUID. Inclui o **seletor de papel simulado** (só protótipo), “Confirmar minha identidade” e “Sair do console”. “Meu perfil/Preferências” continuam de fora (não existem). |
| F79 `ConsoleSearch` + `CommandPalette` | topbar | botão “Buscar conta, evento, ticket…” e ⌘K/Ctrl K (`A.palette.add`) | Funcional | Navega por domínio, abre ações (abrir ticket, novo pedido LGPD, exportar auditoria, convidar pessoa, trocar papel, sair) e acha contas, eventos e tickets por nome sem acento. Só aparece dentro do console e respeita o papel. O atalho `/` fora de campo não foi implementado. |
| F80 `ConsolePeriodo` | `/console` | `/c` chips Hoje, 7 dias, 30 dias (`?p=`) | Funcional | **Corrigido:** o MRR diz que é “valor de hoje, não muda com o período”; o que depende da janela (convidados, participação, funil de eventos ao vivo) é identificado. |
| F81 `ImpersonationBanner` | topo | faixa crítica no topo de toda tela do console enquanto há sessão “ver como” ativa | Funcional | Mostra o **nome** da conta, não o id; botão “Encerrar sessão”; expira em 30 min. Não fechável. |
| F82 `PendingImpersonationApprovals` | qualquer tela | faixas de aviso no topo de toda tela, só para quem aprova | Funcional | Até 2 pedidos; Aprovar e Negar abrem modal com motivo obrigatório. Quem pediu não aprova o próprio pedido. |
| F83 `ImpersonationRequestDrawer` | `/console/accounts/[id]` | seção “Ver como esta pessoa” em `/c/contas/:id` | Funcional | Máquina completa: nenhum, pendente, aprovado, ativo, expirado/negado, com “Pedir de novo”. Vira seção da página em vez de drawer. A visão “como o cliente” em si não é renderizada (o prototipo só mostra a faixa); depende de integração. |
| F84 ações de servidor (login, reauth, sair, PII, tickets, assinatura, DSAR, impersonação, busca) | `actions.ts` | fluxos `FLOWS.*` + telas de entrada | Funcional / Simulado | Envio de e-mail (link de login e de reauth) é **simulado** e rotulado (“Simular: abrir o link do e-mail”). Reembolso não toca gateway: simulado. Erros de permissão viram toast “Seu papel (X) não permite isso…” e telas de “papel não abre esta tela”. |
| F85 Login `/console/login` | `login-form.tsx` | `/c/entrar` (+ `?m=` confirmar, `?error=`) | Funcional / Simulado | **Corrigido:** erro de SSO (`?error=google`) e falha de rede mostram o que houve e o que fazer; links de teste para cada erro; link expirado tem tela própria. Resposta neutra do e-mail mantida. Google é simulado (entra como Helena Prado). Campo morto `next` removido: o destino volta da própria URL. |
| F86 Reauth `/console/reauth` | `reauth-form.tsx` | `/c/reauth?next=&why=` | Funcional / Simulado | **Corrigido:** explica **por que** pede (ação a fazer), por quanto tempo vale (15 min) e mostra “identidade confirmada até HH:MM” na barra. `next` só aceita rotas `/c`. Erro “inválido, expirou ou não pertence a esta sessão” demonstrável. |
| Passo extra (step-up) em todas as ações perigosas | só exclusão de conta | exclusão de conta, executar exclusão (LGPD), apagar evento, cancelar assinatura, reembolsar, gerir equipe | Funcional | **Decisão:** unificado numa só regra (problema 8 do diagnóstico). A ação sensível guarda o que estava fazendo, leva à confirmação e **retoma sozinha** ao voltar (resolve “motivo perdido” do inventário). |
| F87 Cabeçalho da visão geral | `/console` | `/c` título, período | Funcional |  **2ª passada:** o título não repete mais “como a plataforma está andando”; o texto de apoio diz a regra da ordem. |
| F88 `FilaDeAtencao` | `/console` | “Precisa de atenção agora” em `/c` (lista numerada) | Funcional | Calculada dos dados: SLA estourado, pedido vencido, tarefa com falha, assinatura em atraso, sessão reaproveitada (só quem vê Segurança). Cada linha leva à lista já filtrada.  **2ª passada (arte):** deixou de ser uma linha por área e virou lista ordenada por item (urgentes primeiro, depois maior atraso), com prazo, responsável e link para a tela de origem; mostra 10 e resume o resto por área. Entram também pedidos de “ver como” aguardando aprovação (só administração). |
| F89 `PainelH1` | `/console` | Linha “Participação média” em “Leituras” (`/c`) | Funcional | **Renomeado:** “H1” some; vira “participação” (convidados que enviaram ao menos uma foto entre os que entraram). A explicação do cálculo está num `<details>` na visão geral e no detalhe do evento. Gráfico de barras com valores no rótulo acessível.  **2ª passada:** a série de participação virou um histograma de 14 barras dentro da linha da tabela, sem bloco próprio. |
| F90 `FaixaDeMetricas` | `/console` | Tabela “Leituras” em `/c` | Funcional | MRR, cancelamentos (≈, com base), eventos ativos, convidados no período. Sem variação vs. período anterior (sem série histórica nos dados).  **2ª passada:** os quatro cartões de número (KPI) foram trocados por linhas de tabela com valor tabular e “como ler”. Nenhuma métrica removida. |
| F91 `FunilComercial` | `/console` | Últimas linhas de “Leituras” (`/c`) | Funcional | Destaca a maior perda entre etapas em texto. Contagens vêm de contas e eventos fictícios.  **2ª passada:** as barras do funil viraram linhas com “% do passo anterior” e a maior perda em texto. |
| F92 `EventosAoVivo` | `/console` | “Acontecendo agora” | Funcional | Até 12; texto deixa claro que é só monitoramento. |
| F93 Contas: busca e filtros | `accounts-table.tsx` | `/c/contas` | Funcional | **Corrigido:** busca com **debounce de 250 ms** que filtra no cliente sem recarregar a rota; filtros Tipo, Plano e Status em chips; “Limpar busca e filtros”. Em telas estreitas os filtros ficam atrás do botão “Filtros”. |
| F94 Contas: colunas e ordenação | idem | idem | Funcional | **Corrigido:** ordenação por clique é **sobre todo o conjunto filtrado**, com aviso “ordenado sobre todos os resultados”. Linha e nome da conta agora são links para o detalhe. Colunas secundárias somem em tela estreita. |
| F95 Contas: paginação | idem | idem | Funcional | **Corrigido:** Anterior, Próxima e números de página; contador “N de M · página X de Y”. “Último acesso ≈ aproximado” explicado no rodapé da tabela. |
| F96 Cabeçalho da conta | `accounts/[id]` | `/c/contas/:id` | Funcional | Mostra nome e e-mail mascarado; sem UUID visível. |
| F97 Ações da conta (Revelar, Ver como, Excluir) | idem | botões no cabeçalho e menu “Mais ações” | Funcional | **Corrigido:** ordem por gravidade: Revelar contato (e Ocultar), depois o menu com Suspender/Reativar (reversível, com Desfazer) e, por último e em perigo, “Abrir pedido de exclusão…”. Exclusão pede reauth, motivo e digitar o **nome** da conta (não um UUID) e leva a `/c/lgpd`. Revelar contato mostra o e-mail completo até sair da tela e pode ser ocultado (antes não havia volta); grava auditoria e um evento em Segurança. |
| F98 Painéis Identidade, Atividade, Trilha | idem | seções da página | Funcional | **Corrigido:** eventos da conta com link para `/c/eventos/:id`; plano em rótulo (não string crua); acrescentei seções de assinatura, tickets e pedidos LGPD da conta. |
| F99 Eventos: lista | `events-table.tsx` | `/c/eventos` | Funcional | Mesmos comportamentos de contas (debounce, ordenação total, paginação). Filtros Status e Tipo. Fornecedor e anfitrião viram links na ficha. |
| F100 Evento: detalhe | `events/[id]` | `/c/eventos/:id` | Funcional | **Corrigido:** a participação é explicada; há ação de suporte (“Abrir ticket para o anfitrião”) e link ao painel do anfitrião para os 3 eventos de demonstração; título nunca cai em UUID; seção Retenção com datas 330/365 e link para a tela de retenção. Evento apagado é sinalizado. |
| F101 Faixa de assinaturas | `subscriptions` | `/c/assinaturas` topo | Funcional | MRR considera cortesia; cancelamentos ≈ 30 dias. |
| F102 Tabela de assinaturas | idem | idem | Funcional | **Corrigido:** “Próxima cobrança” mostra a data (antes era sempre “—”); busca, filtros Status e Plano, ordenação total, paginação. Sem N consultas por linha: o reembolso lê os pagamentos só ao abrir o fluxo. |
| F103 `SubscriptionActions` | `subscription-actions.tsx` | menu “Gerir” por linha | Funcional / Simulado | Trocar plano e cortesia reversíveis (Desfazer). Cortesia agora escolhe 25/50/100% e duração. Reembolsar valida valor, pede reauth e digitar “reembolsar”; **efeito no gateway é simulado**. “Cancelar assinatura…” (com “…” e nome próprio) deixou de colidir com “Cancelar” dos diálogos; é irreversível, pede reauth e digitar o nome do fornecedor. Um diálogo por ação (sem estado compartilhado de motivo). Pagamentos de eventos de anfitrião continuam fora desta tela (aparecem na conta). |
| F104 Resumo de suporte | `support` | `/c/suporte` linha de resumo | Funcional | “N em aberto · M com prazo estourado”, com ícone e texto (não só cor). |
| F105 Fila de tickets | `SupportQueue` | tabela à esquerda de `/c/suporte` | Funcional | **Corrigido:** filtros por situação (inclui Resolvidos e fechados), prioridade e responsável; busca; ordenação total; contagem regressiva “Estoura em… / Estourou há…” que acompanha o relógio simulado. Nada é aberto por padrão (antes o 1º ticket era escolhido sozinho). Em tela estreita a fila e o detalhe alternam, com “Voltar à fila”. |
| F106 Detalhe do ticket | `ticket-detail.tsx` | painel à direita (`?t=ID`) | Funcional / Simulado | **Corrigido:** resposta em área de várias linhas com validação; mensagens com autor nominal e data/hora; status, prioridade e responsável gravam **com Desfazer** e auditoria; contexto do cliente mostra valor e data dos pagamentos. Envio de e-mail ao cliente é simulado. Enviar resposta move o ticket para “Aguardando cliente”. Leitura vê tudo sem editar, com aviso do porquê. |
| (novo) Abrir ticket | não existia | botão “Abrir ticket” / ⌘K / conta / evento | Funcional | Cobre o “abrir” do escopo. |
| F107 Faixa LGPD | `lgpd` | `/c/lgpd` topo | Funcional | Em aberto, Vencidos, No prazo. |
| F108 `DsarForm` | `dsar-form` | “Novo pedido” (modal) | Funcional | **Corrigido:** titular escolhido numa lista com nome e e-mail mascarado (nada de UUID digitado); prazo legal já sugerido (15 dias) e editável. |
| F109 Tabela de pedidos | `dsar-*` | tabela em `/c/lgpd` | Funcional | **Corrigido:** rótulos humanos (nome do titular + código do pedido, “Exclusão de conta”), prazo em “N dias restantes / N dias em atraso” com ícone, filtro **inclui Concluídos e recusados** (histórico), ordenação e paginação. |
| F110 `DsarRequestActions` “Atualizar” | idem | “Atender → Atualizar pedido” | Funcional | Situação, link do comprovante, notas e motivo obrigatório. |
| F111 `ExecuteAccountDeletionDanger` | idem | “Atender → Executar exclusão da conta…” | Funcional | Reauth com retomada, motivo, lista do que será apagado, digitar o nome do titular. A conta vira “Conta excluída (L-…)”, os eventos dela ficam apagados e o pedido é concluído. |
| F112 Link “Ver retenção” | cabeçalho | botão “Ver retenção” ao lado de “Novo pedido” | Funcional | Mais visível que o link antigo. |
| F113 Retenção (tabela) | `retention` | `/c/retencao` visão “Por evento” e “Tarefas automáticas” | Funcional | **Corrigido:** evento por **título** (link), não UUID; datas dos dias 330 e 365 por evento; falhas em destaque e filtráveis; texto “Onda C” removido. **Agora há ações:** Exportar agora, Apagar agora (reauth, motivo, digitar o título) e Tentar de novo nas tarefas com falha. Exportação é **simulada** (depende da nuvem do anfitrião). |
| F114 Faixa “somente leitura” | idem | substituída por texto do que é automático e do que a equipe pode fazer | Funcional | Papel Leitura vê “Só leitura” nas ações. |
| F115 Faixa “registro imutável” | `audit` | lead de `/c/auditoria` | Funcional | Sem jargão “append-only”. |
| F116 Filtros de auditoria | idem | chips de período e **todos os 10 alvos** e quem fez, busca por texto, **intervalo de datas** | Funcional | **Corrigido:** os 4 alvos que eram ignorados em silêncio agora filtram; busca com debounce; datas absolutas; ator por nome. |
| F117 Tabela de auditoria | idem | idem | Funcional | Quando, quem, o que fez (rótulo humano + código), alvo com link, motivo e “Detalhes” (origem resumida e metadados). Paginação com Anterior/Próxima. Em tela estreita colunas secundárias somem. Toda ação do console aparece aqui na hora. |
| (novo) Exportar auditoria | só no redesign | botão “Exportar CSV” (admin) | Funcional | Baixa um CSV real **dos filtros atuais** e registra a própria exportação (auditoria e Segurança). Só Administração. |
| F118 Filtros de segurança | `security` | chips de tipo e período em `/c/seguranca` | Funcional | **Corrigido:** filtro sem recarregar a página, no mesmo padrão do resto. |
| F119 Alerta de sessão reaproveitada | idem | faixa crítica com “Reconhecer” | Funcional | Reconhecer pede motivo, grava auditoria e tira o selo do menu. |
| F120 Cartões por tipo | idem | seções por tipo com contagem, mini-tendência de 7 dias e ocorrências expansíveis | Funcional | Rótulo humano com o código técnico em segundo plano; **aviso do limite** (até 25 por tipo). |
| F121 Nota “somente leitura” | idem | lead reescrito (“sinais que avisam, mas não provam”) | Funcional | Sem “onda”, `security_events`. |
| Item de menu `/console/staff` (inexistente) | menu do owner | **`/c/equipe-interna` implementada** | Funcional / Simulado | **Decisão:** implementada (não removida) porque `staff.manage` e a política de reauth já existem. Lista a equipe, convida (e-mail simulado), muda papel, desativa e reativa; exige reauth e motivo; ninguém muda o próprio papel nem se desativa. Rota registrada como “Equipe interna”. |
| Estado “permissão negada” | inexistente (caía em erro genérico) | tela “Seu papel não abre esta tela” em Segurança e Equipe (Leitura/Suporte), Auditoria (Leitura) | Funcional | Explica que papel é exigido, oferece “Pedir acesso” (registra na auditoria) e a dica de trocar o papel no protótipo. Ações sem permissão dentro de telas permitidas ficam como “Só leitura”. |
| Estados carregando, vazio, erro | inexistentes (`loading/error/not-found`) | todas as listas e a visão geral respondem ao controle “Estado das listas” | Funcional | Vazio com filtros tem texto próprio e “Limpar filtros”. Erro tem “Tentar de novo”. |
| Página 404 do console | inexistente | qualquer `/c/...` desconhecido, e conta/evento/ticket inexistente | Funcional | Mantém o menu; sugere voltar e buscar. |
| Vocabulário de projeto na tela (H1, Onda C, T9, append-only, security_events, retention_jobs) | várias | removido de todas as telas | Funcional | Termos viram português de operação. Códigos técnicos de ação continuam visíveis só em fonte mono secundária na auditoria e segurança, por serem a referência de quem investiga. |
| Console sempre claro, sem identidade do casal | `ConsoleFrame` | `data-host-theme` forçado para claro dentro de `/c`, restaurado ao sair | Funcional | O tema escuro da barra “Protótipo” não afeta o console por desenho. **2ª passada:** logo oficial com a etiqueta “console”; faixa de contexto discreta e sempre visível (papel, pessoa, identidade confirmada, “ver como”); âmbar só em foco, seleção e estado ativo; sem mascote nem ilustração em vazios.  |
| (novo, 3ª passada) Linhas por página | só no redesign | seletor 10/15/25/50 acima de toda tabela | Funcional | Vale por tabela e volta à página 1. Substitui o tamanho fixo. |
| (novo, 3ª passada) Atalho `/` | só no redesign | `/` fora de campo foca a busca da tela (ou abre a busca global se não houver) | Funcional | Dica visual `/` dentro do campo; ⌘K continua. |
| (novo, 3ª passada) Detalhes por linha | colunas escondidas no celular | botão “Detalhes” em cada linha de tabela com colunas escondidas | Funcional | Mostra as colunas que não cabem; o estado aberto persiste ao paginar e ordenar. |
| (novo, 3ª passada) Risco da ação | só no redesign | selo no topo do formulário de ação: “Dá para desfazer logo depois”, “Dá para reverter depois, com registro” ou “Não dá para desfazer” | Funcional | Confirmação cresce com o risco: desfazer = toast; reverter = motivo + confirmação; irreversível = identidade + motivo + digitar o nome. |


## matriz-guest

[Origem e limitações](prototipo/matriz-guest.md).

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


## matriz-host-config

[Origem e limitações](prototipo/matriz-host-config.md).

| ID / funcionalidade | Tela atual (rota) | Nova tela (rota do protótipo) | Impl. | Nota de decisão |
|---|---|---|---|---|
| IDE-01 nome, convidados esperados, fuso | `/identity` | `/ajustes/evento` (nome, esperados); fuso **removido** | F | Dados do evento saíram da identidade (P-08). Fuso não entrou: o protótipo tem um único fuso fictício. |
| IDE-02 4 presets (Amanhecer…Jardim) | `/identity` | `/estilo` > Identidade (5 estilos × 6 combos) | F | Unificado no vocabulário do assistente (resolve P-08). "Jardim" some (sage é anti-padrão). |
| IDE-03 cor da festa + contraste | `/identity` | `/estilo` > Paleta > "Cor personalizada" | F | Selos de contraste vindos do motor central (`A.theme.resolve` + `A.contrast`): botão do convidado, detalhes no escuro e cor no claro, todos ≥4,5:1 por construção. O botão "Escurecer até ficar legível" saiu: o motor ajusta o tom sozinho e a tela explica o ajuste (3ª passada). |
| IDE-04 foco da capa V/H 25/50/75 | `/identity` | — | — | Não implementado (ver lacunas). |
| IDE-05 jeito de escrever / clima da noite | `/identity` | `/estilo` (fonte vem do estilo) | F | "Jeito de escrever" virou parte do Estilo; "clima" removido: convidado é sempre escuro, telão sempre noite. |
| IDE-06 prévia "Ficou assim" | `/identity` | `/estilo` coluna direita fixa: Convidado, Telão e Álbum juntos | F | Prévia multi-superfície ao vivo no desktop (as três ao mesmo tempo, cores resolvidas por `A.theme.scope`). No celular a prévia sai da primeira tela: botão "Ver como fica" abre um sheet com abas Convidado, Telão e Álbum (3ª passada). |
| IDE-07 modelos de telão (checkbox, validação) | `/identity` | `/estilo` > Modelos de telão | F | Pelo menos 1 ligado (erro com instrução). Plano Grátis só Polaroide (explicado). |
| IDE-08 salvar identidade | `/identity` | `/estilo` | F | Salvar → autosave com toast; sem botão (regra "nunca os dois"). |
| IDE-09 imagem de capa (upload/remover) | `/identity` | — | — | Não implementado (ver lacunas); a prévia usa ilustração. |
| MIS-01 ligar/desligar, ordenar, modo livre | `/missions` | `/estilo` > Missões | F | Lista única com switch, subir/descer (teclado), numeração romana recalculada. Sem arrastar. |
| MIS-02 prévia "Na câmera" | `/missions` | `/estilo` prévia Convidado (1ª missão ligada) | F | |
| MIS-03 missões personalizadas (criar, editar, remover) | `/missions` | `/estilo` > Missões | F | Criar com validação; renomear em modal; remover com "Desfazer". Prazo e emoji removidos (simplificação). |
| MIS-04 "Salvar missões" | `/missions` | `/estilo` | F | Autosave; some "alterações pendentes sem aviso" (P-05). Reflete em `A.data.missions` (evento e1). |
| REC-01 texto do recado | `/guestbook` | `/estilo` > Recado | F | Contador 0/280, autosave. |
| REC-02 áudio (aceite, gravar, remover) | `/guestbook` | `/estilo` > Recado | S | Gravação simulada (12 s), aceite obrigatório, remover com "Desfazer". |
| REC-03 "aparece a partir de" | `/guestbook` | `/estilo` > Recado (select por momento) | F | Opções por momento da festa (+ "agora" e "só quando eu publicar"). |
| REC-04 criar / salvar e publicar | `/guestbook` | `/estilo` | F | Os dois botões viram um só estado ("rascunho / publicado / aparece em…") por causa do seletor. |
| REC-05 prévia "como o convidado vê" | `/guestbook` | — | — | Recado não aparece na prévia Convidado (ver lacunas); há linha de status. |
| (gate) CTL-04 interação social | `EventControls` em `/evento` | `/estilo` > Interação social | F | Padrão "depois de Cerimônia", escolhido pelo casal; 3 modos. Sem `datetime-local` solto: o gatilho é um momento. Notificação fica desligada. |
| (menores) CTL-03 "Há menores" | `EventControls` | `/estilo` > Controle de menores | F | Desligar pede confirmação com consequência; só dono/casal editam; link em Privacidade. "Modo endurecido" não entrou (fora do escopo pedido). |
| QR-01 headline editorial | `/qrcode` | removido | — | Texto editorial cortado (P-04). |
| QR-02 aviso de rascunho | `/qrcode` | — | — | Fluxo de publicação é de outro módulo. |
| QR-03 cartão do QR | `/qrcode` | `/compartilhar` herói: placa em escala com o QR | S | QR ilustrativo, **não escaneia**, avisado na tela. |
| QR-04 link + copiar + ver como convidado | `/qrcode` | `/compartilhar` > Convite | F | Aponta para `#/g/:slug`. |
| QR-05 capa do evento + data | `/qrcode` | removido | — | Era cartão duplicado; capa vive em Estilo. |
| QR-06 imprimir / PNG / PDF | `/qrcode` | `/compartilhar` > "Só o QR" (fundo branco/transparente) e baixar peça | S | Fundo branco ou transparente; downloads simulados com toast que diz o arquivo. |
| CTL-10 peças (placa, card mesa, card missão, ZIP) | `EventControls` em `/evento` | `/compartilhar` herói: seletor Placa/Card de mesa/Card de missão | S | Prévia em escala por peça. Guardrails: QR ≥ 30 mm e contraste ≥ 7:1 bloqueiam o download com motivo; "usar a cor da Placa em todo o kit". |
| CTL-11 links do evento (convidado, WhatsApp, telão) | `/evento` | `/compartilhar` (link no herói, Telão, Mensagem para o grupo) | F | WhatsApp: mensagem editável + copiar; abrir é **I** (toast). |
| CTL-02 telão (pausar/ativar) | `EventControls` | `/compartilhar` > Telão (status grande, desconectar) | F | Pausar virou "Desconectar telão" com confirmação. |
| TEL-01 `/wall-display` | `/wall-display` | botão "Abrir telão" → `#/t/display` | F | Tela da TV é de outro módulo. |
| TEL-02 `/wall-pair` (código) | `/wall-pair` | `/compartilhar` > Telão método 1; "Parear agora" → `#/t/parear` | F/S | Código com "gerar outro"; a digitação na TV é simulada por botão rotulado. |
| TEL-03 `/wall-link` (link de uso único) | `WallLinkSender` | `/compartilhar` > Telão método 2 | F | 20 min com contagem regressiva; gerar novo invalida o anterior (confirmação); estados ativo/usado/expirou/substituído; "avançar 20 min" é atalho de protótipo. Resolve P-telão (3 caminhos sem ajuda única). |
| (histórico) o que está ligado | — | `/compartilhar` > Telão | F | Lista de conexões/links + resumo de modelos, interação e menores. |
| AJU-01 hub de 8 cartões | `/evento` | `/ajustes` (índice em texto à esquerda, painel único, campos em linha) | F | Leitura de documento (2ª passada); mobile = lista → detalhe. |
| AJU-02 / CTL-* "controles do evento" | `/evento` | distribuídos: Estilo, Compartilhar, Ajustes | F | Publicar, Moderação, Música, Assinar: fora do escopo/outros módulos. |
| (evento) nome, data, hora, local, tipo | — (não existia) | `/ajustes/evento` | F | Novo: edita e reflete em `A.data.events`; aviso do que muda, confirmação ao trocar tipo. Data fica no store (a contagem do núcleo não lê). |
| CST-01/02 consentimento (versões, aceites) | `/consent` | `/ajustes/privacidade` | F | Linguagem de casal; publicar nova versão (datada) com opção de pedir novo aceite; histórico; só totais. |
| (retenção) | — | `/ajustes/privacidade` e `/ajustes/exportar` | F | Dias 330/365 calculados a partir da data; aviso por e-mail 30 dias antes (switch). |
| EQP-01 lista de membros | `/team` | `/ajustes/equipe` | F | Mostra "Você" pelo papel simulado. |
| EQP-02 convidar por e-mail | `/team` | `/ajustes/equipe` | S | Validação de e-mail e duplicado; e-mail não sai (rotulado). |
| (equipe) remover / trocar papel / reenviar | — (não existia) | `/ajustes/equipe` | F | Novo; remover pede confirmação; trocar papel com "Desfazer". |
| (equipe) vazio para cerimonialista | `/team` (tela em branco) | `/ajustes/equipe` | F | Estado explicado (P-09). |
| CTL-05 entrega das fotos | `EventControls` | `/ajustes/exportar` > Entrega ao convidado | S | Switch + quando enviar + "Enviar agora" simulado. |
| (exportar) arquivo / Drive / livro PDF | Home/Ajustes (Drive não verificado) | `/ajustes/exportar` | S / I | Drive: conectar, reautenticar, desconectar, exportar agora; tudo simulado. Livro e ZIP: simulados. |
| (apagar evento) | — (não existia) | `/ajustes/exportar` | F/S | Digitar "apagar" para confirmar; só dono; **nada é apagado** no protótipo (toast avisa). |
| (plano) | `/billing`, CTL-08 | `/ajustes/plano` | F | Só resumo e link para `#/h/plano` (outro módulo). |
| COM-01 texto "Entre anfitriões" | `/comunidade` | `/comunidade` | F | Banner explica privacidade (P-comunidade). |
| COM-02 chips de assunto | `/comunidade` | `/comunidade` | F | Filtro persistente + busca (novo). |
| COM-03 começar conversa | `/comunidade` | `/comunidade` (modal) | F | Validação; "Desfazer". |
| COM-04 lista, paginação | `/comunidade` | `/comunidade` | F | 6 conversas de exemplo marcadas "Exemplo fictício"; "Ver conversas mais antigas". Vazio, carregando e erro. |
| COM-05 thread, responder, apagar | `/comunidade/[postId]` | `/comunidade/:postId` | F | Apagar com confirmação; conversa inexistente/oculta tem estado. |
| (comunidade) denunciar / bloquear / ocultar | — (não existia) | `/comunidade/:postId` menu "⋯" | S | Denúncia oculta a mensagem para você; bloquear autor com confirmação e "Desfazer". Moderação real é do console. |
| INS-01 chips de tema | `/inspiracao` | `/inspiracao` | F | |
| INS-02 cartões + Salvar | `/inspiracao` | `/inspiracao` | F | Agora existe a visão "Salvas (n)" (era problema do inventário). |
| INS-03 vazio | `/inspiracao` | `/inspiracao` | F | Vazio por tema e vazio de salvas. |
| (inspiração) "usar no evento" | — (não existia) | `/inspiracao` | F | Aplica missão, modelo de telão, estilo, recado, mensagem ou gate, com "Desfazer"; liga Inspiração a Estilo. |
| Glossário (7 termos) | menu da conta > Ajuda (sheet) | `/h/ajuda` seção Glossário | F | 12 termos, com busca, em duas colunas; Ajuda deixou de ter abas (2ª passada): é uma página de leitura com índice por âncoras e o mascote na abertura. |
| Menu da conta | `MenuDaConta` | `A.acts['account-menu']` (núcleo) → rotas de Ajustes e Ajuda | F | Os destinos do menu existem; o menu em si é do núcleo. Tema e sair: núcleo. |
| (FAQ) | — | `/h/ajuda` seção Perguntas frequentes | F | Nova. |
| CTL-07 "Preciso de ajuda" (ticket) | `EventControls` | `/h/ajuda` seção Falar com o suporte | S | Cria "HC-nnnn", lista os pedidos; urgência em linguagem de festa (sem P0/P1/P2). |
| Tour de primeiro acesso | tour 6 passos | `/h/ajuda` seção Tour; cartão não modal que navega e destaca o menu | F | 7 passos; Esc/Sair; marca "feito". |
| Command palette | não existia no painel | núcleo + `A.map` e 2 ações | F | Registrei telas e ações ("Fazer o tour"). |


## matriz-host-criar

[Origem e limitações](prototipo/matriz-host-criar.md).

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F1 Título "Seu painel" + e-mail | `/admin` | `#/h` "Seus eventos", saudação com o primeiro nome; e-mail na barra superior e no menu da conta | Funcional | Título passa a dizer o que a tela é (D1). |
| F2 / LST-02 Contador "N eventos" | `/admin` | `#/h` (texto "N eventos", muda com busca e filtro, `role=status`) | Funcional | Contador agora reflete o filtro. |
| F3 / LST-02 "+ Novo evento" | `/admin` | `#/h` botão primário no cabeçalho → `#/h/novo/1` (some no estado vazio, onde o CTA é "Criar meu primeiro evento") | Funcional | Um só primário por tela. |
| F4 / LST-03 Cartão do evento (nome, tipo, data) | `/admin` | `#/h` **lista editorial**: capa (ou monograma em Fraunces na cor do evento) + nome em Fraunces grande + tipo, data, local, plano → `#/h/e/<id>/hoje` | Funcional | Corrige P-08/D7: o nome é o título, não o slug humanizado. Arte: sem cartões; cada linha é um filete com a capa do evento como âncora visual. |
| F5 / LST-03 Selo de status (ao vivo/agendado/encerrado) | `/admin` | `#/h` à direita da linha: **dias que faltam em Fraunces grande** (antes), "Ao vivo agora" (durante) ou "Foi há N dias" (depois); plano em texto | Funcional | Responde à fase da barra Protótipo para o evento 1; eventos criados usam a data real. |
| F6 / LST-04 Sugestão de segundo evento por pack | `/admin` | — | Removido | Depende de `pack.sugereAntes`, sem dado no protótipo e sem decisão de produto; o caminho "Novo evento" fica sempre visível. Registrado em Lacunas. |
| F7 / LST-05 Rodapé "Crie o portal do fornecedor" | `/admin` | `#/h` rodapé; o botão procura a entrada de fornecedor no mapa do protótipo e navega; se ainda não existir, avisa por toast | Funcional (depende do módulo de fornecedor) | Mantido como link discreto. |
| F8 / LST-06 "Sair" sem confirmação (e duas formas de sair) | `/admin` + menu da conta | Uma forma só: "Sair" no menu da conta e no rodapé do trilho; sai direto e avisa por toast | Funcional | Unifica as duas saídas (diagnóstico F8). Sem confirmação porque entrar de novo é um clique. |
| Busca (não existia) | — | `#/h` campo "Buscar por nome, tipo ou local" (sem acento) | Funcional | Pedido do brief; filtra sem recarregar a página. |
| Ordenar (não existia) | — | `#/h` seletor: mais próximos / criados por último / nome | Funcional | Ao vivo sempre primeiro em "mais próximos". |
| Filtrar (não existia) | — | `#/h` filtros em texto Todos / Preparando / Ao vivo / Encerrados com contagem (sublinhado âmbar no ativo) | Funcional | — |
| Estado vazio ("Bem-vindo", `LST-01`) | `/admin` | `#/h` com a barra Protótipo em "Vazio" ou sem eventos, com o mascote | Funcional | Texto "em poucos passos". |
| Estado de carregamento e erro | `loading.tsx` / `error.tsx` | `#/h` "Carregando" e "Erro" da barra Protótipo (com "Tentar de novo") | Funcional | Estados completos nas duas telas de lista. |
| Vazio com filtro (não existia) | — | `#/h` "Nenhum evento encontrado" + "Limpar busca e filtros" | Funcional | — |
| Rascunho: "continuar de onde parei" (não existia, D14) | — | `#/h` linha em filete com nome e passo do rascunho ("N de 3"): "Continuar de onde parei" / "Descartar" (com confirmação) | Funcional | — |
| Redirect sem sessão (`redirect("/admin/sign-in")` sem `next`) | `/admin` | `#/h` sem login → `#/h/entrar?next=…` | Funcional | Agora preserva o destino. |
| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F9 / ENT-01 E-mail + "Enviar link" | `/admin/sign-in` | `#/h/entrar` campo com rótulo, validação inline ("Esse e-mail parece incompleto…"), botão sempre ativo | Simulado (envio) | O botão desabilitado sem explicação virou erro escrito. Nenhum e-mail sai de verdade. |
| F10 / ENT-02 "Verifique seu e-mail" + reenviar | `/admin/sign-in` | `#/h/entrar` passo "Verifique seu e-mail": e-mail citado, "Reenviar" com contagem de 30 s, "Trocar e-mail" | Simulado | Resolve "reenviar é só voltar ao formulário" (sem contador). |
| F11 Link "Abrir link (dev)" | `/admin/sign-in` | `#/h/entrar` botão "Abrir o link do e-mail (simulado)" + "Simular um link vencido" | Simulado | Faz o papel do clique no e-mail; rotulado como simulado. |
| F12 / ENT-03 "Entrar com Google" | `/admin/sign-in` | `#/h/entrar` abre janela "Entrar com Google (simulado)" com "Continuar como …" ou "Simular uma falha" | Simulado / Depende de integração | O SSO real redireciona ao Google; aqui há a janela que simula as duas saídas. |
| F13 / ENT-04 "Confirmar acesso" (`?m=token`) | `/admin/sign-in?m=` | `#/h/entrar?m=ok` botão "Entrar no painel"; o acesso só é gravado no clique | Simulado | Mantém a regra de não gastar o link antes do clique. |
| F14 `?next=` filtrado | `/admin/sign-in?next=` | `#/h/entrar?next=/h/…` aceita só caminhos `/h…`, bloqueia `//`, `:` e `\` | Funcional | — |
| ENT-05 Erros de link/envio | `/admin/sign-in` | Link vencido: "Este link não vale mais" + "Pedir um novo link" (e-mail já preenchido). Envio com falha: faixa de erro com a barra em "Erro" | Simulado | Toda mensagem diz o que houve e o que fazer; corrige "confirmação com erro não preenche o e-mail". |
| `?error=google` ignorado (diagnóstico D12) | `/admin/sign-in?error=google` | `#/h/entrar?error=google` faixa "Não conseguimos entrar com o Google…" com o que fazer | Funcional | Correção do problema do inventário. |
| Fallback "Carregando…" cru | `/admin/sign-in` | `#/h/entrar` com a logo oficial (`A.logo`) e layout próprio | Funcional | A marca falsa (disco com "a") foi trocada pela logo oficial. |
| F38–F40 Rotas de SSO e magic link do convidado (sem UI) | `/auth/**` | Só a janela simulada do Google acima | Depende de integração | O convidado nunca entra por aqui; `guest-magic` fica no módulo do convidado. |
| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F15 / NEW-01 Tipo de evento | Passo 1 de 5 | `#/h/novo/1` (parte de cima) lista de 6 tipos em filete, nomes em Fraunces (radiogroup, setas e 1..6) | Funcional | Sem ícones, sem cartões com foto). Trocar tipo volta momentos e missões desligadas ao padrão (com aviso por toast). |
| F15 / NEW-06 "Ajustar missões" | Passo 4 | `#/h/novo/1` link "Ajustar" → folha "Missões e momentos" (liga/desliga missões do pack, cria missão própria, remove com desfazer; **os momentos da festa moram na mesma folha**) | Funcional | Participação deixou de ser passo (04-arquitetura §6). Momentos saíram do passo de data para não competir com a decisão. |
| F22 / NEW-06 Passo "Participação" | Passo 4 | — (consolidado na folha acima) | Funcional | Missões do pack já vêm ligadas por padrão. |
| F16 Atalhos de teclado | Wizard | `#/h/novo/*` Enter continua, Esc/Backspace volta, 1..N escolhe tipo (passo 1) ou estilo (passo 3), setas dentro dos grupos; ignorados em campos e overlays | Funcional | Dicas visíveis no rodapé (some no celular). |
| F17 / NEW-02 Nome (obrigatório, 60, contador) | Passo 2 | `#/h/novo/1` (abaixo do tipo) campo grande em Fraunces com exemplo do pack e contador | Funcional | Nome em Fraunces grande; mesmo passo do tipo. |
| F17 / NEW-02 Data e hora | Passo 2 | `#/h/novo/2` data (só de amanhã em diante) e hora (padrão 18:00 explicado) | Funcional | Primeiro bloco do passo 2. |
| F17 / NEW-02 Convidados esperados | Passo 2 | `#/h/novo/2` convidados 1–999 | Funcional | Junto do local. |
| F17 / NEW-02 Local + CEP (ViaCEP) | Passo 2 | `#/h/novo/2` CEP com máscara, busca simulada (5 CEPs de exemplo), preenche o local sem apagar o que o usuário digitou, degrada com mensagem | Simulado | A consulta é fingida; o comportamento (atraso, respostas atrasadas ignoradas, falha) é o real. |
| NEW-04 Fuso/idioma não editáveis | Passo 2 | `#/h/novo/2` texto "Fuso: Brasília (GMT-3)" | Funcional | O fuso agora fica visível, mas continua fixo. Editar é lacuna. |
| F17 Lista de momentos do pack | Passo 2 | Folha "Missões e momentos" (chips editáveis: remover com desfazer, adicionar com Enter ou botão, sem repetir, máximo 12) | Funcional | Momentos sugeridos por tipo (dado do pack). **Mudou de lugar** (do passo de data para a folha aberta em `#/h/novo/1`). |
| F18 / NEW-03 "Criar sob" + e-mail obrigatório | Passo 2 | `#/h/novo/3` seletor "Criar sob" (Minha conta ou fornecedor) dentro do resumo recolhível; fornecedor exige e-mail validado e explica o papel | Funcional | **Mudou de lugar** (do passo de data para o resumo do passo 3): é contexto da criação, não decisão da festa. Lista de fornecedores vem de `A.data.vendors` se existir, senão de dois exemplos locais. |
| F19 Validação só após tentar | Wizard | `#/h/novo/*` erro inline, `aria-invalid`, foco no 1º erro, também ao criar (leva ao passo com erro: nome 1, data e convidados 2, e-mail 3) | Funcional | `canAdvance` sempre true deixou de existir. |
| F20 / NEW-05 Capa (upload) | Passo 3 | `#/h/novo/3` escolher/trocar/remover (com desfazer); valida tipo e tamanho; redesenha em canvas (tira EXIF/GPS); guarda reduzida no navegador | Funcional | Erro por tipo/tamanho com instrução. Foco da capa vira Topo/Centro/Base. **Sem foto, a capa é o monograma da festa** em Fraunces (antes, ilustração genérica). |
| F20 Paleta extraída da foto | Passo 3 | `#/h/novo/3` opção "Cor da sua foto" (média da foto, escurecida até contraste 4,5:1) | Funcional | Simplificação: uma cor, não várias. |
| F20 / NEW-05 5 estilos | Passo 3 | `#/h/novo/3` radiogroup com o nome na fonte do estilo (1..5); muda fonte e cantos na prévia | Funcional | — |
| F20 / NEW-05 Par de cores, 6 combos, personalizada | Passo 3 | `#/h/novo/3` 6 combos + foto + personalizada (duas cores) + **selo de contraste** (texto, ícone e razão) | Funcional | Selo é adição do redesign: nada só por cor, avisa quando o texto fica ilegível. |
| F21 `LivePreview` | Passos 3 e demais (folha no celular) | **Todos os passos**: prévia ao vivo grande com abas Convidado / Telão / Álbum, ao lado (desktop) ou em faixa no topo (celular); a capa muda com o tipo, o nome, a data, o local, o estilo, as cores e a foto | Funcional | Antes só aparecia no passo 3. Telão e álbum mostram foto vertical inteira. Fotos são ilustração. |
| F23 / NEW-07 Revisão em passo próprio | Passo 5 | `#/h/novo/3` resumo recolhível "O que vai ser criado" com "editar" por linha (leva ao passo certo) e aviso de campo faltando | Funcional | Fica dentro do passo 3 (recolhível), como no fluxo anterior. Inclui linha "Visual". |
| F24 Navegação (StepRail, voltar, sair) | Wizard | `#/h/novo/*` Voltar, Continuar, "Sair" salva o rascunho e avisa; progresso no arco ("Passo N de 3") | Funcional | O trilho de passos clicável foi trocado pelo arco; voltar a um passo anterior é por Voltar ou por "editar" na revisão. |
| D14 Rascunho persistido (não existia) | — | `#/h/novo/*` salva a cada alteração ("Rascunho salvo neste navegador."); `#/h/novo/1` oferece "Continuar de onde parei" / "Começar do zero" (com confirmação) | Funcional | Autosave com texto de estado, sem botão Salvar. |
| F25 / NEW-08 Criar (`POST /api/admin/events`) | Passo 5 | `#/h/novo/3` "Criar evento" (também com Enter): o evento entra em `A.data.events` (persistido em `eventosExtras`) e abre o Pronto | Simulado (servidor) | Data real vira fase e contagem corretas. Erro: com a barra em "Erro", a faixa explica e mantém o rascunho. |
| F25 Missões livres via `PUT …/challenges` | Passo 5 | Gravadas junto do evento (`missoes`) | Simulado | — |
| Passo "Identidade" com telão (4 modelos) | Passo 3 | — | Removido | Escolha de modelo do telão fica em Compartilhar › Telão; a criação usa os 4 modelos. |
| Loading do assistente | — | `#/h/novo/*` com a barra em "Carregando" mostra esqueleto | Funcional | — |
| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F26 / NEW-09 Herói "{nome} está pronto." | Pronto | `#/h/novo/pronto?id=…` **mascote espiando + estrela** (`A.mascot`, `A.star`, `A.celebrate`) ao lado do título e da data | Funcional | Sem id, mostra o último evento criado (ou o primeiro). O título deixou de usar a cor do evento. |
| F27 / NEW-09 "Ir para meu evento" | Pronto | Botão de linha "Abrir o painel" no fim da página → `#/h/e/<id>/hoje` | Funcional | O painel abre normalmente com o evento novo. O primário da tela é o WhatsApp. |
| F28 "Ver como convidado" | Pronto | Botão → `#/g/<slug>` | Funcional | — |
| F28 "Compartilhar" (WhatsApp) | Pronto | Mensagem pronta visível + **"Mandar por WhatsApp" (único CTA principal)** + "Copiar mensagem" | Simulado (WhatsApp) | Texto da mensagem aparece, em vez de só o botão. |
| F29 / NEW-09 Upload silencioso da capa | Pronto | Item "Capa do convite" do checklist → "Adicionar foto" (mesma validação) | Funcional | Deixa de ser silencioso: o usuário vê o que subiu. |
| F30 QR inline, link e copiar | Pronto | **Placa impressa** (nome, QR, link, "Aponte a câmera") à esquerda; link visível + "Copiar link" ao lado da mensagem (QR ilustrativo, avisa que não escaneia) | Funcional / Simulado (QR) | QR e link na própria tela, sem ir ao painel (04-arquitetura §6). Arte: o QR é o objeto que vai para a mesa. |
| F30 "Baixar placa com QR" | Pronto | "Baixar placa com QR" mostra toast do que seria baixado | Simulado | O PDF real é do módulo Compartilhar. |
| F31 `AccessEmailStep` (flag ADR 0020) | Pronto | — | Removido | Quem criou já está dentro; o envio de acesso por e-mail fica atrás da flag do produto e não é um passo do protótipo. |
| F32 "Abrir portal do fornecedor" | Pronto | Aparece só se criado sob fornecedor; navega pelo mapa do protótipo | Funcional (depende do módulo de fornecedor) | — |
| F33 / NEW-09 "Ativar o Completo — R$ 199" | Pronto | "Ativar Completo · {preço de `A.data.planos`}" → checkout simulado (forma de pagamento, total, "Pagar (simulado)", recusa simulável) | Simulado / Depende de integração | Preço e itens vêm do catálogo único (D13). Sucesso gera fatura e muda o plano do evento. |
| F34 Checklist "Já pronto: X de 4" | Pronto | "O que falta": 5 itens (link e QR, capa, missões, telão, equipe) com contagem real e ação em cada pendente | Funcional | Corrige "telão e QR marcados prontos por constante": telão só fica pronto quando ligado (hoje sempre pendente aqui). |
| CTAs concorrentes no Pronto | Pronto | Um primário (Mandar por WhatsApp); o resto é botão de linha ou link | Funcional | — |
| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F35 Cabeçalho "Cobranças" + voltar | `/admin/billing` (órfã) | `#/h/plano` "Plano e cobrança" (`t-title`) com o evento em foco num seletor discreto (`?e=<id>`); no trilho da conta e no menu da conta | Funcional | Resolve a rota órfã. Sem migalhas (o trilho já situa). |
| COB-01 Texto introdutório | `/admin/billing` | Frase em Fraunces ("Para que nenhuma foto fique de fora.") + "O Completo é pago uma vez por evento… Sem mensalidade." | Funcional | Remove o vocabulário interno (D8). Pagamento único por evento; assinatura mensal é só do fornecedor (outro módulo). |
| F36 / COB-02 Lista de faturas | `/admin/billing` | `#/h/plano` "Faturas": lista em filete (descrição + evento, data, forma, valor, situação Paga/Pendente/Não concluída/Vencida) com filtro Todas/Pagas/Em aberto (links, não pílulas) | Funcional | Vínculo cobrança ↔ evento visível. |
| F36 "Ver fatura" (link externo) | `/admin/billing` | "Ver fatura" (por linha e "Ver fatura deste evento") abre janela com os dados + "Baixar PDF (simulado)" | Simulado | Sem link externo. |
| Pagar fatura em aberto (não existia) | — | "Pagar agora" / "Tentar de novo" na fatura e na linha do evento → mesmo checkout (retoma a fatura aberta, não cria outra) | Simulado | Um só caminho de pagamento. |
| F37 `GET /api/admin/billing` + estados (C/E/V/S) | `/admin/billing` | `#/h/plano` com Carregando / Vazio / Erro (com "Tentar de novo") da barra Protótipo; cabeçalho e seletor ficam | Funcional | — |
| **Evento gratuito: jornada de valor (novo)** | — | Composição editorial: frase, "Seu evento hoje" (fotos x limite com filete, missões ativas, telão pareado, lidos de `A.store`/`A.data`), preço em Fraunces com condição de pagamento, benefícios numerados (só os itens de `A.data.planos`, com o equivalente no Grátis) e **uma** ação primária "Ativar o Completo" | Funcional / Simulado | Checkout com loading, erro recuperável (recusa/indisponível) e sucesso. Preço, itens e limite do Grátis vêm de `A.data.planos`. |
| **Evento pago: gestão (novo)** | — | Plano atual, situação do pagamento (Pago / Pendente / Não concluído com caminho "Pagar agora"/"Tentar pagar de novo"), uso vs. disponível em filetes (fotos, missões, telão, álbum e livro, exportação), valor entregue; primária "Abrir o painel do evento", secundária "Ver fatura deste evento", terciária "Gerenciar plano" (menu) | Funcional / Simulado | Downgrade não é cancelamento de assinatura: é mudança do plano de um evento já pago, sem devolução. |
| Plano atual e trocar (não existia) | — | Ativar via checkout; voltar ao Grátis só pelo diálogo (ver abaixo) | Funcional / Simulado | O plano é por evento. |
| **Outros eventos (novo)** | — | Lista em filete (nome, data, plano + situação, UMA ação: "Ver o Completo", "Gerenciar", "Pagar agora" ou "Tentar de novo"). Celular: nome em linha cheia, plano e ação na linha de baixo; desktop: 3 colunas | Funcional | Substitui a tabela de preços única e os cartões idênticos. |
| Tabela de preços única (D13) | 3 arquivos divergentes | Preço e itens lidos só de `A.data.planos`; a comparação Grátis x Completo mora nos benefícios ("No Grátis: …") e no diálogo de downgrade | Funcional | A tela Pronto e o checkout leem a mesma fonte. A tabela comparativa foi removida (informação aparece uma vez). |
| **Downgrade com retenção honesta (novo)** | — | "Voltar ao Grátis" (menu Gerenciar plano) não executa: abre UM diálogo por tentativa, "Que tal continuar guardando cada momento?": consequências reais (limites do Grátis x Completo), "Continuar com o Completo" (primária), "Confirmar mudança para o Grátis" (texto vermelho), "Voltar sem alterar" | Funcional / Simulado | Sem escassez, contador ou depoimento. O valor pago não ser devolvido é premissa herdada da 1ª versão: confirmar com o produto. |
| **Oferta de retenção (novo)** | — | Só aparece com campanha válida em `A.store` `retencao:campanha` ({id, plano, tipo, valor, validade, limite, status}); validada por `servidorValidaOferta(evento, campanha)` (plano, status, validade, limite, tipo/valor, uso por evento) que devolve o motivo. Mostra desconto, preço final, condições e prazo; aceita = crédito para o próximo Completo (aplicado no checkout); registro em `retencao:log` (exibida/aceita/recusada) | Funcional (simulado) / Depende de backend | Padrão: nenhuma campanha. Semântica (crédito no próximo evento) é decisão de produto proposta aqui; no real a validação e o limite vivem no servidor. |
| **Analytics `A.track` (novo)** | — | Emissor local (`analytics:log`, sem PII nem valores): planos_visualizados, upgrade_clicado, checkout_iniciado, pagamento_concluido, downgrade_tentado, oferta_exibida, oferta_aceita, oferta_recusada, downgrade_confirmado, erro_fluxo; vista no painel de simulação | Funcional (local) / Depende de backend | Filtro de propriedades bloqueia nome, e-mail, cartão, forma, valor e preço. |
| **Painel de simulação (novo)** | — | `<details>` no fim da tela: configurar/limpar campanha, mudar situação do pagamento do evento, ver analytics e registro da oferta | Simulado | Rotulado "só no protótipo"; não aparece para o usuário final. |
| **API `A.plan` (novo)** | — | `A.plan.upgrade(eventId)`, `A.plan.downgrade(eventId)`, `A.plan.nudge(contexto[, {eventId, critico, superficie}])` → bloco HTML sóbrio ou '' (evento Completo, convidado, tarefa crítica, não-dono). Contextos: apos-criar, limite-gratis, antes-da-festa, telao, recurso-exclusivo | Funcional | Outros módulos podem chamar; o clique leva a `#/h/plano?e=<id>&de=<contexto>`. Nenhum módulo chama ainda. |
| Forma de pagamento (não existia) | — | Lista em filete (cartão Visa final 4242, Pix): tornar padrão, adicionar cartão (só 4 dígitos), remover (confirmação; não deixa remover a última) | Simulado | Nenhum dado de cartão real é pedido ou guardado. |
| Papéis (não existia) | — | Casal e cerimonialista veem a tela com aviso e botões desativados | Funcional | Só o dono troca plano e pagamento (regra proposta; confirmar com o produto). |
| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F41 `AdminShell` (conta) | `/admin` | Casca de conta (trilho + barra inferior no celular) em `#/h` e `#/h/plano`; sem trilho de evento | Funcional | Entrada e criação ficam fora do trilho do evento. |
| F42 `MenuDaConta` (tema, ajuda, sair) | Dentro do evento | Menu da conta em `#/h`: eventos, plano e cobrança, tema, sair | Funcional | Ajuda fica com o módulo do painel. |
| F43 `AppNav` mobile | Dentro do evento | Fora do escopo (módulo do painel); aqui há barra inferior própria de 4 itens | Funcional | — |
| Mapa do protótipo e ⌘K | — | 5 entradas no mapa + 3 comandos (novo evento, plano e cobrança, sair) | Funcional | — |


## matriz-host-evento

[Origem e limitações](prototipo/matriz-host-evento.md).

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


## matriz-vendor

[Origem e limitações](prototipo/matriz-vendor.md).

| ID / funcionalidade | Tela atual (rota) | Nova tela (rota do protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| F44 Onboarding passo 1: nome e endereço | `/admin/vendor/new` (cria já no passo 1) | `#/f/novo` etapa 1 | Funcional | Nada é criado até "Criar meu portal"; só rascunho (D14). Endereço derivado do nome até ser editado; checagem de disponibilidade simulada; endereços reservados. |
| F45 Passo 2: cor e tema | `/admin/vendor/new` | `#/f/novo` etapa 2 | Funcional | Passa a incluir estilo e logo, com prévia ao vivo e checagem de contraste (WCAG) que não bloqueia: o motor central (A.theme) ajusta o tom até ficar legível e a mensagem diz o ajuste feito. Um só seletor de cor (swatches da marca + cor livre) em onboarding e Marca. |
| F46 Passo 3: próximo passo | `/admin/vendor/new` | `#/f/novo` etapa 3 e tela "portal criado" | Funcional | Etapa 3 vira escolha de plano; depois, "Criar o primeiro evento" (leva a `#/h/novo/1?vendor=`) como única ação principal. |
| F47 Barra de progresso | `/admin/vendor/new` | `#/f/novo` | Funcional | Arco da marca como progresso (sol percorre o arco por etapa) com lista de etapas e `aria-current="step"`. |
| Rascunho do onboarding | inexistente | `#/f/novo` | Funcional | Salvo enquanto digita; ao voltar, "Continuar de onde parei" ou descartar (com confirmação). |
| F48 Seleção de plano | `/admin/vendor/checkout` | `#/f/:vid/checkout` | Funcional | Planos vêm da tabela única; descrições não divergem mais. |
| F49 Forma de pagamento PIX ou cartão | idem | `#/f/:vid/checkout` | Simulado | Sem dados de cartão no protótipo. |
| F50 Resumo do pedido | idem (aside escuro) | `#/f/:vid/checkout` | Funcional | Resumo em filete, não em coluna escura. |
| F51 Confirmar assinatura | idem | `#/f/:vid/checkout` | Simulado | Pede e-mail de cobrança (faltava), validação inline. |
| F52 Resultado: pagamento | idem (link externo) | `#/f/:vid/checkout` etapa de pagamento | Depende de integração (simulado) | PIX com QR de exemplo e código; botões "Simular: pagamento aprovado" e "recusado". Evita sair para link externo sem contexto. |
| Pagamento atrasado ou pendente | `/admin/vendor/[id]/billing` | `#/f/:vid/checkout` direto na etapa de pagamento | Simulado | "Regularizar" leva ao pagamento da fatura atrasada. |
| F53 Insights: cartões por fornecedor | `/admin/vendor/insights` | `#/f/:vid/insights` | Funcional | Três números e definição de "participação" em português simples (sem "H1"). |
| F54 Insights: lista de eventos | idem | `#/f/:vid/insights` | Funcional | Só eventos da carteira do fornecedor; ordenar e filtrar por cliente; barra de participação; exportar planilha (simulado). |
| F55 Cabeçalho do fornecedor, papel e plano | `/admin/vendor/[id]/settings` | Rail (nome e monograma do fornecedor, plano e papel no seletor) e barra superior | Funcional | O rail mostra a marca do fornecedor (monograma ou logo enviada, cor `--ac` dele) e "feito com Albora" discreto com o símbolo oficial; o selo some no plano Agency. |
| F56 Editar nome e endereço | `.../settings` | `#/f/:vid/ajustes` | Funcional | Mudar o endereço pede confirmação e avisa que links antigos param. Botão Salvar (sem autosave). |
| F57 Permissão negada para Equipe | `.../settings` | Telas Marca, Cobrança, Ajustes, Assinatura | Funcional | Mensagem diz quem pode mudar e como resolver. |
| F58 Editor de marca (cor, tema, logo, neutros) | `.../settings` | `#/f/:vid/marca` | Funcional | Logo por envio de arquivo (até 300 KB) em vez de URL; estilo dos títulos; prévia lateral; selo "com Albora" explicado por plano. Neutros opcionais removidos (neutros seguem a marca Albora). |
| F59 Contador de equipe no plano | `.../team` | `#/f/:vid/equipe` | Funcional | Conta convites pendentes. |
| F60 Convite por e-mail e papel | idem | `#/f/:vid/equipe` | Simulado | E-mail simulado; e-mail duplicado tem mensagem própria. |
| F61 Limite do plano | idem | `#/f/:vid/equipe` | Funcional | Aviso com "Ver planos" no lugar do formulário. |
| F62 Lista de membros, papel e remover | idem | `#/f/:vid/equipe` | Funcional | Mudar papel aplica com "Desfazer"; remover tem `A.confirm` com consequência; não deixa ficar sem administrador. |
| F63 Feedback ao vivo | idem | Toasts | Funcional | `aria-live` no toast. |
| Convites pendentes (lacuna do inventário) | inexistente | `#/f/:vid/equipe` | Funcional | Reenviar (simulado) e cancelar com desfazer. |
| Rótulo "Painel" que levava ao portal | `.../team` | Navegação do shell | Corrigido | Rail com Eventos, Clientes e equipe, Marca, Cobrança, Insights; "Ver portal público" separado. |
| Clientes (lista) | inexistente no console | `#/f/:vid/equipe?aba=clientes` | Funcional | Adicionar, editar, remover (com confirmação) e ver eventos do cliente. |
| F64 Sem assinatura | `.../billing` | `#/f/:vid/cobranca` | Funcional | Mostra a tabela de planos com "Assinar". |
| F65 Histórico de pagamentos | idem | `#/f/:vid/cobranca` | Funcional | Todos os status traduzidos (paga, em aberto, aguardando, atrasada, cancelada, estornada, em análise). Datas sem fuso. Recibo é simulado. |
| F66 Plano vigente, troca de plano e bloqueios | idem (aside escuro) | `#/f/:vid/cobranca` | Funcional | Upgrade com valor proporcional (simulado); downgrade agendado para a próxima cobrança e bloqueado se equipe ou eventos passam do limite, dizendo o que ajustar. Mostra a próxima cobrança. Os três planos viraram uma comparação tipográfica em tabela (nome e preço em Fraunces, linhas em filete), com o plano atual declarado em texto. |
| F67 Cancelar assinatura | idem (confirmação inline) | `#/f/:vid/cobranca` | Funcional | `A.confirm` com consequência; "Desfazer cancelamento" até a data. |
| F68 Estados: histórico indisponível, vazio, atrasada, provedor | idem | `#/f/:vid/cobranca` | Funcional | Carregando, vazio e erro do protótipo; aviso de atraso com "Regularizar". |
| F69 Shell do portal do fornecedor | `/f/[slug]` (VendorShell) | `#/f/v/:slug` | Funcional | Vitrine editorial: nome do fornecedor em título grande, par de imagens, pacotes como lista tipográfica em filete, cor do fornecedor em `--ac` (botão, filete, monograma). Selo "feito com Albora" some no plano Agency. |
| F70 Título muda por estado | `/f/[slug]` | Painel `#/f/:vid/eventos` | Funcional | Avisos de assinatura e limite de eventos no topo. |
| F71 Ações rápidas | `/f/[slug]` | `#/f/:vid/eventos` | Funcional | Uma ação principal: criar evento para um cliente. |
| F72 Cartão resumo de 3 métricas | `/f/[slug]` | `#/f/:vid/insights` | Funcional | Saiu da Home do fornecedor para Insights. Em vez de três cartões, um número herói (participação média) em Fraunces com o arco da marca. |
| F73 Lista de eventos da carteira | `/f/[slug]` (não clicável) | `#/f/:vid/eventos` | Funcional | Tabela densa em filete: busca, filtro por cliente, situação em abas de texto com contagem e ordenação clicando no título da coluna (Evento, Cliente, Data, Convidados, Fotos; em telas pequenas, um seletor "Ordenar"). Cota de eventos ativos no arco da marca. Eventos clicáveis (os três primeiros abrem o painel do evento; os demais abrem um resumo). |
| F74 Botão de assinar | `/f/[slug]` | Avisos em Eventos e Cobrança | Funcional | Estados ativa, pendente, atrasada e sem assinatura. |
| F75 Área administrativa (`details`) | `/f/[slug]` | Rail do shell | Não aplicável | Não verificado no inventário; substituído pela navegação. |
| Criar evento sob o fornecedor | `/admin/new?vendor` | `#/f/:vid/eventos` botão, depois `#/h/novo/1?vendor=&cliente=` | Funcional | Modal escolhe cliente (ou cria um) e respeita a cota do plano. |
| Portal público (vitrine) | `/f/[slug]` | `#/f/v/:slug` | Funcional | Marca, pacotes, contato (formulário validado, envio simulado), WhatsApp simulado; estados não publicado, carregando, erro, não encontrado. |
| Pacotes da vitrine | inexistente | `#/f/:vid/ajustes` | Funcional | Adicionar e remover (com desfazer). |
| Excluir portal | inexistente | `#/f/:vid/ajustes` | Funcional | Confirmar digitando o nome do negócio. |
| 2.8 Landing de fornecedores | `/fornecedores` | `#/p/fornecedores` | Funcional | Uma tela enxuta e sóbria: promessa, 4 passos, comparação de planos da tabela única, CTA. Cabeçalho com a logo oficial. |
| 4.1 `/privacidade` | `/privacidade` | `#/p/privacidade` | Funcional | Índice com atalhos (sem âncora de hash, que conflita com o roteador), data e versão vindas de uma constante em `A.data.vendor.legal`, `SkipLink`. Texto resumido. |
| 4.2 `/15-anos` | `/15-anos` | `#/p/15-anos` | Funcional | Aviso de que exige consentimento de menores; leva a `#/h/novo/1?tipo=aniversario&pack=15-anos`. |
| Seletor de portal | inexistente | Menu no topo do rail | Funcional | Vários portais (Aurora com plano Studio, Noite Clara com mensalidade atrasada e plano no limite). |


## matriz-wall

[Origem e limitações](prototipo/matriz-wall.md).

| ID / funcionalidade | Tela atual (rota) | Nova tela (rota do protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| A tela 25 / `TEL-01` Telão em tela cheia, fora do shell | `/wall-display` | `#/t/display` | Funcional | Tela própria (`.wall`), fundo noite fixo, sem rail. |
| B7 Estado `pareando` (código e QR na TV) | `/wall-display` mostra `WallPairingScreen` | `#/t/parear` | Funcional (autorização simulada) | Código de 6 caracteres (alfabeto sem 0, 1, I, O), validade de 10 min com contagem e renovação sozinha. QR da TV removido da tela. Passos reduzidos a uma frase (onde ir e o que digitar); abertura com a marca animada oficial (`splash-animado.svg`) e código gigante em Fraunces. |
| B8 Pareamento: método "código na TV" | `/wall-pair` (celular) + TV | `#/t/parear` + `A.wall.autorizar` | Simulado | O painel (outro módulo) chama `A.wall.autorizar(codigo)`; a TV detecta e liga sozinha. Botão rotulado "Simular: autorizar pelo painel". |
| B8 Método "digitar código do painel" | sem equivalente na TV | `#/t/parear` (Outras formas de ligar) | Simulado | Códigos de demonstração `FESTA2` (plano Completo) e `FESTA3` (evento no plano Grátis). `A.wall.codigoPainel()` gera um código para o painel exibir. |
| B8 Método "link de uso único" (`WallLinkSender`, TEL-03 origem) | `/admin/e/{id}/...` | `A.wall.gerarLink()` + `#/t/link/:token` | Funcional (o botão de gerar é do módulo do painel) | Gerar um link novo invalida o anterior; validade 20 min; uso único. Segredo no fragmento `#` não se aplica ao roteador por hash, registrado como limitação. |
| A tela 27 / `TEL-03` Conectando por link | `/wall-link` estado `abrindo` | `#/t/link/:token` | Funcional | Spinner com `role=status`, depois liga e vai para o telão. `amostra` é um token que sempre vale (demonstração). |
| B8 `/wall-link` estado `invalido` (410/422) | "Este link não vale mais" | `#/t/link/expirado` (ou token usado/substituído) | Funcional | Diz o motivo (já usado, passou de 20 min, substituído por link novo) e como gerar outro (3 passos) com atalho para o painel e para o código. Correção do problema 6: o erro de rede mostra "Tentar de novo" sem queimar o link. |
| B8 `/wall-link` estado `erro` (rede) | "Verifique a internet..." sem botão | `#/t/link/:token` com estado Erro do protótipo | Funcional | Botão "Tentar de novo". O link continua válido. |
| A tela 26 / `TEL-02` `/wall-pair` (celular, "Ligar o telão") | `/wall-pair` | Dissolvida em `#/t/parear` + painel | Movido | O campo de código no celular vira "Compartilhar › Telão" do painel (módulo do painel) chamando `A.wall.autorizar`. Mensagens: formato, inválido/expirado e plano (403 explicado: "O telão entra no plano Completo"; antes caía em erro genérico). |
| B8 estados `/wall-pair`: `connected`, `no-session`, `rejected`, `error` | `/wall-pair` | `#/t/parear` (Telão ligado) e mensagens inline | Funcional / Simulado | `no-session` não existe aqui porque o pareamento passou para o painel (que já exige login). |
| B8 problema 10: nada mostra quais telões estão ligados nem como desligar | sem tela | `#/t/parear` ("Este telão já está ligado") e controle "Desligar este telão" | Funcional | Desligar tem `A.confirm` com a consequência. Lista de vários telões fica no painel. |
| B7 `exibindo`: cena de fotos | `/wall-display` | `#/t/display` | Funcional | Fotos de `A.data.photos` aprovadas com `telao:true`, mais `telaoFotosNovas` e chegadas simuladas durante a festa. |
| B7 Modelo `polaroide` | idem | `#/t/display` | Funcional | Moldura clara, `contain`, leve balanço. |
| B7 Modelo `mural` | idem | `#/t/display` | Funcional | Mosaico de 6 que se completa em sequência. Fundo desfocado da própria foto nas faixas laterais. |
| B7 Modelo `colagem` (célula vazia, problema 3) | idem | `#/t/display` | Funcional | 5 fotos sobrepostas sem célula vazia; posições por quantidade de fotos disponíveis. |
| B7 Modelo `dump` | idem | `#/t/display` | Funcional | Grade 3 x 3 com entrada rápida. |
| B7 Outros 7 modelos (`tbt`, `grade`, `destaque`, `mosaico`, `ambiente`, `carrossel`, `cheio`) | idem | Não incluídos | Não implementado | O protótipo cobre os 4 modelos padrão do rodízio, como pedido. `cheio` é o único que corta e ficaria de fora de qualquer forma. |
| B7 Regra "nunca cortar foto em pé" | idem | `#/t/display` | Funcional | Foto sempre em `contain` ou em caixa com a proporção da própria foto; letterbox preenchido por desfoque da própria imagem. |
| B7 Rotação 8 s e escolha da próxima foto | `ROTACAO_MS` fixo | `#/t/display` | Funcional | Prioriza foto nova e menos exibida. Sem controle de tempo por foto (continua inexistente no produto). |
| B7 Troca de modelo vinda do painel (problema 9: só aparecia com outro item novo) | admin `telaoModelos` | `A.store.telaoModelo` lido a cada segundo | Funcional | A troca aparece em até 1 s, também entre abas. |
| B7 `telaoModelo` = rodízio | `modelosDoRodizio` | `telaoModelo: 'rodizio'` ou lista | Funcional | Sem o "volta para os 11 modelos" silencioso: modelo inválido cai em polaroide. |
| B7 Transição (um único fade) | `wall-entrar` | `#/t/display` | Funcional | Crossfade de 0,9 s entre cenas; `prefers-reduced-motion` desliga balanço, pop e fade. |
| B7 Estado "Conectando…" (problema 2) | `exibindo` com `carregou=false` | `#/t/display` (estado Carregando do protótipo) | Funcional | Spinner e texto. |
| B7 Sem estado de erro/offline (problema 2) | inexistente | `#/t/display` (estado Erro do protótipo) | Funcional | "Sem conexão com o evento. Tentando de novo." com botão. |
| B7 Estado "Aguardando fotos" | `exibindo` sem item | `#/t/display` (Vazio do protótipo ou sem fotos) | Funcional | Mostra QR de exemplo e instrução. O QR é de exemplo e não escaneia. |
| B7 Estado pânico ("Telão pausado") (problemas 1 e 13) | botão de pânico sempre visível; toggle cego | `#/t/display` com `panico:true` | Funcional | O pânico só liga e desliga no painel e grava estado explícito. A tela neutra mostra o arco da marca (sol baixo, respirando), o nome do evento e "Já voltamos". Sem botão de pânico na TV. |
| B7 Pausar/retomar na TV (Espaço ou P, problema 11) | botão fixo a 85% | Barra de controles e teclado | Funcional | Pausa mostra tela "Telão em pausa". Atalho ignora o foco em botão ou campo. |
| B7 Relógio, contador "N fotos, M pessoas" (problema 8) | overlays pequenos a 70% | `#/t/display` | Funcional | Tipografia maior (`clamp` em vmin), contraste cheio, sombra de leitura. |
| B7 Crédito do autor (primeiro nome) | só alguns modelos | `polaroide` | Funcional | Rodapé "nome + há N min". Grades não mostram crédito. |
| B7 Vídeo `muted loop` | idem | Não incluído | Não implementado | Fotos do protótipo são ilustrações; sem vídeo. |
| B7 Controle discreto, Esc e clique para sair da tela cheia | só pausa | Barra de controles e atalhos (`?`) | Funcional | Barra aparece com mouse, clique ou Tab. Botões: Pausar, Próxima foto, Tela cheia, Atalhos, Voltar ao painel, Desligar. API de tela cheia pode ser bloqueada pelo navegador (aviso). |
| B7 Dicas de ensaio antes da festa | inexistente | Chip "Ensaio: fotos de exemplo" | Funcional | Aparece só na fase Antes. |
| B7 Dados: SSE, polling, URL assinada de 15 min (achados 14 e 6) | `use-wall-stream` | Não aplicável | Depende de integração | Protótipo lê `A.data` e `A.store`. |
| B7 Crachá de pareamento por cookie de 12 h | `albora_parede` | `A.store.telaoPareado` | Simulado | Sem expiração de 12 h. |
| A tela 25: link "Abrir telão" no painel | menu do painel | Link para `#/t/display` (módulo do painel) | Funcional | Entrada pelo painel. |
| A 3.22 problema: três caminhos sem ajuda única | `/wall-pair`, `/wall-link`, `/wall-display` | `#/t/parear` reúne código, código do painel e link | Funcional | Uma só tela da TV explica os três métodos. |
