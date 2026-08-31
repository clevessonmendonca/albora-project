# Runbook — verificação da captura

> **Para quem:** qualquer pessoa, inclusive quem nunca viu o projeto.
> **Verifica:** os oito pontos de [`../specs/task-006-missoes-captura-editor.md`](../specs/task-006-missoes-captura-editor.md) §"Como se verifica", mais os dois riscos declarados na mesma spec.
> **Onde:** num **aparelho de verdade**. O simulador não serve — metade do que se verifica aqui é o comportamento da câmera nativa, da memória do aparelho e do decodificador de imagem dele.
> **Última revisão:** 2026-08-10

Este runbook termina em **veredito**, não em impressão. Cada ponto diz o que fazer, o que esperar e **como saber que falhou** — porque quase toda falha desta tela falha em silêncio, e "pareceu funcionar" é o resultado que mais custa caro depois.

Ao final há uma ficha para preencher (§6) e a lista honesta do que ainda **não** está verificado (§7). Deixar um item como "não verificado" é uma resposta válida e melhor que um check marcado por otimismo.

---

## 0. Antes de começar

### 0.1 O que você precisa

| Item | Por quê |
|---|---|
| Um computador com Docker e Node | Sobe o banco e serve a aplicação |
| **Um celular de verdade**, na mesma rede | A câmera nativa, o teto de memória do canvas e o decodificador HEIC são propriedades do aparelho |
| De preferência **um iPhone e um Android** | O iPhone é quem entrega HEIC e quem tem o teto de área de canvas mais traiçoeiro; o Android de entrada é onde o preset caro fica lento |
| Um **túnel HTTPS** para o servidor local | Ver §0.2. Não é conforto: sem ele o produto não funciona no aparelho |

### 0.2 🔴 HTTPS não é opcional — leia antes de perder uma hora

Três coisas que o caminho do convidado usa só existem em **contexto seguro** (`https://`, ou `http://localhost` no próprio computador):

- `crypto.randomUUID()` — gera o id do item da fila, que é a chave de idempotência do `confirm`
- `navigator.serviceWorker` — registro do Service Worker
- `Background Sync` — a drenagem com a aba fechada

Abrir `http://192.168.x.x:3000` no celular **não** é contexto seguro. O sintoma não se parece com a causa: a tela abre, a câmera abre, a foto é processada, e no fim aparece **"Não consegui preparar essa foto. Tente de novo."** — porque `crypto.randomUUID` não existe e o enfileiramento estourou. Nada entra na fila e nada explica o motivo.

**Como saber que você está num contexto seguro**, antes de qualquer outra coisa: abra o console do navegador do aparelho e rode

```js
[location.protocol, typeof crypto.randomUUID, "serviceWorker" in navigator]
```

Esperado: `["https:", "function", true]`. Qualquer outra coisa, pare e resolva o túnel — nenhum ponto abaixo é confiável sem isso.

Um túnel qualquer que devolva HTTPS serve (`cloudflared tunnel --url http://localhost:3000`, `ngrok http 3000`, ou um certificado local confiável no aparelho). O que importa é o `https://` chegar ao aparelho.

### 0.3 Configuração

O aplicativo lê `apps/web/.env.local`. Confira **três coisas**, porque cada uma falha de um jeito diferente e nenhuma é óbvia:

| Variável | Valor esperado | Como falha se estiver errada |
|---|---|---|
| `APP_ENV` | `dev` | Fora de `dev` o cookie de sessão sai com `Secure`; num túnel HTTPS ainda funciona, mas em qualquer teste por `http` o convidado entra e volta deslogado |
| `SESSION_SECRET` | **32 caracteres ou mais** | Curto demais: `POST /api/sessions` devolve 500 e a entrada trava no botão "Entrando…". Gere com `openssl rand -base64 32` |
| `DATABASE_URL` | O **mesmo** banco que o seed semeia | O seed usa `DATABASE_URL_DEV` ou, na falta, `postgres://albora:albora@localhost:55432/albora`. Apontar a aplicação para outro banco dá "Esse endereço não abre nenhuma festa" num slug que você acabou de semear |

