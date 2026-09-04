# Moderação real — um classificador que olha o conteúdo, não o formato

**Data:** 2026-09-04
**Status:** design proposto, aguardando revisão do dono
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

## 5. A decisão central: qual provedor

Três caminhos, com o trade-off que importa sendo **onde a mídia do convidado passa**.

**A. API de visão de terceiro** (Rekognition Moderation, Google Vision SafeSearch, Azure Content Safety). Acurácia madura, sem modelo para manter, custo por imagem. Preço: a mídia do convidado entra no pipeline de um fornecedor externo, com termos dele. O ADR 0007 fecha assim a discussão sobre geração — *"sem isso, a foto nunca sai do R2"*. Moderação é explicitamente sancionada pela arquitetura §9, mas a exposição continua real e precisa de contrato de tratamento de dados e menção na política de privacidade.

**B. Modelo local no thumb.** Roda no próprio worker/job, sem terceiro, custo marginal zero por imagem, mídia nunca sai da nossa infra. Acurácia menor que a das APIs maduras, e alguém tem que escolher e versionar o modelo.

**C. Dois níveis: local primeiro, terceiro só na faixa incerta.** O modelo local resolve os casos claros nas duas pontas; só o meio ambíguo — que é minoria — vai para a API. Corta custo e exposição de uma vez.

**Recomendação: começar por B, com a porta pronta para C.**

O motivo é a assimetria do erro, não a economia. O produto já tem uma rede: falso positivo é recuperável (a foto vai para a fila e o anfitrião libera em um toque); falso negativo não é (já apareceu na parede). Um modelo local com limiar deslocado para o lado seguro captura a cauda óbvia, que é onde mora o risco real, sem colocar a mídia de nenhum convidado dentro de um terceiro na primeira versão. E como o thumb já é derivado e pequeno, o dia em que C fizer sentido, o que sai daqui é um thumb de faixa incerta — não o acervo.

**Isto é decisão do dono, não minha.** Se a escolha for A desde já, o desenho abaixo não muda: só troca a implementação atrás da mesma porta, e ganha uma seção de contrato e política de privacidade.

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

**9.1 Gatilho próprio.** A classificação deixa de depender do poll do telão. Passa a ter disparo próprio, no confirm do upload e/ou num job periódico por evento ativo. O gatilho do telão pode ficar como reforço, não como única porta.

**9.2 Dedup entre instâncias.** O `Set` em memória vira `pg_advisory_xact_lock` por evento — travamento transacional, nunca de sessão, como o resto do projeto já faz. Isso resolve o desperdício de custo com múltiplas instâncias.

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
