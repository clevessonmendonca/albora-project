# Entrega das fotos ao convidado — design

**Data:** 2026-09-06
**Status:** design pronto para plano de implementação
**Branch:** `feat/entrega-fotos` (a partir de `stable`)
**ADR:** [0019](../../adr/0019-entrega-das-fotos-ao-convidado.md) · **Depende de:** [0018](../../adr/0018-sso-google-e-convidado-reivindica-fotos.md) (vínculo `guest_contacts` verificado)

## 1. O problema

O SSO (ADR 0018) grava `guest_contacts` verificado (Google ou magic link), mas nada é entregue. Este design constrói a entrega: **o convidado que reivindicou recebe, quando o casal libera, um link para uma galeria das próprias fotos** — e adiciona o caminho **magic link do convidado** que o 0018 deixou como incremento.

## 2. O que este design NÃO é

- **Não empacota mídia no servidor.** O e-mail leva um link; o object storage serve os bytes via GET presigned. ("Servidor nunca toca nos bytes.")
- **Não dá conta ao convidado.** O magic link do convidado grava `guest_contacts` verificado e nada mais — nunca `accounts`, nunca cookie de host (blindagem do 0018, Decisão 2).
- **Não entrega a galeria do evento inteiro.** Só as fotos da sessão que reivindicou.
- **Não toca o caminho crítico.** O envio de e-mail degrada e re-tenta; falha de entrega nunca derruba upload nem nada.

## 3. Superfícies e camadas (ADR 0016)

| Camada | Arquivos | Responsabilidade |
|---|---|---|
| `packages/db` | migrations + repos | `delivery_tokens`, `guest_magic_links`, `events.delivery_opens_at`, purga na retenção; mint/resolve de tokens |
| `packages/application` | use-cases | resolver destinatários, montar e enviar entrega (idempotente), emitir/consumir magic link do convidado, abrir galeria por token |
| `apps/web/app` | rotas/páginas | galeria pública `/g/[token]`, rotas do magic link do convidado, toggle do gate no admin |
| e-mail | `apps/web/lib/infrastructure/email` (`sendHostEmail`) | transporte Resend, já degrada; injetado como porta no use-case de envio |

## 4. Migrations (forward-only)

```sql
-- events.delivery_opens_at: o gate do casal. NULL = entrega fechada.
ALTER TABLE events ADD COLUMN delivery_opens_at timestamptz;

-- delivery_tokens: link opaco assinado, escopado a UMA sessão-de-evento.
CREATE TABLE delivery_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- SEM RLS (migration 0071): porta de entrada resolvida por token_hash antes de haver contexto, na allowlist FORA_DA_RLS — mesma disciplina de session_tokens.

-- guest_magic_links: prova de posse por e-mail p/ o convidado. NUNCA toca accounts.
CREATE TABLE guest_magic_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  email       text NOT NULL,          -- PII: mascarada em log, apagada pela retenção
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- SEM RLS (migration 0071): porta de entrada, hash-keyed, single-use; na allowlist FORA_DA_RLS.

-- entrega feita, p/ idempotência: um contato entregue não re-dispara.
ALTER TABLE guest_contacts ADD COLUMN delivered_at timestamptz;
```

Retenção (`retention-jobs.ts` `purgarAcervo`, D365): adicionar `DELETE`/anonimização de `guest_contacts`, `delivery_tokens`, `guest_magic_links` do evento — hoje `guest_contacts` só cai pela cascade de conta, não pela purga d365 do acervo; esta é a lacuna que o ADR 0019 fecha.

## 5. Use-cases (`packages/application`)

