# 0009 — O app do convidado é social, e o social vive dentro do evento

- **Status:** Accepted
- **Data:** 2026-08-10
- **Supersede:** [0008](./0008-app-nativo-como-segunda-porta.md)
- **Relaciona-se com:** [0002](./0002-event-as-tenancy-boundary.md), [0004](./0004-anonymous-guest-session.md)

## Contexto

Este ADR corrige um erro de leitura, não uma mudança de rumo do produto.

Os documentos internos diziam *"não é um app social"* e *"engajamento durante o evento é anti-objetivo"*. Essas frases não vieram do dono do produto — vieram de uma **síntese feita por assistente** a partir dos documentos de produto originais, numa sessão anterior, e depois foram tratadas como se fossem lei. A partir daí, todo pedido de rede social recebia de volta uma regra inventada como resposta.

O produto pretendido, nas palavras do dono: o convidado sobe a primeira foto pela web, sem login e sem fricção; a partir daí um CTA leva ao aplicativo, e **no aplicativo ele continua subindo, acompanha as fotos dos outros em formato de stories, reage, comenta, vê um feed, compartilha nas redes e tem a galeria do que enviou.**

O [ADR 0008](./0008-app-nativo-como-segunda-porta.md), escrito horas antes deste, ainda carregava o erro: tratava o app como "segunda porta" e o acompanhamento como "espelho do telão, sem reação e sem contagem". Está superado.

## Para quem isto existe

Esta ordem resolve toda discussão de escopo daqui em diante, e precisa vir antes da decisão:

```
QUEM PAGA          os noivos
O QUE ELES QUEREM  ficar com as fotos que os 200 convidados tiraram
O QUE IMPEDE       o convidado não sobe
O MECANISMO        o app social — porque ver, reagir e ser visto faz subir mais foto
```

**O convidado não é o cliente. Ele é a fonte.** O feed, os stories, as reações e os comentários não existem porque engajamento é bom em si — existem porque um convidado que abre o app para ver a foto que o primo mandou **manda mais três**. Esse é o trabalho deles.

A consequência prática é um critério único: **toda funcionalidade social é julgada por volume de upload e por participação, nunca por tempo de tela.** Se comentário não faz subir mais foto, comentário é custo — de moderação, de LGPD e de código — e sai. Se faz, fica e cresce.

Isso também dá o desempate quando duas leituras brigam. "Isso aumenta a chance de a tia mandar a foto que está no rolo dela?" é a pergunta. Notificação a cada curtida, por exemplo, aumenta tempo de tela e não aumenta upload — por isso continua desligada abaixo, e não por pudor.

A H1 continua sendo **≥40% dos convidados enviando ao menos uma foto**. O app social é a aposta de como chegar lá, não um segundo produto ao lado.

## Decisão

**O aplicativo do convidado é uma rede social do evento, a serviço do álbum dos noivos.** Feed, stories, reações, comentários, galeria pessoal e compartilhamento externo são funcionalidades de primeira classe, não concessões.

Quatro coisas o delimitam.

### 1. A porta de entrada não muda

Isto continua não negociável, e o dono do produto reafirmou:

```
QR → consentimento → nome → câmera → primeira foto sobe
                                        ↓
                              CTA: continuar no aplicativo
```

Sem login, sem loja, sem cadastro **antes da primeira foto**. O convite para o app aparece na confirmação — depois de o convidado já ter recebido algo. Quem ignorar continua conseguindo subir foto a noite inteira pela web.

O que muda em relação ao 0008 é o **depois**: o app não é um extra para quem quiser upload em segundo plano. É onde o produto acontece para quem ficou.

### 2. O social vive dentro do evento, e nada atravessa

**A identidade do convidado é escopada a um evento. Não existe conta Albora, e não vai existir.**

Se a mesma pessoa for a dois casamentos com Albora, são duas sessões, dois históricos, duas galerias. Ela entra pelo QR de novo.

