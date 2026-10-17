# Pacote `Albora-Todos-os-Prototipos.zip` — diagnóstico (outubro de 2026)

Leitura estática do pacote, comparada com `apps/web` e `packages/ui-web` em `stable`.
Nada do pacote foi executado. Landing e privacidade ficam fora do escopo (só referência).
Complementa [`conferencia-prototipos-2026-10.md`](./conferencia-prototipos-2026-10.md); a matriz por
funcionalidade está em [`matriz-de-funcionalidades.md`](./matriz-de-funcionalidades.md) e o mapa de rotas
em [`mapa-de-navegacao.md`](./mapa-de-navegacao.md).

## 1. O que é o pacote

36 itens, 121 MB: 33 HTML, 2 ZIP internos (site do casal, cada um com `index.html` e 2 jpeg) e um `LEIA-ME.txt`.
Só 33 conteúdos distintos: `albora-sistema` = `albora-sistema(1)`; `Albora-Prototipo` = `-Convidados-` = `-Criar-Evento-`;
`-Dia-do-Evento-` é o mesmo bundle abrindo em `#ao-vivo`.

| Grupo | Arquivos | Conteúdo |
|---|---|---|
| Bundle (linha A) | `Albora-*-Prototipo` (4) | 3 documentos embutidos roteados por hash: criar (`#criar/*`), convidado (`#convidado/*`), painel (`#inicio`, `#ao-vivo`…) |
| Série v3/v4 (linha B) | `criar-v3` e `(1)`, `identidade-v1..v3`, `painel-v4`, `convidado-v4`, `kit-v1`, `kit-v2` e `(1)`, `fotos-v1`, `posevento-v1`, `telao-v4` e `.built` | telas isoladas, uma por assunto |
| Operador e conceito | `console-v2/v3`, `flow2`, `fluxo`, `sistema` | console interno, jornadas, manual do sistema de design |
| Casamento C&M | `index`, `Clevesson-e-Miria*` (2), 2 ZIP | site/convite/RSVP do casal (Fase 4) |
| Landing | 6 arquivos | referência apenas |

## 2. Duas linhagens

- **Linha B (v3/v4)** usa Fraunces + Instrument Sans, brand `#D9793C`, camada `--ev`/`--ev-2`, 5 estilos de capa, 6 combos de cor, 4 modelos de telão. É a linha que o repo já adotou (`packages/tokens`, `appearance-data.ts`, `event-combos.ts`) e cujas cópias vivem em `docs/redesign/prototipos/`.
- **Linha A (bundle)** usa DM Sans + Playfair, ameixa `#302136` + âmbar, nasce casamento-primeiro, com conta simulada e `localStorage`. **Não está no repo.** Traz o que a linha B não tem: câmera real (foto/vídeo/cinema), editor de story com camadas, compartilhar com molduras, upload em lote, recado, convidado que cria o próprio evento, evento-pai, placa SVG com QR, mensagem de WhatsApp, central do Dia do evento com log e conexão do telão.
- Nenhum arquivo é "v5". Quando a paleta divergir, `brand/` e os tokens mandam.

## 3. Criação de evento: protótipo × wizard atual

Repo: cinco etapas (Tipo, Detalhes, Identidade, Participação, Revisão) + tela "Pronto" em `apps/web/features/admin/components/client/create-event-wizard.tsx`.
Protótipo: `criar-v3(1)` com três passos sem conta; bundle com dez telas e conta simulada.

**Equivale:** seis tipos via pack; nome, data, hora, local; cinco estilos; par de cores, seis combos e extração da capa; prévia ao vivo do convidado; atalhos de teclado; missões editáveis; revisão com "editar"; Pronto com "Ver como convidado", WhatsApp e atalhos.

**Falta no wizard / Pronto** (priorizado em §6): prévia com abas Convidado/Telão/Álbum; link `albora.app/e/<slug>` visível e botão Copiar; QR inline; checklist de prontidão; momentos sugeridos por tipo; selo de contraste e enquadramento da capa (a verificar no código); toggles de participação (fotos, vídeos, stories, moderação); perfis a marcar; evento relacionado.

**Diverge de propósito (não portar):** conta simulada Google/Apple/e-mail e "confirmar" falso (o repo tem SSO e sign-in reais); `localStorage` (o repo usa Postgres com RLS); plano, fornecedor e billing no wizard; fuso automático, convidados esperados e CEP (só do repo).

## 4. Funcionalidades presentes só em versões antigas (não descartar)

- Bundle: placa SVG 1080×1500; `guestUrl` que serializa identidade na query (o repo usa slug e token); evento-pai; recado de texto; convidado que cria o próprio evento; upload em lote (até 8) com momento; compartilhar com 3 molduras e 2 formatos; modo CINEMA e temporizador na câmera.
- `identidade-v1`: badge AA no preview, abas por superfície, aba Pessoas, monograma livre. `v2`: opções de monograma. `v3`: duas fases, segunda cor, nomes de cor.
- `kit-v2`: hero com três caminhos, fundo branco/transparente no QR. `kit-v2(1)`: carrossel, kit de três peças, "aplicar a todo o kit", testar QR com a câmera, guardrails de QR.
- `criar-v3`: "Ajustar momentos" e Local no corpo. `criar-v3(1)`: validação e abas de prévia.
- `console-v3` sobre `v2`: confirmação de ação perigosa, paleta de comandos, tela Sistema.

## 5. Riscos

- **Anti-padrões bloqueantes nos protótipos:** ícone de coração (tipo Casamento, reações), paletas Jardim/Sálvia (sage) e Rosé (blush), fonte script Caveat no kit, Ameixa como acento (roxo), hex hardcodado, strings de casamento no núcleo. Nada disso é portado; vai para pack e tokens.
- **Congelamento até o casamento nº 1** ([`congelamento-de-features.md`](../product/congelamento-de-features.md)): vídeo vertical, novos modelos de telão (11 do `telao-v4` contra 4 do repo), editor de layout, novos painéis. O editor de kit estilo canvas colide também com "diagramação por slots".
- **ADR 0009:** o feed do bundle abre sem gate; o gate é do casal. Consentimento do bundle é booleano, sem versão e data.
- **Perda de funcionalidade:** tratar a linha A como descartável perde câmera, editor e compartilhar mais ricos. A matriz existe para impedir isso.
- **Limite desta análise:** só o wizard foi lido em detalhe dos dois lados. As demais telas foram comparadas por inventário e exigem conferência em render antes de qualquer "pronto".

## 6. Plano por etapas

PRs pequenos para `stable`, cada um conferido no harness estático (`PREVIEW=1`) contra o protótipo.

1. Docs: este diagnóstico, a matriz e o mapa.
2. Pronto: link visível com Copiar, QR inline, texto de WhatsApp, checklist de prontidão.
3. Wizard: prévia com abas Convidado/Telão/Álbum e slug ao vivo.
4. Wizard Detalhes/Participação: momentos sugeridos do pack; toggles de participação já suportados pelo backend.
5. Identidade: segunda cor, nomes de cor, contraste visível, enquadramento da capa, com guarda contra sage/blush.
6. Painel: lacunas do Dia do evento, após comparar em render.
7. Convidado: gate contextual, estados do `resolverSlug`, recompensa da primeira foto, compartilhar; comparar em render.
8. QR e peças: guardrails de QR e "aplicar a todo o kit", sem editor livre.
9. Pós-evento: Reviver, entrega, linha de retenção.

Decisões de escopo: a linha B vence quando diverge, exceto funcionalidades exclusivas da A; evento-pai e perfis a marcar ficam para depois; vídeo e telão de 11 modelos seguem congelados.
