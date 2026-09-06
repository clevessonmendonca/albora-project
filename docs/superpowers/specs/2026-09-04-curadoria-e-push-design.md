# Curadoria do livro e push notifications — duas promessas sem código

**Data:** 2026-09-04
**Status:** design proposto, aguardando revisão do dono
**Faixa de migration reservada:** 0065–0069

## 1. O problema

Dois recursos aparecem em documentos de produto e decisão como se existissem, e não existe uma linha de código de nenhum dos dois.

**Curadoria automática do livro** é prometida em [`docs/product/albora-produto-arquitetura.md` §14.8](../../product/albora-produto-arquitetura.md): *"o problema real não é montar o livro, é escolher 60 fotos entre 1.500. Dedup, detecção de foto tremida, diversidade de momentos, cobertura de convidados. É aqui que vira mágica."* O mesmo texto aparece em [ADR 0007](../../adr/0007-ai-policy-luts-not-generation.md), com uma tabela de custo por sinal. Busca em `packages/core/src/album/types.ts` mostra que `MidiaDoAlbum` — o tipo que carrega cada foto candidata ao álbum — não tem nenhum campo de sinal de qualidade: sem hash perceptual, sem variância de nitidez, sem histograma, sem cluster de diversidade. O `docs/specs/task-016-album-da-noite.md:22` confirma por omissão deliberada: *"Não entra: Livro de fotos (Fase 3), curadoria automática, export para Drive."*

**Push notifications** tem uma ADR aceita — [0015](../../adr/0015-push-notifications.md), datada de 2026-09-03 — mas o arquivo não existe nesta branch (`docs/roadmap-paralelo`). Ele foi commitado em `e81fa96` e vive em `feat/redesign-premium-ui` e `feat/ceo-backoffice`; o conteúdo citado abaixo veio de `git show e81fa96:docs/adr/0015-push-notifications.md`, lendo o blob sem entrar nesses worktrees. Confirmando o "zero linhas de código" do briefing: `apps/mobile/package.json` não tem `expo-notifications`, `expo-device` nem `firebase`; `apps/mobile/app.json` lista seis plugins Expo (`expo-dev-client`, `expo-router`, `expo-secure-store`, `expo-background-fetch`, `expo-camera`, `expo-image-picker`) e nenhum de notificação; `apps/web/sw/sw.ts` — o service worker que já existe e já é registrado em `apps/web/lib/infrastructure/rendering/register-sw.ts` para drenagem em segundo plano — não tem listener de evento `push`; não há tabela `guest_notification_tokens` em nenhuma migration de `packages/db/migrations/`.

Este documento propõe como preencher as duas lacunas sem violar as regras não negociáveis do `CLAUDE.md` sobre IA, caminho crítico e PII.

## 2. O que estes recursos NÃO são

- **Curadoria não é editor de canvas.** `docs/specs/task-020-mapa-de-telas.md` já define a tela do livro (B-09) como diagramação por slots — "arrastar foto pra um slot", nunca posicionamento livre. Curadoria alimenta essa tela com uma sugestão pré-selecionada; não cria uma tela nova nem um PDF paralelo.
- **Curadoria não publica sozinha.** O algoritmo propõe; quem decide é o casal (§5). Não existe "gerar livro automaticamente e enviar pra gráfica".
- **Curadoria não é IA generativa.** [ADR 0007](../../adr/0007-ai-policy-luts-not-generation.md), regra 2: "IA generativa nunca toca a mídia do convidado. Sem restilização, sem remoção de objeto, sem preenchimento, sem upscale generativo." Os sinais propostos aqui (§3) são medição — hash, variância, histograma — nunca transformação de pixel.
- **Push não é motor de engajamento geral.** O ADR 0015 autoriza exatamente três gatilhos e bloqueia explicitamente notificação de reação, comentário, nova foto de outro convidado e lembrete de upload durante o evento — ver §6 e §3 do próprio ADR.
- **Push não muda a regra de sessão anônima.** [ADR 0004](../../adr/0004-anonymous-guest-session.md) permanece: o token de push é um identificador adicional só para reencontrar o dispositivo depois que o app fecha, nunca uma segunda forma de autenticar a sessão do convidado.
- **Nenhum dos dois vira terceiro no caminho crítico.** `CLAUDE.md`: "o caminho de upload depende de exatamente dois sistemas: object storage e Postgres. Todo o resto — classificador de moderação, WhatsApp, Drive, e-mail, analytics — degrada, nunca falha." Curadoria e push entram nessa lista de "todo o resto".
- **Agrupamento facial fica de fora** — ver §10.

