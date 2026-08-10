# Albora
## Documento de Produto, Estratégia e Arquitetura

> **Status:** rascunho de fundação — consolidação das decisões tomadas até aqui
> **Nome do produto:** **Albora** (definido — pendente de busca no INPI, ver §13.11)
> **Última revisão:** agosto/2026

---

## 1. Sumário executivo

Produto **web (sem download para o convidado)** que coleta, organiza e devolve as fotos tiradas pelos convidados durante um casamento, usando **desafios fotográficos** para aumentar a participação e **identidade visual do evento** para dar coerência estética ao resultado.

**A tese:** o fotógrafo profissional cobre o oficial; ninguém cobre o espontâneo. Existem 100–200 câmeras na festa e o material delas se perde em 200 rolos diferentes.

**A cunha (wedge):** produto **brasileiro**, **sem download**, **nativo de casamento**, **vendido pelo cerimonialista**. A categoria "álbum compartilhado" já existe e está povoada — a combinação acima, não.

**A hipótese que decide tudo:** ≥ 40% dos convidados presentes enviam ao menos 1 foto. Se falhar, nada mais importa.

---

## 2. Análise de mercado

### 2.1 Tamanho (Brasil)

| Métrica | Valor | Fonte |
|---|---|---|
| Movimentação anual | R$ 32 bilhões (2026) | Casar.com / Assessoria VIP |
| Cerimônias com festa | ~472 mil/ano | Casar.com |
| Ticket médio por festa | R$ 69 mil | Casar.com |
| Casamentos civis | ~931 mil/ano | ABRAFESTA |

> ⚠️ **Casamento civil ≠ festa com convidados.** O SAM real (festa + convidados + orçamento) fica entre **150–250 mil eventos/ano**.

**Cenário conservador:** ticket de R$ 200 × 1% de share ≈ **R$ 400 mil/ano de receita bruta.**
Negócio pequeno-médio lucrativo. **Não é venture-scale sozinho** — isso deve calibrar quanto tempo e capital investir.

### 2.2 Concorrência

**Internacional (commodity, US$ 29–49 por evento):**
POV, Kululu, Wedbox, Wedibox, Guestpix, GuestCam, Fotify, WedUploader, PixelParty, Eversnap, Gather Shot, Pix Wedding, Easy Wedding Album, The Knot Live, Joy.

**Brasil (direto):**

| Player | O que faz | Fraqueza |
|---|---|---|
| **Olhares** | Slideshow ao vivo, cards de desafio, templates para imprimir, sem download | Concorrente mais próximo do escopo |
| **Meu Casar** | Álbum colaborativo via QR/URL, sem app | Genérico |
| **Lejour Capture** | Galeria de fotos dos convidados (Grupo Fast Shop) | Feature de plataforma maior |
| **Dots. Memories** | App de memórias com forte tração via TikTok (PT/ES) | **Exige download, iOS-first, genérico** |

**Incumbentes por adjacência (o risco real):**

- **iCasei** — 18 anos, 150+ recursos, 200+ layouts, identidade visual completa (site + save the date + convite combinando), editor de convites gratuito, papelaria em PDF, RSVP por WhatsApp, álbum de fotos com filtros e integração Instagram. **Monetiza tarifa sobre lista de presentes a partir de 3,69%** — por isso tudo o resto é de graça.
- **Casar.com** — 300 mil sites, 3,5 milhões de usuários na lista de presentes.
- **Casamentos.com.br** (The Knot Worldwide), **Zankyou**.

**Substitutos gratuitos:** Google Fotos, iCloud Shared Album, grupo de WhatsApp.

### 2.3 Conclusões estratégicas

1. **Não competir em site / convite / RSVP / lista de presentes.** São grátis porque financiados pela lista de presentes. Sem virar fintech, não há como competir com grátis.
2. **Não competir em armazenamento.** Concorrente já promete "ilimitado grátis". Perde-se essa briga.
3. **Não construir editor de canvas.** É competir com o Canva na competência central do Canva, com custo de anos-pessoa.
4. **Não construir comunidade.** Cold start + rotatividade total da população a cada 12 meses = pior tipo de comunidade possível.
5. **A fronteira aberta:** ninguém propaga a identidade visual do casamento **até o dia da festa** — placa, cards, preset das fotos, telão e álbum final. O iCasei para no convite.

---

## 3. Posicionamento

> **"A identidade visual do seu casamento, do save the date ao álbum — e todas as fotos que os seus convidados tiraram, em um lugar só."**

### 3.1 Diferenciação vs. cada concorrente

| Eixo | Concorrentes | Nós |
|---|---|---|
| Acesso do convidado | App / download | **Web pura, zero download** |
| Escopo | Álbum genérico | **Nativo de casamento** |
| Estética | Sem controle | **Identidade propagada (tokens)** |
| Localização | Traduzido | **WhatsApp, Pix, impressão, LGPD** |
| Canal | B2C pago | **B2B2C via cerimonialista** |
| Retenção | Refém de assinatura | **Export para a nuvem do casal** |

### 3.2 O conceito de identidade como tokens

```
identity tokens (paleta, tipografia, monograma, motivo)
  │
  ├─ [ocupado pelo iCasei — expansão só na Fase 4, ver §8]
  │   ├─ save the date
  │   ├─ convite
  │   └─ site
  │
  └─ [território de ninguém — nosso]
      ├─ placa / QR de mesa
      ├─ cards de desafio
      ├─ preset aplicado às fotos
      ├─ layout do telão
      └─ álbum final / papelaria impressa
```

É propagação de design tokens e theming — exatamente o problema que já se resolve em Liferay/Client Extensions. **Essa é a vantagem injusta técnica.**

### 3.3 Estratégia de verticais

> **Núcleo genérico. Superfície especializada. Marketing vertical.**

A tensão: o diferencial contra o Dots. Memories é ser **nativo de casamento** enquanto ele é genérico. Virar genérico = virar ele.

A resolução não é escolher um lado, é separar as camadas:

| Camada | Natureza |
|---|---|
| **Núcleo** | Genérico. Não sabe que existe casamento. Conhece `event`, `host`, `guest`, `challenge`, `upload` |
| **Pack** | Especializado. Vocabulário, desafios, templates, presets, tom |
| **Marketing** | Vertical. Uma porta por segmento, com prova social própria |

**O erro a evitar:** um produto "de eventos" que fala *organizador*, *participante*, *seu evento*. Morno, não emociona, não vende. O Dots. Memories é marketing de casamento colado num produto genérico — a pessoa chega e não sente que é pra ela.

#### Portas de entrada

```
/            → casamento (herói, ICP único, prova social de casamento)
/15-anos     → só quando provar demanda
/formatura   → só quando provar demanda
```

**Não diluir a home em "eventos em geral".** Cada vertical só ganha porta própria com landing, prova social e SEO próprios. Até lá: existe no produto, não existe no marketing.

#### Ordem dos verticais

