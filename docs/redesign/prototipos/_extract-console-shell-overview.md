
# Extract — Console shell + Visão Geral

Fonte: `docs/redesign/prototipos/console.html` (protótipo estático, single-file, inline `<style>`/`<script>`).
Este documento é extração verbatim (não paráfrase) de duas partes do protótipo: PARTE A (shell/navegação) e PARTE B (tela "Visão Geral").

---

## PARTE A — Shell / Navegação

### A.1 Tokens de design (CSS custom properties)

Há **dois blocos `:root`** no arquivo. O segundo (linha 178, comentado `/* v5 — console operacional luminoso, com hierarquia por composição */`) **sobrescreve** o primeiro (linha 9) — são os valores que efetivamente valem no protótipo renderizado. Documento os dois, na ordem em que aparecem no arquivo (cascade normal: o segundo vence).

#### Bloco 1 — `:root` (linha 9, valores "base", substituídos pelo bloco 2)

```css
:root{
  --bg:#F3F1EC;--surface:#FFFFFF;--surface-2:#EDEAE2;--ink:#1B1815;--ink-2:#615A51;--ink-3:#9A9186;--line:#EBE7DF;--line-2:#DDD7CC;
  --acento:#9E4A22;--acento-soft:#9e4a2216;--critico:#C2410C;--critico-soft:#c2410c14;--warn:#B7791F;--warn-soft:#b7791f14;--ok:#2E6B2E;--ok-soft:#2e6b2e14;--info:#3A5A7A;--info-soft:#3a5a7a14;
  --serif:"Fraunces",Georgia,serif;--sans:"Instrument Sans",system-ui,-apple-system,sans-serif;
  --curva:cubic-bezier(.22,.61,.36,1);--r:13px;--shadow:0 1px 2px rgba(0,0,0,.04),0 1px 3px rgba(0,0,0,.06);--elev:0 1px 2px rgba(28,22,16,.03),0 6px 20px -8px rgba(28,22,16,.11);--elev-2:0 12px 40px -12px rgba(28,22,16,.20);color-scheme:light;
}
```

#### Bloco 2 — `:root` (linha 178, **valores vigentes**, "v5")

```css
:root{
  --bg:#ECEBE7;--surface:#FCFBF9;--surface-2:#F2F0EC;--ink:#171513;--ink-2:#514C46;--ink-3:#6F6962;--line:#E6E2DC;--line-2:#D8D3CB;
  --acento:#D46632;--acento-soft:#D4663216;--critico:#BB3D18;--critico-soft:#BB3D1812;--warn:#A96F18;--warn-soft:#A96F1812;--ok:#28744E;--ok-soft:#28744E12;--info:#3265B5;--info-soft:#3265B512;
  --r:16px;--shadow:0 1px 2px rgba(26,22,19,.04);--elev:0 18px 44px -32px rgba(26,22,19,.28);--elev-2:0 26px 56px -34px rgba(26,22,19,.36);color-scheme:light;
}
```

Note que o bloco 2 **não redeclara** `--serif` e `--sans` — esses ficam com os valores do bloco 1 (`"Fraunces",Georgia,serif` e `"Instrument Sans",system-ui,-apple-system,sans-serif`).

#### Dark mode — `:root[data-theme="dark"]` (linha 183)

```css
:root[data-theme="dark"]{
  --bg:#12100F;--surface:#1B1816;--surface-2:#24201D;--ink:#F3EEE7;--ink-2:#C8BFB6;--ink-3:#A79D93;--line:#342E29;--line-2:#494038;
  --acento:#E28A58;--acento-soft:#E28A581C;--critico:#FF835E;--critico-soft:#FF835E18;--warn:#E2AA58;--warn-soft:#E2AA5818;--ok:#70C99D;--ok-soft:#70C99D18;--info:#91B5E8;--info-soft:#91B5E818;
  --shadow:0 1px 2px rgba(0,0,0,.2);--elev:0 18px 44px -28px rgba(0,0,0,.72);--elev-2:0 26px 56px -28px rgba(0,0,0,.82);color-scheme:dark;
}
```

Regras adicionais amarradas ao dark mode:

```css
:root[data-theme="dark"] .app{box-shadow:0 24px 60px -32px rgba(0,0,0,.88)}
:root[data-theme="dark"] .brand-logo.light{display:none}
:root[data-theme="dark"] .brand-logo.dark{display:block}
:root[data-theme="dark"] .navitem.on{background:var(--acento-soft);color:var(--ink);box-shadow:inset 3px 0 0 var(--acento)}
:root[data-theme="dark"] .navitem.on .ic-svg{color:var(--acento)}
:root[data-theme="dark"] .navitem:hover{background:var(--surface-2)}
:root[data-theme="dark"] .period button.on,:root[data-theme="dark"] .profile-tabs button.on,:root[data-theme="dark"] .theme-choice button.on{background:var(--line);color:var(--ink);border-color:var(--line-2)}
```

**Estado ativo/selecionado, claro vs escuro** (o contraste que importa):
- **Claro**: `.navitem.on{background:var(--ink);color:var(--surface);font-weight:500}` — item ativo vira um "chip" escuro sólido (fundo `--ink` = `#171513`, texto `--surface` = `#FCFBF9`).
- **Escuro**: `.navitem.on{background:var(--acento-soft)}` (override acima) + `box-shadow:inset 3px 0 0 var(--acento)` — no dark o ativo NÃO fica sólido; vira um fundo laranja suave com uma barra de acento à esquerda (o mesmo efeito de "risca lateral" que a v1 tinha por padrão via `.navitem.on::before`, mas em dark o `::before` é `display:none` e a risca vem do `box-shadow: inset`).
- `.navitem .badge` claro: `background:var(--critico)` sólido, `color:var(--surface)`. Não há override específico de badge para dark (herda as variáveis, que já trocam de valor).

### A.2 Estrutura de layout do shell

