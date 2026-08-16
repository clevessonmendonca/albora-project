# Albora — Arquitetura

> **Status:** fonte da verdade de fronteiras. Runtime e hospedagem fixados — [ADR 0005](./adr/0005-runtime-stack.md) e [ADR 0006](./adr/0006-hosting-platform.md) estão em `Accepted`: TypeScript ponta a ponta, Next.js no Cloudflare, R2 e Postgres gerenciado.
> **Origem:** [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) e [`product/albora-branding-marketing.md`](./product/albora-branding-marketing.md).
> **Última revisão:** 2026-08-15
> **Rotas no ar:** mapa em [`README.md`](./README.md).

Este documento é a fonte da verdade de arquitetura. Ele descreve **fronteiras, invariantes e caminhos críticos** — não a implementação. Decisões vinculantes viram ADR; procedimentos viram runbook.

---

## 1. As restrições que governam tudo

Arquitetura é resposta a restrição. As do Albora são incomuns e vale enunciá-las antes de qualquer diagrama, porque cada decisão adiante deriva de uma delas.

| # | Restrição | Consequência arquitetural |
|---|---|---|
| R1 | **A hipótese H1 decide o negócio:** ≥40% dos convidados presentes enviam ao menos 1 foto | Cada tela antes da câmera derruba o número. Sem login, sem download, ≤4 toques. |
| R2 | **Sábado, 22h, salão de festas, 4G ruim** | Compressão no cliente, fila persistente, retry. O servidor não pode ser gargalo. |
| R3 | **Carga é uma rajada, não um fluxo** | ~80% dos uploads em 4 horas, aos sábados, concentrados em maio–junho e outubro–dezembro. Serverless; nada de instância fixa ociosa 6 dias por semana. |
| R4 | **O evento tem data marcada e ela não move** | Escopo se corta, prazo não. A data é o que impede scope creep. |
| R5 | **O convidado não é cliente, é canal** | Zero fricção comercial na superfície dele. Todo gate de plano acontece no admin do casal. |
| R6 | **A identidade visual do evento assume a UI** | Tokens em runtime, não em build. Um hex hardcodado é um lugar onde a identidade não propaga. |
| R7 | **LGPD com foto de terceiros e público leigo** | Consentimento versionado, EXIF removido antes do upload, remoção self-service, retenção cumprida por job. |
| R8 | **Uso único por casal, recorrente por fornecedor** | Custo marginal por evento precisa ser desprezível; o dado que importa reter é permissão de contato, não sessão. |

---

## 2. Superfícies e planos

Quatro portas, três hoje e uma na Fase 3. Cada uma tem público, frequência e postura de segurança distintas — e por isso limites de confiança distintos.

| Plano | Usuário | Volume | Autenticação | Modo |
|---|---|---|---|---|
| **Convidado** | 100–200 por evento, 1 dia | Rajada | **Nenhuma.** Sessão anônima assinada, escopada a 1 evento | Escuro |
| **Anfitrião (admin)** | 2 pessoas, ~12 meses | Baixo | Conta com login | Claro |
| **Telão** | 1 tela por salão | 1 sessão longa | Token de exibição do evento, somente leitura | Escuro |
| **Fornecedor** (Fase 3) | 1 por parceiro, semanal | Baixo | Conta com login + escopo multi-evento | Claro |

O modo claro/escuro **não é preferência do usuário** — é contexto de uso. O convidado usa o produto às 22h no escuro; tela clara nesse momento é agressiva. O admin trabalha de dia e a papelaria vai para gráfica.

Os planos **rejeitam os tokens uns dos outros**. Um token de sessão de convidado não abre nada no admin; um token de exibição do telão é somente leitura e não sobe mídia.

**Onde isso vive hoje.** Convidado em `/e/[slug]/…`, anfitrião em `/admin`, telão em `/wall-display` (poll de `GET /api/wall`, cache local das últimas 50). Landing em `/`. Mapa completo em [`README.md`](./README.md). O app nativo (`apps/mobile`) ainda não passou da task 017.

---

## 3. Fronteira de isolamento: o evento

> Decisão vinculante: [ADR 0002](./adr/0002-event-as-tenancy-boundary.md).

O Nereus isola por **tenant** (dezenas de organizações, cada uma enorme e permanente). O Albora isola por **evento** (milhares, cada um pequeno e com vida de 12 meses). A cardinalidade invertida muda o desenho: não há realm por evento, não há schema por evento, não há infra provisionada por evento. Há uma coluna e uma política.

### O invariante

1. Toda tabela com dado de evento tem `event_id` UUID NOT NULL.
2. RLS **FORÇADO** (`FORCE ROW LEVEL SECURITY`), política filtrando por
   `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`.
3. Toda transação define `SET LOCAL app.event_id`. Nunca `SET`.
4. Chaves de storage são `events/{event_id}/...`, derivadas no servidor.
5. A raiz é a exceção de forma, não de regra: `events` está sob a mesma política, casando por `id` — ali a linha **é** o evento.

O terceiro argumento `true` em `current_setting` evita o erro quando o setting nunca existiu: devolve NULL, a política não casa com nada e o sistema **falha fechado**.

**O `NULLIF` não é defensivo, é obrigatório**, e a razão não é óbvia. Depois de um `SET LOCAL`, ao commitar, um GUC customizado não volta a NULL — volta a **string vazia**. E `''::uuid` não "deixa de casar": ele **estoura** com `invalid input syntax`. Sem o `NULLIF`, a mesma consulta se comporta de dois jeitos na mesma pool — zero linhas em conexão nova, erro 500 em conexão reciclada por outro evento. A diferença entre "falha fechado" e "falha às vezes" cabe nessas seis letras.

### As cinco portas fora da RLS

Cinco consultas precisam acontecer **antes** de existir contexto de evento, e nenhuma delas pode passar pela política sem circularidade:

