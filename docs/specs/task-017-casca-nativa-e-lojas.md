# Task 017 — Casca nativa e publicação nas lojas

> **Origem:** [ADR 0009](../adr/0009-app-social-do-convidado.md).
> **Depende de:** 012, e da prova 8 da [001](./task-001-verificacao-plataforma.md).
> **Não é grátis.** É a primeira linha de custo fixo do projeto.

## Objetivo

O mesmo app web, distribuído pela App Store e pelo Google Play, com upload em segundo plano no iOS.

## A tecnologia: Capacitor, não Expo

### O que o Expo faz melhor, e é bastante

A escolha não é entre uma ferramenta boa e uma ruim. Para **construir um app nativo**, o Expo é melhor:

- **EAS Build compila para iOS sem Mac**, cuida de assinatura e submete às lojas
- **EAS Update publica correção sem passar por revisão** — OTA de primeira parte
- **Um app React Native não é rejeitado pela Guideline 4.2.** A rota escolhida aqui carrega um risco de reprovação que o Expo não tem
- Ecossistema maior, documentação melhor, mais gente para perguntar

Nada disso é motivo para escolher Capacitor. O motivo é outro, e é único.

### O motivo: são duas superfícies ricas, e elas são a mesma

O produto tem duas entregas, e ambas fazem quase tudo:

- **A web é a porta de entrada, mas não é uma casca.** Câmera, missões, editor, upload, feed. Quem escaneia o QR e nunca instala nada precisa conseguir participar a noite inteira — é a regra que decide a H1
- **O app é o produto completo**, com o mesmo conteúdo mais o que só o nativo dá

Se a web fosse mínima — só a primeira foto, e todo o resto no app — o Expo seria a escolha certa: haveria **uma** interface rica a construir. Não é o caso. As duas são ricas, o que significa que **são a mesma interface**.

React Native não compartilha interface com a web: não tem CSS, não tem Tailwind, tem primitivas de layout próprias. Escolher Expo é decidir escrever cada tela duas vezes, para sempre — câmera, editor, missões, feed, stories, galeria — e manter as duas em sincronia enquanto o produto muda toda semana.

Com uma pessoa, seis semanas e uma data de casamento que não move, **é isso que não cabe.** Não é preferência de arquitetura, é aritmética de calendário.

E há o efeito de segunda ordem: o [ADR 0003](../adr/0003-runtime-token-resolution.md) depende de **um** resolvedor de tokens alimentando todos os renderizadores. Dois conjuntos de componentes significam a identidade do casal propagando num e não no outro — o bug que o guard de tokens roda bloqueante para impedir. O mesmo vale para os packs: `pack → core` só se sustenta com um núcleo.

Capacitor carrega **os mesmos assets** num `WKWebView` (iOS) e num `WebView` (Android), e expõe as APIs nativas por plugin.

| | Expo / React Native | Capacitor |
|---|---|---|
| Superfície web do convidado | Uma, própria | A mesma |
| Superfície do app | **Outra, do zero** | **A mesma** |
| Sistema de tokens | Dois | Um |
| Cada tela nova | Escrita duas vezes | Uma |
| Paridade entre web e app | Trabalho contínuo | **Por construção** |
| Risco de Guideline 4.2 | Nenhum | Real — ver abaixo |

A linha da paridade é a que resolve o pedido "o app tem que ser completo": aqui ele é completo porque **é** o app web, mais as capacidades nativas. Não existem duas implementações para divergirem.

**Reabrir se** a web do convidado encolher para só a primeira foto. Aí passa a existir uma superfície rica só, e o Expo vira a resposta certa.

## A hospedagem: já está feita

**Não existe backend novo.** O app é casca sobre o que já roda em Cloudflare Workers + R2 + Neon. Nenhum servidor a mais, nenhum custo de infraestrutura a mais.

O que muda é onde os assets moram: o Capacitor **empacota** o HTML, o CSS e o JS dentro do binário, em vez de apontar para uma URL. Isso é obrigatório — ver o risco de rejeição abaixo — e tem um efeito colateral bom: o app abre instantâneo, sem esperar rede.

A API continua sendo a mesma, no mesmo domínio. Correção de conteúdo e de lógica de servidor continua saindo em minutos pela web; só mudança na casca precisa de release.

## O custo real, que não é zero