**Grid raiz** (`.app`), tokens override na v5:
```css
.app{display:grid;grid-template-columns:244px 1fr;min-height:100vh;max-width:1340px;margin:0 auto;background:var(--bg)}
/* v5 override: */
.app{grid-template-columns:232px minmax(0,1fr);max-width:1510px;margin:18px auto;min-height:calc(100vh - 36px);border-radius:24px;overflow:visible;background:transparent;box-shadow:0 24px 48px -36px rgba(26,22,19,.5);transition:grid-template-columns .24s var(--curva)}
```
Ou seja: o app inteiro é um "cartão" flutuante de `232px` (sidebar) + resto, com `border-radius:24px`, margem externa de `18px`, sombra `0 24px 48px -36px rgba(26,22,19,.5)` (mais forte em dark: `0 24px 60px -32px rgba(0,0,0,.88)`).

**Sidebar** (`.side`):
```css
.side{border-right:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
/* v5 override: */
.side{height:calc(100vh - 36px);top:18px;background:var(--surface);border-right:1px solid var(--line);border-radius:24px 0 0 24px}
```
- Largura: `232px` (definida pela coluna do grid `.app`), `76px` quando colapsada (`data-sidebar="collapsed"`).
- `.side .brand`: `padding:1.28rem 1.05rem 1rem;min-height:66px`, contém dois `<img class="brand-logo light/dark">` (troca por tema, largura `112px`) + `<span class="env">Console</span>`.
- Grupos (`.navgroup`): rótulo (`.gl`) em serifada pequena, `font:400 11px var(--serif);letter-spacing:.16em`, texto **verbatim**: `"Negócio"`, `"Operação"`, `"Governança"`.
- Item de nav (`.navitem`): `border-radius:10px;padding:.58rem .65rem;font-size:12.5px`; ícone `.ic-svg` 16px; badge `.badge` = pílula `background:var(--critico)` (v5) com contagem.
- Rodapé da sidebar: `.profile-wrap` com o botão `.me` (avatar + nome + chevron) e o `.profile-menu` (ver A.6).

**Topbar** (`.topbar`):
```css
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:.7rem;padding:.65rem 1.3rem;background:color-mix(in srgb,var(--surface) 82%,transparent);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line)}
/* v5 override: */
.topbar{padding:.8rem 1.6rem;background:var(--surface);backdrop-filter:none;-webkit-backdrop-filter:none}
```
Ou seja: a v5 **remove o blur/glassmorphism** da v1 (fundo translúcido com backdrop-filter) e usa fundo sólido opaco — consistente com o anti-padrão explícito de glassmorphism do produto.
Conteúdo real da topbar (o que existe de fato, em ordem): botão hambúrguer mobile (`.tbtn.menu`, só `<820px`) → logo mobile (`.brand-m`, só mobile) → botão de colapsar sidebar (`.side-toggle`) → **busca/command trigger** (`button.search`) → **seletor de período** (`.period`: Hoje / 7 dias / 30 dias) → toggle de tema (`.theme-toggle`) → botão de ajuda (`.help-btn`). **Não há breadcrumb** e **não há profile menu na topbar** — o menu de perfil vive no rodapé da sidebar (`.me` / `.profile-menu`), não na topbar.

**Canvas principal / "floating panels"**:
```css
.main{background:var(--surface);border-radius:0 24px 24px 0;overflow:clip}
.content{padding:2.1rem clamp(1.2rem,3vw,2.8rem) 3.5rem;max-width:1280px;width:100%;margin:0 auto}
```
Painéis dentro do conteúdo (cards, kpis, attention rows, live events, tabelas) usam a regra unificada v5:
```css
.card,.kpi,.arow,.levent,.seccard,.syscard,.tblwrap{box-shadow:none;border:1px solid var(--line);background:var(--surface)}
.card{border-radius:var(--r);padding:1.25rem 1.35rem}
.attention-panel,.pulse-panel,.metric-strip,.analytics-panel,.plan-panel,.live-panel{border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
```
Ou seja: na v5, os painéis abandonam a sombra suave (`--elev`) da v1 (`box-shadow:var(--elev)` sem borda) e passam a usar **borda de 1px `var(--line`) + fundo `var(--surface`) sem sombra** — tratamento mais "flat"/editorial que o v1 original (que era cartão com `box-shadow:var(--elev)` e sem borda). `--r` (radius) é `16px` na v5 (era `13px` na v1).

### A.3 Itens de navegação (verbatim, agrupados)

```html
<div class="navgroup"><div class="gl">Negócio</div>
  <button class="navitem" data-s="overview" title="Visão geral"><span class="ic-svg ic-home"></span><span class="nav-label">Visão geral</span></button>
  <button class="navitem" data-s="contas" title="Contas"><span class="ic-svg ic-users"></span><span class="nav-label">Contas</span></button>
  <button class="navitem" data-s="eventos" title="Eventos"><span class="ic-svg ic-cal"></span><span class="nav-label">Eventos</span></button>
  <button class="navitem" data-s="assinaturas" title="Assinaturas"><span class="ic-svg ic-card"></span><span class="nav-label">Assinaturas</span><span class="badge">1</span></button>
</div>
<div class="navgroup"><div class="gl">Operação</div>
  <button class="navitem" data-s="suporte" title="Suporte"><span class="ic-svg ic-life"></span><span class="nav-label">Suporte</span><span class="badge">2</span></button>
  <button class="navitem" data-s="lgpd" title="LGPD"><span class="ic-svg ic-shield"></span><span class="nav-label">LGPD</span><span class="badge">1</span></button>
  <button class="navitem" data-s="retencao" title="Retenção"><span class="ic-svg ic-clock"></span><span class="nav-label">Retenção</span><span class="badge">3</span></button>
</div>
<div class="navgroup"><div class="gl">Governança</div>
  <button class="navitem" data-s="auditoria" title="Auditoria"><span class="ic-svg ic-list"></span><span class="nav-label">Auditoria</span></button>
  <button class="navitem" data-s="seguranca" title="Segurança"><span class="ic-svg ic-lock"></span><span class="nav-label">Segurança</span><span class="badge">1</span></button>
  <button class="navitem" data-s="equipe" title="Equipe"><span class="ic-svg ic-team"></span><span class="nav-label">Equipe</span></button>
  <button class="navitem" data-s="sistema" title="Sistema"><span class="ic-svg ic-server"></span><span class="nav-label">Sistema</span><span class="badge">1</span></button>
</div>
```

