# CLAUDE.md

Guia para assistentes de código (Claude Code, Cursor) e desenvolvedores neste repositório.

## O que é este projeto

**Albora** — produto web que coleta, organiza e devolve as fotos tiradas pelos convidados durante uma festa, usando **missões** fotográficas para aumentar a participação e a **identidade visual do evento** para dar coerência estética ao resultado.

Três superfícies: **convidado** (PWA, sem login, sem download), **anfitrião** (admin web), **telão** (URL fullscreen no salão). Um quarto plano — **fornecedor** (white-label, B2B2C) — entra na Fase 3.

O núcleo é genérico (`event`, `host`, `guest`, `challenge`, `upload`); casamento é um **pack**, não o núcleo.

## O que este projeto NÃO é

- Não é uma rede social **entre eventos**. O feed, as reações e os comentários existem e são de primeira classe, mas vivem dentro de um evento e morrem com ele. Não há conta Albora, e a interação abre num horário que os noivos escolhem. Ver [ADR 0009](./docs/adr/0009-app-social-do-convidado.md).
- Não é um editor de canvas. Diagramação é por slots, nunca posicionamento livre.
- Não é um site de casamento. Site, convite, RSVP e lista de presentes estão fora até a Fase 4, com condições de entrada explícitas.
- Não é armazenamento. Não competimos em "ilimitado grátis".

## Leia antes de qualquer coisa substancial

→ [`docs/architecture.md`](./docs/architecture.md) — fonte da verdade de arquitetura.

Se sua tarefa implica mudança de arquitetura, atualize `docs/architecture.md` na mesma MR. Se cria ou muda uma decisão arquitetural relevante, escreva um ADR em [`docs/adr/`](./docs/adr/).

Os dois documentos de produto que originam tudo isto vivem em [`docs/product/`](./docs/product/).

## REGRAS NÃO NEGOCIÁVEIS

Não podem ser quebradas sem discussão prévia. Se uma tarefa pedir para quebrar uma, **pare e avise**.

### Isolamento entre eventos

- **Toda tabela com dado de evento tem `event_id`** (UUID, NOT NULL, FK). RLS **FORÇADO**, política filtrando por `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`. O `NULLIF` é obrigatório: depois do `SET LOCAL`, o GUC volta a `''`, e `''::uuid` estoura em vez de falhar fechado.
- **Sempre `SET LOCAL`, nunca `SET`.** Pooling em modo transação devolve a conexão a cada COMMIT; um setting de sessão vaza para o próximo cliente. O mesmo vale para locks: `pg_advisory_xact_lock`, nunca `pg_advisory_lock`.
- **Nunca escreva query que cruza eventos** fora de um caminho de agregação explícito (dashboard do fornecedor, observabilidade). Esses usam papel dedicado com `BYPASSRLS` e são auditados.
- **Chaves de storage são derivadas no servidor**, sempre `events/{event_id}/...`. O cliente **nunca** informa a chave — nem no presign, nem no confirm.
- **Jobs em background são o vazamento fácil.** O worker define `app.event_id` a partir do payload antes de qualquer chamada ao banco. Job sem `event_id` no payload **falha alto**, não assume um padrão.

### Sessão do convidado

- **O convidado não tem login e nunca terá.** A primeira foto nunca passa por loja de aplicativos nem por tela de autenticação. Isso decide a H1 (≥40% de participação) e a H1 decide se o negócio existe.
- **A regra acima restringe o caminho da primeira foto, não a existência de app.** Existe app instalável, e o convite para ele aparece **na confirmação da primeira foto**, nunca antes. Ver [ADR 0008](./docs/adr/0008-app-nativo-como-segunda-porta.md).
- **O token de sessão do convidado é opaco, assinado e escopado a UM evento.** Não é transferível. Autoriza exatamente: subir mídia naquele evento, reagir, remover a própria mídia. Nada além.
- **Consentimento é versionado e datado** por sessão, antes de qualquer captura.

### Caminho crítico de sábado às 20h

- **O servidor nunca toca nos bytes de mídia.** Upload é PUT presigned direto no object storage.
- **EXIF é removido no cliente, antes do upload.** Coordenada de GPS em foto de convidado é exposição real de LGPD.
- **O caminho de upload depende de exatamente dois sistemas: object storage e Postgres.** Todo o resto — classificador de moderação, WhatsApp, Drive, e-mail, analytics — **degrada, nunca falha**. Terceiro no caminho crítico é falha de arquitetura, não de configuração.
- **Fila offline + retry não são otimização.** O sinal cai, o browser dorme, o convidado sai da tela. Sem fila persistente a foto some e a participação vai a zero.
- **IA generativa nunca toca a mídia do convidado.** Sem restilização, sem remoção de objeto, sem preenchimento, sem upscale generativo. O visual sai de LUT no cliente — grátis, instantâneo, offline e **idêntico em todas as fotos**, que é a coerência que o produto vende. IA de classificação (moderação, curadoria do livro) é bem-vinda, desde que fora do caminho crítico. Ver [ADR 0007](./docs/adr/0007-ai-policy-luts-not-generation.md).

### Identidade visual