## 3. Curadoria: sinais e medição

A ordem de prioridade vem do próprio ADR 0007, que já fez a conta de custo:

| Sinal | O que mede | Método proposto | Custo |
|---|---|---|---|
| Duplicata / quase-duplicata | Duas fotos quase idênticas (rajada, mesmo ângulo) | Hash perceptual (`aHash`/`dHash`) sobre o thumb já existente; distância de Hamming abaixo de um limiar agrupa como duplicata | R$ 0 |
| Foto tremida ou desfocada | Nitidez | Variância do laplaciano sobre a luminância do thumb; abaixo de um limiar é candidata a descarte | R$ 0 |
| Exposição ruim | Estouro de luz ou sombra | Histograma de luminância — percentual de pixels saturados nos extremos | R$ 0 |
| Diversidade de momento e cobertura de convidados | Se o livro cobre a festa inteira e todo mundo, não só quem tirou mais foto | Embedding barato, clusterizado por proximidade temporal + visual | ~R$ 2/evento |

Os três primeiros são aritmética pura sobre os mesmos bytes de thumb que o classificador de moderação já lê (`readThumb`, usado em `apps/web/lib/domain/media/classify.ts`) — nenhum modelo, nenhuma chamada de rede, determinístico. O quarto é o único que precisa de um serviço externo, e mesmo esse fica no teto que o ADR 0007 já orçou (~R$ 2/evento), muito abaixo do custo de qualquer restilização generativa que o mesmo ADR rejeitou.

**Nenhum sinal decide sozinho.** Cada um produz um score guardado por mídia, não um veredito binário de inclusão/exclusão — o mesmo desenho que `packages/core/src/moderacao.ts` usa para o classificador de imagem (três vereditos, nunca um quarto que force reescrita do motor): aqui, quatro scores numéricos por mídia, combinados numa função de ranking que devolve uma **ordem sugerida**, nunca um corte automático.

**Ponto de extensão para o provedor de diversidade.** `packages/core/src/classificador-imagem.ts` já define uma porta (`ProvedorDeClassificadorDeImagem`) que separa o motor de decisão do provedor de fato, com timeout e fallback para veredito neutro em caso de erro. O sinal de diversidade (o único que precisa de embedding) deve seguir o mesmo desenho: uma porta em `packages/curation` com uma implementação de referência, trocável sem tocar quem chama.

## 4. Curadoria: onde roda e como degrada

**Nunca no upload.** O pipeline de upload depende só de object storage e Postgres (`CLAUDE.md`); cálculo de hash, laplaciano e embedding são custo de CPU/rede que não têm lugar num PUT presigned de sábado às 20h.

**Gatilho explícito, não incidental.** O classificador de moderação existente tem um defeito documentado em `docs/superpowers/specs/2026-09-04-moderacao-real-design.md` §4.1: ele só roda quando alguém está olhando o telão, porque o gatilho é o poll de `apps/web/lib/api/handlers/wall.ts`. Um evento sem telão aberto simplesmente não classifica nada. Curadoria do livro não tem uma superfície equivalente sempre ativa — ninguém está olhando o editor do livro o tempo todo — então não pode herdar esse padrão. O gatilho precisa ser: (a) o casal abre o editor do livro pela primeira vez (dispara cálculo sob demanda para o acervo do evento), ou (b) um job assíncrono pós-evento, acionado pelo mesmo mecanismo que já processa retenção.

