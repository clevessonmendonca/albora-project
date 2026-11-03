# Brief de revisão de arte (2ª passada) — eliminar o "genérico"

Complementa `BRIEF.md` (continua valendo: arquivo-dono, API, regras de produto). **Leia primeiro** `../06-direcao-de-arte.md` (assets, âmbar, Opal, composição por superfície) e `/Users/clevesson-mendonca/www/albora/worktrees/merganser/DESIGN.md` §§1–4, 6 (marca, âmbar é metal, filete não caixa, fonte de luz).

## O que mudou no núcleo (já pronto; não edite core/ds)
- Marca oficial: `A.logo(h)`, `A.mark(px)`, `A.mascot(px,'mascote'|'mascote-corpo'|'avatar-ambar',alt)`, `A.star(px)`, `A.celebrate(el)`, `A.arc(p 0..1, largura, rótulo)` (o arco da logo como progresso: o ponto-sol percorre o arco). Arquivos em `assets/` (cópias dos oficiais; **não recrie nem substitua por ícone genérico**).
- Cromo = `--ac` (anfitrião: âmbar da marca; convidado/telão: acento do evento derivado e legível). `--ev` (cor do casal) só para o que é do evento: avatar, prévias, capa. **Troque qualquer `var(--ev)` usado como cromo por `var(--ac)`.** Fornecedor: defina `--ac` com a cor de marca do fornecedor no wrapper da tela (white-label).
- Botão primário: no claro é **tinta**; no escuro é o acento. `.btn-accent` no claro vira tinta (não pinte nada de âmbar sólido grande: âmbar é metal — filete, sublinhado, disco, numeral, foco).
- `A.emptyState` já usa o mascote (menos no console).

## Skill Impeccable (obrigatório, registre o que usou)
Leia e aplique `/Users/clevesson-mendonca/www/albora/worktrees/merganser/.claude/skills/impeccable/reference/`: `critique.md`, `craft-floor.md`, `polish.md`, `layout.md`, `typeset.md` (+ `operate.md` para painel/console, `animate.md` para microinteração, `distill.md` para cortar). O hook de design roda sozinho ao gravar; corrija o que ele apontar (suprimir só falso positivo claro, com `hook-admin.mjs ignore-value` e motivo).

## Tarefa
1. **Auditar cada tela do seu módulo** abrindo no navegador (aba própria via `tabs_create`; desktop 1360 e mobile 375). Para cada tela responda, em `auditoria-<modulo>.md`, as 10 perguntas (sim/não/parcial + 1 frase): 1 identidade reconhecível? 2 logo oficial correta? 3 mascote/avatar nos contextos certos? 4 âmbar correto (cromo ≠ cor do evento)? 5 genérica ou com personalidade? 6 quantidade de informação adequada? 7 hierarquia clara? 8 componente desnecessário? 9 ação principal evidente? 10 nível de produto consolidado? Seja crítico e específico (nada de “tudo ok”).
2. **Corrigir de verdade** no seu `.js` o que a auditoria apontar — sem perder nenhuma funcionalidade (a matriz `matriz-<modulo>.md` não pode ficar desatualizada: se mudar algo de lugar, atualize a linha). Prioridade: composição própria por função (nada de título + subtítulo + 3 cartões + botão), menos cartões (lista em filete, tipografia e espaço fazem a hierarquia), um CTA por tela, números em Fraunces onde forem o herói, estados vazios com mascote, foco/rolagem preservados.
3. Sem hex, sem gradiente decorativo (a exceção é o halo de vela do DESIGN.md §6 e o degradê do próprio logo), sem sombra pesada, sem raio igual em tudo (botão pílula; superfície 18; foto 12; campos sem raio), sem emoji, ícones só de `A.icon`.
4. Validar: `node --check`; recarregar sem cache; sem erros de console; os 3 estados; fluxo principal; teclado.
5. Relatório final (≤12 linhas): telas corrigidas, o que mudou de composição (antes → depois, por tela), limitações, o que NÃO conseguiu.