| # | Vertical | Racional |
|---|---|---|
| 1 | **Casamento** | Herói. Ticket alto, carga emocional máxima, canal de fornecedor forte |
| 2 | **15 anos** | Estrutura **idêntica** e **mesmo canal de fornecedor**. Reuso ~100%, CAC ≈ zero |
| 3 | **Formatura** | Alta em jan–mar, que é o **vale do casamento** → preenche sazonalidade. Contra: venda B2B via comissão |
| 4 | **Corporativo** | Menos sensível a preço; exige moderação rígida e branding da empresa |
| 5 | **Aniversário / infantil** | Volume alto, ticket baixo, sem canal organizado. Serve ao grátis e ao loop viral |
| 6 | **Bodas, batizado, chá de bebê** | Cauda longa. Vem de graça pelo multi-evento (§4.6) |

#### A regra que protege a decisão

> **A experiência de casamento nunca pode piorar para acomodar outro vertical.**

Se um pack novo exigir tirar especificidade do casamento, o problema está no desenho do sistema de packs — não no casamento. **Genérico é o núcleo, nunca a experiência.**

#### Consequência comercial

O fornecedor é multi-evento por natureza: um espaço faz casamento, 15 anos e confraternização; um fotógrafo idem. Na venda para o canal, *"serve pros seus outros eventos também"* **aumenta o valor da assinatura a custo zero** — o pack já existe. Fortalece exatamente o lado do negócio que tem MRR.

---

## 4. O produto moldado

### 4.1 Três superfícies

| Superfície | Usuário | Plataforma |
|---|---|---|
| **Admin** | Noivos (2 pessoas) | Web responsivo |
| **Convidado** | 100–200 pessoas, 1 dia | **PWA, sem login, sem download** |
| **Telão** | Projetor/TV do salão | URL fullscreen |

### 4.2 Fluxo do convidado (o caminho crítico)

```
Escaneia QR
  → Consentimento LGPD (1 tela, 1 checkbox)
  → Nome (opcional, sem login)
  → Lista de desafios
  → Captura (câmera ou rolo)
  → Preset opcional
  → Upload (fila offline + retry)
  → Confirmação + progresso ("6 de 10")
  → **CTA de instalação** ("instale e receba suas fotos depois")
  → [opcional] Compartilhar no Instagram com moldura da identidade
```

**Meta:** ≤ 4 toques entre escanear o QR e a primeira foto subir.
**Regra:** o CTA de instalação vem **depois** do primeiro upload, nunca antes (§4.5).

### 4.3 Escopo do MVP

**ENTRA:**
- Admin: criar evento, escolher 8–12 desafios, gerar QR + PDF de impressão (placa A4 + cards de mesa), moderar, baixar ZIP
- Convidado: fluxo completo acima, 3 presets, fila offline
- Telão: URL fullscreen, autoplay, só aprovadas
- Compartilhar no Instagram via `navigator.share()` com moldura da identidade
- Reação única e anônima (❤️)
- Pós-evento: galeria permanente + ZIP

**FICA DE FORA:**
App nativo · login de convidado · vídeo · save the date · site · convite · canvas · IA generativa · reconhecimento facial · comunidade · WhatsApp API · Google Drive · Canva · split de pagamento · checkout · comentários · multi-idioma

**Pagamento no MVP:** Pix manual. Não construir checkout para os 10 primeiros eventos.

### 4.4 Decisões de produto contraintuitivas

**Engajamento é anti-objetivo.**
Métrica de app social = tempo em tela. Métrica de produto de casamento = o oposto. Se os convidados passarem a festa rolando feed, a noiva odeia o produto.

- **Durante o evento:** interface de captura. Sem scroll infinito, sem notificação.
- **Depois do evento:** aí sim, stories e feed completos.

**Sem comentários.** Comentário em foto de casamento é drama familiar garantido e fila de moderação infinita.

**Stories como formato de consumo, não de vaidade.** Resolve o problema real: 2.000 fotos numa grade é inutilizável. Cada desafio vira um ring. E o **telão é o mesmo reel em autoplay** — uma pipeline de render, duas superfícies.

### 4.5 Estratégia de plataforma

**O app é a experiência completa. A web é a rampa de entrada.**

O convidado nunca é bloqueado por uma loja de aplicativos, mas é ativamente convidado a instalar — porque é no app que mora o produto inteiro: stories, reações, feed, notificação de fotos novas e acesso permanente ao álbum.

| Superfície | Usuários | Frequência | Plataforma |
|---|---|---|---|
| Convidado | 100–200 | Festa + pós-evento | **App promovido, web como entrada** |
| Noivos / anfitrião | 2 | 12 meses seguidos | **App** |
| Fornecedor | 1 | Toda semana | Web dashboard |

#### Divisão de capacidades

| | Web (entrada) | App (completo) |
|---|---|---|
| Capturar e enviar | ✅ | ✅ |
| Ver o álbum | ✅ | ✅ |
| Stories e reações | ✅ | ✅ |
| Notificação de fotos novas | ❌ | ✅ |
| Acesso permanente e multi-evento | ❌ | ✅ |
| Receber "suas fotos" (§4.6) | por link | ✅ nativo |

> ⚙️ **Nota técnica:** stories, reações e feed funcionam em PWA — não são exclusivos de nativo. O que o app realmente destrava é **push, permanência e presença na loja**. A comunicação deve prometer isso, não capacidades que a web já tem.

#### A regra única

```
✅ QR → captura → upload OK → CTA de instalação
❌ QR → loja de aplicativos → download → captura
```

**A primeira foto nunca passa por uma loja.** É a única linha dura, e o motivo é aritmético: H1 (≥40% de participação) decide se o negócio existe, e cada tela antes da câmera derruba esse número.

Depois do primeiro upload, o convidado já teve valor e o convite deixa de ser pedágio: vira oferta. É o padrão de Instagram e TikTok — valor primeiro, instalação depois.

#### Pontos de CTA

| Momento | Mensagem |
|---|---|
| Entrada (discreto) | "Instale para não perder nada" |
| **Após 1º upload (principal)** | "Instale e receba suas fotos depois da festa" |
| Fim da festa | "Suas fotos ficam salvas — instale para acessar sempre" |
| Pós-evento (link/WhatsApp) | "Veja o álbum completo no app" |

> A oferta é sempre **"receba suas fotos"**, nunca **"veja os stories agora"** — o CTA não pode competir com a festa (§4.4).

#### Captura

| Abordagem | Qualidade | Preset ao vivo |
|---|---|---|
| `<input type="file" accept="image/*" capture>` | **Máxima** (câmera nativa: HDR, modo noturno) | ❌ aplica depois |
| `getUserMedia` | Menor | ✅ preview ao vivo |
| App nativo | Máxima | ✅ |

#### Sequência de entrega

```
MVP      → web + PWA instalável, com CTA de instalação em todos os pontos
Fase 2   → app nativo (convidado e anfitrião): push, loja, multi-evento
Sempre   → web nunca bloqueada; app nunca obrigatório para a 1ª foto
```

⚠️ **Realidade de prazo:** app nativo não cabe nas 6 semanas do MVP junto com o resto. O **PWA instalável** entrega ícone na tela inicial, janela standalone e — no Android e no iOS 16.4+ instalado — push. Para o convidado é indistinguível de app. O nativo entra na Fase 2 para loja e paridade no iOS.

#### Experimento nos 3 primeiros casamentos (§9)

| Casamento | Variante |
|---|---|
| 1 | CTA principal **após** o primeiro upload |
| 2 | CTA principal **na entrada** |
| 3 | A variante vencedora, para confirmar |

