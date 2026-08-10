# Albora — Fluxos e nuances

> **Status:** fundação. Independente de runtime.
> **Última revisão:** 2026-08-09
> **Complementa:** [`architecture.md`](./architecture.md) (as fronteiras), [`security.md`](./security.md) (as ameaças), [`adr/`](./adr/README.md) (as decisões)

Este documento descreve **o que acontece**, em cada superfície, no caminho feliz e em cada desvio dele. As nuances são a parte que importa: o caminho feliz cabe num diagrama, e é o desvio que decide se o produto funciona num salão às 22h com 4G ruim.

## Como ler

Cada nuance segue a forma **gatilho → comportamento → por quê**. O "por quê" não é decoração: é ele que impede alguém de "simplificar" o comportamento seis meses depois sem saber o que está desfazendo.

| | Significado |
|---|---|
| 🔴 | Toca o caminho crítico. Quebrar aqui derruba a H1 — a hipótese de ≥40% de participação que decide o negócio |
| 🟠 | Risco de reputação, jurídico ou de dado |
| ⚪ | Refinamento. Pode esperar sem risco |
| ❓ | **Buraco de produto** — sem resposta decidida. Consolidados na §12 |

---

## 1. Mapa

```
   ┌──────────────┐  gera QR + peças
   │  ANFITRIÃO   │──── imprime ────▶ placa e cards nas mesas
   │  com login   │                          │
   └──────┬───────┘                          │ escaneia
          │ cria, configura,                 ▼
          │ modera (exceção),         ┌──────────────┐
          │ baixa                     │   CONVIDADO  │
          │                           │ sem login,   │
          │                           │ com nome     │
          │                           └──────┬───────┘
          │                                  │ envia mídia
          ▼                                  ▼
   ┌────────────────────────────────────────────────┐
   │                    EVENTO                       │
   │   dado + mídia + identidade + missões           │
   └───────┬─────────────────────────────┬───────────┘
           │ só publicadas               │
           ▼                             ▼
   ┌──────────────┐              ┌────────────────┐
   │    TELÃO     │              │   PÓS-EVENTO   │
   │ ranqueado    │              │ export, livro, │
   │ só leitura   │              │ retenção       │
   └──────────────┘              └────────────────┘
```

---

## 2. F1 — Anfitrião: do zero à placa impressa

É o primeiro fluxo cronologicamente, e o único que acontece semanas antes da festa.

### 2.1 Caminho feliz

```
1. Cria conta (magic link)
2. Cria evento — título, data, convidados esperados
3. Escolhe o pack                              → casamento (único no MVP)
4. Define a identidade                         → paleta, tipografia, monograma
5. Escolhe 8–12 missões da biblioteca          → pode editar texto, pode criar
6. [GERAÇÃO DE PEÇAS]
     ├─ escolhe formatos                       → placa A4, card de mesa, card de missão
     ├─ preview com a identidade aplicada
     └─ baixa o PDF pronto para gráfica
7. Imprime e distribui nas mesas
8. [D-2] Recebe o checklist com o roteiro de anúncio
```

### 2.2 Geração de QR e peças imprimíveis

O produto **gera** o material; o casal só imprime. É a primeira materialização da propagação de identidade ([ADR 0003](./adr/0003-runtime-token-resolution.md)) e a primeira peça física da marca.

**Peças no MVP:**

| Peça | Conteúdo | Uso |
|---|---|---|
| **Placa A4** | Nome do casal, data, "Tira foto. A gente cuida do resto.", QR grande, URL legível, 4–6 missões destacadas | Uma por mesa, ou na entrada |
| **Card de mesa** (A6) | QR, 3–4 missões, URL | Compacto, vários por mesa |
| **Card de missão** | Uma missão, numerada, tipografia grande | Espalhados, colecionáveis |

**N1.1 — Contraste do QR versus identidade** 🔴
→ O QR é sempre gerado em alto contraste, **mesmo que a identidade do evento seja de baixo contraste**. A identidade colore a peça, nunca o código.
*Por quê:* é a nuance que mais provavelmente seria descoberta na festa. Um QR âmbar sobre `noite` é lindo no preview e não escaneia em luz baixa. Identidade não pode quebrar função.

**N1.2 — Correção de erro alta** 🔴
→ QR gerado com o nível máximo de correção de erro, com zona de silêncio generosa.
*Por quê:* esse papel vai ser dobrado, molhado de cerveja, fotografado tremido em luz baixa, de 40 cm de distância, por alguém com o celular na mão errada.

**N1.3 — Tamanho mínimo** 🔴
→ Mínimo ~3 cm de lado no card, maior na placa. O gerador recusa layout que produza QR abaixo do mínimo.
*Por quê:* recusar na geração é barato. Descobrir na festa é irreversível.

**N1.4 — URL legível sempre presente**
→ Abaixo de todo QR, `albora.com.br/anaejoao` em texto.
*Por quê:* câmera velha, permissão negada, QR riscado. A digitação é o caminho de recuperação, e ele precisa estar impresso — não adianta existir só no app.

