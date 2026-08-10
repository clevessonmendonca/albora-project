# Albora — Arquitetura

> **Status:** fundação. Runtime ainda não fixado ([ADR 0005](./adr/0005-runtime-stack.md) está em `Proposed`).
> **Origem:** [`product/albora-produto-arquitetura.md`](./product/albora-produto-arquitetura.md) e [`product/albora-branding-marketing.md`](./product/albora-branding-marketing.md).
> **Última revisão:** 2026-08-09

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

---

## 3. Fronteira de isolamento: o evento

> Decisão vinculante: [ADR 0002](./adr/0002-event-as-tenancy-boundary.md).

O Nereus isola por **tenant** (dezenas de organizações, cada uma enorme e permanente). O Albora isola por **evento** (milhares, cada um pequeno e com vida de 12 meses). A cardinalidade invertida muda o desenho: não há realm por evento, não há schema por evento, não há infra provisionada por evento. Há uma coluna e uma política.

### O invariante

1. Toda tabela com dado de evento tem `event_id` UUID NOT NULL.
2. RLS **FORÇADO** (`FORCE ROW LEVEL SECURITY`), política filtrando por `event_id = current_setting('app.event_id', true)::uuid`.
3. Toda transação define `SET LOCAL app.event_id`. Nunca `SET`.
4. Chaves de storage são `events/{event_id}/...`, derivadas no servidor.

O terceiro argumento `true` em `current_setting` retorna NULL em vez de erro quando o setting falta — a política então não casa com nada e o sistema **falha fechado**.

### O segundo escopo

Duas leituras cruzam eventos por natureza: o dashboard do fornecedor ("meus 40 eventos") e a observabilidade da plataforma. Elas não passam por RLS — usam papel dedicado com `BYPASSRLS`, restrito a caminhos de agregação, **auditado por chamada**. Nunca se resolve isso relaxando a política.

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

**Rate limit por sessão e por IP acontece antes de qualquer trabalho caro**, inclusive antes de emitir presigned URL. É o portão, não a saída.

---

## 5. Pipeline de upload — o caminho crítico

É aqui que o produto se decide. Se este caminho falhar num sábado à noite, nada mais importa.

```
[Cliente]
  1. Service Worker registrado no primeiro acesso
  2. Captura (câmera nativa via input capture, ou getUserMedia)
  3. Processamento local:
       ├─ redimensiona (2500px grátis / 3500px pago — requisito do livro a 300dpi)
       ├─ reencode JPEG
       ├─ REMOVE EXIF                    ← LGPD, não otimização
       └─ gera thumb
  4. Enfileira em IndexedDB              ← a fila é a fonte da verdade, não a memória
  5. POST /api/uploads/presign  →  2 URLs presigned (full + thumb)
                                    chaves derivadas do event_id da SESSÃO
  6. PUT direto no object storage        ← o servidor nunca vê os bytes
  7. POST /api/uploads/confirm  →  valida, persiste, publica
  8. Retry com backoff; Background Sync onde disponível
```

### Os cinco pontos que decidem se funciona

1. **Compressão antes do upload** corta o payload em 5–10×. Sem isso, 4G ruim significa upload falhado significa participação zero.
2. **A fila em IndexedDB é a fonte da verdade.** O convidado troca de app, o browser suspende a aba, o sinal cai. O que está na fila sobe depois; o que está só em memória morre.
3. **Thumbnail gerado no cliente** economiza função serverless e faz o telão ficar instantâneo.
4. **`confirm` valida, não confia.** Verifica que o objeto existe (HEAD), que a chave pertence ao evento da sessão e que as dimensões batem. Sem isso o cliente pode confirmar upload que nunca aconteceu, ou apontar para objeto de outro evento.
5. **`confirm` é idempotente.** Retry é o caminho normal, não a exceção — a mesma confirmação chegando duas vezes não pode gerar duas linhas.

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
 (web/PWA)   (4 tipos) (placa,  (LUT sobre  (story 9:16,
                       cards,    a foto)     colagem)
                       livro)
