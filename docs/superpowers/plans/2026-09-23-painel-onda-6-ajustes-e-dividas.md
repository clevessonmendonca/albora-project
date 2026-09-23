# Onda 6 — Ajustes, e a limpeza das dívidas (registro de execução)

**Goal:** Fechar o sexto destino e pagar o que ficou anotado nas ondas anteriores.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§5.5), commit `8868ba42`.

## A separação que faltava: operação contra regra

`event-controls.tsx` misturava duas naturezas. Pausar o telão no meio da festa é **operação** — o anfitrião faz de pé, com o celular na mão, em segundos. Decidir se há menores e qual é o modo de moderação é **regra** — se decide sentado, antes, uma vez.

Ganhou uma prop `modo`, o mesmo padrão já usado em `HostAlbum` e `GuestFunnel`:

- `aoVivo` — publicar, telão, gate de interação. Vive no Início.
- `regras` — proteções, plano, suporte. Vive em Ajustes.

Um componente, um `patch`, zero duplicação de lógica.

Isso **fecha a dívida aberta na Onda 1A**, que eu vinha carregando em cada relatório: o rascunho mostrava dez controles quando a spec §4.1 pede uma ação primária. Agora mostra boas-vindas, os passos, o checklist e o botão de publicar.

Saiu junto a seção "Moderação e convidados", que era navegação redundante — a barra lateral tem destinos desde a Onda 0B-3, e um bloco de links no meio dos controles era resíduo de quando não tinha.

## Encerrar evento ganhou botão

O caminho de escrita de `status = 'ended'` existe desde a Onda 0A, com teste contra banco real, e **nunca teve interface**. Ganhou uma, em Ajustes, gated a papel couple, com confirmação em `Dialog` que diz a consequência antes de confirmar — a spec §8 exige isso para ação destrutiva, e o `Dialog` do design system nunca tinha sido usado no admin.

## As dívidas pagas

| Dívida | Onde estava | O que era |
|---|---|---|
| Emoji na interface | `live-summary.tsx` | "🎉 A primeira foto chegou!" — anti-padrão declarado no brief |
| Seção some em silêncio | `consent-versions.tsx` | `return null` com lista vazia: a tela ficava muda |
| Seção some em silêncio | `event-team-panel.tsx` | `return null` sem permissão: sumia sem dizer quem pode |
| Botão fora do design system | `event-pieces.tsx` | "Baixar SVG" era Tailwind cru; ficou fora da varredura da 0B-1 por não usar `adminClasses` |

Os dois emojis que sobraram em `missions-editor.tsx` são `placeholder="🎉"` num campo onde o anfitrião **digita um emoji**. Placeholder que mostra o tipo de conteúdo esperado é correto; o anti-padrão é emoji decorativo em texto de interface.

## Resultado

Quatro commits. Suíte em 2785 testes, isolamento em 438, typecheck e lint limpos, 8 guards.

Verificação por grep ao fim: `adminClasses` não existe mais, nenhum `localStorage` de checklist, nenhum `return null` de seção, nenhum emoji decorativo.

## O que continua aberto

- **Fase Depois sem prazo de retenção.** Depende de leitura nova de `retention_jobs` escopada ao evento (spec §6.5). Hoje só o console `/ops` enxerga.
- **Retrospectiva.** Net-new, com critérios de curadoria a decidir (spec §6.6).
- **Destaque sem consumidor.** O sinal existe e é editável desde a Onda 2A; telão, retrospectiva e ordenação do álbum entram cada um na sua onda.
- **Tema escuro no admin.** Declarado fora de escopo desde a Onda 0B-3.
- **Verificação visual.** Nenhuma das onze ondas foi vista renderizada.