**N1.5 — Rotação de slug invalida o material impresso** 🔴🟠
→ Ao rotacionar (defesa contra link vazado, N4.7), o admin recebe aviso explícito de que **todo o material impresso para de funcionar**. O slug antigo passa a mostrar uma página de orientação, nunca um erro seco.
*Por quê:* é uma colisão real entre dois controles deste documento. Rotação é opção nuclear, e quem aperta o botão precisa saber que está inutilizando cem cards já distribuídos nas mesas. A página de orientação existe porque o material já está impresso e não some.

**N1.6 — Quantas missões cabem na peça** ⚪
→ 4–6 na placa, 3–4 no card. O resto vive no app.
*Por quê:* a peça é convite, não manual. Doze missões num A4 vira lista de tarefas antes de alguém escanear qualquer coisa.

**N1.7 — Requisitos de gráfica**
→ PDF com sangria de 3 mm, área de segurança de 5 mm, nada importante a menos de 5 mm do corte.
*Por quê:* nenhum é difícil isolado; todos derrubam um pedido se esquecidos.

**N1.8 — Conversão de cor** 🟠
→ Aviso antes do download: a gráfica trabalha em CMYK, a identidade é definida em RGB, **e a conversão muda a cor**.
*Por quê:* avisar antes é gestão de expectativa; avisar depois é reclamação.

**N1.9 — Reimpressão**
→ O PDF fica salvo e rebaixável. Regerar reaplica a identidade **atual**, que pode ter mudado.
*Por quê:* quebrou um card, chegou mesa a mais. Mas regerar depois de mudar a paleta produz peça que não combina com as já impressas — daí o aviso de N5.3.

**N1.10 — Preview antes de gerar**
→ Sempre, com a identidade aplicada, no formato real.
*Por quê:* o casal está gastando dinheiro de gráfica. Descobrir o erro no PDF é caro; no preview, é grátis.

### 2.3 Configuração do evento

**N2.1 — Cria o evento sem identidade definida**
→ Herda os padrões do pack. Editável até imprimir.
*Por quê:* obrigar a decidir paleta no primeiro minuto trava a criação do evento.

**N2.2 — Mais de 12 missões** ⚪
→ Aviso, não bloqueio: acima de 12 a taxa de conclusão despenca.
*Por quê:* é curadoria, não regra técnica. O anfitrião pode ter motivo, mas precisa saber o custo.

**N2.3 — Missão customizada**
→ Permitido. Texto livre, com o mesmo tratamento tipográfico das da biblioteca.
*Por quê:* "uma foto com a vó Terezinha" é exatamente o tipo de missão que só aquele casamento pode ter, e é a que mais engaja.

**N2.4 — Muda a identidade depois de imprimir** 🟠
→ Aviso explícito: o impresso está congelado e vai divergir do telão e do álbum.
*Por quê:* a coerência entre placa, telão e álbum **é** o produto.

**N2.5 — Não anuncia no microfone** 🔴❓
→ Checklist em D-2 com o roteiro pronto.
*Por quê:* é o maior fator isolado de participação, e não é software. Ver §12.

---

## 3. F2 — Convidado

A superfície que decide o negócio. Meta: **≤ 5 toques entre escanear o QR e a primeira foto subir.**

### 3.1 Caminho feliz

```
1. Aponta a câmera para o QR na mesa
2. Abre /e/{slug}                        → Service Worker registra em segundo plano
3. [TELA 1] Consentimento                → uma frase, um checkbox      ── toque 1
4. [TELA 2] "Como te chamamos?"          → nome, obrigatório           ── toque 2
5. [TELA 3] Missões                      → escolhe uma                 ── toque 3
6. Câmera nativa                                                       ── toque 4
7. Preview + preset opcional                                           ── toque 5
8. Enfileira → sobe                        ── a subida começa AQUI
9. [opcional, enquanto sobe] legenda · onde na festa
10. "Foto 1 ✓ — já tá no telão"  +  CTA de instalação
```

O passo 9 não conta como toque: a foto já está subindo e os dois botões de saída levam ao mesmo lugar (§3.6).

### 3.2 O nome — obrigatório, e por quê

> **Decisão:** o nome é **obrigatório**, não opcional. Isso muda o §4.2 do documento de produto.

Custa um toque no caminho crítico, o recurso mais escasso do produto. Paga três coisas que não existem sem ele:

1. **Atribuição.** "Foto de Tio João" no telão é reconhecimento social — e reconhecimento social é o que faz a próxima pessoa pegar o celular. Foto anônima no telão não recruta ninguém.
2. **Entrega individual depois.** Sem saber quem enviou, "suas fotos" não existe — e ele é o item de maior ROI do ciclo pós-evento.
3. **Responsabilização.** Num modelo onde tudo vai ao telão por padrão (§5), saber de quem veio é a diferença entre remover uma foto e entender um padrão.