O mecanismo já existe e deve ser reaproveitado, não reinventado: `apps/web/lib/infrastructure/api/handlers/ops-retencao.ts` expõe `POST /api/ops/retencao`, autenticado por `Bearer ${CRON_SECRET}` (com fallback de dev sem secret), que chama `processRetentionJobs` sobre uma lista de jobs due (`packages/db/src/retention-jobs.ts`, tabela `retention_jobs` com `event_id`, `kind`, `due_at`, `attempts`, inserção idempotente via `ON CONFLICT DO NOTHING`). Um handler `POST /api/ops/curadoria` no mesmo padrão, processando uma tabela de jobs de curadoria (ver §migration abaixo), é o caminho de menor superfície nova.

Vale notar: não existe `wrangler.toml` neste repositório (busca `find . -iname "wrangler.toml*"` não retorna nada) apesar de o [ADR 0006](../../adr/0006-hosting-platform.md) especificar Cloudflare Queues + Cron Triggers como o mecanismo de fila/cron da plataforma. Isso é responsabilidade do sub-projeto A (ida para produção), não deste. Até esse arquivo existir, `/api/ops/curadoria` depende do mesmo disparo externo que hoje aciona `/api/ops/retencao` — o handler já está pronto para ser chamado assim que o cron existir.

**Como falha sem derrubar nada:**

- Erro ao ler o thumb, timeout, ou provedor de diversidade fora do ar: a mídia fica com sinal **ausente**, não sinal **ruim**. Ausência de sinal significa "não sugerido para exclusão, não sugerido para inclusão prioritária" — a mídia continua disponível no editor do livro como qualquer outra, nunca some da lista. Isso espelha a assimetria de `classificarImagem`: erro vira `sem-resposta`, nunca `limpo` nem `suspeito` — aqui, erro vira "sem score", nunca "excluído".
- **Não copiar o dedup em memória.** `classify.ts:21` usa `const inFlight = new Set<string>()` para evitar reprocessar a mesma mídia — o mesmo `docs/superpowers/specs/2026-09-04-moderacao-real-design.md` §4.2 já aponta que isso não protege entre instâncias serverless. Job de curadoria deve reivindicar linhas por `UPDATE ... SET status = 'processing' WHERE status = 'pending' RETURNING id` (claim atômico no banco), não por Set em memória de processo.
- Se o job de curadoria nunca rodar (cron não configurado, `CRON_SECRET` ausente em produção), o pior caso é o casal montar o livro manualmente, exatamente como o produto funciona hoje — degradação para o comportamento atual, nunca para uma tela quebrada.

## 5. Curadoria: controle do casal

A regra é literal: **curadoria propõe, casal decide.** Isso não é um princípio abstrato — o produto já tem dois precedentes de UI que implementam essa mesma ideia em outro contexto, e a proposta aqui é reusar a linguagem, não inventar uma nova:

1. **Selo de recomendado, nunca pré-aplicado.** ADR 0007, sobre o filtro de imagem: *"Os noivos escolhem um recomendado, que ganha selo e primeiro lugar na tira — nunca pré-aplicado. Coerência do acervo por convite, não por imposição."* A mesma regra vale para uma foto sugerida para o livro: ela aparece com um selo de "sugestão" e prioridade visual (primeiras posições na grade, ou destaque no candidato ao slot), mas o slot só é preenchido quando o casal arrasta a foto — nunca por um passo automático que já entrega o spread pronto.
2. **Ocultar é reversível, não é deletar.** `docs/specs/task-020-mapa-de-telas.md` B-05 já descreve "curadoria leve" no álbum do anfitrião como um botão de "ocultar" sobre a grade — o oposto de excluir. Fotos marcadas como prováveis duplicatas ou tremidas pela curadoria devem aparecer com o mesmo tipo de marcação reversível (um badge "possível duplicata"/"desfocada"), nunca desaparecer da lista. O casal pode ignorar o aviso e usar a foto de qualquer forma.
3. **Export continua sendo o gesto explícito.** `docs/product/albora-produto-arquitetura.md` §14.6: "Montar é grátis. Exportar é pago" — a cobrança e o compromisso acontecem no clique de export, sempre do casal. Curadoria nunca dispara export nem "enviar pra impressão" por conta própria.