```

**Cinco renderizadores, um resolvedor.** O modelo de telão e a moldura de compartilhamento são artefatos de identidade como qualquer outro — o casal escolhe o layout do telão do mesmo jeito que escolhe a paleta, e a moldura do story carrega monograma, nomes e data resolvidos da mesma fonte.

**A regra que faz isso funcionar:** nenhum componente conhece um valor concreto. Sem hex, sem nome de fonte, sem raio literal — tudo é referência a token. Um hex hardcodado num componente é, literalmente, um lugar onde a identidade do casal não propaga.

### O preset é LUT, não IA

O quarto renderizador — o preset aplicado à foto — segue a mesma lógica: uma tabela de cor executada em canvas no cliente. Decisão vinculante em [ADR 0007](./adr/0007-ai-policy-luts-not-generation.md).

Três razões, e a segunda é a que decide:

1. **Offline.** A fila é a fonte da verdade do upload e não pode depender de rede para aplicar um preset.
2. **Coerência.** IA generativa interpreta cada foto de um jeito. Em 3.000 fotos, o álbum deixaria de parecer um rolo de filme — quebrando exatamente o que a propagação de identidade existe para garantir.
3. **Custo.** R$ 0 contra ~R$ 50 por evento na opção mais barata do mercado, sobre um ticket de R$ 199.

IA generativa **nunca** toca a mídia do convidado. IA de classificação — moderação e curadoria do livro — é bem-vinda fora do caminho crítico, e é onde a mágica de fato está.

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

No MVP o sistema existe e o catálogo tem **um** item: casamento. Isso custa ~zero agora; retrofitar custa semanas, e a conta chega exatamente quando você estiver ocupado vendendo.

> A regra que protege a decisão: **a experiência de casamento nunca piora para acomodar outro vertical.** Se um pack novo exigir tirar especificidade do casamento, o problema está no desenho de packs — não no casamento.

---

## 8. Modelo de dados

Nomes genéricos desde o commit 1. Nunca `couple_names`, `wedding_date`, `bride`, `groom`.

```
accounts ──┐
           ├──< events >──┬──< challenges
vendors ───┘              ├──< guest_sessions >──┬──< uploads >──< reactions
                          │                      └──< guest_contacts
                          ├──< funnel_events
                          └──> packs