Rótulos de grupo, verbatim: `"Negócio"`, `"Operação"`, `"Governança"`.
Itens (label / rota `data-s` / badge): "Visão geral" (`overview`, sem badge), "Contas" (`contas`), "Eventos" (`eventos`), "Assinaturas" (`assinaturas`, badge `1`), "Suporte" (`suporte`, badge `2`), "LGPD" (`lgpd`, badge `1`), "Retenção" (`retencao`, badge `3`), "Auditoria" (`auditoria`), "Segurança" (`seguranca`, badge `1`), "Equipe" (`equipe`), "Sistema" (`sistema`, badge `1`).

### A.4 Sidebar colapsável + responsivo/off-canvas

**Colapso via `data-sidebar="collapsed"` no `<html>`** (não é classe no `.side`, é atributo no `:root`):
```css
:root[data-sidebar="collapsed"] .app{grid-template-columns:76px minmax(0,1fr)}
:root[data-sidebar="collapsed"] .side .brand{justify-content:center;padding-inline:.8rem}
:root[data-sidebar="collapsed"] .brand-logo{display:none!important}
:root[data-sidebar="collapsed"] .side .brand::before{content:"";display:block;width:36px;height:36px;background:url('../../../brand/estaticas/marca-estrela-degrade.svg') center/contain no-repeat}
:root[data-sidebar="collapsed"] .side .brand .env,:root[data-sidebar="collapsed"] .navgroup .gl,:root[data-sidebar="collapsed"] .nav-label,:root[data-sidebar="collapsed"] .profile-copy,:root[data-sidebar="collapsed"] .profile-chevron{display:none}
:root[data-sidebar="collapsed"] .navgroup{padding-inline:.65rem}:root[data-sidebar="collapsed"] .navitem{justify-content:center;padding:.65rem;gap:0}:root[data-sidebar="collapsed"] .navitem .ic-svg{width:18px;height:18px}
:root[data-sidebar="collapsed"] .navitem .badge{position:absolute;right:5px;top:4px;min-width:7px;width:7px;height:7px;padding:0;font-size:0;border:1.5px solid var(--surface)}
:root[data-sidebar="collapsed"] .side .me{justify-content:center;padding:1rem .6rem}:root[data-sidebar="collapsed"] .profile-menu{left:calc(100% + .5rem);right:auto;bottom:.5rem;width:190px}
:root[data-sidebar="collapsed"] .side-toggle .ic-svg{transform:rotate(180deg)}
```
Colapsado: sidebar vira `76px`, logo vira ícone da marca (`marca-estrela-degrade.svg`), labels somem, badge vira um pontinho de 7×7px no canto, e o menu de perfil "flutua" para fora da sidebar (`left:calc(100% + .5rem)`).

**Breakpoints responsivos exatos** (media queries encontradas no arquivo):
- `max-width:1040px` — grids de 2 colunas (`.overview-grid`, `.analysis-grid`) colapsam para 1 coluna; `.live` vira 2 colunas.
- `max-width:820px` — **off-canvas**: sidebar sai do grid e vira posição fixa fora da tela.
  ```css
  @media(max-width:820px){
   .app{grid-template-columns:1fr}
   .app>.side{position:fixed;left:0;top:0;height:100dvh;width:262px;z-index:60;transform:translateX(-100%);transition:transform .25s var(--curva);box-shadow:0 0 50px rgba(0,0,0,.25)}
   .app>.side.open{transform:none}
   .tbtn.menu{display:grid}.brand-m{display:flex}.topbar .search{max-width:none}
  }
  ```
  Nesse breakpoint o app também perde o "cartão flutuante" (margem/radius/sombra) e vira full-bleed: `body{background:var(--surface)}.app{margin:0;min-height:100vh;border-radius:0;display:block}.app>.side{height:100dvh;top:0;border-radius:0}.main{border-radius:0;overflow:visible}`. `.side-toggle` (botão de colapsar) some (`display:none`) — nesse breakpoint só existe o toggle off-canvas (`navToggle`), não o colapso desktop.
- `max-width:720px` — `.hgrid` (usado em outras telas) vira 1 coluna.
- `max-width:620px` — ajustes finos de topbar/kpis/live/profile para mobile pequeno (ver linha 284 no arquivo).
- `max-width:560px` — busca da topbar vira só ícone (36px, sem texto/kbd); `.content` reduz padding.

**Abrir/fechar off-canvas** (JS, apenas o essencial de toggling, não lógica de render):
```js
function openNav(){el('side').classList.add('open');el('sidescrim').classList.add('on');var btn=el('navToggle');if(btn)btn.setAttribute('aria-expanded','true');setTimeout(function(){var first=el('side').querySelector('.navitem');if(first)first.focus();},0);}
function closeNav(){el('side').classList.remove('open');el('sidescrim').classList.remove('on');var btn=el('navToggle');if(btn)btn.setAttribute('aria-expanded','false');}
```
Scrim de fundo: `<div class="sidescrim" id="sidescrim" onclick="closeNav()"></div>`, `.sidescrim{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:55;opacity:0;pointer-events:none;transition:opacity .2s}.sidescrim.on{opacity:1;pointer-events:auto}`.

**Toggle de colapso desktop** (persistido em `localStorage`):
```js
function setSidebar(collapsed){document.documentElement.dataset.sidebar=collapsed?'collapsed':'expanded';try{localStorage.setItem('albora-console-sidebar',collapsed?'collapsed':'expanded')}catch(e){}var btn=el('sideToggle');if(btn){btn.setAttribute('aria-label',collapsed?'Expandir menu':'Recolher menu');btn.title=collapsed?'Expandir menu':'Recolher menu';}}
function toggleSidebar(){setSidebar(document.documentElement.dataset.sidebar!=='collapsed');closeProfile();}
```

### A.5 Command palette (busca global)

Trigger na topbar:
```html
<button class="search" onclick="openCmd()" aria-label="Abrir busca"><span class="ic-svg ic-search"></span><span class="stxt">Buscar conta, evento, ticket…</span><kbd>/</kbd></button>
```