Medir as duas juntas: **participação** (≥1 mídia ÷ presentes) e **instalação** (instalaram ÷ presentes). Se a variante de entrada mantiver participação e instalar mais, ela vence e vira padrão.

### 4.6 Ciclo pós-evento e retenção

**A métrica certa não é "app instalado". É permissão de contato no momento certo.**

O momento que importa não é amanhã — é daqui a 18 meses, quando um dos 150 convidados fica noivo. E o canal para chegar nele nesse dia é WhatsApp ou e-mail, não um app instalado há um ano e meio.

#### A assimetria que muda tudo

| Quem | Valor comercial de reter |
|---|---|
| **Os noivos** | Quase zero — não vão casar de novo |
| **Os 150 convidados** | **É o negócio inteiro** |

Retenção do casal é boca a boca. Retenção do convidado é pipeline de vendas.

#### Por que TBT genérico não funciona

Foto de casamento é **ativo morto**: não muda, não tem informação nova. Notificação semanal sobre acervo estático vira ruído em três semanas — competindo com o Google Fotos, que já faz "memórias" de graça com a vida inteira da pessoa.

> **Um toque bom por ano vence cinquenta medianos.**

#### A resposta forte: o próximo evento

Quem casou terá chá de bebê em 2 anos, aniversário de 1 ano do filho em 3; os pais fazem bodas; o irmão se forma.

O produto deixa de ser *"app do meu casamento"* (que acabou) e vira **"o app dos eventos da nossa família"**. Retenção honesta: a pessoa volta porque **precisa**, não porque foi cutucada. Conecta diretamente com a estratégia de verticais (§3.3) — uma decisão resolve dois problemas.

Bônus: a identidade visual **persiste e evolui** — o chá de bebê herda a paleta do casamento.

#### Ideias ranqueadas

| # | Ideia | Por quê |
|---|---|---|
| 1 | **"Suas fotos" por convidado** (agrupamento facial → WhatsApp) | É presente, não marketing. Abre relacionamento com as 150 pessoas certas. **Maior ROI** |
| 2 | **Aniversário de 1 ano** — retrospectiva curada + oferta de álbum | Data real, carga emocional real, momento comercial natural. Repete sem cansar |
| 3 | **Álbum físico** | Galeria digital decai; livro na estante não. Correção do LTV |
| 4 | **Multi-evento na mesma conta** | O que de fato sustenta o app instalado |
| 5 | **Stories arquivados por desafio** | Consumo pós-evento |
| 6 | **"Reviver a festa"** — telão em replay cronológico | Barato: o render já existe |

**Não fazer:** notificação semanal de TBT · streaks · gamificação de acesso · feed social permanente. É engajamento farmado, e vale a mesma regra da §4.4.

#### Memórias sensíveis — regra de produto

Casamento acaba. Pessoas se separam. Pessoas morrem — e as fotos estão cheias de pais, avós e amigos que não estarão aqui em 10 anos. Google e Facebook já se queimaram publicamente empurrando *"lembre-se disso!"* para gente em luto ou pós-divórcio. Num produto exclusivamente de casamento, a exposição é maior.

- Memórias automáticas **opt-in**, nunca opt-out
- Desligar em **um toque**, sem fricção e sem tentativa de retenção
- Nunca condicionar acesso ao acervo a receber notificação
- Excluir conta = excluir de verdade, e rápido

Custa quase nada agora; é caríssimo de consertar depois — inclusive em reputação, num mercado que roda em boca a boca de grupo de noiva.

---

## 5. Modelo de negócio

### 5.1 Economia unitária (a premissa corrigida)

Evento típico, só foto, com compressão client-side:

| Item | Cálculo |
|---|---|
| Volume | 1.500 fotos × ~800 KB ≈ **1,2 GB** |
| Armazenamento (R2 Standard $0,015/GB-mês) | **~R$ 0,10/mês** |
| 12 meses guardado | **~R$ 1,20** |
| Egress (ZIP, telão, galeria) | **R$ 0** (R2 tem egress zero) |
| Operações (~3.000 Class A) | ~R$ 0,08 |
| **Custo marginal por evento/ano** | **< R$ 3** |

Franquia permanente do R2: 10 GB, 1M Class A, 10M Class B por mês → **os primeiros ~8 eventos são gratuitos.**

**Preço R$ 199 → margem ~98%.**

> 💡 **Armazenar foto não é caro.** Era caro no S3, onde egress custa $0,09/GB e cada ZIP baixado vira dinheiro. No R2 esse custo não existe.
>
> ⚠️ **O que é caro é vídeo.** 30s em 1080p ≈ 30–50 MB. Cem convidados × 2 vídeos = 6–10 GB por evento (5–8× tudo o resto). **Vídeo é a variável de custo, e por isso é o gate natural do plano pago.**

### 5.2 Planos

| | **Grátis** | **Celebração — R$ 199 único** | **Fornecedor — R$ 149/mês** |
|---|---|---|---|
| Convidados | ∞ | ∞ | ∞ |
| Fotos | ∞ | ∞ | ∞ |
| Desafios | ✅ | ✅ | ✅ |
| Galeria e stories | ✅ | ✅ | ✅ |
| Resolução | Reduzida (1600px) | **Original** | Original |
| Download ZIP | ❌ | ✅ | ✅ |
| Telão ao vivo | ❌ | ✅ | ✅ |
| Vídeo | ❌ | ✅ | ✅ |
| Retenção | 30 dias | 12 meses + export p/ Drive | 12 meses |
| Identidade / preset | 3 filtros | Personalizada | White-label |
| Eventos | 1 | 1 | Ilimitados |

### 5.3 Regras invioláveis de precificação

1. **Nunca limitar convidados.** Convidado não é custo, é canal de distribuição. E limite que estoura durante a festa é catástrofe de reputação.
2. **Nunca surpreender com paywall depois do evento.** O casal decide **antes de imprimir o QR**.
3. **Nunca segurar a memória como refém.** Assinatura mensal para guardar foto de casamento é sequestro emocional, tem churn certo e gera review furioso.
4. **O convidado nunca vê fricção comercial.** Todo gate acontece no admin do casal.
5. **Assinatura mensal só para fornecedor** — o único com uso recorrente e razão econômica.

### 5.4 A solução do arquivo

No mês 11, exportar tudo para o **Google Drive do próprio casal**. Depois, deletar no mês 12.

- Casal fica com as memórias para sempre
- Custo de retenção → zero
- Ninguém fica bravo

**A nuvem do casal é a política de retenção.**

### 5.5 Upsells (onde mora a margem)

- **Livro de fotos** — export print-ready e impressão via parceiro (§14). **Principal correção do LTV**
- Papelaria impressa (print-on-demand)
- Entrega individual por WhatsApp ("suas fotos do casamento")
- Vídeo highlight
- Extensão de retenção — **apenas como conveniência opcional, nunca como refém**

---

## 6. Arquitetura técnica

### 6.1 Stack

