# SSO Google — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar "Entrar com Google" via OIDC direto nas três superfícies (host, staff, convidado), coexistindo com o magic link — nunca o substituindo. Host e staff ganham login sem espera de e-mail; o convidado ganha um caminho opcional, pós-primeira-foto, para reivindicar as próprias fotos sem que isso vire conta.

**Architecture:** Duas rotas comuns (`GET /auth/google/start`, `GET /auth/google/callback`) em `apps/web/app/auth/google/`, que chamam casos de uso em `packages/application/src/auth/`. A troca de `code` por tokens e a busca do JWKS são fronteira externa (`packages/integrations/src/google-oidc/`, ADR 0016). A validação do `id_token` é lógica pura, sem rede (`packages/core/src/oidc/`). Cada superfície resolve identidade e (para host/staff) emite sua sessão já existente — `albora_host`/`albora_staff` — reusando os mesmos primitivos do magic link. O convidado nunca ganha sessão nova: só grava um contato verificado na própria `guest_session`.

**Tech Stack:** TypeScript (`exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`), pnpm workspaces, Next.js 15 (App Router, Route Handlers), PostgreSQL via `pg` com RLS forçado, Vitest (`node`/`jsdom`), Node 22, `jose` (JWT/JWKS — nova dependência, ver Lacunas).

**Spec:** docs/superpowers/specs/2026-09-06-sso-google-design.md
**ADR:** docs/adr/0018-sso-google-e-convidado-reivindica-fotos.md

## Global Constraints

- Worktree `/Users/clevesson-mendonca/orca/workspaces/albora-project/ceo-backoffice`, branch **`feat/sso-google`** (a partir de stable). NUNCA tocar em `merganser`. Sem `git stash`.
- `TEST_DATABASE_URL=postgres://albora:albora@localhost:55432/albora_console`. Container `albora-pg` **compartilhado**: nunca `docker rm`, `docker compose down` nem `db:down`. Se cair, `docker start albora-pg`.
- Runner: `packages/db` e `packages/application` só por `vitest.isolamento.config.ts` (que tem alias `@`). `apps/web` e `packages/ui-web` pela config principal.
- `source ~/.nvm/nvm.sh && nvm use 22` no MESMO shell do `pnpm` E do `git commit`.
- **Nenhuma task roda `next build` ou `next start`.** Teste é Vitest.
- Símbolo novo em inglês (ADR 0014); comentário em português.
- Migrations forward-only; próximo número livre: **0067**.
- `pnpm guards` + `pnpm typecheck` limpos antes de cada commit.
- Conventional Commits com escopo, terminando com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Contrato de camada — vale para TODA task desta onda

```
apps/web/app/auth/google/{start,callback}/route.ts   Route Handler: parse query -> chama caso de uso -> monta redirect/cookie
packages/integrations/src/google-oidc/                Fronteira externa: exchangeCode, fetchJwks (ADR 0016)
packages/core/src/oidc/                               Lógica pura: validateIdToken (JWKS injetado, sem rede)
packages/application/src/auth/                         Casos de uso: startGoogleLogin, issueOidcState/consumeOidcState,
                                                        completeGoogleLoginHost, completeGoogleLoginStaff, claimGuestPhotosByEmail
packages/db/src/{host-auth,staff,sessions}.ts          Repositório: resolução de account/staff, liveness de guest_session
```

- As rotas **nunca** importam `@albora/db` diretamente — só `@albora/application`, `@albora/core`, `@albora/integrations`, e módulos de sessão de `apps/web/lib` (`hostCookie`, `issueStaffSession`) para emitir o cookie final.
- **O caminho `surface: "guest"` nunca cria `accounts`, nunca emite cookie de host, nunca cruza eventos.** Qualquer código nesse caminho que o faça é defeito bloqueante (ADR 0018, Decisão 2) — T8 tem teste dedicado que prova isso por ausência.
- `email_verified === true` é exigido em T2, sem exceção.
- Zero hex, zero `style` inline, zero `backdrop-blur`/`animate-pulse` na UI de T9; alvo ≥44px (garantido por reusar `PrimaryButton`/`SecondaryButton` de `@albora/ui-web`, que já satisfazem isso).

## Lacunas encontradas no reconhecimento

Reconhecimento feito lendo o código real do worktree (não inventado). Onde a espinha pedia uma decisão explícita ("decidir e documentar"), a decisão está aqui, com o porquê.

1. **Sem biblioteca de JWT/JWKS no projeto.** `grep` em todos os `package.json` não encontra `jose`, `jsonwebtoken` nem `jwks-rsa` como dependência direta — só existe um `jsonwebtoken` interno ao bundle do Next (`next/dist/compiled`), inacessível ao código do produto. T2 precisa verificar assinatura RS256 do Google contra um JWKS. **Decisão:** adicionar `jose` (ESM nativo, zero dependência de framework, RFC 7517/7519) como dependência de `packages/core`. Não viola o guard `camadas` (core pode depender de bibliotecas de crypto puras; a proibição é sobre importar `next`/`db`/`application`/`integrations`).
2. **Onde guardar o state de uso único (T3): tabela nova, decidido.** A espinha pedia decisão explícita. O produto não tem Redis/KV em nenhum lugar do stack (`grep` não encontra); introduzir um sistema novo só para um TTL de 10min de um fluxo fora do caminho crítico do sábado seria desproporcional — a mesma régua que already rejeita terceiro no caminho crítico do upload. O padrão já estabelecido para TODO token de uso único do produto (`magic_links`, `staff_magic_links`, `session_tokens`) é uma tabela Postgres hash-keyed, consumida por `UPDATE ... RETURNING` atômico. T3 segue exatamente esse padrão: tabela `oidc_states`, **fora de RLS** — a mesma exceção deliberada que `session_tokens` (migration 0003) já tem, pelo mesmo motivo (mapa hash→contexto de vida curtíssima, não dado de evento).
3. **Migration numbering: a espinha diz "0067" no singular, mas o plano precisa de DUAS migrations novas** (`oidc_states` para T3, colunas de `guest_contacts` para T7 — a espinha atribuía 0067 a T7). **Decisão:** T3 (que vem antes na ordem de execução) fica com **0067**; T7 fica com **0068**. Forward-only preservado, só a atribuição de número muda.
4. **`consumeRateLimit` não é exportado no barrel de `@albora/application`** (só `resetRateLimit` é, para teste). Como o novo `startGoogleLogin` (T4) mora DENTRO de `packages/application`, ele importa `consumeRateLimit` por caminho relativo (`../staff/rate-limit`) — não precisa do barrel, e não precisa modificar `index.ts` para isso.
5. **Não existe uma função "resolver/criar conta por e-mail" isolada de `emitirMagicLink`** — a resolução (`SELECT` + `INSERT ... ON CONFLICT ... RETURNING id`) está inline dentro de `emitirMagicLink`, junto com a criação do magic link em si. T5 precisa da resolução SEM o link (o e-mail já chega verificado pelo Google). **Decisão:** extrair `resolveOrCreateAccountByEmail` como função própria e exportada em `host-auth.ts`, com `emitirMagicLink` passando a chamá-la internamente (comportamento externo inalterado, zero regressão).
6. **`issueMarkedHostSession` tem `impersonationId: string` (obrigatório)** — mas o login Google nunca nasce de uma impersonação aprovada. **Decisão:** relaxar o parâmetro para `string | null` (mudança aditiva, compatível com os chamadores existentes que já passam string), e T5 chama com `null`.
7. **`guest_sessions` não tem colunas de expiração/revogação** — isso vive em `session_tokens` (migration 0003, fora de RLS, por design, para evitar circularidade de RLS). A única função hoje que checa vivacidade (`resolverSessao`) exige o TOKEN OPACO cru — que o callback do OIDC não tem (só tem `eventId`+`guestSessionId`, vindos do `state`). **Decisão:** T8 adiciona `isGuestSessionLive(pool, eventId, sessionId)` em `packages/db/src/sessions.ts`, consultando `session_tokens` diretamente por `event_id`+`session_id` (não por hash de token).
8. **O `guestSessionId` nunca é hoje exposto ao cliente** — o navegador do convidado só guarda o token opaco num cookie (`GUEST_SESSION_COOKIE`), lido server-side por `guestSession()`/`isSameEventSession()` (`apps/web/features/guest/data/guest-session.ts`). Uma leitura literal da espinha ("o state carrega eventId + guestSessionId da sessão") sugeriria o CLIENTE passando `guestSessionId` na URL de `/auth/google/start`. **Decisão, mais segura e ainda fiel à intenção:** o cliente só passa `eventId` (público, não é credencial); a rota `start` resolve `guestSessionId` **server-side**, lendo o cookie de sessão do próprio convidado (o mesmo mecanismo que qualquer outra rota autenticada do convidado já usa) e confirmando que bate com o `eventId` pedido (`isSameEventSession`). Isso é estritamente mais seguro (nenhum identificador de sessão passa pela URL) e ainda satisfaz a exigência de design ("start só é oferecido dentro de uma sessão de convidado válida").
9. **`currentIpHash`/`ipHashFromHeaders` são privados** dentro de `apps/web/features/console/actions.ts` (não exportados). T4 não estica esse arquivo (ele é do console, não de auth); adiciona uma cópia mínima e independente em `apps/web/lib/ip-hash.ts` — a mesma filosofia de duplicação deliberada que o próprio `consumeRateLimit` de `packages/application` já documenta (barato, e mais seguro do que alcançar dentro do privado de outra feature).
10. **O ponto exato de renderização de `SuccessStep` com props não foi localizado neste reconhecimento.** `SuccessStep` existe e é reexportado por `apps/web/features/photo/components/steps/index.ts`, mas nenhum arquivo do wizard (`use-photo-wizard.ts`, `photo-page.tsx`) referencia `SuccessStep` por nome direto — o wizard provavelmente mapeia passos por um objeto/switch indexado por string, fora do alcance de um grep simples por `"SuccessStep"`. T9 cria e testa `ClaimPhotosButton` isoladamente e modifica `SuccessStep` para aceitar `eventId?: string`; a fiação final (passar `eventId={eventoId}` no call site real do wizard) fica como item explícito para quem executa T9 localizar — não inventado.
11. **`login-form.test.tsx` (console) não existe hoje** — só `login-form.tsx`. T9 cria o arquivo de teste do zero, em vez de "adicionar a um describe existente".
12. **O login por magic link do host não grava `audit_log` hoje** (só o staff grava, via `completeStaffLogin`). A espinha pede explicitamente que T5 "grave sucesso" — isso introduz o PRIMEIRO registro de auditoria para login de host, mais rigoroso que o caminho legado de magic link. Documentado como escolha intencional da onda, não uma inconsistência silenciosa.
13. **A camada "rota → `@albora/application`, nunca `@albora/db`" (ADR 0016) hoje só é seguida pelo console/staff** — o host/admin ainda chama `@albora/db` direto (`host-auth.ts`) sem wrapper de `packages/application`. A espinha exige explicitamente que TODAS as três superfícies do SSO passem por `packages/application` (T4). T5 é, portanto, o primeiro wrapper de `packages/application` para login de host — precedente positivo, não um refactor do fluxo legado (fora de escopo aqui).

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `packages/integrations/src/google-oidc/{types,config,provider,index}.ts` | Client OIDC dedicado — `exchangeCode`, `fetchJwks`, config por env |
| `packages/integrations/src/index.ts` | Modificado: `export * from "./google-oidc"` |
| `.env.example` | Modificado: `GOOGLE_OIDC_CLIENT_ID/SECRET/REDIRECT_URI` |
| `packages/core/package.json` | Modificado: dependência `jose` |
| `packages/core/src/oidc/validate-id-token.ts` | `validateIdToken` — pura, JWKS injetado |
| `packages/db/migrations/0067_oidc_states.sql` | Tabela `oidc_states` (state de uso único) |
| `packages/application/src/auth/oidc-state.ts` | `issueOidcState`, `consumeOidcState`, `sanitizeReturnTo` |
| `packages/application/src/auth/start-google-login.ts` | `startGoogleLogin` — rate limit + state |
| `apps/web/lib/ip-hash.ts` | `currentIpHash` — cópia mínima, independente do console |
| `apps/web/app/auth/google/start/route.ts` | `GET` — monta URL de autorização do Google |
| `packages/db/src/host-auth.ts` | Modificado: `resolveOrCreateAccountByEmail` extraído; `issueMarkedHostSession` aceita `impersonationId: string \| null` |
| `packages/application/src/auth/complete-google-login-host.ts` | `completeGoogleLoginHost` |
| `packages/db/src/staff.ts` | (sem mudança — `findStaffByEmail` já serve) |
| `packages/application/src/auth/complete-google-login-staff.ts` | `completeGoogleLoginStaff` |
| `apps/web/app/auth/google/callback/route.ts` | `GET` — troca code, valida id_token, roteia por surface |
| `packages/db/migrations/0068_guest_contacts_verificado.sql` | `guest_contacts.verified_at/verified_via` |
| `packages/db/src/sessions.ts` | Modificado: `isGuestSessionLive` |
| `packages/application/src/auth/claim-guest-photos.ts` | `claimGuestPhotosByEmail` — BLINDADO |
| `packages/db/src/index.ts` | Modificado: barrel — `resolveOrCreateAccountByEmail`, `isGuestSessionLive` |
| `packages/application/src/index.ts` | Modificado: barrel — todos os símbolos novos de `auth/` |
| `apps/web/features/admin/components/client/sign-in-form.tsx` | Modificado: botão "Entrar com Google" (host) |
| `apps/web/features/admin/components/client/sign-in-form.test.ts` | Modificado: teste do botão novo |
| `apps/web/features/console/components/client/login-form.tsx` | Modificado: botão "Entrar com Google" (staff) |
| `apps/web/features/console/components/client/login-form.test.tsx` | Criado |
| `apps/web/features/guest/components/client/claim-photos-button.tsx` | `ClaimPhotosButton` |
| `apps/web/features/guest/components/client/claim-photos-button.test.tsx` | Criado |
| `apps/web/features/photo/components/steps/success-step.tsx` | Modificado: prop `eventId?`, renderiza `ClaimPhotosButton` condicionalmente |
| `apps/web/features/photo/components/steps/success-step.test.tsx` | Criado |

