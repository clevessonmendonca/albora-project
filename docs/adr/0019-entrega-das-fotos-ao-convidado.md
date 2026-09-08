# 0019 — Entrega das fotos ao convidado: link de galeria com gate do casal

- **Status:** Accepted
- **Data:** 2026-09-06
- **Relaciona-se com:** [0004](./0004-anonymous-guest-session.md), [0007](./0007-ai-policy-luts-not-generation.md), [0009](./0009-app-social-do-convidado.md), [0016](./0016-camadas-do-console-interno.md), [0018](./0018-sso-google-e-convidado-reivindica-fotos.md)

## Contexto

O [ADR 0018](./0018-sso-google-e-convidado-reivindica-fotos.md) resolveu o *vínculo*: o convidado prova posse de um e-mail (Google ou magic link) e ele fica gravado como `guest_contacts` verificado, escopado à sessão daquele evento. O 0018 deixou explícito que a **entrega** — mandar as memórias usando esse contato — é outra frente. Esta é a frente.

## Decisão

O convidado que reivindicou recebe **um link para uma galeria web só das fotos da própria sessão**, disparado **quando o casal libera** (gate), por e-mail que **degrada, nunca falha**.

Três escolhas se cruzam:

### 1. Gatilho: gate do casal, não imediato nem d330

A entrega abre por um gate que o casal controla no admin (`events.delivery_opens_at`), mesmo espírito do gate de interação do [ADR 0009](./0009-app-social-do-convidado.md). Rejeitados:

- **Imediato ao reivindicar** — mandaria foto no meio da festa e competiria com estar presente, exatamente o que a fricção-zero da primeira foto protege.
- **Junto do export d330 (retenção)** — faria o convidado esperar até 11 meses pelas próprias fotos; a retenção é sobre a nuvem do *casal*, não sobre a memória do convidado.

O gate respeita o momento do evento e reusa um padrão já existente.

### 2. Formato: link para galeria da sessão, servidor não empacota bytes

O e-mail leva um **link** para `/g/{token}`, uma página pública (sem login) que lista as fotos que **aquela sessão** subiu, com GET presigned por foto. Rejeitado: **anexar as fotos no e-mail** — obrigaria o servidor a empacotar mídia, colidindo com o não-negociável "o servidor nunca toca nos bytes de mídia". O link herda a mesma regra: o servidor assina URLs, o object storage serve os bytes.

O escopo é **as fotos da própria sessão** (as que o convidado subiu), coerente com "reivindicar as próprias fotos" do 0018 — não a galeria do evento inteiro.

### 3. Token de entrega: opaco, assinado, escopado a UMA sessão-de-evento

O link carrega um token opaco assinado (mesmo primitivo `token.ts` que já lastreia `magic_links`, `session_tokens`, `staff_*`), gravado em `delivery_tokens (token_hash, event_id, session_id, expires_at, revoked_at)`. Não é o token de sessão do convidado: é um segundo conceito, separadamente revogável e purgável, com TTL próprio (dias, não a hora da sessão). Resolve exatamente: ver as fotos daquela sessão daquele evento. A assinatura da URL de cada foto passa por `signableKeys` — respeita `panic` e só serve `state='published'`.

## Consequências

**Ganha-se:** o convidado recebe as próprias memórias no tempo do casal, por um link que não põe o servidor no caminho dos bytes, sem conta e sem cruzar eventos.

**Paga-se:** um gate novo no admin; uma tabela de token de entrega e uma de magic link do convidado, ambas com purga própria na retenção (o `guest_contacts` também não estava coberto pela purga d365 do acervo — este ADR fecha essa lacuna junto); e a disciplina de manter o e-mail de entrega **fora do caminho crítico** — falha de envio degrada e re-tenta, nunca derruba nada.

**Não-negociáveis carregados:** servidor nunca empacota mídia; IA generativa não toca as fotos ([0007](./0007-ai-policy-luts-not-generation.md)); o convidado não vira conta ([0018](./0018-sso-google-e-convidado-reivindica-fotos.md)); a entrega só abre por decisão do casal; `guest_contacts`, `delivery_tokens` e `guest_magic_links` apagados pela retenção.
