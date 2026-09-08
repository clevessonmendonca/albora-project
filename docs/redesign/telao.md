# Álbora — Refatoração do Telão (guia de implementação)

> **Para o agente/dev que vai implementar.** Traduz o redesign do **Telão + conexão + pareamento** (protótipo em `prototipos/telao.html`) para o código atual. Fluxo **fechado e aprovado**. Companion do [`REFATORACAO.md`](./REFATORACAO.md) (onboarding + convidado) — leia os §0, §1 e §6 de lá; valem aqui igual.

## 0. Como usar

- `prototipos/telao.html` é **referência visual e de interação**, não código pra copiar. Estado fake em JS, fotos IA como data-URI. **Não porte o JS.**
- **Reaproveite a mecânica que já existe** (SSE, pareamento, rotação, modelos, resolvedor de tokens). O redesign é de **UX/UI e arquitetura de telas**.
- Fonte de design: [`design-system-v3.md`](./design-system-v3.md). Zero hex em componente, zero string de domínio no core.
- Tela por tela, MR pequena, com teste.

## 1. A virada de conceito (o que mudou e por quê)

O modelo antigo era **"parear um wall display"**: a TV pede código, alguém autoriza, pronto. O redesign parte de outra pergunta:

> **"Estou numa festa, tenho uma TV aqui, quero colocar as fotos nela em menos de 1 minuto. Como faço?"**

Três consequências que o código precisa absorver:

1. **A entrada é por intenção, não por método.** O anfitrião escolhe "Mostrar na TV" e o produto oferece o **caminho mais fácil disponível**, com *fallback* garantido. Ordem de preferência (progressive enhancement):
   - **TV detectada por perto** (Cast/AirPlay concept) → 1 toque *(enhancement; degrada se não houver detecção)*
   - **QR na tela da TV** → caminho **principal** (endereço curto `albora.app/tv`)
   - **Código curto** → *fallback* do QR
   - **Notebook por HDMI** → opção **universal** (qualquer TV, inclusive antiga)
   - **Ajuda por sintoma** ("tem Netflix?", "tem Chromecast?") → nunca termo técnico
2. **O celular vira controle remoto** depois de conectar. Não se volta até a TV pra nada.
3. **A TV nunca mostra erro técnico.** Queda de rede → cache + "Já voltamos ✨ reconectando". O salão não vê stack trace.

**Simplificação dos modelos:** os 11 enquadramentos crus deixam de ser expostos. Viram **5 intenções**: **Automático** (padrão), **Editorial**, **Festa**, **Galeria**, **Destaques**. Os 11 modelos continuam existindo no core como *layouts internos*; cada intenção é um subconjunto + ritmo. Ritmo/nomes/legendas/contador ficam no **avançado**, fora do caminho principal.

## 2. Não-negociáveis específicos do Telão (CLAUDE.md)

- **O telão nunca corta na vertical.** 3 de 4 fotos de festa são verticais. `contain` + fundo desfocado é o padrão; só o modelo **Cheio** usa `cover` e **só aceita horizontais**. Nenhuma intenção pode ficar sem ao menos um layout que aceite foto em pé.
- **Isolamento por evento**: a TV (`/wall-display`) **não pertence a nenhum evento até parear**. O evento vem da **sessão de quem autoriza pelo celular** — a TV nunca escolhe o evento. `SET LOCAL app.event_id`, RLS forçado, chaves de storage derivadas no servidor.
- **Degrada, nunca falha**: SSE cai → poll; poll cai → cache. Nunca tela de erro no salão.
- **Plano**: telão é feature do plano **Completo** (`podeUsarTelao`). O *gate* aparece no painel do anfitrião, **nunca** na TV.
- **Um resolvedor de tokens, N renderizadores**: o palco ao vivo consome o **mesmo** resolvedor de identidade que web e PDF de impressão.

## 3. Código atual (ponto de partida)