Markup do palette:
```html
<div class="cmdscrim" id="cmdscrim" onclick="if(event.target===this)closeCmd()"><div class="cmd" role="dialog" aria-modal="true" aria-label="Busca global">
  <div class="ci"><span class="ic-svg ic-search"></span><input id="cmdInput" aria-label="Buscar conta, evento, ticket ou ação" placeholder="Buscar conta, evento, ticket ou ação…" oninput="filterCmd()"><kbd>esc</kbd></div>
  <div class="cl" id="cmdList"></div>
</div></div>
```

CSS:
```css
.cmdscrim{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:85;opacity:0;pointer-events:none;transition:.15s;padding-top:12vh;display:flex;justify-content:center}.cmdscrim.on{opacity:1;pointer-events:auto}
.cmd{background:var(--surface);border:1px solid var(--line);border-radius:14px;width:min(560px,92%);max-height:70vh;box-shadow:0 20px 60px rgba(0,0,0,.3);display:flex;flex-direction:column;transform:translateY(-8px);transition:.15s}.cmdscrim.on .cmd{transform:none}
.cmd .ci{display:flex;align-items:center;gap:.6rem;padding:.9rem 1rem;border-bottom:1px solid var(--line)}.cmd .ci .ic-svg{width:18px;color:var(--ink-3)}.cmd .ci input{flex:1;border:0;background:none;outline:none;font:400 15px var(--sans);color:var(--ink)}.cmd .ci kbd{font:600 10px var(--sans);border:1px solid var(--line-2);border-radius:4px;padding:1px 6px;color:var(--ink-3)}
.cmd .cl{overflow-y:auto}.cmd .cg{font:700 10px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:.6rem 1rem .3rem}
.cmd .cr{display:flex;align-items:center;gap:.7rem;width:100%;border:0;background:none;text-align:left;padding:.7rem 1rem;cursor:pointer;font-size:13.5px}.cmd .cr:hover{background:var(--surface-2)}.cmd .cr .ic-svg{width:16px;color:var(--ink-3)}.cmd .cr .sub{color:var(--ink-3);font-size:11.5px;margin-left:auto}
/* v5 override: */
.cmd{border:0;box-shadow:var(--elev-2)}
```

Keybinding (Cmd+K / Ctrl+K / `/`, e Escape fecha tudo):
```js
document.addEventListener('keydown',function(e){if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName))){e.preventDefault();openCmd();}if(e.key==='Escape'){closeCmd();closeModal();closeDetail();closeNav();closeProfile();}});
```
Nota: `/` só abre a busca se o foco atual **não** estiver em um `INPUT`/`TEXTAREA` (evita interceptar digitação normal).

### A.6 Menu de perfil (Conta / Preferências / Sessões)

O menu de perfil é o `<div class="profile-menu">` ancorado no botão `.me` (rodapé da sidebar) — **não** é um dropdown de topbar.

Markup (sidebar, rodapé):
```html
<div class="profile-wrap">
  <button class="me" id="profileButton" onclick="toggleProfile(event)" aria-expanded="false" aria-controls="profileMenu">
    <span class="av">CE</span><span class="profile-copy"><b>Você</b><br><span>owner · todas as permissões</span></span><span class="ic-svg ic-chev profile-chevron"></span>
  </button>
  <div class="profile-menu" id="profileMenu" role="menu" hidden>
    <button onclick="openProfile('account')"><span class="ic-svg ic-user"></span> Meu perfil</button>
    <button onclick="openProfile('preferences')"><span class="ic-svg ic-settings"></span> Preferências</button>
    <button onclick="logoutConsole()"><span class="ic-svg ic-logout"></span> Sair do console</button>
  </div>
</div>
```
Labels verbatim no menu suspenso: `"Meu perfil"`, `"Preferências"`, `"Sair do console"`. Note que **"Sessões" não é item deste menu** — é a 3ª aba dentro da página de perfil (ver abaixo), rotulada `"Sessões e segurança"`.

A página de perfil (`nav('perfil')`, acionada por `openProfile(section)`) tem 3 abas (`.profile-tabs`), verbatim:
```html
<nav class="profile-tabs" aria-label="Seções do perfil">
  <button class="on">Conta</button>
  <button>Preferências</button>
  <button>Sessões e segurança</button>
</nav>
```
- Aba **"Conta"**: dois cards — "Identidade" (Nome: `"Clevesson Mendonça"`; E-mail corporativo: `"clevesson@albora.com.br"`; ID do operador: `"staff_01J8CE"`) e "Acesso" (Papel: `"Owner"`; Reautenticação: `"Válida por 11 min"`; Escopo: `"Todos os eventos"`).
- Aba **"Preferências"**: card "Interface" com 3 `setting-row`: "Aparência" (toggle Claro/Escuro via `theme-choice`), "Idioma" (select "Português (Brasil)" / "English"), "Menu lateral" (botão "Alternar menu").
- Aba **"Sessões e segurança"**: card "Sessões ativas", copy `"Revogue acessos que você não reconhece. A sessão atual exige nova autenticação para sair."`, duas `.session` rows: sessão atual (`"Este navegador · São Paulo"` / `"Mac · ativo agora · IP 189.•••.10"` / badge `"Atual"`) e sessão remota (`"Safari · São Paulo"` / `"iPhone · há 2 horas · IP 177.•••.24"` / botão `"Revogar"`).

CSS de abertura do menu (animação de reveal):
```css
.profile-menu:not([hidden]){transform-origin:left bottom;animation:menu-reveal .16s cubic-bezier(.16,1,.3,1)}
@keyframes menu-reveal{from{opacity:0;transform:scale(.97) translateY(4px)}to{opacity:1;transform:none}}
```

JS de toggle/close (abre com foco no primeiro item):
```js
function closeProfile(){var menu=el('profileMenu'),btn=el('profileButton');if(menu)menu.hidden=true;if(btn)btn.setAttribute('aria-expanded','false');}
function toggleProfile(e){if(e)e.stopPropagation();var menu=el('profileMenu'),btn=el('profileButton');var next=menu.hidden;menu.hidden=!next;btn.setAttribute('aria-expanded',String(next));if(next)setTimeout(function(){var first=menu.querySelector('button');if(first)first.focus();},0);}
```