---

### Task 1: Client OIDC dedicado + config (`packages/integrations/src/google-oidc`)

**Files:**
- Create: `packages/integrations/src/google-oidc/types.ts`
- Create: `packages/integrations/src/google-oidc/config.ts`
- Create: `packages/integrations/src/google-oidc/config.test.ts`
- Create: `packages/integrations/src/google-oidc/provider.ts`
- Create: `packages/integrations/src/google-oidc/provider.test.ts`
- Create: `packages/integrations/src/google-oidc/index.ts`
- Modify: `packages/integrations/src/index.ts`
- Modify: `.env.example`

**Interfaces:**
```ts
export type GoogleOidcTokens = { idToken: string; accessToken: string; expiresInSeconds: number };
export type GoogleJwk = { kty: string; use?: string; kid: string; n: string; e: string; alg?: string };
export type GoogleJwks = { keys: GoogleJwk[] };
export interface GoogleOidcClient {
  exchangeCode(code: string, redirectUri: string): Promise<GoogleOidcTokens>;
  fetchJwks(): Promise<GoogleJwks>;
}
export type GoogleOidcConfig = { clientId: string; clientSecret: string; redirectUri: string };
export function googleOidcConfig(): GoogleOidcConfig
export function googleOidcClient(clientId: string, clientSecret: string): GoogleOidcClient
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/integrations/src/google-oidc/config.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { GoogleOidcConfigError, googleOidcConfig, resetGoogleOidcConfigForTests } from "./config";

const originais = {
  id: process.env.GOOGLE_OIDC_CLIENT_ID,
  secret: process.env.GOOGLE_OIDC_CLIENT_SECRET,
  redirect: process.env.GOOGLE_OIDC_REDIRECT_URI,
};

afterEach(() => {
  process.env.GOOGLE_OIDC_CLIENT_ID = originais.id;
  process.env.GOOGLE_OIDC_CLIENT_SECRET = originais.secret;
  process.env.GOOGLE_OIDC_REDIRECT_URI = originais.redirect;
  resetGoogleOidcConfigForTests();
});

describe("googleOidcConfig", () => {
  it("lê as três variáveis quando presentes", () => {
    process.env.GOOGLE_OIDC_CLIENT_ID = "id-teste";
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "segredo-teste";
    process.env.GOOGLE_OIDC_REDIRECT_URI = "https://app.test/auth/google/callback";
    resetGoogleOidcConfigForTests();

    expect(googleOidcConfig()).toEqual({
      clientId: "id-teste",
      clientSecret: "segredo-teste",
      redirectUri: "https://app.test/auth/google/callback",
    });
  });

  it("lança GoogleOidcConfigError listando as variáveis ausentes", () => {
    delete process.env.GOOGLE_OIDC_CLIENT_ID;
    delete process.env.GOOGLE_OIDC_CLIENT_SECRET;
    process.env.GOOGLE_OIDC_REDIRECT_URI = "https://app.test/auth/google/callback";
    resetGoogleOidcConfigForTests();

    try {
      googleOidcConfig();
      throw new Error("deveria ter lançado");
    } catch (erro) {
      expect(erro).toBeInstanceOf(GoogleOidcConfigError);
      expect((erro as GoogleOidcConfigError).missing).toEqual([
        "GOOGLE_OIDC_CLIENT_ID",
        "GOOGLE_OIDC_CLIENT_SECRET",
      ]);
    }
  });
});
```

```ts
// packages/integrations/src/google-oidc/provider.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleOidcApiError, googleOidcClient } from "./provider";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("googleOidcClient", () => {
  it("exchangeCode troca code por id_token contra o endpoint do Google", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: "id-token-fake", access_token: "access-fake", expires_in: 3600 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = googleOidcClient("client-id", "client-secret");
    const tokens = await client.exchangeCode("codigo-de-autorizacao", "https://app.test/auth/google/callback");

    expect(tokens).toEqual({ idToken: "id-token-fake", accessToken: "access-fake", expiresInSeconds: 3600 });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
  });

  it("exchangeCode lança GoogleOidcApiError quando a resposta não é ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }) as unknown as typeof fetch;
    const client = googleOidcClient("client-id", "client-secret");
    await expect(client.exchangeCode("codigo", "https://app.test/callback")).rejects.toThrow(GoogleOidcApiError);
  });

  it("fetchJwks busca o JWKS do Google e cacheia entre chamadas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ kty: "RSA", kid: "k1", n: "abc", e: "AQAB" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = googleOidcClient("client-id", "client-secret");
    const primeira = await client.fetchJwks();
    const segunda = await client.fetchJwks();

    expect(primeira).toEqual(segunda);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://www.googleapis.com/oauth2/v3/certs");
  });

  it("nunca loga token, e-mail ou code — mesmo em resposta bem-sucedida", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: "id-token-secreto", access_token: "access-secreto", expires_in: 3600 }),
    }) as unknown as typeof fetch;

    const client = googleOidcClient("client-id", "client-secret");
    await client.exchangeCode("codigo-secreto", "https://app.test/callback");

    const tudoLogado = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(" ");
    expect(tudoLogado).not.toContain("codigo-secreto");
    expect(tudoLogado).not.toContain("id-token-secreto");
    expect(tudoLogado).not.toContain("access-secreto");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/integrations exec vitest run src/google-oidc/config.test.ts src/google-oidc/provider.test.ts`

Expected: FAIL — `Cannot find module './config'`, `Cannot find module './provider'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/integrations/src/google-oidc/types.ts
export type GoogleOidcTokens = {
  idToken: string;
  accessToken: string;
  expiresInSeconds: number;
};

export type GoogleJwk = { kty: string; use?: string; kid: string; n: string; e: string; alg?: string };
export type GoogleJwks = { keys: GoogleJwk[] };

/** Client OIDC de LOGIN — nunca loga token, e-mail ou code (mesma disciplina de DriveClient). */
export interface GoogleOidcClient {
  /** Troca `code` por tokens contra `https://oauth2.googleapis.com/token`. */
  exchangeCode(code: string, redirectUri: string): Promise<GoogleOidcTokens>;
  /** Busca (e cacheia) o JWKS do Google, para validação do `id_token` fora deste módulo. */
  fetchJwks(): Promise<GoogleJwks>;
}
```

```ts
// packages/integrations/src/google-oidc/config.ts
export type GoogleOidcConfig = { clientId: string; clientSecret: string; redirectUri: string };

export class GoogleOidcConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`GOOGLE_OIDC: variáveis ausentes: ${missing.join(", ")}`);
    this.name = "GoogleOidcConfigError";
  }
}

let memo: GoogleOidcConfig | null = null;

/**
 * Client separado do Drive (ADR 0018, Decisão 1): login não precisa de
 * acesso à API do Google, então nenhum access/refresh token é guardado.
 * Validado só no primeiro uso — ambientes sem SSO configurado não quebram
 * no boot.
 */
export function googleOidcConfig(): GoogleOidcConfig {
  if (memo) return memo;
  const missing: string[] = [];
  const readEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) missing.push(name);
    return value ?? "";
  };
  const clientId = readEnv("GOOGLE_OIDC_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_OIDC_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_OIDC_REDIRECT_URI");
  if (missing.length > 0) throw new GoogleOidcConfigError(missing);
  memo = { clientId, clientSecret, redirectUri };
  return memo;
}

export function resetGoogleOidcConfigForTests(): void {
  memo = null;
}
```

```ts
// packages/integrations/src/google-oidc/provider.ts
import type { GoogleJwks, GoogleOidcClient, GoogleOidcTokens } from "./types";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

export class GoogleOidcApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(`google oidc: ${code} (status ${status})`);
    this.name = "GoogleOidcApiError";
  }
}

/** Mock no boundary: o objeto inteiro devolvido aqui é o que os testes de chamadores substituem. */
export function googleOidcClient(clientId: string, clientSecret: string): GoogleOidcClient {
  let jwksCache: { jwks: GoogleJwks; fetchedAt: number } | null = null;

  return {
    async exchangeCode(code: string, redirectUri: string): Promise<GoogleOidcTokens> {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!res.ok) throw new GoogleOidcApiError("token_exchange_failed", res.status);
      const corpo = (await res.json()) as { id_token?: string; access_token: string; expires_in: number };
      if (!corpo.id_token) throw new GoogleOidcApiError("id_token_ausente", res.status);
      return { idToken: corpo.id_token, accessToken: corpo.access_token, expiresInSeconds: corpo.expires_in };
    },

    async fetchJwks(): Promise<GoogleJwks> {
      const agora = Date.now();
      if (jwksCache && agora - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) return jwksCache.jwks;
      const res = await fetch(JWKS_ENDPOINT);
      if (!res.ok) throw new GoogleOidcApiError("jwks_fetch_failed", res.status);
      const jwks = (await res.json()) as GoogleJwks;
      jwksCache = { jwks, fetchedAt: agora };
      return jwks;
    },
  };
}
```

```ts
// packages/integrations/src/google-oidc/index.ts
export type { GoogleJwk, GoogleJwks, GoogleOidcClient, GoogleOidcTokens } from "./types";
export { googleOidcConfig, GoogleOidcConfigError, resetGoogleOidcConfigForTests } from "./config";
export type { GoogleOidcConfig } from "./config";
export { GoogleOidcApiError, googleOidcClient } from "./provider";
```

```ts
// packages/integrations/src/index.ts — modificar
/**
 * `@albora/integrations` — a fronteira externa (ADR 0016). Billing e o
 * client OIDC de login moram aqui; e-mail e storage seguem em `apps/web/lib`
 * até a próxima migração desta dívida.
 */