**Rotas raiz em inglês, aliases PT preservados.** O canônico é `/scan`, `/wall-display`, `/wall-pair`. URLs antigas (`/escanear`, `/telao`, `/parear`, `/album`) redirecionam 308 em `next.config.ts` — placas já impressas e links salvos continuam abrindo. Query strings (`?codigo=` no pareamento do telão) são preservadas no redirect.

As chaves `R2_*` também são lidas. **Sem elas o upload não fecha** — `presign` e `confirm` respondem `503 config.missing`, o item fica na fila e a tela mostra "n esperando". Isso não impede a maior parte deste runbook, e para o ponto 7 é até útil (§3.7); mas os pontos que exigem `confirm` ficam marcados como não verificados.

### 0.4 Subir o ambiente

```bash
pnpm install
pnpm db:up        # Postgres em docker, na porta 55432
pnpm db:semear    # migrations + eventos de desenvolvimento
pnpm dev          # servidor em http://localhost:3000
```

`pnpm db:semear` termina imprimindo os endereços e o `event_id`. Se ele não imprimir isso, **pare** — o resto deste runbook depende do que ele criou.

Três eventos ficam disponíveis:

| Slug | O que é | Serve para |
|---|---|---|
| `festa-demo` | Aberta, pack `casamento`, **quatro missões**, filtro recomendado **`dourado`** | Todo o caminho feliz |
| `festa-encerrada` | Terminou há nove dias, pack `quinze-anos` | A tela de "essa festa já foi" |
| `nao-existe` | Nunca foi semeada, de propósito | A tela de endereço inválido |

> **Reexecutar `pnpm db:semear` é seguro** e reabre a janela do `festa-demo`: de uma hora atrás até seis horas à frente. Na prática o slug continua **aberto por cerca de 54 horas**, porque o envio segue liberado por 48 h depois do fim da festa — é o convidado que fotografou às 2 h, guardou o celular sem sinal e só abriu no domingo à tarde. Se você voltar ao runbook depois disso, rode o seed de novo.

`pnpm dev` compila o Service Worker antes de subir (`predev`). Se a compilação falhar, o servidor sobe mesmo assim e o `/sw.js` fica velho ou ausente — confira que a linha `sw.js <hash> · <n> kB` apareceu no terminal.

### 0.5 Limpar entre execuções

Vários pontos abaixo dependem de começar sem estado. Para zerar **no aparelho**, no console do navegador:

```js
indexedDB.deleteDatabase("albora-fila");
localStorage.clear();
(await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister());
(await caches.keys()).forEach(k => caches.delete(k));
```

O cookie de sessão **não sai por aí**: ele é `HttpOnly`, que é justamente o ponto — o JavaScript da página não o alcança, e por isso um XSS também não. Apague-o pelo painel de armazenamento do navegador, ou limpe os dados do site.

Depois recarregue. Você deve cair de novo na tela de consentimento.

---

## 1. Como contar os toques

O ponto 1 da spec é "cinco toques, do QR à confirmação", e sem uma regra de contagem duas pessoas chegam a dois números diferentes. **A regra deste runbook:**

- Conta: cada toque **na interface do Albora**.
- Não conta: os toques dentro da **câmera do sistema** (disparar, "Usar foto"). Eles são do aparelho, não do produto.
- Não conta: a tela de **legenda e lugar**. Ela acontece com a foto **já subindo** — é a decisão registrada em [`../architecture.md` §5](../architecture.md). Ainda assim, **anote-a à parte**: se ela custar tempo, custa participação.

Pela regra, a contagem esperada é:

| # | Toque | Tela |
|---|---|---|
| 1 | "Combinado" | Consentimento |
| 2 | "Entrar" (depois de digitar o nome) | Nome |
| 3 | Uma missão, ou o botão grande de envio livre | Missões |
| — | *(câmera do sistema — não conta)* | |
| 4 | "Enviar" | Editor |
| 5 | "Pronto" ou "Pular — já está subindo" | Detalhes |
| → | **Confirmação** | |