Na prática de interface: o editor do livro (B-09, slots) abre com um conjunto de slots pré-preenchido pelas fotos de maior score de diversidade/qualidade, cada uma com o selo de sugestão; fotos com sinal de duplicata/tremida ficam visualmente rebaixadas (não removidas) na grade de candidatos ao lado. Toda substituição é um arrastar-e-soltar manual, igual ao fluxo hoje sem curadoria.

## 6. Push: o que o ADR 0015 autoriza

O ADR 0015 (texto completo em `git show e81fa96:docs/adr/0015-push-notifications.md`, ver §1) autoriza:

**Tecnologia:** Firebase Cloud Messaging (FCM) como principal, com **Web Push API como fallback obrigatório** para navegadores que rejeitam Firebase. Justificativa do ADR: o app mobile nativo (ADR 0008) já usaria FCM, unificar reduz complexidade, e Firebase já está no stack para outras peças.

**Exatamente três gatilhos, todos opcionais, todos com opt-in explícito:**

| Gatilho | Quando | Quem recebe | Payload |
|---|---|---|---|
| `interaction_gate_opened` | Admin abre o portão de interação | Convidados que já enviaram ≥1 foto e optaram | `{ type: "interaction_opened", eventName, action: "Voltar ao app" }` |
| `recap_ready` | Álbum pronto para download, ou recap automático 72h pós-evento | Convidados que enviaram foto | `{ type: "recap_ready", eventName, action: "Ver álbum" }` |
| `photo_selected_for_book` | Foto do convidado selecionada para o livro (curador humano ou montagem) | O convidado dono da foto | `{ type: "photo_selected_for_book", eventName, action: "Ver seleção" }` |

**O que fica explicitamente fora, bloqueado no código e não apenas desligado em config:** notificação de reação ou comentário novo, resposta em thread, nova foto de outro convidado, lembrete de upload durante o evento. O próprio ADR justifica: essas notificações aumentam tempo de tela, não aumentam participação — o critério do ADR 0009 §1.

**O que muda em relação ao ADR 0009:** 0009 dizia "notificação continua sem decisão... fica desligado por padrão até existir decisão própria." O 0015 é essa decisão — mas manteve o padrão desligado (opt-in, não opt-out) e restringiu a exatamente três gatilhos. Este spec não amplia esse escopo: nenhum gatilho novo é proposto aqui além dos três já decididos.

## 7. Push: modelo de dado e consentimento

O ADR já especifica a tabela; a migration abaixo segue o padrão de RLS já estabelecido no repositório (`packages/db/migrations/0039_atribuicao_de_compartilhamento.sql`: `event_id` como FK com `ON DELETE CASCADE`, `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`, política `USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid)`), e o precedente de dado PII-adjacente amarrado a `guest_sessions` (`guest_contacts`, `packages/db/migrations/0001_esquema_inicial.sql`, com o comentário `-- PII. Mascarada em log sempre, e apagada pelo job de retencao.`):

```sql
-- 0065 — guest_notification_tokens (ADR 0015)
CREATE TABLE guest_notification_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_session_id    uuid NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  platform            text NOT NULL, -- 'fcm' | 'web_push'
  -- Dado de aparelho, tratado como PII: nunca em log cru.
  token               text NOT NULL,
  opted_in_at         timestamptz NOT NULL,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_notification_tokens FORCE  ROW LEVEL SECURITY;
CREATE POLICY guest_notification_tokens_por_evento ON guest_notification_tokens
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
```

**Consentimento — opt-in duplo, conforme o ADR:**

1. Permissão do browser/OS (controle do sistema, fora do nosso código).
2. Checkbox explícito no fluxo de consentimento, **desmarcado por padrão** — sem os dois, nenhum token é gravado e nenhuma notificação é enviada.

**Opt-out em um toque.** `docs/specs/task-020-mapa-de-telas.md` B-10 já descreve a convenção de interface para isso noutro contexto: "Memórias automáticas opt-in, desligáveis num toque." A mesma convenção deve valer para notificação — um toggle na tela de conta/perfil do convidado (`apps/mobile/app/guest-profile.tsx` já existe como tela de perfil do convidado) que apaga a linha de `guest_notification_tokens`, não apenas marca uma flag.