export * from "./billing";
export * from "./google-oidc";
```

```
# .env.example — adicionar, no mesmo estilo do bloco DRIVE existente
# ── GOOGLE OIDC (login "Entrar com Google" — packages/integrations/src/google-oidc) ──
# Client dedicado, separado do Drive: nunca acessa API do Google, só autentica.
GOOGLE_OIDC_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OIDC_CLIENT_SECRET=your_client_secret_here
GOOGLE_OIDC_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/integrations exec vitest run src/google-oidc/config.test.ts src/google-oidc/provider.test.ts && pnpm --filter @albora/integrations typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/integrations/src/google-oidc packages/integrations/src/index.ts .env.example
git commit -m "$(cat <<'EOF'
feat(integrations): client OIDC dedicado do Google (login)

exchangeCode + fetchJwks contra o endpoint do Google, client SEPARADO do
Drive (escopo mínimo openid email, sem access/refresh token guardado) —
mesma disciplina de nunca logar token/e-mail/code do DriveClient.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Validação de `id_token` (pura, sem rede)

**Files:**
- Modify: `packages/core/package.json` (adicionar dependência `jose`)
- Create: `packages/core/src/oidc/validate-id-token.ts`
- Create: `packages/core/src/oidc/validate-id-token.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
```ts
export type MotivoIdTokenInvalido =
  | "signature" | "issuer" | "audience" | "expired" | "nonce" | "email_not_verified";
