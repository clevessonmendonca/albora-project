# 02 · Diagnóstico de UI/UX

Fonte: os três inventários em `inventario/` (A painel, B convidado/telão/app, C conta/fornecedor/console). Leitura estática do código em 2026-10-24: **nada foi renderizado**; problemas de layout/contraste abaixo são inferidos do código e marcados como tal.

Números: ~27 telas do painel, ~34 do convidado/telão/app, 28 de conta/fornecedor/console. Total ≈ 89 telas/estados, 240+ funcionalidades catalogadas (A: 121 IDs; C: 121 IDs; B: por tela).

## 1. Problemas estruturais (os que o redesign precisa resolver)

| # | Problema | Evidência | Heurística violada | Resposta no redesign |
|---|---|---|---|---|
| D1 | **Cada tela tem três nomes** (item de menu ≠ h1 ≠ headline). | A §1: "Experiência" → `/identity` → h1 "Identidade"; "Ao vivo" → "Dia do evento". | Nielsen 2 (correspondência com o mundo real), 4 (consistência) | Um nome por destino, o mesmo em menu, título e breadcrumb. |
| D2 | **Navegação que some**: Experiência e Compartilhar abrem sem rail; "← Evento" aponta para Ajustes; 8 rotas "detail" sem menu. | A §2.2/2.3 | Nielsen 3 (controle), Lei de Fitts (volta distante) | Shell único e persistente em todas as telas do evento. Nada abre "sem menu". |
| D3 | **Mesmo destino/CTA repetido**: QR/convite em ~10 pontos, 3 versões do funil, mesma `ReviewQueue` em Ao vivo e Fotos. | A resumo | Nielsen 8 (minimalismo), carga cognitiva | Uma fonte por informação; resto vira link. Convite = 1 CTA + atalho no cabeçalho. |
| D4 | **Ajustes empilha 11 cartões de peso igual.** | A | Lei de Hick, hierarquia visual | Ajustes em seções à esquerda (lista) + um painel por vez; progressive disclosure. |
| D5 | **9 destinos de menu** em 3 grupos (Seu evento/Descobrir/Personalização) + "Mais" no mobile. | A §2.1 | Lei de Hick | **5 destinos** + "Mais"; Descobrir e Ajustes saem do eixo principal. |
| D6 | **Ações destrutivas sem confirmação/desfazer** (aprovar/ocultar em lote, ocultar nome, remover comentário/capa); "Salvar" imediato convive com "Salvar" por botão. | A | Nielsen 5 (prevenção de erro), 3 | Padrão único: ação reversível = aplica + toast "Desfazer"; irreversível = diálogo com consequência escrita. Autosave **ou** botão, nunca os dois na mesma tela. |
| D7 | **Bugs de código que viram bugs de UX**: "Ver como convidado" do checklist aponta para a própria Home; âncoras `#controle-interacao`/`#controle-menores` inexistentes; `if (coverImageKey) {}` vazio (capa real nunca aparece em /qrcode); `/admin` lista slug no lugar do título; contagem de moderação nunca lida (sem badge). | A | Nielsen 1 (visibilidade do estado) | Cada um tem destino/estado definido no protótipo (ver matriz, notas "correção"). **Os bugs em si são do produto, não do protótipo**. |
| D8 | **Vocabulário interno vazando** ("H1", "espinha", "fricção", "runbook", "Asaas", CMYK). | A | Nielsen 2 | Glossário de UI (`05-design-system.md` §6): linguagem de quem organiza a festa. |
| D9 | **Data, hora e local não editáveis depois de criar.** | A | Nielsen 3, 9 | Editáveis em Ajustes › Evento, com aviso do que muda (QR não muda). |
| D10 | **Identidade com dois vocabulários** (wizard × editor), prévia em um e não no outro. | A | Nielsen 4 | Um só editor de Estilo, usado no wizard e depois do evento criado, com prévia ao vivo em ambos. |
| D11 | **Console: sem error/loading/not-found, sem tela de permissão negada, link morto (`/console/staff`), badges de pendência que nunca aparecem; busca navega a cada tecla; ordenação só da página; paginação só avança.** | C | Nielsen 1, 9 | Console com estados completos, busca com debounce, ordenação/ paginação reais. |
| D12 | **SSO `?error=google` ignorado**; step-up de reauth só em exclusão de conta; texto cru nas outras ações. | C | Nielsen 9 (mensagens de erro) | Erros de login explicados; reauth como padrão de toda ação perigosa. |
| D13 | **Identificadores crus** (slug, UUID em retenção/LGPD) e **valores comerciais duplicados** (R$ 199 e planos em 3 arquivos, divergentes). | C | Nielsen 2, 4 | Rótulos humanos; preço de uma fonte. (O protótipo usa uma só tabela de planos.) |
| D14 | **Fluxos sem rascunho**: wizard e onboarding de fornecedor (cria registro no passo 1). | C | Nielsen 5 | Rascunho salvo a cada passo; "Continuar de onde parei". |
| D15 | **Câmera web sem viewfinder** (`<input capture>`) e código morto em `features/photo`. | B | Nielsen 7 (eficiência) | A decisão é de produto (a captura nativa é intencional: zero permissão). O protótipo mostra a captura como a experiência real e o editor como etapa opcional. |
| D16 | **Promessas de UI sem garantia** ("Já tá no telão"); Minhas fotos sem excluir conta nem revogar consentimento. | B | Nielsen 1, LGPD | Copy honesta por estado (na fila / enviada / aprovada / no telão); ação de revogar consentimento em Minhas fotos. |
| D17 | **Denúncia/bloqueio inconsistentes** entre feed, álbum e Home; botões mortos na Home. | B | Nielsen 4, 5 | Um único menu "⋯" por foto com Denunciar / Bloquear / Remover (se for minha). |
| D18 | **Overlays `aria-modal` sem gestão de foco**; `/scan` não inicia o scanner. | B | WCAG 2.2 (2.4.3, 4.1.2) | Todo modal/sheet do protótipo prende foco, fecha com Esc, devolve foco. |
| D19 | **Privacidade**: vídeo sem remoção de metadado; `/p/[slug]` indexável com miniaturas; qualquer convidado autoriza qualquer telão; pânico em toggle cego. | B | Regras CLAUDE.md (EXIF/LGPD) | Registrado como **pendência de produto** (não é de UI); no protótipo, o pânico vira botão com confirmação e estado claro. |

