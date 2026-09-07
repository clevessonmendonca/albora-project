# SSO Google (OIDC) — design de autenticação por Google nas três superfícies

**Data:** 2026-09-06
**Status:** design aprovado, pronto para plano de implementação
**Branch:** `feat/sso-google` (a partir de `stable`)
**ADR:** [0018](../../adr/0018-sso-google-e-convidado-reivindica-fotos.md)

## 1. O problema

A Albora autentica por um mecanismo só: magic link → token opaco assinado → cookie próprio, com RLS por sessão. O dono quer **"Entrar com Google"** como opção adicional (não substituta) para quem tem login, e quer que o **convidado possa reivindicar as próprias fotos** de um evento, se quiser, sem que isso vire conta.

Este documento desenha o SSO Google por OIDC direto, reusando as sessões que já existem, nas três superfícies.

## 2. O que este design NÃO é

- **Não troca o modelo de auth.** O magic link continua; o Google é um botão a mais. O cookie e a sessão emitidos são os que já existem.
- **Não é biblioteca de auth nem serviço externo.** OIDC direto (ADR 0018, Decisão 1). Sem NextAuth, sem Clerk/WorkOS.
- **Não dá conta ao convidado.** Reivindicar grava um contato verificado na sessão-de-evento; não cria `accounts`, não emite cookie de host, não cruza eventos.
- **Não constrói a entrega das fotos.** O SSO resolve o *vínculo* (e-mail verificado ↔ sessão do evento). Mandar as memórias usando esse contato é outra frente.

## 3. Três substratos, uma porta OIDC

| Superfície | Sessão que já existe | O que o Google produz |
|---|---|---|
| **Host** (anfitrião/fornecedor) | `accounts` + cookie `albora_host` | Resolve/cria `accounts` por e-mail → emite `albora_host` |
| **Staff** (equipe) | `staff_users` + cookie `albora_staff` | Loga **só** se e-mail já em `staff_users` ativo → emite `albora_staff` |
| **Convidado** | `guest_sessions` (por-aparelho, escopo evento) | Grava `guest_contacts` verificado; **nenhuma** sessão nova |

## 4. Fluxo OIDC comum

Duas rotas, reusadas pelas três superfícies:

- **`GET /auth/google/start`** — monta a URL de autorização do Google (`openid email`, `prompt=select_account`), com `state` assinado e `nonce`, e redireciona.
- **`GET /auth/google/callback`** — recebe `code` + `state`, valida, troca por tokens, valida o `id_token`, e roteia por superfície.

### 4.1 O `state` assinado

`state` é um valor opaco assinado (mesmo padrão de `emitirToken`/`assinaturaValida` de `packages/db/src/token.ts`, com `SESSION_SECRET`) carregando:

```
{
  surface: "host" | "staff" | "guest",
  nonce: string,                 // casado com o nonce do id_token, anti-replay
  returnTo: string,              // path INTERNO de retorno; validado (§8)
  eventId?: string,              // só guest — de qual evento
  guestSessionId?: string        // só guest — qual sessão reivindica
}
```

O `state` tem TTL curto (10 min) e é de uso único — o servidor guarda o hash do `nonce` até o callback consumir, para impedir replay do callback.

### 4.2 Validação do `id_token` (inegociável)

O callback só prossegue se **todas** valerem:

- Assinatura verificada contra o **JWKS do Google** (chaves buscadas e cacheadas; nunca aceitar `alg: none`).
- `iss` ∈ `{https://accounts.google.com, accounts.google.com}`.
- `aud` == o `client_id` do **client OIDC dedicado de login** (não o do Drive).
- `exp` no futuro, `iat`/`nbf` coerentes.
- `nonce` == o do `state`.
- **`email_verified === true`** — e-mail não verificado é rejeitado sem exceção (ADR 0018). É o que impede sequestro de identidade.

Falha em qualquer uma: rejeita, grava `security_events` (`login.failed` para staff; equivalente para host), e volta ao login com erro genérico.

### 4.3 Client OIDC dedicado

Um client OAuth **separado** do Drive, escopo mínimo `openid email`. Config por env (`GOOGLE_OIDC_CLIENT_ID`, `GOOGLE_OIDC_CLIENT_SECRET`, `GOOGLE_OIDC_REDIRECT_URI`), **nunca commitada** (`.env.example` documenta). Login não pede acesso a API do Google, então **nenhum** access/refresh token do Google é guardado — diferente do vault do Drive.

## 5. Host

- Botão "Entrar com Google" na tela de login do host, ao lado do campo de magic link.
- `start` com `surface: "host"`.
- Callback: e-mail verificado → `INSERT INTO accounts (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id` — **a mesma semântica de `emitirMagicLink`** (host-auth.ts). Cria a conta se o e-mail é novo, resolve se existe.
- Emite o cookie `albora_host` reusando `host-session.ts`. Zero conceito de conta novo — o e-mail é a chave, como sempre foi.
- `returnTo` interno (default `/admin`).

## 6. Staff

- Botão "Entrar com Google" em `/console/login`, ao lado do magic link.
- `start` com `surface: "staff"`.
- Callback: e-mail verificado → `findStaffByEmail` (packages/db/src/staff.ts) →
  - existe **e** `status = 'active'` → emite `albora_staff` (reusa `staff-session.ts`, com o mesmo endurecimento: idle, absoluto, rotação).
  - não existe, ou suspenso → **nega**. Nunca cria staff (staff nasce por convite/`staff.manage`). Grava `security_events` `kind = 'login.failed'`, `metadata: { surface: "staff_google" }`, sem e-mail cru.
