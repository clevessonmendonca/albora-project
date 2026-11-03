# Handoff — redesign Albora (2026-10-24)

## Onde está tudo
- **Pasta:** `docs/redesign/redesign-completo/` no worktree `/Users/clevesson-mendonca/www/albora/worktrees/merganser` (branch `feat/telao-conectar-por-link`). **Nada foi commitado** (pasta untracked). Essa branch tem commits de outro trabalho (telão por link): **não commitar o redesign nela**; criar branch própria a partir de `origin/stable` e commitar só `docs/redesign/redesign-completo/` quando o usuário pedir.
- Ler primeiro: `LEIA-ME.md` (mapa + evidências + limites), depois `06-direcao-de-arte.md`, `08-temas-e-contraste.md`, `09-navegacao.md`.
- Protótipo: `prototipo/` (HTML/CSS/JS sem build). Servir com `python3 -m http.server 5180`. Há entrada em `.claude/launch.json` (`prototipo-redesign`). `index.html` versiona scripts com `?v=N` (subir o N ao editar, senão o navegador usa cache).
- Ferramentas: `prototipo/tools/lint.mjs` (deve dar 0) e `prototipo/tools/audit.js` (injetar no navegador: `(0,eval)(await (await fetch('tools/audit.js')).text()); AUDIT.run()`).

## Decisões tomadas (não refazer)
1. **Marca oficial** vem de `brand/` e `packages/ui-web/src/logo.tsx` (arco + ponto + "Albora" Fraunces); mascote em `brand/mascote/`. Âmbar vigente = `#D46632` (`ALBORA_BRAND.cores.acento`). No claro o primário é **tinta**, âmbar é filete/acento ("âmbar é metal", `DESIGN.md` §4/§6). Mascote só em vazios/sucesso/Pronto; nunca no console.
2. **Três camadas de cor:** marca → evento/fornecedor (`--ev`, só o que é do evento) → tokens semânticos calculados (`A.theme.resolve` em `core.js`: fill ≥3:1, texto ≥4,5:1, rótulo ≥4,5:1). Cromo do painel = `--ac` = âmbar da marca; no convidado = acento do evento derivado.
3. **IA do anfitrião:** 5 destinos (Hoje · Fotos · Convidados · Estilo · Compartilhar) + Explorar; conta no **avatar** (Sair por último, confirmação só com `A.dirty`). Criação de evento em **3 passos**. "Ao vivo" é modo de Hoje.
4. **Ícones:** Lucide real extraído de `lucide-react@1.48.0` (`prototipo/icons-lucide.js`, gerado; não editar à mão). Coração = ícone de *reagir* (o produto já usa `HeartIcon`); coração decorativo continua proibido.
5. **Planos:** Completo do anfitrião é **por evento (pagamento único)**; fornecedor tem mensalidade. Downgrade abre diálogo; **oferta de retenção só com campanha válida configurada** (por padrão não há); sem escassez/contador/depoimento inventados. A semântica "oferta = crédito no próximo Completo" e "valor pago não é devolvido no downgrade" são **hipóteses a confirmar com produto**.
6. Opal assumido = app de tempo de tela e foco (opalapp.com), avaliado só por texto institucional.

## Erros meus já corrigidos (para não repetir)
- Eu tinha desenhado uma marca própria (disco com "a"); trocada pela oficial.
- Atribuí ao app real o "Sair" na barra inferior e o logo em texto; eram do **protótipo** (corrigido em `host-criar.js`). `09-navegacao.md` já reflete isso.