## 2. Problemas visuais (inferidos do código — validar com render)

- **Peso uniforme.** Muitos cartões iguais (Ajustes, Home) sem uma peça dominante → o olho não sabe onde começar.
- **CTAs concorrentes.** Convite/QR, Abrir telão, Ver como convidado aparecem lado a lado em várias telas.
- **Rail com `adminVars("dark")` inline** no painel claro: risco de inconsistência de chão entre telas com e sem rail.
- **Duas famílias de variante local no DS**: 6 componentes sem uso; classe `bg-surface` inexistente; ícone de coração no pack casamento (anti-padrão bloqueante de marca).
- **Densidade do convidado**: a própria auditoria de densidade do repo (`AUDITORIA-DENSIDADE-FEED.md`) já apontou feed/álbum carregados.

## 3. O que está bom e se preserva

- Separação das superfícies (convidado escuro, anfitrião claro, telão fullscreen).
- Tokens + camada do evento (identidade do casal só no acento, nunca no chão).
- Linguagem "filete, não caixa" já documentada no DESIGN.md — o redesign a leva mais a sério.
- Modelo de fases (antes/durante/depois) e `CoupleFollowMode` ("Acompanhar").
- Fluxo do convidado: QR → nome+consentimento → foto → confirmação → convite ao app. Inviolável.

## 4. Limitações

- Nenhuma tela foi renderizada nesta análise; `next dev` não roda neste ambiente (nota da memória do projeto). Contraste/espaçamento são hipóteses.
- Inventário B tem 36 pontos "não verificado" (handlers duplicados, `/wall-display` etc.).
- Respostas reais de API e permissões negadas no console não foram verificadas.