- **Sem restrição de domínio** (decisão do dono): qualquer Google cujo e-mail já esteja em `staff_users` entra. O ADR 0018 registra a restrição de domínio como endurecimento futuro.
- Mensagem de negação **não revela** se o e-mail existe em `staff_users` — "este acesso não é da equipe", genérico.

## 7. Convidado — reivindicar as próprias fotos

A superfície mais sutil, e a que mais precisa de blindagem.

### 7.1 Onde aparece

- **Nunca na primeira foto.** Aparece **depois** — na confirmação da primeira foto, ou numa tela "receber minhas fotos". Opcional, sempre. A H1 fica intacta.
- Exige uma **sessão de convidado ativa** (o convidado já escaneou o QR, consentiu, está naquele evento). O `start` só é oferecido dentro de uma sessão de convidado válida, e carrega `eventId` + `guestSessionId` dessa sessão no `state`.

### 7.2 O que o callback faz — e o que NÃO faz

Callback com `surface: "guest"`:

1. Revalida a sessão de convidado (`eventId` + `guestSessionId` do `state` correspondem a uma `guest_session` viva daquele evento).
2. E-mail verificado → grava/confirma `guest_contacts (event_id, session_id, channel = 'email', value = <email>)`, marcado como **verificado** (ver §7.3).
3. Volta para a tela do convidado. **Fim.**

**NUNCA:**
- cria `accounts`;
- emite cookie `albora_host` nem qualquer sessão de host;
- dá identidade que cruza eventos;
- guarda token do Google.

O convidado continua sendo a mesma sessão anônima de antes — só que agora com um contato de e-mail verificado ligado a ela. **Regra de review:** qualquer código no caminho `surface: "guest"` que emita sessão de host ou toque `accounts` é defeito bloqueante (ADR 0018, Decisão 2).

### 7.3 Migration mínima

`guest_contacts` já existe. Precisa de duas coisas:

```sql
ALTER TABLE guest_contacts ADD COLUMN verified_at timestamptz;
ALTER TABLE guest_contacts ADD COLUMN verified_via text
  CHECK (verified_via IN ('google', 'magic_link'));
```

O `channel` já aceita texto livre (`'email'`). `verified_at`/`verified_via` distinguem um contato **verificado** (posse de e-mail provada) de um contato só digitado — a entrega deve preferir o verificado.

### 7.4 Magic link do convidado (paralelo)

Como o dono também mencionou magic link para o convidado: seria o mesmo vínculo, por e-mail em vez de Google (`verified_via = 'magic_link'`). O Google fere menos a regra "nunca recebe e-mail" (OAuth não manda e-mail de ida), mas ambos ficam disponíveis; a entrega das fotos por e-mail é o próprio objetivo do vínculo. **Escopo:** este design implementa o caminho **Google** do convidado; o magic link do convidado, se desejado, reusa a mesma gravação de `guest_contacts` verificado e entra como incremento.

## 8. Segurança transversal

- **Anti-CSRF/replay:** `state` assinado + `nonce` casado com o `id_token`, uso único, TTL 10 min.
- **Anti-open-redirect:** `returnTo` é validado como **path interno** (começa com `/`, não `//`, sem esquema, sem host). Qualquer coisa fora disso cai no default da superfície.
- **PII:** e-mail nunca em log cru (mascarado, como o resto do produto); e-mail do convidado herda o tratamento de `guest_contacts` (apagado pela retenção). Nenhum token do Google guardado.
- **Sessão de staff:** o login por Google produz a **mesma** sessão endurecida do magic link (idle 30 min, absoluto 12 h, rotação, detecção de reuso).
- **Rate limit:** o `start` por IP, como o magic link já faz; estouro grava `security_events`.

## 9. Camadas (ADR 0016)

- As rotas `/auth/google/*` vivem em `apps/web/app`, e chamam casos de uso em `packages/application` (resolver identidade, emitir sessão), que falam com `packages/db`. A rota não fala com `@albora/db` direto.
- A validação de `id_token` (JWKS, claims) é lógica pura → `packages/core` ou um módulo de `packages/application`, testável sem rede (com JWKS injetado).
- O client HTTP do Google (troca de `code`, busca de JWKS) é fronteira externa → candidato natural a `packages/integrations` (que agora existe), ao lado do billing.

## 10. Não-negociáveis carregados

- Primeira foto do convidado sem login, sem e-mail, sem tela de auth. O convite para reivindicar é sempre **depois** e opcional.
- Callback do convidado nunca emite sessão de host nem cria `accounts`.
- `email_verified=true` obrigatório; `id_token` validado contra JWKS; `aud` do client de login.
- Client OIDC dedicado, escopo mínimo, segredo fora do repo.
- Magic link coexiste; Google não substitui.
- Nunca PII crua em log; nenhum token do Google guardado.

## 11. Critério de sucesso

- Um casal entra com Google e cai no admin do próprio evento, sem esperar e-mail — e um casal sem Google continua entrando por magic link.
- Um membro da equipe entra com Google no console; um Google que não é da equipe é recusado sem descobrir se o e-mail é cadastrado.
- Um convidado, depois de já ter mandado a primeira foto, escolhe reivindicar, prova o e-mail com Google, e o contato verificado fica ligado à sessão daquele evento — sem ganhar conta, sem sair do evento, sem receber poderes de host.
- Nenhuma superfície aceita e-mail não-verificado, `id_token` sem assinatura válida, ou `returnTo` externo.
