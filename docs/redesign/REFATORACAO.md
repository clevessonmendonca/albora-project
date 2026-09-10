# Álbora — Refatoração para o redesign v4 (guia de implementação)

> **Para o agente/dev que vai implementar.** Este documento traduz o redesign (protótipos em `docs/redesign/prototipos/`) para o código atual. Cobre **dois fluxos fechados**: **Onboarding (criar evento)** e **Experiência do convidado**. O **Telão** ([`telao.md`](./telao.md)), o **QR + Kit de materiais** ([`kit.md`](./kit.md)), a **Identidade / Aparência** ([`identidade.md`](./identidade.md)), o **Painel do anfitrião** ([`painel.md`](./painel.md)), o **Fornecedor / portal white-label** ([`fornecedor.md`](./fornecedor.md)) e o **Console do operador** ([`console.md`](./console.md)) também estão fechados, em docs próprios.

## 0. Como usar

- Os `.html` em `prototipos/` são **referência visual e de interação**, não código para copiar. São protótipos estáticos (fotos IA embutidas como data-URI, estado fake em JS). **Não porte o JS deles.**
- **Reaproveite a mecânica que já existe** (upload presigned, fila offline, EXIF, LUT, consentimento versionado, sessão opaca, packs, tokens). O redesign é de **UX/UI e arquitetura de telas**, não de infraestrutura.
- Fonte da verdade de design: [`design-system-v3.md`](./design-system-v3.md). Tokens vêm de `@albora/tokens`; strings de domínio, de `@albora/packs`. **Zero hex hardcoded em componente, zero string de domínio no core** (guards de CI).
- Trabalhe **tela por tela**, cada uma numa MR pequena, com teste. Não faça um PR gigante.

## 1. Não-negociáveis (CLAUDE.md) — valem em todo o redesign

- **Convidado nunca faz login para participar.** A primeira foto nunca passa por auth. Login/identidade é **tardio e opcional** (só para retenção — receber o álbum depois).
- **Servidor não toca nos bytes.** Upload é PUT presigned direto no storage. EXIF removido **no cliente** antes do upload (GPS nunca sobe).
- **Caminho crítico = storage + Postgres.** Todo o resto degrada, nunca bloqueia. Fila offline + retry são obrigatórios.
- **IA generativa nunca toca a mídia do convidado.** Filtros são **LUT no cliente** (determinístico, idêntico em todas as fotos). Classificação/moderação por IA é permitida fora do caminho crítico.
- **Isolamento por evento**: RLS forçado, `SET LOCAL app.event_id`, chaves de storage derivadas no servidor (`events/{event_id}/...`).
- **Consentimento versionado e datado por sessão**, antes de qualquer captura (`packages/core/src/consent-versions.ts` é a fonte única).
- **Tokens de identidade**: cor/fonte/capa resolvem via um resolvedor só (web/telão/PDF). Nenhum hex em componente.
- **Sessão do convidado**: token opaco, assinado, escopado a UM evento, não transferível.
- **PII nunca em log cru.** Nome/telefone/e-mail mascarados.

---

## 2. Fluxo A — Onboarding (criar evento)

Protótipo: `prototipos/onboarding-criar-evento.html` (abre na tela de login; barra "prévia" no topo alterna estados só para revisão).

### 2.1 Código atual (mapa)

- **Login (magic link, único método):** `apps/web/app/admin/sign-in/page.tsx` → `features/admin/components/client/sign-in-form.tsx`; use-cases `lib/application/use-cases/admin/issue-magic-link.ts` e `consume-magic-link.ts`; handler `lib/api/handlers/admin-auth.ts` (`/api/admin/entrar`, `/api/admin/sessao`, `/api/admin/sair`); cookie em `lib/host-session.ts`. Google SSO **não existe** para auth (só OAuth do Drive para export).
- **Criar evento:** `apps/web/app/admin/new/page.tsx` (guard: sem sessão → redirect `/admin/sign-in?next=/admin/new?plano=...`) → `features/admin/components/client/create-event-wizard.tsx` (passos atuais: título/data → identidade → missões → telão → peças), tema neutro `adminVars()`.
- **Entrada:** landing CTA "Criar meu evento" → `/admin/new?plano=free` (`HREF_CRIAR_GRATIS`).
- **Packs/tokens:** `resolvePackText`, `@albora/tokens`.