### A.7 Dark mode: mecanismo de toggle

Toggle via **`data-theme` no `<html>`**, persistido em `localStorage`, com fallback para `prefers-color-scheme` no primeiro load:
```js
function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem('albora-console-theme',theme)}catch(e){}var dark=theme==='dark',btn=el('themeToggle');if(btn){btn.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');btn.title=dark?'Ativar tema claro':'Ativar tema escuro';btn.innerHTML='<span class="ic-svg ic-'+(dark?'sun':'moon')+'"></span>';}document.querySelectorAll('[data-theme-choice]').forEach(function(x){x.classList.toggle('on',x.dataset.themeChoice===theme);x.setAttribute('aria-pressed',String(x.dataset.themeChoice===theme));});paint();}
```
Bootstrap na carga da página:
```js
setTheme(savedTheme||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));setSidebar(savedSidebar==='collapsed');
```
Não há uso de `@media(prefers-color-scheme: dark)` como seletor de CSS neste arquivo — a mudança de tema é 100% via atributo `data-theme` no `<html>`, e a media query só decide o valor **inicial** em JS quando não há preferência salva. Botão de toggle na topbar (`#themeToggle`) troca o ícone lua/sol; o botão fixo antigo `.themebtn` existe no CSS mas está desativado na v5 (`.themebtn{display:none}`).

Já cobertos acima (ver A.1): tokens que trocam em dark, e os estados de `.navitem.on`/`.period button.on`/`.profile-tabs button.on`/`.theme-choice button.on` que ganham override específico em dark.

### A.8 Focus rings, aria, reduced motion

```css
@media (prefers-reduced-motion: reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}
```
```css
:focus-visible{outline:2px solid var(--info);outline-offset:3px}
```
```css
@media(prefers-reduced-motion:reduce){.content.is-entering,.profile-menu:not([hidden]),.status-summary.is-clear .ic-svg{animation:none!important}}
```
Reforço de foco em tooltip do metric-info (usa `:focus-visible` além de `:hover` para acessibilidade de teclado):
```css
.metric-info:hover::after,.metric-info:focus-visible::after{content:attr(data-tip);position:absolute;right:0;bottom:calc(100% + 7px);width:240px;background:var(--ink);color:var(--surface);font:400 11px/1.45 var(--sans);padding:.6rem .7rem;border-radius:9px;z-index:90;box-shadow:var(--elev-2);pointer-events:none}
```
Utilitário `.sr-only` (texto só para leitor de tela, usado no tooltip do H1 — ver Parte B):
```css
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
```
Atributos `aria-*` relevantes na estrutura do shell (amostra, não exaustivo):
```html
<aside class="side" id="side" aria-label="Navegação principal">
<div class="period" id="period" role="group" aria-label="Período dos dados">
<button class="tbtn menu" id="navToggle" onclick="openNav()" aria-label="Abrir menu" aria-controls="side" aria-expanded="false">
<button class="me" id="profileButton" onclick="toggleProfile(event)" aria-expanded="false" aria-controls="profileMenu">
<div class="profile-menu" id="profileMenu" role="menu" hidden>
<div class="detail" id="detail" role="dialog" aria-modal="true" aria-label="Detalhes" aria-hidden="true">
<div class="cmd" role="dialog" aria-modal="true" aria-label="Busca global">
<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>
```
Gestão de foco em overlays (abrir detail/menu move o foco; fechar devolve foco ao elemento de origem) — só o essencial de aria, não a lógica completa:
```js
function openDetail(head,body){overlayReturnFocus=document.activeElement; /* ... */ setTimeout(function(){var x=el('detail').querySelector('.x');if(x)x.focus();},0);}
function closeDetail(){var open=el('detail').classList.contains('on'); /* ... */ if(open&&overlayReturnFocus&&overlayReturnFocus.focus)overlayReturnFocus.focus();}
```
Estado de navegação ativa é sinalizado com `aria-current="page"` (setado/removido dinamicamente por `nav(s)` em cada `.navitem` e no botão de perfil), não coberto aqui por não ser CSS/markup estático.

---

## PARTE B — Tela "Visão Geral" (`nav_overview()`)

Cabeçalho da tela (fora dos 3 blocos, mas contextual): `<h1>` com copy dinâmica **verbatim**: `"O que pede atenção agora."`, subtítulo `"{contexto}, a fila reúne apenas o que cruzou prazo, risco ou impacto. O restante segue abaixo para acompanhamento."` onde `{contexto}` é `"Hoje"` ou `"Nos últimos 7 dias"` / `"Nos últimos 30 dias"` conforme o seletor de período.

Ao lado do cabeçalho, o indicador de status (`.status-summary`) tem dois estados:
- **Com pendências**: `<div class="status-summary" role="status"><span class="pulse"></span><span><b>{N} pendências</b><br>{N} críticas</span></div>` — ponto pulsante `--warn`.
- **"Tudo em dia"** (estado vazio, ativável via botão "Simular tudo em dia"): `<button class="status-summary is-clear" ...><span class="ic-svg ic-check"></span><span><b>Tudo em dia</b><br>sem pendências</span></button>`, cor `--ok`, com animação de "confirmação":
  ```css
  .status-summary.is-clear{color:var(--ok);border-color:var(--ok-soft)}
  @keyframes status-confirm{0%{opacity:0;transform:scale(.72)}70%{transform:scale(1.08)}100%{opacity:1;transform:none}}
  .status-summary.is-clear .ic-svg{animation:status-confirm .3s cubic-bezier(.16,1,.3,1)}
  ```

### B.1 Bloco 1 — "Precisa de você agora" (`.attention-panel`)