**N3.1 — O que conta como nome**
→ Qualquer coisa com pelo menos dois caracteres. Apelido vale. Primeiro nome vale. Sobrenome nunca é exigido.
*Por quê:* "Tio João", "Bia", "os primos de Goiânia" são melhores para o produto do que nome civil completo — e coletam menos dado pessoal.

**N3.2 — Não pede duas vezes** 🔴
→ Persistido no aparelho. A segunda foto vai direto para a câmera.
*Por quê:* o toque extra é aceitável uma vez. Repetido a cada foto, mataria o volume — que é onde o acervo se forma.

**N3.3 — Nome ofensivo** 🟠
→ Aparece no admin junto com as mídias daquela sessão; o anfitrião renomeia ou oculta a sessão inteira.
*Por quê:* o nome vai ao telão. É um campo de texto livre projetado numa parede para 150 pessoas — e alguém vai testar isso.

**N3.4 — Onde o nome aparece**
→ Telão e galeria: sim. Discreto, nunca competindo com a foto.
*Por quê:* é o mecanismo de reconhecimento social. Escondê-lo desperdiça o custo do toque que acabamos de cobrar.

**N3.5 — Nome é dado pessoal** 🟠
→ Coberto pelo consentimento da entrada, que diz explicitamente que o nome aparece junto das fotos.
*Por quê:* consentimento que não descreve o uso não é consentimento.

### 3.3 Entrada e sessão

**N4.1 — QR escaneado antes do evento começar** 🔴
→ Tela de espera com a identidade, contagem regressiva e as missões já visíveis, sem poder enviar.
*Por quê:* convidado chega cedo e mexe no celular. "Evento não encontrado" nesse momento queima a única primeira impressão, e ele não tenta de novo.

**N4.2 — QR escaneado depois da festa** 🔴
→ Upload aberto por **48 h** após o fim. Depois, galeria em leitura.
*Por quê:* muita gente sobe no domingo de manhã, rolando o próprio rolo. Fechar à meia-noite joga fora um pedaço grande do acervo.

**N4.3 — Consentimento recusado** 🟠
→ Tela final explicando o que perde, com botão para voltar atrás. Sem galeria, sem insistência.
*Por quê:* consentimento sob pressão não é consentimento. Mas a saída precisa ter dignidade — muita recusa é toque errado, não decisão.

**N4.4 — Cookie perdido**
→ Nova sessão, novo nome. As fotos antigas continuam no álbum, mas ele não consegue mais removê-las sozinho. A ajuda aponta para o anfitrião.
*Por quê:* consequência direta de não ter login. É caminho de suporte real — precisa existir no admin antes do primeiro evento.

**N4.5 — Mesma pessoa em dois aparelhos**
→ Duas sessões, dois nomes iguais, contadas como duas.
*Por quê:* infla o numerador da métrica principal. Corrigir exigiria fingerprinting, que traz problema de LGPD maior que o erro. **Registrar como viés conhecido**, não corrigir.

**N4.6 — Link no grupo do WhatsApp** 🟠
→ Funciona. É comportamento desejado.
*Por quê:* o QR alcança quem senta; o grupo alcança quem não sentou.

**N4.7 — Link vazou para fora da festa** 🟠
→ Anfitrião rotaciona o slug. Sessões ativas continuam subindo; o link antigo para de abrir novas. **Ver N1.5** — isso invalida o impresso.
*Por quê:* sem rotação, a única resposta a um QR vazado seria encerrar o evento no meio.

### 3.4 Captura

**N5.1 — Permissão de câmera negada** 🔴
→ Cai direto no seletor de arquivos, sem tela de erro intermediária.
*Por quê:* metade das fotos boas já está no rolo. Tratar negação como falha joga fora metade do acervo por um diálogo do sistema.

**N5.2 — iPhone entregando HEIC** 🔴
→ Converte para JPEG no cliente, antes de tudo.
*Por quê:* o iOS fotografa em HEIC por padrão. Sem conversão, um pedaço grande dos convidados sobe arquivo que a galeria e o telão não exibem — e o defeito só aparece na festa, com o acervo já contaminado.

**N5.3 — Vídeo no plano grátis** 🔴
→ Aviso **antes** da captura. Botão desabilitado com explicação de uma linha.
*Por quê:* deixar gravar e recusar no envio destrói o momento. E vídeo é o gate econômico real do plano pago.

**N5.4 — Foto sem missão**
→ Permitido, sempre.
*Por quê:* exigir escolher missão adiciona toque e transforma gesto espontâneo em tarefa.

**N5.5 — Todas as missões cumpridas**
→ "Você fez todas as 10. Manda o que quiser." Modo livre.
*Por quê:* terminar a lista não pode parecer o fim do produto. A madrugada é onde saem as melhores fotos.

**N5.6 — Várias fotos de uma vez** ⚪
→ Seleção múltipla, uma entrada de fila por arquivo.
*Por quê:* quem sobe no dia seguinte sobe em lote.