- **Nenhum hex hardcodado em componente.** Toda cor, fonte, raio e espaçamento sai de token. Um hex hardcodado é um lugar onde a identidade do casal **não** propaga — é bug de produto, não de estilo.
- **Um resolvedor de tokens, N renderizadores.** Web, telão e PDF de impressão consomem o mesmo resolvedor. Se divergirem, a placa impressa não combina com o telão — e essa coerência é o produto.
- **Anti-padrões visuais são bloqueantes:** glassmorphism, neon, gradiente roxo, dark mode "tech", fonte script, verde sage, rosa blush, ícone de aliança/pombinha/coração.
- **O telão nunca corta na vertical.** Três de cada quatro fotos de festa são verticais; encaixar 9:16 em 16:9 com recorte descarta dois terços da imagem pelo topo e pela base — e o topo é onde estão as cabeças. Quatro modelos resolvem o enquadramento sem cortar rosto ([`docs/flows.md` §5.0](./docs/flows.md)). Vale igual para vídeo.
- **A interação abre por gate, e quem define é o casal.** Feed, reação e comentário existem; o padrão é liberarem **após a cerimônia**, configurável no admin. Antes do gate o app sobe foto e espelha o telão. Notificação fica **desligada** até ter decisão própria. Ver [ADR 0009](./docs/adr/0009-app-social-do-convidado.md).
- **O convidado nunca digita senha, nunca recebe e-mail, nunca espera SMS.** A identidade dele é o QR (qual evento) + primeiro nome (quem) + token do aparelho. A única coisa que ele pode digitar na vida é o código de quatro dígitos que passa a sessão da web para o app instalado.

### Packs (verticais)

- **Nenhuma string de domínio dentro de componente.** Tudo resolve via o pack. Sem `noiva`, `casamento`, `noivos` no núcleo, no schema ou no JSX.
- **Dependência unidirecional: `pack → core`, nunca o contrário.** Guard bloqueante no CI.
- **Teste de sanidade:** trocar o pack de um evento muda toda a UI sem tocar uma linha do núcleo.

### Dados e privacidade

- **Migrations são forward-only em produção.** Nunca reescreva uma migration já aplicada — escreva outra.
- **Nunca logar PII crua.** Nome de convidado, telefone, e-mail: mascarados em log, sempre.
- **Retenção é cumprida por job, não por promessa.** Export para a nuvem do casal no dia 330, delete no dia 365.
- **Excluir conta exclui de verdade, e rápido.** Memórias automáticas são opt-in; desligar em um toque, sem fricção e sem tentativa de retenção.
- **Nunca commitar segredo.** `.env` é gitignored; template em `.env.example`.

### Processo

- **Nunca faça merge de uma MR sem pedido explícito.** Review aprovado e pipeline verde são necessários, não suficientes.
- **Verifique todo artefato que você declara ter produzido.** "Branch pushed" → `git ls-remote origin <branch>` retorna o SHA local. "PR aberto" → `gh pr view`. "Arquivos escritos" → `git status`. Se a verificação falha, **pare e reporte a lacuna**.
- **Por padrão, NENHUM comentário.** Mantenha um comentário só se for (a) invariante de segurança/correção invisível no código, (b) workaround de bug upstream com link rastreável, (c) supressão (`eslint-disable`, `type: ignore`, `noqa`) com motivo, ou (d) docstring que adiciona contrato que nome e assinatura não carregam. Na dúvida: **apague**.

## Convenções de ferramenta (Sea Tecnologia)

- **SCM e CI/CD: GitHub.** Pipeline em `.github/workflows/ci.yml`. Segredos são GitHub Actions secrets, nunca arquivos no repo.

  A convenção da Sea é GitLab self-hosted, e ela continua valendo nos projetos da empresa. **O Albora é a exceção**, decidida na task 002: o repositório já nasceu no GitHub, e manter os dois seria ter um CI que ninguém olha. Um só, não os dois.
- **CLI de review: `gh`.** `gh pr create`, `gh pr view`, `gh run list`. Nunca `glab` neste repositório.
- **Commits: Conventional Commits** com escopo — `feat(upload):`, `fix(telao):`, `docs(adr):`.

## Ladder de deploy

`stable` (teste) → `homol` (homologação) → `main` (prod). MR de feature vai para `stable` por padrão. Promoção entre branches só a pedido explícito do mantenedor. Prod sai de tag em `main`, nunca de branch de feature.

## Gates de qualidade — escalonados por fase

O rigor cresce com o produto. O que **não** escalona: os guards de isolamento entre eventos e o guard de tokens rodam bloqueantes desde o primeiro commit, porque são as duas coisas que, se quebrarem em produção, quebram irreversivelmente.

| Fase | Cobertura | E2E | Performance |
|---|---|---|---|
| MVP (6 semanas) | ≥60% global, **≥90% no pipeline de upload** | Smoke do fluxo do convidado | Teste de carga obrigatório antes do 1º evento: **150 uploads em 20 min** |
| Pós-H1 | ≥80% | Fluxo profundo: QR→consentimento→captura→upload→confirmação | Budget de bundle na rota do convidado |
| Escala | ≥90% | + telão, moderação, export | LCP/INP com budget bloqueante |

Rebaixar um gate para deixar o CI verde é violação não negociável. Exclusão de cobertura é por linha, com motivo, revisada na MR.
