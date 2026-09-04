# Redesign Premium — UI/UX Albora

**Data:** 2026-09-04
**Status:** Spec aprovado para planejamento
**Escopo:** Todas as superfícies de produção (convidado PWA, admin, telão, landing), tela por tela.

---

## 1. Problema

O dono não está satisfeito com o resultado visual atual. O produto funciona, o sistema de tokens é sólido, mas o acabamento não é **premium**. As telas parecem desenvolvidas, não desenhadas. Falta hierarquia visual resolvida, movimento com propósito, densidade calibrada e a sensação de coisa cara e coerente.

Não é um ajuste de cores. É uma revisão de **experiência** — tela por tela, fluxo por fluxo — sem se prender ao que existe hoje. Onde uma tela precisa de redesign, redesenha.

## 2. Direção aprovada (decisões do dono)

Três decisões tomadas no brainstorm de 2026-09-04:

1. **Direção visual: Híbrido.** Mantém o núcleo da marca Albora (Fraunces, âmbar, papel/noite) e aplica o **ofício** da Apple por cima. Onde a marca atual limita o resultado premium, moderniza tipografia/paleta **caso a caso, tela por tela** — não um deslocamento total de identidade.

2. **Efeitos: Movimento e profundidade, sem vidro.** Efeitos = scroll reveals, parallax sutil, transições com física, sombra quente, microinterações. Glassmorphism/blur translúcido **continua proibido** (compete com a foto, é anti-padrão de marca). Profundidade vem de elevação e sombra quente.

3. **Sequência: Tudo em paralelo, tela por tela.** Todas as superfícies entram no mesmo esforço, organizadas em ondas por camada de propagação.

## 3. O que NÃO muda (restrições inegociáveis)

Estas vêm do CLAUDE.md e do PRODUCT.md e permanecem verdadeiras durante todo o redesign:

- **Nenhum hex hardcodado em componente.** Toda cor sai de token semântico (`SemanticScale`). O redesign trabalha DENTRO do resolvedor `marca → vendor → pack → evento`, nunca o contorna.
- **Cinco cores-base, resto derivado.** Neutros são opacidade sobre papel/noite. Não se adiciona cor à paleta; deriva-se.
- **Um resolvedor, N renderizadores** (ADR 0003). Web, telão e PDF de impressão consomem o mesmo resolvedor. Mudança de token propaga aos três.
- **Anti-padrões bloqueantes:** glassmorphism, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone de aliança/pombinha/coração.
- **Convidado: dark por física** (pupila às 22h), fricção zero até a primeira foto, sem login, uma mão, alvo de toque grande, contraste WCAG AA.
- **A foto é a interface** no fluxo do convidado. A chrome recua onde a foto domina.
- **Telão nunca corta na vertical.** Os 11 modelos de enquadramento permanecem.
- **Nenhuma string de domínio em componente** (`noiva`, `casamento` etc.). Tudo via pack.
- **IA generativa nunca toca a mídia do convidado.** LUT no cliente para coerência.
- **Caminho crítico de upload** (presign → R2 → confirm) não ganha terceiro sistema. Efeitos visuais nunca entram no caminho crítico de bytes.
- **WCAG 2.1 AA** como requisito formal. `prefers-reduced-motion` respeitado em todo movimento novo.

## 4. Sistema de design evoluído — "Albora Premium"

A tese: **a marca dá o calor, a Apple dá a disciplina.** A contribuição da Apple não é o material dela (SF, vidro, frio) — é a *contenção*: uma ação primária por tela, espaço negativo generoso, hierarquia tipográfica calma, movimento com física real, profundidade por camada.

### 4.1 Ritmo de espaçamento

Hoje `espaco: 0.25rem` é uma unidade-base solta. Estabelecer uma **escala de ritmo disciplinada** (base 4pt) consumível como token, para dar respiração consistente e generosa como as páginas de produto da Apple:

- Escala: `space-1` (4px) … `space-2` (8), `space-3` (12), `space-4` (16), `space-6` (24), `space-8` (32), `space-12` (48), `space-16` (64), `space-24` (96), `space-32` (128).
- **Baixa densidade por padrão.** Seções respiram. Gaps entre grupos são generosos.
- Layout faz o espaçamento (flex/grid + `gap`), nunca margens por-elemento que colapsam.

### 4.2 Escala tipográfica

Refinar para uma **escala modular** com passos claros e nomeados (consumíveis como tokens/classes):

| Papel | Uso | Fonte | Peso | Tracking |
|---|---|---|---|---|
| `display` | Hero, momento emocional | Fraunces | baixo (300–400) | `-0.02em` |
| `title` | Título de seção/tela | Fraunces | 400–500 | `-0.015em` |
| `subtitle` | Subtítulo, destaque | Fraunces ou corpo | 500 | `-0.01em` |
| `body` | Texto corrido | corpo | 400 | `0` |
| `caption` | Legenda, meta | corpo | 400 | `0` |
| `label` | Rótulo, botão, chip | corpo | 500 | `0.05em` (abre) |