**Cinco.** Cronometre do primeiro toque à tela de confirmação aparecer, e registre também quantos segundos a tela de detalhes consumiu.

---

## 2. Preparação do aparelho

1. No celular, abra o endereço HTTPS do túnel, no caminho `/e/festa-demo`.
2. Confirme o contexto seguro (§0.2).
3. Verifique que o Service Worker pegou: recarregue a página e rode no console

   ```js
   navigator.serviceWorker.controller !== null
   ```

   Esperado `true` na **segunda** carga. `false` na primeira é normal — o registro acontece atrás da tela de consentimento e ele só assume o controle depois.

   **Falhou se:** continuar `false` depois de duas recargas. Confira que `/sw.js` responde 200 no endereço do túnel.

> **Nota:** o Service Worker não é pré-requisito da primeira foto, e isso é de propósito — ele é registrado sem `await` e uma falha ali é engolida. Se ele não subir, os pontos 1 a 8 ainda valem; só o comportamento com a aba fechada fica sem cobertura.

---

## 3. Os oito pontos

### 3.1 Ponto 1 — cinco toques, cronometrados

**Faça:** com o aparelho zerado (§0.5), abra `/e/festa-demo` e vá até a tela de confirmação, contando pela regra do §1. Cronômetro no primeiro toque.

**Espere:**
- Cinco toques na interface do Albora.
- A confirmação mostra a foto **amanhecendo** — entrando escura e clareando até a cor cheia.
- O texto é "Já está no álbum" quando a fila esvaziou, ou "Guardada" quando ainda há item pendente.

**Falhou se:**
- Foram mais de cinco toques. Anote **qual** toque sobrou — é isso que vira correção.
- Apareceu qualquer tela entre o consentimento e a câmera que não seja nome e missões.
- A confirmação apareceu sem a foto.

**Repita uma segunda vez sem limpar nada**, pelo botão "Tirar outra". O caminho encurta para missão → câmera → "Enviar" → "Pronto": **três toques** depois do "Tirar outra", sem consentimento e sem nome.

> **Lacuna conhecida, e ela é da task 005.** Se em vez de "Tirar outra" você **voltar a `/e/festa-demo`** — que é o que o convidado faz ao escanear o QR de novo, ou ao reabrir o link do WhatsApp —, a tela de consentimento aparece outra vez e **o campo de nome vem vazio**. O nome é gravado no aparelho, mas nada o lê de volta. A sessão em si continua válida: ir direto a `/e/festa-demo/photo` cai nas missões sem perguntar nada. Registre se isso acontecer; não é falha do ponto 1.

### 3.2 Ponto 2 — permissão de câmera negada

**Faça:** nas configurações do sistema, revogue a permissão de câmera para o navegador. Volte à tela de missões e toque numa missão.

**Espere, conforme a spec:** cair **direto no seletor de arquivos**, sem tela de erro no meio. A justificativa é de produto, não de conveniência: metade das fotos boas já está no rolo, e tratar negação como falha joga fora metade do acervo por causa de um diálogo do sistema (`../flows.md` N5.1).

**Como saber que falhou:** se aparecer um alerta do sistema e a página voltar sem nada acontecido; ou se aparecer uma tela de erro do Albora; ou se o seletor abrir só na câmera, sem opção de galeria.

> 🔴 **Lacuna conhecida, leia antes de testar.** A captura usa `<input type="file" accept="image/*" capture="environment">`, e o atributo `capture` **pede a câmera ao sistema**. Não existe hoje, no código, nenhum tratamento de permissão negada nem queda para o seletor de arquivos: o que acontecer é inteiramente comportamento do sistema operacional, e ele difere entre iOS e Android. **A expectativa realista é que este ponto reprove.** Registre exatamente o que os dois aparelhos fizeram — é essa observação, e não uma suposição, que decide o desenho da correção.

### 3.3 Ponto 3 — o editor funciona com a rede desligada

**Faça:**
1. Abra `/e/festa-demo/photo` com rede, e **espere a segunda carga** para o Service Worker assumir (§2).
2. Ligue o modo avião.
3. Recarregue a página.
4. Tire uma foto e vá até o editor.