- **`resolveDeliveries(pool, eventId): Promise<{sessionId, email}[]>`** — só se `delivery_opens_at` passou; lista `guest_contacts` verificados (`verified_at NOT NULL`) com `delivered_at IS NULL`. Sob `withEvent` (RLS).
- **`issueDeliveryToken(pool, segredo, eventId, sessionId): Promise<{token}>`** — `emitirToken`, grava `delivery_tokens`, TTL configurável (default 30 dias). Reusa `token.ts`.
- **`sendGuestDelivery(deps, {eventId, sessionId, email})`** — injeta `sendEmail` (porta) e `issueDeliveryToken`; monta URL `/g/{token}`, envia, e **só marca `delivered_at` se `enviado === true`** (degradação: envio falho re-tenta no próximo run). E-mail nunca loga o endereço cru.
- **`runDeliveryForEvent(deps, eventId)`** — orquestra: gate → resolve → para cada destinatário `sendGuestDelivery`. Idempotente por `delivered_at`. Off critical path; erro por destinatário não aborta os outros.
- **`openGuestGallery(pool, segredo, token): Promise<GaleriaEntrega>`** — `assinaturaValida` → resolve `delivery_tokens` (vivo, não revogado, não expirado) → `listarMinhasDoEvento(sessaoId)` → GETs presigned via `signableKeys` (respeita `panic`/`published`). Token inválido/expirado → erro tratado, página "link expirado".
- **`emitGuestMagicLink(pool, segredo, {eventId, guestSessionId, email})`** — revalida sessão viva (`isGuestSessionLive`); `emitirToken`; grava `guest_magic_links`. Retorna token p/ o e-mail. **NUNCA** `accounts`.
- **`verifyGuestMagicLink(pool, segredo, token)`** — `assinaturaValida` → consome `guest_magic_links` (single-use, `used_at IS NULL … RETURNING`) → `claimGuestPhotosByEmail`-equivalente com `verified_via='magic_link'`. Blindado igual ao caminho Google.

`claimGuestPhotosByEmail` ganha um parâmetro `verifiedVia: 'google'|'magic_link'` (hoje fixo `'google'`), p/ os dois caminhos compartilharem o upsert atômico da migration 0069.

## 6. Rotas / páginas (`apps/web/app`)

- **`GET /g/[token]`** — página pública, sem login. Renderiza `openGuestGallery`. Sem token / expirado → estado "link expirado, peça de novo". Segue o design system Albora (tokens do casal do evento).
- **`GET /auth/guest-magic/start`** — dentro de uma sessão de convidado viva, recebe o e-mail digitado, `emitGuestMagicLink`, envia e-mail com o link de callback. `returnTo` interno validado (§8 do design SSO).
- **`GET /auth/guest-magic/callback?token=…`** — `verifyGuestMagicLink`, volta pra tela do convidado com "e-mail confirmado". Blindado: nunca sessão de host.
- **Admin**: toggle "liberar entrega das fotos" no painel do evento, grava `delivery_opens_at`. Disparo do `runDeliveryForEvent` por job/cron (fora do caminho crítico), acionável também manualmente pelo admin.

## 7. Segurança / privacidade

- **Token de entrega** opaco, assinado, single-scope (event+session), revogável, TTL curto. Não é transferível entre sessões.
- **Galeria** só serve `state='published'` e morre sob `panic` (via `signableKeys`); GET presigned com `X-Amz-Expires` curto por foto.
- **Magic link do convidado** single-use, TTL 15 min (igual host), blindado contra `accounts`/host session — teste de review por varredura de fonte (como o claim do 0018).
- **PII:** e-mail nunca em log cru; `guest_contacts`/`delivery_tokens`/`guest_magic_links` apagados pela retenção.
- **Isolamento:** `guest_contacts` tem `event_id` + RLS FORCED normal. `delivery_tokens` e `guest_magic_links` são portas de entrada — resolvem por `token_hash` antes de haver contexto de evento — e por isso ficam FORA da RLS (migration 0071), na allowlist `FORA_DA_RLS`, mesma disciplina de `session_tokens`/`oidc_states`: o `token_hash` assinado e indevassável é a capability, um hash pertence a um evento só, e não há query de listagem.
- **Degradação:** `sendEmail` falho → `delivered_at` não marca → re-tenta. Sem Resend configurado, entrega degrada e loga `aviso.omitido`, não quebra.

## 8. Não-negociáveis carregados

- Servidor nunca empacota mídia; link + object storage.
- IA generativa não toca as fotos (ADR 0007).
- Convidado não vira conta; magic link do convidado nunca cria `accounts` nem emite host session (ADR 0018).
- Entrega abre só por gate do casal.
- `guest_contacts`, `delivery_tokens`, `guest_magic_links` cumpridos pela retenção.
- Nenhum hex hardcodado na galeria — tokens do evento.

## 9. Critério de sucesso

- Um convidado que reivindicou (Google ou magic link) recebe, depois que o casal libera, um e-mail com um link; o link abre uma galeria só das fotos que ele subiu, sem login, e cada foto vem do object storage.
- O casal com a entrega fechada não dispara nada; abrir o gate dispara uma vez por destinatário e não re-dispara.
- Nenhum caminho do convidado cria conta, emite host session, cruza eventos, ou serve foto não-publicada / sob panic.
- Resend fora do ar degrada a entrega e re-tenta; nada no caminho crítico do sábado 20h depende disto.
