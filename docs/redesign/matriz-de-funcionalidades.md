# Matriz de funcionalidades — protótipos × produto

Fonte: pacote `Albora-Todos-os-Prototipos.zip` (ver [`zip-2026-10-diagnostico.md`](./zip-2026-10-diagnostico.md)).
Linha **A** = bundle `Albora-*-Prototipo`; linha **B** = série `v3/v4`.

Estados: **Existe** (visto no código), **Parcial**, **Falta**, **A conferir** (inventário diz que existe; falta comparar em render),
**Congelado** (bloqueado por [`congelamento-de-features.md`](../product/congelamento-de-features.md)), **Não portar** (anti-padrão ou contraria uma regra),
**Depois** (decisão de escopo). A coluna PR aponta a etapa de [`zip-2026-10-diagnostico.md`](./zip-2026-10-diagnostico.md) §6.

## Criação do evento

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Seis tipos por pack, tecla 1-6 | B criar-v3, A | `type-step.tsx`, `packsDeCriacao()` | Existe | — |
| Nome, data, hora, local | B, A | `details-step.tsx` | Existe | — |
| Validação com foco no campo inválido | B criar-v3(1), A | `showErrors`, `aria-invalid` | Existe | — |
| Slug `albora.app/e/<slug>` visível ao vivo | B criar-v3 | não há | Falta | 3 |
| Momentos sugeridos por tipo, chips editáveis | B criar-v3, v3(1) | `Pack.momentos?` existe, wizard não mostra | Falta | 4 |
| Fuso e idioma | B | automáticos, não editáveis | Existe (sem edição) | — |
| Cinco estilos de capa | B | `appearance-data.ts` | Existe | — |
| Par de cores, seis combos, extração da capa | B identidade-v3 | `color-field.tsx`, `paletteFromImage`, `event-combos.ts` | Existe | — |
| Selo de contraste ("AA ✓ / ajustado") | B, A | `cor.ts` existe; selo no wizard a conferir | A conferir | 5 |
| Enquadramento da capa 25/50/75 | A | `CoverImageEditor` | A conferir | 5 |
| Prévia ao vivo do convidado | B, A | `LivePreview` | Existe | — |
| Prévia com abas Convidado/Telão/Álbum | B criar-v3(1) | só convidado | Falta | 3 |
| Atalhos de teclado | B | Enter/Backspace/Esc/1..N | Existe | — |
| Rascunho salvo | A, B | não persiste entre recargas | A conferir | 3 |
| Missões editáveis na criação | B, A | `MissionSheet` | Existe | — |
| Toggles de participação (fotos, vídeos, stories, moderação) | A | etapa só tem missões | Parcial | 4 |
| Perfis para marcar (@) | A | não há | Depois | — |
| Evento relacionado (pai) | A | não há | Depois | — |
| Conta simulada, "confirmar" sem senha | A | sign-in e SSO reais | Não portar | — |
| Revisão com "editar" por linha | A, B | etapa Revisão | Existe | — |

## Tela "Pronto"

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Herói "<nome> está pronto" na cor do evento | B, A | `ReadyStep` | Existe | — |
| Link do evento com Copiar | B, A | `CopiarLinkEvento` no painel; não no Pronto | Falta | 2 |
| QR inline | A convite | só em `/admin/e/{id}/qrcode` | Falta | 2 |
| Texto de WhatsApp pronto | A convite | `whatsappInviteUrl` (link, sem texto editável) | Parcial | 2 |
| Placa baixável | A, B kit | `/qrcode` e `pieces` | Existe fora do Pronto | 2 |
| Checklist "já pronto N de 4" | B criar-v3 | atalhos sem estado | Parcial | 2 |
| Ver como convidado | B, A | `eventEntryUrl` | Existe | — |
| Ir ao painel | A, B | "Ir para meu evento" | Existe | — |

## Identidade do evento

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Preview em 7 superfícies (convidado, feed, telão, placa, compartilhar, álbum, Reviver) | B identidade v1-v3 | `/identity` | A conferir | 5 |
| Fase 1 (escolher) e fase 2 (refinar) | B identidade-v3 | — | A conferir | 5 |
| Segunda cor, complementar, trocar ordem | B identidade-v3 | par `cor`/`cor2` | Parcial | 5 |
| Nomes de cor | B identidade-v3 | — | Falta | 5 |
| Badge de legibilidade no preview | B identidade-v1 | — | A conferir | 5 |
| Monograma (A&J, AJ, sem) | B identidade-v1/v2/v3 | — | A conferir | 5 |
| LUTs de foto no cliente | B | ADR 0007, `features/photo` | Existe | — |
| Paletas Jardim, Sálvia, Rosé | B | — | Não portar | — |

