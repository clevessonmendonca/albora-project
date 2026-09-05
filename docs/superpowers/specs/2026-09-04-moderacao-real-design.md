# Moderação real — um classificador que olha o conteúdo, não o formato

**Data:** 2026-09-04
**Status:** revisão 2 — provedor decidido pelo dono (OpenAI Moderation), moderação movida para o pipeline de mídia
**Faixa de migration reservada:** 0062–0064

## 1. O problema

A moderação do Albora foi desenhada com cuidado e está quase toda pronta. O motor de decisão em `packages/core/src/moderacao.ts` acerta o difícil: `sem-resposta` nunca vira `limpo`; o telão fecha quando não há sinal e a galeria abre; duas denúncias seguram a parede (uma só entregaria o telão a qualquer desafeto); pânico e modo endurecido existem; o anfitrião pode liberar falso positivo; a auditoria recebe id opaco, nunca nome.

Falta uma peça, e é a peça que decide se o resto serve para alguma coisa.

`provedorHeuristico`, em `packages/core/src/classificador-imagem.ts`, é isto:

```ts
async classificar({ bytes }) {
  if (bytes.byteLength < 16) return "sem-resposta";
  return detectarTipo(bytes) === null ? "sem-resposta" : "limpo";
}
```

Ele responde *"estes bytes têm assinatura de imagem conhecida?"*. Não responde *"esta imagem é apropriada?"*. Consequência direta: **toda foto que é um JPEG válido volta `limpo`**, e `limpo` é exatamente o veredicto que libera o telão. O gate fail-closed que o resto do sistema constrói com tanto cuidado está, na prática, sempre aberto.

O modo de falha não é abstrato: 150 convidados soltos subindo foto num casamento, e o conteúdo impróprio aparece projetado na parede, em tamanho grande, na frente da família. É irreversível na experiência — tirar da parede depois não desfaz quem viu.

## 2. O que este projeto NÃO é

- **Não é rearquitetar moderação.** A porta, o job assíncrono, o timeout, a política de falha e o motor de decisão ficam como estão. Este projeto preenche um provedor.
- **Não é IA generativa.** Nada toca o pixel da mídia do convidado. [ADR 0007](../../adr/0007-ai-policy-luts-not-generation.md) autoriza classificação e proíbe geração; isto é classificação.
- **Não é reconhecimento facial.** Nenhuma identificação de pessoa, nenhum agrupamento por rosto. Isso é dado biométrico sob LGPD e é decisão jurídica separada.
- **Não é moderação de comentário.** Já existe, em `apps/web/lib/domain/moderation/classify-comment.ts`.

## 3. O que já existe e não muda

| Peça | Onde | Papel |
|---|---|---|
| Motor de decisão | `packages/core/src/moderacao.ts` | `decidirExibicao`, `precisaDeRevisao`, `motivoDaFila` |
| Porta do classificador | `packages/core/src/classificador-imagem.ts` | `ProvedorDeClassificadorDeImagem`, timeout de 2.500ms, erro → `sem-resposta` |
| Job assíncrono | `apps/web/lib/domain/media/classify.ts` | `classifyPendingForEvent`, com dependências injetadas |
| Persistência | `packages/db/src/classificador-db.ts` | `listPendingClassifierUploads`, `saveUploadVerdict` — primeiro escritor ganha |
| Schema | `packages/db/migrations/0011_moderacao.sql` | `uploads.classifier_verdict`, `released_by_host`, `events.panic`, `events.hardened` |
| Fila de revisão | `packages/db/src/moderation-review-db.ts`, `apps/web/features/admin/components/client/review-queue.tsx` | O anfitrião revisa e libera |

**Os três vereditos permanecem exatamente três.** `limpo`, `suspeito`, `sem-resposta`. Todo o motor de decisão é chaveado neles; acrescentar um quarto obrigaria a reescrever `decidirExibicao`, `precisaDeRevisao` e `motivoDaFila` de uma vez. O grau de confiança do modelo vira metadado, não veredicto novo.

## 4. Dois defeitos que a varredura encontrou de passagem

Não são o objetivo deste projeto, mas afetam diretamente se a moderação funciona, então entram no escopo.