| Camada | Escolha | Racional |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | SSR para o telão, deploy trivial, domínio conhecido |
| DB | **Postgres** (Neon/Supabase) | Serverless driver resolve pooling em burst |
| ORM | Drizzle | Migrations versionadas, leve |
| Storage | **Cloudflare R2** | **Egress zero** — decisivo para ZIP e telão |
| Realtime | **SSE** | Mais simples que WS; unidirecional resolve o caso |
| Preset | Canvas 2D + LUT | WebGL só se a qualidade incomodar |
| Fila offline | IndexedDB + Service Worker | Background Sync onde disponível |
| Render de peças | SVG → PDF (Satori/resvg ou Puppeteer) | Controle de bleed/DPI para gráfica |
| E-mail | Resend/SES | — |
| Erros | Sentry | — |

> **Regra:** nenhum terceiro no caminho crítico de sábado às 20h. Toda integração degrada, nunca falha.

### 6.2 Modelo de dados

```sql
events (
  id, slug,
  account_id,              -- FK → accounts (1 conta → N eventos)
  title,                   -- "Ana & João" | "Beatriz 15 anos"
  subtitle,
  event_date,
  event_type,              -- wedding | quince | graduation | corporate | party
  pack_id,                 -- FK → packs (vocabulário, desafios, templates)
  cover_url,
  plan,                    -- free | celebration | vendor
  vendor_id,               -- FK opcional (B2B2C)
  moderation_mode,         -- open | queue | telao_only
  identity_tokens JSONB,   -- paleta, fontes, monograma
  expected_guests,         -- denominador da métrica principal
  retention_until, status, created_at
)

packs (
  id, event_type, locale,
  vocabulary JSONB,        -- host_label, guest_label, títulos, tom
  default_challenges JSONB,
  templates JSONB,         -- placa, cards, convite
  default_identity JSONB
)

accounts (
  id, email, phone,
  -- 1 conta → N eventos (casamento, chá de bebê, bodas...)
  created_at
)
```

> ⚠️ **Nomear genérico desde o commit 1 custa zero; retrofitar custa semanas.**
> Nunca usar `couple_names`, `wedding_date`, `bride`, `groom` no schema nem strings de casamento hardcoded no JSX. O núcleo não sabe que existe casamento (§3.3).

```sql
challenges (
  id, event_id, title, description, order, is_custom
)

guest_sessions (
  id, event_id, display_name, consent_version,
  consent_at, user_agent, created_at
)

guest_contacts (
  id, session_id, event_id,
  channel,                 -- whatsapp | email
  value, opted_in_at,      -- opt-in explícito (§4.6)
  -- base do loop viral: o convidado de hoje é o cliente de 2028
  created_at
)

uploads (
  id, event_id, challenge_id?, session_id,
  storage_key, thumb_key, width, height, bytes,
  status,                  -- pending | approved | hidden | removed
  moderation_score, taken_at, created_at
)

reactions (
  upload_id, session_id, kind, created_at
)

funnel_events (
  id, event_id, session_id, kind, meta JSONB, created_at
)
-- kind: qr_scan | page_open | consent | capture
--       | upload_start | upload_ok | upload_fail | share
--       | install_prompt | install_accept | install_dismiss

vendors (
  id, name, brand_tokens JSONB, plan, billing_status
)
```

### 6.3 Pipeline de upload (o caminho crítico)

```
[Convidado]
  1. Abre link → Service Worker registra
  2. Consentimento → session token anônimo (cookie)
  3. Captura via getUserMedia ou <input capture>
  4. CLIENT-SIDE:
       ├─ redimensiona: 2500px (grátis) / **3500px (planos pagos)**
       │    ⚠️ 3500px é requisito do livro de fotos a 30cm/300dpi (§14)
       ├─ reencode JPEG q80
       ├─ REMOVE EXIF (GPS é problema de LGPD)
       └─ gera thumb 400px
  5. GET /api/upload-url → 2 presigned PUT (full + thumb)
  6. Enfileira em IndexedDB
  7. PUT direto no R2  ← servidor NUNCA toca nos bytes
  8. POST /api/uploads/confirm { keys, challenge_id, dims }
  9. Retry com backoff exponencial
```

**Três detalhes que decidem se funciona no salão:**

1. **Compressão no client antes do upload** — corta o payload em 5–10×. Sem isso, 4G ruim = upload falhado = participação zero.
2. **Fila em IndexedDB + retry** — o convidado sai da tela, o browser dorme, o sinal cai. A foto precisa subir depois.
3. **Thumbnail gerado no client** — economiza função serverless e o telão fica instantâneo.

**Por que presigned direto no R2:** o servidor nunca proxeia mídia. Escala trivialmente no burst de sábado e o custo de compute fica desprezível.

### 6.4 Telão

```
GET /telao/:slug           → HTML fullscreen, sem chrome
GET /api/telao/:slug/sse   → stream de novos IDs aprovados
```

- Cliente pré-carrega as próximas N imagens
- **Cache local das últimas 50** → se a rede cair, o telão continua rodando
- Fallback para polling se SSE falhar
- Sem controles, sem cursor, resistente a reload

### 6.5 Moderação

| Modo | Comportamento |
|---|---|
| `open` | Auto-aprova, casal oculta depois |
| `queue` | Fila de aprovação (padrão para telão) |
| `telao_only` | Galeria livre, telão moderado |

- Classificador NSFW roda **no thumb** (barato) antes de liberar para o telão
- Botão "remover minha foto" acessível ao convidado via session token
- **Com feed e reações, moderação deixa de ser feature e vira requisito** — o produto passa a *difundir* imagem de terceiros, não só coletar

### 6.6 Ciclo de vida do armazenamento

```
Dia 0–330    → R2 Standard
Dia 330      → job de export para o Google Drive do casal + e-mail
Dia 365      → delete (ou Infrequent Access se o plano estender)
```

### 6.7 Escala e sazonalidade

- **Padrão:** sábados, maio–junho e outubro–dezembro; ~80% dos uploads em 4 horas
- **Pico estimado:** 150 convidados × 20 fotos ÷ 4h ≈ 12–15 uploads/min, com rajadas
- **Mitigação:** serverless puro, sem instância fixa; upload direto no R2 tira o gargalo do app
- **Gargalo real:** conexões do Postgres → usar driver serverless / PgBouncer
- Teste de carga obrigatório antes do primeiro evento: **150 uploads em 20 minutos**

### 6.8 Observabilidade

Funil instrumentado desde o primeiro commit:

```
qr_scan → page_open → consent → capture → upload_ok
```

Dashboard por evento: escaneamentos, sessões, uploads, taxa de retry, falhas, tempo médio de upload.

> Sem isso, o casamento termina e não se sabe **onde** a participação foi perdida — e o MVP inteiro terá sido em vão.

### 6.9 Segurança e LGPD

- Consentimento **versionado e datado** por sessão
- **EXIF removido no client** (coordenadas GPS em foto de convidado é exposição real)
- Sem login de convidado = nenhum dado pessoal além de nome opcional
- Direito de remoção acessível ao próprio convidado
- Política de retenção explícita e cumprida por job
- Aviso claro de que a foto pode aparecer para outros convidados e no telão
- ⚠️ **Definir com advogado** o papel de controlador vs. operador entre o casal e a plataforma

### 6.10 Sistema de packs (verticais)

Implementação da estratégia da §3.3. Cada tipo de evento é **configuração, não código**.