**Espere:**
- A página **abre** offline — é a casca guardada pelo Service Worker.
- A tira de filtros aparece inteira, com as miniaturas geradas.
- Trocar de filtro e mover a intensidade responde normalmente. Nenhuma chamada de rede acontece para aplicar cor.
- "Enviar" leva à tela de detalhes e depois à confirmação, com o texto **"Guardada"** e "Vai subir sozinha assim que o sinal voltar".
- Tocando em "Tirar outra", o topo da tela de missões mostra **"sem sinal · 1 esperando"**. Esse indicador só existe quando há o que dizer — com a fila vazia e a rede de pé ele não aparece, e isso é de propósito: contador permanente vira laço de checagem.

**Falhou se:**
- A página não abre offline (erro de rede do navegador).
- Alguma miniatura fica vazia ou cinza.
- A confirmação disser "Já está no álbum" com o modo avião ligado — isso significa que a contagem de pendentes está errada, o que é pior que um erro visível.

**Feche o ciclo:** desligue o modo avião e fique na tela. A fila deve drenar sozinha, sem você tocar em nada — pelo evento de rede, ou pela tentativa periódica, que existe justamente para o WiFi de salão que conecta mas não tem saída. O contador "n esperando" some.

*(Este fechamento só é observável com as chaves `R2_*` configuradas. Sem elas, o item permanece na fila para sempre e o correto é marcar o ponto como parcialmente verificado.)*

### 3.4 Ponto 4 — cada miniatura mostra a foto do próprio convidado

**Faça:** no editor, olhe a tira inferior.

**Espere:** nove chips — "Original" mais os oito filtros — e **todos** exibindo a foto que você acabou de tirar, cada um com a sua cor. Não uma amostra genérica, não um quadrado de cor chapada.

**Falhou se:** qualquer chip mostrar imagem diferente da sua foto, ficar vazio, ou todos parecerem iguais entre si. Compare em especial **Preto e branco** contra **Dourado**: se esses dois não forem visivelmente diferentes, a tira não está aplicando filtro nenhum.

**Confira também o 35 mm.** O chip "35 mm" é o único que não sai da sintaxe de `filter` — ele passa pixel a pixel. Se ele parecer idêntico ao "Original", a passagem por pixel não rodou na miniatura, e a tira estará mentindo sobre um dos nove chips.

### 3.5 Ponto 5 — o recomendado vem primeiro, com selo, e não se aplica sozinho

O `festa-demo` tem `dourado` como filtro recomendado.

**Espere:**
- O primeiro chip **depois** de "Original" é **"★ Dourado"**, com a estrela.
- Ao entrar no editor, o chip **ativo é "Original"** — contorno em volta dele, e a prévia igual à foto que saiu da câmera.
- Nenhum filtro foi aplicado até você tocar num.

**Falhou se:**
- A prévia entra já dourada, ou o chip "Dourado" entra selecionado. Isso é violação direta da N5.9: coerência do acervo é por convite, nunca por imposição, e aplicar sozinho tira a escolha de quem tirou a foto.
- A estrela não aparece, ou "Dourado" não está em primeiro.

**Contraprova útil:** o `festa-encerrada` não tem filtro recomendado. Como ele está fechado, não dá para chegar ao editor por ele — se quiser a contraprova, tire o `recommended_filter` do `festa-demo` direto no banco e recarregue; a tira deve sair na ordem do catálogo, sem estrela em ninguém, e nada mais deve mudar.

### 3.6 Ponto 6 — missões concluídas viram modo livre

O `festa-demo` tem quatro missões.

**Faça:** mande uma foto para cada uma das quatro.

**Espere:**
- Cada missão cumprida fica esmaecida, com o rótulo "feita".
- Com as quatro feitas, o título do topo passa de missão para **"Modo livre"**, e aparece "Você fez todas as 4. Agora manda o que quiser."
- O botão grande de envio continua ali, funcionando.

**Falhou se:** a lista ficar vazia, aparecer qualquer coisa parecida com "acabou", ou o botão de envio sumir. Terminar a lista não pode parecer o fim do produto — a madrugada é onde saem as melhores fotos (N5.5).

