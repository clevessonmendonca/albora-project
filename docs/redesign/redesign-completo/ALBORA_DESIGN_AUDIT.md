# Albora — auditoria de design do protótipo

Escopo: `docs/redesign/redesign-completo/prototipo/` (HTML/JS estático, hash routing). Não é o `apps/web`.
Última atualização: 2026-11-07. Cache atual: `?v=115`. Branch: `docs/redesign-prototipo`, sem push.

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

Câmera real, `navigator.share` nativo, leitor de tela, teclado virtual, toque real, filtro no PNG em Safari (`ctx.filter`), vídeo real em stories, (A.modal já verificado no navegador: foco preso, Esc fecha, foco volta ao gatilho).

## Ciclo 1 (2026-11-05 a 07) — implementado

Correções: hero sem foto; letterbox da última foto; cabeçalho compacto no mobile; contagem duplicada no álbum; missões repetidas; handle sobreposto; filtro de fornecedor quebrava linha; stories avançavam sozinhos sem pausa; anel de foco no h1; 404 de favicon; handoff desatualizado.
Refinamentos: compartilhar vira PNG real; visualizador imersivo do álbum (72dvh + swipe); menu acessível; cabeçalho com a foto do evento em Missões; **miniaturas do estúdio de convites passam a usar a capa do evento** (antes mostravam "Escolha uma fotografia"); **dois modelos novos com composição própria no estúdio: "A foto é a festa" (foto inteira com véu gradiente) e "Um instante de nós" (polaroide)**. Ambos abrem no editor sem erro; exportação não testada.
Telão a 1920×1080: estado vazio legível; mural com 6 fotos (verticais e horizontais) preenche a grade 3×2 e as verticais ficam inteiras sobre fundo desfocado, sem corte. Estúdio: exportação dos dois modelos novos baixa `albora-convite.png` sem erro (PNG inspecionado em 2026-11-08: composição e texto legíveis; foto de teste é o placeholder escuro, falta testar foto clara/vertical real). Polaroide, colagem e dump a 1920×1080 também mostram as fotos inteiras, sem rolagem horizontal nem erro; na colagem a foto central cobre cantos das vizinhas (efeito esperado de colagem, mas pode esconder rostos nos cantos). Fotos claras não testadas: o gerador de exemplo só produz imagens escuras.

## Diagnóstico priorizado (pendente)

| Pri | Item | Observação |
|---|---|---|
| P1 | Marca "Albora" vs "ALBORA" | Decisão de produto |
| ~~P2~~ | Stories sem cabeçalho de evento | Feito: linha com miniatura e nome do evento (verificado a 390px) |
| P2 | Telão: legibilidade à distância não medida | Testar a 3 m com viewport 1920×1080 |
| P3 | Pós-casamento: retrospectiva | Experimento; validar valor antes |
| P3 | Landing page | Fora do protótipo |

## Próximo ciclo proposto

1. Estúdio: edição com foto clara/vertical real (PNG já inspecionado com a capa de demonstração).
2. Telão: fotos claras reais (o gerador de exemplo só faz escuras) e sobreposição da colagem.
3. Teste em aparelho real.