| | Valor | Natureza |
|---|---|---|
| Apple Developer Program | **US$ 99 / ano** | Recorrente. Sem ele o app não existe no iOS, nem em TestFlight |
| Google Play Console | **US$ 25**, uma vez | Sem renovação |
| **Primeiro ano** | **≈ US$ 124** | ~R$ 700 |
| Anos seguintes | US$ 99 | ~R$ 550 |

**Não há caminho gratuito para as lojas.** Não existe isenção para desenvolvedor individual, projeto pequeno ou app gratuito. A única distribuição realmente gratuita é a que já temos: o app instalável pela web, que no Android instala com ícone e tela cheia sem passar por loja nenhuma.

Isso muda a conta do produto. O [`../architecture.md`](../architecture.md) projeta **menos de R$ 3 por evento**; os R$ 550 anuais só se diluem a partir de uns 15 a 20 eventos por ano. Antes disso, a casca nativa é investimento, não custo marginal — e é por isso que ela vem depois do primeiro casamento, não antes.

## O risco que reprova a tarefa: Guideline 4.2

A Apple rejeita app que seja "site reempacotado". A regra é a **4.2, Minimum Functionality**: o app precisa ter *"features, content, and UI that elevate it beyond a repackaged website"*.

Uma casca que só abre uma URL **é rejeitada**. Isso não é risco teórico — é a causa mais comum de reprovação de app híbrido.

O que nos tira dessa categoria já existe no produto, e precisa estar **visível na revisão**:

- Câmera nativa integrada, não `<input type=file>`
- Funcionamento offline de verdade, com fila que sobrevive a matar o app
- Upload em segundo plano com a tela apagada — que é a razão de a casca existir
- Assets empacotados, com abertura instantânea sem rede

**A revisão precisa ver isso funcionando.** Nota para o revisor com um evento de demonstração já populado, porque um app de casamento aberto fora de um evento parece uma tela vazia — e tela vazia é reprovação em 4.2.

## O que atrasa o Google, e quase ninguém sabe

Conta **pessoal** nova no Google Play exige teste fechado com **12 testadores por 14 dias contínuos** antes de liberar para produção. Conta de **organização** não tem essa exigência, mas pede verificação com documento da empresa e D-U-N-S.

São duas semanas de calendário que não comprimem. Se a casca for para o ar junto de alguma data, **a conta se abre com um mês de antecedência** — e é a primeira coisa da tarefa, não a última.

## Escopo

**Entra**

- Projeto Capacitor sobre o build existente, sem fork do código web
- Plugin de upload em segundo plano usando `URLSession` no iOS
- Fila aceitando **referência de arquivo**, não só `Blob` — restrição já registrada no [ADR 0008](../adr/0008-app-nativo-como-segunda-porta.md) e implementada na [004](./task-004-pipeline-upload.md)
- Link universal e App Link para a passagem web→app da [005](./task-005-sessao-convidado.md)
- Contas nas duas lojas, com o prazo do Google respeitado
- Fichas: ícone, capturas, descrição, política de privacidade

**Não entra**

- Push. Continua desligado até ter decisão própria, pelo critério do ADR 0009
- Compras dentro do app. O convidado nunca paga; quem paga é o casal, pela web
- Qualquer funcionalidade que exista só no nativo. **Divergência entre app e web é dívida de produto**

## Como se verifica

| # | Prova | Critério |
|---|---|---|
| 1 | Abrir o app em modo avião | Abre instantâneo, assets do binário |
| 2 | Enfileirar, apagar a tela, religar a rede | Sobe com o app fechado. É a razão da tarefa |
| 3 | Tocar o CTA da web com o app instalado | Abre o app já na sessão, sem digitar nada |
| 4 | Trocar o pack do evento | Muda a UI do app sem release. Prova que o núcleo é um só |
| 5 | Submeter à revisão da Apple | Aprovado sem citar 4.2 |
| 6 | Corrigir um texto e publicar pela web | Aparece no app instalado sem release |

A prova 4 é a que protege a arquitetura: se ela falhar, o app virou um segundo produto e o [ADR 0003](../adr/0003-runtime-token-resolution.md) foi quebrado.

A prova 6 é a que protege o sábado à noite: bug encontrado às 20h de um casamento não pode esperar revisão de loja.
