# 0005 — Runtime e stack: TypeScript ponta a ponta com Next.js no Cloudflare

- **Status:** Accepted
- **Data:** 2026-08-09
- **Relaciona-se com:** [0006](./0006-hosting-platform.md)

## Contexto

Duas opções reais estavam em cima da mesa.

**Backend separado em Python/FastAPI** espelharia o Nereus: o time conhece o padrão e a revisão cruzada entre projetos fica trivial. Mas o Nereus escolheu Python por razões que o Albora não tem — loop de agente sobre o SDK da Anthropic e execução de pandas em sandbox. O custo aqui seriam dois runtimes, dois deploys e um contrato de API para manter, com uma pessoa e seis semanas.

**TypeScript ponta a ponta** dá uma linguagem, um deploy e tipos compartilhados entre as quatro superfícies.

A semelhança que queremos herdar do Nereus é de **disciplina** — ADRs, RLS forçado, guards bloqueantes, ladder de deploy — e essa disciplina é agnóstica de runtime.

Dentro do TypeScript, a escolha de framework ficou entre um SPA Vite/React com API em Hono (nativo de Workers, espelhando estruturalmente o Nereus) e Next.js App Router sobre OpenNext.

## Decisão

**Next.js (App Router) + TypeScript, implantado no Cloudflare via OpenNext.** É o que o §6.1 do documento de produto já apontava.

```
apps/
  web/            Next.js — as quatro superfícies
    /             landing
    /e/[slug]     convidado (PWA)
    /admin        anfitrião
    /telao/[slug] telão
packages/
  ui/             tokens + primitivas
  tokens/         resolvedor identity_tokens → valores
  packs/          vocabulário, missões, templates
  db/             schema + migrations
```

Um framework, um modelo mental, uma pipeline de build. Para uma pessoa em seis semanas, a economia de contexto vale mais que a otimização de cada superfície.

O SSR resolve de graça uma coisa que o SPA exigiria trabalho: as meta tags de pré-visualização do link quando alguém compartilha o evento no WhatsApp — que é, na prática, o segundo canal de distribuição do QR.

## Consequências

**Positivas** — uma linguagem em todo o repositório, tipos compartilhados do schema até o componente, e o `packages/ui` funcionando igual para as quatro superfícies. O pipeline SVG→PDF de impressão fica no mesmo runtime, sem um terceiro ambiente.

**Custo assumido: OpenNext sobre Workers tem arestas.** Não é o caminho mais batido do Next.js, e alguma feature vai exigir contorno. Mitigação: manter o domínio em código puro, com as rotas como camada fina de transporte ([`../engineering.md`](../engineering.md) §1). Se o atrito virar bloqueio, troca-se a camada de transporte, não o produto.

**Custo assumido: o SSR do Next briga com o PWA do convidado.** Service Worker, fila em IndexedDB e funcionamento offline são padrões de aplicação cliente, e o modelo do App Router empurra para o servidor. A rota `/e/[slug]` é deliberadamente client-heavy: o servidor entrega o casco e as meta tags, e o resto é cliente. **Essa rota é a exceção arquitetural do projeto e precisa estar escrita**, ou alguém vai "consertar" o padrão e quebrar a fila offline — que é a nuance que decide a H1.

**Verificação obrigatória na semana 1.** Antes de construir qualquer tela, provar ponta a ponta: Service Worker registrando sob OpenNext, IndexedDB persistindo entre sessões, e um PUT presigned direto no R2. É o risco técnico real do projeto, e o roadmap já manda começar por ele.