> **Gotcha que engana:** o "feita" é marcado na tela assim que a foto entra na fila, mas ao **recarregar** ele é relido do banco, e no banco ele só existe depois do `confirm`. Sem as chaves `R2_*`, ou com o modo avião ligado, recarregar **desmarca todas as missões**. Isso não é bug deste ponto — é o `confirm` não tendo acontecido. Verifique este ponto com o upload fechando de verdade, ou registre-o como não verificado.

### 3.7 Ponto 7 — o convite do app só depois do `confirm`, nunca com item na fila

**Faça duas vezes, e a comparação é o teste:**

| Cenário | Como produzir | O que esperar |
|---|---|---|
| Fila **vazia** | Envie com rede boa e espere o contador sumir | Na confirmação aparece a linha "No app você acompanha as fotos dos outros e recebe as suas depois da festa." |
| Fila **pendente** | Modo avião, envie uma foto | A confirmação diz "Guardada" e **não** mostra o convite do app |

**Falhou se:** o convite aparecer com item pendente. Com foto pendente, ele competiria com a coisa que o convidado ainda está esperando terminar — o produto pediria instalação antes de ter entregado qualquer coisa.

> **O que existe hoje é menos que "CTA de instalação".** É uma linha de texto, condicionada à fila vazia. Existe um `manifest.webmanifest` e um Service Worker registrados, então o **navegador** pode oferecer a instalação por conta própria, em momento que não é o nosso — e essa oferta do navegador **não** está condicionada à fila vazia. Se ela aparecer durante o teste, registre quando apareceu: é informação para decidir se o produto precisa assumir o controle do prompt.

### 3.8 Ponto 8 — vídeo no plano grátis é avisado **antes** da captura

**Espere, antes de tocar em qualquer coisa:** na tela de missões, abaixo do botão grande, o aviso **"Vídeo é do plano pago. Por aqui, só foto."** está visível **sem** o convidado ter feito nada.

**Falhou se:** o aviso só aparecer depois de tentar mandar um vídeo. Deixar gravar e recusar no envio destrói o momento, e o convidado não tem como refazer o brinde (N5.3).

**Rede de segurança, e vale testar:** o seletor abre em modo foto, mas em vários Android dá para trocar para vídeo dentro da câmera do sistema. Faça isso e tente enviar.

**Espere:** recusa imediata, com a mesma frase, **antes** de a barra de processamento aparecer. A detecção é pela assinatura do arquivo — os primeiros 16 bytes —, nunca pelo tipo declarado, que no iOS vem vazio ou mentiroso.

**Falhou se:** o vídeo for processado (você vê "Preparando…" por vários segundos) antes de ser recusado, ou pior, entrar na fila.

**Teste irmão, do HEIC:** num iPhone com *Ajustes → Câmera → Formatos → **Alta eficiência***, fotografe e envie.

- **No Safari**, que decodifica HEIC, a foto sobe convertida para JPEG sem nenhuma etapa visível.
- **Num navegador que não decodifica HEIC**, espere a recusa com a instrução de trocar para "Mais compatível" — e não uma foto que entra no acervo e depois não abre.

---

## 4. Os dois riscos declarados na spec

### 4.1 Oito miniaturas travando o aparelho

Já aconteceu no protótipo, e a correção foi gerar **uma** redução de 150 px e reutilizá-la nas nove miniaturas.

**Faça:** no aparelho mais fraco que você tiver, tire uma foto na resolução máxima da câmera e entre no editor.

**Espere:** a prévia aparece primeiro, e a tira preenche logo em seguida. A tela responde a toque durante todo o processo.

**Falhou se:** a tela congelar por mais de um segundo, a aba recarregar sozinha (o Android matou por memória) ou a prévia sair **branca** — o Safari do iOS derruba canvas acima de um limite de área e devolve tela em branco **sem erro**, que é o modo de falha mais traiçoeiro deste pipeline.

Cronometre da entrada no editor até a última miniatura aparecer, e **registre o número**. Não existe um teto acordado para isso ainda; o que este runbook produz é a primeira medida.