```ts
type Pack = {
  eventType: 'wedding' | 'quince' | 'graduation' | 'corporate' | 'party'
  vocabulary: Record<string, string>   // hostLabel, guestLabel, títulos, CTAs
  challenges: Challenge[]              // biblioteca padrão
  templates: { sign, cards, invite }   // peças renderizáveis
  identity: IdentityTokens             // presets de paleta/tipografia
  tone: 'romantic' | 'festive' | 'formal'
}
```

**Mecânica:** é o mesmo padrão de i18n, só que a chave é o **vertical** em vez do idioma — inclusive a cadeia de fallback (`pack → default → core`). Padrão de theming/plugin já conhecido de Liferay/Client Extensions.

**Regras de implementação:**

1. **Nenhuma string de domínio no componente.** Tudo resolve via `usePack().t('host.label')`.
2. **O núcleo não importa nada de pack.** Dependência unidirecional: `pack → core`, nunca o contrário.
3. **Um pack publicado no MVP: casamento.** O sistema existe, o catálogo tem um item. Zero feature a mais, zero dívida depois.
4. **Teste de sanidade:** trocar `pack_id` de um evento deve mudar toda a UI sem tocar em uma linha do núcleo.

> Construir o sistema de packs no MVP custa ~0. Retrofitar depois custa semanas — e a conta chega justamente quando você estiver ocupado vendendo.

---

## 7. Integrações

**Critério:** integração só se paga se **tira custo**, **tira atrito no uso** ou **traz distribuição**.

### Tier 1 — mudam o negócio

| Integração | Ganho | Custo/atrito |
|---|---|---|
| **WhatsApp Business Platform** | Distribuição do QR, RSVP, **entrega pós-evento individual** | Custo por conversa; templates precisam de aprovação |
| **Google Drive do casal** | Zera custo de retenção; já é diferencial vendido por concorrentes | OAuth por usuário. Usar Drive, **não** Photos (API restrita) |
| **Split de pagamento** (Pagar.me/Mercado Pago/Asaas) | Viabiliza o modelo de revenda B2B2C | Obrigatório se houver fornecedor |
| **Moderação por visão** (Rekognition/Vision) | Requisito dado o risco do telão | Custo por imagem |

### Tier 2 — baratas, alto valor percebido

`.ics` no save the date · Chromecast/AirPlay · browser source para OBS/vMix · Spotify (pedido de música) · agrupamento facial · print-on-demand

### Tier 3 — avaliar depois

Plataformas de fotógrafo (Pixieset, Pic-Time, Fotop) — o fotógrafo é canal, mas as APIs são limitadas. Começar com upload manual.

### Casos especiais

**Canva** — o Autofill API é **Enterprise-only nas duas pontas**: o desenvolvedor *e cada usuário final* precisam pertencer a uma organização Enterprise. Inviável para B2C.
✅ O que funciona: **importar** a identidade do convite que a noiva já fez (OAuth + export + extração de paleta) e **exportar** peças prontas para ela refinar. Fonte não é extraível — nem tecnicamente, nem juridicamente (licenças do Canva valem só dentro do Canva).
💡 Um app dentro do Canva (Apps SDK) é **canal de aquisição**, não feature.

**Instagram** — publicar no story de conta pessoal via API é **impossível** (só Business/Creator, com App Review de 2–4 semanas).
✅ O que funciona: `navigator.share()` com a imagem já composta com a moldura da identidade. Zero API, ~1 dia de trabalho, e é o **único canal viral gratuito** do produto.

**Plataformas de site (iCasei, Casar.com, Lejour)** — não existe API pública. O próprio iCasei importa convidados por planilha Excel.
✅ **Importador de CSV/XLSX**: 2 dias, funciona com todas de uma vez, sem parceria, sem dependência.

---

## 8. Roadmap

### Fase 0 — Validação (antes de qualquer código)
- [ ] Conversar com 5 cerimonialistas/espaços: *"você venderia isso no seu pacote?"*
- [ ] **Conseguir 1 casamento real com data marcada** (a data é o que impede scope creep)
- [ ] Baixar o Dots. Memories e cronometrar o fluxo do convidado — esse é o benchmark

### Fase 1 — MVP (6 semanas, noites e fins de semana)

| Sem. | Entrega |
|---|---|
| 1 | Schema + pipeline de upload ponta a ponta (**comece pelo risco técnico real**) |
| 2 | Fluxo do convidado, mobile-first, testado em Android antigo e iPhone |
| 3 | Admin + geração de QR e PDF de impressão |
| 4 | Telão + moderação + ZIP |
| 5 | Teste de carga + share com moldura + **PWA instalável** + polimento |
| 6 | **Casamento real** |

> Incluir no MVP, a custo ~zero: **sistema de packs com 1 pack publicado** (§6.10), **schema genérico** (§6.2) e **PWA instalável** (§4.5). Nenhum dos três adiciona feature — os três evitam retrabalho caro.

### Fase 2 — Pós-validação
Entrega por WhatsApp ("suas fotos", §4.6) · agrupamento facial · stories completos · export para Drive · **app nativo (convidado e anfitrião)** — push, loja, multi-evento (§4.5) · **multi-evento na mesma conta**

### Fase 3 — Escala
Camada de identidade visual completa · portal do fornecedor + white-label · split de pagamento · papelaria impressa · **2º pack: 15 anos** (mesmo canal de fornecedor, CAC ≈ zero) · aniversário de 1 ano automatizado

### Fase 4 — Expansão para a jornada completa do noivado

**Visão de longo prazo:** o casal define a identidade uma vez, 12 meses antes, e ela acompanha tudo — do primeiro anúncio ao álbum final.

```
[Fase 4 — expansão para trás na jornada]
  ├─ save the date
  ├─ convite digital
  ├─ site do casal
  ├─ RSVP / lista de convidados
  └─ papelaria impressa completa
        │
        ▼
[Fases 1–3 — o produto atual, dia da festa]
  ├─ placa / QR de mesa
  ├─ cards de desafio
  ├─ preset das fotos
  ├─ telão
  └─ álbum final
```

A lógica é sólida: o motor de identidade já existe, e cada peça nova é só **mais um artefato renderizado a partir dos mesmos tokens**. Não é produto novo, é alcance maior do mesmo motor. E resolve a falha estrutural de go-to-market do produto atual — hoje o cliente é conhecido 2 semanas antes do casamento, quando tudo já foi decidido e o orçamento acabou.

#### Condições de entrada (não negociáveis)

Esta fase só abre quando **as três** forem verdadeiras:

1. **Canal de distribuição próprio funcionando** — 10+ fornecedores ativos revendendo. Sem isso, é competir por SEO contra 18 anos de iCasei e perder.
2. **Motor de identidade em produção** — os artefatos do dia da festa já saem a partir dos tokens. A expansão precisa ser incremental, não um produto do zero.
3. **H1 validada e receita real** — não expandir escopo antes de provar o núcleo.

#### A forma importa mais que a decisão

O erro seria construir um site de casamento grátis para competir com os grátis. Isso é perder por definição: os incumbentes dão de graça porque monetizam a tarifa da lista de presentes (iCasei a partir de 3,69%).

As formas que funcionam:

| Formato | Racional |
|---|---|
| **Peça premium paga** | Público que valoriza coerência estética e já pagou pelo álbum. Não briga com grátis — briga com "genérico" |
| **Embutido no pacote do fornecedor** | O cerimonialista entrega o kit completo com a marca dele. Quem paga é ele, não o casal |
| **Upsell da identidade** | Casal já comprou o álbum, já tem os tokens. Adicionar convite é um clique, não uma nova venda |

