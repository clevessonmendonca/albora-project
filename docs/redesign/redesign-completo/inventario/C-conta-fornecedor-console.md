# Inventário C — Conta do anfitrião, Fornecedor, Console de staff, Páginas públicas e Design System

Escopo: somente leitura do código em `apps/web` e `packages/{ui-web,tokens,packs}`, no worktree `merganser` (branch `feat/telao-conectar-por-link`). Nada foi executado; "não verificado" marca o que o código não permite afirmar. Caminhos relativos a `apps/web/` salvo indicação.

Convenções: ID `F` = funcionalidade/ação. Estados: C = carregando, E = erro, V = vazio, S = sucesso, P = permissão negada.

## 0. Tabela-resumo

| # | Rota | Arquivo principal | Superfície | Estados presentes | Problema mais grave |
|---|------|-------------------|-----------|-------------------|---------------------|
| 1 | `/admin` | `app/admin/page.tsx` | Anfitrião | V (boas-vindas), lista, sugestão de pack | Sem busca/ordenação/filtro; nome do evento é o slug humanizado |
| 2 | `/admin/sign-in` | `features/admin/components/client/sign-in-form.tsx` | Anfitrião | editing/sending/sent/error; Confirm ready/signingIn/error | `?error=google` do callback é ignorado |
| 3 | `/admin/new` (wizard, 5 passos) | `features/admin/components/client/create-event-wizard.tsx` + `onboarding/*` | Anfitrião | C parcial, E (banner), validação nos Detalhes | Erro genérico sem causa; `canAdvance` sempre true |
| 4 | `/admin/new` (tela Pronto) | `ReadyStep` no mesmo arquivo | Anfitrião | S, E de checkout | Checklist "Pronto" afirma itens sem checar; preço R$ 199 hardcoded |
| 5 | `/admin/billing` | `app/admin/billing/page.tsx` + `billing-history.tsx` | Anfitrião | C, E, V, S | Só leitura; sem ação de pagar/segunda via; sem paginação |
| 6 | `/auth/google/*`, `/auth/guest-magic/*` | `app/auth/**/route.ts` | SSO (sem UI) | redirects | Falhas voltam silenciosas para `/` |
| 7 | `/admin/vendor/new` | `app/admin/vendor/new/page.tsx` + `vendor-onboarding.tsx` | Fornecedor | idle/saving/error | Hex via `<input type=color>` nativo; step 2 sem preview |
| 8 | `/admin/vendor/checkout` | `app/admin/vendor/checkout/page.tsx` + `vendor-checkout-form.tsx` | Fornecedor | submitting/error/result | Descrições de plano duplicadas e divergentes da landing; sem e-mail de cobrança |
| 9 | `/admin/vendor/insights` | `app/admin/vendor/insights/page.tsx` | Fornecedor | V | Lista eventos por `/slug`, sem ordenar/filtrar |
| 10 | `/admin/vendor/[vendorId]/settings` | `.../settings/page.tsx` + `vendor-form.tsx` + `vendor-brand-tokens-editor.tsx` | Fornecedor | salvando/erro/salvo, P (staff) | Logo só por URL; hex digitado |
| 11 | `/admin/vendor/[vendorId]/team` | `.../team/page.tsx` + `vendor-team-manager.tsx` | Fornecedor | operation/feedback, limite de plano | Rótulo "Painel" aponta para o portal |
| 12 | `/admin/vendor/[vendorId]/billing` | `.../billing/page.tsx` + `vendor-billing-manager.tsx` | Fornecedor | sem assinatura, histórico off, bloqueios | Aside escuro `bg-ink`; selects/botões locais |
| 13 | `/f/[vendorSlug]` | `app/f/[vendorSlug]/page.tsx` + `vendor-portal-screen.tsx` | Fornecedor | V, P (404) | Eventos da carteira não são clicáveis |
| 14 | `/fornecedores` | `features/vendor-marketing/components/vendor-landing.tsx` | Público | estático | Resumo apenas (marketing) |
| 15 | `/console/login` | `features/console/components/client/login-form.tsx` | Staff | editing/sent; Confirm ready/error | Falha de rede sem tratamento; `?error=google` ignorado |
| 16 | `/console/reauth` | `reauth-form.tsx` | Staff | editing/sent; Confirm ready/error | Só a exclusão de conta leva a ela |
| 17 | `/console` | `app/console/(shell)/page.tsx` + `overview-sections.tsx` | Staff | V (fila e ao vivo), P implícito | Badges do menu nunca aparecem (`counts` não passado) |
| 18 | `/console/accounts` | `accounts/page.tsx` + `accounts-table.tsx` | Staff | V, V-filtrado | Busca navega a cada tecla; ordenação só da página |
| 19 | `/console/accounts/[id]` | `accounts/[id]/page.tsx` | Staff | 404 | Impersonação mostra id cru |
| 20 | `/console/events` | `events/page.tsx` + `events-table.tsx` | Staff | V, V-filtrado | Mesmo da lista de contas |
| 21 | `/console/events/[id]` | `events/[id]/page.tsx` | Staff | 404, vazios por painel | Sem ação nenhuma; só leitura |
| 22 | `/console/subscriptions` | `subscriptions/page.tsx` + `subscription-actions.tsx` | Staff | V | Coluna "Próxima cobrança" sempre "—"; N consultas por linha |
| 23 | `/console/support` | `support/page.tsx` + `ticket-detail.tsx` | Staff | V, "Selecione", P parcial | Resposta em campo de uma linha; só tickets open/pending |
| 24 | `/console/lgpd` | `lgpd/page.tsx` + `dsar-*.tsx` | Staff | V | Titular só por UUID digitado |
| 25 | `/console/retention` | `retention/page.tsx` | Staff | V | Evento mostrado como UUID; texto "Onda C" visível |
| 26 | `/console/audit` | `audit/page.tsx` + `audit-table.tsx` | Staff | V, V-filtrado | Sem exportar; sem "página anterior" |
| 27 | `/console/security` | `security/page.tsx` | Staff | V | Filtro por form GET; limite 200 sem aviso |
| 28 | `/console/staff` | só no `console-nav.tsx` | Staff | — | Link de menu sem página (404) |
| 29 | `/privacidade` | `app/privacidade/page.tsx` | Público | estático | Data "Atualizado em" hardcoded |
| 30 | `/15-anos` | `app/15-anos/page.tsx` | Público | estático | Resumo (landing por pack) |

Contagem: 30 linhas, das quais 28 telas com UI existente, 1 grupo de rotas sem UI (item 6) e 1 tela inexistente (item 28). Telas de UI efetivas: 28. Funcionalidades catalogadas (IDs F1 a F121 abaixo).

## 1. Entrada e conta do anfitrião

### 1.1 `/admin` — lista de eventos (`app/admin/page.tsx`)

Propósito: porta do anfitrião logado; lista os eventos da conta e sugere um próximo pack.

Dados/APIs: `listarEventosDoHost` (db, server component, `force-dynamic`); cookie `HOST_COOKIE` + `hostFromToken`; sem sessão faz `redirect("/admin/sign-in")` (sem `?next`).

Funcionalidades:
- F1. Título "Seu painel" com e-mail da conta como subtítulo (`AdminShell`).
- F2. Contador "N evento(s)".
- F3. Botão "+ Novo evento" (`/admin/new`).
- F4. Cartão por evento (link para `/admin/e/{id}`): nome, tipo do pack (via `resolvePackText(pack,"evento.nome")`), data curta (ano só se diferente do atual).
- F5. Selo de status calculado no servidor: `ao vivo` (pulsante, respeita `motion-reduce`), `agendado`, `encerrado`.
- F6. Cartão de sugestão de pack (`pack.sugereAntes`): título, lede e CTA vindos do pack; some se já existe evento daquele pack ou se todos encerraram.
- F7. Rodapé "Cerimonialista ou espaço de festas? Crie o portal do fornecedor" (`/admin/vendor/new`).
- F8. Cabeçalho: como não recebe `email`, mostra `SignOutButton` direto (um toque, sem confirmação), diferente do `MenuDaConta` com confirmação usado dentro do evento.