Markup (trimming: 1 row representativa de 6 no array `ATTN`):
```html
<section class="attention-panel">
  <div class="seclbl">
    <h2>Precisa de você agora</h2>
    <span class="n">{crit} críticas · {total} no total</span>
    <button class="r" onclick="showClear=true;render()">Simular tudo em dia</button>
  </div>
  <div class="attn">
    <button class="arow crit" onclick="nav('suporte')">
      <span class="ic"><span class="ic-svg ic-life"></span></span>
      <span class="tx"><b>2 tickets estouraram o SLA</b><span>o mais antigo há 6h20 · assessoria Bela Vista</span></span>
      <span class="mod">Suporte</span>
      <span class="go"><span class="ic-svg ic-chev"></span></span>
    </button>
    <!-- + 4 outras rows, mesma anatomia, severidades warn/crit -->
  </div>
</section>
```
Copy verbatim das 5 rows acionáveis (a 6ª, severidade `info`, é filtrada — ver nota abaixo):
1. crit — `"2 tickets estouraram o SLA"` / `"o mais antigo há 6h20 · assessoria Bela Vista"` / módulo `"Suporte"`
2. crit — `"1 pedido LGPD vencido — prazo legal"` / `"exclusão de dados · vence hoje"` / módulo `"LGPD"`
3. warn — `"3 jobs de retenção vencidos"` / `"2× d365_delete · 1× d330_drive não confirmado"` / módulo `"Retenção"`
4. warn — `"1 assinatura inadimplente há 12 dias"` / `"Fornecedor Luz & Cia · R$ 149/mês"` / módulo `"Assinaturas"`
5. warn — `"Pico de login.failed (+340% em 24h)"` / `"concentrado em 3 IPs · possível brute-force"` / módulo `"Segurança"`

Nota de dado: existe uma 6ª entrada no array `ATTN` com `sev:'info'` (`"5 eventos acontecendo agora"`), mas o código filtra explicitamente `act=ATTN.filter(a=>a.sev!=='info')` antes de renderizar essa seção — ou seja, **itens `info` nunca aparecem em "Precisa de você agora"** (ficam reservados a outro uso, embora no protótipo atual não sejam consumidos em nenhum outro lugar visível). Isso é um sinal de que a severidade `info` existe no modelo de dados mas essa tela só mostra `crit`/`warn`.

Empty state ("tudo em dia"): quando `showClear=true`, a seção inteira **não é renderizada** (`attention=''`) — não há um card de "tudo em dia" dedicado dentro do próprio painel; em vez disso, o grid muda de classe (`overview-grid.clear`, 1 coluna só) e o sinal de "tudo em dia" aparece no `.status-summary` do cabeçalho (ver acima), não como substituto do painel de atenção.

**Anatomia da row (`.arow`) — severidade, cores exatas**:
```css
.attn{display:flex;flex-direction:column;gap:.5rem}
.arow{display:flex;align-items:center;gap:.9rem;border:0;border-left:3px solid transparent;border-radius:11px;background:var(--surface);box-shadow:var(--elev);padding:.85rem 1rem;transition:.14s var(--curva);text-align:left;width:100%}
.arow:hover{transform:translateY(-1px);box-shadow:var(--elev-2)}
.arow.crit{border-left-color:var(--critico)}.arow.warn{border-left-color:var(--warn)}.arow.info{border-left-color:var(--acento)}
.arow .ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:none}
.arow.crit .ic{background:var(--critico-soft);color:var(--critico)}.arow.warn .ic{background:var(--warn-soft);color:var(--warn)}.arow.info .ic{background:var(--acento-soft);color:var(--acento)}
.arow .ic .ic-svg{width:17px;height:17px}
.arow .tx{flex:1;min-width:0}.arow .tx b{font:600 13.5px var(--sans);display:block}.arow .tx span{font-size:12px;color:var(--ink-3)}
.arow .mod{font:600 9.5px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);background:var(--surface-2);border-radius:6px;padding:3px 8px;flex:none}
.arow .go{color:var(--ink-3);flex:none}.arow .go .ic-svg{width:16px;height:16px}
/* v5 override (dentro de .attention-panel): */
.arow{border:0;border-bottom:1px solid var(--line);border-radius:0;padding:.78rem 0;background:transparent;box-shadow:none}
.arow:last-child{border-bottom:0}.arow:hover{transform:none;box-shadow:none}.arow:hover .tx b{color:var(--acento)}
.arow .ic{width:30px;height:30px;border-radius:50%}
.arow .mod{background:none;padding:0;font-family:var(--serif);font-weight:400;letter-spacing:.12em}
```
Cores exatas por severidade (valores vigentes do bloco `:root` v5, linha 178):
- **`crit`**: borda esquerda / ícone `var(--critico)` = `#BB3D18` (claro) / `#FF835E` (escuro); fundo do ícone `var(--critico-soft)` = `#BB3D1812` / `#FF835E18`.
- **`warn`**: `var(--warn)` = `#A96F18` / `#E2AA58`; fundo `var(--warn-soft)` = `#A96F1812` / `#E2AA5818`.
- **`info`** (classe existe no CSS mas não é usada nesta tela, ver nota acima): `var(--acento)` = `#D46632` / `#E28A58`; fundo `var(--acento-soft)`.

Estado vazio dedicado no CSS (classe `.allclear`, existe no stylesheet mas não é instanciado por esta tela — a tela usa o `.status-summary.is-clear` em vez disso):
```css
.allclear{border:1px dashed var(--line-2);border-radius:var(--r);padding:1.8rem;text-align:center;color:var(--ink-2);background:var(--surface)}.allclear .ic-svg{width:26px;height:26px;color:var(--ok);margin-bottom:.4rem}
```

### B.2 Bloco 2 — Métricas / "Participação (H1)" + KPIs (equivalente a "Saúde da plataforma")

O card principal de métrica é o `.pulse-panel` (H1 = participação), seguido de uma faixa de KPIs (`.metric-strip`).