**N5.7 — Preset aplicado depois da captura, nunca ao vivo** 🔴
→ A câmera nativa dispara sem filtro; o preset entra sobre a foto boa, em LUT no cliente.
*Por quê:* preview ao vivo exigiria `getUserMedia`, que custa HDR e modo noturno — e às 22h no escuro é justamente aí que a foto se ganha ou se perde. O preset é gratuito e instantâneo; a qualidade do sensor, não.

**N5.9 — O filtro recomendado pelos noivos vem primeiro** ⚪
→ Selo, nome em destaque e primeira posição na tira. Nunca pré-aplicado sem o convidado tocar.
*Por quê:* coerência do acervo por convite, não por imposição. Aplicar sozinho tiraria a escolha de quem tirou a foto.

**N5.10 — O chão do app é escolha do casal, nunca do convidado** 🟠
→ Padrão `noite`. O casal pode trocar para `papel` como token do evento; o convidado não tem alternador. Trocar o chão **re-deriva o acento** automaticamente, e o telão fica de fora da escolha.
*Por quê:* às 22h num salão escuro, tela branca contrai a pupila e a pessoa perde a festa de vista. E âmbar reprova contraste sobre claro — deixar o casal escolher a cor sem re-derivar entregaria uma interface ilegível.

**N5.8 — Preset funciona sem rede** 🔴
→ LUT em canvas, no aparelho. Nunca chamada de rede.
*Por quê:* a fila offline é o que decide a H1. Um preset que precisa de internet quebra exatamente onde o produto não pode quebrar — e uma IA generativa também produziria uma interpretação diferente por foto, desfazendo a coerência do acervo ([ADR 0007](./adr/0007-ai-policy-luts-not-generation.md)).

### 3.5 Upload — onde o produto se decide

**N6.1 — Sem sinal** 🔴
→ Entra na fila em IndexedDB, some da tela com "vai subir sozinha", sobe quando voltar.
*Por quê:* é a nuance mais importante do documento. Sem fila persistente, sinal ruim significa participação zero.

**N6.2 — Fecha a aba com fila pendente** 🔴
→ Background Sync onde existe. No iOS, sobe na próxima abertura.
*Por quê:* ninguém fica olhando barra de progresso numa festa.

**N6.3 — Upload interrompido** 🔴
→ Retry com backoff, objeto inteiro. Sem multipart.
*Por quê:* fotos comprimidas têm centenas de KB. Multipart resolve problema que não existe nessa escala.

**N6.4 — Confirmação duplicada** 🔴
→ Idempotente por chave do cliente.
*Por quê:* retry é o caminho normal aqui. Sem idempotência, rede ruim gera álbum duplicado exatamente onde a rede é pior.

**N6.5 — Cliente confirma upload que não aconteceu** 🟠
→ Servidor verifica que o objeto existe e que a chave pertence ao evento da sessão.
*Por quê:* é o único ponto com escrita direta no storage sem autenticação.

**N6.6 — Cota do aparelho estourada**
→ Detecta, avisa, sobe imediatamente em vez de enfileirar.
*Por quê:* fila que não persiste é pior que não ter fila, porque promete o que não cumpre.

**N6.7 — Aba anônima / navegador restrito**
→ Detecta na entrada, mantém em memória, avisa que fechar perde o pendente.
*Por quê:* falhar em silêncio perde a foto sem ninguém saber.

### 3.6 Detalhes — legenda e lugar, enquanto sobe

> **A regra que torna isso possível:** o upload começa no toque de "Enviar". Legenda e lugar são oferecidos **durante** a subida, portanto custam **zero** no caminho crítico. Esse tempo ia passar de qualquer jeito.

```
Enviar  →  upload COMEÇA
           ↓
        [ detalhes, com a barra de progresso rodando ]
           ├─ Legenda (opcional, texto curto)
           ├─ Onde na festa (opcional, lista fechada)
           └─ "Pronto"  ou  "Pular — já está subindo"
           ↓
        Confirmação
```

**N6.8 — Nada aqui é obrigatório** 🔴
→ Os dois botões de saída levam ao mesmo lugar. "Pular" diz explicitamente que a foto **já está subindo**.
*Por quê:* o convidado precisa saber que não está abandonando nada. Uma tela opcional que parece obrigatória é uma tela obrigatória — e o caminho crítico não comporta mais um toque.

**N6.9 — 🔴 "Onde na festa", nunca GPS** 🟠
→ Lista fechada: **pista · mesa · jardim · altar · bar · varanda**. Sem coordenada, sem mapa, sem localização do aparelho.
*Por quê:* o §13 deste documento e a [`security.md`](./security.md) mandam remover EXIF justamente porque GPS em foto de convidado é exposição real — reintroduzir localização pela porta da frente desfaria o controle. E há um ganho de produto junto: o Instagram marca *lugar no mundo*; uma festa precisa de *lugar na festa*. "Pista" diz mais sobre a foto do que a coordenada do salão, e não expõe ninguém.

**N6.10 — Lista fechada, não campo livre**
→ O lugar vem de um conjunto definido pelo pack, nunca digitado.
*Por quê:* alimenta a linha do tempo do álbum e a curadoria do livro sem trabalho de normalização — e campo livre projetado no telão tem a mesma superfície de abuso do nome (N3.3).