Estados: V = boas-vindas com três barras de acento e CTA "Criar meu primeiro evento". C: `app/admin/loading.tsx` (7 linhas, não lido em detalhe). E: `app/admin/error.tsx` ("Erro no painel", Tentar de novo, Ir ao painel). 404: `app/admin/not-found.tsx` ("Este evento não existe ou você não tem acesso a ele"). P: não aplicável (redireciona).

Componentes: `AdminShell`, `AdminSection`, `adminClasses.primaryButton[Sm]`, `Badge`.

Problemas de UX/UI:
- Nome exibido é `slugParaNome(e.slug)` (slug humanizado), não o título digitado; um evento "Casamento da Ana & Léo" aparece como "Casamento Da Ana Leo". O título real não é usado aqui (verificado: só `slug` e `packId` são lidos de `ResumoEvento`).
- Sem busca, ordenação, filtro por status ou agrupamento; ordem é a do banco.
- Evento ao vivo não ganha destaque nem atalho (ex.: "Ir ao vivo") — fica na mesma posição dos demais.
- Duas formas de sair da conta (botão solto aqui, menu com confirmação lá dentro).
- `error.tsx` do admin não chama `captureException` (o `app/error.tsx` raiz chama). Erros de painel podem não chegar ao Sentry.

### 1.2 `/admin/sign-in` (`app/admin/sign-in/page.tsx`, `sign-in-form.tsx`)

Propósito: entrar sem senha (magic link) ou com Google.