## Abertos / próximos passos
1. **Sessão "App real: navegação, logo e planos"** (`local_9a033db0-55fb-410b-97b7-0c692432d62c`): editou código em `/Users/clevesson-mendonca/www/albora/worktrees/planos-ux` (branch `feat/planos-hierarquia-retencao`), typecheck ok, **sem commits**; falta rodar testes/lint/guards (aguardava permissão), escrever `docs/redesign/redesign-completo/auditoria-app-real.md` e `docs/specs/planos-retencao.md`. Reescopo enviado: auditar por evidência e só corrigir o confirmado.
2. Capturas antes/depois e comparação atual × proposta (não feitas; só evidência numérica da auditoria).
3. Consolidar as matrizes `matriz-*.md` em uma só e fechar o relatório de validação final.
4. Itens de design pendentes: ver "Lacunas" nas matrizes e `auditoria-*.md` (ex.: filtros de Fotos antes da foto no mobile; Equipe/Ajustes do fornecedor sem trabalho tipográfico; CTA de Hoje/antes abaixo da dobra em paisagem; texto sobre foto de capa sem véu calculado).
5. Não verificado: leitor de tela, teclado virtual real, zoom <320, WCAG por ferramenta externa.

## Armadilhas
- `localStorage` do protótipo é compartilhado entre abas da mesma origem (`A.store.reset()` apaga tudo).
- Subagentes de verificação não guardam contexto entre contas: este arquivo + `LEIA-ME.md` são a memória.
- `next dev` não roda nesta máquina; o app real só valida pelo harness estático (`tools/preview`).
- Hooks do Impeccable: ignores estreitos registrados em `.impeccable/config.json` (`side-tab`/`layout-transition` só em `ds.css`, `overused-font fraunces` global por ser fonte de marca, `broken-image` só em `host-evento.js`).


## Continuação no Codex — 2026-10-25

**Escopo confirmado pelo usuário:** continuar o PROTÓTIPO, considerando os cinco anexos (UX/UI, conformidade, anti-AI slop, audiovisual e performance percebida). Não continuar a implementação do app real neste trabalho.

- Worktree válido: `/Users/clevesson-mendonca/www/albora/worktrees/merganser`. O caminho `orca/projects/albora-project` informado pelo cliente não existe.
- Servidor local: `http://127.0.0.1:5180/`. Python estático, sem build. Node disponível em `~/.nvm/versions/node/v22.21.1/bin/node` (fora do PATH desta sessão).
- Playwright usa `channel: 'chrome'`: o Chrome instalado funciona; o headless shell da versão atual do Playwright não está instalado.
- Fotos: busca/ordenação em disclosure nativo, fechado no celular; grade aparece mais cedo. Filtros, revisão, seleção e ordenação preservados.
- Hoje/antes: composição lado a lado em paisagem de baixa altura; próximo passo fica visível junto à contagem.
- Fornecedor/equipe e clientes: busca local por nome/e-mail sem sensibilidade a acento, ordenação, vazio recuperável. Ajustes: navegação por seções, formulário com largura contida, rascunho em memória da aba ao navegar, aviso antes de fechar/recarregar, descarte confirmado, limpeza ao salvar/sair.
- Clipboard: erro não mostra mais sucesso; oferece endereço selecionável em diálogo.
- Consentimento: aceite desmarcado preservado; texto distingue demonstração local, exclusão local e integrações. Não houve auditoria jurídica do backend nem declaração de conformidade.
- Contraste: hover de botões do fornecedor preserva os tokens validados em vez de clarear o fundo sob texto claro.
- Cache de scripts/CSS: `index.html` v13.
- Verificação reproduzível: `node prototipo/tools/verificar-continuacao.mjs`, com servidor no ar; evidências em `prototipo/evidencias/`.
- Nenhum commit/push; nenhum arquivo do app real alterado. Preservar as alterações alheias desta branch.

**Limites e próximos passos:** fotos continuam sendo ilustrações geométricas existentes; faltam fotografias autorizadas ou assets demonstrativos produzidos e identificados. Capa fotográfica e contraste sobre fotografia continuam pendentes (a entrada atual usa monograma). Auditoria jurídica/operacional, integrações reais, medições de Core Web Vitals em produção e vídeos Hyperframe não foram executados. Trabalhar essas frentes como entregas próprias, sem inventar políticas, preços, direitos ou validações. Para detalhes da passada atual, ler `10-continuacao-prototipo.md` e o JSON de evidências.
