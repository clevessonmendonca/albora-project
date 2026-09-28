# ADR 0016 — Navegação do painel em onze destinos

**Status:** aceito
**Data:** 2026-09-28
**Contexto:** redesign do painel do anfitrião a partir do protótipo navegável. Reverte a decisão de navegação de `docs/redesign/painel.md` §3.

## O problema

O painel do anfitrião tinha **seis destinos** (Início · Fotos · Convidados · Experiência · Compartilhar · Ajustes), com rotas absorvidas de propósito: moderação dentro de Fotos, insights dentro de Convidados, identidade/missões/recado dentro do hub Experiência. `docs/redesign/painel.md` registrou a razão e recusou explicitamente "uma lista plana de 11 abas".

O protótipo navegável aprovado como base do produto vai na direção oposta: **onze destinos** em três grupos rotulados na sidebar — *Seu evento* (Visão geral, Convidados, Álbum, Telão ao vivo, Missões, Insights), *Descobrir* (Comunidade, Inspiração) e *Personalização* (Identidade, QR e convite, Configurações).

As duas formas não convivem: a sidebar é uma só, e cada item ou é destino ou é conteúdo de outro destino.

## As opções

- **A — manter seis destinos e só trocar a aparência.** Menor retrabalho, nenhum teste de navegação quebra. Mas a navegação, que é a parte mais visível do protótipo, continuaria diferente dele — e o protótipo é a base acordada do produto.
- **B — onze destinos, rotas antigas viram redirect.** Casa com o protótipo. Reescreve `navegacao.ts`, sidebar, barra inferior e os testes correspondentes. Exige cuidado para nenhuma rota existente virar órfã.
- **C — onze itens na sidebar apontando para as rotas consolidadas.** Parece o protótipo e não mexe em rota. Rejeitada de saída: dois itens de menu abrindo a mesma página é mentira de navegação, pior que qualquer uma das outras duas.

## Decisão

**Opção B.**

O argumento que sustentava a consolidação — menos escolhas, caminho mais curto — vale para produto de uso diário, onde o custo de varrer a lista se paga muitas vezes. O painel do anfitrião é o contrário: uso esporádico, quase sempre com **uma tarefa única em mente** ("ver o telão", "mandar o QR", "aprovar as fotos"). Nesse padrão, rótulo explícito ganha de agrupamento por intenção, porque o custo real não é ler onze rótulos uma vez — é adivinhar que "Telão" mora dentro de "Experiência" e não encontrar.

Os três grupos rotulados fazem o trabalho que a consolidação tentava fazer (dar ordem à lista) sem esconder destino atrás de hub.

Forma concreta:

- `features/admin/lib/navegacao.ts` é a fonte única: `DESTINOS` (onze, com `grupo`), `GRUPOS` (três), `DESTINOS_MOBILE` (quatro para a barra inferior; o quinto item, "Mais", abre a gaveta com o menu inteiro e **não é destino**).
- `absorve` deixa de significar "vai ser absorvida numa onda futura" e passa a significar "esta rota pertence a este destino" — é o que mantém o item marcado e o que guia os redirects.
- Nenhuma rota existente é apagada. `/moderation` cai em Álbum, `/consent` em Configurações, `/guestbook` e `/experiencia` em Missões. Link antigo compartilhado por e-mail continua abrindo a coisa certa.

## Consequências

- `navegacao.test.ts`, `event-sidebar.test.tsx` e `event-tab-bar.test.tsx` foram reescritos; os dois últimos viraram testes dos componentes novos (`sidebar-do-painel`, `barra-inferior-do-painel`).
- Duas superfícies do protótipo — Comunidade e Inspiração — não existiam no produto. Entram como destinos próprios; o modelo de dados delas é assunto de ADR separado, porque um feed **entre anfitriões** é cross-event por natureza e não cabe no isolamento por `event_id` do ADR 0002.
- `docs/redesign/painel.md` §3 fica superado nesta parte. O resto do documento (fases Antes/Durante/Depois, fluxos fechados) continua valendo.
- O hub `/experiencia` fica redundante como tela. Continua respondendo e marcando Missões; transformá-lo em redirect é decisão de limpeza, não deste ADR.