**Nunca PII no payload.** O ADR é explícito: sem nome, sem e-mail, sem telefone, sem nome de terceiros na foto — só `{ type, eventName, action }`. Isso é compatível com a regra do `CLAUDE.md`: "Nunca logar PII crua" — o token em si (dado de aparelho) segue o mesmo tratamento que `guest_contacts.value`, mascarado em log.

**Expiração e cascade:** token expira 90 dias após criação; deletar o evento deleta os tokens em cascade (`ON DELETE CASCADE` já cobre isso, sem job adicional).

**Gap de implementação real:** nada disso tem onde rodar hoje. `apps/mobile/package.json` não declara `expo-notifications` nem `expo-device` — adicionar essas dependências e o plugin correspondente em `apps/mobile/app.json` é pré-requisito antes de qualquer token FCM existir no app nativo. No web, o service worker (`apps/web/sw/sw.ts`) precisa ganhar um listener de evento `push` — hoje ele só cobre a fila de drenagem.

## 8. Push: gatilhos e degradação

Mapeando os três gatilhos do ADR para pontos reais do código:

- **`interaction_gate_opened`** — o gate já existe como `interacaoAberta`/`modoInteracao` (mencionado no [ADR 0009](../../adr/0009-app-social-do-convidado.md), com a lógica de reação em `packages/core/src/galeria.ts`) e é acionado quando o admin muda `interaction_opens_at`. O disparo de push deve estar amarrado exatamente a essa transição administrativa — nunca a um lembrete repetido.
- **`recap_ready`** — `apps/web/features/my-photos/lib/recap.ts` já computa a lista "ordenadas por engajamento+recência, sem curadoria por IA"; o momento em que essa lista fica pronta (72h pós-evento, por ADR) é o gatilho.
- **`photo_selected_for_book`** — amarrado à ação de confirmação do casal descrita em §5, nunca à sugestão do algoritmo de curadoria. Se o algoritmo sugere e o casal nunca confirma, nenhum convidado é notificado.

**Como degrada, verbatim do próprio ADR:** "Job de envio roda async, fora do request; falha não volta para cliente; retry é best-effort sem SLA. Degradação acontece silenciosamente." Na prática, isso é o mesmo desenho de `retention_jobs` (§4): uma tabela de jobs de envio (`push_dispatch_jobs`, dentro da faixa 0065–0069) com `event_id`, `guest_session_id`, `trigger`, `due_at`, `attempts`, processada por um handler `POST /api/ops/push`, com o mesmo padrão de autenticação `Bearer CRON_SECRET` de `ops-retencao.ts`. A ação que dispara o gatilho (abrir o gate, gerar recap, confirmar foto no livro) só grava a linha do job — nunca aguarda o envio real, nunca falha se o FCM estiver fora do ar.

## 9. Testes

Os dois recursos têm o mesmo risco: sinal probabilístico ou entrega assíncrona parecem, à primeira vista, difíceis de testar sem instabilidade. O padrão do repositório já resolve isso em ambos os casos vizinhos, e a proposta é seguir o mesmo desenho, não inventar um novo:

**Curadoria.** `packages/core/src/album.test.ts` já testa `selecionarParaAlbum`/`ordemDeDescarte` — um algoritmo de descarte determinístico — com fixtures de datas e IDs fixos, sem aleatoriedade. Os três sinais baratos (§3) são funções puras sobre bytes fixos: um teste de hash perceptual roda sobre imagens de fixture conhecidas e afirma a distância de Hamming exata entre um par duplicado e um par diferente; um teste de variância de laplaciano afirma o valor exato sobre uma imagem nítida de fixture e uma borrada de fixture; nenhum dos dois chama rede ou modelo. Para o sinal de diversidade (o único que usa um provedor externo), o teste usa a mesma técnica de injeção de dependência que `apps/web/lib/domain/media/classify.ts` já usa para o classificador de moderação (`ClassifierDependencies` com `classify` injetável) — o provedor real nunca é chamado em teste, um fake devolve um vetor de embedding fixo, e o teste afirma só a matemática de clustering sobre esse vetor.