Regra de marca preservada: **delicadeza vem de peso baixo em tamanho grande** — Fraunces nunca bold-pesado no display. Linha de texto corrido perto de 65 caracteres.

**Movimento híbrido (onde a marca limita):** avaliar optical sizing da Fraunces por tamanho e um ritmo de entrelinha mais editorial. A troca só acontece se elevar; a Fraunces continua a display face.

### 4.3 Sistema de movimento

Hoje: uma curva (`cubic-bezier(0.2,0,0,1)`), 3 durações, usada em só 2 lugares (telão + 1º upload). O brief pede movimento com propósito. **Expandir mantendo a coerência** — a curva única continua a base, com variantes de mola para interação:

- **Scroll-reveal (landing):** entradas escalonadas de seção conforme rola. Editorial, não chamativo.
- **Transições de elemento compartilhado (convidado):** foto → detalhe, card → tela cheia. Continuidade espacial.
- **Física de mola em interação:** sheets, botões, toggles, arco de upload. Feedback tátil.
- **Microinterações de mudança de estado:** curtir, missão completa, foto amanhecendo (varredura âmbar do 1º upload — momento emocional preservado).
- **Ambiente (telão):** cross-fade entre modelos, parallax sutil, contador de participação animado. Cinematográfico, lê de longe.

Todo movimento novo respeita `prefers-reduced-motion` (kill-switch já existe em `base.css`). Nada de movimento no caminho crítico de bytes.

### 4.4 Profundidade e elevação

Profundidade lê por **camadas de sombra quente + degraus de superfície**, nunca por vidro/blur. Hierarquia de elevação clara e nomeada:

- `elev-0` base (página)
- `elev-1` card levantado (`shadow-suave` + `superficie`)
- `elev-2` sheet flutuante (`shadow-alta` + `superficie-alta`)
- `elev-3` modal/dialog (scrim quente atrás, não vidro)

A cor da sombra sai de `--ink` (já é o mecanismo atual), então lê certo no escuro e no claro do evento.

### 4.5 Primitivos elevados a padrão premium

Upgrade dos primitivos compartilhados (`packages/ui-web`) — propaga a todas as superfícies por construção:

- **Botões:** hierarquia clara (primário âmbar preenchido, secundário contorno, terciário texto), feedback de mola no press, alvos de toque ≥44px, estados de foco visíveis.
- **Cards:** raio consistente, elevação quente, estados hover/press.
- **Sheets/dialogs:** entrada com física, arrastar-para-fechar, scrim quente (não vidro).
- **Inputs/forms:** alvos maiores, foco claro (acessibilidade), estados de erro com brasa.
- **TabBar/nav:** estados ativos refinados, indicador com movimento suave.
- **Empty states:** intencionais, quentes, guiando — nunca tela branca triste.

## 5. Direção por superfície

### 5.1 Convidado PWA (dark, foto-primeiro) — Onda 1

A foto domina; a chrome recua. Uma mão, luz baixa, alvo grande, contraste alto.

- **Entrada (QR → nome → consentimento):** fricção zero, calorosa, uma coluna, uma ação. O consentimento não é jurídico frio — é claro e humano.
- **Cover/Home:** o herói do evento respira. Identidade do casal assume. Atalhos claros.
- **Câmera/Editor:** a foto é tudo. Controles (LUT, texto, música) recuam até serem chamados. Editor tátil.
- **Confirmação do 1º upload:** o pico emocional. "A foto amanhece" — varredura âmbar. Momento, não toast.
- **Feed/Álbum/Missões/Minhas fotos/Música/Perfil:** hierarquia resolvida, transições de elemento compartilhado, densidade calibrada, estados vazios guiando.

### 5.2 Admin dos noivos (light, informação-densa) — Onda 2

A clareza das páginas de produto da Apple aplicada a um dashboard. Resumo antes de detalhe, agrupamento escaneável, whitespace generoso.

- **Lista de eventos / criar evento (wizard):** onboarding calmo, um passo por vez, progresso claro.
- **Home do evento / controles:** resumo ao vivo primeiro; controles de gate/moderação agrupados e legíveis.
- **Editor de identidade:** preview ao vivo lado a lado; o casal vê a marca deles assumir.
- **Insights/Guests (funnel):** dado exibido com o mesmo cuidado que tipografia — sparklines, hierarquia, sem tabela crua.
- **Moderação/Álbum/Missões/Guestbook/Consentimento/Pieces/QR:** consistência de shell, ação primária clara por tela.
- **Desktop-first refinement:** existe um set `admin-desktop` no catálogo ainda não conectado — sinaliza que o admin desktop entra no escopo.

### 5.3 Telão (dark, fullscreen, ambiente) — Onda 3