## Painel do anfitrião

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Início por fase (antes, durante, depois) | B painel-v4 | `event-home.tsx`, `load-home-state.ts` | Existe | — |
| Sidebar e bottom-bar | B | navegação em `navegacao.ts` | Existe | — |
| Grupos Seu evento, Descobrir, Personalização | A, B | PR #99 | Existe | — |
| Comunidade e Inspiração | A | PR #101, ADR 0023 | Existe | — |
| Contagem regressiva | A, B | PR #99 | Existe | — |
| Central do Dia do evento: fila, log, simular chegada | A | `/ao-vivo` | A conferir | 6 |
| Modo pânico, "só maiores de idade" | B painel-v4 | `/api/wall/panic` | A conferir | 6 |
| Conectar telão (3 métodos) | A | `/wall-pair` | A conferir | 6 |
| Moderação foto a foto com teclado A/R | B | `/moderation` | A conferir | 6 |
| Convidados: lista, busca, funil | A, B | `/guests` | Existe | — |
| Equipe, privacidade, retenção visível | B painel-v4 | `/team`, `/consent` | A conferir | 6 |
| Insights | A | `/insights` | Existe | — |
| Console do operador | console v2/v3 | `/console` (ADR 0016) | Existe; confirmação de ação perigosa e paleta a conferir | — |

## QR, convite e kit

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| QR real, copiar link, imprimir, PNG/PDF | A, B | `/qrcode` (conferência 2026-10) | Existe | — |
| Carrossel do kit e kit de 3 peças | B kit-v2(1) | `pieces` | A conferir | 8 |
| Guardrails de QR (mín. 30 mm, contraste) | B kit-v2 | `pieces.ts` (sangria, QR mínimo, contraste) | Existe | — |
| "Aplicar a todo o kit" | B kit-v2(1) | — | Falta | 8 |
| Testar QR com a câmera | B kit-v2(1) | — | Falta | 8 |
| Editor de arte livre (canvas) | B kit-v2 | — | Congelado e contra "slots, não canvas" | — |
| Templates Romântico, Botânico, fonte Caveat | B kit-v2 | — | Não portar | — |

## Convidado

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Entrada com capa e nome, sem login | A, B | `EntryFlow` | Existe | — |
| Estados do `resolverSlug` (não começou, rascunho, trocado, encerrado) | B convidado-v4 | `/e/[slug]` | A conferir | 7 |
| Nome + consentimento versionado | B, A | sessão do convidado | Existe | — |
| Recompensa da primeira foto | B | confirmação da 1ª foto, convite ao app | A conferir | 7 |
| Câmera com LUT, EXIF removido, fila offline | A, B | `/photo` | Existe | — |
| Câmera: modos foto/vídeo/cinema, zoom, temporizador, lanterna | A | — | Congelado (vídeo); resto a conferir | 7 |
| Editor de story com camadas | A | `/api/stories` | A conferir | 7 |
| Feed, stories, reação, comentário | A, B | `/feed`, PR #101 | Existe | — |
| Gate contextual de interação | B convidado-v4 | ADR 0009 | A conferir | 7 |
| Missões com progresso | A, B | `/missions` | Existe | — |
| Recado | A, B | `/api/recado` | Existe | — |
| Perfil, minhas fotos, remover | A | `/my-photos`, `/g/[autorId]` | Existe | — |
| Compartilhar com molduras e formatos | A | ADR 0022 | Parcial | 7 |
| Upload em lote com momento | A | — | A conferir | 7 |
| Convidado cria o próprio evento | A | — | Depois | — |
| Reação por coração | A | reações fechadas | Não portar (ícone) | — |

## Telão

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Quatro modelos (polaroide, mural, colagem, dump) | B | `/wall-display` | Existe | — |
| Onze modelos | B telao-v4 | — | Congelado | — |
| Pareamento por código | B telao-v4 | `/wall-pair` | Existe | — |
| Nunca corta na vertical | B | regra | Existe | — |

## Pós-evento

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Reviver (capítulos, player) | B posevento-v1 | conferência 2026-10 | Parcial (sem "assistir na TV", sem vídeo) | 9 |
| Entrega: ZIP, melhores, Drive, livro PDF | B | export, entrega, `book/pdf` | Existe | — |
| Linha de retenção (dia 330 e 365) | B | job de retenção | A conferir na UI | 9 |
| Destaques e capa do livro | B fotos-v1 | `/album` | Existe | — |

## Fora do escopo

Landing (6 versões, só referência), site do casal C&M (Fase 4: RSVP, convite, presentes), plano Memórias, Fornecedores e Recado de áudio do `flow2` (Fase 3).