> Confirme os caminhos antes de editar (`git grep`); a árvore pode ter andado.

- **TV / display**: `apps/web/app/wall-display/page.tsx` (WallClient). Estados de conexão, rotação, palco.
- **Pareamento (celular)**: `apps/web/app/wall-pair/page.tsx` (WallPairClient) — entrada de código.
- **APIs**: `apps/web/app/api/wall/route.ts`, `/api/wall/pair`, `/api/wall/pair/status`, `/api/wall/authorize`, `/api/wall/panic`, `/api/wall/stream`.
- **Ao vivo**: SSE em `/api/wall/stream` (TICK ~2000ms) + **poll de fallback**. Rotação `ROTACAO_MS=8000` (`features/wall/lib/types.ts`).
- **Modelos**: `packages/core/src/wall-display.ts`. `DEFAULT_WALL_MODELS = ["polaroide","mural","colagem","dump"]`.
- **Controles do anfitrião**: `features/wall/.../event-controls.tsx` + `identity-editor.tsx` (`telaoModelos`). *Gate* de plano `podeUsarTelao`.
- **Persistência**: tabelas `wall_pairings`, `wall_tokens`; cookies `albora_pareamento`, `albora_parede`.
- **Não confundir**: `/app/parear` + `/e/[slug]/pair` são o pareamento do **app nativo (4 dígitos)**, coisa separada — não é o telão.

## 4. Alvo por superfície

### 4.1 Anfitrião (celular / painel) — "Colocar na TV"
- Card de entrada: **"Mostre as fotos ao vivo na TV"** → CTA **"Conectar uma TV"** + secundário **"Testar antes da festa"**.
- Se já conectado: **"🟢 Salão principal · Ao vivo"** → **"Controlar"** + "+ Conectar outra tela".
- **Seletor de método** ("Qual a forma mais fácil agora?"):
  - TV detectada (quando houver) → 1 toque.
  - **Abrir na Smart TV** → passos: TV abre `albora.app/tv`, aparece QR grande, aponta o celular, confirma o evento.
  - **Notebook por HDMI** → passos (HDMI → `albora.app/tv` → escaneia QR → tela cheia/F11).
  - **Não sei qual é minha TV** → ajuda por sintoma.
  - **Enviar link do telão** (`navigator.share`) → DJ/cerimonialista conecta.
- **Controle remoto** (pós-conexão): Pausar/Retomar · Mostrar QR · Fixar foto · Trocar visual · Lançar missão · Tela cheia · Desligar telão. Header com "Ao vivo" + nome da tela + contagem.
- **Trocar visual** = 5 intenções (radios), não 11 checkboxes. Avançado (opcional) = ritmo/nomes/legenda/contador.
- **Testar antes**: conecta do jeito que vai usar no dia + checklist (TV conectou / fotos carregaram / tela cheia / internet estável) → "Seu telão está pronto pra festa."

### 4.2 TV (`albora.app/tv` → `/wall-display`)
Máquina de estados, tudo legível a 3–5 m, tela cheia real (esconde cursor/navegador):
- **Conectar**: `albora.app/tv` + **QR grande** (principal) + **código curto** (fallback) + 3 passos.
- **Confirmando**: "✓ Ana & João conectados · Preparando o telão…"
- **Aguardando fotos**: tela bonita (nome + data + "A história começa por aqui") + QR pequeno "Seja o primeiro a enviar uma foto".
- **Ao vivo**: rodízio por intenção, sem corte vertical, nome do evento + contador.
- **Modo QR** (acionado pelo controle): QR grande "Mostre a festa pelos seus olhos · sem app, sem cadastro" — loop de participação.
- **Pausado**: "Telão pausado".
- **Reconectando**: mantém o último conteúdo + overlay discreto "Já voltamos ✨ — reconectando". **Nunca** erro técnico.

