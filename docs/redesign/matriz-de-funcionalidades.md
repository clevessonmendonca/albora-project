# Matriz de funcionalidades — protótipos × produto

Fonte: pacote `Albora-Todos-os-Prototipos.zip` (ver [`zip-2026-10-diagnostico.md`](./zip-2026-10-diagnostico.md)).
Linha **A** = bundle `Albora-*-Prototipo`; linha **B** = série `v3/v4`.

Estados: **Existe** (visto no código), **Parcial**, **Falta**, **A conferir** (inventário diz que existe; falta comparar em render),
**Congelado** (bloqueado por [`congelamento-de-features.md`](../product/congelamento-de-features.md)), **Não portar** (anti-padrão ou contraria uma regra),
**Depois** (decisão de escopo), **Descartado** (removido de propósito antes). A coluna PR traz o pull request que fechou o item.

## Criação do evento

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Seis tipos por pack, tecla 1-6 | B criar-v3, A | `type-step.tsx`, `packsDeCriacao()` | Existe | — |
| Nome, data, hora, local | B, A | `details-step.tsx` | Existe | — |
| Validação com foco no campo inválido | B criar-v3(1), A | `showErrors`, `aria-invalid` | Existe | — |
| Slug `albora.app/e/<slug>` visível ao vivo | B criar-v3 | não há | Não portar (o slug nasce no servidor; uma prévia no cliente seria inventada) | — |
| Momentos sugeridos por tipo, chips editáveis | B criar-v3, v3(1) | `Pack.momentos?` existe, wizard não mostra | Parcial (chips somente leitura; edição precisa de persistência por evento) | #110 |
| Fuso e idioma | B | automáticos, não editáveis | Existe (sem edição) | — |
| Cinco estilos de capa | B | `appearance-data.ts` | Existe | — |
| Par de cores, seis combos, extração da capa | B identidade-v3 | `color-field.tsx`, `paletteFromImage`, `event-combos.ts` | Existe | — |
| Selo de contraste ("AA ✓ / ajustado") | B, A | `cor.ts` existe; selo no wizard a conferir | Existe | #112 |
| Enquadramento da capa 25/50/75 | A | `CoverImageEditor` | Existe (vertical e horizontal) | #115, #116 |
| Prévia ao vivo do convidado | B, A | `LivePreview` | Existe | — |
| Prévia com abas Convidado/Telão/Álbum | B criar-v3(1) | só convidado | Descartado (removido de propósito em 16f3b810 por feedback do anfitrião) | — |
| Atalhos de teclado | B | Enter/Backspace/Esc/1..N | Existe | — |
| Rascunho salvo | A, B | não persiste entre recargas | Depois (alinhar com o ADR 0020, criar sem cadastro) | — |
| Missões editáveis na criação | B, A | `MissionSheet` | Existe | — |
| Toggles de participação (fotos, vídeos, stories, moderação) | A | etapa só tem missões | Parcial (moderação e pânico no Dia do evento; vídeo e stories congelados) | — |
| Perfis para marcar (@) | A | não há | Depois | — |
| Evento relacionado (pai) | A | não há | Depois | — |
| Conta simulada, "confirmar" sem senha | A | sign-in e SSO reais | Não portar | — |
| Revisão com "editar" por linha | A, B | etapa Revisão | Existe | — |

## Tela "Pronto"

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Herói "<nome> está pronto" na cor do evento | B, A | `ReadyStep` | Existe | — |
| Link do evento com Copiar | B, A | `CopiarLinkEvento` no painel; não no Pronto | Existe | #109 |
| QR inline | A convite | só em `/admin/e/{id}/qrcode` | Existe | #109 |
| Texto de WhatsApp pronto | A convite | `whatsappInviteUrl` (link, sem texto editável) | Existe | #112 |
| Placa baixável | A, B kit | `/qrcode` e `pieces` | Existe fora do Pronto | 2 |
| Checklist "já pronto N de 4" | B criar-v3 | atalhos sem estado | Existe | #109 |
| Ver como convidado | B, A | `eventEntryUrl` | Existe | — |
| Ir ao painel | A, B | "Ir para meu evento" | Existe | — |

