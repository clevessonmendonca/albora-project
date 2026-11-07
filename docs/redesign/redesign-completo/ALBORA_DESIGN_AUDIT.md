# Albora — auditoria de design do protótipo

Escopo: `docs/redesign/redesign-completo/prototipo/` (HTML/JS estático, hash routing). Não é o `apps/web`.
Última atualização: 2026-11-07. Cache atual: `?v=111`. Branch: `docs/redesign-prototipo`, sem push.

## Decisões vigentes (não reverter sem justificativa)

- Nome da marca no protótipo e no repositório: **Albora** (46 ocorrências em JS; `CLAUDE.md` também). O prompt mestre pede "ALBORA". **Pendente de decisão do mantenedor** — não alterei.
- Hex hardcodado é proibido em JS (lint bloqueia). Cores vêm de tokens.
- Páginas do anfitrião: foto protagonista, nunca cortar vertical (ver `HANDOFF-2026-11-05.md`).
- Interação social do convidado abre por gate definido pelo casal.

## Inventário (rotas `A.route`)

| Área | Arquivo | Rotas |
|---|---|---|
| Convidado | `guest.js` | 20 (entrada, câmera, publicação, álbum, explorar, missões, perfil, fila, app, compartilhar…) |
| Anfitrião | `host-evento.js`, `host-config.js`, `host-criar.js` | 10 + 8 + 5 |
| Estúdio de compartilhar | `studio.js` | `/h/e/:id/compartilhar` |
| Fornecedor | `vendor.js` | 6 |
| Telão | `wall.js` | 4 |
| Console | `console.js` | 2 (+ varredura) |

Landing page: **não existe no protótipo** (vive em `apps/web`). Fora do escopo desta auditoria; precisa de ciclo próprio.

## Verificado (com Playwright, Chrome, 320/390/1280/1440)

- Varredura de 75 rotas × 3 fases × 3 larguras: 0 problemas, 0 erros.
- Fluxo de publicação: amostra → editor → publicar → confirmação; CTA principal "Ver o feed".
- Stories (avanço, pausa, fim), compartilhar PNG 1080×1920, swipe no visualizador do álbum.
- Foco: modal/sheet preso e devolvido; menu `A.menu` com setas/Home/End/Tab; paleta ⌘K.
- Lint: 0 desvios em 8 módulos.

## Não verificável aqui

Câmera real, `navigator.share` nativo, leitor de tela, teclado virtual, toque real, filtro no PNG em Safari (`ctx.filter`), vídeo real em stories, A.modal por navegador (só por leitura do código).

## Ciclo 1 (2026-11-05 a 07) — implementado

Correções: hero sem foto; letterbox da última foto; cabeçalho compacto no mobile; contagem duplicada no álbum; missões repetidas; handle sobreposto; filtro de fornecedor quebrava linha; stories avançavam sozinhos sem pausa; anel de foco no h1; 404 de favicon; handoff desatualizado.
Refinamentos: compartilhar vira PNG real; visualizador imersivo do álbum (72dvh + swipe); menu acessível; cabeçalho com a foto do evento em Missões; **miniaturas do estúdio de convites passam a usar a capa do evento** (antes mostravam "Escolha uma fotografia").

## Diagnóstico priorizado (pendente)

| Pri | Item | Observação |
|---|---|---|
| P1 | Estúdio: só "Todos…Convite digital" em chips; templates compartilham a mesma estrutura de colunas | Criar 2–3 composições realmente diferentes (full-bleed, tipográfico, polaroide) — precisa aprovação de direção de arte |
| P1 | Marca "Albora" vs "ALBORA" | Decisão de produto |
| P2 | Stories sem cabeçalho de evento | Faltou onde a foto principal entra |
| P2 | Auditoria de foco em `A.modal` no navegador | Só lido, não executado |
| P2 | Telão: legibilidade à distância não medida | Testar a 3 m com viewport 1920×1080 |
| P3 | Pós-casamento: retrospectiva | Experimento; validar valor antes |
| P3 | Landing page | Fora do protótipo |

## Próximo ciclo proposto

1. Estúdio: templates com composições distintas (depende de aprovação).
2. Telão a 1920×1080 com fotos verticais, escuras e claras.
3. A.modal por navegador.
4. Teste em aparelho real.