| Porta | Circularidade | Por que é aceitável |
|---|---|---|
| **Token da sessão** (`session_tokens`) | Resolver o token dá o `event_id`; a tabela do token exigiria o `event_id` | Contém só hash opaco → (`event_id`, `session_id`, validade). Sem PII, sem conteúdo de evento, sem nome. Quem lê a tabela inteira sabe que existem sessões e a quais eventos pertencem, e nada mais |
| **Slug do evento** (`event_slugs`) | Achar o evento pelo slug exige o `event_id`; o `event_id` vem de achar o evento | O slug **não é segredo**: está impresso na placa da mesa e escaneado por 200 pessoas. A tabela não revela nada que o QR já não revele |
| **Crachá da parede** (`wall_tokens`) | Resolver o crachá dá o `event_id`; a tabela exigiria o `event_id` | Só leitura — a TV não é uma pessoa e não tem `session_id`. Sem PII, sem conteúdo de evento |
| **Pareamento da TV** (`wall_pairings`) | Nasce sem evento; resolve por código e token de poll antes de haver contexto | Só mapeamento código/token → evento, mais consentimento de quem autorizou. Sem nome de convidado, sem foto |
| **Pareamento web → app** (`app_pairings`) | Resgatar o código dá o `event_id`; a tabela exigiria o `event_id` | Só mapeamento código → (`event_id`, `session_id`). Sem PII — a única coisa que o convidado digita além do nome |

A disciplina é manter as cinco portas **mínimas**. Toda coluna que alguém quiser acrescentar ali está pedindo para sair de trás da RLS, e a revisão trata isso como mudança de fronteira, não como campo novo. Um teste da suíte de isolamento existe só para isso: fixa a lista de tabelas sem RLS e reprova quando aparece uma sexta.

### O segundo escopo

Duas leituras cruzam eventos por natureza: o dashboard do fornecedor ("meus 40 eventos") e a observabilidade da plataforma. Elas não passam por RLS — usam papel dedicado com `BYPASSRLS`, restrito a caminhos de agregação, **auditado por chamada**. Nunca se resolve isso relaxando a política.

A auditoria não é opcional na assinatura: o caminho de agregação **exige um motivo** e recusa a chamada sem ele. Não é burocracia — é que a agregação é a única porta declarada que cruza eventos, e o que a auditoria não vê não aconteceu.

### Um só lugar abre o escopo

Existe exatamente uma função que entra em contexto de evento, e ela garante três coisas que não sobrevivem a serem reimplementadas num segundo lugar: **transação sempre** (fora dela o `SET LOCAL` não é aplicado, a política não casa com nada, e o sintoma é "sumiu tudo" — enganoso, porque parece bug de dado e não de escopo), **`SET LOCAL` e nunca `SET`**, e **devolução da conexão em toda saída**, inclusive exceção. Um `event_id` que não é UUID é recusado antes de tocar no banco: falha alto em vez de virar um SELECT que devolve vazio.

### Onde isso vaza se você não prestar atenção

- **Jobs em background.** Rodam fora do ciclo de request, então ninguém definiu `app.event_id` por eles. O entrypoint do worker define a partir do payload, antes de qualquer chamada ao banco. Job sem `event_id` falha alto.
- **Pooling.** Em modo transação a conexão volta ao pool a cada COMMIT. `SET` vaza para o próximo cliente; `SET LOCAL` não. O mesmo para locks: `pg_advisory_xact_lock`, nunca a variante de sessão.
- **Presigned URLs.** É o único lugar onde o cliente pede permissão de escrita direta no storage. A chave é montada no servidor a partir do `event_id` da sessão — o cliente nunca a informa.

---

## 4. Sessão do convidado

> Decisão vinculante: [ADR 0004](./adr/0004-anonymous-guest-session.md).

O usuário principal do produto não tem conta, e essa é uma decisão de produto, não uma lacuna a preencher depois. Toda a segurança do plano do convidado repousa em um único artefato.

```
Escaneia QR  →  GET /e/{slug}
                  ↓
              Consentimento LGPD (1 tela, 1 checkbox, versão registrada)
                  ↓
              POST /api/sessions  →  cria guest_session
                                     emite token opaco assinado
                                     cookie HttpOnly, SameSite=Lax
                  ↓
              Nome (opcional)  →  captura  →  upload
```

**O token carrega exatamente um escopo: um `event_id` e um `session_id`.** Autoriza três coisas — subir mídia naquele evento, reagir, remover a própria mídia. Não autoriza ler dado de outro convidado que não seja mídia aprovada, não autoriza nada no admin, não é transferível entre eventos.

Isso é o equivalente estrutural do JWT do Nereus, com uma diferença que importa: como não há identidade verificada por trás, o token é a **única** credencial. Ele precisa ser opaco (não um JWT com claims legíveis), assinado, e revogável por evento — se um QR vazar em rede social durante a festa, o anfitrião precisa poder rotacionar sem derrubar quem já está subindo foto.

Três consequências que caem de ser a única credencial:

- **Guarda-se o hash, nunca o token.** Um dump do banco não entrega acesso a nenhuma sessão ativa: o token só existe no cookie do aparelho. É a mesma razão de não guardar senha em claro, valendo com força maior, porque aqui não há segundo fator nenhum.
- **Assinatura primeiro, banco depois.** A verificação de assinatura não toca no banco, então token forjado custa microssegundos em vez de uma consulta. Com 200 celulares na mesma antena e um convidado entediado, essa ordem é a diferença entre um script irrelevante e a fila do banco no pico da festa.
- **O token vive em cookie `HttpOnly`, `SameSite=Lax`, e nunca na URL.** Na URL ele vaza por referer, histórico, print de tela e no grupo do WhatsApp — que é literalmente o segundo canal de distribuição do evento. Um guard do CI reprova token em querystring e credencial em log.

O motivo de uma sessão inválida — assinatura errada, desconhecida, expirada, revogada — vale para log e métrica, **nunca para a resposta**. Distinguir "expirado" de "desconhecido" conta ao atacante que ele acertou um token que já existiu.

**A janela da sessão não fecha junto com a festa.** O convidado que fotografou às 2h, guardou o celular sem sinal e só abriu no domingo à tarde precisa que a fila ainda drene. Rotação de slug também não derruba sessão ativa: o que expira é a validade do token, não o slug — e o slug antigo continua resolvendo, inativo, para orientar quem escaneou a placa que já saiu da gráfica.

### Rate limit — no portão, e em duas camadas

Rate limit acontece **antes de qualquer trabalho caro**, inclusive antes de emitir presigned URL. Um pedido condenado não deve consumir assinatura, nem cota, nem espaço no bucket.