## Identidade do evento

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Preview em 7 superfícies (convidado, feed, telão, placa, compartilhar, álbum, Reviver) | B identidade v1-v3 | `/identity` | Depois (congelamento: personalização além de tokens) | — |
| Fase 1 (escolher) e fase 2 (refinar) | B identidade-v3 | — | Depois (congelamento) | — |
| Segunda cor, complementar, trocar ordem | B identidade-v3 | par `cor`/`cor2` | Parcial (trocar ordem feita; complementar e combos por estilo já existem em COLOR_COMBOS) | #112 |
| Nomes de cor | B identidade-v3 | — | Depois (baixo valor) | — |
| Badge de legibilidade no preview | B identidade-v1 | — | Existe | #113 |
| Monograma (A&J, AJ, sem) | B identidade-v1/v2/v3 | — | Depois (consumido em peças e moldura; falta o seletor) | — |
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
| Central do Dia do evento: fila, log, simular chegada | A | `/ao-vivo` | Parcial (fila e controles existem; log e simular chegada ficam de fora: congelamento de novos painéis) | — |
| Modo pânico, "só maiores de idade" | B painel-v4 | `/api/wall/panic` | Existe (event-controls; conferir o rótulo "só maiores" contra o ADR 0012) | — |
| Conectar telão (3 métodos) | A | `/wall-pair` | Parcial (código e QR existem; falta método por link) | — |
| Moderação foto a foto com teclado A/R | B | `/moderation` | Depois (a fila é uma lista de cartões; o atalho A/R exige uma tela de revisão individual, decisão de desenho) | — |
| Convidados: lista, busca, funil | A, B | `/guests` | Existe | — |
| Equipe, privacidade, retenção visível | B painel-v4 | `/team`, `/consent` | Existe | — |
| Insights | A | `/insights` | Existe | — |
| Console do operador | console v2/v3 | `/console` (ADR 0016) | Existe; confirmação de ação perigosa e paleta a conferir | — |

## QR, convite e kit

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| QR real, copiar link, imprimir, PNG/PDF | A, B | `/qrcode` (conferência 2026-10) | Existe | — |
| Carrossel do kit e kit de 3 peças | B kit-v2(1) | `pieces` | Depois (congelamento de novos formatos; kit atual é formato/tipo + zip) | — |
| Guardrails de QR (mín. 30 mm, contraste) | B kit-v2 | `pieces.ts` (sangria, QR mínimo, contraste) | Existe | — |
| "Aplicar a todo o kit" | B kit-v2(1) | — | Depois (depende do editor de arte, congelado) | — |
| Testar QR com a câmera | B kit-v2(1) | — | Depois | — |
| Editor de arte livre (canvas) | B kit-v2 | — | Congelado e contra "slots, não canvas" | — |
| Templates Romântico, Botânico, fonte Caveat | B kit-v2 | — | Não portar | — |

## Convidado

| Funcionalidade | Origem | Produto | Estado | PR |
|---|---|---|---|---|
| Entrada com capa e nome, sem login | A, B | `EntryFlow` | Existe | — |
| Estados do `resolverSlug` (não começou, rascunho, trocado, encerrado) | B convidado-v4 | `/e/[slug]` | Existe (conferir o texto em render) | — |
| Nome + consentimento versionado | B, A | sessão do convidado | Existe | — |
| Recompensa da primeira foto | B | confirmação da 1ª foto, convite ao app | Existe | — |
| Câmera com LUT, EXIF removido, fila offline | A, B | `/photo` | Existe | — |
| Câmera: modos foto/vídeo/cinema, zoom, temporizador, lanterna | A | — | Congelado (vídeo); resto a conferir | 7 |
| Editor de story com camadas | A | `/api/stories` | Congelado (e contra "slots, não canvas") | — |
| Feed, stories, reação, comentário | A, B | `/feed`, PR #101 | Existe | — |
| Gate contextual de interação | B convidado-v4 | ADR 0009 | Existe | — |
| Missões com progresso | A, B | `/missions` | Existe | — |
| Recado | A, B | `/api/recado` | Existe | — |
| Perfil, minhas fotos, remover | A | `/my-photos`, `/g/[autorId]` | Existe | — |
| Compartilhar com molduras e formatos | A | ADR 0022 | Parcial (use-share com molduras permitidas, ADR 0022) | — |
| Upload em lote com momento | A | — | Parcial (input múltiplo na foto; momento por lote não localizado) | — |
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
| Reviver (capítulos, player) | B posevento-v1 | conferência 2026-10 | Parcial (sem "assistir na TV" e sem vídeo: congelado e ADR 0007) | — |
| Entrega: ZIP, melhores, Drive, livro PDF | B | export, entrega, `book/pdf` | Existe | — |
| Linha de retenção (dia 330 e 365) | B | job de retenção | Existe (AvisoDeRetencao na Home pós-evento) | — |
| Destaques e capa do livro | B fotos-v1 | `/album` | Existe | — |