### 4.2 O 35 mm lento em Android antigo

O plano da spec é: acima de 1,5 s, degradar para a aproximação paramétrica. Isso **está implementado** — a medição é feita sobre o trabalho real da prévia e projetada para o tamanho cheio, e ao estourar o teto o preset cai para a aproximação.

**Faça:** no Android mais antigo disponível, escolha o chip "35 mm" e mova a intensidade.

**Espere:** a prévia responde. Se a degradação entrar, a foto sai **parecida em vez de sair tarde**.

> ⚠️ **Isto não é observável pela interface.** Quando o preset degrada, nada na tela muda de estado — o chip continua marcado, o nome continua "35 mm". Para saber se degradou é preciso depuração remota. Sem ela, o que você consegue verificar é só a metade útil: **que a prévia responde**. Registre "não medido" para a degradação em si; um número inventado aqui é pior que a lacuna.

---

## 5. Falhas que confundem — consulte antes de abrir defeito

| Sintoma | Causa provável | Confirmação |
|---|---|---|
| "Não consegui preparar essa foto" logo no envio | Contexto não seguro: `crypto.randomUUID` ausente | §0.2 |
| Entra e volta para o consentimento | Cookie não grudou — `APP_ENV` diferente de `dev` em `http`, ou cookies bloqueados | §0.3 |
| Botão "Entrando…" trava | `SESSION_SECRET` com menos de 32 caracteres → 500 | §0.3 |
| "Esse endereço não abre nenhuma festa" no `festa-demo` | Aplicação e seed em bancos diferentes | §0.3 |
| Contador "n esperando" nunca zera | `R2_*` ausente → `presign`/`confirm` em `503` | §0.3 |
| "Essa festa não está aberta agora" | A janela do `festa-demo` fechou (~54 h após o seed) | Rode `pnpm db:semear` de novo |
| Consentimento aparece de novo, nome vazio | Lacuna da task 005, não do ponto 1 | §3.1 |
| Missões desmarcam ao recarregar | O `confirm` não fechou | §3.6 |
| Fila não drena sozinha ao voltar a rede | O evento `online` não disparou; a tentativa periódica leva até 30 s | Espere antes de reportar |
| Aviso "sem espaço no aparelho" | Cota do IndexedDB estourada — é comportamento correto (N6.6) | Limpe com §0.5 |
| Nada funciona em aba anônima | O Safari privado bloqueia IndexedDB | Use aba normal |

---

## 6. Ficha de resultado

Preencha uma por aparelho. **Aparelho, sistema e navegador** fazem parte do resultado — sem eles a linha não é reproduzível.

```
Aparelho: ______________  Sistema: ______________  Navegador: ______________
Data: ____________  Executado por: ______________
R2 configurado: ( ) sim  ( ) não        Service Worker ativo: ( ) sim  ( ) não

 #   Ponto                                        Veredito              Observação
 1   Cinco toques                                 ( )passa ( )falha ( )não verificado   toques: ___  tempo: ___s  detalhes: ___s
 2   Permissão de câmera negada                   ( )passa ( )falha ( )não verificado   o que o sistema fez: ____________
 3   Editor com a rede desligada                  ( )passa ( )falha ( )não verificado
 4   Miniaturas com a foto do convidado           ( )passa ( )falha ( )não verificado   35 mm distinto do original? ___
 5   Recomendado primeiro, com selo, não aplicado ( )passa ( )falha ( )não verificado
 6   Missões concluídas → modo livre              ( )passa ( )falha ( )não verificado
 7   Convite do app só com a fila vazia           ( )passa ( )falha ( )não verificado   prompt do navegador apareceu? ___
 8   Vídeo avisado antes da captura               ( )passa ( )falha ( )não verificado   HEIC: ____________

 R1  Tira de miniaturas                           tempo até a última: ____ s   travou? ___
 R2  35 mm — a prévia responde                    ( )sim ( )não   degradação medida: ( )sim ( )não medido
```