**N6.11 — A legenda substitui o rótulo da missão no telão**
→ Havendo legenda, ela aparece no crédito no lugar de "Missão III".
*Por quê:* a frase de quem estava lá vale mais que o número da missão. Sem legenda, o rótulo continua sendo a missão.

**N6.12 — Marcar pessoas fica fora** ❓
→ Não existe no MVP.
*Por quê:* marcar por nome a partir da lista de convidados seria viável; marcar por rosto é **dado biométrico** e cai na mesma armadilha do agrupamento facial ([`security.md` §5.1](./security.md)). Sem posição jurídica, não se constrói.

### 3.7 Depois do envio — o CTA do app

```
upload CONFIRMADO ──▶ "Foto 1 ✓ — já tá no telão"
                              │
                              ▼
                   ┌──────────────────────────┐
                   │  Instale e receba suas   │
                   │  fotos depois da festa   │
                   └──────────────────────────┘
```

**N7.1 — O CTA aparece após a confirmação, não após o envio** 🔴
→ Se a foto está na fila offline, o CTA **espera**.
*Por quê:* a oferta é "receba suas fotos depois". Fazê-la antes de a primeira foto existir de fato é prometer sobre algo que ainda pode falhar. Valor primeiro, instalação depois — é o padrão de Instagram e TikTok, e é a diferença entre H1 que fecha e H1 que não fecha.

**N7.2 — iOS não tem prompt de instalação** 🔴
→ Instrução visual explícita: compartilhar → adicionar à tela de início.
*Por quê:* no Android existe prompt nativo; no iOS, não. Sem instrução, metade da base simplesmente não consegue instalar — e a métrica de instalação vira medida de qual celular a pessoa tem.

**N7.3 — Já instalado**
→ Não mostra. Nunca.

**N7.4 — Dispensado**
→ Não repete na mesma sessão. Reaparece no fim da festa, com a mensagem de fim ("suas fotos ficam salvas").
*Por quê:* insistir no meio da festa compete com a festa. O CTA nunca pode fazer isso.

**N7.5 — A promessa é sempre "receba suas fotos"**
→ Nunca "veja os stories agora".
*Por quê:* stories funcionam na web; a promessa desmontaria. E competir com a festa é o anti-objetivo.

**N7.6 — Métrica de instalação nunca é lida sozinha**
→ Sempre junto de participação.
*Por quê:* instalação subindo com participação caindo é prejuízo.

### 3.8 Reações e galeria

**N8.1 — Reagir**
→ Uma reação, uma vez, por sessão, por mídia. Anônima na exibição.
*Por quê:* contagem de curtida com autor é ranking de popularidade num casamento — drama familiar garantido. A reação alimenta o telão (§5) sem virar placar social.

**N8.2 — Remover a própria foto** 🟠
→ Um toque, pela sessão. Some da galeria e do telão imediatamente.
*Por quê:* é direito, e é a válvula que torna o consentimento inicial confortável.

**N8.3 — Galeria durante a festa** ⚪
→ Mostra, sem scroll infinito, sem notificação, sem contagem visível de reação.
*Por quê:* engajamento durante o evento é anti-objetivo. Se os convidados passarem a festa rolando feed, a noiva odeia o produto.

**N8.4 — Recados, não comentários** 🟠
→ Um recado por pessoa, por mídia, uma vez. **Sem resposta, sem curtida em recado, sem notificar quem foi citado.** O autor da mídia remove qualquer recado em um toque, sem justificar.
*Por quê:* isto substitui a decisão original de "sem comentários, em nenhuma fase". A justificativa original continua válida — comentário em foto de casamento é drama familiar garantido —, mas o vetor do drama é o **thread**, não o texto. Discussão precisa de ida e volta. Sem resposta, o que sobra é o **livro de recados**, que é um costume que a festa brasileira já tem: uma frase, assinada, sem réplica.

**N8.5 — Recados abrem depois da cerimônia** 🔴
→ Durante a cerimônia, a tela diz por quê e devolve para as missões. Liberado a partir do fim dela, por marcação do anfitrião no admin.
*Por quê:* durante a cerimônia ninguém deveria estar escrevendo nada. Depois dela a festa já é social por natureza, e o gesto de escrever uma frase não é o comportamento que o anti-engajamento combate.

**N8.6 — Nenhuma notificação durante o evento** 🔴
→ Recado recebido não notifica ninguém enquanto a festa acontece. Notificação só no pós-evento, e opt-in.
*Por quê:* é a distinção que faz a regra do §4.4 do doc de produto continuar de pé. O que estraga a festa é o **laço de checagem** — a pessoa voltando à tela porque foi cutucada. Escrever e ler quando se vai atrás é gesto; ser puxado de volta é engajamento farmado.

---

## 4. F3 — Workflow da mídia

> **Decisão:** o padrão é **publicar tudo**. Nada espera aprovação humana.

