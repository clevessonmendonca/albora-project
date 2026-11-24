# Matriz de cobertura: Fornecedor e páginas públicas (módulo `vendor.js`, prefixos `#/f` e `#/p`)

Fonte: `../inventario/C-conta-fornecedor-console.md` §2 (F44 a F75 e 2.8) e §4 (páginas públicas). Dados fictícios em `A.data.vendor`; mudanças persistem em `A.store` (`vendorDados`, `vendorRascunho`). Papel do protótipo: Dono = Administrador; Casal e Cerimonialista = Equipe.

Valores comerciais: uma só tabela, `A.data.vendor.planos`, usada por marketing, onboarding, checkout, cobrança e portal (corrige D13).

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

## Revisão de arte (2ª passada)

- Rail do portal: marca do fornecedor (não a logo Albora) via `brand` de `A.layout` + `--ac` no wrapper `.vd-portal`; "feito com Albora" com `A.mark`. Onboarding, públicas e rodapés usam `A.logo`/`A.mark` oficiais.
- Todo `var(--ev)` de cromo virou `var(--ac)` (abas, filete, barras, rádio, monograma, botão do fornecedor). `--ev` não é mais usado no módulo, salvo em `brandStyle`, que o define para as prévias.
- Marca: prévia ao vivo agora tem duas telas (portal público e painel da equipe) que mudam com cor, fundo, estilo, logo e nome.
- Estados vazios do fornecedor usam ícone e não mascote (política da direção de arte).
- Correção: o QR do pagamento PIX ficava invisível no tema escuro; agora sempre tinta sobre papel.

## Lacunas e limitações

- Pagamento, e-mail de convite, envio de mensagem do contato, WhatsApp e recibo em PDF são simulados e rotulados.
- Só os três primeiros eventos da carteira têm painel; os demais abrem um resumo e um botão que leva ao evento de exemplo.
- A tela de criação de evento (`#/h/novo/1?vendor=&cliente=`) é do módulo do painel; este módulo só envia os parâmetros.
- O texto de privacidade e o de 15 anos são resumos do protótipo, não o texto jurídico.
- Sem domínio próprio, sem tipografia livre, sem upload de capas.
- Logo guardado em `localStorage` (limite 300 KB); some ao reiniciar os dados do protótipo.
- O comportamento do pack 15 anos (consentimento do responsável, revisão antes do telão) está descrito na página, mas o fluxo do convidado é de outro módulo.


## Atualização — 25/10/2026

Busca local e ordenação em Equipe/Clientes agora funcionam. Ajustes têm navegação por seção, rascunho em memória e descarte confirmado. Logout limpa o rascunho após confirmação.

Evidências atuais: [relatório da continuação](../10-continuacao-prototipo.md), [JSON de validação](evidencias/validacao-continuacao.json). Os resultados anteriores são históricos.