Markup do `.pulse-panel` (verbatim):
```html
<aside class="pulse-panel">
  <span class="label">Participação média (H1)
    <button class="metric-info" aria-label="Como a participação H1 é calculada" aria-describedby="h1-help" data-tip="H1 = percentual de convidados esperados que enviaram ao menos uma foto. Meta: 40%.">
      <span class="ic-svg ic-info"></span>
    </button>
    <span class="sr-only" id="h1-help">H1 é o percentual de convidados esperados que enviaram ao menos uma foto. A meta é 40%.</span>
  </span>
  <strong class="h1-number num">44%</strong>
  <span class="h1-copy">dos convidados esperados enviaram pelo menos uma foto</span>
  <svg class="spark" viewBox="0 0 300 52" preserveAspectRatio="none" role="img" aria-label="Evolução da participação no período">
    <!-- path gerado por sparkline(), ver abaixo -->
  </svg>
  <div class="pulse-meta"><span>Meta 40%</span><b>Acima da meta · +2,1pp</b></div>
</aside>
```
**Tooltip do H1 — copy verbatim**: `"H1 = percentual de convidados esperados que enviaram ao menos uma foto. Meta: 40%."` (atributo `data-tip`, mostrado via CSS `::after` no hover/focus do botão `.metric-info` — ver A.8). Há também uma versão de leitor de tela (`.sr-only`, sempre presente no DOM, não depende de hover): `"H1 é o percentual de convidados esperados que enviaram ao menos uma foto. A meta é 40%."` — texto ligeiramente diferente do tooltip visual (mais completo, frase inteira). **Gatilho: hover ou foco de teclado** (`:hover`/`:focus-visible` no botão `.metric-info`; não é clique — o botão em si não tem `onclick`).

Sparkline é **SVG inline** (não canvas), path gerado em JS puro a partir de pontos (`d.pts`), sem lib de gráfico:
```js
function sparkline(pts){var w=300,h=52,mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts),rg=(mx-mn)||1;var d=pts.map(function(v,i){var x=i/(pts.length-1)*w;var y=h-4-((v-mn)/rg)*(h-10);return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}).join(' ');return '<path d="'+d+' L'+w+' '+h+' L0 '+h+' Z" fill="var(--acento-soft)"/><path d="'+d+'" fill="none" stroke="var(--acento)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';}
```
Duas paths: uma área preenchida (`fill:var(--acento-soft)`) fechando no eixo X, e uma linha de contorno (`stroke:var(--acento)`, `stroke-width:2`, cantos arredondados). `viewBox="0 0 300 52"`, `preserveAspectRatio="none"`.

CSS do painel:
```css
.pulse-panel{padding:1.35rem;display:flex;flex-direction:column;min-height:310px;background:var(--surface)}
.pulse-panel .label{display:flex;align-items:center;gap:.4rem;font:500 12px var(--sans);color:var(--ink-2)}
.pulse-panel .h1-number{font:500 4.6rem/1 var(--sans);letter-spacing:-.07em;margin:.8rem 0 .2rem}
.pulse-panel .h1-copy{color:var(--ink-2);max-width:24ch;line-height:1.45}
.pulse-panel .spark{margin:auto 0 .75rem;height:62px}
.pulse-meta{display:flex;justify-content:space-between;gap:1rem;padding-top:.75rem;border-top:1px solid var(--line)}.pulse-meta span{color:var(--ink-3)}.pulse-meta b{color:var(--ok)}
```

**Faixa de KPIs** (`.metric-strip`, logo abaixo do grid principal — 4 cards, este é o componente mais próximo de "saúde da plataforma" nesta tela):
```html
<section class="metric-strip">
  <div class="kpis">
    <div class="kpi"><div class="t-label">Receita recorrente</div><div class="t-metric num">R$ 18.400</div><div class="foot"><span class="up"><span class="ic-svg ic-up"></span> +6%</span> vs anterior</div></div>
    <div class="kpi"><div class="t-label">Churn estimado · 30 dias</div><div class="t-metric num">3,2%</div></div>
    <div class="kpi"><div class="t-label">Eventos ao vivo</div><div class="t-metric num">5</div></div>
    <div class="kpi"><div class="t-label">Convidados no período</div><div class="t-metric num">18.320</div></div>
  </div>
</section>
```
Helper genérico usado para montar qualquer grade de KPI (`kpis()`):
```js
function kpis(arr){return '<div class="kpis">'+arr.map(function(k){return '<div class="kpi"><div class="t-label">'+k.l+'</div><div class="t-metric num">'+k.v+'</div>'+(k.f?'<div class="foot">'+k.f+'</div>':'')+'</div>';}).join('')+'</div>';}
```
CSS do card de KPI:
```css
.kpi{border:0;border-radius:var(--r);background:var(--surface);box-shadow:var(--elev);padding:.9rem 1rem}
.kpi .t-label{margin-bottom:.45rem;font-size:10px;letter-spacing:.07em}.kpi .t-metric{font-size:1.45rem;font-weight:600}.kpi .foot{font-size:11.5px;color:var(--ink-3);margin-top:.35rem;display:flex;align-items:center;gap:.3em}.kpi .foot .up{color:var(--ok)}.kpi .foot .down{color:var(--critico)}.kpi .foot .ic-svg{width:12px;height:12px}
/* v5 override: */
.metric-strip{margin-top:1rem;padding:1.05rem 1.2rem}.metric-strip .kpis{grid-template-columns:repeat(4,1fr);gap:0;margin:0}
.kpi{border-radius:0;border:0;border-left:1px solid var(--line);padding:.25rem 1rem}.kpi:first-child{border-left:0;padding-left:0}
.kpi .t-label{font:400 11px var(--serif);letter-spacing:.14em}.kpi .t-metric{font-size:1.6rem;font-weight:500}
```

**Nota importante**: apesar da instrução do escopo mencionar um bloco literal "Saúde da plataforma" nesta tela, o texto exato `"saúde da plataforma"` (verbatim, em minúsculas) só existe na tela **Sistema** (`nav('sistema')`, `return ph('Sistema','saúde da plataforma em tempo real')+...`, linha 754), não em Visão Geral. Na Visão Geral, o bloco que cumpre esse papel é o par `.pulse-panel` (H1) + `.metric-strip` (4 KPIs) descrito acima — é o que existe de fato na tela, mesmo sem usar essa string exata como título de seção.

### B.3 Bloco 3 — "Acontecendo agora" (`.live-panel`)

Markup (1 card representativo de 5 no array `LIVE`):
```html
<section class="live-panel">
  <div class="panel-head"><h2>Acontecendo agora</h2><span>5 eventos ao vivo</span></div>
  <div class="live">
    <button class="levent" onclick="nav('eventos')" aria-label="Abrir evento Ana & João">
      <span class="nm">Ana & João</span>
      <span class="st"><span class="d"></span> ao vivo</span>
      <span class="mt">44% · 247 fotos</span>
    </button>
    <!-- + 4 outros cards: "15 anos Duda" (51%), "Marina & Rafa" (38%), "Formatura Med" (29% · atenção), "Bodas Léa" (62%) -->
  </div>
</section>
```
Título e contagem, verbatim: `"Acontecendo agora"` / `"5 eventos ao vivo"`.