Isso responde ao buraco "quem modera durante a festa": **ninguém**, porque nada precisa de aprovação. Os noivos estão na festa e não vão olhar fila nenhuma — um modo que pressupõe isso é um modo que fica desligado.

A defesa se move para onde não custa fricção: um classificador automático como único portão, remoção em um toque, e um botão de pânico.

```
        [confirmada]
             │
             ▼
      ┌─────────────┐
      │ classificar │  no thumb, com timeout curto
      └──────┬──────┘
             │
    ┌────────┼─────────────────┬──────────────────┐
    │ limpa  │ sinalizada      │ timeout          │
    ▼        ▼                 ▼                  │
┌─────────┐ ┌────────┐   ┌──────────────────┐     │
│publicada│ │ retida │   │ galeria: publica │◀────┘
│galeria +│ │ só admin│   │ telão:   segura  │
│  telão  │ │        │   └──────────────────┘
└────┬────┘ └───┬────┘
     │          │ anfitrião libera
     │          └──────────┐
     │ removida            ▼
     ▼               [publicada]
┌──────────┐
│ removida │  terminal, propaga em segundos
└──────────┘
```

**N9.1 — A assimetria galeria versus telão** 🟠
→ Quando o classificador não responde a tempo: **publica na galeria, segura do telão**.
*Por quê:* são exposições diferentes e merecem padrões diferentes. Galeria é ativa — alguém escolheu abrir. Telão é passivo — 150 pessoas estão olhando sem ter escolhido. Falhar aberto na galeria custa pouco; falhar aberto no telão custa a festa.

**N9.2 — Classificador fora do ar** 🟠
→ Mesma regra: galeria publica, telão segura, admin recebe aviso.
*Por quê:* degradação, nunca falha — e nunca degradação que aponte para a parede.

**N9.3 — Botão de pânico** 🔴
→ Um controle no admin **e** na tela do telão pausa a exibição instantaneamente, mostrando a identidade do evento.
*Por quê:* quando algo dá errado no telão, ninguém vai procurar o menu certo. Precisa ser um botão, alcançável em três segundos, por quem estiver mais perto.

**N9.4 — Remoção propaga em segundos**
→ Não no próximo ciclo.
*Por quê:* o tempo entre "alguém viu" e "sumiu" é a métrica que importa nessa tela.

**N9.5 — Anfitrião pode endurecer o modo**
→ Trocar para fila de aprovação durante a festa, se algo der errado.
*Por quê:* o padrão aberto é uma aposta calculada. Precisa ter um freio.

**N9.6 — Denúncia por convidado**
→ Qualquer convidado denuncia, sem login. Duas denúncias na mesma mídia a tiram do telão automaticamente, pendente de revisão.
*Por quê:* 150 pessoas veem o telão antes de qualquer classificador. São o melhor sensor disponível, e são de graça.

**N9.7 — Conteúdo ilegal com menor** 🔴
→ Não é moderação, é obrigação legal. Preservar, bloquear acesso, seguir procedimento escrito. Ver [`security.md`](./security.md).

---

## 5. F4 — Telão

### 5.0 🔴 Nunca cortar na vertical

Foto de celular em festa é **vertical**. Aproximadamente três de cada quatro. O telão é 16:9.

Encaixar 9:16 em 16:9 com recorte descarta cerca de **dois terços da imagem — pelo topo e pela base**. Numa foto de casamento, o topo é onde estão as cabeças. O produto decapitaria os convidados na parede, na frente da festa inteira.

> **Regra:** o telão nunca corta na vertical. Nenhum modelo, nenhuma exceção, nenhuma flag.

Quatro modelos resolvem o enquadramento sem cortar rosto, e o casal escolhe qual — o layout do telão passa a ser mais um artefato governado pelos `identity_tokens`:

| Modelo | Como resolve | Quando |
|---|---|---|
| **Polaroide** | Uma cópia impressa por vez, centrada, com o crédito assinado na margem branca | Padrão. Conversa com o livro de fotos |
| **Mural** | Três verticais lado a lado — é o que preenche 16:9 naturalmente | Acervo grande, ritmo alto |
| **Ambiente** | A vertical inteira, com a própria foto desfocada estendendo o fundo | Quando a foto deve dominar |
| **Cheio** | Sangra até a borda — **só entra foto horizontal**, e a fila filtra o acervo | Minoria horizontal |

O desfoque do modelo Ambiente é **técnica de mídia**, não material de interface. O banimento de blur no [`../DESIGN.md`](../DESIGN.md) vale para superfície de UI, onde ele lê como glassmorphism; estender a própria imagem é outra coisa.

**Vídeo tem o mesmo problema e a mesma regra.**

### 5.1 A fila de exibição

Não é cronológica. Três faixas, misturadas em proporção fixa:

| Faixa | Peso | O que entra |
|---|---|---|
| **Nunca exibida** | ~50% | Toda mídia publicada que ainda não apareceu nenhuma vez |
| **Recente** | ~25% | Últimos minutos |
| **Popular** | ~25% | Mais reações, com decaimento por tempo e por número de exibições |