## 5. Copy (pt-BR)
- Entrada: "Mostre as fotos ao vivo na TV" · "Conectar uma TV" · "Testar antes da festa".
- Método: "Qual a forma mais fácil agora?" · "Abrir na Smart TV" · "Notebook por HDMI — o jeito mais garantido" · "Não sei qual é minha TV".
- TV conectar: "Conecte esta TV à festa" · "Aponte o celular pro QR" · "ou digite o código".
- TV confirmando: "Ana & João conectados" · "Preparando o telão…".
- TV aguardando: "A história começa por aqui" · "Seja o primeiro a enviar uma foto".
- Modo QR: "Mostre a festa pelos seus olhos" · "Aponte a câmera e envie sua foto · sem app, sem cadastro".
- Reconexão: "Já voltamos ✨" · "Reconectando às fotos da festa. O telão continua mostrando o que já recebeu."
- Erro de código no celular: "Não encontramos essa TV. Confira o código na tela e tente de novo."
- Plano: "O telão entra no plano Completo." (só no painel).

## 6. Estados de borda (todos precisam existir)
Código expirado/trocado, evento não começou, evento encerrado, TV pareada mas sem fotos ainda, **SSE cai → poll → cache** (reconectando), rede totalmente fora (segue no cache), foto em processamento, só fotos verticais (nenhum corte), intenção sem layout vertical (bloquear no controle), plano sem telão (gate no painel), múltiplas TVs (nomear cada tela), pausado, tela cheia negada pelo navegador, QR ilegível/impresso pequeno.

## 7. Cenários de teste (do protótipo — devem funcionar no código)
- **A** — Smart TV detectada (1 toque).
- **B** — TV abre o navegador, QR grande.
- **C** — Código curto (fallback do QR).
- **D** — TV comum: notebook + HDMI.
- **E** — Durante a festa: celular controla (pausar / mostrar QR / fixar / trocar visual).
- **F** — Falha: internet cai, TV continua com cache, overlay de reconexão, zero erro técnico.

## 8. Ordem de implementação sugerida
1. TV: máquina de estados (conectar → confirmando → aguardando → ao vivo → pausado → reconectando) sobre o SSE/poll/cache atual.
2. TV: palco por **intenção** (mapear as 5 intenções → layouts do core; garantir no-crop).
3. Anfitrião: entrada "Colocar na TV" + seletor de método + QR/código.
4. Anfitrião: **controle remoto** (pausar/QR/fixar/trocar visual/tela cheia).
5. TV: **modo QR** (participação) + estado **aguardando** bonito.
6. Resiliência: reconexão com cache, nunca erro na TV (cenário F).
7. Testar antes + enviar link pro DJ.
8. Avançado (ritmo/nomes/legenda/contador) atrás do caminho principal.
9. Estados de borda (varredura).

## 9. Definition of Done (por tela)
[ ] tokens (zero hex) · [ ] copy do pack (zero domínio hardcoded) · [ ] legível a 3–5 m (tamanhos de TV) · [ ] no-crop vertical garantido · [ ] estados (conectar/confirmando/aguardando/ao vivo/pausado/reconectando) · [ ] resiliência SSE→poll→cache sem erro na TV · [ ] evento vem da sessão de quem autoriza (isolamento) · [ ] a11y AA no controle do celular (foco, teclado, alvos ≥44px) · [ ] não quebra os não-negociáveis (§2) · [ ] teste (unit + e2e do pareamento e da reconexão) · [ ] guards de CI verdes.

## 10. Gates (CLAUDE.md)
Guards de isolamento e de tokens **bloqueantes desde o 1º commit**. Migrations forward-only. Nunca commitar segredo. Nada de rebaixar gate pra CI verde.

---

### Anexos
- `design-system-v3.md` — tokens, cor (2 camadas + engine), motion.
- `prototipos/telao.html` — Telão + conexão + pareamento (cenários A–F no topo).
- `REFATORACAO.md` — onboarding + convidado (não-negociáveis §1, DoD §5, gates §6).
