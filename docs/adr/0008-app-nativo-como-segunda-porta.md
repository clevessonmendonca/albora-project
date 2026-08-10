# 0008 — App nativo como segunda porta, nunca como a primeira

- **Status:** Accepted
- **Data:** 2026-08-10
- **Relaciona-se com:** [0004](./0004-anonymous-guest-session.md), [0005](./0005-runtime-stack.md)

## Contexto

O `CLAUDE.md` tem uma regra não negociável:

> A primeira foto nunca passa por loja de aplicativos nem por tela de autenticação. Isso decide a H1 (≥40% de participação) e a H1 decide se o negócio existe.

Isso foi lido algumas vezes como "o Albora não tem aplicativo". Não é o que a regra diz. Ela restringe **o caminho da primeira foto**, e só. Um app instalável, existindo em paralelo, não a viola.

A confusão tem custo real: enquanto ela durar, ninguém desenha o app instalado, e o produto perde a única coisa que o iPhone não entrega pela web.

**O que a task 001 mediu.** No Android, o Service Worker acorda sozinho: com três itens na fila e `sync.register`, ele drenou tudo sem página aberta. No iOS não existe equivalente — a Apple não implementa Background Sync, e restringiu ainda mais os recursos de PWA a partir do iOS 17.4. A foto do convidado de iPhone fica na fila até ele reabrir a tela.

Metade dos convidados de um casamento brasileiro está num iPhone. É uma lacuna de produto, não um detalhe de plataforma.

## Decisão

**O app nativo entra no roadmap como segunda porta.** Três regras o delimitam.

**1. Ele nunca é a porta de entrada.** O QR abre a web, sempre. Nenhuma tela, peça impressa, mensagem ou fluxo do convidado sugere instalar antes da primeira foto.

O convite aparece **na tela de confirmação da primeira foto**, e não antes:

```
QR → consentimento → nome → câmera → foto sobe
                                        ↓
                              "Pronto, sua foto está no telão."
                                        ↓
                              CTA: continuar no aplicativo
                                 · subir o resto sem abrir o navegador
                                 · acompanhar o que está saindo
                                 · seus stories no fim da noite
```

A ordem é o ponto. O convidado já pagou zero e já recebeu algo — a foto no telão. O convite para instalar é feito a quem **já viu o produto funcionar**, com um benefício que ele acabou de sentir a falta. Antes disso, o mesmo convite é um pedágio.

Se ele ignorar, nada muda: a web continua fazendo tudo o que ele precisa naquela noite. **Instalar é sempre opcional, nunca condição para nada.**

**2. Se for construído, é casca nativa sobre o mesmo app web — não um app novo.** Concretamente: Capacitor, que carrega os mesmos assets num `WKWebView` e dá acesso às APIs nativas.

React Native com Expo foi avaliado e **recusado**: exigiria reescrever toda a interface. Isso duplicaria o sistema de componentes, e o [ADR 0003](./0003-runtime-token-resolution.md) depende de **um** resolvedor de tokens alimentando todos os renderizadores. Um segundo conjunto de componentes significa que a identidade do casal propaga em um e não no outro — que é exatamente o bug de produto que o guard de tokens existe para impedir. O mesmo vale para os packs: `pack → core` só se sustenta com um núcleo.

A casca preserva um código, um sistema de design, um conjunto de packs. O que ela acrescenta é distribuição e três APIs.

**3. Ele só existe depois da H1.** Antes de ≥40% de participação num casamento real, app nativo é otimização de um produto que talvez não deva existir. Revisão de loja, dois pipelines de build e um ciclo de release medido em dias são custos que o MVP de seis semanas não paga.

### O que a casca compra

| Ganho | Vale para |
|---|---|
| Upload em segundo plano no iOS, via `URLSession` | O que a web não dá. É a razão principal |
| Push | Fase 3+, e nunca durante o evento — [`../flows.md`](../flows.md) trata notificação no evento como anti-objetivo |
| Armazenamento sem despejo | O Safari limpa dados após 7 dias sem uso; o álbum do casal sobrevive |
| Ícone e presença de loja | Marketing, não função |

