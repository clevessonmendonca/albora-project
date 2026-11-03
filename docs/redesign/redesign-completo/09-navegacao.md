# 09 · Sistema de navegação

Origem: a captura de "Plano e cobrança" enviada pelo usuário mostrava **"Sair" como 1 dos 4 itens da navegação inferior** e a marca como texto "albora". **Correção de diagnóstico:** reproduzi os dois defeitos e eles estavam no **protótipo** (`host-criar.js`, shell de conta de `/h/*`: barra inferior `Eventos · Novo · Plano · Sair` e `<span>albora</span>` no topo mobile), não no app real. Foram corrigidos (barra só com destinos, menu de conta no avatar com "Sair" por último, logo oficial `A.logo`). No **app real** (`apps/web`) nada disso está comprovado; uma sessão separada audita por evidência (ver §6). Uma versão anterior deste documento afirmava o contrário; foi um erro de atribuição meu.

## 1. Regras (valem para qualquer superfície)

1. **Navegação principal = destinos que se visita com frequência.** No máximo 5. Frequência decide, não importância institucional.
2. **Conta é um lugar, não um destino.** Perfil/avatar abre um menu: Ajustes, Plano e cobrança, Ajuda, Tema e **Sair** (último, separado por filete). Conta nunca ocupa slot de navegação.
3. **"Sair" existe sempre, nunca compete.** Sem diálogo por padrão; **com** confirmação só se houver dados não salvos (`A.dirty`). Mensagem diz o que se perde.
4. **Criar é destaque proporcional.** "Convidar" (anfitrião) é o único botão de ação persistente do topo; criar evento é a primária de `/h` e vive na lista, não no menu.
5. **Item ativo inequívoco:** ponto âmbar + peso + `aria-current="page"` (rail) / ícone âmbar + rótulo (barra inferior).
6. **Onde estou / como volto:** breadcrumb ≥900px; no mobile, o título da tela + botão voltar apenas em telas de 2º nível. Voltar nunca aponta para "outro lugar" (bug do produto: "← Evento" levava a Ajustes).
7. **Consistência dentro da superfície, adaptação entre superfícies.** Mesmo componente, mesma posição, mesmo gesto.
8. **A navegação não come a tela:** barra inferior de 4–5 itens com safe-area; conteúdo com `padding-bottom` que a respeita; no desktop o rail recolhe em ícones (901–1179 px).

## 2. Padrões por superfície

| Superfície | Navegação principal | Topo | Conta | Contextual | Mobile |
|---|---|---|---|---|---|
| **Anfitrião** | rail: Hoje · Fotos · Convidados · Estilo · Compartilhar (+ Explorar: Comunidade, Inspiração) | nome/data do evento · ⌘K · **Convidar** · avatar | avatar → Ajustes, Plano, Equipe, Privacidade, Todos os eventos, Ajuda, Tema, **Sair** | abas em sublinhado dentro da tela; "Ajustes" em lista → painel | barra inferior: Hoje · Fotos · Convidados · Estilo · **Mais** (Compartilhar, Comunidade, Inspiração, Ajustes, Equipe, Plano, Ajuda; **Sair** como item discreto no fim do sheet) |
| **Convidado** | barra inferior: Explorar · Missões · **[Câmera]** · Perfil (câmera central, ação principal) | título do evento | Perfil → minhas fotos, consentimento, app, ajuda (sem login, sem "Sair") | filtro de momentos (chips), ⋯ por foto, sheets de comentário | desktop ≥1024: barra superior + coluna lateral |
| **Fornecedor** | rail do portal: Eventos · Clientes e equipe · Marca · Cobrança · Insights | marca **do fornecedor** (white-label) | avatar → ajustes, ajuda, **Sair** | tabela ordenável; abas | barra inferior 4 + Mais |
| **Console** | menu lateral por domínio (Contas, Eventos, Assinaturas, Suporte, Auditoria, LGPD, Retenção, Segurança) | papel de staff · "ver como" · ⌘K · `/` | menu do perfil → papel, identidade, **Sair do console** | filtros, ordenação, detalhe sob demanda | menu em sheet |
| **Telão** | nenhuma (cinema); controles por teclado | — | "Desligar este telão" discreto | — | — |
| **Páginas públicas** | cabeçalho simples; rodapé | — | — | — | — |