#### Bifurcação estratégica: lista de presentes

Existe um caminho que muda toda a economia: **entrar em lista de presentes.**

- ✅ Viabiliza o modelo "tudo grátis", financiado pelo fluxo financeiro dos presentes — que é exatamente como os incumbentes operam
- ❌ Significa virar fintech: KYC, split, PSP, antifraude, saque, compliance
- ❌ Deixa de ser um pivô de produto e vira um pivô de empresa

**Decisão:** não avaliar antes da Fase 3 estar consolidada. Registrado aqui para não ser esquecido nem tomado por impulso.

#### Ordem sugerida dentro da Fase 4

1. **Save the date** — a peça mais simples, testa a hipótese de expansão com o menor custo
2. **Papelaria impressa completa** — margem real, mesmo pipeline de assets
3. **Convite digital** — só depois de validar 1 e 2
4. **Site do casal** — último, e apenas se houver demanda comprovada da base existente
5. **RSVP / lista de convidados** — integra com o importador de CSV que já existe

> ⚠️ Cada item acima é uma trincheira ocupada. A vantagem não vem do feature — vem de já ter o casal, a identidade dele e o canal. Sem esses três, é um me-too.

---

## 9. Métricas e critérios de decisão

**Métrica principal:** `uploads_com_sessão_única / expected_guests`

Depois de **3 casamentos reais com anúncio feito no microfone:**

| Resultado | Decisão |
|---|---|
| **≥ 40%** | Tese validada → Fase 2 |
| **25–40%** | Produto funciona, ativação não → mexer em fricção e no roteiro do anúncio, **não em features** |
| **< 25%** | Tese errada → **parar** |

> ⚠️ Escrever esses números **hoje**. Daqui a dois meses, com o produto pronto e apego emocional envolvido, virá a vontade de reinterpretá-los — e é exatamente aí que eles servem para alguma coisa.

**Métrica de plataforma:** `instalações / convidados_presentes` — acompanhada **sempre junto** da participação, nunca isolada. Instalação que sobe com participação caindo é prejuízo (§4.5).

**Secundárias:** taxa de conclusão de desafios · tempo médio de upload · taxa de retry · % que compartilha no Instagram · conversão grátis → pago

---

## 10. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| **Convidado não participa** | 🔴 Crítico | Zero download; anúncio no microfone; ≤ 4 toques |
| **Churn estrutural** (uso único) | 🔴 Crítico | Canal B2B2C via fornecedor; upsell de impressão |
| **Rede ruim no salão** | 🟠 Alto | Compressão client-side, fila offline, retry |
| **Foto inadequada no telão** | 🟠 Alto | Moderação obrigatória + classificador NSFW |
| **LGPD / direito de imagem** | 🟠 Alto | Consentimento versionado, EXIF removido, remoção self-service |
| **Incumbente copia** (iCasei/Lejour) | 🟠 Alto | Velocidade + canal de fornecedor + foco no dia da festa |
| **Concorrente promete "storage ilimitado grátis"** | 🟡 Médio | Não competir em storage; competir em experiência |
| **Sazonalidade** | 🟡 Médio | Serverless; expandir para 15 anos, formatura, corporativo |
| **Vídeo estoura a margem** | 🟡 Médio | Vídeo só no plano pago; limite de duração |
| **Licenciamento de fontes** | 🟡 Médio | Catálogo próprio licenciado (OFL/Google Fonts) |
| **Diluição de posicionamento** ao genericizar | 🟠 Alto | Núcleo genérico, experiência especializada, marketing vertical (§3.3). Home nunca vira "eventos em geral" |
| **Memória sensível** (luto, separação) | 🟠 Alto | Memórias opt-in, desligar em 1 toque, exclusão real (§4.6) |
| **Retenção perseguida como fim** | 🟡 Médio | Métrica é permissão de contato, não app instalado. Sem streak/gamificação |

---

## 11. Aquisição

1. **Fornecedores (cerimonialista, espaço, buffet, fotógrafo, DJ)** — 30–60 eventos/ano cada. É o que transforma uso único em receita recorrente. **Canal principal.**
2. **TikTok / Reels** — canal comprovado da categoria no Brasil (é como o Dots. Memories cresceu). Negociar direito de gravar nos 10 primeiros casamentos gratuitos.
3. **Loop viral no próprio evento** — 100–200 pessoas usam o produto no mesmo dia, e parte delas vai casar. O share no Instagram com moldura da identidade é a alavanca.
4. **Lojas de aplicativos** — descoberta e legitimidade. Foi assim que o Dots. Memories cresceu: TikTok → loja. Reforça o CTA de instalação da §4.5.
5. **App dentro do Canva (Apps SDK)** — avaliar como canal, não como feature.

> **Não fazer:** tráfego pago em nicho de noiva (CAC proibitivo para compra única) · SEO de cauda longa contra 18 anos de iCasei · comunidade própria.

---

## 12. Decisões registradas

| # | Decisão | Motivo |
|---|---|---|
| 1 | **App é a experiência completa; web é a rampa de entrada.** CTA de instalação em todos os pontos, mas a 1ª foto nunca passa por loja | Decisão do fundador. Captura a permanência e o push do app sem arriscar a H1 — a web nunca bloqueia |
| 2 | Cloudflare R2, não S3 | Egress zero muda a economia inteira |
| 3 | Sem editor de canvas | Competir com o Canva na competência dele |
| 4 | Sem comunidade | Rotatividade total da base a cada 12 meses |
| 5 | Site/convite/RSVP **adiados para a Fase 4**, com condições de entrada explícitas (§8) | São grátis porque financiados pela lista de presentes. Entrar sem canal próprio = competir com grátis e perder. Entrar **depois** do canal = upsell natural sobre base cativa |
| 6 | Assinatura só para fornecedor | Casal tem uso único; mensalidade vira refém |
| 7 | Nunca limitar convidados | Convidado é canal de distribuição, não custo |
| 8 | Identidade visual como tokens propagados | Único fosso defensável e alinhado à experiência técnica |
| 9 | Engajamento é anti-objetivo durante o evento | Feed durante a festa estraga a festa |
| 10 | Pix manual nos 10 primeiros eventos | Não construir checkout antes de validar H1 |
| 11 | **Núcleo genérico, experiência especializada, marketing vertical** | Genericizar sem virar Dots. Memories. A experiência de casamento nunca piora por outro vertical |
| 12 | **Schema e packs genéricos desde o commit 1** | Custa ~0 agora, semanas depois — e a conta chega no pior momento |
| 13 | **Retenção = permissão de contato, não app instalado** | Os 150 convidados são o negócio; o casal não casa de novo |
| 14 | **Multi-evento em vez de TBT** | Foto de casamento é ativo morto. A pessoa volta porque precisa, não porque foi cutucada |
| 15 | **Nome: Albora** — marca é moldura, evento é quadro | Cunhado, sem carga cultural, sem dono no setor. Paleta da marca não pode competir com os tokens do evento |
| 16 | **Livro de fotos: montar grátis, exportar pago** | Cobrança no pico do desejo. Slots em vez de editor livre — layout profissional com ~10% da engenharia |
| 17 | **Export antes de impressão própria** | Valida demanda sem herdar logística. "O arquivo é seu" é diferencial que ninguém oferece |
| 18 | **Compressão sobe para 3500px em planos pagos** | Habilita livro de 30cm a 300dpi. Storage custa R$0,10/evento e destrava produto de R$400 |