Isso preserva o [ADR 0002](./0002-event-as-tenancy-boundary.md) **inteiro**: reação, comentário, item de feed e story carregam `event_id` como qualquer outra tabela, com RLS forçado pela mesma política. Nenhuma consulta cruza eventos, nenhuma exceção de `BYPASSRLS` é criada, e o [ADR 0004](./0004-anonymous-guest-session.md) segue valendo — o token opaco só ganha verbos novos.

É a decisão que permite ter rede social sem virar rede social: o grafo morre com a festa.

### 3. Entrar é a coisa mais fácil do app, e a passagem web→app é o ponto frágil

**O convidado nunca digita senha, nunca recebe e-mail, nunca espera SMS.** Não há "esqueci minha senha" porque não há senha. A identidade dele é composta de três coisas que ele já tem na mão:

| | |
|---|---|
| **Qual evento** | O QR da mesa |
| **Quem é** | O primeiro nome, digitado uma vez |
| **Qual aparelho** | O token opaco do [ADR 0004](./0004-anonymous-guest-session.md) |

Isso é tudo. Qualquer coisa a mais é fricção num produto cuja hipótese central é participação.

**O problema que o CTA cria.** A sessão da web vive no armazenamento do navegador. O app instalado é outro contêiner — ele **não enxerga** aquele cookie. Sem tratamento, o convidado que sobe uma foto pela web e instala o app aparece no app como pessoa nova, sem a foto que acabou de mandar. É o pior momento possível para parecer quebrado: logo depois do único gesto que ele fez.

A passagem tem dois caminhos, e os dois precisam existir:

**App já instalado.** O CTA é um link universal. Um toque abre o app direto, carregando um token de transferência de uso único, assinado e de vida curta. O app troca esse token pela sessão e o convidado cai na galeria dele com a foto lá. Zero digitação.

**App ainda não instalado.** O convidado passa pela loja, e o token se perde no caminho — a loja não repassa o contexto de origem. Para esse caso a tela de confirmação da web mostra um **código curto**, de quatro dígitos, escopado ao evento e válido por algumas horas. O app pede esse código na primeira abertura, e a única coisa que o convidado digita na vida é ele.

O código é curto de propósito: é lido de uma tela para outra, muitas vezes por alguém de 58 anos, num salão escuro, às 22h. Quatro dígitos dentro de um evento com 200 pessoas não é segredo criptográfico e não precisa ser — ele só liga duas sessões do mesmo evento, tem vida curta, e o que ele autoriza é exatamente o que o token do convidado já autorizava.

**Se ele ignorar a passagem**, nada quebra: o app pede para escanear o QR da mesa, que está na frente dele, e ele entra com uma sessão nova. Perde o vínculo com as fotos da web, não perde o app.

### 4. Quem decide quando abrir são os noivos

A interação é **fechada por gate temporal**, configurável no admin, com padrão **"após a cerimônia"**.

```
admin do evento
  liberar interação
    ( ) desde o início
    (•) após a cerimônia      ← padrão
    ( ) horário fixo: [22:00]
    ( ) só depois do evento
```

Antes do gate, o app sobe foto e mostra o que está no telão. Depois, libera feed, reação e comentário. **Emenda de 2026-08-18:** a reação saiu dessa frase — ver a emenda ao final deste ADR.

O padrão não é timidez de produto: é que ninguém quer o celular do primo apitando durante a troca de alianças, e o casal é quem sabe a hora. Deixar configurável evita que a decisão seja tomada por quem não está na festa.

## O que isto revoga

| Regra anterior | Situação |
|---|---|
| "Não é um app social" | **Revogada.** Era síntese, não decisão do dono |
| "Engajamento durante o evento é anti-objetivo" | **Substituída** pelo gate configurável |
| "Recado não tem resposta" | **Revogada.** Comentário com thread é o pedido explícito |
| "Sem comentários, em nenhuma fase" | **Revogada** desde [`../flows.md` §8](../flows.md), agora por completo |

O "livro de recados" sem réplica era uma solução de meio-termo para um problema que o dono do produto não tinha. Vira comentário normal.

## Consequências