**N10.1 — Toda foto aparece pelo menos uma vez** 🔴
→ A faixa "nunca exibida" tem prioridade máxima e é a maior.
*Por quê:* é a nuance mais importante do telão. Quem manda uma foto e nunca a vê na parede para de mandar — e conta para a mesa que "não apareceu". Justiça na exibição não é gentileza, é o motor do volume.

**N10.2 — Foto popular não domina a noite** 🔴
→ Decaimento por número de exibições, não só por tempo.
*Por quê:* sem decaimento, a foto mais reagida das 21h fica na parede até as 3h. Ranking puro converge para um pequeno conjunto e o telão fica parado — exatamente o oposto do que o ranking pretendia.

**N10.3 — Primeira hora não tem reação nenhuma**
→ Sem reação, o ranking é ruído. A primeira hora é essencialmente cronológica, e a faixa "popular" só liga quando houver massa.
*Por quê:* ranquear por zero reações versus uma reação é ranquear por acaso.

**N10.4 — Anti-repetição**
→ Uma mídia não repete antes de um número mínimo de outras.
*Por quê:* na primeira hora o acervo é pequeno e a repetição fica óbvia.

**N10.5 — Foto nova aparece rápido** 🔴
→ A faixa "recente" garante que quem acabou de enviar veja em pouco tempo.
*Por quê:* é o laço de recompensa que gera o próximo upload. "Olha, é a minha!" é literalmente o mecanismo de recrutamento do produto.

**N10.6 — O nome do autor aparece** ⚪
→ Discreto, nunca competindo com a foto.
*Por quê:* reconhecimento social é o que faz a mesa inteira pegar o celular. Ver §3.2.

**N10.7 — Reação vem do celular, não do telão**
→ O telão não tem interação. O laço é: vê na parede → pega o celular → reage na galeria.

### 5.2 Robustez

**N11.1 — Ainda não tem foto nenhuma** 🔴
→ QR grande, missões e a identidade do casal. Nunca grade vazia.
*Por quê:* a primeira hora do telão é o melhor cartaz de recrutamento que o produto tem. Grade vazia é o pior.

**N11.2 — Rede cai no meio da festa** 🔴
→ Continua rodando com as últimas 50 em cache local.
*Por quê:* é a única tela que todo mundo está olhando. Telão congelado é a falha mais visível possível.

**N11.3 — Alguém reinicia a TV**
→ Retoma sozinho, sem cursor, sem controle, sem tela de configuração.
*Por quê:* quem vai reiniciar é o DJ, no escuro, sem contexto.

**N11.4 — Stream falha**
→ Cai para polling.

**N11.5 — Projetor em formato inesperado** ⚪
→ Layout se adapta; a foto nunca é cortada em rosto.

**N11.6 — Presença de marca Albora**
→ **Zero.** Só a identidade do evento.

---

## 6. F5 — Anfitrião durante e depois

**N12.1 — Subir de plano no meio da festa**
→ Funciona e **nunca** bloqueia nenhum convidado, nem por um segundo.
*Por quê:* o convidado nunca vê fricção comercial. Todo gate acontece no admin.

**N12.2 — Estoura o esperado de convidados**
→ Nada acontece. Não existe limite de convidado.
*Por quê:* convidado é canal de distribuição, não custo. Limite que estoura durante a festa é catástrofe de reputação.

**N12.3 — Baixar tudo**
→ Job, nunca request. Aviso por e-mail quando o pacote estiver pronto.
*Por quê:* 3.000 fotos não cabem num request, e tentar é derrubar o produto no momento de maior desejo.

**N12.4 — Remover a pedido de terceiro** 🟠❓
→ O anfitrião remove. Não existe caminho self-service para quem aparece na foto sem tê-la enviado. Ver §12.

**N12.5 — Excluir tudo**
→ Exclusão real e rápida, sem tentativa de retenção.

---

## 7. F6 — Pós-evento

```
D+0    upload aberto por mais 48h
D+1    noivos: "847 fotos e 32 vídeos de 94 convidados"
D+3    quem deu opt-in: "suas fotos"
D+30   oferta do livro
D+330  export para a nuvem do casal + aviso
D+365  exclusão
```

**N13.1 — Convidado revoga consentimento** 🟠
→ As mídias dele saem.

**N13.2 — Export falha** 🟠
→ **Não deleta.** Tenta de novo, avisa por outro canal, escala para humano.
*Por quê:* é o único job do sistema onde falhar aberto é obrigatório. Deletar depois de um export falho destrói memória insubstituível.

**N13.3 — Estender retenção**
→ Conveniência opcional, nunca refém.

**N13.4 — Memória automática em contexto sensível** 🟠
→ Opt-in, nunca opt-out. Desliga em um toque. Acesso ao acervo jamais condicionado a receber notificação.
*Por quê:* as fotos estão cheias de avós que não estarão aqui em dez anos, e de casais que vão se separar.

---

## 8. F7 — Fornecedor (Fase 3)

