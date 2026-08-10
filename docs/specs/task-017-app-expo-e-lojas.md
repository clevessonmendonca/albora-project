# Task 017 — App Expo e publicação nas lojas

> **Origem:** [ADR 0010](../adr/0010-expo-para-o-app-do-convidado.md) · [ADR 0009](../adr/0009-app-social-do-convidado.md)
> **Depende de:** 012, e do primeiro casamento ter acontecido.
> **Não é grátis.** É a primeira linha de custo fixo do projeto.

## Objetivo

O app do convidado nas duas lojas, nativo, com upload em segundo plano — reaproveitando todo o domínio que a web já provou.

## Contexto

O [ADR 0010](../adr/0010-expo-para-o-app-do-convidado.md) escolheu Expo e desenhou a linha entre o que se escreve uma vez e o que se escreve duas. Esta tarefa executa o lado nativo dessa linha.

Ela vem **depois do primeiro casamento** por uma razão de calendário, não de prioridade: publicar em loja depende de revisão sem prazo garantido e do pedágio de 14 dias do Google. A data do casamento não move, e não há mitigação para revisão que demora. A web entrega o evento; o app entrega o que vem depois.

## O que já está pronto quando esta tarefa começa

Se a [002](./task-002-monorepo-e-guards.md) nasceu com a estrutura do ADR 0010, o app não começa do zero:

| Já existe, compartilhado | Falta escrever |
|---|---|
| `packages/tokens` — o resolvedor | Componentes em `ui-native` |
| `packages/packs` — vocabulário, missões | Navegação |
| `packages/core` — tipos, API, validação, LUTs | Adaptador de fila SQLite + arquivos |
| `packages/db` — schema | Integração de câmera nativa |

**Se algo desta coluna esquerda estiver dentro de um componente da web em vez de em `packages/`, esta tarefa começa com um refactor** — e é o refactor caro que o ADR 0010 existe para evitar. Verificar antes de estimar.

## Escopo

**Entra**

- `apps/mobile` com Expo Router
- `packages/ui-native` com **NativeWind**, consumindo `packages/tokens` sem tema próprio
- Câmera nativa, editor com as mesmas LUTs de `packages/core`
- Fila em SQLite + sistema de arquivos, implementando o contrato de `packages/core`
- Upload em segundo plano — `URLSession` no iOS, WorkManager no Android
- Link universal e App Link para a passagem web→app da [005](./task-005-sessao-convidado.md)
- Feed, stories, reações e galeria, em paridade com a web
- Contas nas duas lojas, EAS Build e EAS Update
- Fichas: ícone, capturas, descrição, política de privacidade

**Não entra**

- Push. Continua desligado até ter decisão própria ([ADR 0009](../adr/0009-app-social-do-convidado.md))
- Compras dentro do app. O convidado nunca paga; quem paga é o casal, pela web
- Login. Não existe, nem aqui ([ADR 0004](../adr/0004-anonymous-guest-session.md))
- **Qualquer funcionalidade que exista só no app.** Divergência entre as superfícies é dívida de produto, e esta tarefa é onde ela nasceria

## O custo real, que não é zero

| | Valor | Natureza |
|---|---|---|
| Apple Developer Program | **US$ 99 / ano** | Recorrente. Sem ele não há app no iOS, nem TestFlight |
| Google Play Console | **US$ 25**, uma vez | Sem renovação |
| **Primeiro ano** | **≈ US$ 124** | ~R$ 700 |
| Anos seguintes | US$ 99 | ~R$ 550 |
| EAS Build / Update | Camada gratuita com cota mensal | Conferir o limite antes de depender dele |

**Não há caminho gratuito para as lojas.** Não existe isenção para desenvolvedor individual, projeto pequeno ou app gratuito.

Isso muda a conta do produto: a [`../architecture.md`](../architecture.md) projeta **menos de R$ 3 por evento**, e R$ 550 anuais só se diluem a partir de uns 15 a 20 eventos por ano. Antes disso, o app é investimento — mais uma razão de ele vir depois da H1, quando já existe evidência de que o produto funciona.

## O que atrasa o Google, e quase ninguém sabe

Conta **pessoal** nova no Google Play exige teste fechado com **12 testadores por 14 dias contínuos** antes de liberar para produção. Conta de **organização** não tem essa exigência, mas pede verificação com documento e D-U-N-S.

São duas semanas de calendário que não comprimem. **Abrir as duas contas é o primeiro passo desta tarefa, não o último** — e se houver data alvo, um mês antes.

## Como se verifica

| # | Prova | Critério |
|---|---|---|
| 1 | `packages/core` importado pelos dois apps | Nenhuma regra de domínio duplicada entre `web` e `mobile` |
| 2 | Trocar o pack do evento | Muda a UI **dos dois** sem tocar em componente |
| 3 | Guard de tokens em `ui-native` | Um hex literal de mentira reprova o CI |
| 4 | Enfileirar, apagar a tela, religar a rede | Sobe com o app fechado. É a razão de a tarefa existir |
| 5 | Tocar o CTA da web com o app instalado | Abre já na sessão, sem digitar nada |
| 6 | Matar o app com 3 pendentes e reabrir | Os 3 continuam, marcados |
| 7 | Inventário de telas web × app | Nenhuma tela existe só de um lado |
| 8 | Publicar correção por EAS Update | Chega sem passar por revisão |

A prova 2 é a que protege o [ADR 0003](../adr/0003-runtime-token-resolution.md): se falhar, existem dois sistemas de tema e a identidade do casal propaga só num deles.

A prova 7 é a que protege a promessa do [ADR 0009](../adr/0009-app-social-do-convidado.md). Ela não é automatizável e por isso é fácil de pular — **vira item de revisão de MR, permanente**, não checagem única desta tarefa.

## Riscos, e o plano para cada

| Risco | Sinal | Plano |
|---|---|---|
| NativeWind não sustenta os tokens | Prova 2 ou 3 falha | **Reabrir o ADR 0010.** Tema duplicado não é alternativa aceitável |
| A duplicação de interface trava o produto | Telas só na web por mais de um ciclo | React Native Web, unificando por cima — ao custo do SSR e da pré-visualização no WhatsApp |
| Revisão da Apple demora | Sem previsão de publicação | Nenhuma data de produto depende desta tarefa. É por isso que ela vem depois do casamento |
| Cota do EAS estoura | Build falha no meio do ciclo | Conferir limite antes de depender; build local é o plano B |