## Fora do escopo

Landing (6 versões, só referência), site do casal C&M (Fase 4: RSVP, convite, presentes), plano Memórias, Fornecedores e Recado de áudio do `flow2` (Fase 3).

## Resultado desta rodada

Entregues: enquadramento da capa de ponta a ponta, vertical (#115) e horizontal (#116); Pronto com link, QR e checklist (#109); momentos do tipo nos Detalhes (#110); texto de WhatsApp, selo de leitura e troca de ordem das cores (#112); leitura da cor no editor de identidade (#113).
Já existiam e foram confirmados no código: estados do `resolverSlug`, gate de interação, recompensa da primeira foto, modo pânico, retenção visível, equipe e consentimento.

Decisões de produto em aberto (o protótipo não resolve):
1. A prévia em abas volta, apesar de ter sido removida por feedback do anfitrião?
2. (Resolvida) Foco horizontal da capa entregue em #116.
3. Atalho A/R na moderação: vale criar uma tela de revisão individual?
4. Rascunho salvo do wizard: aguarda o desenho do ADR 0020.

## Conferência visual protótipo × produto (rodada 2)

Capturas lado a lado em Chrome headless, por superfície. Corrigido: Home depois sem números duplicados e com o Reviver antes de guardar (#117); entrada do convidado com "Você foi convidado para" e o local (#118); "Ideias para sua festa" na Home antes (#119).

Mantido de propósito (decisão anterior, ver `conferencia-prototipos-2026-10.md`): entrada centralizada com CTA sólido (translúcido seria glassmorphism), Convidados abrindo na lista, grade do álbum, navegação do convidado Explorar/Missões/Perfil.

Ainda divergente e sem decisão: reordenar o /ao-vivo (fila de revisão antes do resumo; precisa de captura da página real, que depende de banco), faixa "Veja o Álbora acontecer", chips de momento sobre a foto do post, card "Próxima missão" no feed, chips Momentos/Pessoas e seleção em lote no álbum, entrega em cartões (ZIP, destaques, Drive, PDF).

## Rodada 3: itens liberados, auditoria e refinamento

Itens da matriz entregues: upload em lote com momento (#120); chip de momento, card Próxima missão e faixa Veja o Álbora acontecer (#121); entrega em cartões (#122); conectar o telão por link, com revisão de segurança (#123); fila de revisão antes do resumo no /ao-vivo (#125); revisão foto a foto com A/R (#126); momentos editáveis por evento, filtros e lote no álbum e seletor de monograma (#128).

Auditoria (contraste medido em Chrome, fluxos e densidade): contraste de texto de 142 reprovações para 0 (#137); fluxos altos (#127, #129, #130, #131, #132, #133, #134, #135); fluxos médios e baixos do convidado e do telão (#141 a #148) e do painel (#149 a #156); densidade (#139, #140, #157 a #161); testes instáveis tornados determinísticos (#136, #138).

### Congelado ou fora, e por quê
| Item | Motivo |
|---|---|
| Prévia em abas Convidado/Telão/Álbum no wizard | removida de propósito por feedback do anfitrião (16f3b810) |
| Rascunho salvo do wizard | aguarda o ADR 0020 (criar sem cadastro) |
| Editor de arte livre do kit e editor de story com camadas | contra "diagramação por slots, não canvas" e congelamento de features |
| Câmera de vídeo e cinema, Reviver com vídeo | congelamento de features e ADR 0007 |
| Onze modelos de telão, novos painéis do Dia do evento | congelamento de features |
| Cartão Destaques (ZIP das destacadas) na entrega | nenhuma rota exporta só as destacadas |
| Consentimento pré-marcado e download de fotos no plano free | decisão de produto pendente |
| Foco visível global (94 de 521 testes abaixo de 3:1) | o halo na cor do chão muda o foco do produto todo; decisão de design |
| Remover e reenviar convite da equipe | precisa de backend |
| Home antes e depois, Ao vivo, Moderação e Pronto: densidade | PRs abertos mexem nessas telas; fazer depois que entrarem |