export class InvalidIdTokenError extends Error { readonly reason: MotivoIdTokenInvalido }
export type ValidateIdTokenInput = {
  idToken: string;
  jwks: GoogleJwks;
  expectedNonce: string;
  expectedAud: string;
  now?: Date;
};
export type ValidatedIdentity = { email: string };
export async function validateIdToken(input: ValidateIdTokenInput): Promise<ValidatedIdentity>
```

- [ ] **Step 1: Escrever o teste que falha**

```bash
# adicionar a dependência antes do teste — o teste usa `jose` pra fabricar o id_token
pnpm --filter @albora/core add jose
```

```ts
// packages/core/src/oidc/validate-id-token.test.ts
import { describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { InvalidIdTokenError, validateIdToken } from "./validate-id-token";
import type { GoogleJwks } from "./validate-id-token";

const EXPECTED_AUD = "client-id-de-teste";
const EXPECTED_NONCE = "nonce-de-teste";

async function jwksEIdToken(overrides: { claims?: Record<string, unknown>; headerKid?: string } = {}) {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const kid = overrides.headerKid ?? "kid-teste";
  const agora = Math.floor(Date.now() / 1000);

  const claims = {
    iss: "https://accounts.google.com",
    aud: EXPECTED_AUD,
    email: "convidado@exemplo.test",
    email_verified: true,
    nonce: EXPECTED_NONCE,
    ...overrides.claims,
  };

  const idToken = await new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt(agora)
    .setExpirationTime(agora + 3600)
    .sign(privateKey);

  const jwks: GoogleJwks = { keys: [{ kty: "RSA", kid: "kid-teste", n: jwk.n!, e: jwk.e! }] };
  return { idToken, jwks };
}

describe("validateIdToken", () => {
  it("aceita um id_token válido e devolve o e-mail", async () => {
    const { idToken, jwks } = await jwksEIdToken();
    const resultado = await validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD });
    expect(resultado).toEqual({ email: "convidado@exemplo.test" });
  });

  it("rejeita assinatura ruim (kid não bate com nenhuma chave do JWKS)", async () => {
    const { idToken, jwks } = await jwksEIdToken({ headerKid: "kid-desconhecido" });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "signature" });
  });

  it("rejeita aud errado", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { aud: "outro-client-id" } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "audience" });
  });

  it("rejeita iss fora do esperado", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { iss: "https://evil.example" } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "issuer" });
  });

  it("rejeita token expirado", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    const passado = Math.floor(Date.now() / 1000) - 7200;
    const idToken = await new SignJWT({
      iss: "https://accounts.google.com", aud: EXPECTED_AUD,
      email: "convidado@exemplo.test", email_verified: true, nonce: EXPECTED_NONCE,
    })
      .setProtectedHeader({ alg: "RS256", kid: "kid-teste" })
      .setIssuedAt(passado)
      .setExpirationTime(passado + 60)
      .sign(privateKey);
    const jwks: GoogleJwks = { keys: [{ kty: "RSA", kid: "kid-teste", n: jwk.n!, e: jwk.e! }] };

    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "expired" });
  });

  it("rejeita nonce errado", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { nonce: "nonce-diferente" } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "nonce" });
  });

  it("rejeita email_verified ausente ou false — inegociável (ADR 0018)", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { email_verified: false } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "email_not_verified" });

    const semCampo = await jwksEIdToken({ claims: { email_verified: undefined } });
    await expect(
      validateIdToken({
        idToken: semCampo.idToken, jwks: semCampo.jwks,
        expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD,
      }),
    ).rejects.toMatchObject({ reason: "email_not_verified" });
  });

  it("nunca aceita alg none", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", kid: "kid-teste" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: "https://accounts.google.com", aud: EXPECTED_AUD,
      email: "atacante@exemplo.test", email_verified: true, nonce: EXPECTED_NONCE,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString("base64url");
    const idTokenForjado = `${header}.${payload}.`;

    await expect(
      validateIdToken({ idToken: idTokenForjado, jwks: { keys: [] }, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "signature" });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/core exec vitest run src/oidc/validate-id-token.test.ts`

Expected: FAIL — `Cannot find module './validate-id-token'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/core/src/oidc/validate-id-token.ts
import { errors as joseErrors, importJWK, jwtVerify } from "jose";

export type GoogleJwk = { kty: string; use?: string; kid: string; n: string; e: string; alg?: string };
export type GoogleJwks = { keys: GoogleJwk[] };

export type MotivoIdTokenInvalido =
  | "signature" | "issuer" | "audience" | "expired" | "nonce" | "email_not_verified";

export class InvalidIdTokenError extends Error {
  constructor(readonly reason: MotivoIdTokenInvalido) {
    super(`id_token inválido: ${reason}`);
    this.name = "InvalidIdTokenError";
  }
}

export type ValidateIdTokenInput = {
  idToken: string;
  jwks: GoogleJwks;
  expectedNonce: string;
  expectedAud: string;
  now?: Date;
};

export type ValidatedIdentity = { email: string };

const ISSUERS_VALIDOS = ["https://accounts.google.com", "accounts.google.com"];

function decodeHeaderKid(idToken: string): string {
  const [headerB64] = idToken.split(".");
  if (!headerB64) throw new InvalidIdTokenError("signature");
  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8")) as { kid?: string; alg?: string };
  } catch {
    throw new InvalidIdTokenError("signature");
  }
  // `alg: none` é o ataque clássico de JWT — nunca aceito, mesmo antes de olhar o JWKS.
  if (!header.kid || header.alg !== "RS256") throw new InvalidIdTokenError("signature");
  return header.kid;
}

/**
 * Pura e testável sem rede (JWKS injetado pelo chamador — T4 busca via
 * `GoogleOidcClient.fetchJwks()`). Ordem de validação: assinatura contra o
 * JWKS -> iss/aud/exp (via `jose`) -> nonce -> email_verified. Qualquer
 * falha lança `InvalidIdTokenError` com o motivo exato — nunca uma
 * mensagem genérica que esconderia qual invariante quebrou (útil só pra
 * log interno, nunca pra resposta ao usuário).
 */
export async function validateIdToken(input: ValidateIdTokenInput): Promise<ValidatedIdentity> {
  const kid = decodeHeaderKid(input.idToken);
  const jwk = input.jwks.keys.find((k) => k.kid === kid);
  if (!jwk) throw new InvalidIdTokenError("signature");

  const chavePublica = await importJWK({ kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256" }, "RS256");

  let payload;
  try {
    ({ payload } = await jwtVerify(input.idToken, chavePublica, {
      issuer: ISSUERS_VALIDOS,
      audience: input.expectedAud,
      currentDate: input.now,
    }));
  } catch (erro) {
    if (erro instanceof joseErrors.JWTExpired) throw new InvalidIdTokenError("expired");
    if (erro instanceof joseErrors.JWTClaimValidationFailed) {
      if (erro.claim === "iss") throw new InvalidIdTokenError("issuer");
      if (erro.claim === "aud") throw new InvalidIdTokenError("audience");
    }
    throw new InvalidIdTokenError("signature");
  }

  if (payload.nonce !== input.expectedNonce) throw new InvalidIdTokenError("nonce");
  if (payload.email_verified !== true) throw new InvalidIdTokenError("email_not_verified");

  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email) throw new InvalidIdTokenError("email_not_verified");

  return { email };
}
```

```ts
// packages/core/src/index.ts — adicionar
export type {
  GoogleJwk, GoogleJwks, MotivoIdTokenInvalido, ValidatedIdentity, ValidateIdTokenInput,
} from "./oidc/validate-id-token";
export { InvalidIdTokenError, validateIdToken } from "./oidc/validate-id-token";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/core exec vitest run src/oidc/validate-id-token.test.ts && pnpm --filter @albora/core typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/core/package.json packages/core/src/oidc packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): validação pura de id_token do Google (JWKS injetado)

validateIdToken cobre assinatura RS256, iss, aud, exp, nonce e
email_verified=true (ADR 0018) sem tocar rede — id_token e JWKS
fabricados com chave de teste no próprio teste.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: State assinado de uso único (`oidc_states`)

**Files:**
- Create: `packages/db/migrations/0067_oidc_states.sql`
- Create: `packages/application/src/auth/oidc-state.ts`
- Create: `packages/application/src/auth/oidc-state.test.ts`
- Modify: `packages/application/src/index.ts`

**Interfaces:**
```ts
export type OidcSurface = "host" | "staff" | "guest";
export type OidcStatePayload = {
  surface: OidcSurface; nonce: string; returnTo: string; eventId?: string; guestSessionId?: string;
};
export type IssueOidcStateInput = {
  surface: OidcSurface; returnTo: string; eventId?: string; guestSessionId?: string;
};
export type IssuedOidcState = { state: string; nonce: string };
export class InvalidOidcStateError extends Error { readonly reason: "signature" | "expired" | "consumed" | "unknown" }
export async function issueOidcState(pool: Pool, secret: string, input: IssueOidcStateInput): Promise<IssuedOidcState>
export async function consumeOidcState(pool: Pool, secret: string, state: string): Promise<OidcStatePayload>
export function sanitizeReturnTo(returnTo: string | undefined | null, surface: OidcSurface): string
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/auth/oidc-state.test.ts
import { createHash } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { consumeOidcState, InvalidOidcStateError, issueOidcState, sanitizeReturnTo } from "./oidc-state";

let admin: pg.Pool;
let app: pg.Pool;
const SEGREDO = "segredo-de-teste-com-pelo-menos-32-caracteres-ok";

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

describe("issueOidcState / consumeOidcState", () => {
  it("emite e consome um state válido, devolvendo o payload original", async () => {
    await prepararBanco();
    const { state } = await issueOidcState(app, SEGREDO, { surface: "host", returnTo: "/admin/eventos" });
    const payload = await consumeOidcState(app, SEGREDO, state);
    expect(payload.surface).toBe("host");
    expect(payload.returnTo).toBe("/admin/eventos");
  });

  it("state adulterado (assinatura trocada) é rejeitado", async () => {
    await prepararBanco();
    const { state } = await issueOidcState(app, SEGREDO, { surface: "staff", returnTo: "/console" });
    const [material] = state.split(".");
    const adulterado = `${material}.assinaturaFalsa`;
    await expect(consumeOidcState(app, SEGREDO, adulterado)).rejects.toThrow(InvalidOidcStateError);
  });

  it("state expirado é rejeitado", async () => {
    await prepararBanco();
    const { state, nonce } = await issueOidcState(app, SEGREDO, { surface: "host", returnTo: "/admin" });
    const nonceHash = createHash("sha256").update(nonce).digest();
    await admin.query("UPDATE oidc_states SET expires_at = now() - interval '1 minute' WHERE nonce_hash = $1", [nonceHash]);
    await expect(consumeOidcState(app, SEGREDO, state)).rejects.toMatchObject({ reason: "expired" });
  });

  it("nonce reusado (callback duplicado) é rejeitado na segunda tentativa", async () => {
    await prepararBanco();
    const { state } = await issueOidcState(app, SEGREDO, { surface: "guest", returnTo: "/" });
    await consumeOidcState(app, SEGREDO, state);
    await expect(consumeOidcState(app, SEGREDO, state)).rejects.toMatchObject({ reason: "consumed" });
  });

  it("recusa surface fora do enum no schema", async () => {
    await prepararBanco();
    await expect(
      admin.query(
        `INSERT INTO oidc_states (nonce_hash, surface, return_to, expires_at)
         VALUES ($1, 'inventado', '/', now() + interval '10 minutes')`,
        [Buffer.from("hash-de-teste")],
      ),
    ).rejects.toThrow();
  });
});

describe("sanitizeReturnTo", () => {
  it("aceita path interno", () => {
    expect(sanitizeReturnTo("/admin/eventos/123", "host")).toBe("/admin/eventos/123");
  });

  it("returnTo externo, protocol-relative ou com esquema cai no default da superfície", () => {
    expect(sanitizeReturnTo("https://evil.example", "host")).toBe("/admin");
    expect(sanitizeReturnTo("//evil.example", "staff")).toBe("/console");
    expect(sanitizeReturnTo(undefined, "guest")).toBe("/");
    expect(sanitizeReturnTo("/ok\\..\\evil", "host")).toBe("/admin");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/auth/oidc-state.test.ts`

Expected: FAIL — `relation "oidc_states" does not exist` / `Cannot find module './oidc-state'`.

- [ ] **Step 3: Implementar o mínimo**

```sql
-- packages/db/migrations/0067_oidc_states.sql
-- 0067 — state de uso único do SSO Google (Onda SSO, T3)
--
-- Mesma disciplina de magic_links/staff_magic_links/session_tokens: uma
-- linha por nonce, consumida por UPDATE...RETURNING atômico (nunca
-- ler-depois-escrever). FORA de RLS de propósito — como session_tokens
-- (migration 0003): mapa hash->contexto de vida curtíssima, não dado de
-- evento; event_id/guest_session_id só são preenchidos para surface='guest'.
CREATE TABLE oidc_states (
  nonce_hash        bytea PRIMARY KEY,
  surface           text NOT NULL CHECK (surface IN ('host', 'staff', 'guest')),
  return_to         text NOT NULL,
  event_id          uuid REFERENCES events(id) ON DELETE CASCADE,
  guest_session_id  uuid REFERENCES guest_sessions(id) ON DELETE CASCADE,
  expires_at        timestamptz NOT NULL,
  consumed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX oidc_states_por_expiracao ON oidc_states (expires_at) WHERE consumed_at IS NULL;
```

```ts
// packages/application/src/auth/oidc-state.ts
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

export type OidcSurface = "host" | "staff" | "guest";

export type OidcStatePayload = {
  surface: OidcSurface;
  nonce: string;
  returnTo: string;
  eventId?: string;
  guestSessionId?: string;
};

export type IssueOidcStateInput = {
  surface: OidcSurface;
  returnTo: string;
  eventId?: string;
  guestSessionId?: string;
};

export type IssuedOidcState = { state: string; nonce: string };

export const OIDC_STATE_TTL_MINUTES = 10;

export class InvalidOidcStateError extends Error {
  constructor(readonly reason: "signature" | "expired" | "consumed" | "unknown") {
    super(`state OIDC inválido: ${reason}`);
    this.name = "InvalidOidcStateError";
  }
}

function sign(secret: string, materialB64: string): string {
  return createHmac("sha256", secret).update(materialB64).digest("base64url");
}

/**
 * Emite o `state` (payload + HMAC) e grava a linha de uso único em
 * `oidc_states` — hash do nonce, nunca o nonce cru. O mesmo nonce vai para
 * o Google como parâmetro `nonce`: é o que casa o `state` com o `id_token`
 * no callback (T2 valida `nonce == este`).
 */
export async function issueOidcState(pool: Pool, secret: string, input: IssueOidcStateInput): Promise<IssuedOidcState> {
  const nonce = randomBytes(32).toString("base64url");
  const payload: OidcStatePayload = {
    surface: input.surface,
    nonce,
    returnTo: input.returnTo,
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.guestSessionId ? { guestSessionId: input.guestSessionId } : {}),
  };
  const materialB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const state = `${materialB64}.${sign(secret, materialB64)}`;

  const nonceHash = createHash("sha256").update(nonce).digest();
  const expiraEm = new Date(Date.now() + OIDC_STATE_TTL_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO oidc_states (nonce_hash, surface, return_to, event_id, guest_session_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [nonceHash, payload.surface, payload.returnTo, payload.eventId ?? null, payload.guestSessionId ?? null, expiraEm],
  );

  return { state, nonce };
}

/**
 * Valida a assinatura, decodifica o payload, e consome a linha via
 * UPDATE...RETURNING atômico — a MESMA garantia de `consumirMagicLink`:
 * dois callbacks simultâneos com o mesmo state nunca consomem ambos.
 */
export async function consumeOidcState(pool: Pool, secret: string, state: string): Promise<OidcStatePayload> {
  const [materialB64, assinaturaRecebida] = state.split(".");
  if (!materialB64 || !assinaturaRecebida) throw new InvalidOidcStateError("signature");

  const bufRecebida = Buffer.from(assinaturaRecebida, "base64url");
  const bufEsperada = Buffer.from(sign(secret, materialB64), "base64url");
  if (bufRecebida.length !== bufEsperada.length || !timingSafeEqual(bufRecebida, bufEsperada)) {
    throw new InvalidOidcStateError("signature");
  }

  let payload: OidcStatePayload;
  try {
    payload = JSON.parse(Buffer.from(materialB64, "base64url").toString("utf8")) as OidcStatePayload;
  } catch {
    throw new InvalidOidcStateError("signature");
  }

  const nonceHash = createHash("sha256").update(payload.nonce).digest();
  const { rows } = await pool.query<{ consumed_at: Date | null }>(
    `UPDATE oidc_states SET consumed_at = now()
      WHERE nonce_hash = $1 AND consumed_at IS NULL AND expires_at > now()
      RETURNING consumed_at`,
    [nonceHash],
  );

  if (rows.length === 0) {
    const { rows: atual } = await pool.query<{ consumed_at: Date | null; expirado: boolean }>(
      `SELECT consumed_at, (expires_at <= now()) AS expirado FROM oidc_states WHERE nonce_hash = $1`,
      [nonceHash],
    );
    const linha = atual[0];
    if (!linha) throw new InvalidOidcStateError("unknown");
    if (linha.consumed_at) throw new InvalidOidcStateError("consumed");
    if (linha.expirado) throw new InvalidOidcStateError("expired");
    throw new InvalidOidcStateError("unknown");
  }

  return payload;
}

const DEFAULT_RETURN_TO: Record<OidcSurface, string> = { host: "/admin", staff: "/console", guest: "/" };

/**
 * `returnTo` só é aceito se path interno: começa com `/`, não `//`
 * (protocol-relative), sem `:` (esquema) nem `\` (variação de
 * open-redirect que navegadores normalizam para host externo). Nunca
 * lança — um returnTo ruim não derruba o login, só cai no default.
 */
export function sanitizeReturnTo(returnTo: string | undefined | null, surface: OidcSurface): string {
  const fallback = DEFAULT_RETURN_TO[surface];
  if (!returnTo) return fallback;
  if (!returnTo.startsWith("/")) return fallback;
  if (returnTo.startsWith("//")) return fallback;
  if (returnTo.includes(":") || returnTo.includes("\\")) return fallback;
  return returnTo;
}
```

```ts
// packages/application/src/index.ts — adicionar
export type {
  IssueOidcStateInput, IssuedOidcState, OidcStatePayload, OidcSurface,
} from "./auth/oidc-state";
export { consumeOidcState, InvalidOidcStateError, issueOidcState, sanitizeReturnTo } from "./auth/oidc-state";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/auth/oidc-state.test.ts && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0067_oidc_states.sql packages/application/src/auth/oidc-state.ts packages/application/src/auth/oidc-state.test.ts packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(application): state assinado de uso único do SSO Google

oidc_states (fora de RLS, mesmo padrão de session_tokens) guarda o hash
do nonce até o callback consumir via UPDATE...RETURNING atômico.
sanitizeReturnTo fecha open-redirect: só path interno, senão default
da superfície.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rotas `/auth/google/start` e `/auth/google/callback`

**Files:**
- Create: `apps/web/lib/ip-hash.ts`
- Create: `packages/application/src/auth/start-google-login.ts`
- Create: `packages/application/src/auth/start-google-login.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/app/auth/google/start/route.ts`
- Create: `apps/web/app/auth/google/callback/route.ts`
- Modify: `vitest.isolamento.config.ts` (glob para o teste do use case, se ele usar `prepararBanco()` fora de `packages/application`/`packages/db` — aqui não é necessário: `start-google-login.test.ts` mora em `packages/application`, já coberto pelo glob existente)

**Interfaces:**
```ts
export type StartGoogleLoginInput = {
  surface: OidcSurface; returnTo?: string; eventId?: string; guestSessionId?: string; ipHash: string;
};
export type StartGoogleLoginResult = { state: string; nonce: string } | { rateLimited: true };
export async function startGoogleLogin(pool: Pool, secret: string, input: StartGoogleLoginInput): Promise<StartGoogleLoginResult>
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/auth/start-google-login.test.ts
import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { resetRateLimit } from "../staff/rate-limit";
import { startGoogleLogin } from "./start-google-login";

let admin: pg.Pool;
let app: pg.Pool;
const SEGREDO = "segredo-de-teste-com-pelo-menos-32-caracteres-ok";

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

afterEach(() => resetRateLimit());

describe("startGoogleLogin", () => {
  it("emite state para uma superfície válida", async () => {
    await prepararBanco();
    const resultado = await startGoogleLogin(app, SEGREDO, {
      surface: "host", returnTo: "/admin/eventos", ipHash: "hash-ip-1",
    });
    expect(resultado).toHaveProperty("state");
    expect(resultado).toHaveProperty("nonce");
  });

  it("estoura rate limit por IP após muitas tentativas e grava security_events", async () => {
    await prepararBanco();
    for (let i = 0; i < 10; i++) {
      await startGoogleLogin(app, SEGREDO, { surface: "staff", ipHash: "hash-ip-estourado" });
    }
    const resultado = await startGoogleLogin(app, SEGREDO, { surface: "staff", ipHash: "hash-ip-estourado" });
    expect(resultado).toEqual({ rateLimited: true });

    const { rows } = await admin.query(
      "SELECT kind FROM security_events WHERE kind = 'rate_limit.exceeded' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.kind).toBe("rate_limit.exceeded");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/auth/start-google-login.test.ts`

Expected: FAIL — `Cannot find module './start-google-login'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/auth/start-google-login.ts
import type { Pool } from "pg";
import { insertSecurityEvent } from "@albora/db";
import { consumeRateLimit } from "../staff/rate-limit";
import { issueOidcState, sanitizeReturnTo, type IssuedOidcState, type OidcSurface } from "./oidc-state";

export type StartGoogleLoginInput = {
  surface: OidcSurface;
  returnTo?: string;
  eventId?: string;
  guestSessionId?: string;
  ipHash: string;
};

export type StartGoogleLoginResult = IssuedOidcState | { rateLimited: true };

const MAX_REQUESTS_PER_IP_PER_HOUR = 10;

/**
 * `start` comum às três superfícies: rate limit por IP (mesmo padrão de
 * `requestStaffLogin`), sanitização de `returnTo`, e emissão do `state` de
 * uso único (T3). Nunca decide identidade — isso é o callback (T5/T6/T8).
 */
export async function startGoogleLogin(
  pool: Pool,
  secret: string,
  input: StartGoogleLoginInput,
): Promise<StartGoogleLoginResult> {
  const withinLimit = consumeRateLimit(`google_login_start:ip:${input.ipHash}`, MAX_REQUESTS_PER_IP_PER_HOUR, 3600);

  if (!withinLimit) {
    await insertSecurityEvent(pool, {
      kind: "rate_limit.exceeded",
      ipHash: input.ipHash,
      metadata: { surface: "google_login_start" },
    });
    return { rateLimited: true };
  }

  const returnTo = sanitizeReturnTo(input.returnTo, input.surface);
  return issueOidcState(pool, secret, {
    surface: input.surface,
    returnTo,
    eventId: input.eventId,
    guestSessionId: input.guestSessionId,
  });
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { StartGoogleLoginInput, StartGoogleLoginResult } from "./auth/start-google-login";
export { startGoogleLogin } from "./auth/start-google-login";
```

```ts
// apps/web/lib/ip-hash.ts
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { config } from "./config";

/**
 * Mesmo padrão de `apps/web/features/console/actions.ts` (privado lá,
 * duplicado aqui de propósito — `packages/application` não pode importar
 * de `apps/web`, e alcançar dentro do privado de outra feature seria pior):
 * HMAC-SHA256 com `sessionSecret`, nunca hash puro — IPv4 tem só 2^32
 * valores, hash sem chave seria reversível por força bruta.
 */
export async function currentIpHash(): Promise<string> {
  const jar = await headers();
  const ip = jar.get("cf-connecting-ip") ?? jar.get("x-forwarded-for");
  const { sessionSecret } = config();
  return createHmac("sha256", sessionSecret).update(ip ?? "sem-ip").digest("hex");
}
```

```ts
// apps/web/app/auth/google/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { startGoogleLogin, type OidcSurface } from "@albora/application";
import { googleOidcConfig } from "@albora/integrations";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { currentIpHash } from "@/lib/ip-hash";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

function surfaceValida(valor: string | null): valor is OidcSurface {
  return valor === "host" || valor === "staff" || valor === "guest";
}

/**
 * `guest` NUNCA aceita `guestSessionId` do cliente — resolve server-side a
 * partir do cookie da própria sessão de convidado (o mesmo mecanismo de
 * qualquer outra rota do convidado), confirmando que bate com `eventId`
 * pedido. O cliente só informa o `eventId` (público, não é credencial).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const surfaceParam = searchParams.get("surface");
  const returnTo = searchParams.get("returnTo") ?? undefined;
  const eventId = searchParams.get("eventId") ?? undefined;

  if (!surfaceValida(surfaceParam)) return NextResponse.redirect(new URL("/", req.url));

  let guestSessionId: string | undefined;
  if (surfaceParam === "guest") {
    if (!eventId) return NextResponse.redirect(new URL("/", req.url));
    const sessao = await guestSession();
    if (!isSameEventSession(sessao, eventId)) return NextResponse.redirect(new URL("/", req.url));
    guestSessionId = sessao.sessaoId;
  }

  const ipHash = await currentIpHash();
  const { sessionSecret } = config();
  const { clientId, redirectUri } = googleOidcConfig();

  const resultado = await startGoogleLogin(getPool(), sessionSecret, {
    surface: surfaceParam, returnTo, eventId, guestSessionId, ipHash,
  });

  if ("rateLimited" in resultado) return NextResponse.redirect(new URL("/", req.url));

  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", resultado.state);
  url.searchParams.set("nonce", resultado.nonce);

  return NextResponse.redirect(url);
}
```

```ts
// apps/web/app/auth/google/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  claimGuestPhotosByEmail, completeGoogleLoginHost, completeGoogleLoginStaff, consumeOidcState,
  type OidcSurface,
} from "@albora/application";
import { InvalidIdTokenError, validateIdToken } from "@albora/core";
import { googleOidcClient, googleOidcConfig } from "@albora/integrations";
import { VALIDADE_HOST_SESSAO_HORAS } from "@albora/db";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { currentIpHash } from "@/lib/ip-hash";
import { hostCookie } from "@/lib/host-session";
import { issueStaffSession } from "@/lib/console/staff-session";

function fallbackFor(surface: OidcSurface): string {
  if (surface === "host") return "/admin/sign-in?error=google";
  if (surface === "staff") return "/console/login?error=google";
  return "/";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/", req.url));

  const pool = getPool();
  const { sessionSecret } = config();
  const ipHash = await currentIpHash();

  let payload;
  try {
    payload = await consumeOidcState(pool, sessionSecret, state);
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const failUrl = new URL(fallbackFor(payload.surface), req.url);

  try {
    const { clientId, clientSecret, redirectUri } = googleOidcConfig();
    const client = googleOidcClient(clientId, clientSecret);
    const tokens = await client.exchangeCode(code, redirectUri);
    const jwks = await client.fetchJwks();
    const identidade = await validateIdToken({
      idToken: tokens.idToken, jwks, expectedNonce: payload.nonce, expectedAud: clientId,
    });

    if (payload.surface === "host") {
      const resultado = await completeGoogleLoginHost(pool, sessionSecret, { email: identidade.email, ipHash });
      if (!resultado.ok) return NextResponse.redirect(failUrl);
      const response = NextResponse.redirect(new URL(payload.returnTo, req.url));
      response.headers.append("set-cookie", hostCookie(resultado.token, VALIDADE_HOST_SESSAO_HORAS));
      return response;
    }

    if (payload.surface === "staff") {
      const resultado = await completeGoogleLoginStaff(pool, { email: identidade.email, ipHash });
      if (!resultado.ok) return NextResponse.redirect(failUrl);
      await issueStaffSession(resultado.staffUserId);
      return NextResponse.redirect(new URL(payload.returnTo, req.url));
    }

    // surface === "guest" — BLINDADO: sem eventId/guestSessionId no state, nunca prossegue.
    if (!payload.eventId || !payload.guestSessionId) return NextResponse.redirect(failUrl);
    await claimGuestPhotosByEmail(pool, {
      eventId: payload.eventId, guestSessionId: payload.guestSessionId, email: identidade.email,
    });
    return NextResponse.redirect(new URL(payload.returnTo, req.url));
  } catch (erro) {
    if (erro instanceof InvalidIdTokenError) return NextResponse.redirect(failUrl);
    throw erro;
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/auth/start-google-login.test.ts && pnpm --filter @albora/application typecheck && pnpm --filter web typecheck`

Expected: PASS. (As rotas em si ganham cobertura de integração em T5/T6/T8, que exercitam `completeGoogleLogin{Host,Staff}`/`claimGuestPhotosByEmail` — as duas rotas ficam sem teste de Route Handler dedicado nesta task porque dependem desses casos de uso, ainda não implementados; T10 confere a varredura de camada.)

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/lib/ip-hash.ts packages/application/src/auth/start-google-login.ts packages/application/src/auth/start-google-login.test.ts packages/application/src/index.ts apps/web/app/auth/google
git commit -m "$(cat <<'EOF'
feat(auth): rotas /auth/google/start e /auth/google/callback

start monta a URL de autorização do Google com state assinado; callback
troca code, valida id_token e roteia por surface. guestSessionId nunca
vem do cliente — resolvido server-side a partir do cookie da própria
sessão de convidado. Rotas nunca importam @albora/db direto.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Host — resolve/cria account + `albora_host`

**Files:**
- Modify: `packages/db/src/host-auth.ts`
- Modify: `packages/db/src/host-auth.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/auth/complete-google-login-host.ts`
- Create: `packages/application/src/auth/complete-google-login-host.test.ts`
- Modify: `packages/application/src/index.ts`

**Interfaces:**
```ts
export type AccountResolvida = { accountId: string; isNewAccount: boolean };
export async function resolveOrCreateAccountByEmail(db: Queryable, email: string): Promise<AccountResolvida>
// issueMarkedHostSession — impersonationId relaxado para aceitar null:
export async function issueMarkedHostSession(
  db: Queryable, segredo: string, accountId: string, impersonationId: string | null, expiresAt: Date,
): Promise<{ token: string }>

export type CompleteGoogleLoginHostInput = { email: string; ipHash: string };
export type CompleteGoogleLoginHostResult = { ok: true; token: string; accountId: string } | { ok: false };
export async function completeGoogleLoginHost(
  pool: Pool, segredo: string, input: CompleteGoogleLoginHostInput,
): Promise<CompleteGoogleLoginHostResult>
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/host-auth.test.ts — adicionar ao describe existente
import { resolveOrCreateAccountByEmail } from "./host-auth";

describe("resolveOrCreateAccountByEmail", () => {
  it("cria a conta quando o e-mail é novo", async () => {
    await prepararBanco();
    const resultado = await resolveOrCreateAccountByEmail(app, `novo-${Math.random().toString(36).slice(2)}@exemplo.test`);
    expect(resultado.isNewAccount).toBe(true);
    expect(resultado.accountId).toBeTruthy();
  });

  it("resolve a mesma conta quando o e-mail já existe (idempotente)", async () => {
    await prepararBanco();
    const email = `existente-${Math.random().toString(36).slice(2)}@exemplo.test`;
    const primeira = await resolveOrCreateAccountByEmail(app, email);
    const segunda = await resolveOrCreateAccountByEmail(app, email);
    expect(segunda.accountId).toBe(primeira.accountId);
    expect(segunda.isNewAccount).toBe(false);
  });
});
```

```ts
// packages/application/src/auth/complete-google-login-host.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { completeGoogleLoginHost } from "./complete-google-login-host";

let admin: pg.Pool;
let app: pg.Pool;
const SEGREDO = "segredo-de-teste-com-pelo-menos-32-caracteres-ok";

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

describe("completeGoogleLoginHost", () => {
  it("resolve/cria a conta e emite token de sessão de host, gravando audit_log", async () => {
    await prepararBanco();
    const email = `google-host-${Math.random().toString(36).slice(2)}@exemplo.test`;

    const resultado = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok");
    expect(resultado.token).toBeTruthy();

    const { rows: contas } = await admin.query("SELECT email FROM accounts WHERE id = $1", [resultado.accountId]);
    expect(contas[0]?.email).toBe(email);

    const { rows: auditoria } = await admin.query(
      "SELECT action, target_kind, target_id FROM audit_log WHERE action = 'host.login.google' AND target_id = $1",
      [resultado.accountId],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]?.target_kind).toBe("account");
  });

  it("chamando duas vezes com o mesmo e-mail resolve a MESMA conta", async () => {
    await prepararBanco();
    const email = `google-host-repete-${Math.random().toString(36).slice(2)}@exemplo.test`;
    const primeira = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    const segunda = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    if (!primeira.ok || !segunda.ok) throw new Error("esperado ok em ambas");
    expect(segunda.accountId).toBe(primeira.accountId);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/host-auth.test.ts && pnpm --filter @albora/application exec vitest run src/auth/complete-google-login-host.test.ts`

Expected: FAIL — `resolveOrCreateAccountByEmail is not a function`, `Cannot find module './complete-google-login-host'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/host-auth.ts — modificar

export type AccountResolvida = { accountId: string; isNewAccount: boolean };

/**
 * Resolve uma conta por e-mail, criando se for novo. Extraído de dentro de
 * `emitirMagicLink` (mesma semântica exata, INSERT...ON CONFLICT...RETURNING
 * id) para ser reusado pelo login Google (T5, Onda SSO), que já chega com
 * e-mail verificado e não precisa do efeito colateral de um magic link.
 */
export async function resolveOrCreateAccountByEmail(db: Queryable, email: string): Promise<AccountResolvida> {
  const normalizado = email.trim().toLowerCase();
  const { rows: existente } = await db.query<{ id: string }>("SELECT id FROM accounts WHERE email = $1", [normalizado]);
  const isNewAccount = existente.length === 0;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO accounts (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
    [normalizado],
  );
  return { accountId: rows[0]!.id, isNewAccount };
}

// dentro de `emitirMagicLink`, substituir a resolução inline por:
//   const { accountId, isNewAccount } = await resolveOrCreateAccountByEmail(pool, email);
// (o resto da função — criação do magic_links — continua igual)
```

```ts
// packages/db/src/host-auth.ts — issueMarkedHostSession, relaxar o parâmetro
export async function issueMarkedHostSession(
  db: Queryable,
  segredo: string,
  accountId: string,
  impersonationId: string | null, // era `string` — null é o caminho do login Google (T5), sem impersonação
  expiresAt: Date,
): Promise<{ token: string }> {
  // corpo inalterado: o INSERT já grava `impersonation_id` como veio — null vira NULL na coluna.
  const { token, hash } = emitirToken(segredo);
  await db.query(
    "INSERT INTO host_sessions (token_hash, account_id, expires_at, impersonation_id) VALUES ($1, $2, $3, $4)",
    [hash, accountId, expiresAt, impersonationId],
  );
  return { token };
}
```

```ts
// packages/db/src/index.ts — adicionar ao bloco de host-auth
export type { AccountResolvida } from "./host-auth";
export { resolveOrCreateAccountByEmail } from "./host-auth";
```

```ts
// packages/application/src/auth/complete-google-login-host.ts
import type { Pool } from "pg";
import {
  insertAuditLog, insertSecurityEvent, issueMarkedHostSession,
  resolveOrCreateAccountByEmail, VALIDADE_HOST_SESSAO_HORAS,
} from "@albora/db";

export type CompleteGoogleLoginHostInput = { email: string; ipHash: string };
export type CompleteGoogleLoginHostResult = { ok: true; token: string; accountId: string } | { ok: false };

/**
 * E-mail já chega verificado pelo callback (T2/T4) — aqui só resolve/cria a
 * conta (mesma semântica de `emitirMagicLink`, sem o link) e emite a sessão
 * de host. `impersonationId: null` — login Google nunca nasce de uma
 * aprovação de impersonação (ADR 0018 não toca impersonação).
 */
export async function completeGoogleLoginHost(
  pool: Pool,
  segredo: string,
  input: CompleteGoogleLoginHostInput,
): Promise<CompleteGoogleLoginHostResult> {
  try {
    const { accountId } = await resolveOrCreateAccountByEmail(pool, input.email);
    const expiresAt = new Date(Date.now() + VALIDADE_HOST_SESSAO_HORAS * 60 * 60 * 1000);
    const { token } = await issueMarkedHostSession(pool, segredo, accountId, null, expiresAt);

    const client = await pool.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "host",
        actorId: accountId,
        action: "host.login.google",
        targetKind: "account",
        targetId: accountId,
        reason: "login via Google OIDC",
        ipHash: input.ipHash,
      });
    } finally {
      client.release();
    }

    return { ok: true, token, accountId };
  } catch {
    await insertSecurityEvent(pool, { kind: "login.failed", ipHash: input.ipHash, metadata: { surface: "host_google" } });
    return { ok: false };
  }
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { CompleteGoogleLoginHostInput, CompleteGoogleLoginHostResult } from "./auth/complete-google-login-host";
export { completeGoogleLoginHost } from "./auth/complete-google-login-host";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/host-auth.test.ts && pnpm --filter @albora/application exec vitest run src/auth/complete-google-login-host.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/host-auth.ts packages/db/src/host-auth.test.ts packages/db/src/index.ts packages/application/src/auth/complete-google-login-host.ts packages/application/src/auth/complete-google-login-host.test.ts packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(auth): completeGoogleLoginHost — resolve/cria account e emite sessão

resolveOrCreateAccountByEmail extraído de emitirMagicLink (mesma
semântica, sem o link). issueMarkedHostSession aceita impersonationId
null — login Google nunca nasce de impersonação. Grava audit_log
host.login.google no sucesso, security_events login.failed na falha.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Staff — `findStaffByEmail` → `albora_staff` ou nega

**Files:**
- Create: `packages/application/src/auth/complete-google-login-staff.ts`
- Create: `packages/application/src/auth/complete-google-login-staff.test.ts`
- Modify: `packages/application/src/index.ts`

**Interfaces:**
```ts
export type CompleteGoogleLoginStaffInput = { email: string; ipHash: string };
export type CompleteGoogleLoginStaffResult = { ok: true; staffUserId: string } | { ok: false };
export async function completeGoogleLoginStaff(
  pool: Pool, input: CompleteGoogleLoginStaffInput,
): Promise<CompleteGoogleLoginStaffResult>
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/application/src/auth/complete-google-login-staff.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { completeGoogleLoginStaff } from "./complete-google-login-staff";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

async function staffAtivo() {
  const sufixo = Math.random().toString(36).slice(2);
  const email = `staff-${sufixo}@albora.com`;
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO staff_users (email, name, status) VALUES ($1, $2, 'active') RETURNING id",
    [email, "Staff de Teste"],
  );
  return { id: rows[0]!.id, email };
}

describe("completeGoogleLoginStaff", () => {
  it("staff ativo entra e grava audit_log staff.login", async () => {
    await prepararBanco();
    const { id, email } = await staffAtivo();

    const resultado = await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });
    expect(resultado).toEqual({ ok: true, staffUserId: id });

    const { rows } = await admin.query(
      "SELECT action, target_kind, target_id FROM audit_log WHERE action = 'staff.login' AND target_id = $1",
      [id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.target_kind).toBe("staff_user");
  });

  it("e-mail que não é da equipe nega, com mensagem genérica e security_events", async () => {
    await prepararBanco();
    const resultado = await completeGoogleLoginStaff(app, { email: "estranho@gmail.com", ipHash: "hash-ip" });
    expect(resultado).toEqual({ ok: false });

    const { rows } = await admin.query(
      "SELECT kind, metadata FROM security_events WHERE kind = 'login.failed' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.metadata).toMatchObject({ surface: "staff_google" });
  });

  it("staff suspenso nega EXATAMENTE como e-mail inexistente — não vira oráculo", async () => {
    await prepararBanco();
    const sufixo = Math.random().toString(36).slice(2);
    const email = `staff-suspenso-${sufixo}@albora.com`;
    await admin.query("INSERT INTO staff_users (email, name, status) VALUES ($1, $2, 'suspended')", [email, "Suspenso"]);

    const resultado = await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });
    expect(resultado).toEqual({ ok: false });
  });

  it("NUNCA cria staff novo", async () => {
    await prepararBanco();
    const email = `nunca-existiu-${Math.random().toString(36).slice(2)}@gmail.com`;
    await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });
    const { rows } = await admin.query("SELECT id FROM staff_users WHERE email = $1", [email]);
    expect(rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/auth/complete-google-login-staff.test.ts`

Expected: FAIL — `Cannot find module './complete-google-login-staff'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/application/src/auth/complete-google-login-staff.ts
import type { Pool } from "pg";
import { findStaffByEmail, insertAuditLog, insertSecurityEvent } from "@albora/db";

export type CompleteGoogleLoginStaffInput = { email: string; ipHash: string };
export type CompleteGoogleLoginStaffResult = { ok: true; staffUserId: string } | { ok: false };

/**
 * NUNCA cria staff — nasce só por convite (`staff.manage`). "Não existe" e
 * "existe mas suspenso" devolvem o MESMO `{ ok: false }` e o mesmo
 * `security_events`, pra não virar oráculo que revela quem é da equipe
 * (spec §6). Sem restrição de domínio — decisão do dono, registrada no
 * ADR 0018 como endurecimento futuro disponível.
 */
export async function completeGoogleLoginStaff(
  pool: Pool,
  input: CompleteGoogleLoginStaffInput,
): Promise<CompleteGoogleLoginStaffResult> {
  const staff = await findStaffByEmail(pool, input.email.trim().toLowerCase());

  if (!staff || staff.status !== "active") {
    await insertSecurityEvent(pool, {
      kind: "login.failed",
      ipHash: input.ipHash,
      metadata: { surface: "staff_google" },
    });
    return { ok: false };
  }

  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: staff.id,
      action: "staff.login",
      targetKind: "staff_user",
      targetId: staff.id,
      reason: "login via Google OIDC",
      ipHash: input.ipHash,
    });
  } finally {
    client.release();
  }

  return { ok: true, staffUserId: staff.id };
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { CompleteGoogleLoginStaffInput, CompleteGoogleLoginStaffResult } from "./auth/complete-google-login-staff";
export { completeGoogleLoginStaff } from "./auth/complete-google-login-staff";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/application exec vitest run src/auth/complete-google-login-staff.test.ts && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/application/src/auth/complete-google-login-staff.ts packages/application/src/auth/complete-google-login-staff.test.ts packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(auth): completeGoogleLoginStaff — findStaffByEmail, nunca cria staff

Ativo entra e grava audit_log staff.login; inexistente e suspenso negam
IDÊNTICO (mesma resposta, mesmo security_events login.failed) — nunca
vira oráculo que revela quem é da equipe.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Migration 0068 — `guest_contacts` verificado

**Files:**
- Create: `packages/db/migrations/0068_guest_contacts_verificado.sql`
- Create: `packages/db/src/guest-contacts-verificado.test.ts`

**Interfaces:**
- Produces: colunas `guest_contacts.verified_at timestamptz`, `guest_contacts.verified_via text CHECK (IN ('google','magic_link'))`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/guest-contacts-verificado.test.ts
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

describe("migration 0068 — guest_contacts verificado", () => {
  it("aceita verified_via 'google' e 'magic_link'", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado teste', '1.0', now()) RETURNING id`,
      [e.eventoId],
    );
    for (const via of ["google", "magic_link"]) {
      await expect(
        admin.query(
          `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via)
           VALUES ($1, $2, 'email', $3, now(), $4)`,
          [e.eventoId, sessao[0]!.id, `${via}@exemplo.test`, via],
        ),
      ).resolves.not.toThrow();
    }
  });

  it("recusa verified_via fora do enum", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado teste', '1.0', now()) RETURNING id`,
      [e.eventoId],
    );
    await expect(
      admin.query(
        `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_via)
         VALUES ($1, $2, 'email', 'x@exemplo.test', 'inventado')`,
        [e.eventoId, sessao[0]!.id],
      ),
    ).rejects.toThrow();
  });

  it("contato não-verificado continua válido (verified_at/verified_via NULL)", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado teste', '1.0', now()) RETURNING id`,
      [e.eventoId],
    );
    await expect(
      admin.query(
        `INSERT INTO guest_contacts (event_id, session_id, channel, value) VALUES ($1, $2, 'whatsapp', '5511999999999')`,
        [e.eventoId, sessao[0]!.id],
      ),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/guest-contacts-verificado.test.ts`

Expected: FAIL — `column "verified_via" of relation "guest_contacts" does not exist`.

- [ ] **Step 3: Implementar o mínimo**

```sql
-- packages/db/migrations/0068_guest_contacts_verificado.sql
-- 0068 — contato verificado do convidado (Onda SSO, T7)
--
-- `channel` já aceita texto livre ('email'). verified_at/verified_via
-- distinguem um contato VERIFICADO (posse de e-mail provada — Google ou
-- magic link do convidado) de um contato só digitado; a entrega das
-- memórias deve preferir o verificado. NULL-áveis: contatos existentes e
-- não-verificados continuam válidos.
ALTER TABLE guest_contacts ADD COLUMN verified_at timestamptz;
ALTER TABLE guest_contacts ADD COLUMN verified_via text
  CHECK (verified_via IN ('google', 'magic_link'));
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/guest-contacts-verificado.test.ts && pnpm --filter @albora/db typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/migrations/0068_guest_contacts_verificado.sql packages/db/src/guest-contacts-verificado.test.ts
git commit -m "$(cat <<'EOF'
feat(db): migration 0068 — guest_contacts.verified_at/verified_via

Distingue contato VERIFICADO (posse de e-mail provada) de contato só
digitado; NULL-ável — contatos existentes continuam válidos.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Convidado — reivindicar (BLINDADO)

**Files:**
- Modify: `packages/db/src/sessions.ts`
- Modify: `packages/db/src/sessions.test.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/application/src/auth/claim-guest-photos.ts`
- Create: `packages/application/src/auth/claim-guest-photos.test.ts`
- Modify: `packages/application/src/index.ts`

**Interfaces:**
```ts
export async function isGuestSessionLive(pool: Pool, eventId: string, sessionId: string): Promise<boolean>

export type ClaimGuestPhotosByEmailInput = { eventId: string; guestSessionId: string; email: string };
export type ClaimGuestPhotosByEmailResult = { ok: true } | { ok: false; reason: "session_not_live" };
export async function claimGuestPhotosByEmail(
  pool: Pool, input: ClaimGuestPhotosByEmailInput,
): Promise<ClaimGuestPhotosByEmailResult>
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/db/src/sessions.test.ts — adicionar ao describe existente
import { isGuestSessionLive } from "./sessions";

describe("isGuestSessionLive", () => {
  it("true para sessão com token não-expirado/não-revogado", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado vivo', '1.0', now()) RETURNING id`,
      [e.eventoId],
    );
    await admin.query(
      `INSERT INTO session_tokens (token_hash, event_id, session_id, expires_at)
       VALUES ($1, $2, $3, now() + interval '1 hour')`,
      [Buffer.from(`hash-viva-${sessao[0]!.id}`), e.eventoId, sessao[0]!.id],
    );
    await expect(isGuestSessionLive(app, e.eventoId, sessao[0]!.id)).resolves.toBe(true);
  });

  it("false para sessão expirada, revogada ou inexistente", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado morto', '1.0', now()) RETURNING id`,
      [e.eventoId],
    );
    await admin.query(
      `INSERT INTO session_tokens (token_hash, event_id, session_id, expires_at, revoked_at)
       VALUES ($1, $2, $3, now() + interval '1 hour', now())`,
      [Buffer.from(`hash-morta-${sessao[0]!.id}`), e.eventoId, sessao[0]!.id],
    );
    await expect(isGuestSessionLive(app, e.eventoId, sessao[0]!.id)).resolves.toBe(false);
    await expect(isGuestSessionLive(app, e.eventoId, "00000000-0000-0000-0000-000000000000")).resolves.toBe(false);
  });
});
```

```ts
// packages/application/src/auth/claim-guest-photos.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { claimGuestPhotosByEmail } from "./claim-guest-photos";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