Funcionalidades:
- F9. Campo e-mail (regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`), botão "Enviar link" desabilitado se inválido; `POST /api/admin/entrar` com `{email, next?}`.
- F10. Estado "Verifique seu e-mail" (resposta neutra para não revelar se a conta existe), botão "Reenviar ou trocar e-mail" (volta a editar; não há reenvio direto nem contador).
- F11. Em dev, link "Abrir link (dev)" quando a API devolve `link`.
- F12. "Entrar com Google": `window.location.assign('/auth/google/start?surface=host&returnTo=…')`.
- F13. Tela Confirm (`?m=token`): botão "Entrar no painel" faz `POST /api/admin/sessao`; o token só é gasto no clique (prefetch de e-mail não consome).
- F14. `?next=` filtrado por `safeAdminNext` (só `/admin*`, bloqueia `//`, `://` e `\`).

Estados: editing, sending ("Enviando…"), sent, error ("Não conseguimos enviar agora…"), Confirm ready/signingIn/error ("Este link está inválido ou expirou. Solicite um novo link.").

Componentes: `PrimaryButton`, `SecondaryButton`, `TextField`, `AlboraLogo`; layout `fixed inset-0 grid place-items-center` (sem `AdminShell`).

Problemas:
- O callback do Google redireciona para `/admin/sign-in?error=google` em falha (`app/auth/google/callback/route.ts`, `fallbackFor`), mas `SignInForm` só lê `next` — o usuário volta à tela sem nenhuma mensagem (verificado: não há leitura de `error`).
- Sem opção de "reenviar" com intervalo; "Reenviar" é só voltar ao formulário.
- E-mail inválido só desabilita o botão; não explica por quê (sem `error` no `TextField`).
- Fallback de `Suspense` é texto cru "Carregando…" (`p-8`), sem layout de marca.
- Tela de confirmação com erro oferece `<a>` para novo link, mas não preenche o e-mail.

### 1.3 `/admin/new` — assistente de criação de evento (`create-event-wizard.tsx`, 877 linhas, + `onboarding/*`)

Propósito: criar evento em 5 passos com prévia ao vivo do convite.

Parâmetros de URL: `plano` (`free`|`celebration`), `nome` (pré-preenche título, máx. 60), `vendor`, `vendorSlug`, `vendorPlan`. Sem sessão a página redireciona para `/admin/sign-in?next=…` preservando esses parâmetros (valida UUID de `vendor`, e o plano do fornecedor contra a lista).

Passos (`STEPS`): Tipo de evento, Detalhes, Identidade, Participação, Revisão.

Funcionalidades:
- F15. Passo 1 `TypeStep`: radiogroup de packs de criação (`packsDeCriacao()`, ordem por `ordemCriacao`: casamento 1, aniversário 2, formatura 3, corporativo 4, celebração 5, outro 6) com ícone `Glyph`, foto e nome; linha "Momentos e missões já prontos pra {preparo}" e botão "Ajustar missões · ativas/total".
- F16. Atalhos de teclado (Linear): número 1-9 escolhe tipo (passo 0) ou estilo (passo 2), Enter avança, Backspace/Escape volta; ignorados em campos, botões, links, selects e dialogs.
- F17. Passo 2 `DetailsStep`: Nome do evento (obrigatório, `maxLength` 60 com contador, `autoFocus`), Data e hora (`DateTimeField` próprio: calendário, horário, "Hoje", fecha com Escape), convidados esperados, Local (com busca por CEP via ViaCEP: máscara 00000-000, ignora respostas atrasadas por `cepReqRef`, degrada para digitação manual, status idle/loading/erro), lista de momentos do pack.
- F18. Seletor "Criar sob" (só aparece se `GET /api/admin/vendors` devolve fornecedores): Minha conta ou fornecedor; escolhido o fornecedor, exige e-mail de quem recebe o painel (validado) e avisa que "quem cria aqui entra como cerimonialista".
- F19. Validação: título e data obrigatórios; só aparece erro depois da primeira tentativa de avançar (`showErrors`).
- F20. Passo 3 Identidade: botão de capa (upload JPG/PNG/WebP via input `sr-only`, paleta extraída da foto por `paletteFromImage`), `CapaFocoField` (foco vertical/horizontal), `AppearanceStep` com 5 estilos (`editorial`, `minimal`, `contempo`, `fotografico`, `classic`) e par de cores (`ColorField` Principal/Detalhe com popover, combos `EVENT_COLOR_COMBOS`, cores sugeridas, cores da foto).
- F21. `LivePreview`: prévia do convite do convidado (inline no mobile no passo 3, coluna sticky `18rem` no desktop, folha "Prévia do convite" nos demais passos no mobile). Clicar na capa da prévia reabre o seletor.
- F22. Passo 4 Participação: lista de missões ligadas + missões livres; botão "Escolher missões" abre `MissionSheet` (switches por missão do pack, adicionar/remover missão livre, Esc fecha, foco volta ao gatilho).
- F23. Passo 5 Revisão: resumo (tipo, nome, data, identidade, participação) com botão de editar por linha que volta ao passo correspondente.
- F24. Navegação: `StepRail` (só desktop; só passos já visitados clicáveis: `disabled={index >= step}`), cabeçalho de progresso mobile "Etapa N de 5" com barras, rodapé fixo com "Voltar" e "Continuar"/"Criar evento", link "Sair" para `/admin` (sem confirmação de descarte).
- F25. Criação: `POST /api/admin/events` com `packId`, `title`, `comecaEm` (hora padrão 18:00), `terminaEm` (+6 h), `timezone` (auto-detectado), `expectedGuests`, `identityTokens`, `missoes`, `telaoModelos` (4 modelos fixos: polaroide, mural, colagem, dump), `vendorId`/`coupleEmail`. Depois `PUT /api/admin/events/{id}/challenges` para missões livres (falha engolida).

Estados: sem tela de carregamento global; `status` editing/creating/error; erro único "Não deu para criar agora. Confira os dados e tente de novo." (sem causa, sem destaque no campo). Botão "Criando…".

Problemas:
- Mensagem de erro genérica e sem foco/rolagem para o campo problemático; erro 4xx (limite, slug) e 5xx são tratados iguais.
- `NavBar` recebe `canAdvance={true}` fixo (parâmetro morto); passos 0, 2, 3 nunca bloqueiam.
- "Sair" no cabeçalho descarta todo o preenchimento sem confirmar; não há rascunho persistido.
- Fuso e idioma são auto-detectados e invisíveis; usuário não vê o fuso que será gravado (o `TimezoneField` existe em `features/admin/components/client/timezone-field.tsx`, mas não entra no assistente).
- Data sem hora cai em 18:00 sem aviso na UI.
- `telaoModelos` fixo em 4 modelos; a escolha do telão não faz parte do passo "Identidade".
- `MissionSheet` reimplementa overlay/dialog próprio (`role=dialog`, Esc manual) em vez de usar `BottomSheet`/`Dialog` do DS.
- Na etapa de fornecedor o e-mail é um `<input>` cru, não `TextField` (sem rótulo visível, só `aria-label`; estilos locais).
- Pack casamento usa ícone `heart` (`packages/packs/src/casamento.ts`, renderizado em `Glyph`) — o `CLAUDE.md` do repo lista "ícone de aliança/pombinha/coração" entre anti-padrões bloqueantes. Possível violação; não verificado se o guard cobre `Glyph`.
- A classe `bg-surface` (usada em `ReadyStep` e `convite-card.tsx`) não existe no tema (`tailwind.css` define `--color-superficie`, não `--color-surface`): fundo não aplicado (verificado por grep).

### 1.4 Tela "Pronto" (`ReadyStep`)

Propósito: confirma criação, dá caminho principal e checklist de próximos passos.

Funcionalidades:
- F26. Herói com check animado e título "{nome} está pronto." na cor do casal (`--ev`), data em caixa alta.
- F27. CTA principal "Ir para meu evento" (`/admin/e/{id}`).
- F28. "Ver como convidado" (`eventEntryUrl(origin, slug, 'link')`) e "Compartilhar" (WhatsApp, `whatsappInviteUrl`).
- F29. `CoverImageEditor` compacto com `autoUploadFile`: envia em silêncio a capa escolhida no assistente.
- F30. `ConviteCard`: QR gerado no cliente (`qrcode`, nível M, 320 px), link curto, `CopiarLinkEvento`, "Baixar placa com QR" (`/admin/e/{id}/qrcode`).
- F31. `AccessEmailStep` atrás da flag `delayedAuthEnabled()` (ADR 0020): e-mail para enviar o acesso ao evento via magic link, sem linguagem de senha.
- F32. Se veio de fornecedor: botão "Abrir portal do fornecedor" (`/f/{slug}?plan=…#assinatura`).
- F33. Se `plano=celebration`: botão "Ativar o Completo — R$ 199" -> `POST /api/billing/checkout`; se vier `invoiceUrl` redireciona; se `pay_stub_*` chama `POST /api/billing/simulate` e vai para `/admin/e/{id}?pago=1`; erro "Não abriu o checkout. Tente de novo no painel."
- F34. Checklist "Já pronto: X de 4": Missões, Telão, QR e materiais, Equipe, cada um com link para a subpágina (`missions`, `identity`, `qrcode`, `team`).

Problemas:
- Telão e QR são marcados `pronto: true` por constante, não por verificação; só "Missões" e "Equipe" variam. O contador "Já pronto" é inflado.
- Preço "R$ 199" e nome "Completo" hardcoded no JSX (viola a regra de valores só em catálogo; `docs/redesign/fornecedor.md` já pede isso).
- Muitos CTAs competem (ir ao evento, ver como convidado, compartilhar, convite, e-mail, fornecedor, pagar, 4 itens de checklist).
- O link "Sair do assistente" não existe aqui, o usuário pode refazer o fluxo e duplicar evento.
- Usa `<a>` em vez de `Link` (navegação completa).
- Elementos usam `rounded-xl` e `bg-surface` (token inexistente).

### 1.5 `/admin/billing` (`app/admin/billing/page.tsx`, `billing-history.tsx`)

Propósito: histórico de cobranças de eventos pagos da conta (Asaas ao vivo).

Funcionalidades:
- F35. Cabeçalho "Cobranças" com voltar "← Painel".
- F36. Lista: data, forma (Pix/Cartão de crédito/Boleto), descrição, valor BRL, selo de status (10 rótulos mapeados: Pendente, Confirmada, Recebida, Vencida, Estornada, Estorno solicitado/em curso, Removida, Em análise), link "Ver fatura" (nova aba).
- F37. `GET /api/admin/billing`.

Estados: C (3 blocos pulsantes, sem `aria-busy`), E (`role=alert`: "Não foi possível carregar…", sem botão de tentar de novo), V ("Nenhuma cobrança ainda"), S.

Problemas: sem paginação ou filtro; `invoiceUrl` aberto direto (sem checagem de protocolo, ao contrário do billing do fornecedor que valida `https`); status desconhecido aparece cru; sem ação para quitar uma cobrança pendente; sem relação visível entre cobrança e evento (só `description`); a página não está linkada no `AdminShell`/`MenuDaConta` (entrada não verificada).

### 1.6 SSO e rotas de auth (`app/auth/**`) — sem UI

- F38. `GET /auth/google/start?surface=host|staff|guest&returnTo&eventId`: PKCE/nonce via `startGoogleLogin`, rate-limit por hash de IP, escopo `openid email`, `prompt=select_account`; `guest` exige sessão de convidado do mesmo evento.
- F39. `GET /auth/google/callback`: consome `state`, troca `code`, valida id_token (aud, nonce), por superfície emite cookie do anfitrião, sessão de staff ou reivindica fotos do convidado por e-mail.
- F40. `GET /auth/guest-magic/start` e `/callback`: magic link do convidado (limite 5 por 60 s por ip+sessão), reivindica fotos por e-mail, nunca emite sessão de anfitrião; retorno com `?guestMagic=enviado|limite|ok|erro`.
Problemas: falhas retornam silenciosamente para `/` (state inválido, rate limit) ou para a tela de login sem mensagem (ver 1.2 e 3.1).

### 1.7 Cascas e estados globais do admin

- F41. `AdminShell` (`server/admin-shell-root.tsx`): `SkipLink`, tema claro/escuro por cookie (`estiloAntiFlash`), identidade do evento propagada apenas em acento/crítico/fonte/fundo (`adminVars`), cabeçalho com título, subtítulo, "voltar".
- F42. `MenuDaConta` (engrenagem `min-h-12`): folha com e-mail, `TemaDoPainelToggle` (claro/escuro/sistema), `AjudaDoPainel`, "Sair desta conta" com `ConfirmDialog`.
- F43. `AppNav` (mobile, abaixo de `lg`): 4 destinos (início, ao vivo, fotos, convidados) + "Mais" em `BottomSheet`. (Pertence ao inventário do painel do evento; citado por ser parte do shell.)

## 2. Fornecedor white-label

Contexto: papéis `admin` e `staff` por fornecedor; planos `starter`, `studio`, `agency` (preços em `VENDOR_PLAN_PRICE_CENTS`, limites de equipe em `VENDOR_PLAN_TEAM_LIMIT`). Toda tela de `/admin/vendor/**` usa `AdminShell` (tema do painel); `/f/[slug]` usa `VendorShell` com a marca do fornecedor.

### 2.1 `/admin/vendor/new` — onboarding (`vendor-onboarding.tsx`, 251 linhas)

Parâmetros: `next=event|settings`, `plan`. Sem sessão redireciona para `/admin/sign-in?next=…`.

- F44. Passo 1 "Sua operação": nome (2 a 120 caracteres) e identificador/URL (`^[a-z0-9-]{1,80}$`, derivado do nome sem acentos até o usuário editar o slug); `POST /api/admin/vendor` cria o fornecedor (a criação acontece já no passo 1).
- F45. Passo 2 "Sua identidade": cor de destaque (`<input type=color>` nativo), tema inicial claro/escuro; `PATCH /api/vendors/{id}/brand-tokens`.
- F46. Passo 3 "Próximo passo": duas ações (Criar meu primeiro evento -> `/admin/new?vendor&vendorSlug&vendorPlan`; Abrir configurações), ordem depende de `next`.
- F47. Barra de progresso `ol` com `aria-current`, "Etapa N de 3 · Você pode ajustar tudo depois".

Estados: `idle/saving/error` com mensagem da API; sem estado carregando de página.
Problemas: o fornecedor é criado no passo 1 — abandonar o fluxo no passo 2 deixa um fornecedor sem identidade (sem retomada, sem detalhe do que falta); sem prévia da marca no passo 2 (o editor completo em settings tem); `input type=color` nativo foge do `ColorField` do assistente de evento (duas UIs de cor); mensagens de erro vêm cruas da API (`body.message`); colisão de slug só aparece como erro genérico (formato exato não verificado); sem validação assíncrona de disponibilidade do slug.

### 2.2 `/admin/vendor/checkout` (`vendor-checkout-form.tsx`)

Parâmetros: `vendor` (UUID, 404 se inválido), `plan`. Exige admin do fornecedor; se assinatura `active|pending|overdue` redireciona para `/admin/vendor/{id}/billing`.

- F48. Seleção de plano (radio): Starter, Studio, Agency com preço/mês, resumo e capacidade (textos locais em `PLANOS`, preço de `VENDOR_PLAN_PRICE_CENTS`).
- F49. Forma de pagamento: PIX ou Cartão (radio).
- F50. Resumo em aside escuro: plano, capacidade, recorrência mensal, total/mês, aviso "A cobrança só é criada depois que você confirmar".
- F51. "Confirmar assinatura" -> `POST /api/vendors/{id}/subscription {plan, billingType}`.
- F52. Resultado: "Agora falta a confirmação do pagamento", botão "Abrir pagamento seguro" (nova aba; só `http(s)`), "Voltar ao portal"; avisa cobrança de teste quando `stub`.

Estados: submitting, erro (mensagem da API ou "A conexão caiu…"), sucesso com ou sem `invoiceUrl`.
Problemas: não há campo de e-mail/dados de cobrança (o doc `fornecedor.md` pede e-mail na jornada); descrições de plano duplicadas em três lugares (`vendor-checkout-form.tsx`, `vendor-marketing/data/vendor-plans.ts`, `vendor-billing-manager.tsx` `PLAN_LABEL`); a divergência já existe (landing: "Até 5 pessoas na equipe" no Studio; checkout: "Eventos ativos sem limite"); sair para link externo sem contexto contraria o doc; botão e campos com classes locais em vez do DS.

### 2.3 `/admin/vendor/insights`

- F53. Para cada fornecedor da conta: grava auditoria de agregação (aguardada antes do `BYPASSRLS`), exibe `VendorSummaryCard` (eventos, participação média %, fotos publicadas) e link "Configurações do fornecedor" para admins.
- F54. Lista de todos os eventos da conta (não só do fornecedor) com link para `/admin/e/{id}/insights`, data longa.
- Estados: V ("Nenhum evento criado ainda"). Sem E/C específicos.
Problemas: lista usa `/{slug}` cru; mistura eventos pessoais com os do fornecedor; "H1" aparece como jargão ("Compare a participação (H1)"); sem ordenação nem filtro por fornecedor; sem série temporal nem gráfico (os componentes `BarChart`/`Donut` do DS não são usados).

### 2.4 `/admin/vendor/[vendorId]/settings`

- F55. Cabeçalho com nome do fornecedor, papel (Administrador/Equipe) e plano.
- F56. `VendorEditForm` (só admin): nome (2 a 120), identificador (regex), `PATCH /api/admin/vendor/{id}`; "✓ Salvo" some ao editar.
- F57. Não-admin vê "Só o administrador do fornecedor pode alterar…" (estado P).
- F58. `VendorBrandTokensEditor` (só admin): cor de destaque (color picker + hex), tema de fundo claro/escuro, logo por URL `https://` (sem upload), "Neutros opcionais" (papel, noite, tinta), prévia usando `resolveTokens`, `PATCH /api/vendors/{id}/brand-tokens`.
Problemas: logo só por URL já hospedada (sem upload; contrário a `identidade.md`, não verificado), tipografia e capas não configuráveis (o doc pede), hex digitado sem validação de contraste (o `§7` do DESIGN proíbe combinações; verificação de contraste não verificada neste editor), 404 para quem não pertence ao fornecedor.

### 2.5 `/admin/vendor/[vendorId]/team`

- F59. Contador "N de M pessoas no plano" ou "sem limite contratual".
- F60. Convite: e-mail (`required`, `maxLength` 320), papel (Equipe/Administrador), "Enviar convite".
- F61. No limite do plano troca o formulário por aviso + "Ver planos" (`/admin/vendor/checkout?vendor=`).
- F62. Lista de membros: e-mail, descrição do papel, select de papel (desabilitado para si), "Remover" com confirmação inline (Remover/Cancelar), "Conta atual" para si.
- F63. Feedback `aria-live` de sucesso/erro; operações via `use-vendor-team` e `vendor-team-client`.
Problemas: botão "← Painel" leva ao portal `/f/slug` (rótulo e destino divergem); confirmação de remover é inline e some ao clicar fora; sem lista de convites pendentes nem reenvio; sem tratamento de e-mail duplicado visível (mensagem vinda da API); `<select>` nativos com classes locais; sem auditoria visível além do texto "As mudanças ficam registradas na auditoria".

### 2.6 `/admin/vendor/[vendorId]/billing`

- F64. Sem assinatura: "Escolha um plano para começar" + link ao checkout.
- F65. Histórico de pagamentos (lista: data de vencimento, "Mensalidade Albora", status traduzido, valor, "Abrir recibo"/"Abrir cobrança" só com URL `https`).
- F66. Aside escuro com plano vigente, preço, estado ("Cancelamento em processamento", "Mudança para X pendente"), select "Próximo plano" + botão de troca, bloqueios (`locked`: operação em curso, provedor indisponível, status != active, cancelamento pedido).
- F67. Cancelar: confirmação inline (Confirmar cancelamento/Manter) com aviso de que para de renovar quando o provedor concluir.
- F68. Estados: histórico indisponível (`role=status`: "O histórico não carregou"), vazio ("Nenhuma cobrança disponível ainda"), `overdue` ("Abra a cobrança atrasada…"), provedor indisponível.
Problemas: `PaymentRow` formata data com `T12:00:00` local; rótulos de status incompletos (cai em status cru); a coluna escura `bg-ink` com botões `bg-bg` foge do restante do painel claro; cancelar/trocar plano sem prévia de proporcional; sem "próxima cobrança" apesar de `fornecedor.md` pedir (não verificado se a API fornece).

### 2.7 `/f/[vendorSlug]` — portal (`vendor-portal-screen.tsx`, `vendor-shell.tsx`)

Acesso: resolve marca pública do fornecedor (com auditoria), exige sessão de anfitrião (senão `/admin/sign-in?next=/f/{slug}`), `roleForAccountOnVendor` (sem papel = 404).

- F69. `VendorShell`: tema da marca (`resolveTokens` com `vendor`), logo estrela + "com Albora" e "Portal com Albora" no rodapé (ocultos no plano `agency`, `whiteLabelFull`), botão "Minha conta" (`/admin`), abas âncora/links: Hoje, Eventos, Marca/Equipe/Cobrança (só admin).
- F70. Título muda por estado ("Crie a primeira experiência da sua marca." ou "O que merece sua atenção hoje?").
- F71. Ações rápidas: Criar evento (`/admin/new?vendor&vendorSlug`), Configurações (admin), Insights.
- F72. `VendorSummaryCard` (3 métricas).
- F73. `VendorEventsList`: agrupado por pack (ordem de chegada, DESC por data), nome, data longa, convidados esperados, marca "demo"; V ("Nenhum evento ainda").
- F74. `VendorSubscribeButton` (só admin): estados ativa/pendente (link "Plano e cobrança"), atrasada ("Regularizar"), sem assinatura ("Ver planos"); respeita `?plan=`.
- F75. `<details>` administrativo (conteúdo não lido em detalhe) para admins. Não verificado.
Problemas: eventos da carteira não são links (comentário no código: membros sem papel individual receberiam 404) — o fornecedor não consegue abrir o evento a partir do portal; aba "Hoje" é sempre `border-acento` (não indica a seção atual); navegação por âncora (`#visao-geral`, `#eventos`) mistura com links de rota; `staff` não vê Marca/Equipe/Cobrança; estados carregando/erro dependem do `error.tsx` global.

### 2.8 `/fornecedores` — landing (resumo)

`features/vendor-marketing/components/vendor-landing.tsx` (220 linhas): cabeçalho com âncoras Produto/Operação/Planos, "Entrar" (`/admin/sign-in`), "Criar evento" (`/admin/vendor/new?next=event`); hero "Entregue a festa que seus clientes não conseguiram ver inteira."; 4 passos (Você configura, Os convidados participam, A festa aparece ao vivo, Você entrega); seção "A festa acontece longe da câmera oficial"; planos Starter/Studio(destaque)/Agency com `vendorPlanPrice` e CTA `&plan=`; CTA final; rodapé com `/privacidade`. Metadados OG com `/fornecedores/pista-multigeracional.webp`.

## 3. Console interno de staff

### 3.1 Moldura, autenticação e transversais

Sessão: cookie `albora_staff`, resolvida por `resolveActor()` em cada página/ação (sem ator -> `redirect('/console/login')`). Papéis (`packages/core/src/authorization/roles.ts`): `owner`, `support`, `finance`, `compliance`, `engineering`, cada um com um conjunto de capabilities. Políticas (`policies.ts`): reautenticação em até 900 s para `lgpd.delete_account` e `staff.manage`; reembolsos acima de R$ 500,00 (`REFUND_APPROVAL_THRESHOLD_CENTS = 50_000`, marcado como provisório) exigem `subscription.refund.approve` (só owner).

Funcionalidades transversais:
- F76. `ConsoleFrame`: sidebar de 15rem recolhível a rail de 4,75rem (preferência em cookie `albora_console_sidebar`, lida no servidor para evitar piscada), gaveta abaixo de 900 px com pano de fundo e Esc, botão de recolher com `aria-pressed`.
- F77. `ConsoleNav`: grupos Negócio, Operação, Governança; itens filtrados por capability (nem desabilitados); item ativo com `aria-current`; badges de pendência (zero não renderiza) — mas o layout nunca passa `counts`.
- F78. `ConsoleProfileMenu`: menu no rodapé da sidebar com papéis legíveis e "Sair do console" (`signOutAction`); "Meu perfil" e "Preferências" ficam de fora por não existirem.
- F79. `ConsoleSearch` + `CommandPalette` (ui-web): botão "Buscar conta, evento, ticket…"; atalhos Cmd/Ctrl+K e `/` (fora de campo); busca com 200 ms de debounce e mínimo de 2 caracteres, `searchConsoleAction`; combobox acessível (listbox, `aria-activedescendant`, setas/Enter/Esc, foco devolvido); navega ao `href` do resultado.
- F80. `ConsolePeriodo` (Hoje/7 dias/30 dias, padrão 30d; `?periodo=`), só na rota `/console`.
- F81. `ImpersonationBanner`: faixa crítica, não fechável, "Você está vendo como {accountId} — sessão da equipe", botão "Encerrar sessão".
- F82. `PendingImpersonationApprovals`: para quem tem `impersonate.approve`, lista de pedidos pendentes em qualquer tela; motivo obrigatório e botões Aprovar/Negar.
- F83. `ImpersonationRequestDrawer` (na conta): máquina de estados do pedido (nenhum, pendente, aprovado, ativo, expirado) com "Ver como", "Iniciar sessão", "Pedir novamente"; modal de motivo obrigatório.
- F84. Ações de servidor (`features/console/actions.ts`): login por magic link (`requestLoginAction`/`completeLoginAction`), reauth, sair, revelar PII, tickets (responder, atribuir, status, prioridade), assinatura (trocar plano, cortesia, cancelar, reembolsar), DSAR (criar, atualizar, excluir conta), impersonação (pedir, aprovar, negar, iniciar, encerrar), busca. Erros `CommandDeniedError`/`ReauthRequiredError`/`ApprovalRequiredError` viram `{ok:false,error}`.

Problemas transversais do console:
- Não existe `error.tsx`, `loading.tsx` nem `not-found.tsx` sob `app/console` (verificado). Capability negada por URL direta ("finance" abrindo `/console/audit`) depende do que o caso de uso lança; as páginas não tratam `CommandDeniedError` e caem no `app/error.tsx` público ("Algo deu errado"). Nenhum estado "permissão negada" dedicado (não verificado se o use case devolve vazio ou lança).
- Item "Equipe" (`/console/staff`, capability `staff.manage`) está no menu do owner, mas não há página (404 para o único papel que o vê).
- Identificação do operador por `staffUserId` (UUID) no menu e `title`; iniciais são `slice(0,2)` do UUID (sem nome/e-mail).
- Impersonação e retenção exibem IDs crus (`targetAccountId`, `eventId`).
- Comentários no código divergem do comportamento: `console-frame.tsx` diz que a preferência mora em `localStorage` (usa cookie); `impersonation-banner.tsx` diz renderizado em dois lugares (só no topo).
- `reautenticação exigida` aparece como texto em `Revelar contato` e nas ações de assinatura, sem link para `/console/reauth`; só `ExecuteAccountDeletionDanger` redireciona para o step-up (verificado por grep de "reauth" nos componentes).
- Cinco fluxos duplicam o mesmo bloco de motivo + erro em diálogos (`ConfirmDialog` com `description` rico), e `subscription-actions.tsx` usa um único `erro`/`motivo` para quatro diálogos.
- Textos de tela expõem vocabulário de projeto ("Onda C", "T9", "append-only", `security_events`, `retention_jobs`) para operadores.
- Console sempre claro por desenho (sem alternância de tema); densidade via classes `tipo-den-*`.

### 3.2 `/console/login` e `/console/reauth`

- F85. Login: e-mail da equipe, "Enviar link" (`requestLoginAction`), resposta neutra "Se houver uma conta de equipe com esse e-mail…", ou Google (`/auth/google/start?surface=staff`); Confirm por `?m=` ("Entrar no console").
- F86. Reauth: "Confirmar que é você" — envia link de confirmação ao e-mail cadastrado; Confirm por `?m=`; `next` só aceito se começa com `/console`; erro "inválido, expirou ou não pertence a esta sessão".
Estados: editing/sent, ready/error. Problemas: sem tratamento de falha de rede; `?error=google` do callback é ignorado (`fallbackFor('staff')`); `<input type=hidden value={next}>` sem uso (campo morto); sem indicação do tempo restante de 900 s nem do motivo do step-up; botão "Entrar com Google" não tem `disabled` durante redirecionamento.

### 3.3 `/console` — visão geral (`page.tsx`, `overview-sections.tsx`)

- F87. Cabeçalho com janela ("Hoje" ou "Nos últimos N dias"), contagem de pendências e críticas.
- F88. `FilaDeAtencao` "Precisa de você agora": itens por severidade com link (SLA, DSAR vencido, retenção falha, inadimplência, segurança) via `getConsoleAttention`.
- F89. `PainelH1` (participação) com série (Sparkline) e tooltip "Como a participação H1 é calculada".
- F90. `FaixaDeMetricas`: Receita recorrente (MRR), Churn estimado (aproximado, com base), Eventos ativos e Convidados no período (variação vs. período anterior só se há baseline).
- F91. `FunilComercial` "Ativação comercial" com maior perda destacada (`maiorPerdaComercial`).
- F92. `EventosAoVivo` "Acontecendo agora" (até 12, só com `events.read`; texto explica que é monitoramento).
Estados: V para fila e ao-vivo; sem loading. Problemas: `getPlatformOverview` e `getPlatformRevenue` rodam em toda visita (sem cache); sem drilldown nas métricas; seletor de período afeta só parte (receita não recebe `days`); papel sem `analytics.platform.read` ainda cai nesta rota pelo item de menu não aparecer, mas o acesso direto não foi verificado.

### 3.4 `/console/accounts` e `/console/accounts/[id]`

Lista (`accounts-table.tsx`): 
- F93. Busca ("conta, e-mail"), filtros Tipo (anfitrião/fornecedor), Plano (Free, Celebration, Starter, Studio, Agency), Status (trial, ativa, suspensa, encerrada) -> querystring, filtros ativos como chips removíveis.
- F94. Colunas: Conta (e-mail mascarado), Tipo, Plano, Eventos, Criada, Último login (aproximado `≈`), Status; ordenação por clique.
- F95. Paginação por cursor ("Próxima página →", 20 por página), nota "Último login é aproximado — {base}".
Estados: V ("Nenhuma conta ainda…"), V-filtrado ("Nenhuma conta com este filtro"). Problemas:
- Busca chama `router.push` a cada tecla (sem debounce), recarregando a rota no servidor.
- `DataTable` ordena apenas as linhas da página corrente (`useState` local) enquanto a descrição da tela diz que filtros não rodam em memória; usuário pode achar que ordenou o total.
- Só avanço de cursor; não há "voltar"; `pageSize` forçado ao número de linhas para esconder a paginação interna.
- Linha da conta não parece clicável nesta lista (link por coluna não verificado em `accounts-table.tsx`; não encontrei `Link` na coluna Conta, ao contrário de `events-table.tsx`).

Detalhe (`accounts/[id]/page.tsx`):
- F96. Cabeçalho `ContaCabecalho` (inicial, e-mail mascarado, status, UUID).
- F97. Ações por capability: `RevealPiiButton` (modal com motivo -> mostra e-mail uma vez, sem toggle de volta), `ImpersonationRequestDrawer`, `DeleteAccountDanger` (abre pedido DSAR de exclusão: digitar o id, prazo legal, motivo -> `/console/lgpd`).
- F98. Painéis Identidade (contato, criada, último login ≈, consentimentos por versão), Atividade (eventos, plano), Trilha (últimas ações da equipe na conta).
Estados: 404 se a conta não existe; vazios por seção ("Nenhuma ação da equipe registrada ainda"). Problemas: exclusão pede digitar um UUID inteiro (fricção alta, erro fácil); botões de ação sem ordem de severidade (Revelar, Ver como e Excluir lado a lado, o último é `variant=secondary`, não perigo); lista de eventos da conta sem link para `/console/events/{id}`; "Plano" é string crua.

### 3.5 `/console/events` e `/console/events/[id]`

- F99. Lista: busca por título, filtro Status (rascunho/ativo/encerrado), colunas Evento (link), Anfitrião (mascarado), Fornecedor, Data (ordenável), Convidados, Fotos, H1 (ordenável), Status; cursor 20/página.
- F100. Detalhe: cabeçalho com "H1: X%" e UUID; painéis Identidade (anfitrião, fornecedor, data, convidados esperados), Funil (sessões por etapa), Consentimento (aceites por versão). Somente leitura.
Estados: V, V-filtrado, 404. Problemas: mesmos da lista de contas (busca por tecla, ordenação local); `subtitle` do detalhe mostra H1 mas não explica o cálculo (há tooltip só na visão geral); sem link para o painel do anfitrião nem ação de suporte; "title ?? id" mostra UUID quando falta título; o redesign (`console.md`) previa drawer rico com saúde/uploads/erros — não existe.

### 3.6 `/console/subscriptions`

- F101. Faixa MRR, ativas, inadimplência (contagem), churn 30d aproximado.
- F102. Tabela de assinaturas de fornecedor (50): Fornecedor, Plano, Status (pendente/ativa/em atraso/cancelada), "Próxima cobrança" (sempre "—"), Atraso (`≈ Nd`), Valor, Ações; ordenação local.
- F103. `SubscriptionActions`: Trocar plano (select + motivo), Cortesia (100% fixo + motivo), Cancelar (motivo), Reembolsar (seleciona pagamento, valor com default cheio, validação > valor do pagamento, motivo; erro "Esse valor exige aprovação do dono").
Estados: V; P (colunas e botões somem sem capability; sem capability alguma mostra "—"). Problemas:
- Coluna "Próxima cobrança" existe só para mostrar "—" (lacuna declarada no código).
- Reembolso, dinheiro irreversível, e cancelamento usam `ConfirmDialog` (não `DangerDialog`; o comentário afirma que nenhuma das quatro é irreversível, o que é discutível para reembolso/cancelamento).
- Botão "Cancelar" (cancelar assinatura) é ambíguo ao lado de "Cancelar" dos diálogos.
- `listRefundablePayments` roda uma vez por linha (50 consultas) quando o ator pode reembolsar.
- Só lista assinaturas de fornecedor; pagamentos de eventos de anfitrião (Completo R$ 199) não aparecem no console (o texto da tela diz isso na descrição, mas não há outra tela).
- Cortesia sempre 100% (sem escolher percentual/duração).

### 3.7 `/console/support` (mesa de suporte)

- F104. Resumo: Abertos e SLA estourado.
- F105. Fila (`SupportQueue`, 100 tickets open/pending, ordenada por SLA no servidor): assunto, contagem regressiva ("N min restantes"/"Estourado há N min", sem animação), prioridade P0/P1/P2; seleção troca `?ticket=`.
- F106. Detalhe (`TicketDetail`): assunto, e-mail mascarado, selects Status (aberto/pendente/resolvido/fechado), Prioridade, "Atribuir a" (só com `tickets.write`+`tickets.assign`), conversa (Equipe/Cliente), campo "Responder" + "Enviar" (só com `tickets.write`), contexto do cliente (plano, nº de eventos, status dos pagamentos recentes).
Estados: V ("Nenhum ticket aberto"), "Selecione um ticket", P (campos desabilitados/ocultos para financeiro/engenharia). Problemas: "Responder" é `TextField` de uma linha para mensagens longas; mudar status/prioridade/responsável grava na hora, sem confirmação ou desfazer, e um status "resolvido" some o ticket da fila no recarregamento; sem filtro por status/prioridade/responsável, sem busca, sem ver tickets resolvidos; mensagens sem data/hora/autor nominal; contexto do cliente lista status de pagamento sem valor/data; não há ação "criar ticket"; ticket selecionado é o primeiro por padrão (efeito silencioso ao abrir a tela).

### 3.8 `/console/lgpd` (DSAR)

- F107. Faixa Abertos/Vencidos/No prazo (só quando há linhas).
- F108. `DsarForm` "Novo pedido": tipo (acesso, portabilidade, retificação, exclusão), conta do titular (UUID), prazo legal (data, sem padrão por regra), motivo; botão habilita só com tudo preenchido. Só com `lgpd.dsar.execute`.
- F109. Tabela (100, open/in_progress): Tipo, Titular ("Ver conta →"), Recebido, Prazo legal ("N d restantes"/"N d em atraso", vermelho + texto), Status, Ações.
- F110. `DsarRequestActions` "Atualizar": status, link de comprovante, notas, motivo obrigatório (erro "motivo é obrigatório…").
- F111. `ExecuteAccountDeletionDanger` (só em pedidos de exclusão): `DangerDialog` com lista do que será apagado e digitar o id do titular; se exigir reauth leva a `/console/reauth?next=/console/lgpd`.
- F112. Link "Ver retenção →".
Estados: V ("Nenhum pedido aberto"). Problemas: só lista abertos/em andamento (concluídos/recusados não aparecem; não há histórico nem filtro); titular informado por UUID digitado, sem busca de conta; `<a>` em vez de `Link`; link de retenção escondido no cabeçalho; destino de reauth força perda do diálogo preenchido (motivo digitado é perdido).

### 3.9 `/console/retention`

- F113. Tabela só leitura (100 jobs): Evento (UUID com link), Etapa (+48h, D-330 export Drive, D-358 aviso, D-365 exclusão), Status (pendente/rodando/concluído/pulado/falhou), Vencimento (atrasado em vermelho), Tentativas, Erro (saneado).
- F114. Faixa "Somente leitura · jobs rodam por cron".
Estados: V ("Nenhum job pendente…"). Problemas: evento por UUID em vez de nome; descrição cita "Onda C" e promete reprocessamento futuro; sem filtro por status/etapa; sem ordenação por falhados (o comentário diz "falhados em destaque no topo", ordenação não verificada); sem ação (por desenho); link do status duplica o do evento.

### 3.10 `/console/audit`

- F115. Faixa "Registro imutável (append-only)".
- F116. Filtros: ator (id), alvo (conta, evento, ticket, assinatura, equipe, plataforma, pedido LGPD, impersonação, pagamento, fornecedor), ação (texto livre), período (24h, 7d, 30d), chips removíveis.
- F117. Tabela (50/página, cursor): Quando, Ator, Ação (mono), Alvo, IP (hash 10 chars), Motivo, Detalhes (metadata em `<details>`, e-mails mascarados, truncado em 300).
Estados: V, V-filtrado. Problemas: busca por ator e por ação disparam navegação a cada tecla; filtro de alvo na URL aceita só 6 valores enquanto o rótulo cobre 10 (`ALVOS_VALIDOS` em `audit/page.tsx` não inclui `dsar_request`, `impersonation_request`, `payment`, `vendor` — filtros desses alvos são ignorados silenciosamente); sem exportar (nem CSV); sem intervalo de datas absoluto; ator só por id; tabela larga (7 colunas) em telas estreitas.

### 3.11 `/console/security`

- F118. Filtros Tipo (6 tipos) e Período via `<form method="get">` com "Aplicar".
- F119. Alerta crítico quando há `session.reuse`.
- F120. Cartões por tipo com contagem e lista de ocorrências expansível (`<details>`): quando, ator, hash de IP, metadata mascarada.
- F121. Nota "Somente leitura".
Estados: V ("Nenhum evento de segurança neste filtro"). Problemas: limite fixo de 200 sem indicação nem paginação; filtro por form GET (recarrega a página) enquanto o resto do console filtra por JS; cartões mostram código técnico (`login.failed`) e rótulo; sem tendência temporal nem gráfico; descrição técnica ("trilha que avisa, não que prova") e "em nenhuma onda" são texto de projeto.

### 3.12 `/console/staff` — inexistente

Item de menu com capability `staff.manage` (política de reauth já existe em `policies.ts`), sem `page.tsx` em `app/console/(shell)` (verificado por listagem). Lacuna de produto (gestão de equipe, papéis, convites).

## 4. Páginas públicas

### 4.1 `/privacidade` (`app/privacidade/page.tsx`, 177 linhas)

Estática, tema da marca (`resolveTokens({marca})`), coluna de 2xl. Seções (`Secao`): Quem controla o quê; O que o convidado envia; Sessão e aparelho; O que removemos na origem; Consentimento; Remoção; Retenção; App do convidado; Anfitrião e fornecedor; Contato (`mailto:ola@albora.app`). "Atualizado em 22 de agosto de 2026" (constante no código). Problemas: sem índice/âncoras, sem versão do consentimento exposta, sem link para Termos de uso (não existe página); data e e-mail hardcoded; não usa `SkipLink`; metadado `title` "Privacidade — Albora" (sem `openGraph`).

### 4.2 `/15-anos` (`app/15-anos/page.tsx`)

`LandingPage` com o pack `FIFTEEN_YEARS`; valida em tempo de renderização (`landingProblems`) e lança erro se faltar chave (falha o build, intencional). Só metadados `title`/`description`. A landing principal `/` usa `WEDDING` com JSON-LD `SoftwareApplication` (preço 0). Não inventariado em detalhe (landing fora do escopo C).

## 5. Design system compartilhado

### 5.1 `packages/ui-web/src` — componentes (exportados em `index.ts`)

Primitivos: `Button` (variants `primary`, `secondary`, `tertiary`, `ghost`, `danger`; `size` sm=44, md=48, lg=56; `width` auto/full; `buttonVariants` para `<a>`), `PrimaryButton`/`SecondaryButton` (guest), `Badge` (neutral, accent, outline, critico), `StatusBadge` (neutral, positive, atencao, critico, informativo), `Card` (`elevation` 0/1/2, `highlighted`), `Avatar`, `Switch` (`role=switch`), `Slider`, `ProgressBar`, `FilterChip` (`aria-pressed`), `Skeleton` (variantes), `AnimatedCounter`.
Campos: `TextField` (label, hint, error com `role=alert`), `Select` (idem), `ConsentCheckbox`, `NameField`, `TextLink`.
Overlays: `Dialog` (`<dialog>` nativo com `showModal`, saída animada, sem blur), `BottomSheet` (`title`, `footer`, `titleId`), `ConfirmDialog` (`tone` default/danger, `pending`, `confirmDisabled`, rótulos), `DangerDialog` (motivo + digitar `confirmationValue`), `CommandPalette` (combobox/listbox), `CommentSheet`.
Feedback: `ToastContainer`/`showToast`, `LiveAnnouncer`/`announce`, `ErrorMessage`, `GateNotice`, `ConsentNote`, `MissionBanner`, `ConsoleEmptyState`, `EmptyState` (convidado, depende de câmera), `SkipLink`.
Dados: `DataTable` (colunas ordenáveis, alinhamento, `loading` com Skeleton, `emptyMessage`/`emptyFilteredMessage`, `hasActiveFilters`/`onClearFilters`, paginação e tamanho de página, busca, filtros ativos, `exportable`/`onExport`, `hideToolbar`; ordenação e paginação são do cliente sobre as linhas recebidas), `FilterBar`, `MetricCard`, `BarChart`, `Donut`, `Sparkline`, `EntityHeader`, `DetailPanel`, `PageHeader`, `SectionHeader`.
Convidado/marca: `GuestShell`/`GuestHeader`/`GuestMain`, `FloatingNav`, `TabBar`, `NavCameraButton`, `StoryRail`, `EventHero`, `PhotoCard`, `PostHeader`, `EditorialTabs`, `PrintedCopyCard`, `LogoAlbora`, `Star`, `Frame`, ícones (`icons.tsx`: 19 ícones), molduras de catálogo.

Uso real no app (arquivos não-teste que importam): `StatusBadge` 13, `BottomSheet` 12, `Switch` 10, `ConfirmDialog` 6, `DataTable` 6, `FilterBar` 3, `ConsoleEmptyState` 3, `DangerDialog` 2, `Skeleton` 2, `CommandPalette` 1, `Sparkline` 1. Sem uso: `EntityHeader`, `DetailPanel`, `MetricCard`, `PageHeader`, `BarChart`, `Donut` (o console criou `ContaCabecalho`, `EventoCabecalho`, `PainelDeDetalheConta/Evento`, `FaixaDeMetricas`, `TituloDaTela`, `Painel`/`CabecalhoDePainel` locais). `showToast` só em 2 arquivos do convidado; painel, fornecedor e console usam feedback inline.

Lacunas e inconsistências do DS:
- `packages/ui-web/README.md` diz "Não há componente de skeleton", mas `Skeleton` existe e é exportado (README desatualizado).
- Falta no DS: `Textarea`, `Tabs` de painel (há `EditorialTabs`/`TabBar` de convidado), `Tooltip`, `Popover`, seletor de data/cor (o painel tem `DateTimeField` e `ColorField` locais em `features/admin/.../onboarding`), `RadioGroup`, `Pagination`, `Breadcrumb`, `Alert`/banner, `Stepper`.
- Padrões repetidos fora do DS: classes `field`/`button`/`secondaryButton` em constantes locais (`vendor-team-manager.tsx`, `vendor-billing-manager.tsx`, `vendor-brand-tokens-editor.tsx`), `<select>` nativo com `selectClassName()` duplicado em 4 arquivos do console, `MissionSheet` com overlay próprio, seleção de planos com `<label>` local.
- Estados do `TextField`/`Select`: default, hint, erro, desabilitado (via `disabled` nativo); não há estado `success` nem `loading`.

### 5.2 `packages/tokens`

- Fonte: `ALBORA_BRAND` em `src/marca.ts` (papel `#FCFBF9`, tinta `#171513`, noite `#0C0A09`, acento `#D46632`, crítico `#BB3D18`, atenção `#A96F18`, positivo `#28744E`, informativo `#3265B5`; fontes Fraunces (título) e Instrument Sans (corpo); raio 1rem, superfície 18px, mídia 20px, pílula 999px; curva única `cubic-bezier(0.2,0,0,1)`, tempos 0,15/0,3/0,35/0,5 s; fundo padrão `dark`).
- Resolvedor único: `resolveTokens({marca, vendor?, pack?, evento?})` e `toVariables`/`toCss` (`outputs.ts`); camada do evento filtrada por `camadaDoEvento` (no painel só acento, crítico, fonte e fundo passam; `papel` e `tinta` não, para não tingir neutros). `adminVars(background, identidade)` em `features/admin/components/server/admin-shell.tsx` usa elevação `trabalho` e fundo claro; `vendorVars` aplica a camada do fornecedor.
- Também exporta: `EVENT_COLOR_COMBOS`, `SUGGESTED_EVENT_COLORS`, `MODELOS_DE_IDENTIDADE`, `resolveGuestThemeVariables`, medidas de peças impressas, tipografia.
- Classes utilitárias do app: `tipo-*` (`tipografia.css`: title, subtitle, body, caption, label, e a escala de densidade `tipo-den-*` do console), `elev-1/2`, `anima-surge/pop`, `scrim-foto-forte`, `sobre-foto`; `tailwind.css` liga tokens a utilitários (`bg-bg`, `text-ink[-2|-3]`, `bg-superficie[-alta]`, `border-linha`, `bg-acento`, `text-acento-texto`, `bg-critico[-superficie]`, etc.).
- O que o redesign deve respeitar: nenhum hex em componente (guard bloqueante; os hex das telas inventariadas vêm de usuário ou de `tokens`); anti-padrões visuais bloqueantes (vidro, neon, gradiente roxo, dark tech, script, sage, blush, ícone de aliança/pombinha/coração); o chão do painel é decisão de contexto de uso, não da festa; console sempre claro e sem identidade do casal; telão não corta vertical.

### 5.3 `packages/packs`

- `Pack` (`tipos.ts`): `id`, `vocabulario` (chaves `evento.nome`, `evento.preparo`, `evento.posse`, `landing.exemplo.nome`, `sugestao.titulo|lede|cta`…), `missoes`, `confessionario?`, `lugares`, `momentos?`, `reacoes?`, `sugereAntes?`, `icone?`, `ordemCriacao?`, `tokens?`.
- Packs: `CASAMENTO/WEDDING` (1, `heart`), `ANIVERSARIO/BIRTHDAY` (2, `cake`), `FORMATURA/GRADUATION` (3, `graduation-cap`), `CORPORATIVO/CORPORATE` (4, `briefcase`), `CELEBRACAO/CELEBRATION` (5, `sparkles`), `OUTRO` (6, `calendar`); `PRE_CASAMENTO` e `QUINZE_ANOS/FIFTEEN_YEARS` existem sem `ordemCriacao` (não entram no assistente; 15 anos tem landing própria).
- `packsDeCriacao()` alimenta o passo 1 do assistente; nenhum texto de domínio pode ficar em componente, tudo via `resolvePackText(pack, chave)`. `landingProblems(pack)` falha a renderização das landings se faltar chave. Teste de sanidade: trocar o pack muda a UI sem tocar no núcleo.
- Dependência unidirecional `pack -> core` (guard no CI).

## 6. Padrões transversais (resumo)

- Casca: três cascas distintas (`AdminShell` claro com tema do painel; `VendorShell` com marca do fornecedor; `ConsoleShell` claro fixo com sidebar). Auth em todas por cookie e redirect server-side.
- Feedback: inline em quase todo lugar; `showToast` quase sem uso fora do convidado.
- Confirmação de ação destrutiva: `ConfirmDialog` (sair, DSAR, assinaturas), `DangerDialog` (exclusão de conta), confirmação inline em `team` e `billing` do fornecedor (terceiro padrão).
- Formulários: mistura de `TextField` do DS e `<input>`/`<select>` crus com classes locais.
- Tabelas: `DataTable` + `FilterBar` com querystring no console; lista de cartões em `/admin` e `/f`.
- Acessibilidade: `SkipLink` no `AdminShell`, `aria-live` nos feedbacks do fornecedor, alvos mínimos de 44 px em quase todos os botões; o console tem `aria-pressed`/`aria-current`/combobox. O assistente de evento tem `role=radio`/`switch` com `aria-checked`.

## 7. Problemas transversais (priorizados)

1. Console sem `error.tsx`/`loading.tsx`/`not-found.tsx`, sem tela de permissão negada; links de menu mortos (`/console/staff`); badges de pendência nunca exibidos.
2. Busca e filtros do console navegam a cada tecla e a ordenação da `DataTable` é só da página corrente, contradizendo o texto de tela sobre filtros no servidor; paginação só avança.
3. Redirecionamentos de falha do SSO (`?error=google`) caem em telas que ignoram o parâmetro (host e staff).
4. Identificadores crus como rótulo (slug em `/admin` e em insights; UUID em retenção, impersonação, menu do operador, titular da LGPD).
5. Valores comerciais e rótulos duplicados no código (R$ 199 e "Completo"; planos em três arquivos com conteúdos divergentes), contra a regra de usar o catálogo.
6. Fluxos longos sem rascunho/guarda de saída (assistente de evento, onboarding de fornecedor que cria o registro no passo 1).
7. Falta de componentes no DS e proliferação de variantes locais (campos, selects, botões, seletor de cor/data, overlay de missões); componentes do DS sem uso (`EntityHeader`, `DetailPanel`, `MetricCard`, `PageHeader`, `BarChart`, `Donut`).
8. Passo-a-passo de reautenticação inconsistente (só a exclusão leva ao step-up; outras ações mostram texto cru).
9. Jargão de projeto exposto ao usuário (H1, "Onda C", `security_events`, `append-only`).
10. Possível violação de regra de marca (ícone de coração no pack de casamento) e uso de classes de token inexistentes (`bg-surface`).

## 8. Lacunas deste inventário (não verificado)

- Conteúdo interno de `app/admin/loading.tsx`, do `<details>` administrativo do portal do fornecedor, de `AjudaDoPainel` e `TemaDoPainelToggle` e dos `onboarding/*` além do que foi lido (`appearance-step`, `color-field`, `datetime-field`, `live-preview` foram lidos por amostragem de atributos).
- Respostas e códigos de erro reais das APIs (`/api/admin/*`, `/api/billing/*`, `/api/vendors/*`); mensagens aqui vêm do código cliente.
- Comportamento real quando uma capability é negada nas páginas do console (se o caso de uso lança ou devolve vazio).
- Se a coluna "Conta" de `/console/accounts` é link para o detalhe (nenhum `Link` na coluna no arquivo lido).
- Ordenação de falhados em retenção; quem linka `/admin/billing` no painel.
- Landing `/` e `/15-anos` (`app/landing/**`), `app/admin/e/**` (painel do evento) ficam para outros inventários.
- Nenhuma tela foi renderizada nem testada no navegador.