### 2.2 Alvo do redesign

**Ordem do fluxo:** Landing → (clica criar) → **cria sem cadastro** → salva com e-mail no fim (delayed auth). Login-antes continua existindo para **usuário recorrente** (magic link + opção Google).

**Wizard reduzido a 3 passos** (era 5): **01 Evento → 02 Aparência → 03 Pronto**.

1. **Evento** — tipo do evento (cards foto-first: Casamento, Aniversário, Formatura, Corporativo, Celebração, Outro; ícones Lucide, sem emoji) + **nome** + **data (date picker nativo)**. Ao escolher o tipo, banner de confiança: *"Preparamos tudo pra um casamento — momentos, missões e telão. Você muda depois."* Fuso/idioma **auto-detectados** (não pedir). Local e momentos ficam em "mais detalhes" / são smart-default (não ocupam o caminho principal).
2. **Aparência** — **liderar pelo resultado**: escolher um **estilo** (Editorial/Minimal/Contemporâneo/Fotográfico/Clássico) por preview real; só então "Personalizar" revela **combinações de cor** (não "principal/secundária" — pares harmônicos + "criar minha combinação" com picker e **paleta extraída da foto**), capa e fonte. Duas cores do evento (`--ev` + `--ev-2`).
3. **Pronto** — recompensa: capa final + "Ana & João está pronto." + **e-mail como acesso** (*"Pra onde enviamos o acesso do seu evento?"* — sem linguagem de senha/cadastro) + "Ir para meu evento". Hierarquia: 1 ação primária, secundárias (Compartilhar / Ver como convidado), terciário ("Configure depois: Missões · Telão · QR · Equipe").

**Preview ao vivo persistente** (§ centro do onboarding): coluna à direita no desktop; no mobile vira **"Ver prévia"** (sheet) fora da Aparência, e inline compacto na Aparência. Abas **Convidado · Telão · Álbum** — muda de superfície; título/foto/cor atualizam na hora (manipulação direta: tocar no título edita, tocar na foto troca).

**Teclado (Linear):** número seleciona tipo/estilo, Enter avança, ⌫ volta. **Validação** antes de avançar (nome/data).

### 2.3 Arquivos a tocar / criar

- Reescrever `create-event-wizard.tsx` para 3 passos + preview persistente. Extrair componentes: `TypePicker`, `AppearanceStep` (style-first + `ColorCombos` + palette-from-photo), `LivePreview` (Convidado/Telão/Álbum), `ReadyStep`.
- **Delayed auth:** hoje `/admin/new` exige sessão. Criar caminho anônimo: o wizard roda sem sessão; no ReadyStep, capturar e-mail → emitir magic link (reusar `issue-magic-link.ts`) → persistir evento. Ajustar guard de `app/admin/new/page.tsx` (não redirecionar de cara). **Documentar como hipótese A/B** (a ordem atual continua válida como fallback).
- **Google SSO (novo, opcional):** se for adotado, é feature nova (provider + callback + sessão). Enquanto não houver, o botão "Continuar com Google" fica atrás de flag ou some. Magic link é o caminho garantido.
- **Tipos de evento**: hoje pack só casamento/15-anos. Expandir vocabulário via **packs** (nunca hardcode). Momentos default por tipo vêm do pack.
- Cor do evento: estender o resolvedor de tokens para **duas cores** + derivação de rampa com contraste AA (a engine do protótipo `applyEvent`/`applyEvent2` mostra as regras: hover = mix 16% preto; `--ev-on` por contraste; soft/tint/border por alpha).

### 2.4 Copy (usar)
- Login: "Entrar no painel" · "Enviaremos um link de acesso para o seu e-mail. Nenhuma senha necessária." · "Enviar link" → "Verifique seu e-mail" · "Se houver uma conta associada, o link já está a caminho." → "Confirmar acesso".
- Passo 2 CTA: "Tudo pronto →". Passo 3: "Seu evento está pronto." / "Pra onde enviamos o acesso do seu evento?" / "Sem senha — um link de acesso no seu e-mail." / "Você montou tudo isso sem criar conta."