CSS:
```css
.live{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.6rem}
.levent{border:0;border-radius:11px;padding:.8rem .9rem;background:var(--surface);box-shadow:var(--elev);cursor:pointer;transition:.14s var(--curva)}.levent:hover{transform:translateY(-1px);box-shadow:var(--elev-2)}.levent .nm{font:600 13px var(--sans)}.levent .st{font-size:11px;color:var(--ok);font-weight:600;display:inline-flex;align-items:center;gap:.35em;margin-top:.2rem}.levent .st .d{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px var(--ok-soft)}.levent .mt{font-size:11px;color:var(--ink-3);margin-top:.35rem}
/* v5 override: */
.live-panel{margin-top:1rem;overflow:hidden}.live-panel .panel-head{padding:1.15rem 1.35rem;margin:0;border-bottom:1px solid var(--line)}
.live{display:grid;grid-template-columns:repeat(5,1fr);gap:0}
.levent{border:0;border-right:1px solid var(--line);border-radius:0;padding:1rem 1.1rem;text-align:left}.levent:last-child{border-right:0}.levent:hover{transform:none;background:var(--surface-2);box-shadow:none}
.levent .nm,.levent .mt{display:block}.levent .st{color:var(--ok)}
```
Indicador "ao vivo" é um ponto verde com halo (`.st .d`: `background:var(--ok)` + `box-shadow:0 0 0 3px var(--ok-soft)`), não uma animação de pulso — é estático.

### B.4 Funil de ativação comercial (Contas→Eventos→Checkout→Pago)

Dados-fonte (5 estágios, não 4 — o funil real inclui "QR baixado" entre Eventos e Checkout):
```js
var FUN=[['Contas',1240,100],['Eventos',890,72],['QR baixado',812,65],['Checkout',640,52],['Pago',512,41]];
```
Cada estágio é `[label, valor_absoluto, percentual_da_base]`.

Markup gerado (1 step representativo, mais a tag de maior perda):
```html
<section class="analytics-panel">
  <div class="panel-head"><h2>Ativação comercial</h2><span>Contas até pagamento</span></div>
  <div class="funnel">
    <div class="fstep">
      <span class="lbl">Contas</span>
      <div class="track"><div class="fill" style="width:100%">1.240</div></div>
      <span class="drop">—</span>
    </div>
    <!-- Eventos: drop calculado = round((890-1240)/1240*100) = -28% -->
    <!-- QR baixado: drop = round((812-890)/890*100) = -9% -->
    <!-- Checkout: drop = round((640-812)/812*100) = -21% -->
    <div class="fstep worst">
      <span class="lbl">Pago</span>
      <div class="track"><div class="fill" style="width:41%">512</div></div>
      <span class="drop">-20%</span>
    </div>
  </div>
  <div class="worsttag"><span class="ic-svg ic-alert"></span> Maior perda: <b style="margin:0 .3em">Checkout → Pago</b> (−20%). <button class="r" onclick="toast('Investigar')">Investigar →</button></div>
</section>
```
**Como o maior drop-off é destacado visualmente**: o estágio final ("Pago") recebe a classe `.fstep.worst` **hardcoded** (`var worst=(f[0]==='Pago')` — não é calculado dinamicamente comparando drops, é fixo no último estágio do array), que troca a cor da barra de preenchimento (`.fill`) e do número de queda (`.drop`) para a cor crítica:
```css
.fstep.worst .fill{background:var(--critico)}.fstep.worst .drop{color:var(--critico)}
```
Além disso, abaixo do funil, uma tag de texto fixa (`.worsttag`, cor `var(--critico)`) reafirma em texto qual foi a maior perda — a copy é escrita à mão no template (`'Maior perda: <b>Checkout → Pago</b> (−20%)'`), **não** calculada a partir dos drops reais dos outros estágios (ex.: o drop de "Contas→Eventos" é -28%, maior em módulo que -20%, mas o destaque textual/visual está fixo em "Checkout → Pago" mesmo assim — inconsistência de dados a observar na spec de implementação).

CSS do funil:
```css
.funnel{display:flex;flex-direction:column;gap:.55rem}
.fstep{display:flex;align-items:center;gap:.8rem}.fstep .lbl{width:7.5rem;flex:none;font-size:12.5px;color:var(--ink-2)}
.fstep .track{flex:1;height:30px;background:var(--surface-2);border-radius:7px;overflow:hidden}.fstep .fill{height:100%;background:var(--acento);border-radius:7px;display:flex;align-items:center;padding-left:.6rem;color:#fff;font:600 12px var(--sans);min-width:2.5rem}
.fstep .drop{width:4.6rem;flex:none;text-align:right;font:600 11.5px var(--sans);color:var(--ink-3)}
.fstep.worst .fill{background:var(--critico)}.fstep.worst .drop{color:var(--critico)}
.worsttag{margin-top:.7rem;font-size:12px;color:var(--critico);display:flex;align-items:center;gap:.4em}.worsttag .ic-svg{width:14px;height:14px}
/* v5 override: */
.fstep .track{height:24px;border-radius:5px}.fstep .fill{border-radius:5px;background:var(--ink);font-weight:500}.fstep.worst .fill{background:var(--critico)}
.worsttag{padding-top:.8rem;border-top:1px solid var(--line)}
```
Nota: na v5, a barra de preenchimento "normal" (não-worst) muda de `var(--acento)` para `var(--ink)` — só o estágio `worst` mantém a cor crítica, aumentando o contraste do destaque.

Ao lado do funil, um painel irmão `.plan-panel` mostra distribuição de fornecedores por plano (`PLANS=[['Grátis',64],['Completo',38],['Fornecedor',22]]`) em barras horizontais simples (`.barlist`/`.barrow`), fora do escopo do funil em si mas parte do mesmo `.analysis-grid`.
