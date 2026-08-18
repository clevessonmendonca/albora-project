# Redesign do Convidado — social moderno, foto-first

> Design doc. Escopo: **superfície do convidado** (`/e/[slug]/*`). Não cobre admin, ops nem telão nesta rodada.
> Data: 2026-08-17 · Branch de origem: `task-004-cliente-upload`

---

## 1. O que estamos construindo, em uma frase

Reescrever todas as telas do convidado numa linguagem **foto-first, moderna e estilosa** — foto ocupando a tela, serifada chique (Fraunces) para nomes e títulos, degradê suave, cards arredondados, navegação flutuante — e transformar o convidado num **app social de verdade**: stories, feed com scroll infinito, curtidas com contagem, comentários, música colaborativa e compartilhamento.

A régua visual são as referências reunidas pelo mantenedor (Boda A&G, Glimpse, friendlyhours, Elian & Rose): app de fotos moderno, claro **ou** escuro à escolha do usuário.

## 2. Decisão de produto — pivô assumido

Esta rodada **quebra três regras hoje marcadas "não negociáveis" no `CLAUDE.md`**, por decisão explícita do mantenedor. Elas deixam de valer:

| Regra antiga (CLAUDE.md / DESIGN.md) | Agora |
|---|---|
| "Contagem visível de curtida" proibida (ranking = treta de família) | **Curtida com contagem visível**, estilo Instagram |
| "Comentário em foto — não existe, em nenhuma fase" | **Comentário em foto**, de primeira classe |
| "Scroll infinito no fluxo do convidado" proibido | **Scroll infinito** no feed |
| "Não existe toggle de tema em nenhuma superfície" | **Tema claro/escuro à escolha**, default = sistema (`prefers-color-scheme`) |

**Consequência obrigatória (mesma MR):** atualizar `CLAUDE.md`, `DESIGN.md` e o [ADR 0009](../../adr/0009-app-social-do-convidado.md) para refletir o pivô. Código e cânone não podem se contradizer. Escrever um ADR novo registrando a decisão (o antigo era o gate de interação por horário; agora o social é aberto por padrão).

### O que NÃO muda — continua não negociável (é segurança, não gosto)

- **Isolamento por evento.** Todo like, comentário, pedido de música tem `event_id` (UUID, NOT NULL, FK) e RLS forçado. `SET LOCAL`, nunca `SET`.
- **Chaves de storage derivadas no servidor.** O cliente nunca informa a chave.
- **Caminho crítico de upload** depende só de object storage + Postgres. Like/comentário/moderação **degradam, nunca falham** o upload.
- **EXIF removido no cliente.** **Sem PII crua em log** (nome, telefone, e-mail mascarados).
- **Comentário é conteúdo do usuário** → passa por moderação e é escopado ao evento. Texto validado, sem XSS.
- **Token de sessão do convidado** continua opaco, assinado, escopado a UM evento.

## 3. Sistema visual

### Base
- **Foto é a interface.** Cromo cede espaço à imagem. Foto full-bleed ou em card de canto grande (20–22px).
- **Degradê suave** derretendo a foto-herói no fundo da página (não recorte seco).
- **Tema claro/escuro**, escolha do convidado, default = sistema, escolha persistida (cookie/local). No escuro a foto brilha e o degradê vai pro preto quente.

### Tipografia
- **Fraunces** (serifada, já no design system) = a "fonte chique": nome do casal, títulos de seção, nomes de quem postou, títulos de álbum/momento. Peso ≤ 500. Itálico no `&` e em ênfases.
- **Instrument Sans** = corpo, rótulos operacionais, metadados (tempo, contadores).

### Cor
- Continua **tokenizada** — cor/fonte/raio saem de token, nunca hex hardcodado em componente. Identidade do casal (`identity_tokens`) propaga.
- **Âmbar** (`--acento`) segue como a alma Albora no meio do moderno: botão de câmera, item de nav ativo, ação de destaque. No claro, âmbar só como preenchimento/ícone — nunca texto sobre papel (reprova contraste); texto usa `--acento-texto`.

### Componentes-chave (novos ou repaginados)
- **Nav flutuante** — pílula arredondada flutuando acima da borda inferior, 5 itens, câmera-herói central em âmbar levemente elevada. Some/reaparece ao rolar (opcional).
- **Card de foto** (feed) — header (avatar + nome serifada + tempo/contexto) · foto canto-grande · ações (curtir com contagem, comentar, salvar, compartilhar).
- **Story** — avatar squircle (raio ~18px) com anel âmbar quando tem novidade; "Você +" para adicionar.
- **Foto-herói** — imagem + degradê + versalete + nome grande centralizado.
- **Coverflow de momentos** — carrossel com card central em destaque e vizinhos espiando.
- **Sheet de comentários** — bottom sheet, lista de comentários + campo, serifada no nome.