### 2.5 Estados
default/hover/focus/pressed/selected/disabled/loading/erro; validação inline; autosave onde fizer sentido ("Salvo ✓").

---

## 3. Fluxo B — Experiência do convidado

Protótipo: `prototipos/convidado.html` (mobile-first; no desktop aparece num frame de celular; barra "prévia" alterna espelho/completo e offline).

### 3.1 Código atual (mapa)

- **Rotas** `apps/web/app/e/[slug]/**`: `page.tsx` (resolve estado do evento + `EntryFlow` ou `HomeContent`), `cover`, `feed`, `album`, `my-photos`, `missions`, `music`, `photo` (câmera→editor→upload), `confessional`, `g/[autorId]` (perfil de outro convidado), `pair` (telão). Layout `app/e/[slug]/layout.tsx` (tema anti-flash, PWA manifest, pill da fila de upload, banner offline, toasts).
- **Componentes**: `features/guest/components/client/entry-flow.tsx` (nome + consentimento), `features/cover/.../cover-page.tsx`, `features/home/.../home-page.tsx` (`StoryRail`, `MissionsCue`, `HomeFeedCard`, `FloatingNav`), `features/feed/**` (`PhotoCard`, `MirrorGrid`, `CommentSheet`), `features/my-photos/**` (grid + `RecapCard`/`RecapSheet` + colagem + `ShareConsentSheet`), `features/missions/**`, `features/guest-profile/**` (`ProfileHeader`/`ProfileStats`/`PhotoGrid`), `features/photo/components/steps/*` (Camera → Editor → Details → Upload → Success). UI compartilhada: `packages/ui-web/src/photo-card.tsx`, `story-rail.tsx`, `story-viewer.tsx`, `comment-sheet.tsx`.
- **Mecânica**: EXIF `packages/core/src/exif.ts` + `processar.ts` (rotaciona por orientação, re-encoda → apaga EXIF); fila `packages/core/src/fila.ts` (`MAX_ATTEMPTS=6`, backoff) + `apps/web/lib/queue.ts` (IndexedDB) + drain em `features/guest/lib/funnel-from-drain.ts`; presign `app/api/uploads/presign/route.ts` + `confirm` + `lib/r2.ts`; LUT `features/photo/components/client/editor-lut.ts` + `@albora/core` (`aplicarAjustes`, `paraFiltroCss`); consentimento `packages/core/src/consent-versions.ts` (`CONSENTIMENTO_ENTRADA_VIGENTE="v1"`, `CONSENTIMENTO_EXTERNO_VIGENTE="externo-v1"`); sessão `packages/db/src/sessions.ts` + `token.ts` + `features/guest/data/guest-session.ts` (`isSameEventSession`).
- **Já é "instagram"**: feed com curtir/comentar/compartilhar/salvar, stories + viewer, perfis com stats, my-photos + recap, comentários com denunciar/bloquear, bottom nav. **Preserve isso** — o redesign eleva acabamento e muda a arquitetura de entrada/compartilhamento, não recria a rede social.

### 3.2 Alvo do redesign (mudanças por tela)

**Chegada (`cover` / entrada):** puramente emocional. Capa full-bleed + "Você foi convidado para {nome}" + data/local + **"Entrar na festa"** + "Sem app · sem cadastro · sem baixar nada". **Remover o recado daqui.**

**Identidade tardia (mudança estrutural):** "Entrar na festa" → **feed imediatamente, sem nome/consentimento**. Pedir nome + consentimento só na **1ª ação que precisa de identidade** (enviar foto, curtir, comentar, missão) via **sheet** `EntryFlow` repaginado. Depois disso, nunca mais no aparelho (usar `isSameEventSession`). Consentimento leve no momento da 1ª publicação: *"Suas fotos poderão aparecer no álbum e no telão deste evento."* + "Ver detalhes" (texto completo mantido, versão `v1`).

**Recado = conteúdo, não login:** vira **Story dos anfitriões** (primeiro na `StoryRail`, anel especial + selo de áudio) — no código, o "host message" do cover + o Recado do admin. Abre em fullscreen com play do áudio.

