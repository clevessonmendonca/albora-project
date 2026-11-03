# 03 · Benchmarking e padrões adotados

**Limitação de acesso (honesta):** esta fase **não navegou** Mobbin, Page Flows, Behance nem Dribbble (exigem login/paywall) e **não abriu** os apps citados. As análises abaixo vêm de conhecimento prévio dos produtos e de princípios publicados (Apple HIG, Material, Nielsen, WCAG 2.2). Tratar como hipóteses de design, não como captura de tela de referência. Se quiser referência visual verificada, o próximo passo é o usuário exportar telas do Mobbin/Page Flows para `docs/redesign/referencias/`.

Regra: **princípio sim, cópia não.** O Albora tem restrições próprias (CLAUDE.md/DESIGN.md): sem glassmorphism, sem gradiente roxo, filete em vez de caixa, convidado sem login.

| Referência | Princípio que a faz funcionar | O que adotamos | O que **não** adotamos |
|---|---|---|---|
| **Apple (HIG, Fotos, Lembretes)** | Uma ação clara por tela; títulos grandes que encolhem; sheets em vez de páginas novas; área de toque ≥44pt | Título grande por tela; bottom-sheets para criar/editar; ações destrutivas em vermelho **dentro** de diálogo com consequência escrita | Vidro translúcido (anti-padrão do projeto) |
| **Airbnb** | Descoberta por foto, passo único por tela no fluxo de criação, resumo sticky | Wizard de criação com **uma decisão por passo** e prévia viva ao lado; fotos grandes como protagonistas; checklist "Pronto para anunciar" → "Pronto para a festa" | Cartões com muita sombra |
| **Linear** | Densidade controlada, ⌘K, atalhos, listas rápidas, estados de status discretos | Command palette (⌘K) global; atalhos `G` + letra; listas com linha única e hover de ações; filtros como chips | Tema escuro "tech" como padrão do anfitrião |
| **Notion** | Hierarquia por tipografia (não por caixas); menus de contexto; propriedades inline | Ajustes como documento: seções de texto com campos inline, sem caixas empilhadas | Flexibilidade total (blocos livres): produto fecha escolhas por slots |
| **Spotify** | Navegação inferior de 3–5 itens; conteúdo como capa; personalização visível | Convidado: 3 abas (Explorar/Missões/Perfil já existem) + câmera central; capa do evento como identidade | Algoritmo/recomendação (sem dados) |
| **Instagram** | Familiaridade: stories, curtida, comentário; gesto de tocar para reagir | Feed/stories do convidado reaproveitam o modelo mental; reação por lista fechada (regra do produto) | Reação livre/emoji; DMs; perfil público |
| **Stripe** | Números grandes e claros, tabelas legíveis, formulários com validação inline, estados de "ação perigosa" | Console e Billing: tabela com ordenação/filtro reais, valores monoespaçados, validação inline, step-up de reauth | Dashboards densos no painel do casal |
| **Figma** | Painéis contextuais, inspector à direita, presença/colaboração | Estilo (identidade): editor com controles à esquerda e **prévia multi-superfície** à direita | Canvas livre (produto é por slots) |
| **Duolingo** | Feedback imediato, progressão, microinteração de recompensa | Missões: progresso em filete, recompensa discreta após a 1ª foto; checklist de preparação com contagem | Gamificação ruidosa, streaks, mascote chamativo no painel |

## Padrões consolidados (viram regras do design system)

1. **Uma decisão por tela/passo** (Airbnb, Apple) → o wizard e a Home mostram *uma* ação primária.
2. **Progressive disclosure** (Notion, Stripe) → o detalhe aparece sob demanda (sheet/accordion), não empilhado.
3. **⌘K e atalhos** (Linear) para quem opera muito (fornecedor, console).
4. **Reversível = desfazer; irreversível = diálogo** (Apple/Stripe).
5. **Hierarquia por tipografia e filete**, não por caixa (Notion + DESIGN.md).
6. **Estados são cidadãos de primeira classe**: toda lista tem loading, vazio, erro (Stripe).
7. **Mobile-first no convidado, desktop-first com versão mobile completa no anfitrião** (todo destino cabe na barra inferior + "Mais").

## Princípios científicos usados como critério

- **Lei de Hick:** menos escolhas simultâneas → 9 destinos → 5; Ajustes de 11 cartões → 6 seções.
- **Lei de Fitts:** alvo ≥44×44px (≥48 no convidado, que usa no escuro), ações frequentes na zona do polegar (barra inferior).
- **Heurísticas de Nielsen:** cada problema de `02-diagnostico.md` aponta a violada.
- **WCAG 2.2 AA:** contraste 4.5:1 texto / 3:1 UI; foco visível (2.4.7, 2.4.11); alvos 24px mínimo (2.5.8); sem dependência só de cor; `prefers-reduced-motion`.