**Push.** Mesmo padrão de injeção: um teste do job de envio mocka a função de envio FCM/Web Push e afirma três coisas sem nunca abrir uma conexão real — (1) o payload nunca contém campo além de `type`/`eventName`/`action`; (2) nenhum envio acontece sem `opted_in_at` gravado; (3) um teste de lista negativa afirma que reação, comentário e lembrete de upload **nunca** geram uma linha de job, fechando a porta que o ADR 0015 §3 abre como proibida.

## 10. Fora de escopo

- **Agrupamento facial** ("suas fotos" por convidado) fica fora. É tratamento de dado biométrico sob LGPD, em mídia que inclui menores, e exige decisão jurídica antes de técnica.
- Qualquer gatilho de push além dos três do ADR 0015 — reação, comentário, resposta em thread, nova foto de terceiro, lembrete de upload — está bloqueado pelo próprio ADR, não apenas adiado por este spec.
- Toggle de admin para ligar/desligar push por tipo de gatilho — o próprio ADR 0015 marca isso como "futura, MVP é sem toggle".
- Impressão via parceiro (produto separado, §14.7) e qualquer integração com gráfica — fora do escopo de curadoria.

## 11. Riscos

- **Colisão de migration** se outro stream usar a faixa 0065–0069 sem checar `docs/superpowers/specs/2026-09-04-paralelismo-contrato.md` primeiro — mitigado pelo contrato já vigente.
- **Repetir o anti-padrão de dedup em memória** (`inFlight` Set) que o próprio time já identificou como defeito em `docs/superpowers/specs/2026-09-04-moderacao-real-design.md` §4.2 — o job de curadoria e o de push devem reivindicar linhas no banco, não em memória de processo.
- **Sinal de qualidade errado excluindo foto boa.** Hash perceptual e variância de laplaciano são heurísticas; podem marcar uma foto artística desfocada de propósito como "tremida". Mitigado por design: nenhum sinal exclui sozinho (§3, §5) — só rebaixa visualmente, sempre reversível pelo casal.
- **Tensão de identidade persistente** (ADR 0015 §5): o token de push conecta sessões do mesmo convidado entre dias, algo que o ADR 0004 buscava evitar. O próprio ADR 0015 assume esse custo explicitamente; este spec não amplia o alcance do token além de envio de push.
- **Dependência de infraestrutura que ainda não existe.** Sem `wrangler.toml` nem Cron Trigger configurado (sub-projeto A), os handlers `/api/ops/curadoria` e `/api/ops/push` dependem de disparo externo manual até esse projeto avançar — mesma situação que `/api/ops/retencao` já enfrenta hoje.
- **Gap de dependência no app mobile.** `expo-notifications`/`expo-device` não estão instalados; declarar essas dependências e configurar o plugin em `app.json` é trabalho real antes de qualquer token FCM nativo funcionar.
- **Risco regulatório citado pelo próprio ADR 0015**: duplo opt-in pode ser questionado como coercitivo se o checkbox não for claramente do mesmo tamanho e peso visual do consentimento de captura.

## 12. Critério de sucesso

**Curadoria:** o casal abre o editor do livro e vê um conjunto de fotos pré-sugerido sem ter revisado 1.500 fotos uma a uma; duplicatas e fotos tremidas aparecem marcadas, não removidas; toda substituição continua sendo um arrastar-e-soltar manual; nenhum export acontece sem clique explícito do casal. Testável: nenhuma foto some da lista de candidatos por causa de erro de cálculo de sinal (ausência de score ≠ exclusão); o algoritmo nunca chama uma rota de export.

**Push:** as três notificações do ADR 0015 chegam nos gatilhos certos, com opt-in duplo verificado antes do envio, e nenhuma notificação fora da lista de três é sequer enfileirada — testável por um teste de lista negativa que cobre reação, comentário e lembrete de upload. Queda do FCM ou do Web Push não afeta upload, telão, feed ou qualquer parte do caminho crítico — testável por um teste que derruba o mock de envio e afirma que a ação que disparou o gatilho (abrir gate, gerar recap, confirmar livro) completa normalmente mesmo assim.