**Home/Feed:** entra direto no conteúdo (stories → feed), sem título "Início". Ações do `PhotoCard` **enxutas**: **curtir + comentar + •••** (compartilhar/salvar/denunciar dentro do ••• — salvar do convidado é secundário). Gate espelho/completo mantido (ADR 0009): em "espelho", sem comentários + banner *"Comentários abrem no horário escolhido pelos anfitriões…"*. "no telão agora" **contextual** (aparecer principalmente após a pessoa enviar).

**Stories:** redondos (IG), **borda gradiente = não visto**, cinza = visto; `StoryViewer` com barras de progresso, auto-avança, tap/swipe (já existe — manter e polir).

**Câmera central (FAB) + captura:** **não construir câmera própria** que compita com a nativa. Fluxo: **Tirar foto / Escolher da galeria** → **Composer** (pós-captura):
- foto grande + **filtros LUT** (Original, Álbora, Quente, Filme, Clássico, Suave, Vibrante, Frio, P&B — no cliente, ver `editor-lut.ts`) com prévia;
- **legenda** ("Escreva algo sobre esse momento…");
- **Identidade da festa** (liga/desliga a **assinatura discreta** na foto — ver §3.3);
- **Marcar pessoas/noivos** (sheet: "Ana & João · os noivos" no topo + convidados);
- missão marcada (badge) quando veio de uma missão;
- **Publicar na festa**.

**Missões → câmera:** tocar numa missão abre a captura **com a missão marcada** (badge no composer). Missões pertencem à experiência do evento (não fixas dentro de Convidados). Tom menos checklist ("Você já completou 2 — bora achar as próximas?").

**Depois de publicar (recompensa):** "Sua foto entrou na festa" + "✓ No álbum · ✓ Pode aparecer no telão" + **Compartilhar nas redes** (primária) · Tirar outra · Ver no feed.

**Compartilhamento externo com identidade da festa (feature central nova):** sheet com **prévia real** da imagem composta — **assinatura discreta do casal** ("Ana & João · 12.10.2026") + **logo Álbora minúscula** no canto (a foto continua protagonista); **templates** (Com assinatura / Original / **Story 9:16** / **Feed 1:1**); **redes** (Instagram/WhatsApp/Facebook/TikTok/Mais) via **`navigator.share`** (Web Share) e, quando o SO permitir, atalhos diretos; **privacidade** em linguagem humana ("pode incluir outras pessoas que aparecem"). Vale para foto, e depois: **recap** ("A festa pelos seus olhos"), **momento**, **álbum**. Molduras adaptadas por rede. Assinatura **opcional/configurável** pelo casal, ligada por padrão quando fizer sentido. Respeitar `ShareConsentSheet` / `externo-v1`.

**Álbum:** distinto do feed (feed = agora; álbum = tudo). Filtros simples: **Todas · Favoritas · Momentos · Pessoas** (Stories = consumo acima do grid, **não** filtro). Lightbox: curtir/favoritar/comentar/compartilhar/ver pessoa/ver momento/baixar.

**Favoritas:** coração discreto; vira coleção própria (base para baixar favoritas / seleção / álbum impresso).

**Convidados/Pessoas:** menos CRM — cards com foto + nome + nº de registros; tocar abre o perfil (grid da pessoa). Descobertas ("quem mais registrou", "primeira foto", "ficou até o fim") só com dado real.

**Perfil "Você" (bottom nav renomeado de "Minhas"):** foto editável + nome + **Editar perfil**; card **"Salve suas fotos e receba o álbum"** → **login de retenção** (magic link + Google) — captura de e-mail **opcional**, para mandar o álbum depois. Um nudge suave de login **durante a navegação** (ex.: após a 1ª publicação, pulável). Contém: suas fotos, suas missões, **Recap** ("A festa pelos seus olhos", compartilhável).

**Bottom nav:** Início · Missões · **[câmera]** · Álbum · **Você**. Respeitar safe areas; alvos ≥44px; ações principais a um toque (mobile durante a festa é prioridade máxima).

### 3.3 Assinatura de compartilhamento (implementação)
- Gerar a composição **no cliente** (canvas) a partir da foto já processada: foto + faixa/assinatura tipográfica (nomes + data do evento, tokens do pack) + logo Álbora pequena, baixo contraste, fora de áreas cobertas pela UI de cada rede.
- Formatos: Story 1080×1920, Feed 1080×1080, e original. Vídeo (futuro): assinatura só no último segundo, sem logo sobreposta o tempo todo.
- Entregar via `navigator.share({files})` quando suportado; fallback: baixar + instruções. Nunca marca d'água central; nunca sobre rostos.