**4.1 A classificação só acontece se alguém estiver olhando o telão.** `classifyMediaAfter` é chamado de `apps/web/lib/api/handlers/wall.ts:29` — ou seja, o gatilho é o poll do telão. Num evento sem telão aberto, ou antes de alguém abrir, nada é classificado. A galeria publica com `classifier_verdict = NULL` e ninguém percebe. O gate depende de um efeito colateral de outra superfície.

**4.2 A deduplicação de execução é em memória de processo.** `const inFlight = new Set<string>()` em `classify.ts:21` só protege dentro de uma instância. Em serverless com múltiplas instâncias, N instâncias classificam o mesmo lote em paralelo. O `WHERE classifier_verdict IS NULL` em `classificador-db.ts:53` impede sobrescrita — então não corrompe — mas gasta N vezes o custo do provedor. Com provedor pago, isso é dinheiro real.

## 5. O provedor — decidido

**Decisão do dono: OpenAI Moderation para o MVP, atrás da porta `ProvedorDeClassificadorDeImagem` que já existe.**

O que essa escolha compra: um classificador que de fato avalia conteúdo (sexual, violência, automutilação) sem custo de API no início, sem modelo para manter e sem infraestrutura de inferência própria — que é o que travaria a entrega, já que o produto sequer publicou em produção ainda.

O que ela custa, e o que precisa existir antes do primeiro evento real:

**Verificar antes de implementar, não assumir.** Preço, limite de taxa, suporte a imagem e política de retenção/treino da API de moderação mudam. A implementação começa confirmando os termos vigentes na documentação oficial. Este documento não afirma que é gratuita nem que o conteúdo não é retido — afirma que isso é a primeira coisa a checar.

**Três pendências de conformidade, não de código:**

| Pendência | Por quê |
|---|---|
| DPA (contrato de tratamento de dados) com o provedor | Mídia de convidado passa a ser tratada por terceiro |
| Linha explícita na política de privacidade | O convidado consente com o uso da foto no evento; envio para moderação externa é tratamento que precisa estar declarado |
| Base legal para transferência internacional (LGPD Art. 33) | O provedor processa fora do Brasil |

Isso não é zelo excessivo. O `CLAUDE.md` cita o STJ (REsp 1.628.700/MG): dano à imagem de menor publicada sem autorização do representante legal é `in re ipsa`, **sem exigir finalidade comercial** — e este produto fotografa festas onde há criança. "Era só para moderar" não é defesa se o tratamento não estava declarado.

**O que reduz a exposição, e já é o comportamento do código:** o que sai é o **thumb**, derivado e pequeno (`chaveThumbDeFull`), nunca o full. Não é o acervo que atravessa a fronteira; é uma miniatura, uma vez por mídia, para decidir um booleano.

**A porta é o que impede casamento com o fornecedor.** `ProvedorDeClassificadorDeImagem` já existe e `provedorDeImagemDoAmbiente` já seleciona por variável de ambiente. OpenAI entra como mais um nome ao lado de `heuristico`, `silencio` e `stub`. Trocar por Google SafeSearch, por um modelo self-hosted, ou por uma composição dos dois, é mudar uma string de ambiente e escrever um arquivo — nunca tocar o motor de decisão. Moderação não vira dependência estrutural do domínio.

**Caminho de saída já mapeado**, para quando o volume ou a conformidade pedirem: modelo local (por exemplo um NSFW de licença permissiva) resolvendo as duas pontas óbvias, e o provedor externo consultado só na faixa incerta. Não é trabalho desta fase; é a razão de a porta existir.

## 6. Calibragem — a parte que não pode ser no olho

Um classificador sem limiar medido é palpite com aparência de rigor. Duas forças opostas:

- Limiar frouxo → falso negativo → conteúdo impróprio na parede. Custo alto e irreversível.
- Limiar apertado → falso positivo → fila de revisão inunda → **o anfitrião para de revisar**. E um anfitrião que parou de revisar é pior que limiar frouxo, porque agora nada é revisado e todo mundo acha que está.

O segundo é o modo de falha que costuma ser subestimado. A fila tem que caber numa festa: o anfitrião está na própria festa, não numa mesa de operação.

