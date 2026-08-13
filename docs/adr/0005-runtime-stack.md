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
    /wall-display   telão (EN; /telao redireciona 308)
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

## Resultado da verificação — 2026-08-10

Feita pela [task 001](../specs/task-001-verificacao-plataforma.md), em spike descartável publicado no Cloudflare. **As três perguntas deste ADR têm resposta sim.** A decisão fica confirmada; nada aqui é reaberto.

O Service Worker registra, ativa e controla a página sob OpenNext — e o risco previsto de ele não sair no escopo certo **não se materializou**: o adaptador já serve `/public` como asset estático na raiz, fora do pipeline de render. A fila em IndexedDB sobreviveu a fechar a aba e, no iPhone, a encerrar o navegador. O PUT presigned chega no R2 pelo navegador.

A prova mais forte foi a do caminho crítico. Durante um PUT de 819 200 bytes, o Worker registrou **um único evento** — `POST /api/spike/presign`, com `content-length: 21` e 71 ms de CPU. Nenhum `PUT`. A regra do `CLAUDE.md` de que o servidor nunca toca nos bytes de mídia deixou de ser intenção e virou medida, com proporção de cerca de 39 000 para 1.

**O que se descobriu, e não estava previsto:**

O `headers()` do `next.config` **não alcança arquivos de `/public` sob OpenNext** — o Workers Assets os serve antes do Worker do Next. Apareceu justamente no `/sw.js`, onde cabeçalho errado de cache é o que congela um Service Worker antigo em produção. Corrigido com `public/_headers`. É exatamente a categoria de aresta que este ADR assumiu como custo, e o custo se pagou: apareceu na semana 1, num spike, e não num sábado às 20h.

O achado que pagou a tarefa sozinho não foi do OpenNext, e sim do próprio código: um arquivo estava no precache do Service Worker e **nunca era lido**, porque o handler de `fetch` não tratava aquele tipo de requisição. Online ninguém percebia. Offline, a página abria inteira e hidratada **e a fila não existia** — o convidado tiraria a foto sem sinal e ela não entraria em fila nenhuma. Nenhum teste unitário pegaria: o arquivo estava no cache, o teste do cache passaria. Só quebrou porque a prova offline rodou com o servidor derrubado de verdade e alguém verificou se a fila existia, não só se a página aparecia.

**O que ficou sem medir:** a perna Android da prova 7, por falta de aparelho. O impacto disso caiu depois do [ADR 0010](./0010-expo-para-o-app-do-convidado.md), que leva o upload em segundo plano para API nativa — resta o comportamento da web no Android, para quem escaneia o QR e nunca instala.