São duas camadas, e nenhuma sozinha serve. A grossa é a da borda, configurada na plataforma: durável, distribuída, e a única que segura enchente vinda de fora. A fina é **por sessão**, na aplicação. Ela existe por um motivo específico deste produto: **a regra de borda conta por IP, e num casamento os 200 convidados estão no mesmo WiFi**, atrás de um IP só. Uma regra de borda apertada o bastante para conter um abusador estrangularia a festa inteira como se fosse uma pessoa — e o sintoma seria "o Albora parou às 22h", exatamente no pico.

Então: a de borda fica **generosa, dimensionada para o salão inteiro**; a da aplicação dá justiça **entre convidados**. A segunda não segura ataque distribuído, e não precisa.

---

## 5. Pipeline de upload — o caminho crítico

É aqui que o produto se decide. Se este caminho falhar num sábado à noite, nada mais importa.

```
[Cliente]
  0. Service Worker registrado atrás da tela do QR   ← nunca no caminho da 1ª foto
  1. Captura pela câmera NATIVA (input capture), nunca getUserMedia
  2. Triagem antes de ler o arquivo inteiro:
       ├─ vídeo no plano grátis → recusa com aviso, ANTES da captura
       └─ HEIC que este aparelho não decodifica → recusa com saída
  3. Processamento local, e a ORDEM é a regra inteira:
       ├─ lê a orientação do EXIF        ← reencodar apaga a tag junto
       ├─ aplica a orientação nos pixels
       ├─ redimensiona (2500px grátis / 3500px pago — livro a 300dpi)
       ├─ aplica o preset, se houver     ← §6
       ├─ reencode JPEG                  ← é ISTO que remove o EXIF e o GPS
       └─ deriva a thumb da imagem JÁ FILTRADA
  4. Enfileira em IndexedDB              ← a fila é a fonte da verdade, não a memória
  5. POST /api/uploads/presign  →  URLs presigned (full + thumb)
                                    chaves derivadas do event_id da SESSÃO
  6. PUT direto no object storage        ← o servidor nunca vê os bytes
  7. POST /api/uploads/confirm  →  valida, persiste, publica
  8. Retry com backoff, drenagem em série
     ├─ na aba: eventos de rede + tentativa periódica
     └─ fora da aba: Background Sync onde existir; onde não, na próxima abertura
```

### Os seis pontos que decidem se funciona

1. **Compressão antes do upload** corta o payload em 5–10×. Sem isso, 4G ruim significa upload falhado significa participação zero.
2. **A fila em IndexedDB é a fonte da verdade.** O convidado troca de app, o browser suspende a aba, o sinal cai. O que está na fila sobe depois; o que está só em memória morre. **Toda foto passa pela fila, mesmo com sinal bom** — um caminho rápido que a contorna é um caminho que se comporta diferente justamente quando o sinal cai.
3. **A remoção do EXIF é consequência, não etapa.** Ela cai do reencode, que existe de qualquer jeito para gerar a saída. Uma etapa separada é uma etapa que alguém esquece de chamar; um dado de GPS que sai porque a foto tem de ser codificada não tem como ser esquecido. A orientação é lida **antes**, porque depois não há de onde recuperar — e a foto do iPhone entra deitada no álbum.
4. **A drenagem é em série, e o erro é valor, não exceção.** 200 celulares na mesma antena já saturam o enlace; subir dez fotos em paralelo do mesmo aparelho piora o tempo de todo mundo, inclusive o dele. E um envio que estoura no meio do laço levaria as fotos seguintes junto — uma foto corrompida não pode derrubar as outras nove. Esgotar as tentativas **não apaga o item**: ele vira falha visível com "tentar de novo", porque foto sumindo em silêncio é o pior modo de falha deste produto.
5. **`confirm` valida, não confia.** Verifica que o objeto existe, que a chave começa com o prefixo do evento da sessão, e que os primeiros bytes são de fato de uma imagem do tipo declarado. O `Content-Type` é declarado pelo cliente e não vale nada: um "JPEG" que é HTML servido da origem do app é XSS armazenado com alcance de festa inteira. A leitura no storage é por `Range` nos primeiros bytes — o suficiente para a assinatura de arquivo, e nada perto de trafegar a foto pelo servidor.
6. **`confirm` é idempotente.** Retry é o caminho normal, não a exceção — a mesma confirmação chegando duas vezes não pode gerar duas linhas. E o conflito por `uploadId` que a política esconde tem a **mesma resposta** de chave inválida: dizer "já existe em outro evento" já é vazamento.

### O Service Worker não reescreve o laço

A drenagem fora da aba usa **a mesma** sequência, a mesma fila e o mesmo transporte que a aba usa. Reescrever o laço em código solto do worker seria uma segunda fonte da verdade, e o sintoma da divergência é o pior possível: foto que sobe com a aba aberta e some com a aba fechada — justamente o caso que a fila existe para cobrir.

Duas regras de fronteira em volta dele:

- **O registro fica fora do caminho da primeira foto** e nunca lança. Um erro ali viraria tela de falha antes de o convidado ter feito qualquer coisa, e a H1 se decide nesses segundos.
- **Background Sync é adotado por capacidade, nunca por user-agent.** Quem não tem não recebe erro; quem passar a ter ganha sem trocar uma linha. Onde não existe, a fila sobe na próxima abertura pelo laço da própria aba.

O worker não intercepta `/api/`. Ele guarda a casca e o estático para a tela abrir com a rede ruim — não para responder por escrita, que é o caminho crítico e não pode ter cache no meio.

### Legenda e lugar: o confirm não espera o texto

O convidado escreve legenda e escolhe "onde na festa" **depois** de a subida começar (`flows.md` §3.6). A decisão arquitetural que isso força é contraintuitiva e vale registrar:

> **O `confirm` não espera a legenda.** Se esperasse, uma aba fechada no meio deixaria a foto no storage sem linha no banco — perdida exatamente no cenário que a fila existe para cobrir.

Então a foto confirma sozinha, e o texto chega por **dois caminhos, conforme de que lado da linha o item está**:

| Estado do item | Quem guarda o texto |
|---|---|
| Ainda na fila | A própria fila. O `confirm` leva legenda e lugar junto quando finalmente sai |
| Já confirmado | Uma rota de anotação, que faz `UPDATE` na linha existente |