Então o projeto entrega, junto com o provedor:

- **Conjunto de avaliação rotulado**, versionado no repo, com imagens sintéticas e de domínio público — **nunca** mídia real de convidado de evento real. Mídia de convidado não vira insumo de desenvolvimento, do mesmo modo que não vira material de marketing.
- **Métrica declarada** antes de escolher limiar: taxa de falso negativo na classe adversa, e volume esperado de fila por 1.000 fotos.
- **Limiar escolhido por medição**, com o número registrado no spec de implementação e um teste que trava a regressão.
- **Orçamento de fila:** um alvo explícito de quantos itens por 100 fotos é aceitável mandar para revisão. Se o limiar escolhido estoura esse alvo, o limiar está errado, mesmo que a acurácia pareça boa.

## 7. Vídeo

O caminho hoje trata imagem. `classificarImagem` recebe `{ bytes, mime }` e `provedorHeuristico` só chama `detectarTipo`. O telão exibe vídeo, e o CLAUDE.md diz que a regra de não cortar na vertical vale igual para vídeo — o que implica que vídeo chega à parede.

Vídeo não classificado herda `sem-resposta`, e `sem-resposta` fecha o telão. Ou seja: **hoje o comportamento é seguro, mas ao custo de nenhum vídeo aparecer**. Isso precisa ser confirmado contra o código do telão antes da implementação; se vídeo de fato passa, é um furo.

Desenho proposto: extrair um quadro (o do meio, não o primeiro — primeiro quadro costuma ser preto) e classificar esse quadro com o mesmo provedor. Um quadro não cobre tudo, e o spec diz isso na cara em vez de fingir que cobre: para vídeo, o gate é mais fraco, e a compensação é a denúncia e o modo endurecido.

## 8. Como isto degrada

Regra não negociável do projeto: o caminho de upload depende de exatamente dois sistemas, object storage e Postgres; todo o resto degrada e nunca falha.

O desenho atual já respeita isso e continua respeitando:

- O classificador roda **depois** do upload, nunca dentro dele.
- Timeout de 2.500ms; estouro vira `sem-resposta`.
- Provedor indisponível vira `sem-resposta`.
- `sem-resposta` publica na galeria e segura o telão — o lado ativo continua funcionando, o lado passivo fecha.
- Nenhuma falha do classificador propaga para o `PUT` presigned.

O que muda: um provedor real tem latência e modo de falha maiores que uma checagem de bytes. Por isso o **thumb**, não o full — já é o que o código faz (`chaveThumbDeFull`), e é o que mantém o custo e o tempo dentro do orçamento.

## 9. Correções que entram junto

### 9.1 Moderação pertence ao pipeline da mídia, não ao telão

Esta é a correção arquitetural do documento, e ela é conceitual antes de ser técnica.

Hoje:

```
telão aberto → poll → classificação
```

Logo, evento sem telão aberto é evento com foto não classificada. A moderação virou efeito colateral de uma superfície de exibição.

Passa a ser:

```
upload confirmado → pipeline de mídia → moderação → status
                                                      ├── telão
                                                      ├── feed
                                                      ├── galeria
                                                      └── livro
```

O disparo passa a ser o **confirm do upload**, com um job periódico por evento ativo como rede para o que escapar. O gatilho do telão permanece apenas como reforço — nunca como única porta. Todo consumidor lê o mesmo status; nenhum consumidor produz o status.

### 9.2 Estado de moderação vira tabela, não memória de processo

O `Set` em memória de `classify.ts:21` não sobrevive a mais de uma instância: N workers classificam o mesmo lote e o custo do provedor é pago N vezes. O `WHERE classifier_verdict IS NULL` impede corrupção, não desperdício.

Substituição — tabela própria com claim explícito:

```sql
CREATE TABLE photo_moderation (
  upload_id   uuid PRIMARY KEY REFERENCES uploads(id) ON DELETE CASCADE,
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('pending','claimed','done','failed')),
  provider    text,
  attempts    int  NOT NULL DEFAULT 0,
  claimed_at  timestamptz,
  completed_at timestamptz,
  result      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photo_moderation_pendentes ON photo_moderation (event_id, status);

ALTER TABLE photo_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_moderation FORCE  ROW LEVEL SECURITY;
CREATE POLICY isolamento_evento ON photo_moderation
  USING (event_id = NULLIF(current_setting('app.event_id', true), '')::uuid);
```