**N14.1 — Um evento, dois donos** ❓ — modelo de permissão não decidido. Ver §12.
**N14.2 — White-label** — a marca dele substitui a Albora no admin e na papelaria. No telão continua zero marca.
**N14.3 — Fim de contrato** 🟠 — eventos e memórias ficam com os casais. Nunca com o fornecedor.

---

## 9. F8 — Falhas transversais

| Falha | Comportamento | Classificação |
|---|---|---|
| Storage indisponível | Fila segura, retry | **Dura** — falha alto |
| Banco indisponível | Upload para; fila do cliente segura tudo | **Dura** — falha alto |
| Classificador fora | Galeria publica, telão segura | Degrada assimétrico |
| E-mail / WhatsApp fora | Enfileira, entrega depois | Degrada |
| Analytics fora | Engole e loga, zero latência adicionada | Degrada |
| Export fora | Adia deleção, escala para humano | Degrada, **nunca deleta** |

**O caminho de upload depende de exatamente dois sistemas.** Terceiro no caminho crítico de sábado às 20h é falha de arquitetura, não de configuração.

---

## 10. Máquina de estados do upload

```
   [captura]
       │
       ▼
  ┌──────────┐   sem rede    ┌───────────┐
  │ na fila  │──────────────▶│ aguardando│
  └────┬─────┘               └─────┬─────┘
       │ tem rede                  │ rede voltou
       ▼                           │
  ┌──────────┐◀───────────────────┘
  │ subindo  │
  └────┬─────┘
       │ PUT ok
       ▼
  ┌───────────┐  recusado   ┌──────────┐
  │confirmando│────────────▶│  falhou  │──▶ retry c/ backoff
  └────┬──────┘             └──────────┘
       │ confirmado
       ▼
  ┌───────────┐
  │classificar│──▶ ver §4
  └───────────┘
```

Invariantes:

1. **`na fila` é durável.** Sobrevive a fechar a aba, trocar de app e reiniciar o aparelho. Se não sobrevive, não é fila.
2. **`confirmando` é idempotente.** Chegar duas vezes produz um resultado.
3. **Só `publicada` vai ao telão.** Sem exceção, sem modo de emergência, sem flag.
4. **`removida` é terminal e propaga em segundos.**

---

## 11. Estados vazios, de erro e de carregamento

Voz: quente, direta, brasileira, sem ser boba. Segunda pessoa, frases curtas. Nunca "plataforma", "solução", "engajamento", "memórias eternas", "momentos mágicos".

| Situação | Copy | Nunca |
|---|---|---|
| Galeria vazia | "Ainda não tem foto. Seja o primeiro." | "Nenhum conteúdo disponível" |
| Telão vazio | Identidade + QR grande + missões | Grade vazia, spinner |
| Pedindo o nome | "Como te chamamos?" | "Insira seu nome completo" |
| Sem rede, com fila | "Sem sinal. Suas fotos sobem sozinhas quando voltar." | "Erro de rede" |
| Upload falhou | "Não subiu ainda. A gente tenta de novo." | "Upload failed (500)" |
| Confirmado | "Foto 1 ✓ — já tá no telão" | "Upload concluído com sucesso" |
| Missões concluídas | "Você fez todas as 10. Manda o que quiser." | "Parabéns! Você completou 100%!" |
| Evento não começou | "A festa da Ana e do João começa às 19h." | "Evento inativo" |
| Consentimento recusado | "Tudo bem. Se mudar de ideia, é só voltar aqui." | Insistência, segundo diálogo |

Erro nunca expõe interno — sem código HTTP, sem stack, sem nome de tabela.

---

## 12. Buracos de produto

| # | Buraco | Status | Precisa decidir antes de |
|---|---|---|---|
| 1 | ~~Quem modera durante a festa~~ | ✅ **Resolvido** — ninguém. Padrão é publicar tudo; classificador é o único portão (§4) | — |
| 2 | 🟠 **Remoção pedida por quem aparece na foto** mas não a enviou. Só existe caminho pelo anfitrião | Aberto | **1º evento** |
| 3 | 🔴 **O anúncio no microfone** é o maior fator isolado de participação e não é software | Aberto | **1º evento** |
| 4 | 🟠 **Nome ofensivo no telão** — N3.3 dá o mecanismo, mas não a política: renomear, ocultar a sessão, ou banir? | Aberto | **1º evento** |
| 5 | ⚪ **Dupla contagem de sessões** contamina o número que decide continuar ou parar | Aceito como viés | Antes de **ler** o resultado dos 3 casamentos |
| 6 | ⚪ **Pesos da fila do telão** (50/25/25) são chute fundamentado | Ajustável | Com dado do 1º evento |
| 7 | ⚪ **Grace period de 48 h** é chute | Ajustável | Com dado do 1º evento |
| 8 | ⚪ **Propriedade compartilhada** entre casal e fornecedor | Aberto | Fase 3 |

Os itens 2, 3 e 4 são o que eu levaria para as conversas com os cinco cerimonialistas da Fase 0 — quem já produziu duzentas festas responde os três em trinta segundos.