```

| Tabela | Papel | Nota de isolamento |
|---|---|---|
| `accounts` | 1 conta → N eventos (casamento, chá de bebê, bodas) | Fora do escopo de evento |
| `vendors` | Parceiro B2B2C, tokens de marca própria | Fora do escopo de evento |
| `packs` | Vocabulário, missões padrão, templates, identidade padrão, **lista de lugares** | Global, versionado |
| `events` | Raiz do escopo. `identity_tokens`, `pack_id`, `plan`, `expected_guests`, `retention_until` | **É a fronteira** |
| `challenges` | Missões do evento | `event_id`, RLS |
| `guest_sessions` | Sessão anônima + consentimento versionado e datado | `event_id`, RLS |
| `guest_contacts` | Opt-in explícito de contato — base do loop viral | `event_id`, RLS, **PII** |
| `uploads` | Mídia, status de moderação, legenda e lugar (ambos opcionais) | `event_id`, RLS |
| `reactions` | Reação única e anônima | `event_id`, RLS |
| `funnel_events` | Instrumentação do funil, desde o commit 1 | `event_id`, RLS |

`expected_guests` é o denominador da métrica que decide o negócio. Sem ele instrumentado desde o começo, o casamento termina e não se sabe onde a participação foi perdida.

---

## 9. Moderação

Com feed e reações, moderação deixa de ser feature e vira **requisito** — o produto passa a difundir imagem de terceiros, não só coletar.

| Modo | Comportamento |
|---|---|
| `open` | Auto-aprova; anfitrião oculta depois |
| `queue` | Fila de aprovação. Padrão quando há telão |
| `telao_only` | Galeria livre, telão moderado |

O classificador roda **no thumb** (barato) antes de liberar para o telão. Ele é enriquecimento: se cair, a mídia vai para fila manual — nunca para o telão sem passar por alguém.

O convidado remove a própria mídia pelo token de sessão, sem pedir nada a ninguém.

---

## 10. Telão

```
GET  /telao/{slug}            HTML fullscreen, sem chrome, sem cursor, resistente a reload
GET  /api/telao/{slug}/stream stream de IDs recém-aprovados (SSE)
```

- Pré-carrega as próximas N imagens.
- **Cache local das últimas 50**: se a rede cair no meio da festa, o telão continua rodando. Esta é a única coisa no salão que todo mundo está olhando.
- Fallback para polling se o stream falhar.
- Presença de marca Albora: **zero**. Só a identidade do evento.

O telão e os stories pós-evento são a **mesma pipeline de render**, duas superfícies.

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

Dashboard por evento: escaneamentos, sessões, uploads, taxa de retry, falhas, tempo médio de upload. **Métrica principal:** `sessões_com_upload / expected_guests`.

Telemetria **nunca** quebra o caminho do request. Envolvida em try/catch que engole e loga.

Logs estruturados, campo fixo, **nunca PII crua** — ids, contagens, durações, códigos de erro.

---

## 13. Segurança e LGPD

- Consentimento **versionado e datado** por sessão, antes de qualquer captura.
- **EXIF removido no cliente.** Coordenada de GPS em foto de convidado é exposição real.
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
apps/          superfícies (nomes definitivos dependem do ADR 0005)
packages/
  ui/          tokens + primitivas — o package que o guard de conformidade protege
  tokens/      resolvedor identity_tokens → valores, compartilhado por todos os renderizadores
  packs/       vocabulário, missões, templates por vertical
docs/
  adr/         decisões vinculantes, datadas e imutáveis
  product/     os documentos de produto e branding que originam tudo
  runbooks/    procedimentos operacionais
  specs/       contrato por tarefa, escrito antes do código
infra/         compose, manifests, init de banco
scripts/       bootstrap, seed, utilitários
.gitlab-ci.yml pipeline única
```

---

## 15. Qualidade — gates escalonados

O rigor cresce com o produto. O que **não** escalona, e roda bloqueante desde o primeiro commit:

1. **Testes de isolamento entre eventos**, em job de CI dedicado e visível. Um refactor não pode apagá-los em silêncio.
2. **Guard de conformidade de tokens.** É regressão da funcionalidade principal (§6).
3. **Guard de disciplina de packs** (`pack → core`, nunca o inverso).
4. **Teste de carga antes do primeiro evento real:** 150 uploads em 20 minutos.

Isolamento é testado contra banco real com escopo definido, nunca contra mock — prova-se que o evento A não lê o B mesmo com id mal configurado.

O restante segue a tabela de fases em [`CLAUDE.md`](../CLAUDE.md). Rebaixar um gate para deixar o CI verde é violação não negociável.

---

## Anexo A — Decisões em aberto

| # | Questão | Bloqueia | Dono |
|---|---|---|---|
| 1 | **Runtime e stack** — TypeScript ponta a ponta vs. backend separado | Layout de `apps/`, ORM, ferramenta de migration | [ADR 0005](./adr/0005-runtime-stack.md) — decidir após o trabalho de design |
| 2 | Controlador vs. operador de dados | Primeiro evento real | Advogado |
| 3 | Registro INPI (classes 9 e 42), `registro.br`, handles | Identidade visual e material impresso | Fundador |
| 4 | Modelo de comissão do fornecedor: % ou licença fixa | Split de pagamento (Fase 3) | Fundador |
| 5 | Catálogo de fontes licenciadas para impressão | Papelaria | Design |

---

## Anexo B — Changelog deste documento

| Data | Mudança |
|---|---|
| 2026-08-09 | Versão inicial. Fronteiras, invariantes e caminhos críticos derivados dos documentos de produto; boas práticas de disciplina herdadas do Nereus, calibradas para a escala do Albora. |