---

## 13. Marca e identidade visual

### 13.1 O nome

**Albora** — cunhado de **álbum**, com o som de **alvorada**.

"Albor", "alborada", "alvor", "alvorada" — em português e espanhol, todos significam **amanhecer**. E casamento acaba de madrugada. O nome nasceu da sonoridade e ganhou o significado depois, o que é o melhor tipo de nome: vazio o bastante para ser seu, sugestivo o bastante para grudar.

| Critério | Avaliação |
|---|---|
| Neutro entre verticais | ✅ Casamento, 15 anos, formatura, corporativo. Sem "casa/noiv" (§3.3) |
| Sem carga religiosa ou cultural | ✅ Palavra cunhada — não carrega leitura de terceiros |
| Território livre no setor | ✅ Sem colisão com foto, eventos ou casamento no Brasil |
| Falado ao telefone | ✅ O cerimonialista vai *dizer* o nome ao casal |
| Registrável | ✅ Não descritivo, não genérico |

**Voz:** *"A festa até o amanhecer, em fotos."*

**Lockup:** `Albora · o álbum coletivo da sua festa`

#### Colisão conhecida (não bloqueante)

**Albora Technologies SL** — Barcelona, 2017, geolocalização GNSS de alta precisão para IoT e logística, em `albora.io`. Possui 5 marcas espanholas e 5 comunitárias.

| Fator | Avaliação |
|---|---|
| Setor | Deeptech B2B vs. app de foto de casamento — zero confusão |
| Jurisdição | Espanha/UE. **INPI é independente**; marca comunitária não bloqueia registro no Brasil |
| Público | Engenheiros de logística vs. noivas |

⚠️ Confirmar com advogado de PI. Impacto real: `albora.com` indisponível (usar `.com.br`), alguns handles internacionais, e eventual expansão para a Europa.

#### Convergência com a identidade visual

A paleta da §13.3 foi definida **antes** do nome e encaixou sozinha:

| Elemento | Significado com Albora |
|---|---|
| Base `noite` | A festa |
| Acento `âmbar` | **A luz do amanhecer** |
| Movimento | "A foto amanhece" (§13.7) |

#### Nomes descartados (memória institucional)

Cinco nomes morreram antes deste. O registro evita refazer o trabalho:

| Nome | Motivo |
|---|---|
| **Revela** | Território dominado por laboratórios de impressão — Revela Fácil (Fujioka), Revela Fotos, Revela Photo Brasil |
| **Mutirão** | "Mutirão de casamento" = cerimônias civis coletivas do Judiciário. Também "Global Mutirão" da COP30 |
| **Mosaico** | "Foto Mosaico" é categoria inteira de ativação de eventos (Photo A, Photomatic, Café Printer, Fotopop) |
| **Ciranda** | Leitura religiosa/folclórica. Fundador desconfortável = nome morto |
| **Sarau** | Termo de movimento cultural (poesia, periferia). Ocupado por Sarau Cultura Brasileira e Estúdio Sarau (Brasília) |

> **Padrão aprendido:** toda palavra portuguesa com significado bonito neste território já tem dono ou carrega bagagem cultural. Por isso o método final foi **cunhar**, não escolher — como Sympla, Nubank, Olist e, na própria categoria, Kululu e Dots.

### 13.2 Princípio governante

> **A marca é a moldura. O evento é o quadro.**

Não é poesia, é restrição técnica: os `identity_tokens` do casal assumem a UI (§3.2). A paleta da marca **não pode competir** com a paleta do evento — precisa ser recipiente neutro e quente que fica bem com qualquer cor por cima.

Por isso a marca não tem cor forte dominante.

### 13.3 Paleta

```js
const brand = {
  papel:  '#FAF7F2',  // base clara — admin, site, papelaria
  tinta:  '#1A1613',  // texto (preto quente, nunca #000)
  noite:  '#14100E',  // base escura — convidado, galeria, telão
  ambar:  '#E8873A',  // acento único, com parcimônia
  brasa:  '#C2410C',  // acento raro (erro, destaque crítico)
}
```

**Por que âmbar:** a categoria inteira é verde sage + rosa blush + script. Âmbar lê como calor, festa e Brasil — e convive com qualquer paleta de evento sem brigar.

### 13.4 Modo duplo (decisão estrutural)

```
CLARO (papel)   → admin, marketing, papelaria impressa
                  editorial, espaçoso, tátil

ESCURO (noite)  → fluxo do convidado, galeria, telão
                  a festa é à noite; foto brilha no escuro
```

Não é dark mode como preferência — é **contexto de uso**. O convidado usa isso às 22h, no escuro. Tela clara nesse momento é agressiva.

### 13.5 Tipografia

| Papel | Fonte | Motivo |
|---|---|---|
| Display | **Fraunces** | Serifada variável, quente, editorial — não "de produto" |
| Texto/UI | **Inter** ou **Instrument Sans** | Neutra, legível em tela ruim |

⚠️ **Ambas OFL** — livres para uso comercial **e impressão**. Requisito não negociável: convite e papelaria vão para gráfica, e é exatamente onde fontes do Canva não podem ir (§7).

### 13.6 Marca gráfica

Logotipo em Fraunces + símbolo: **arco de luz nascente** — um semicírculo com gradação âmbar que lê simultaneamente como amanhecer, diafragma de lente e a curva de um álbum aberto.

Requisitos não negociáveis:
- Funciona em **1 cor** (gráfica, hot stamp, baixo relevo)
- Legível a **16px** (canto do card de mesa)
- **Estruturalmente simples** — precisa sumir no white-label do fornecedor (§5.2)

### 13.7 Movimento

**"A foto amanhece"** — no telão, a foto nova surge com uma varredura âmbar curta, como luz nascendo sobre a imagem, e se acomoda.

Usado em **exatamente dois lugares**: telão e confirmação do primeiro upload. Todo o resto é parado.

### 13.8 Presença da marca por superfície

| Superfície | Presença |
|---|---|
| Admin (anfitrião) | Alta — é o produto dele |
| Convidado | **Quase nula** — só rodapé. A foto é a interface |
| Telão | **Zero** — só a identidade do evento |
| Papelaria | Assinatura discreta no rodapé |

### 13.9 Linguagem dos desafios: missões

Os desafios não se chamam "desafio" na interface. Chamam-se **missões**:

> **MISSÃO 03** — Uma foto com os noivos antes da meia-noite

Traz energia lúdica e de tarefa, que o restante da marca (quente, editorial) não carrega sozinho. Vale para card de mesa, app e telão.

**Derivado:** *"Operação Casamento"* como nome da **série de conteúdo** no TikTok/Reels (§11) — bastidores dos primeiros casamentos. Nome de conteúdo pode e deve ser descritivo; as regras de marca não se aplicam ali.

### 13.10 Anti-padrões

❌ Glassmorphism · neon · gradiente roxo · dark mode "tech" · fonte script · verde sage · rosa blush · ícone de aliança/pombinha/coração