A anotação é **enriquecimento puro**: a foto não depende dela para existir, e uma falha ali nunca vira erro na cara de quem acabou de mandar uma foto que já está salva. Os dois caminhos passam pela **mesma normalização** — normalizar diferente em cada porta seria o mesmo que não normalizar.

**O `session_id` no `WHERE` da anotação não é redundante.** A RLS garante o evento e para aí; dentro do evento, o `session_id` é a única coisa que separa a foto de um convidado da do outro. Sem ele, um convidado escreveria legenda na foto de outro.

### O que pode falhar sem derrubar o upload

Regra: **o caminho de upload depende de exatamente dois sistemas — object storage e Postgres.** Todo o resto degrada.

| Dependência | Classificação | Comportamento na falha |
|---|---|---|
| Object storage | **Dura** | Falha alto. Fila segura e tenta de novo. |
| Postgres | **Dura** | Falha alto. |
| Classificador de moderação | Enriquecimento | Mídia entra na fila de aprovação manual. |
| Notificação / e-mail / WhatsApp | Enriquecimento | Enfileira, entrega depois. |
| Analytics de funil | Enriquecimento | Engole e loga. **Nunca** adiciona latência ao request. |
| Export para Drive | Enriquecimento | Job, não request. |

Terceiro no caminho crítico é falha de arquitetura, não de configuração.

---

## 6. Propagação de identidade — um resolvedor, N renderizadores

> Decisão vinculante: [ADR 0003](./adr/0003-runtime-token-resolution.md).

Esta seção descreve a vantagem competitiva do produto. Trate-a como código de produto, não como estilo.

O evento carrega `identity_tokens` (paleta, tipografia, monograma, motivo). Esses tokens precisam sair idênticos em superfícies que não compartilham runtime: a placa impressa em gráfica, os cards de mesa, o preset aplicado às fotos, o telão e o álbum final. Se divergirem, o produto não entrega o que vende.

```
          events.identity_tokens (JSONB)
                      │
                      ▼
            ┌───────────────────┐
            │  resolvedor       │  ← único, com fallback: evento → pack → marca
            │  tokens → valores │
            └─────────┬─────────┘
                      │
   ┌──────────┬────────┼────────┬──────────────┬─────────────┐
   ▼          ▼        ▼        ▼              ▼             ▼
 CSS custom  modelo   pipeline  pipeline    moldura de   (futuros)
 properties  de telão SVG→PDF   de preset   compartilhar
 (web/PWA)   (4 tipos) (placa,  (cor sobre  (story 9:16,
                       cards,    a foto)     colagem)
                       livro)
```

**Cinco renderizadores, um resolvedor.** O modelo de telão e a moldura de compartilhamento são artefatos de identidade como qualquer outro — o casal escolhe o layout do telão do mesmo jeito que escolhe a paleta, e a moldura do story carrega monograma, nomes e data resolvidos da mesma fonte.

**A regra que faz isso funcionar:** nenhum componente conhece um valor concreto. Sem hex, sem nome de fonte, sem raio literal — tudo é referência a token. Um hex hardcodado num componente é, literalmente, um lugar onde a identidade do casal não propaga.

### O preset é matemática determinística, não IA

O quarto renderizador — o preset aplicado à foto — segue a mesma lógica: cor calculada em canvas no cliente. Decisão vinculante em [ADR 0007](./adr/0007-ai-policy-luts-not-generation.md).

Três razões, e a segunda é a que decide:

1. **Offline.** A fila é a fonte da verdade do upload e não pode depender de rede para aplicar um preset.
2. **Coerência.** IA generativa interpreta cada foto de um jeito. Em 3.000 fotos, o álbum deixaria de parecer um rolo de filme — quebrando exatamente o que a propagação de identidade existe para garantir.
3. **Custo.** R$ 0 contra ~R$ 50 por evento na opção mais barata do mercado, sobre um ticket de R$ 199.

IA generativa **nunca** toca a mídia do convidado. IA de classificação — moderação e curadoria do livro — é bem-vinda fora do caminho crítico, e é onde a mágica de fato está.

**Os presets são paramétricos, não strings fixas.** Cinco parâmetros — sépia, saturação, matiz, brilho, contraste — interpolados entre o neutro e o filtro cheio, que é o que permite intensidade contínua em vez de tudo-ou-nada. A maioria resolve na sintaxe de `filter`, entendida por canvas e por React Native; a exceção é o preset de filme, que precisa de uma **passagem por pixel** porque faz o que a sintaxe de `filter` não faz: ombro nas altas, viés de cor nos médios, halação em volta da luz e grão.

Três invariantes caem daí, e as três são de arquitetura, não de estilo:

- **A matemática mora no núcleo compartilhado.** Duas implementações da mesma curva produzem duas estéticas no mesmo álbum, e coerência entre todas as fotos é literalmente o que o produto vende. Cada superfície injeta só o desenho — quem decide ordem, tamanho e cor é o núcleo.
- **O grão é determinístico.** Reabrir o editor não pode mudar a foto, senão a miniatura da tira deixa de corresponder ao que o convidado vai receber.
- **O preset caro carrega a própria degradação.** Quando a passagem por pixel passa do teto de tempo no aparelho, ele cai para a aproximação paramétrica e a foto sai **parecida em vez de sair tarde**. A medida é do trabalho de verdade, projetada para o tamanho cheio — não de uma sonda à parte, que mediria outra coisa.

**O filtro entra antes do encode, e a miniatura sai da imagem já filtrada.** Filtrar as duas em separado deixaria a tira do telão com uma cor e a foto do álbum com outra — e o telão é a superfície onde a divergência aparece para 150 pessoas ao mesmo tempo.

**O filtro recomendado pelo anfitrião é convite, nunca imposição.** Ele encabeça a tira e ganha selo; quem aplica é o convidado. Aplicar sozinho tiraria a escolha de quem tirou a foto, e a coerência do acervo deixaria de ser adesão para virar padrão silencioso. O evento guarda o **id** do preset, não os parâmetros: parâmetros gravados congelariam a estética na versão do catálogo que estava no ar naquele dia, e a correção de uma curva deixaria de alcançar os eventos já criados.

Por isso o guard de conformidade no CI **é teste de regressão da funcionalidade principal**, não higiene de estilo. Ele roda bloqueante desde o primeiro commit e falha em: hex literal em componente, classe de cor arbitrária, fork do bloco de tokens fora do package compartilhado.

