# 0021 — Identidade tardia: o feed antes do nome e do consentimento (atrás de flag)

- **Status:** Proposed (flag `lateIdentity` desligada; caminho atual é o fallback)
- **Data:** 2026-09-08
- **Relaciona-se com:** [0004](./0004-anonymous-guest-session.md), [0009](./0009-app-social-do-convidado.md)

## Contexto

Hoje o convidado sem sessão cai no `EntryFlow`: chegada emocional → **nome + consentimento** → sessão → feed. A sessão nasce **antes** de o convidado ver qualquer coisa. O redesign v4 (fluxo B §3.2) propõe inverter: **"Entrar na festa" leva direto ao feed**, e o **nome + consentimento** são pedidos só na **1ª ação que precisa de identidade** — publicar, curtir, comentar, entrar numa missão — numa **folha** (`IdentitySheet`), não numa tela cheia. Depois disso, `isSameEventSession` faz o aparelho nunca mais perguntar.

A hipótese é de participação (a H1, ≥40%): tirar a fricção de identidade da frente do conteúdo faz mais gente chegar até a primeira foto. É o mesmo espírito da "segunda porta" já aplicada em [ADR 0008](./0008-app-nativo-como-segunda-porta.md) e [0018](./0018-sso-google-e-convidado-reivindica-fotos.md).

## Decisão

**Adotar identidade tardia como hipótese A/B, atrás da flag `lateIdentity` (off por padrão).** Enquanto desligada — o estado de produção hoje — vale o `EntryFlow` antes do feed, sem mudança. A flag vive em `apps/web/lib/flags.ts` (`lateIdentityEnabled()`, de `NEXT_PUBLIC_LATE_IDENTITY`).

### O que **não** muda — os não-negociáveis

- **Consentimento continua antes de qualquer captura.** A identidade tardia adia o consentimento em relação à *chegada*, **nunca** em relação à *captura*: a `IdentitySheet` cria a sessão com o **mesmo consentimento versionado** (`CONSENTIMENTO_ENTRADA_VIGENTE`, hoje `v1`) do `EntryFlow`, e ela abre **na 1ª ação que publica/reage** — antes de a foto subir. Ver o feed dos outros não captura mídia do convidado, então não exige o consentimento de captura.
- **Sessão opaca, escopada a um evento, não transferível** ([ADR 0004](./0004-anonymous-guest-session.md)): inalterada. A `IdentitySheet` usa o mesmo `POST /api/sessions`.
- **PII mascarada em log**, retenção por job: inalterado.

### O que esta MR entrega

- A **flag** (desligada) e a **`IdentitySheet`**: a versão em folha do passo de identidade (nome + consentimento versionado + "Ver detalhes"), que cria a sessão e roda a ação original no sucesso (`onEntered`). É o mecanismo que o redesign descreve ("pedir nome + consentimento só na 1ª ação, via sheet").
- Este ADR e o registro em `architecture.md`.

### O que esta MR **não** entrega (dependência de feed, MR seguinte)

Ligar a flag de ponta a ponta exige uma peça do **domínio do feed**, deixada para a trilha do feed:

1. **Leitura-espelho sem sessão.** `GET /api/feed` hoje exige `requireGuestSession`. Para o convidado ver o feed **antes** de ter sessão, o feed precisa servir um **espelho read-only sem sessão** — só conteúdo público do evento (o mesmo que o modo "espelho" já mostra), sem PII, com rate-limit chaveado por evento em vez de por sessão. Isso é mudança sensível de RLS/limite e pertence a quem cuida do feed.
2. **Gate por ação.** Curtir/comentar/publicar/missão passam a checar "tem sessão?"; sem sessão, abrem a `IdentitySheet` e, no `onEntered`, disparam a ação original. A `IdentitySheet` já existe; falta o wiring nos handlers do feed.
3. **Entrada.** Com a flag ligada, `/e/[slug]` sem sessão renderiza a chegada → "Entrar na festa" → **feed espelho** (em vez do passo de identidade). O passo de identidade vira a folha.

Enquanto o item 1 não existir, ligar a flag não teria o feed para mostrar — por isso ela nasce desligada, e o `EntryFlow` (que já ganhou a chegada emocional) segue como o caminho real.

## Alternativas rejeitadas

- **Criar a sessão em "Entrar na festa", só adiando o nome.** Mantém o feed funcionando (sessão existe), mas registra consentimento antes de o convidado decidir participar — o oposto do que a hipótese testa, e o REFATORACAO pede os dois adiados.
- **Renderizar o feed no cliente sem passar pelo `/api/feed`.** Duplicaria a leitura e furaria a RLS. O espelho tem de nascer no servidor, sob a mesma fronteira de evento.
- **Ligar por padrão.** A participação ainda não foi medida; o default é o caminho provado, a flag é como se mede o novo sem arriscar a H1.

## Consequências

- Produção **não muda** com a flag off — o fallback é o `EntryFlow` atual, testado.
- A `IdentitySheet` é reutilizável por qualquer ação que precise de identidade, então o wiring do feed é ligar handlers, não reinventar o passo.
- O backend do espelho fica especificado aqui, na fronteira certa (feed), para a trilha do feed executar sem re-decidir.