Cinematográfico. Lê do outro lado do salão. Os 11 modelos sem-corte ganham polimento de movimento — cross-fades suaves, parallax de ambiente, contador de participação animado.

### 5.4 Landing (light, persuadir) — Onda 3

Onde "site moderno com efeitos, minimalista" mais vive. Storytelling guiado por scroll ao estilo Apple, tipografia editorial grande, seções generosas, movimento real. Vende o produto. Pack-swap (casamento / 15 anos) preservado.

## 6. Estratégia de implementação — ondas

A arquitetura dita a ordem. Fundação primeiro (propaga a tudo), depois superfície por superfície, tela por tela.

**Onda 0 — Fundação e primitivos.** Evolui tokens onde o híbrido pede (ritmo de espaçamento, escala tipográfica, sistema de movimento, hierarquia de elevação). Eleva os primitivos `ui-web`. Sozinha, isto já levanta o produto inteiro. É a maior alavanca.

**Onda 1 — Convidado PWA (H1-crítico).** Tela por tela: entrada, cover/home, câmera/editor, confirmação, feed, álbum, missões, minhas-fotos, música, perfil.

**Onda 2 — Admin.** Tela por tela: lista/wizard, home do evento, identidade, insights/guests, moderação, álbum, missões, guestbook, consentimento, pieces/QR, billing, vendor.

**Onda 3 — Telão + Landing.** Modelos do telão + polimento de movimento; seções da landing + scroll storytelling.

### Método por tela (todas as ondas)

Cada tela redesenhada segue o mesmo ciclo:
1. Renderizar o estado atual (dev server / `/telas` / `/telas-admin`) — ver antes de mudar.
2. Aplicar o sistema Albora Premium: hierarquia, espaço, movimento, profundidade, primitivos.
3. Verificar no browser (desktop + mobile), acessibilidade (contraste, teclado, reduced-motion), sem regressão.
4. Provar com screenshot antes/depois.

### Decomposição inteligente (regra de tamanho de tarefa)

Nenhuma tela fica de fora, e a onda decompõe por inteligência — **não** por regra fixa de "1 tela = 1 tarefa":

- **Tela pesada vira várias tarefas/steps.** Câmera/editor não é uma tarefa: vira câmera → editor (por aba: LUT, texto, música) → confirmação. Feed vira lista → interações (curtir/reagir) → comment sheet → viewer. Identity editor do admin vira editor de token → preview ao vivo → upload de capa. O wizard de criar evento vira um passo por tarefa quando cada passo carrega seu próprio julgamento.
- **Tela/estado faltando, cria-se.** Se um fluxo pede estado que não existe — empty state, erro, loading, timeout, offline, permissão negada, passo de onboarding/ativação — vira tarefa nova; não fica buraco.
- **Critério de corte:** separa em tarefas/steps distintos sempre que um reviewer pudesse aprovar uma parte e reprovar a outra. Cada tarefa termina num entregável testável e verificável isolado.
- **Tela simples fica uma tarefa só** (YAGNI — não inflar).
- Cada plano de onda **enumera explicitamente cada tela** como tarefa nomeada antes do despacho, e quebra as complexas em partes nomeadas. Uma tela sem tarefa é um defeito do plano.

## 7. Verificação e qualidade

- **Guards permanecem bloqueantes:** tokens (nenhum hex), isolamento entre eventos, packs. Rodam em todo commit.
- **`/telas` e `/telas-admin`** são o painel de preview: renderizam todos os estados de tela de uma vez com tokens e componentes reais. Cada onda valida ali.
- **Contraste WCAG AA** verificado nas superfícies escuras (o `escalasDoFundo` já deriva, mas cada tela nova é checada).
- **Sem regressão funcional:** o redesign é visual/interação; a lógica (upload, RLS, sessão) não muda. Suíte de testes verde por onda.
- **`prefers-reduced-motion`** honrado em todo movimento.

## 8. Fora de escopo

- **Ops console** (`/ops/*`): ferramenta interna, utilitária de propósito. Fica como está salvo pedido explícito.
- **Mudança de lógica de negócio:** nenhum comportamento de dados/RLS/sessão muda. Puramente experiência.
- **IA generativa em mídia:** proibido, não entra.
- **Nova paleta de marca:** a paleta de 5 cores permanece; deriva-se, não se adiciona.

## 9. Critério de sucesso

O produto lê como **premium, coerente e bem resolvido** em todas as superfícies:
- Hierarquia visual clara em cada tela; uma ação primária óbvia.
- Espaçamento generoso e consistente; baixa densidade.
- Movimento com propósito e física; nunca gratuito, nunca no caminho crítico.
- Profundidade por elevação quente; zero vidro.
- Marca Albora preservada e fortalecida; identidade do evento propaga em tudo.
- Acessível (WCAG AA), rápido, sem regressão.