async function sessaoDeConvidadoViva(eventoId: string) {
  const sufixo = Math.random().toString(36).slice(2);
  const { rows: s } = await admin.query<{ id: string }>(
    `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
     VALUES ($1, $2, '1.0', now()) RETURNING id`,
    [eventoId, `convidado-${sufixo}`],
  );
  const sessionId = s[0]!.id;
  await admin.query(
    `INSERT INTO session_tokens (token_hash, event_id, session_id, expires_at) VALUES ($1, $2, $3, now() + interval '1 hour')`,
    [Buffer.from(`hash-${sufixo}`), eventoId, sessionId],
  );
  return sessionId;
}

describe("claimGuestPhotosByEmail", () => {
  it("grava guest_contacts verificado quando a sessão está viva no evento", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const sessionId = await sessaoDeConvidadoViva(e.eventoId);

    const resultado = await claimGuestPhotosByEmail(app, {
      eventId: e.eventoId, guestSessionId: sessionId, email: "convidado@exemplo.test",
    });
    expect(resultado).toEqual({ ok: true });

    const { rows } = await admin.query(
      `SELECT verified_at, verified_via FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = 'convidado@exemplo.test'`,
      [e.eventoId, sessionId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].verified_via).toBe("google");
    expect(rows[0].verified_at).not.toBeNull();
  });

  it("sessão inexistente/expirada nunca grava contato", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const resultado = await claimGuestPhotosByEmail(app, {
      eventId: e.eventoId, guestSessionId: "00000000-0000-0000-0000-000000000000", email: "x@exemplo.test",
    });
    expect(resultado).toEqual({ ok: false, reason: "session_not_live" });
  });

  it("BLINDADO — nunca cria accounts nem sessão de host (prova por ausência)", async () => {
    await prepararBanco();
    const { e } = await semear(admin);
    const sessionId = await sessaoDeConvidadoViva(e.eventoId);

    const { rows: antesAccounts } = await admin.query("SELECT count(*) FROM accounts");
    const { rows: antesHostSessions } = await admin.query("SELECT count(*) FROM host_sessions");

    await claimGuestPhotosByEmail(app, {
      eventId: e.eventoId, guestSessionId: sessionId, email: "convidado-blindado@exemplo.test",
    });

    const { rows: depoisAccounts } = await admin.query("SELECT count(*) FROM accounts");
    const { rows: depoisHostSessions } = await admin.query("SELECT count(*) FROM host_sessions");
    expect(depoisAccounts[0].count).toBe(antesAccounts[0].count);
    expect(depoisHostSessions[0].count).toBe(antesHostSessions[0].count);
  });

  it("REGRA DE REVIEW (ADR 0018) — o código do caminho guest nunca referencia accounts nem sessão de host", () => {
    const arquivo = path.join(path.dirname(fileURLToPath(import.meta.url)), "claim-guest-photos.ts");
    const fonte = readFileSync(arquivo, "utf8");
    expect(fonte).not.toMatch(/\baccounts\b/);
    expect(fonte).not.toMatch(/hostCookie|issueMarkedHostSession|host_sessions/);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/sessions.test.ts && pnpm --filter @albora/application exec vitest run src/auth/claim-guest-photos.test.ts`

Expected: FAIL — `isGuestSessionLive is not a function`, `Cannot find module './claim-guest-photos'`.

- [ ] **Step 3: Implementar o mínimo**

```ts
// packages/db/src/sessions.ts — adicionar ao arquivo existente

/**
 * Liveness por (eventId, sessionId) — SEM precisar do token opaco cru.
 * `resolverSessao` exige o token (é o caminho normal do próprio convidado);
 * o callback do OIDC (T8, Onda SSO) só tem os IDs vindos do `state`
 * assinado, nunca o token — por isso esta função consulta `session_tokens`
 * direto, fora de RLS (mesma tabela e mesmo motivo de `resolverSessao`).
 */
export async function isGuestSessionLive(pool: Pool, eventId: string, sessionId: string): Promise<boolean> {
  const { rows } = await pool.query<{ live: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM session_tokens
        WHERE event_id = $1 AND session_id = $2
          AND revoked_at IS NULL AND expires_at > now()
     ) AS live`,
    [eventId, sessionId],
  );
  return rows[0]?.live ?? false;
}
```

```ts
// packages/db/src/index.ts — adicionar ao bloco de sessions
export { isGuestSessionLive } from "./sessions";
```

```ts
// packages/application/src/auth/claim-guest-photos.ts
import type { Pool } from "pg";
import { isGuestSessionLive } from "@albora/db";

export type ClaimGuestPhotosByEmailInput = { eventId: string; guestSessionId: string; email: string };
export type ClaimGuestPhotosByEmailResult = { ok: true } | { ok: false; reason: "session_not_live" };

/**
 * BLINDADO (ADR 0018, Decisão 2): NUNCA cria `accounts`, NUNCA emite
 * cookie de host, NUNCA cruza eventos. Só grava/confirma um contato
 * verificado NA MESMA guest_session — o convidado continua anônimo
 * depois disso. Qualquer código aqui que toque `accounts` ou sessão de
 * host é defeito bloqueante — a regra de review acima prova isso por
 * ausência no próprio código-fonte.
 */
export async function claimGuestPhotosByEmail(
  pool: Pool,
  input: ClaimGuestPhotosByEmailInput,
): Promise<ClaimGuestPhotosByEmailResult> {
  const vivo = await isGuestSessionLive(pool, input.eventId, input.guestSessionId);
  if (!vivo) return { ok: false, reason: "session_not_live" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.event_id', $1, true)", [input.eventId]);

    const email = input.email.trim().toLowerCase();
    const { rows: existente } = await client.query<{ id: string }>(
      `SELECT id FROM guest_contacts WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [input.eventId, input.guestSessionId, email],
    );

    if (existente.length > 0) {
      await client.query(
        `UPDATE guest_contacts SET verified_at = now(), verified_via = 'google' WHERE id = $1`,
        [existente[0]!.id],
      );
    } else {
      await client.query(
        `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via)
         VALUES ($1, $2, 'email', $3, now(), 'google')`,
        [input.eventId, input.guestSessionId, email],
      );
    }

    await client.query("COMMIT");
    return { ok: true };
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}
```

```ts
// packages/application/src/index.ts — adicionar
export type { ClaimGuestPhotosByEmailInput, ClaimGuestPhotosByEmailResult } from "./auth/claim-guest-photos";
export { claimGuestPhotosByEmail } from "./auth/claim-guest-photos";
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @albora/db exec vitest run src/sessions.test.ts && pnpm --filter @albora/application exec vitest run src/auth/claim-guest-photos.test.ts && pnpm --filter @albora/db typecheck && pnpm --filter @albora/application typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add packages/db/src/sessions.ts packages/db/src/sessions.test.ts packages/db/src/index.ts packages/application/src/auth/claim-guest-photos.ts packages/application/src/auth/claim-guest-photos.test.ts packages/application/src/index.ts
git commit -m "$(cat <<'EOF'
feat(auth): claimGuestPhotosByEmail — convidado reivindica sem virar conta

isGuestSessionLive checa vivacidade por (eventId, sessionId) sem exigir
o token opaco cru. claimGuestPhotosByEmail é BLINDADO (ADR 0018): nunca
cria accounts, nunca emite cookie de host — provado por ausência no
teste e no próprio código-fonte (regra de review).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: UI — botões "Entrar com Google"

**Files:**
- Modify: `apps/web/features/admin/components/client/sign-in-form.tsx`
- Modify: `apps/web/features/admin/components/client/sign-in-form.test.ts`
- Modify: `apps/web/features/console/components/client/login-form.tsx`
- Create: `apps/web/features/console/components/client/login-form.test.tsx`
- Create: `apps/web/features/guest/components/client/claim-photos-button.tsx`
- Create: `apps/web/features/guest/components/client/claim-photos-button.test.tsx`
- Modify: `apps/web/features/photo/components/steps/success-step.tsx`
- Create: `apps/web/features/photo/components/steps/success-step.test.tsx`

**Interfaces:**
```ts
export type ClaimPhotosButtonProps = { eventId: string };
export function ClaimPhotosButton(props: ClaimPhotosButtonProps): JSX.Element
// SuccessStep ganha um campo novo, opcional, aditivo:
type SuccessStepProps = { /* ...campos existentes... */; eventId?: string };
```

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/features/admin/components/client/sign-in-form.test.ts — adicionar ao describe existente
it("mostra o botão 'Entrar com Google' apontando para /auth/google/start?surface=host", async () => {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign }, writable: true });
  render(<SignInForm magic={null} />);

  await userEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
  expect(assign).toHaveBeenCalledWith("/auth/google/start?surface=host");
});
```

```tsx
// apps/web/features/console/components/client/login-form.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