**A moderação deixa de ser sobre foto e passa a ser sobre conteúdo.** É a consequência de engenharia mais pesada, e a que não pode ser adiada.

O [`../security.md`](../security.md) marca o ator **A5, o perseguidor**, como merecedor de atenção desproporcional. Com feed e comentários ele ganha superfície nova: pode comentar em foto de alguém, aparecer repetidamente, usar o texto para alcançar quem não quer ser alcançado. Concretamente, isso obriga:

- O botão de pânico a remover **comentários**, não só fotos
- Denúncia em comentário, com o mesmo caminho da denúncia em foto
- Bloqueio entre convidados dentro do evento — que não existia no modelo anterior
- Moderação de texto no mesmo lugar da moderação de imagem

**A [task 009](../specs/task-011-moderacao.md) cresce e sobe na fila.** Ela era sobre imagem. Agora é sobre imagem e texto, e não pode ficar depois do feed.

**O modelo de dados ganha quatro entidades** — reação, comentário, item de feed e story — todas com `event_id`, todas sob a mesma política de RLS, todas com o mesmo guard de isolamento rodando bloqueante desde o primeiro commit.

**Compartilhamento externo sai do evento por definição.** Uma foto compartilhada no Instagram deixa o perímetro e nenhum controle nosso a alcança depois. Isso precisa de consentimento explícito de quem **aparece** na foto, não só de quem a enviou — a mesma assimetria que [`../security.md` §5.1](../security.md) já identificou no agrupamento facial. Fica registrado como pendência de produto, não resolvido aqui.

**Notificação continua sem decisão.** Feed e comentário costumam arrastar push junto, e nada neste ADR autoriza isso. Fica **desligado por padrão** até existir decisão própria. Se for ligado, o gate temporal vale para ele também.

## Emenda (2026-08-18) — a reação sai do gate, o comentário fica

A decisão original tratava reação e comentário como um par: os dois esperavam o mesmo `interaction_opens_at`. Na prática isso juntava dois riscos que não são do mesmo tamanho.

Comentário carrega texto livre, thread e identidade do autor — é onde o A5 (o perseguidor, [`../security.md`](../security.md)) ganha superfície nova, e é sobre isso que a moderação de conteúdo deste ADR foi pensada. Adiar comentário até o horário que o casal escolher continua certo.

Reagir (a estrela) não carrega nenhum dos dois riscos: não tem texto, não expõe quem reagiu para quem reagiu (`sessaoAutor`/`minha` continuam atrás do gate, só a contagem e a própria reação da sessão saem dele), e é o gesto mais barato que existe no app. Segurar reação até o mesmo horário do comentário não protegia nada — só atrasava o primeiro sinal de "chegou" que o convidado tem, bem no momento em que ele mais precisa de um motivo pra continuar fotografando (a pergunta do §1 deste ADR: "isso aumenta a chance de a tia mandar a foto que está no rolo dela?").

**Decisão da emenda:** `podeReagir` (`packages/core/src/galeria.ts`) deixa de depender de `modoInteracao`/`interacaoAberta` e passa a valer sempre que a mídia está publicada, gate aberto ou não. `interacaoAberta`/`modoInteracao` continuam existindo e continuam sendo a única fonte de verdade — só que agora governam exclusivamente comentário e identidade do autor (perfil clicável, bloquear, compartilhar), não mais reação.

Isso obrigou a soltar `reacoes`/`minhaReacao` da amarra de `modo` em `listarFeed` (`packages/db/src/feed.ts`): os dois campos agora vêm em qualquer modo, porque o servidor sempre sabe se *esta* sessão já reagiu. `sessaoAutor`, `minha`, o filtro por `autorId` e o bloqueio simétrico continuam só em `modo: "completo"` — nada disso muda, porque nenhum deles é sobre reagir.

O que isto revoga, especificamente: a frase da seção 4 "Depois, libera feed, reação e comentário" — a reação nunca mais espera essa liberação.

**Reabrir se:** aparecer demanda real de identidade entre eventos. Hoje ela não existe, e a decisão 2 é o que segura a complexidade do produto inteiro.