A marca Albora é o fallback, nunca a camada dominante — "a marca é a moldura, o evento é o quadro". No telão a presença da marca é **zero**; no fluxo do convidado é quase nula.

---

## 7. Sistema de packs

O núcleo é genérico e não sabe que casamento existe. Ele conhece `event`, `host`, `guest`, `challenge`, `upload`. Casamento é um pack: vocabulário, biblioteca de missões, templates de peça, presets de identidade, tom.

A mecânica é a de i18n, com o vertical no lugar do idioma — inclusive a cadeia de fallback (`pack → default → core`).

**Duas regras, ambas verificáveis por máquina:**

1. Nenhuma string de domínio dentro de componente. Nada de `noivos`, `casamento`, `noiva` no núcleo, no schema ou no JSX.
2. Dependência unidirecional: `pack → core`, **nunca** o contrário. Guard bloqueante no CI, no mesmo espírito do guard de tokens.

**Teste de sanidade:** trocar o pack de um evento muda toda a UI sem tocar uma linha do núcleo.

### O pack também define conjuntos fechados

Além de vocabulário, missões e identidade, o pack carrega a lista de **lugares** — o "onde na festa" que o convidado marca na foto. É lista fechada, e fechada por dois motivos que se somam: alimenta a linha do tempo do álbum sem trabalho de normalização, e não abre a mesma superfície de abuso que um texto livre projetado no telão para 150 pessoas.

A regra de fronteira: **o conjunto vem do servidor, o cliente manda uma escolha dentro dele.** Vale para o lugar, que é validado contra o pack do evento lido do banco, e para a missão, que é conferida como pertencente àquele evento antes de virar coluna. Um id de outro casamento gravado ali vazaria a existência daquele evento pela porta dos fundos.

Missão e lugar **não** entram no conjunto de chaves que o núcleo exige de todo pack. Um casamento tem altar e um aniversário de 15 anos não; exigir o mesmo conjunto forçaria packs a inventar lugares que a festa não tem. O que precisa ser igual é o que o núcleo desenha — o resto é o pack descrevendo a própria festa. Um pack incompleto é defeito verificável: falta uma chave, e a verificação diz qual.

No catálogo há **dois** packs: casamento e 15 anos (`packages/packs`). Trocar o `pack_id` de um evento muda o vocabulário, as missões e os momentos do álbum sem tocar o núcleo — é o teste de sanidade.

> A regra que protege a decisão: **a experiência de casamento nunca piora para acomodar outro vertical.** Se um pack novo exigir tirar especificidade do casamento, o problema está no desenho de packs — não no casamento.

---

## 8. Modelo de dados

Nomes genéricos desde o commit 1. Nunca `couple_names`, `wedding_date`, `bride`, `groom`.

```
accounts ──┐
           ├──< events >──┬──< challenges
vendors ───┘              ├──< guest_sessions >──┬──< uploads >──< reactions
                          │                      ├──< comments
                          │                      └──< guest_contacts
                          ├──< funnel_events
                          ├──< event_music / music_suggestions
                          ├──< recado / recado_lido
                          ├──< export_jobs
                          ├──< event_slugs        ← fora da RLS (§3)
                          ├──< session_tokens     ← fora da RLS (§3)
                          ├──< wall_tokens        ← fora da RLS (§3)
                          ├──< wall_pairings      ← fora da RLS (§3)
                          ├──< app_pairings       ← fora da RLS (§3)
                          └──> packs
```

| Tabela | Papel | Nota de isolamento |
|---|---|---|
| `accounts` | 1 conta → N eventos (casamento, chá de bebê, bodas) | Fora do escopo de evento |
| `vendors` | Parceiro B2B2C, tokens de marca própria | Fora do escopo de evento |
| `packs` | Vocabulário, missões padrão, templates, identidade padrão, **lista de lugares** | Global, versionado |
| `events` | Raiz do escopo. `identity_tokens`, `pack_id`, filtro recomendado, janela do evento, gate de interação, **`expected_guests`** (denominador da H1; migration `0020_convidados_esperados.sql`), **`timezone`** IANA do salão (migration `0026_fuso_do_evento.sql`; default `America/Sao_Paulo`) | **É a fronteira.** Sob política, casando por `id`. Segunda política de conta: [ADR 0013](./adr/0013-acesso-por-conta-sob-rls.md) |
| `challenges` | Missões do evento | `event_id`, RLS |
| `guest_sessions` | Sessão anônima + consentimento versionado e datado. `via` é `qr` \| `wa` \| `link` — o canal de entrada (migration `0024_via_da_sessao.sql`). Consentimento externo (Stories) é coluna à parte | `event_id`, RLS |
| `guest_contacts` | Opt-in explícito de contato — base do loop viral | `event_id`, RLS, **PII** |
| `uploads` | Mídia, estado, legenda e lugar (ambos opcionais), veredicto do classificador | `event_id`, RLS |
| `reports` | Denúncia por sessão. `kind`: `ofensivo` (limiar do telão) ou `aparece_na_foto` (só fila). Sem auto-remoção | `event_id`, RLS |
| `reactions` | Reação única e anônima — chave por (`upload`, `sessão`) | `event_id`, RLS |
| `comments` | Comentário em foto, com thread (`parent_id`) | `event_id`, RLS |
| `funnel_events` | Instrumentação do funil | `event_id`, RLS |
| `event_music` / `music_suggestions` | Trilha do casal e sugestões do convidado — **link e metadado, nunca bytes de áudio** ([ADR 0011](./adr/0011-musica-do-evento-sem-direito-de-sincronizacao.md)). Título e artista da sugestão vêm de oEmbed (Spotify, YouTube) ou Open Graph (Apple Music, Deezer) **só nos hosts da lista fechada**; timeout curto, e falha deixa o link. | `event_id`, RLS |
| `recado` / `recado_lido` | Recado dos anfitriões (um por evento) e leitura por sessão. Áudio em `audio_key` / `audio_duration_seconds`, PUT presigned em `events/{event_id}/recado/...` | `event_id`, RLS |
| `export_jobs` | Recorte published para o ZIP “baixar tudo”. A lista de chaves é query em `uploads`, nunca `ListObjects` no bucket. Artefato em `events/{event_id}/export/{job}.zip` se materializado; o download autenticado transmite em stream | `event_id`, RLS |
| `event_slugs` | Slug → evento, com o antigo preservado como inativo | **Fora da RLS por circularidade declarada (§3)** |
| `session_tokens` | Hash do token → (`event_id`, `session_id`), validade, revogação | **Fora da RLS por circularidade declarada (§3)** |
| `wall_tokens` | Hash do crachá da TV → `event_id`, validade, revogação. Só leitura | **Fora da RLS por circularidade declarada (§3)** |
| `wall_pairings` | Código de pareamento da TV → evento, com consentimento | **Fora da RLS por circularidade declarada (§3)** |
| `app_pairings` | Código de pareamento web → app → (`event_id`, `session_id`) | **Fora da RLS por circularidade declarada (§3)** |