## 4. Arquitetura de navegação

Nav flutuante, 5 destinos:

`Início · Missões · 📷 Câmera · Álbum · Minhas`

| Destino | Rota | É |
|---|---|---|
| **Início** | `/e/[slug]` (nova home) | Stories + feed vivo, scroll infinito |
| **Missões** | `/e/[slug]/missions` | Lista de missões, progresso |
| **Câmera** | `/e/[slug]/photo` | Captura + filtros + envio (ação central, âmbar) |
| **Álbum** | `/e/[slug]/album` | Grid imersivo + momentos |
| **Minhas** | `/e/[slug]/my-photos` | Perfil do convidado |

**Perfil do evento** (o hub do casal: foto-herói, nome, cards de atalho, carrossel) é alcançado tocando no **nome "Ana & João"** no topo da Home. Não ocupa slot de nav.

**Música** e **Compartilhar** não são abas: música é atalho no Perfil do evento e/ou no header; compartilhar é ação por foto e um "chamar convidados" no Perfil.

Resolução da redundância card × nav: os cards de atalho do Perfil mostram **número ao vivo** ("48 no álbum", "3 missões", "122 convidados") e têm papel de resumo; a nav é o troca-rápido global.

## 5. Mapa tela-por-tela (hoje → alvo)

> "Hoje" descrito no nível de rota/estrutura; detalhes de cada arquivo são verificados na implementação, antes de editar.

### 5.1 Início / Home — `/e/[slug]` → nova home
- **Hoje:** a raiz é a entrada do QR (EntryFlow: nome + consentimento) e redireciona pra `/cover` quando há sessão.
- **Alvo:** com sessão, a raiz vira a **Home social**: header com nome do casal (serifada) + sino; **stories** no topo (squircle, anel âmbar); **feed** de fotos da festa em cards com scroll infinito; nav flutuante. Toque no nome → Perfil do evento.
- **Estados:** vazio ("Ainda não tem foto. Seja o primeiro." + CTA câmera); offline (banner "Sem sinal. Suas fotos sobem sozinhas quando voltar."); carregando (skeleton de cards).

### 5.2 Perfil do evento — repaginar `/cover`
- **Hoje:** `cover-screen.tsx`.
- **Alvo:** foto-herói full-bleed em degradê + versalete "Casamento" + **nome centralizado em serifada** + data; **cards de atalho** (Álbum/Missões/Convidados com número ao vivo); **coverflow de momentos**; atalho de música e "chamar convidados" (compartilhar). Nav flutuante.

### 5.3 Câmera — `/e/[slug]/photo`
- **Hoje:** `camera-screen.tsx`.
- **Alvo:** captura foto-first (câmera nativa, foto boa), **tira de filtros mostrando a foto real do convidado** em cada preset (LUT no cliente, ADR 0007 — sem IA generativa), filtro recomendado pelo casal em primeiro/destaque, ajustes (Luz/Calor/Contraste/Vinheta). Envio otimista → fila offline → confirmação "a foto amanhece". Botão de envio âmbar.
- **Invariante mantida:** EXIF removido no cliente antes do PUT presigned; servidor não toca bytes.

### 5.4 Álbum — `/e/[slug]/album`
- **Hoje:** `album-screen.tsx`.
- **Alvo:** grid imersivo (foto herói), **coverflow/seções de momentos**, abrir foto → detalhe com curtir(contagem)/comentar/salvar/compartilhar. Scroll infinito. Filtros por momento/missão em chips.

### 5.5 Feed detalhado / detalhe de foto — `photo-detail-screen.tsx`, `feed-screen.tsx`, `comment-screen.tsx`
- **Alvo:** detalhe da foto em tela cheia, **sheet de comentários**, curtidas com contagem e quem curtiu (sem drama: lista simples), compartilhar. Comentário passa por moderação e é escopado ao evento.

### 5.6 Missões — `/e/[slug]/missions`
- **Hoje:** `missions-screen.tsx`.
- **Alvo:** lista limpa, **numeral romano** (Missão III), progresso em filete, item cumprido com check. Mesma vibe (serifada nos títulos), foto de exemplo quando fizer sentido. CTA → câmera com a missão pré-selecionada.