### 13.11 Verificação pendente

- [ ] **INPI** — classes 9 (software) e 42 (SaaS)
- [ ] **registro.br** — `albora.com.br`, `albora.app.br` (`albora.com` indisponível — ver §13.1)
- [ ] **@albora** no Instagram e TikTok (o TikTok importa: é canal de aquisição, §11)
- [ ] App Store e Play — colisão de nome
- [ ] Marcas de eventos/festas já usando o nome

> Se `albora.com.br` estiver ocupado mas o INPI livre, `albora.app.br` ou prefixo curto resolvem sem perder a marca.

- [ ] **Teste de fala** — peça para alguém escrever o nome só de ouvir. Se sair "Alvora" ou "Albhora", há atrito de grafia a resolver na comunicação

---

## 14. Livro de fotos (produto pós-evento)

Materialização do item 3 da §4.6 e **principal correção do LTV**. A galeria digital decai; o livro na estante não.

### 14.1 Âncora de preço

Álbum de casamento profissional no Brasil: **R$ 1.497–2.597** (25×25 com capa fotográfica e 50 fotos parte de ~R$ 1.600).

Com essa âncora, um livro dos convidados a **R$ 290–490** é venda fácil e margem real. Categoria com preço já formado — entrada pela porta de baixo.

### 14.2 Posicionamento: não brigar com o fotógrafo

**O fotógrafo é canal (§11), não concorrente.**

O produto não é *"o álbum do casamento"* — é **o outro álbum**: bastidores, ângulos que ninguém cobriu, a pista às 2h. Nome, capa e comunicação precisam deixar isso explícito.

> Se o fotógrafo achar que você está mordendo o álbum dele, você perde o canal inteiro por uma venda. Bem posicionado, ele vira argumento: *"seus clientes ganham o álbum dos convidados junto."*

### 14.3 Construção: slots, nunca editor livre

Mesma lógica do Canva (§7). **Não construir editor de diagramação.**

```ts
type Book = {
  format: '21x21' | '25x25' | '30x30'
  cover: CoverTemplate
  spreads: Spread[]
}

type Spread = {
  template: SpreadTemplate   // 1 | 2 | 3 | 4 slots | full-bleed | spread duplo
  slots: (UploadRef & { crop: Rect })[]
}
```

**O casal faz:** escolhe formato e capa → escolhe template por página → arrasta foto pro slot → ajusta crop → adiciona/remove páginas.

**O casal não faz:** posicionar livremente, redimensionar caixa, escolher fonte, mover elemento.

Garante layout profissional, elimina ~90% da engenharia e evita o suporte de "ficou feio".

Os templates herdam os `identity_tokens` (§3.2) — o livro sai com a mesma cara da placa, dos cards e do telão. **É a última peça da propagação de identidade e fecha o arco do produto.**

### 14.4 ⚠️ Conflito de resolução (resolvido)

| Tamanho | DPI com 2500px | DPI com 3500px |
|---|---|---|
| 21×21 cm | 300 ✅ | 420 ✅ |
| 25×25 cm | 254 ⚠️ | 355 ✅ |
| 30×30 cm | 212 ❌ | 300 ✅ |

**Decisão:** compressão sobe para **3500px em planos pagos** (§6.3). Custa mais banda e storage — mas storage custa R$ 0,10/evento (§5.1) e habilita um produto de R$ 400.

*Alternativa se mantiver 2500px:* travar o catálogo em até 25 cm.

### 14.5 Requisitos de produção gráfica

Nenhum é difícil isolado; todos derrubam um pedido se esquecidos.

| Item | Especificação |
|---|---|
| **Sangria** | 3 mm padrão (confirmar — algumas gráficas pedem 5 mm) |
| **Lombada** | Largura = `nº páginas × gramatura`. Errou, a capa não fecha |
| **Medianiz** | Margem interna some na encadernação. **Nunca centralizar rosto na dobra** |
| **Cor** | Gráfica quer CMYK com perfil ICC; foto de celular é sRGB. **A conversão muda a cor** — avisar o casal antes, não depois |
| **Área de segurança** | Nada importante a menos de 5 mm do corte |
| **Formato** | PDF/X-1a ou PDF/X-4, páginas simples ou spreads conforme a gráfica |

> **Regra que evita prejuízo:** sempre uma prova física antes da tiragem real.

**Técnica:** estender o pipeline SVG→PDF que já existe (§6.1) — texto vetorial + raster embutido, conversão CMYK via Ghostscript com perfil ICC. Roda em **fila, nunca em request**: 40 páginas a 300 dpi passa de 300 MB.

### 14.6 Monetização

> **Montar é grátis. Exportar é pago.**

O casal monta o livro inteiro sem pagar, vê o preview, se apaixona. A cobrança acontece no **export** — o pico exato do desejo.

| Etapa | Preço |
|---|---|
| Montar + preview (com marca d'água) | **Grátis, todos os planos** |
| Export PDF print-ready | **Incluso no Celebração+** ou R$ 149 avulso |
| Impressão via parceiro | Produto separado, R$ 290–490 |

⚠️ Regra da §5.3 continua valendo: **avisar na primeira tela do editor**, nunca surpreender no final.

### 14.7 Export vs. impressão própria

| Modelo | Prós | Contras |
|---|---|---|
| **A) Só export** | Zero logística, zero risco, zero devolução | Captura menos margem |
| **B) Impressão própria** | Margem 2–4× | Herda logística, reclamação de qualidade, prazo |

**Começar por A.** Valida demanda com risco quase nulo — e vira diferencial: *"o arquivo é seu, leve pra gráfica que quiser."* Nenhum concorrente oferece isso; todos prendem na impressão deles.

Depois adicionar **"imprimir com nosso parceiro"** — margem de afiliado sem ser dono da logística.

### 14.8 Fase 3

**Curadoria automática.** O problema real não é montar o livro — é escolher 60 fotos entre 1.500. Dedup, detecção de foto tremida, diversidade de momentos, cobertura de convidados. **É aqui que vira mágica.**

**Momento da oferta:** não no dia seguinte (lua de mel, exaustão). Em **30–60 dias**, ou no **aniversário de 1 ano** (§4.6).

---

## Anexo A — Perguntas em aberto

- [x] ~~Nome e domínio~~ → **Albora** (§13). ⚠️ **Pendente:** busca INPI (classes 9 e 42), registro.br, handles, teste de fala. Bloqueia identidade visual e material impresso
- [ ] Controlador vs. operador de dados (consultar advogado)
- [ ] Faixa exata de preço — validar com 5 cerimonialistas
- [ ] Existe Android no Dots. Memories? (a listagem da App Store é iPhone-only)
- [ ] Modelo de comissão do fornecedor: % ou licença fixa?
- [ ] Catálogo de fontes licenciadas para impressão

## Anexo B — Referências de mercado

- Casar.com / Assessoria VIP — projeção 2026 (R$ 32 bi, 472 mil cerimônias, ticket R$ 69 mil)
- ABRAFESTA — projeção de casamentos civis 2025/2026
- Cloudflare R2 — tabela de preços (verificar antes de decidir)
- Canva Connect API — documentação de Autofill e Brand Templates
- Instagram Graph API — requisitos de content publishing