Duas notas de desenho que não são cosméticas:

- **Uma linha por slug, e não uma coluna em `events`.** A rotação precisa que o slug **antigo** continue existindo: o material impresso já saiu da gráfica, e quem escanear a placa velha tem de cair numa página de orientação, nunca num erro seco.
- **Reagir duas vezes é reagir uma vez**, garantido pela chave primária. É o que faz o botão sobreviver a toque duplo e a retry de rede sem inflar contagem.

`expected_guests` é o denominador da métrica que decide o negócio (`sessões_com_upload / expected_guests`). Mora em `events`, NOT NULL, default 150, conferido no wizard e no painel `/admin/e/[eventId]/guests`. Sem ele o casamento termina e não se sabe onde a participação foi perdida.

`timezone` é o IANA do salão (`America/Sao_Paulo` por omissão). O `confirm` aplica esse fuso na parede do EXIF para gravar `taken_at`; o álbum fatia capítulos e a faixa 5h–7h no mesmo offset. Sem a coluna, Brasília era constante — uma festa em Manaus deslocava o amanhecer em uma hora.

---

## 9. Moderação

Com feed, reações e telão, o produto **difunde** imagem de terceiros. A decisão de exibir é uma função pura em `@albora/core` (`decidirExibicao`), avaliada toda vez que uma superfície desenha — não uma fila que alguém precisa olhar no sábado.

O padrão é **publicar na galeria**. O telão é o portão mais estreito:

- Veredicto `limpo` → pode ir à parede.
- `suspeito` → some das duas superfícies até o anfitrião liberar.
- `sem-resposta` (NULL, timeout, provedor mudo) → **galeria publica, telão segura.** Falhar fechado na parede; falhar aberto no feed.
- Duas denúncias **ofensivas** de sessões distintas tiram do telão (uma, se o anfitrião marcou `has_minors`).
- Pedido **“sou eu nessa foto”** (`reports.kind = aparece_na_foto`) entra na fila de revisão e **não** some sozinho. O anfitrião mantém ou oculta. Sem reconhecimento facial.
- Pânico pausa as duas superfícies. Modo endurecido (`events.hardened`) exige liberação do anfitrião antes de exibir.

O classificador roda **no thumb**, fora do `confirm`, disparado em fire-and-forget pelo poll da parede (`classifyMediaAfter`). Não há fornecedor de ML no repositório: o padrão é heurístico (assinatura de arquivo válida → `limpo`). Troca-se o provedor, não o gate. Silêncio grava `sem-resposta` — nunca `limpo`.

A fila de revisão no admin (`/admin/e/[eventId]/moderation`) lista denúncia ofensiva, classificador e pedido de quem aparece na foto. Nada sai do ar sozinho: o anfitrião mantém ou oculta.

O convidado remove a própria mídia pelo token de sessão, sem pedir nada a ninguém.

---

## 10. Telão

```
GET  /wall-display            HTML fullscreen, sem chrome, sem cursor, resistente a reload
GET  /api/wall                página de mídia aprovada para a parede (crachá em cookie)
POST /api/wall/pair           inicia pareamento
GET  /api/wall/pair/status    a TV espera o anfitrião autorizar
POST /api/wall/authorize      o anfitrião autoriza (sessão de host)
PATCH /api/wall/panic         pânico na parede
```

Aliases PT (`/api/parede`, `/telao`, `/parear`) reexportam ou redirecionam; o canônico é inglês.

- A TV **poll** `GET /api/wall` a cada 6 s. Não há SSE (`/api/wall/stream` não existe).
- Cada poll dispara `classifyMediaAfter` em fire-and-forget — fora do caminho do `confirm`.
- **Cache local das últimas 50**: se a rede cair no meio da festa, o telão continua rodando.
- Fallback é continuar com o cache; não há segundo protocolo.
- Presença de marca Albora: **zero**. Só a identidade do evento, lida de `events.identity_tokens`.
- O evento vem do crachá (`wall_tokens`), nunca da URL.

O telão e a moldura de compartilhar (Stories) consomem o **mesmo resolvedor de tokens**. Os modelos de enquadramento sem cortar vertical vivem em `@albora/core`.

---

## 11. Ciclo de vida do armazenamento

```
Dia 0–330   armazenamento padrão
Dia 330     job de export para a nuvem do próprio casal + e-mail de aviso
Dia 365     delete
```

A nuvem do casal **é** a política de retenção: o casal fica com as memórias para sempre, o custo de retenção vai a zero, e ninguém fica bravo. Assinatura mensal para guardar foto de casamento é sequestro emocional — tem churn certo e gera review furioso.

---

## 12. Observabilidade

O funil é instrumentado desde o primeiro commit, porque é ele que responde à única pergunta que importa depois do primeiro casamento:

```
qr_scan → page_open → consent → capture → upload_start → upload_ok
                                            ↓
                                        upload_fail → retry
```

Mais: `share`, `install_prompt`, `install_accept`, `install_dismiss`.

O CTA de instalação do PWA aparece na confirmação da **primeira foto**, só depois do confirm (fila vazia). No Android, `beforeinstallprompt` alimenta o funil `install_*` e o botão nativo. No iOS não há prompt: a confirmação mostra Compartilhar → Adicionar à Tela de Início e dispara `install_prompt` quando o convite fica visível. Já instalado (`display-mode: standalone` ou `navigator.standalone`) não mostra. Dispensa vale a sessão; o CTA de fim de festa fica para quando essa superfície existir.

