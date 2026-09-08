# 0020 — Delayed auth: criar o evento antes do cadastro (hipótese A/B, atrás de flag)

- **Status:** Proposed (flag `delayedAuth` desligada; caminho atual é o fallback)
- **Data:** 2026-09-07
- **Relaciona-se com:** [0013](./0013-acesso-por-conta-sob-rls.md), [0018](./0018-sso-google-e-convidado-reivindica-fotos.md)

## Contexto

Hoje o anfitrião **entra antes de criar**: `/admin/new` exige sessão (`albora_host`) e, sem ela, redireciona para `/admin/sign-in?next=…`. Só depois de logado o wizard roda e `POST /api/admin/events` (que também exige sessão) cria o evento. O login é magic link, com Google SSO como segunda porta ([ADR 0018](./0018-sso-google-e-convidado-reivindica-fotos.md)).

O redesign v4 propõe inverter a ordem no fluxo A: **criar o evento primeiro, capturar o e-mail como acesso só no fim** ("Pra onde enviamos o acesso do seu evento?", sem linguagem de senha/cadastro). A hipótese é de conversão — o evento *nasce* durante a montagem, e a fricção de cadastro sai da frente do "time to value" (design-system-v3 §0.5). É a mesma filosofia da "segunda porta" do convidado ([ADR 0008](./0008-app-nativo-como-segunda-porta.md)), aplicada ao anfitrião.

Isto **não** é login novo. O login-antes continua existindo e continua sendo o caminho para o usuário recorrente. Delayed auth é uma **ordem alternativa** para o primeiro evento.

## Decisão

**Adotar delayed auth como hipótese em teste A/B, atrás da flag `delayedAuth` (off por padrão).** Enquanto desligada — o estado de produção hoje — vale o login-antes, sem mudança. Ligada, o wizard roda sem sessão e o e-mail-como-acesso aparece no passo Pronto.

A flag vive em `apps/web/lib/flags.ts` (`delayedAuthEnabled()`, lida de `NEXT_PUBLIC_DELAYED_AUTH`), porque a mesma decisão precisa ser lida no cliente (o wizard) e no servidor (o guard de `/admin/new`).

### O que esta MR entrega

- A **flag** (desligada) e o **componente de e-mail-como-acesso** (`AccessEmailStep`) no passo Pronto, gated pela flag. Reusa o magic link existente (`POST /api/admin/entrar`) — **nenhum backend novo**. A copy é a do REFATORACAO §2.4.
- Este ADR e o registro em `architecture.md`.

### O que esta MR **não** entrega (backend, MR seguinte)

O caminho anônimo de ponta a ponta é deliberadamente adiado, porque toca posse de evento e isolamento, e merece review próprio. O plano:

1. **Guard de `/admin/new`** passa a **não** redirecionar quando `delayedAuthEnabled()` e não há sessão — o wizard roda anônimo.
2. **Criação anônima.** Um evento precisa de `account_id` (RLS por conta, [ADR 0013](./0013-acesso-por-conta-sob-rls.md)). O caminho anônimo cria uma **conta pendente** keyed pelo e-mail (sem senha, sem sessão emitida), dona do evento, e emite o magic link. A confirmação do link **ativa** a conta e loga — não cria uma segunda identidade (mesma convergência por e-mail do [ADR 0018](./0018-sso-google-e-convidado-reivindica-fotos.md)).
3. **Estado do wizard sobrevive ao round-trip.** As escolhas (tipo, nome, data, aparência) são persistidas na criação anônima **antes** do magic link, não no cliente — senão o ir-e-voltar do e-mail perde tudo.
4. **Isolamento intacto.** Conta pendente entra na mesma RLS por `account_id`; nada cruza eventos. Evento órfão (link nunca confirmado) tem TTL e é coletado — não vira dado fantasma.

Até o item 1 existir, ligar a flag mostra o e-mail-como-acesso como afford­ance de acesso (magic link real, infra existente), mas a **ordem** ainda é login-antes. É scaffolding consciente, não meio-caminho escondido.

## Alternativas rejeitadas

- **Criar de vez sob uma conta anônima com senha aleatória.** Deixa lixo de conta com credencial que ninguém usa e complica a fusão quando a pessoa loga por magic link/Google depois. Conta pendente keyed por e-mail converge limpo.
- **Guardar o wizard no `localStorage` e recriar depois do login.** O estado do casal (potencialmente com escolhas de identidade) num storage do navegador é frágil (limpa, troca de aparelho) e move a fonte da verdade para fora do servidor. A criação anônima persistida no servidor é o caminho do isolamento.
- **Ligar por padrão.** A hipótese ainda não foi medida (AHA 1 / conversão, design-system-v3 §15). Default é o caminho provado; a flag é como se mede o novo sem arriscar o funil.

## Consequências

- Produção **não muda** enquanto a flag estiver off — o fallback é o comportamento atual, testado.
- A instrumentação de A/B (`event_creation_started`, `signup_*`, `event_created`) compara as duas ordens sem bifurcar o produto.
- O backend anônimo fica especificado aqui, então a MR seguinte é execução, não decisão.