### O que o app tem — e o relógio que governa isso

O app serve para subir mais fotos, acompanhar e ver os stories. As três coisas são legítimas; **duas delas mudam de forma conforme a hora**.

O `CLAUDE.md` diz que engajamento durante o evento é anti-objetivo, e [`../flows.md`](../flows.md) proíbe notificação de qualquer tipo durante a festa. Isso não proíbe **ver** — proíbe o **laço de checagem**: a coisa que recompensa voltar ao telefone. O que estraga a festa não é olhar uma foto, é ter motivo para olhar de novo a cada cinco minutos.

A separação é por mecânica, não por tela:

| | Durante a festa | Depois |
|---|---|---|
| Subir foto | ✅ Sem limite | ✅ |
| Acompanhar | ✅ **Espelho do telão** — o mesmo que já está projetado na parede | ✅ Álbum completo |
| Contagem nas suas fotos | ❌ | ✅ |
| Reação, curtida, resposta | ❌ | ❌ Nunca. É a regra do recado |
| Notificação | ❌ Nenhuma, de nada | Só o aviso de álbum pronto |
| Stories | ❌ | ✅ É o produto da manhã seguinte |

**Acompanhar durante a festa é o telão no bolso**, não um feed. Mostra o que já está público na parede, sem número, sem reação e sem nada que se atualize por causa do convidado. Ele pode olhar; não ganha nada por olhar de novo.

**Os stories são da manhã seguinte** — quando a festa acabou e o compartilhamento vira distribuição, não distração. É também quando eles funcionam melhor: ninguém posta story de um casamento estando dentro dele.

Essa separação é o que permite dar ao convidado tudo que ele quer sem entregar a festa ao celular. Se um dia ela for frouxa, o sintoma aparece primeiro no telão: gente de cabeça baixa em vez de rosto na foto.

### A restrição técnica que muda o desenho da fila

O `URLSession` em segundo plano do iOS **só continua a transferência se o corpo estiver referenciado a partir de um arquivo.** Um `Blob` em IndexedDB não serve.

A fila do convidado guarda `Blob`. Para a casca nativa funcionar, a fila precisa saber **derramar o item para arquivo** antes de entregar o upload ao lado nativo.

Isso é decisão da [task 004](../specs/task-004-pipeline-upload.md), não deste ADR — mas registrada aqui porque é barata de acomodar agora e cara de reformar depois. O contrato do item da fila deve permitir que o corpo seja `Blob` **ou** referência de arquivo, mesmo que hoje só o primeiro exista.

## Consequências

**Positivas.** A lacuna do iPhone deixa de ser invisível e passa a ter dono. O convite para instalar vira uma frase honesta — *"instale para as fotos subirem sozinhas"* — dita a quem já viveu o produto, e só se a task 001 confirmar que a diferença existe. Se não confirmar, a frase não é escrita: [`../product/`](../product/README.md) proíbe prometer o que não se entrega.

**Custo assumido: revisão de loja no caminho de release.** A web publica em minutos, a loja em dias. Toda correção que precise sair no mesmo dia tem de estar do lado web — o que já é verdade, já que a casca carrega os mesmos assets.

**Custo assumido: uma superfície a mais para manter.** Duas contas de desenvolvedor, dois certificados, dois pipelines. É o motivo de a regra 3 existir.

**O que este ADR não decide.** Se o app é para o convidado, para o anfitrião ou para o fornecedor. A lacuna medida hoje é do convidado de iPhone; as outras duas precisam de evidência própria antes de virar escopo.

**Reabrir se:** a Apple implementar Background Sync ou equivalente. Aí a razão principal desaparece e sobram push e loja — que não pagam a segunda superfície sozinhos.
