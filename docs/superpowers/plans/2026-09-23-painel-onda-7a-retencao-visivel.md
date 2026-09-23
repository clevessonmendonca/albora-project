# Onda 7A — Retenção visível (registro de execução)

**Goal:** O casal saber até quando as fotos ficam guardadas.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§4.4, §6.5), commit `8868ba42`.

## Por que isto não era cosmético

Os jobs de retenção existem desde a migration 0033 — `d330_drive` manda as fotos para a nuvem do casal, `d365_delete` apaga daqui. Só o console `/ops` os enxergava. O dono das fotos não tinha como saber o prazo.

Isso é promessa de LGPD que o produto cumpre e não conta. "Retenção é cumprida por job, não por promessa" diz o CLAUDE.md; faltava a metade em que o casal fica sabendo.

## Sem rota, sem polling

O Início é server component, então a leitura acontece no servidor, dentro da fase Depois. Prazo de retenção não muda entre um recarregar e outro — criar rota e ficar consultando seria construir infraestrutura para um dado estático.

## A regra que os testes fixam

**Só job pendente vira data na tela.** Job com status `skipped` ou `done` não vira promessa futura. Mostrar data que o runner não vai honrar é mentir com precisão de calendário — e quando o assunto é "quando suas fotos somem", errar para mais é pior do que não dizer.

Exportação já concluída é dita como fato, com a data em que aconteceu, não como promessa.

## Achado grave, fora do escopo desta onda

Ao escrever a leitura, descobri que **`retention_jobs` não tem RLS**: nem `ENABLE`, nem `FORCE`, nem política. Varrendo o schema inteiro: **7 de 28 tabelas com coluna `event_id` estão assim** — `app_pairings`, `billing_payments`, `event_slugs`, `retention_jobs`, `session_tokens`, `wall_pairings`, `wall_tokens`.

Pior: o guard `tools/guards/isolamento.mjs` **não verifica RLS em tabela nenhuma**. Ele checa `SET` contra `SET LOCAL` e advisory locks. O docstring dele diz que o teste contra banco real "entra na task 003", e nunca entrou. A regra mais cara do projeto não tem verificação automática.

Várias dessas tabelas parecem ser **tabelas de porta** — `event_slugs` tem comentário na migration 0004 dizendo que o slug vive fora da RLS de propósito, porque se resolve o slug antes de saber qual é o evento. Provavelmente vale para os tokens também. Mas nenhuma declara isso de forma que um guard consiga ler, e a regra do CLAUDE.md não admite exceção escrita em lugar nenhum.

**Não mexi.** Ligar RLS em `event_slugs` ou `session_tokens` sem entender o caminho de entrada do convidado pode quebrar a chegada por QR, que é o caminho crítico de sábado às 20h. E `retention_jobs` com `FORCE` quebraria o runner de `/ops`, que conecta como dono da tabela — e `FORCE` vale para o dono também.

Por enquanto, a função nova carrega um comentário de invariante dizendo que o filtro por `event_id` ali é a **única** barreira, não a segunda. Foi aberta uma tarefa separada para a auditoria.

## Resultado

Um commit. Suíte em 2790 testes, isolamento em 438, typecheck e lint limpos, 8 guards.