vi.mock("@/features/console/actions", () => ({
  requestLoginAction: vi.fn().mockResolvedValue({ sent: true }),
  completeLoginAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("LoginForm", () => {
  it("mostra o botão 'Entrar com Google' apontando para /auth/google/start?surface=staff", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<LoginForm magic={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    expect(assign).toHaveBeenCalledWith("/auth/google/start?surface=staff");
  });
});
```

```tsx
// apps/web/features/guest/components/client/claim-photos-button.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClaimPhotosButton } from "./claim-photos-button";

describe("ClaimPhotosButton", () => {
  it("aponta para /auth/google/start com surface=guest e o eventId recebido", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<ClaimPhotosButton eventId="evento-123" />);

    await userEvent.click(screen.getByRole("button", { name: "Receber minhas fotos" }));
    expect(assign).toHaveBeenCalledWith("/auth/google/start?surface=guest&eventId=evento-123");
  });
});
```

```tsx
// apps/web/features/photo/components/steps/success-step.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuccessStep } from "./success-step";

describe("SuccessStep", () => {
  const propsBase = { uploadId: "upload-123", onRestart: vi.fn(), onViewFeed: vi.fn() };

  it("sem eventId, NÃO mostra o botão de reivindicar — nunca antes da sessão ativa (ADR 0018)", () => {
    render(<SuccessStep {...propsBase} />);
    expect(screen.queryByRole("button", { name: "Receber minhas fotos" })).not.toBeInTheDocument();
  });

  it("com eventId, mostra o botão de reivindicar", () => {
    render(<SuccessStep {...propsBase} eventId="evento-123" />);
    expect(screen.getByRole("button", { name: "Receber minhas fotos" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/admin/components/client/sign-in-form.test.ts features/console/components/client/login-form.test.tsx features/guest/components/client/claim-photos-button.test.tsx features/photo/components/steps/success-step.test.tsx`

Expected: FAIL — botão "Entrar com Google" inexistente nos dois primeiros; `Cannot find module './claim-photos-button'`; `SuccessStep` ainda não aceita `eventId`.

- [ ] **Step 3: Implementar o mínimo**

```tsx
// apps/web/features/admin/components/client/sign-in-form.tsx — dentro de RequestLink, adicionar após o </form>
      <div className="flex items-center gap-3 text-ink-3">
        <span className="h-px flex-1 bg-linha" />
        <span className="tipo-caption">ou</span>
        <span className="h-px flex-1 bg-linha" />
      </div>
      <SecondaryButton
        onClick={() =>
          window.location.assign(`/auth/google/start?surface=host${next ? `&returnTo=${encodeURIComponent(next)}` : ""}`)
        }
      >
        Entrar com Google
      </SecondaryButton>
```

```tsx
// apps/web/features/console/components/client/login-form.tsx — dentro de RequestLink, no ramo "não enviado", adicionar após o PrimaryButton
            <div className="flex items-center gap-3 text-ink-3">
              <span className="h-px flex-1 bg-linha" />
              <span className="tipo-caption">ou</span>
              <span className="h-px flex-1 bg-linha" />
            </div>
            <PrimaryButton
              disabled={pending}
              onClick={() => window.location.assign("/auth/google/start?surface=staff")}
            >
              Entrar com Google
            </PrimaryButton>
```

```tsx
// apps/web/features/guest/components/client/claim-photos-button.tsx
"use client";

import { SecondaryButton } from "@albora/ui-web";

export type ClaimPhotosButtonProps = { eventId: string };

/**
 * "Receber minhas fotos" — nunca antes da primeira foto (ADR 0018). Só
 * renderizado pelo pai (`SuccessStep`) dentro de uma sessão de convidado já
 * ativa. `eventId` é só um rótulo público de qual evento — nunca o segredo
 * da sessão: o servidor resolve `guestSessionId` a partir do cookie da
 * própria sessão em `/auth/google/start` (nunca da URL).
 */
export function ClaimPhotosButton({ eventId }: ClaimPhotosButtonProps) {
  return (
    <SecondaryButton
      onClick={() => window.location.assign(`/auth/google/start?surface=guest&eventId=${encodeURIComponent(eventId)}`)}
    >
      Receber minhas fotos
    </SecondaryButton>
  );
}
```

```tsx
// apps/web/features/photo/components/steps/success-step.tsx — arquivo inteiro, modificado
"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, SecondaryButton } from "@albora/ui-web";
import { ClaimPhotosButton } from "@/features/guest/components/client/claim-photos-button";

type SuccessStepProps = {
  uploadId: string;
  onRestart: () => void;
  onViewFeed: () => void;
  showPwaInstall?: boolean;
  onInstallPwa?: () => void;
  /** Presente só dentro de uma sessão de convidado ativa (ADR 0018) — sem ele, o botão de reivindicar nunca renderiza. */
  eventId?: string;
};

const ESTILO = `
@keyframes sucesso-amanhecer {
  from { opacity: 0; transform: translateY(0.6rem); }
  to   { opacity: 1; transform: none; }
}
.sucesso-entra { animation: sucesso-amanhecer var(--tempo-lento) var(--curva) both; }
@media (prefers-reduced-motion: reduce) {
  .sucesso-entra { animation: none; }
}
`;

/**
 * Etapa de sucesso após upload.
 * Mostra confirmação e oferece próximas ações.
 */
export function SuccessStep({
  uploadId,
  onRestart,
  onViewFeed,
  showPwaInstall = false,
  onInstallPwa,
  eventId,
}: SuccessStepProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`grid gap-6 ${show ? "sucesso-entra" : "opacity-0"}`}>
      <style>{ESTILO}</style>

      <div className="text-center">
        <h2 className="tipo-display m-0">Foto enviada!</h2>
        <p className="mt-2 tipo-body text-ink-2">
          Sua foto já está no álbum do evento
        </p>
      </div>

      {showPwaInstall && onInstallPwa && (
        <Card elevation={1} className="grid gap-3">
          <p className="m-0 tipo-caption font-medium text-ink">
            Instale o app para enviar fotos mais rápido
          </p>
          <PrimaryButton onClick={onInstallPwa}>Instalar agora</PrimaryButton>
        </Card>
      )}

      <div className="grid gap-3">
        <PrimaryButton onClick={onRestart}>Tirar outra foto</PrimaryButton>
        <SecondaryButton onClick={onViewFeed}>Ver todas as fotos</SecondaryButton>
      </div>

      {eventId && (
        <div className="text-center">
          <ClaimPhotosButton eventId={eventId} />
        </div>
      )}

      <p className="text-center tipo-caption text-ink-3">
        ID: {uploadId.slice(0, 12)}...
      </p>
    </div>
  );
}
```

> **Item aberto para quem executar esta task (lacuna #10):** o call site real que renderiza `<SuccessStep />` com props não foi localizado neste reconhecimento — o wizard (`use-photo-wizard.ts` ou o componente que mapeia passo→componente sob `apps/web/features/photo/components/`) provavelmente indexa os passos por um objeto/switch, fora do alcance de um grep direto por `"SuccessStep"`. Antes de fechar esta task, localizar esse call site (buscar por `import.*from ["']\.\./steps` ou pelo enum/união de nomes de passo que inclui `"success"`) e passar `eventId={eventoId}` ali — `eventoId` já está em escopo em `photo-page.tsx` (confirmado neste reconhecimento).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter web exec vitest run features/admin/components/client/sign-in-form.test.ts features/console/components/client/login-form.test.tsx features/guest/components/client/claim-photos-button.test.tsx features/photo/components/steps/success-step.test.tsx && pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**
```bash
source ~/.nvm/nvm.sh && nvm use 22
git add apps/web/features/admin/components/client/sign-in-form.tsx apps/web/features/admin/components/client/sign-in-form.test.ts apps/web/features/console/components/client/login-form.tsx apps/web/features/console/components/client/login-form.test.tsx apps/web/features/guest/components/client/claim-photos-button.tsx apps/web/features/guest/components/client/claim-photos-button.test.tsx apps/web/features/photo/components/steps/success-step.tsx apps/web/features/photo/components/steps/success-step.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): botões "Entrar com Google" nas três superfícies

Host (SignInForm) e staff (LoginForm) ganham o botão ao lado do magic
link. Convidado ganha ClaimPhotosButton, renderizado por SuccessStep só
quando eventId é passado (nunca antes da primeira foto, ADR 0018). Sem
hex, sem style inline — reusa PrimaryButton/SecondaryButton do design
system (alvo ≥44px garantido).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Verificação da onda (controller)

**Files:** nenhum arquivo novo — só comandos de verificação.

- [ ] **Step 1:** Rodar a suíte completa (principal + isolamento) e os guards.

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm typecheck
pnpm lint
pnpm --filter @albora/db exec vitest run
pnpm --filter @albora/application exec vitest run
pnpm --filter @albora/core exec vitest run
pnpm --filter @albora/integrations exec vitest run
pnpm --filter web exec vitest run
pnpm guards
```

Expected: tudo verde. **Nenhum comando roda `next build`/`next start`.**

- [ ] **Step 2:** Conferir manualmente (varredura, não teste automatizado):
  - Nenhuma rota sob `apps/web/app/auth/google/` importa `@albora/db` (`grep -n "@albora/db" apps/web/app/auth/google/*/route.ts` deve devolver vazio).
  - O caminho guest nunca toca `accounts` nem cookie/sessão de host — reler `claim-guest-photos.ts` e seu teste de "REGRA DE REVIEW" (T8) e confirmar que passou.
  - `email_verified` é exigido em `validateIdToken` (T2) — confirmar que o teste "rejeita email_verified ausente ou false" está verde.
  - Nenhum segredo do Google commitado: `git diff --stat` não deve listar nenhum arquivo `.env` (só `.env.example`, com placeholders).
  - `.env.example` documenta `GOOGLE_OIDC_CLIENT_ID`, `GOOGLE_OIDC_CLIENT_SECRET`, `GOOGLE_OIDC_REDIRECT_URI`.
  - Migrations 0067 (`oidc_states`) e 0068 (`guest_contacts` verificado) aplicam limpo em banco zerado (`prepararBanco()` já exercita isso em todo teste desta onda).

- [ ] **Step 3:** Se tudo verde, a onda está pronta para revisão (`superpowers:requesting-code-review`) — sem merge automático (regra não-negociável do CLAUDE.md).

---

## Auto-revisão

1. **Toda tarefa da espinha virou task:** T1 (client OIDC) ✓, T2 (validação id_token) ✓, T3 (state) ✓, T4 (rotas) ✓, T5 (host) ✓, T6 (staff) ✓, T7 (migration guest_contacts) ✓, T8 (convidado blindado) ✓, T9 (UI) ✓, T10 (verificação) ✓. Nenhuma da espinha ficou de fora.
2. **Varredura de placeholder:** nenhuma ocorrência de `TODO`, `// ...`, `<implementar>` ou "pseudocódigo" em qualquer bloco de código deste documento — todo passo tem código completo e real. O único texto de "item aberto" (T9, lacuna #10) é uma instrução explícita para quem executa localizar um call site, não um placeholder de código.
3. **Consistência de tipos entre tasks:** `OidcSurface` (T3) é o mesmo tipo usado por `StartGoogleLoginInput` (T4) e pelas rotas; `OidcStatePayload` (T3) é o que `consumeOidcState` devolve e o que a rota de callback (T4) desestrutura (`payload.surface`, `payload.returnTo`, `payload.eventId`, `payload.guestSessionId`); `CompleteGoogleLoginHostResult`/`CompleteGoogleLoginStaffResult` (T5/T6) são os tipos que a rota de callback (T4) consome com `if (!resultado.ok)`; `ClaimGuestPhotosByEmailInput` (T8) usa exatamente os campos que a rota extrai de `payload` no ramo `guest`.
4. **Nenhuma query menciona tabela/coluna não confirmada:** `oidc_states` (nova, migration 0067, T3), `guest_contacts.verified_at/verified_via` (novas, migration 0068, T7) — ambas claramente marcadas como criadas nesta onda. Todas as outras tabelas/colunas referenciadas (`accounts`, `staff_users`, `host_sessions`, `guest_sessions`, `session_tokens`, `audit_log`, `security_events`) foram confirmadas por leitura direta do código/migrations existentes durante o reconhecimento.
5. **Caminho guest nunca toca `accounts` nem cookie de host:** reconferido em T4 (rota de callback: o ramo `guest` só chama `claimGuestPhotosByEmail`, nunca `completeGoogleLoginHost`/`hostCookie`), T8 (`claim-guest-photos.ts` não importa nada de `accounts`/`host_sessions`/`hostCookie`/`issueMarkedHostSession` — provado pelo teste de "REGRA DE REVIEW" que lê o próprio arquivo-fonte), e T9 (`ClaimPhotosButton` só aponta para `surface=guest`, nunca cria sessão nenhuma no cliente). Nenhuma task desta onda contradiz isso.