## 3. Componentes de navegação compartilhados

`A.layout` (rail + topbar + barra inferior), `A.hostShell`, `A.pageHead` (breadcrumb + título + ações, ações com `flex-wrap`), `A.menu` (menu de conta/ações), `A.modal`/`A.sheet` (drawer no mobile), `.tabs`/`.chips` (abas × filtros: aba muda de *conteúdo*, chip muda de *filtro*), paleta ⌘K. Nenhuma superfície reimplementa esses padrões.

## 4. Hierarquia de ações (planos e em geral)

| Nível | Aparência | Uso | Regra |
|---|---|---|---|
| Primária | botão sólido (tinta no claro; acento no escuro) | **uma** por tela/seção | reflete a intenção do usuário, não a do negócio |
| Secundária | botão linha | alternativa clara | nunca igual à primária |
| Terciária | link sublinhado | gerenciar, ver detalhes | texto, não pílula |
| Contextual | ícone/⋯ na linha | ação de um item | revela no hover/foco; sempre visível em touch |
| Destrutiva / impacto financeiro | texto vermelho **dentro de diálogo** com consequência escrita | downgrade, apagar, reembolsar | confirmação proporcional ao risco; nunca botão pílula vermelho solto |

## 5. Matriz de auditoria de navegação (protótipo + app real)

| Tela | Problema | Impacto | Correção | Prioridade | Estado |
|---|---|---|---|---|---|
| Protótipo · Plano e cobrança | "Sair" como item da navegação inferior (4 itens) | Alto | menu de conta no avatar; barra só com destinos | Alta | **resolvido** |
| Protótipo · Plano e cobrança | marca como texto "albora" no topo mobile | Alto | `A.logo` (mesma geometria de `LogoAlbora`) | Alta | **resolvido** |
| Protótipo · Plano e cobrança | "Voltar ao Grátis" e "Ativar o Completo" com peso parecido; lista de eventos com ações iguais | Alto | hierarquia §4 + diálogo de downgrade | Alta | **resolvido** (`auditoria-plano.md`) |
| Real (inventário A, leitura de código) · Experiência e Compartilhar | abrem sem rail; "← Evento" aponta para Ajustes | Alto | shell único persistente | Alta | resolvido no protótipo |
| Real · rail/barra | 9 destinos em 3 grupos | Médio | 5 + Mais | Média | resolvido no protótipo |
| Real · badge de pendências | contexto de contagem nunca lido | Médio | badge em Fotos | Média | resolvido no protótipo |
| Protótipo · Console | "Sair do console" no menu lateral | Médio | menu do perfil | Média | resolvido (agente do console) |
| Protótipo · Host | conta/ajustes só no rail (invisível no mobile) | Alto | avatar na barra superior + "Mais" | Alta | **resolvido** |
| Protótipo · topbar 320 px | nome do evento espremido a 29 px | Médio | Convidar vira ícone <420 px, nome com reticências | Média | **resolvido** |
| Protótipo · fornecedor | "Sair" fora de menu de conta | Médio | avatar/menu | Média | em correção |

## 6. Pendência: app real

Há uma sessão separada ("App real: navegação, logo e planos") que audita o app real por evidência (arquivo:linha) e só corrige o que confirmar; também levanta o modelo comercial do billing com evidência, o diálogo de downgrade/retenção e a spec de ofertas. Um agente isolado tentou antes e foi **bloqueado** por restrição de git no sandbox; nada foi alterado em `apps/web` por esta sessão.
