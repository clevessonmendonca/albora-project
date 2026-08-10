# 0010 — Expo para o app do convidado, com o domínio compartilhado

- **Status:** Accepted
- **Data:** 2026-08-10
- **Relaciona-se com:** [0003](./0003-runtime-token-resolution.md), [0005](./0005-runtime-stack.md), [0009](./0009-app-social-do-convidado.md)

## Contexto

O [ADR 0009](./0009-app-social-do-convidado.md) definiu que o app do convidado é o produto completo, e que a web é a porta de entrada — porta que, ainda assim, faz quase tudo, porque quem escaneia o QR e nunca instala precisa participar a noite inteira.

Duas rotas foram avaliadas para o app.

**Casca sobre o mesmo app web** (Capacitor) daria uma interface só, com paridade por construção. Foi a recomendação inicial. Ela carrega dois custos: risco de reprovação pela Guideline 4.2 da Apple, que rejeita "site reempacotado", e um teto de qualidade — o app seria sempre um site num contêiner.

**Expo com React Native** dá um app nativo de verdade, sem risco de 4.2, com EAS Build compilando para iOS sem Mac e EAS Update publicando correção sem passar por revisão. O custo é escrever a interface do convidado duas vezes.

O dono do produto escolheu **Expo**, ciente do custo. Este ADR registra a escolha e, principalmente, **o que fazer para o custo não se multiplicar**.

## Decisão

**O app do convidado é Expo / React Native. A web continua Next.js no Cloudflare, sem mudança** — o [ADR 0005](./0005-runtime-stack.md) segue valendo para landing, `/e/[slug]`, telão e admin.

A decisão que importa não é "usar Expo". É **onde fica a linha entre o que se escreve uma vez e o que se escreve duas**.

### A linha

```
apps/
  web/          Next.js  — landing, /e/[slug], telão, admin
  mobile/       Expo     — o app do convidado

packages/
  tokens/       ← UM resolvedor, alimenta os dois          ADR 0003 intacto
  packs/        ← vocabulário, missões, templates
  core/         ← tipos, cliente de API, validação,
                  contrato da fila, matemática das LUTs
  db/           ← schema + migrations

  ui-web/       ← primitivas web
  ui-native/    ← primitivas React Native
```

**Escrito uma vez:** tokens, packs, tipos, cliente de API, validação, regras de domínio, contrato da fila, LUTs. Tudo que não é pixel.

**Escrito duas vezes:** componentes e navegação. E só isso.

A diferença entre um projeto que sobrevive a duas superfícies e um que apodrece está inteira nessa separação. Sem `packages/core`, a lógica vaza para dentro dos componentes e passa a existir em duas versões que divergem em silêncio — e aí não são duas interfaces, são dois produtos.

### NativeWind é o que salva o ADR 0003

O [ADR 0003](./0003-runtime-token-resolution.md) exige **um** resolvedor de tokens alimentando todos os renderizadores, e o guard de tokens roda bloqueante desde o primeiro commit para garantir isso. React Native não tem CSS — sem tratamento, seriam dois formatos de saída e duas implementações de tema, que é exatamente o que o ADR proíbe.

**NativeWind** traz classes Tailwind para React Native. Com ele, `packages/tokens` emite **um** formato e os dois `ui-*` consomem o mesmo. O guard de tokens passa a rodar nos dois pacotes, com a mesma regra: nenhum hex literal, nenhuma cor arbitrária.

Se o NativeWind não sustentar, a alternativa não é "tema duplicado" — é reabrir este ADR. Identidade que propaga na web e não no app é bug de produto, não diferença de plataforma.

### A fila é interface compartilhada, implementação por plataforma

`packages/core` define o contrato da fila de upload. Cada app fornece o adaptador: **IndexedDB** na web, **SQLite + sistema de arquivos** no app.

O app leva vantagem aqui, e é uma das razões de ele existir: o [ADR 0008](./0008-app-nativo-como-segunda-porta.md) registrou que o `URLSession` em segundo plano do iOS só continua a transferência se o corpo estiver em **arquivo**. No Expo isso é natural; na web era contorção.

### O app não entra no primeiro casamento

**A web entrega o casamento real. O app vem depois.** Não é hesitação sobre a decisão — é a única sequência que não aposta a data.

Publicar nas lojas tem dependências que não se controlam: revisão da Apple sem prazo garantido, e conta pessoal nova no Google exigindo **12 testadores por 14 dias contínuos** antes de produção. A data do casamento não move, e não há mitigação para revisão de loja que demora.

Somando a isso o custo de escrever a interface do convidado duas vezes, o MVP de seis semanas comporta **uma** superfície completa. Ela é a web, porque é a que não depende de terceiro para existir e é a que testa a H1 com todos os convidados, não só com quem instalou.

**O que muda na [task 002](../specs/task-002-monorepo-e-guards.md), e é agora:** a estrutura acima nasce inteira, com `packages/core`, `ui-web` e `ui-native` presentes desde o primeiro commit — mesmo que `ui-native` e `apps/mobile` fiquem vazios até a [017](../specs/task-017-app-expo-e-lojas.md). Criar a separação depois significa extrair domínio de dentro de componentes já escritos, que é o refactor caro que este ADR existe para evitar.

## Consequências

**Positivas.** App nativo de verdade, sem risco de Guideline 4.2 e sem teto de qualidade de WebView. Câmera, fila e upload em segundo plano com APIs nativas. EAS Build compila para iOS sem Mac — o que, sem uma máquina Apple no time, seria bloqueio absoluto. EAS Update mantém correção urgente fora do ciclo de revisão, que é o que protege o sábado à noite.

**Custo assumido: a interface do convidado existe duas vezes.** Câmera, editor, missões, feed, stories, galeria. Cada tela nova é duas telas; cada mudança de design é duas mudanças. `packages/core` e o NativeWind reduzem isso, não eliminam.

**Custo assumido: paridade vira trabalho contínuo.** Com casca, o app era completo por construção. Aqui, "o app tem tudo que a web tem" é uma promessa que alguém precisa manter toda semana. Divergência não anunciada entre as duas superfícies é dívida de produto, e precisa aparecer em revisão de MR.

**Custo assumido: US$ 99/ano na Apple e US$ 25 no Google**, sem caminho gratuito. Detalhado na [017](../specs/task-017-app-expo-e-lojas.md).

**Reabrir se** a duplicação de interface se mostrar insustentável na prática — o sinal é telas que existem na web e não no app por mais de um ciclo. A saída nesse caso não é voltar para casca: é React Native Web, unificando por cima em vez de por baixo, ao custo do SSR que hoje entrega a pré-visualização de link no WhatsApp.