Dashboard por evento, em `/admin/e/[eventId]/guests`: escaneamentos, sessões, uploads, corte por `via`, participação. **Métrica principal:** `sessões_com_upload / expected_guests`. `qr_scan` só nasce quando `via=qr` (peça impressa); WhatsApp e link copiado entram em `page_open`. A espinha continua cumulativa; o canal mora em `guest_sessions.via`.

Telemetria **nunca** quebra o caminho do request. Envolvida em try/catch que engole e loga.

Logs estruturados, campo fixo, **nunca PII crua** — ids, contagens, durações, códigos de erro.

---

## 13. Segurança e LGPD

- Consentimento **versionado e datado** por sessão, antes de qualquer captura. Recusar não é erro: é escolha legítima, e a saída é com dignidade, sem insistência e sem segunda tentativa disfarçada.
- **EXIF removido no cliente.** Coordenada de GPS em foto de convidado é exposição real.
- **"Onde na festa" nunca é GPS.** É id de lista fechada do pack — pista, mesa, jardim, altar, bar, varanda. Reintroduzir localização pela porta da frente desfaria a remoção de EXIF, e o controle inteiro junto. Há ganho de produto no caminho: o mundo lá fora marca *lugar no mundo*; uma festa precisa de *lugar na festa*, que diz mais sobre a foto e não expõe ninguém.
- **Legenda é conteúdo do convidado e não vai para log.** Ela pode conter o nome de quem está na foto. Caractere de controle sai antes de ela existir no banco, porque legenda vai ao telão e controle projetado numa parede é bug de layout na frente de 150 pessoas.
- Sem login de convidado, portanto nenhum dado pessoal além de nome opcional e — se ele optar — um canal de contato.
- Direito de remoção acessível ao próprio convidado, sem intermediário.
- Aviso claro de que a foto pode aparecer para outros convidados e no telão.
- Retenção cumprida por job, não por promessa.
- Contato é **opt-in explícito**, com data. Memórias automáticas são opt-in, desligáveis em um toque, e o acesso ao acervo nunca é condicionado a receber notificação.