**Veredito geral:** a captura passa quando os pontos 1, 3, 4, 5 e 8 passam **num iPhone e num Android**. Os pontos 2, 6 e 7 têm lacunas conhecidas e documentadas (§7) — reprová-los é resultado esperado, não surpresa, e o que se pede deles é a **observação**, não o carimbo.

---

## 7. O que já está verificado — e o que não está

Honestidade sobre a lacuna vale mais que checklist verde.

### Verificado por teste automatizado, sem aparelho

Roda em `pnpm test`, e cobre a **matemática e a ordem**, que é onde moram os bugs que um olho não pega:

- **Catálogo de filtros:** são oito, com id único; só o 35 mm exige passagem por pixel; ele carrega uma degradação paramétrica junto.
- **Ordenação do recomendado:** vai para a primeira posição sem sumir do resto; sem recomendado, mantém a ordem do catálogo; um recomendado inexistente não esvazia a tira.
- **O 35 mm:** intensidade zero não toca em pixel nenhum; levanta o preto; comprime a alta em vez de cortar; puxa o verde nos médios; **é determinístico**; a halação vaza luz para o vizinho escuro; preserva o alfa.
- **Ordem do processamento:** decodifica, endireita, filtra, codifica, e **só então** a miniatura — que sai da imagem já filtrada; sem filtro escolhido, o desenhista de cor nem é chamado; a orientação é lida antes de o reencode apagar o EXIF; a saída é JPEG independente do que entrou.
- **Fila:** ordem de subida, reenfileirar sem estourar, contagem de tentativas com teto, backoff com teto, anotar sem tocar no resto do item, e **não ressuscitar item removido**.
- **Legenda e lugar:** normalização, teto de tamanho, e o lugar validado contra o conjunto fechado do pack.

### Não verificado — e só um aparelho verifica

| O quê | Por que só no aparelho |
|---|---|
| **A camada de desenho** — canvas, `OffscreenCanvas`, `convertToBlob` | É a única parte do pipeline sem teste automatizado, por decisão registrada no próprio código: pixel só se verifica com olho. As decisões que ela executa são testadas; a execução, não |
| Câmera nativa e permissão | Comportamento do sistema operacional |
| Teto de memória do canvas | Propriedade do aparelho; falha em branco e sem erro no iOS |
| Tempo da tira de miniaturas | Nenhuma medida existe ainda. Este runbook produz a primeira |
| Degradação do 35 mm | Implementada, **não observável pela interface** (§4.2) |
| HEIC de verdade | Depende do decodificador do aparelho |

### Lacunas conhecidas de implementação

Não são falhas de execução deste runbook — são coisas que a verificação ainda encontra, ou que já fecharam:

1. **Queda para o seletor de arquivos com a câmera negada (ponto 2)** não está implementada. O atributo `capture` pede a câmera, e o que acontece depois é do sistema.
2. **O "CTA de instalação" (ponto 7)** é hoje uma linha de texto condicionada à fila vazia. O prompt de instalação do navegador não está sob controle do produto.
3. **A miniatura sobe.** A fila manda `thumb` e `webTransport.sendPoster` faz o PUT. Se o telão mostrar placeholder, não é mais esta lacuna — olhe a rede e o R2.
4. **A identidade do evento vem do banco.** `events.identity_tokens` entra no resolvedor (`eventVars`, telão, peças, moldura). Verificar “a cor do casal propaga” é possível depois de salvar identidade no admin.
5. **O nome gravado no aparelho não é lido de volta** (§3.1). É lacuna da task 005 e aparece durante este runbook; anote onde apareceu e siga.

---

## 8. Documentos irmãos

- [`../specs/task-006-missoes-captura-editor.md`](../specs/task-006-missoes-captura-editor.md) — o contrato que este runbook verifica
- [`../flows.md` §3.4 e §3.6](../flows.md) — as nuances N5.x e N6.x citadas aqui, com a justificativa de cada uma
- [`../architecture.md` §5 e §6](../architecture.md) — por que o `confirm` não espera a legenda, e por que o filtro entra antes do encode
- [ADR 0007](../adr/0007-ai-policy-luts-not-generation.md) — por que o visual sai de matemática determinística e não de IA