**O `event_id` e a RLS não são opcionais.** A regra do projeto é que toda tabela com dado de evento tem `event_id` NOT NULL e RLS **forçada** — `ENABLE` sozinho não vale para o dono da tabela, e a aplicação conecta como dono. O `NULLIF` é obrigatório porque, após o `SET LOCAL`, o GUC volta a string vazia e `''::uuid` estoura em vez de falhar fechado. Sem isso, a tabela de moderação seria a única porta do sistema sem isolamento entre eventos.

`result` guarda o retorno bruto do provedor — categorias e escores — que é o insumo para recalibrar limiar depois sem reclassificar tudo. **Nunca** guarda a imagem, nem qualquer PII.

O claim é `UPDATE ... WHERE status = 'pending' RETURNING`, num só statement: primeiro escritor ganha, sem corrida. Onde precisar de lock, `pg_advisory_xact_lock` por evento — transacional, nunca de sessão, como o resto do projeto.

`attempts` existe para o que falha: o provedor cai, o registro volta a `pending` com contador, e depois de N tentativas vira `failed` — que o motor de decisão lê como `sem-resposta`, ou seja, galeria abre e telão fecha. O comportamento seguro continua sendo o padrão.

## 10. Testes

- **Motor de decisão:** já tem cobertura em `moderacao.test.ts`; não regride.
- **Porta:** provedor que estoura o tempo vira `sem-resposta`; provedor que lança vira `sem-resposta`; provedor que devolve lixo vira `sem-resposta`.
- **Provedor real:** avaliado contra o conjunto rotulado, com limiar travado por teste. Não é teste de acurácia absoluta — é teste de regressão do limiar escolhido.
- **Instabilidade:** nenhum teste depende de rede. O provedor real é testado com bytes fixos do conjunto versionado.
- **Fila:** o volume de fila por 100 fotos do conjunto de avaliação é medido e travado.

## 11. Colisão

**POSSUI:** `packages/moderation/**` (pacote novo, se o modelo local exigir dependência que não cabe em `core`), `packages/core/src/classificador-imagem.ts`, `apps/web/lib/domain/media/classify.ts`, `packages/db/src/classificador-db.ts`.
**NÃO TOCA:** `packages/application/**` e `packages/ui-web/src/index.ts` — são do stream do console interno.
**Migration:** faixa 0062–0064.
**Atenção:** a fila de revisão vive em `apps/web/features/admin/**`, que é território do agente do admin dash. Mudança de UI da fila é **pedido** para aquele stream, não trabalho deste.

## 12. Riscos

- **A escolha do provedor é decisão do dono** e muda contrato, privacidade e custo. Enquanto não houver decisão, a implementação para no limite da porta.
- **Modelo local pode não caber no runtime de destino.** Depende do provedor de hospedagem, que ainda não foi para produção. Se o alvo for Workers, há limite de tamanho e de CPU que precisa ser verificado antes de escolher o modelo — não depois.
- **Conjunto de avaliação é trabalho chato e é o que dá validade ao resto.** Se ele for pulado, o limiar vira chute e o projeto entrega a sensação de segurança sem a segurança.
- **Vídeo pode estar passando sem gate.** Precisa de verificação antes de qualquer implementação.

## 13. Critério de sucesso

- Uma imagem claramente imprópria do conjunto de avaliação recebe `suspeito` e **não** aparece no telão.
- Uma foto comum de festa recebe `limpo` e aparece sem intervenção.
- Provedor fora do ar não impede nenhum upload, e o telão fecha em vez de abrir.
- A fila de revisão que o anfitrião recebe cabe no orçamento declarado — ele consegue revisar durante a própria festa.
- Nenhuma mídia de convidado real foi usada para desenvolver ou avaliar o classificador.
- Vídeo tem comportamento conhecido e declarado, seja gate próprio, seja bloqueio explícito.
