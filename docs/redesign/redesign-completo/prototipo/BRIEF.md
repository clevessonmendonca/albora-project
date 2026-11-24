# Brief comum — módulos do protótipo

Pasta: `docs/redesign/redesign-completo/prototipo/` (raiz do repo: `/Users/clevesson-mendonca/www/albora/worktrees/merganser`).
Servidor estático já no ar: `http://localhost:5180/` (hash router: `#/rota`). Se não responder, avise no relatório; não suba outro.

## Leia antes (nesta ordem, só o necessário)
1. `core.js` (API `A.*`), `ds.css` (classes), `data.js` (dados fictícios compartilhados) — **são a fonte da verdade do sistema**.
2. `../02-diagnostico.md`, `../03-benchmark.md`, `../04-arquitetura.md` (decisões já tomadas).
3. A(s) seção(ões) do inventário da sua superfície em `../inventario/*.md` (IDs de funcionalidade, estados, problemas).
4. `/Users/clevesson-mendonca/www/albora/worktrees/merganser/DESIGN.md` §§ 3–4 (tipografia, componentes) e `CLAUDE.md` (regras não negociáveis) — resumo abaixo.

## Você é dono de UM arquivo `.js` (e do `matriz-<modulo>.md`). NÃO edite `core.js`, `ds.css`, `data.js`, `index.html` nem arquivos de outros módulos.
Precisa de algo do núcleo que não existe? Resolva dentro do seu módulo (estenda `A.data.*` com chaves próprias, injete um `<style>` com prefixo único, ex. `.hc-`) e registre a lacuna no relatório final.

## API (resumo — confirme no código)
- Rotas: `A.route('/h/e/:id/fotos', ctx => html | {title, html, after})`; `ctx.params`, `ctx.q`. Todo link interno é `href="#/..."`. `A.map(grupo, rótulo, href, nota)` registra entradas no mapa/⌘K (registre as telas principais).
- Eventos: delegação por `data-act="nome"` → `A.acts.nome = (el, ev, dataset) => {}`; `data-input`/`data-change` → `A.inputs.nome`; `<form data-submit="nome">` → `A.acts.nome(form)`.
- Re-render após mudar estado: `A.render()` (rotas são funções puras de `A.store`/`A.data`). Persistência: `A.store.get/set/update`. CRUD fictício deve **persistir** (sobreviver a recarregar) e refletir nas outras telas.
- Shells: anfitrião `A.hostShell(ctx,{section,crumbs,title,lead,actions},content)`; convidado `A.guestShell(ctx,{active,body,nav,top})`; fornecedor/console/outros `A.layout(cfg, content)` + `A.pageHead(...)`. Telão: tela cheia própria (use `#root` inteiro, classe `.wall`).
- Overlays: `A.modal/A.sheet`, `A.confirm({title,body,confirm,danger,type})` (Promise), `A.menu(anchor, itens)`, `A.toast(msg,{undo,kind})`, `A.openPalette`, `A.palette.add(itens)`.
- Formulários: `A.field({...})` + `A.validate(form, regras)` + `A.rules.*` (erro inline após tentar enviar, `aria-invalid`, foco no 1º erro). Botão assíncrono: `A.busy(btn, ms, done)`.
- Estados: `A.stateful({ok, empty, error, loading, isEmpty})`, `A.skel`, `A.emptyState`, `A.errorState`. Barra “Protótipo” troca fase (`A.sim().phase`), papel (`role`), estado das listas (`state`), tema. **Toda lista/tabela/feed principal precisa de loading, vazio e erro funcionando** e responder ao papel/fase quando relevante.
- Mídia: `A.img(seed, 'p'|'l'|'s')` (ilustração, não é foto real), `A.qrSvg(texto)` (parece QR, **não escaneia** — diga isso onde for relevante). Ícones: `A.icon(nome)` (`A.iconNames()`). Sem emoji.
- Tempo: `A.when(eventId)`, `A.ago(min)`.

## Regras de produto/design (quebrar = bloqueante)
- Marca: papel/tinta/noite/âmbar/brasa. **Nenhum hex no JS/CSS do módulo** (use variáveis `--fg`, `--bg`, `--ev`, `--line`, `--surface`, `--accent-text`, `--crit-text`, `--positivo`, `--atencao`…). Sem glassmorphism, neon, gradiente roxo, fonte script, verde sage, rosa blush, ícone de coração/aliança/pombinha. Neutros = opacidade (já nas variáveis).
- Estética: filete em vez de caixa; **um** botão primário/accent por tela; títulos em Fraunces (`t-display`/`t-title`), corpo Instrument Sans; muito ar; uma decisão por tela; nada de painel “cheio de cards”. Informação aparece uma vez; o resto vira link.
- Convidado: sem login/senha/e-mail/SMS; escuro; alvos ≥48px; consentimento versionado e datado antes da captura; EXIF/GPS nunca; IA não gera/edita mídia (presets = filtro/LUT de cliente); telão nunca corta foto vertical; reação/lugar/prompt = listas fechadas; interação social abre por gate definido pelo casal.
- Strings de domínio de casamento só em dados do evento fictício, nunca em componentes (use o `tipo` do evento/pack).
- Português do Brasil, linguagem de quem organiza a festa (sem “H1”, “fricção”, “runbook”, “Asaas”, “RLS”…). Toda mensagem de erro diz o que houve e o que fazer.
- Acessibilidade WCAG 2.2 AA: label em todo campo, foco visível e preso em overlays (use `A.modal`), alvos ≥44px, `aria-live` onde algo muda sozinho, nada só por cor, teclado completo.
- **Nenhum botão decorativo.** Todo controle faz algo real no protótipo (navega, abre, muda estado, valida) ou é simulado de forma explícita (toast dizendo o que aconteceria na versão real). O que depende de integração (pagamento, Drive, WhatsApp, câmera nativa, push, e-mail) é simulado e **rotulado**.
- Ação reversível ⇒ aplica + toast “Desfazer”; irreversível ⇒ `A.confirm` com a consequência escrita. Salvar: autosave com toast **ou** botão, nunca os dois na mesma tela.

## Entregáveis do seu módulo
1. O `.js` completo (todas as rotas da sua escopo, estados, CRUD fictício persistente).
2. `matriz-<modulo>.md`: tabela **uma linha por funcionalidade/ID do inventário que cabe no seu escopo** (cobertura total, inclusive as consolidadas/removidas): `ID/funcionalidade | tela atual (rota) | nova tela (rota do protótipo) | implementação (Funcional / Simulado / Depende de integração) | nota de decisão (obrigatória se foi consolidada, movida ou mudou de fluxo)`. Ao fim, seção “Lacunas e limitações” com o que NÃO ficou implementado (seja franco).
3. Validação antes de entregar: `node --check seu.js`; abrir cada rota no navegador (crie **sua própria aba** com `tabs_create`; não use a aba de outros), sem erros no console, testar o fluxo principal, a largura mobile (375) e desktop (1280), os 3 estados (carregando/vazio/erro) e o teclado básico. Corrija o que quebrar.
4. Relatório final (≤12 linhas): rotas entregues, o que é funcional/simulado, lacunas, defeitos conhecidos, pedidos de mudança no núcleo.