### 3.4 Copy (usar — pt-BR, do código atual + redesign)
- Entrada: "Você foi convidado para {nome}" · "Entrar na festa" · "Sem app · sem cadastro · sem baixar nada".
- Identidade (1ª ação): "Antes da sua primeira foto…" · "Como você quer aparecer? Só o primeiro nome." · placeholder "Tio João" · "Continuar".
- Publicar: "Publicar na festa" · sucesso "Sua foto entrou na festa" / "✓ No álbum" / "✓ Pode aparecer no telão".
- Compartilhar: "Compartilhar nas redes" · privacidade "Pode incluir outras pessoas que aparecem na foto."
- Vazios (manter os do código): "Ainda não tem foto aqui." / "Seja o primeiro a fotografar."; My Photos "Suas fotos vão aparecer aqui".
- Retenção: "Salve suas fotos e receba o álbum" · "Sem senha. Só pra guardar o que é seu — e mandar o álbum depois."

### 3.5 Estados de borda (todos precisam existir — vários já no código)
QR inválido / código trocado ("Esse código foi trocado…"), evento não começou, encerrado ("Essa festa já foi… 48h depois do fim"), sem sessão, sessão expirada ("Sua entrada expirou. Escaneie o QR da mesa de novo."), **offline** (banner "suas fotos sobem sozinhas quando voltar"), permissão de câmera negada, upload falhando (retry visível, `RetrySection`), conteúdo removido, galeria/feed/stories vazios, muitas fotos (virtualização/skeleton), **compartilhamento cancelado**, rede social indisponível → fallback nativo, formato incompatível (HEIC: aviso já existe), foto sem permissão de compartilhamento externo ("Os anfitriões escolheram manter este momento apenas no Álbora."), falha ao gerar a imagem de compartilhamento.

---

## 4. Ordem de implementação sugerida

Foco em **adoção → durante → retenção**:

1. Onboarding: passo 1 (Evento) + preview persistente
2. Onboarding: passo 2 (Aparência style-first + combinações de cor)
3. Onboarding: passo 3 (Pronto + e-mail-como-acesso) + delayed auth (atrás de flag/A-B)
4. Login (magic link repaginado; Google atrás de flag)
5. Convidado: chegada + identidade tardia
6. Convidado: recado como story
7. Convidado: composer (filtros + legenda + marcar + identidade)
8. Convidado: compartilhamento com identidade + templates + `navigator.share`
9. Convidado: feed enxuto + stories seen/unseen + missões→câmera
10. Convidado: perfil "Você" + login de retenção
11. Convidado: álbum (Favoritas) + recap compartilhável
12. Estados de borda (varredura final)

## 5. Checklist por tela (Definition of Done)

Para cada tela: [ ] tokens (zero hex) · [ ] copy do pack (zero domínio hardcoded) · [ ] mobile real (não só media query) · [ ] estados (loading/erro/vazio/sucesso) · [ ] a11y AA (contraste, foco, teclado, alvos ≥44px, reduced-motion, estado não só por cor) · [ ] não quebra os não-negociáveis (§1) · [ ] teste (unit + e2e do caminho crítico) · [ ] guards de CI verdes (isolamento, tokens, domínio, packs, sessão).

## 6. Gates (CLAUDE.md)
- Cobertura ≥60% global, **≥90% no pipeline de upload** (MVP). Guards de isolamento e de tokens são **bloqueantes desde o primeiro commit**.
- Nada de rebaixar gate para deixar CI verde.
- Migrations forward-only. Nunca commitar segredo.

---

### Anexos
- `design-system-v3.md` — tokens, tipografia, cor (2 camadas + engine), ícones, motion, componentes, estados.
- `prototipos/onboarding-criar-evento.html` — fluxo A (login + criar).
- `prototipos/convidado.html` — fluxo B (convidado).
- `prototipos/painel-anfitriao.html` — painel (referência, em iteração; **não** implementar ainda).
- `prototipos/fornecedor-completo.html` — landing, onboarding, portal, evento, marca, equipe, cobranças e checkout do fornecedor.