### 5.7 Música — `/e/[slug]/music`
- **Hoje:** `music-screen.tsx`.
- **Alvo:** **playlist colaborativa** — convidado pede/adiciona música, vê a fila da festa, curte pedido dos outros. Estiloso, foto-first (capa). Escopado ao evento.

### 5.8 Minhas fotos / perfil do convidado — `/e/[slug]/my-photos`
- **Hoje:** `my-photos-screen.tsx`.
- **Alvo:** perfil do convidado — avatar, nome (serifada), suas fotos em grid, **o que está subindo** (fila com progresso), suas reações/comentários. Compartilhar suas fotos.

### 5.9 Entrada / QR + consentimento — `entry-screen.tsx`, `share-consent-screen.tsx`, `scanner-screen.tsx`
- **Alvo:** **nome em serifada grande** sobre um filete (o gesto de "assinar", não preencher cadastro); consentimento versionado e datado antes de qualquer captura; estados de QR (desconhecido, rotacionado, encerrado, não começou) com voz humana, nunca erro seco. Tema segue o sistema já aqui.

### 5.10 Confessionário — `/e/[slug]/confessional`
- **Alvo:** repaginar na mesma vibe (foto/áudio-first). Definir escopo exato na fase de implementação.

### 5.11 Compartilhar (transversal)
- **Alvo:** ação por foto (mandar pra fora — WhatsApp/Instagram/sistema) e "chamar convidados" no Perfil do evento (link/QR do evento). Respeita privacidade: link do evento não é indexável; nada de PII em querystring.

### 5.12 Composer de story/post (novo) — pós-captura
- **Alvo:** depois de tirar/escolher a foto (ou pelo "Você +" dos stories), o convidado monta a story/post **igual Instagram**:
  - **Texto/legenda** sobre a foto — overlay editável (fonte serifada/def do sistema), reposicionável; e/ou legenda abaixo do post.
  - **Música** — sticker de música anexado à story/post (faixa + trecho), tocando ao ver. Reaproveita o catálogo/estado da playlist colaborativa (§5.7).
  - Filtro (LUT, §5.3) aplicado antes.
  - Decide: **story** (efêmera, expira/rola no topo) vs **post no feed** (permanente no álbum).
- **Invariantes:** texto é conteúdo do usuário → validado e moderado; música e texto **degradam** (falha não bloqueia o envio da foto); EXIF já removido; nada de PII em log.

## 6. Mecânicas sociais — modelo de dados (esboço)

Novas tabelas/campos, todos com `event_id` + RLS forçado:
- `photo_reaction` (event_id, photo_id, guest_session_id, created_at) — contagem derivada; um por convidado por foto.
- `photo_comment` (event_id, photo_id, guest_session_id, texto, status_moderacao, created_at) — texto validado, moderado, escopado.
- `music_request` (event_id, guest_session_id, faixa, status, votos) — playlist colaborativa.
- `story` (event_id, guest_session_id, media_key, caption, music_track_id, expira_em, created_at) — efêmera; caption e música opcionais.
- `post` / campo em mídia (caption, music_track_id) — texto e música opcionais no post permanente do feed/álbum.
- Feed paginado por cursor (scroll infinito) — query sempre dentro do evento; nunca cruza eventos.

Caption e música anexada são conteúdo do usuário: validados, moderados, e **degradam** (não bloqueiam o envio da foto).

Migrations **forward-only**. Like/comentário/música **degradam** — falha neles não derruba o upload nem o feed.

## 7. Fora de escopo (desta rodada)
- Admin, ops, telão (o padrão pode se estender depois, milestone própria).
- App nativo (Expo) — só web PWA agora.
- IA generativa em mídia (proibido — ADR 0007 permanece).

## 8. Fases de implementação (visão)
1. **Fundação visual + tema** — tokens de tema claro/escuro + toggle + persistência; componentes base (nav flutuante, card de foto, story, foto-herói, sheet).
2. **Home + Perfil do evento** — as duas telas âncora.
3. **Câmera + envio** — captura, filtros, fila otimista.
4. **Álbum + detalhe + social** (curtir/comentar/compartilhar) + modelo de dados + moderação.
5. **Missões + Música + Minhas + Entrada** — repaginar no padrão.
6. **Canon** — atualizar CLAUDE.md, DESIGN.md, ADR novo; guards e testes (isolamento, tokens) verdes.

Gate de qualidade mantido: cobertura ≥90% no pipeline de upload; guards de isolamento e tokens bloqueantes desde o primeiro commit.