⚠️ **Em aberto:** papel de controlador vs. operador entre o casal e a plataforma. Precisa de advogado antes do primeiro evento real. Ver [Anexo A](#anexo-a--decisões-em-aberto).

### Memórias sensíveis

Casamento acaba. Pessoas se separam. Pessoas morrem — e as fotos estão cheias de avós que não estarão aqui em dez anos. Google e Facebook já se queimaram publicamente empurrando "lembre-se disso!" para gente em luto. Num produto exclusivamente de festa, a exposição é maior. Custa quase nada tratar isso agora; é caríssimo consertar depois, inclusive em reputação, num mercado que roda em boca a boca.

---

## 14. Estrutura do repositório

```
apps/
  web/         Next.js — convidado, admin, telão, landing, rotas de API
               features/  uma pasta por superfície (guest, feed, photo, album, music, admin, wall, …)
               app/       páginas e route handlers; EN canônico, PT reexporta ou redireciona
  mobile/      stub da task 017 — app Expo do convidado, segunda porta, nunca a primeira
packages/
  core/        o que as superfícies compartilham: fila, envio, processamento
               de imagem, presets, validação de mídia, moderação, funil, álbum, share
  db/          schema, migrations, escopo de evento, sessão, suíte de isolamento
  tokens/      resolvedor identity_tokens → valores, compartilhado por todos os renderizadores
  packs/       vocabulário, missões, lugares, identidade por vertical (casamento, 15 anos)
  ui-web/      primitivas da web — o package que o guard de conformidade protege
  ui-native/   casca do app nativo (ainda sem telas)
docs/
  adr/         decisões vinculantes, datadas e imutáveis
  product/     os documentos de produto e branding que originam tudo
  runbooks/    procedimentos operacionais
  specs/       contrato por tarefa, escrito antes do código
tools/
  guards/      os guards bloqueantes (isolamento, tokens, domínio, packs, sessão, features, api-routes)
  db/          migração e seed de desenvolvimento
docker-compose.yml     Postgres local, em porta não padrão de propósito (55432)
.github/workflows/     pipeline única (GitHub, não GitLab — exceção da task 002)
```

**A regra que a árvore expressa:** decisão mora em `core`, desenho mora na superfície. A ordem das operações do processamento de imagem — onde estão os bugs — é testável sem navegador, e o que sobra em cada app é código curto o bastante para caber na cabeça. É também o que permite ao app ter o seu equivalente sem reabrir nenhuma daquelas decisões.

---

## 15. Qualidade — gates escalonados

O rigor cresce com o produto. O que **não** escalona, e roda bloqueante desde o primeiro commit:

1. **Testes de isolamento entre eventos**, em job de CI dedicado e visível. Um refactor não pode apagá-los em silêncio.
2. **Guard de conformidade de tokens.** É regressão da funcionalidade principal (§6).
3. **Guard de disciplina de packs** (`pack → core`, nunca o inverso).
4. **Guard de isolamento estático:** `SET` de sessão, `set_config` com `is_local=false`, lock de sessão. As três formas de vazar evento entre clientes numa pool em modo transação.
5. **Guard de sessão:** token em querystring, credencial em log, PII crua em log.
6. **Guard de domínio:** string de vertical dentro do núcleo.
7. **Guard de features:** `features/` não importa de `@/app/*` (espelha ESLint).
8. **Guard de api-routes:** rotas de convidado resolvem sessão; `event_id` nunca vem do corpo.
9. **Teste de carga antes do primeiro evento real:** 150 uploads em 20 minutos.

Isolamento é testado contra banco real com escopo definido, nunca contra mock — testar isolamento contra mock prova que o mock está isolado. Duas condições dessa suíte não são detalhe:

- **Ela conecta como papel comum, sem `BYPASSRLS`.** Superuser ignora RLS mesmo com `FORCE`; uma suíte conectada como dono do banco passaria enxergando tudo e diria que está tudo certo.
- **Ela roda em job próprio, com nome próprio.** Se o isolamento reprovasse dentro de "testes", a falha apareceria como "testes falharam" — e a diferença entre isso e "um evento leu dado de outro" é a diferença entre um bug e um incidente. Sumir com o job é visível na lista de checks; diluí-lo não é.

O que a suíte prova, além do óbvio: que uma **conexão reciclada** que já serviu outro evento não estoura nem vaza; que o setting não sobrevive entre transações da mesma conexão; que transações concorrentes de eventos diferentes não se enxergam; que um `UPDATE` mal escrito não alcança o outro evento; e que **nenhuma tabela nova escapa da política** — a porta fora da RLS não cresce sem alguém reprovar o CI.

O restante segue a tabela de fases em [`CLAUDE.md`](../CLAUDE.md). Rebaixar um gate para deixar o CI verde é violação não negociável.

---

## 16. O que este documento descreve e ainda não existe

Este documento é a fonte da verdade de **fronteiras**, e uma fronteira vale antes de haver código atrás dela. A distância entre o desenhado e o construído é informação operacional.

### Entregue no caminho do convidado e do anfitrião (não estava na revisão de 2026-08-10)

| Peça | Onde | Estado |
|---|---|---|
| PUT da miniatura | §5 | A fila manda `full` e `thumb`. `webTransport.sendPoster` faz o PUT da thumb |
| Identidade do evento no banco | §6 | `events.identity_tokens` entra no resolvedor (`eventVars`, telão, peças, moldura de share) |
| Moderação + classificador | §9 | Gate fail-closed na parede; fila de revisão no admin; provedor heurístico, sem ML |
| Telão | §10 | `/wall-display` + poll `/api/wall` + cache 50 + pânico |
| Funil | §12 | `funnel_events` + `guest_sessions.via` + painel em `/admin/e/[id]/guests` |
| Peças SVG/PDF | wizard e painel | Download no admin; placa A4 traz até 6 missões do editor (N1.6); falta prova impressa com 3 celulares |
| Recado, música, missões, álbum, share Stories | features correspondentes | No ar. App Expo ainda não |
| Baixar tudo (anfitrião) | spec 016 | Job + reauth por e-mail; ZIP autenticado em stream. Export para Drive continua fora |

### Ainda não construído (bloqueia o 1º evento real ou é Fase B/C)

| Peça | Onde é descrita | Estado |
|---|---|---|
| Prova das peças impressas | spec 009, roadmap A1 | Código gera SVG/PDF; ninguém mediu QR em papel com 3 celulares |
| Retenção por job (D330/D365) | §11 | Não construído |
| App nativo Expo | ADR 0008–0010, spec 017 | `apps/mobile` é stub |
| Classificador com modelo de ML | §9 | Heurística de magic bytes. O **gate** (silêncio → `sem-resposta` → parede segura) já é o produto |
| Produção (Workers + R2 + Neon + Resend) | ADR 0006, roadmap A5 | Roda em localhost |
| Carga 150/20 min contra infra de produção | spec 012 | Ferramenta `pnpm carga` existe; falta a prova |

Uma peça descrita em §5 que **existe** e o texto original não previa: a triagem de vídeo e de HEIC antes de ler o arquivo inteiro. Ela está no diagrama porque é fronteira, não otimização.

Uma consequência operacional que vale registrar: **Service Worker, Background Sync e `crypto.randomUUID` só existem em contexto seguro.** Verificar o caminho do convidado num aparelho de verdade exige HTTPS — em `http://` de rede local o produto falha na hora de enfileirar, e o sintoma não se parece com a causa. O procedimento está em [`runbooks/verificacao-da-captura.md`](./runbooks/verificacao-da-captura.md).

---

## Anexo A — Decisões em aberto

| # | Questão | Bloqueia | Dono |
|---|---|---|---|
| 1 | Controlador vs. operador de dados | Primeiro evento real | Advogado |
| 2 | Registro INPI (classes 9 e 42), `registro.br`, handles | Identidade visual e material impresso | Fundador |
| 3 | Modelo de comissão do fornecedor: % ou licença fixa | Split de pagamento (Fase 3) | Fundador |
| 4 | Catálogo de fontes licenciadas para impressão | Papelaria | Design |
| 5 | Nome ofensivo de convidado indo ao telão | Primeiro evento com telão | Produto — ver `flows.md` §12 |

> Resolvido desde a última revisão: **runtime e stack** (item 1 da versão anterior), fechado por [ADR 0005](./adr/0005-runtime-stack.md) e [ADR 0006](./adr/0006-hosting-platform.md).

---

## Anexo B — Changelog deste documento

| Data | Mudança |
|---|---|
| 2026-08-09 | Versão inicial. Fronteiras, invariantes e caminhos críticos derivados dos documentos de produto; boas práticas de disciplina herdadas do Nereus, calibradas para a escala do Albora. |
| 2026-08-10 | Revisão contra o código das tasks 003 a 006. **Correções:** o `NULLIF` na política de RLS (§3), sem o qual a política falha de dois jeitos diferentes na mesma pool; as duas tabelas fora da RLS, que o modelo de dados não listava (§3, §8); `confirm` não confere dimensões, confere assinatura de arquivo (§5); o preset é paramétrico com uma passagem por pixel, não uma tabela de cor (§6); estrutura do repositório e pipeline no GitHub (§14). **Acrescentado:** as duas portas da legenda e por que o confirm não a espera (§5), conjuntos fechados vindos do pack (§7), rate limit em duas camadas (§4), o que a suíte de isolamento de fato prova (§15), e §16 com o que está descrito e ainda não construído. |
| 2026-08-15 | Revisão contra o código da PR #2. **Correções:** `expected_guests` existe (migration 0020), não “entra com o admin”; telão é poll de `GET /api/wall`, não SSE; PUT da thumb e `identity_tokens` do banco estão no caminho; classificador fail-closed na parede; dois packs no catálogo. **Acrescentado:** `via` na sessão, recado, música, comentários, mapa de rotas no índice. Áudio do recado: presign R2 em `events/{id}/recado/...`, leitura assinada no GET do convidado. Baixar tudo do anfitrião: `export_jobs` + step-up, ZIP em stream. |
| 2026-08-15 | `events.timezone` IANA (migration 0026). Default `America/Sao_Paulo`; ancora `taken_at`, capítulos do álbum e a faixa 5h–7h. |
| 2026-08-16 | Pedido “sou eu nessa foto” (`reports.kind`): entra na fila, não segura o telão, anfitrião decide. Sem reconhecimento facial. |
