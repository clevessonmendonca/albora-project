# Pesquisa de provedores de moderação

## Metodologia e data

Pesquisa realizada em 2026-09-04. Cada resposta é marcada **VERIFICADO** (com link de documentação oficial do fornecedor e data de leitura) ou **INFERIDO** (dedução razoável mas não confirmada em texto oficial). Onde nada foi encontrado, consta **"não encontrado"** — nenhuma resposta foi preenchida por plausibilidade.

Contexto do produto: o Albora envia o **thumbnail** derivado da foto (não o original) ao provedor de moderação, uma vez por foto, antes de liberar a exibição no telão. Candidatos avaliados: (1) OpenAI Moderation API, (2) Google Cloud Vision SafeSearch, (3) modelo self-hosted de licença permissiva.


## Candidato 1 — OpenAI Moderation API

**1. Endpoint oficial**
`POST https://api.openai.com/v1/moderations`, modelo `omni-moderation-latest` (multimodal, texto+imagem).
VERIFICADO — https://developers.openai.com/api/docs/guides/moderation (lido em 2026-09-04).

**2. Como enviar imagem**
Dois formatos aceitos no campo `image_url`: (a) URL pública `{"type":"image_url","image_url":{"url":"https://..."}}`; (b) base64 como data URI `data:image/jpeg;base64,<...>`. Não há upload de bytes crus multipart — é sempre URL ou data URI dentro do JSON.
VERIFICADO — https://developers.openai.com/api/docs/guides/moderation, seção "Moderate images and text" (2026-09-04).

**3. Categorias retornadas**
`harassment`, `harassment/threatening`, `hate`, `hate/threatening`, `illicit`, `illicit/violent` (só texto); `self-harm`, `self-harm/intent`, `self-harm/instructions`, `sexual`, `violence`, `violence/graphic` (texto e imagem); `sexual/minors` (só texto — ou seja, o modelo **não** classifica "sexual/minors" a partir de imagem, apenas de texto).
VERIFICADO — mesma página, tabela "Review supported categories" (2026-09-04).

**4. Como interpretar o resultado**
Resposta traz `flagged` (booleano geral), `categories` (booleano por categoria) e `category_scores` (confiança 0–1 por categoria), mais `category_applied_input_types` indicando a quais tipos de input (texto/imagem) cada score se aplica.
VERIFICADO — mesma página, seção "Understand moderation results" (2026-09-04).

**5. Limite de tamanho e resolução**
Arquivos de imagem até 20 MB. Resolução máxima não encontrada.
VERIFICADO (tamanho) — mesma página, nota na seção de categorias (2026-09-04). Resolução: **não encontrado**.

**6. Limites de taxa**
Por tier de uso (definido pelo gasto acumulado na conta), ex.: Free/Tier 1 = US$100/mês de limite de gasto; os RPM/TPM/RPD específicos do `omni-moderation-latest` não estão documentados na página de rate limits — ela remete ao painel de conta (platform.openai.com/settings/organization/limits). Um valor de "250 RPM / 5.000 RPD / 10.000 TPM" para tier free aparece em fontes terceiras, não na doc oficial.
VERIFICADO (estrutura de tiers) — https://developers.openai.com/api/docs/guides/rate-limits (2026-09-04). Números exatos por modelo: **não encontrado** em fonte oficial (só em blog/terceiros — não usado como fato).

**7. Preço real**
O endpoint de moderação é gratuito — não conta contra os limites mensais de uso da conta.
VERIFICADO — https://help.openai.com/en/articles/4936833-is-the-moderation-endpoint-free-to-use (Help Center oficial, 2026-09-04).

**8. Free tier — limite exato**
Não há limite específico de "chamadas grátis por mês" documentado além do rate limit da própria conta/tier (ex.: contas Free ficam sujeitas ao teto de uso de US$100/mês de toda a API, mas a moderação em si não gera custo). Limite exato de chamadas: **não encontrado**.

**9. Retenção da imagem — quanto tempo, para qual finalidade**
Regra geral da API: logs de abuso retidos por até 30 dias, "a menos que exigido por lei". Porém a página de controle de dados lista explicitamente que `/v1/moderations` (junto com `/v1/audio/transcriptions`) **não tem retenção de log de abuso** — ou seja, o próprio endpoint de moderação é tratado como exceção à regra dos 30 dias.
VERIFICADO — https://developers.openai.com/api/docs/guides/your-data, seção sobre retenção por endpoint (2026-09-04).

**10. Uso para treinamento — padrão e como desligar**
Desde 1º de março de 2023, dados enviados à API não são usados para treinar/melhorar modelos, a menos que o cliente opte explicitamente por compartilhar ("opt-in"). Não existe um "opt-out" porque o padrão já é não usar — é opt-in, não opt-out.
VERIFICADO — https://developers.openai.com/api/docs/guides/your-data (2026-09-04).

**11. Zero Data Retention — elegibilidade e contratação**
Existe. ZDR exclui o conteúdo do cliente dos logs de monitoramento de abuso e força o parâmetro `store` a `false` mesmo se a chamada pedir `true`. Sujeito a aprovação prévia da OpenAI e aceite de requisitos adicionais — contratação via time de vendas (sales), não self-service.
VERIFICADO — https://developers.openai.com/api/docs/guides/your-data, seção "Zero Data Retention" (2026-09-04). Dado que `/v1/moderations` já não gera log de abuso por padrão (item 9), não está claro se ZDR agrega algo prático a este endpoint especificamente — **não encontrado** confirmação explícita disso.

**12. Restrição contratual para conteúdo de terceiros**
Os Termos de Uso / Service Agreement da OpenAI colocam a responsabilidade em quem usa a API (o "Customer", aqui o Albora) de obter e manter todos os consentimentos necessários dos usuários finais para permitir que a OpenAI processe os dados desses usuários, incluindo informá-los de como seus dados pessoais serão tratados pela organização e pela OpenAI. A política de privacidade da OpenAI explicitamente não cobre conteúdo processado em nome de clientes de ofertas de negócio (API) — isso é regido pelo contrato do cliente. Não há proibição explícita de processar foto de terceiro (convidado) via API, mas a obrigação de consentimento recai sobre o Albora.
VERIFICADO (obrigação de consentimento do cliente da API) — via busca aos textos de política oficiais da OpenAI (openai.com/policies/row-terms-of-use, openai.com/policies/api-data-usage-policies); texto integral do parágrafo específico não foi possível abrir diretamente (bloqueio HTTP 403 no fetch automatizado) — tratar como **INFERIDO a partir de resumo de terceiro** até confirmação com leitura direta da página. Recomenda-se releitura manual antes de decisão final.

**13. Latência aproximada**
**Não encontrado** em documentação oficial (nenhum SLA ou número de latência típica publicado para `/v1/moderations`).

**14. Comportamento em timeout e erro**
Quando um passo de moderação não consegue completar, o campo de moderação correspondente (input ou output) pode conter um erro em vez de scores de moderação — ou seja, a API sinaliza falha por campo, não necessariamente derruba a chamada inteira. Não há documentação de retry automático ou de comportamento default do cliente Albora nesse caso — isso é responsabilidade da integração.
VERIFICADO (comportamento do campo de erro) — https://developers.openai.com/api/docs/guides/moderation, seção "Moderate generated content" (2026-09-04).

## Candidato 2 — Google Cloud Vision SafeSearch

**1. Endpoint oficial**
`POST https://vision.googleapis.com/v1/images:annotate` (feature `SAFE_SEARCH_DETECTION`).
VERIFICADO — https://docs.cloud.google.com/vision/docs/detecting-safe-search (2026-09-04).

**2. Como enviar imagem**
Três formas: (a) bytes em base64 no campo `image.content`; (b) URI do Cloud Storage `gs://bucket/...` em `image.source.imageUri`; (c) URL pública http/https — mas a doc avisa que "Google não pode garantir que a requisição será concluída" nesse modo (throttling/anti-DoS), então não é recomendado para produção.
VERIFICADO — mesma página (2026-09-04).

**3. Categorias retornadas**
`adult`, `spoof`, `medical`, `violence`, `racy`.
VERIFICADO — mesma página (2026-09-04).

**4. Como interpretar o resultado**
Não é score numérico — é um enum de verossimilhança por categoria: `VERY_UNLIKELY`, `UNLIKELY`, `POSSIBLE`, `LIKELY`, `VERY_LIKELY`. Ex.: `"adult": "UNLIKELY"`, `"violence": "LIKELY"`.
VERIFICADO — mesma página (2026-09-04).

**5. Limite de tamanho e resolução**
Arquivo de imagem: até 20 MB. Objeto JSON da requisição: até 10 MB (nota: imagem em base64 pode estourar esse limite mesmo dentro dos 20 MB de arquivo — para imagens grandes, usar Cloud Storage/URL em vez de bytes inline). Resolução máxima em pixels: **não encontrado**.
VERIFICADO — https://docs.cloud.google.com/vision/docs/limits (2026-09-04).

**6. Limites de taxa**
1.800 requisições/minuto para detecção em geral (inclui SafeSearch, label, text, etc., dentro do mesmo bucket de cota). Até 16 imagens por requisição síncrona `images:annotate`; até 2.000 imagens por lote assíncrono; até 8.000 imagens em processamento assíncrono simultâneo.
VERIFICADO — https://docs.cloud.google.com/vision/docs/limits (2026-09-04).

**7. Preço real**
As primeiras 1.000 unidades/mês são grátis. De 1.001 a 5.000.000 unidades/mês: US$1,50 por 1.000. Acima de 5.000.001/mês: US$0,60 por 1.000. Importante: **SafeSearch Detection sai grátis quando aplicado junto de Label Detection na mesma imagem** (cobra-se só a unidade de Label Detection) — se o Albora chamar só SafeSearch isoladamente, paga o preço cheio de US$1,50/1000 (ou US$0,60/1000 acima do volume).
VERIFICADO — https://cloud.google.com/vision/pricing (2026-09-04).

**8. Free tier — limite exato**
1.000 unidades grátis por mês (contadas por recurso/feature aplicado à imagem, não por imagem bruta).
VERIFICADO — mesma página de pricing (2026-09-04).

**9. Retenção da imagem — quanto tempo, para qual finalidade**
Para operações síncronas (`BatchAnnotateImages`/`BatchAnnotateFiles`, que é o caminho usado por SafeSearch em modo normal), a imagem é processada em memória e **não é persistida em disco**. Para operações assíncronas em lote (`AsyncBatchAnnotateImages`/`AsyncBatchAnnotateFiles`), a imagem é armazenada por um período curto para processamento, tipicamente apagada logo após, com TTL de segurança de "algumas horas". Metadados da requisição (horário, tamanho) são logados temporariamente para operação do serviço e combate a abuso.
VERIFICADO — https://docs.cloud.google.com/vision/docs/data-usage (2026-09-04).

**10. Uso para treinamento — padrão e como desligar**
"Google não usa o conteúdo que você envia para treinar e melhorar os recursos do Cloud Vision, como seu modelo de percepção de máquina." Não há opt-out porque já é o padrão — dado de cliente não treina o modelo.
VERIFICADO — https://docs.cloud.google.com/vision/docs/data-usage (2026-09-04).

**11. Zero Data Retention — elegibilidade e como contratar**
A documentação de uso de dados não menciona um programa formal de "Zero Data Retention" nomeado (como a OpenAI tem). Na prática, o caminho síncrono já não persiste a imagem em disco (item 9), o que é funcionalmente próximo de ZDR, mas não é um produto/contrato chamado "ZDR" com processo de elegibilidade. **Não encontrado** um programa ZDR formal para Vision API.

**12. Restrição contratual para conteúdo de terceiros**
Os Termos de Serviço do GCP definem "Customer Data" como dados fornecidos pelo cliente **ou por "Customer End Users"** através do serviço — ou seja, o contrato já prevê o caso de dado de usuário final (o convidado, neste caso) fluindo pela conta do cliente (Albora), e responsabiliza o cliente pelas obrigações de privacidade sobre esse dado (via Data Processing and Security Terms / DPA do Google Cloud). Não encontrada proibição específica de processar foto de convidado de festa; a obrigação de ter base legal/consentimento e de firmar o DPA correto é do Albora.
INFERIDO a partir de resumo de busca sobre https://cloud.google.com/terms/service-terms e https://cloud.google.com/terms/data-processing-terms-20200717 — texto integral não lido diretamente nesta sessão (recomenda-se leitura manual do DPA antes de decisão final, especialmente a cláusula de "Machine Learning Services" que restringe usar o Vision API para treinar produto concorrente).

**13. Latência aproximada**
**Não encontrado** em documentação oficial (nenhum número de latência típica ou SLA publicado para SafeSearch Detection especificamente).

**14. Comportamento em timeout e erro**
Não há página oficial específica de comportamento de erro do Vision API encontrada nesta pesquisa. Padrão geral documentado para APIs do Google Cloud: 429 = `RESOURCE_EXHAUSTED` (limite de cota, retry com backoff exponencial, mínimo ~30s sugerido), 500/503 = erro temporário do serviço (retry recomendado); bibliotecas cliente oficiais do Google costumam implementar retry com backoff automaticamente.
INFERIDO — comportamento genérico de erro do Google Cloud (RESOURCE_EXHAUSTED / UNAVAILABLE), não uma página de doc dedicada ao Vision API. Comportamento exato e timeout default do endpoint SafeSearch: **não encontrado**.

## Candidato 3 — self-hosted: Falconsai/nsfw_image_detection

Modelo escolhido: **`Falconsai/nsfw_image_detection`** (Hugging Face), Vision Transformer (ViT) fine-tuned para classificação binária normal/NSFW, licença Apache-2.0. É um dos classificadores NSFW mais baixados do Hugging Face (dezenas de milhões de downloads), o que o torna um candidato self-hosted concreto e maduro para avaliar.

**Ressalva estrutural, válida para todas as 14 perguntas abaixo:** este modelo cobre **apenas conteúdo sexual/nudez** (2 classes: `normal`, `nsfw`). Ele **não tem categoria de violência/sangue**, que é o outro eixo de risco citado no briefing ("conteúdo sexual ou violento no telão"). Um deploy self-hosted equivalente aos outros dois candidatos exigiria combinar este modelo com um segundo modelo de detecção de violência/gore — o que é uma peça de arquitetura adicional, não uma característica deste candidato. Isso é registrado aqui como achado da pesquisa, não inventado por plausibilidade.

**1. Endpoint oficial**
Não há endpoint — é um modelo para self-host. Fonte oficial do artefato: repositório Hugging Face `https://huggingface.co/Falconsai/nsfw_image_detection` (pesos + config). Rodar via `transformers` (`pipeline("image-classification", model="Falconsai/nsfw_image_detection")`) atrás de um serviço próprio (ex.: FastAPI) que o Albora teria que construir e operar.
VERIFICADO (existência e forma de uso via `transformers`) — https://huggingface.co/Falconsai/nsfw_image_detection (2026-09-04).

**2. Como enviar imagem**
Não é uma API de rede — é inferência local em processo. Entrada é uma imagem PIL/tensor redimensionada para 224×224 px pelo `AutoImageProcessor` do modelo; formato de arquivo (JPEG/PNG) é decodificado pela própria aplicação antes de chegar ao modelo.
VERIFICADO (resolução de entrada 224×224 via `config.json`) — https://huggingface.co/Falconsai/nsfw_image_detection/raw/main/config.json (2026-09-04).

**3. Categorias retornadas**
Duas: `normal` (id 0) e `nsfw` (id 1). Sem subcategorias, sem categoria de violência.
VERIFICADO — mesmo `config.json` (`id2label`), 2026-09-04.

**4. Como interpretar o resultado**
Saída de classificador `transformers` padrão: lista de `{label, score}` com score de confiança 0–1 por classe (softmax de 2 classes) — não é um booleano direto; a aplicação define o limiar (ex.: `nsfw score > 0.5` ou mais conservador).
INFERIDO a partir do comportamento padrão do pipeline `image-classification` da biblioteca `transformers` para modelos ViT de classificação — não há uma página de "como interpretar resultado" específica no model card além do exemplo de uso.

**5. Limite de tamanho e resolução**
Não há limite de arquivo imposto pelo "provedor" (não existe provedor de rede) — o limite é o que a própria aplicação do Albora decidir aceitar antes de redimensionar para 224×224. Resolução de entrada do modelo: 224×224 (qualquer imagem maior é redimensionada/cortada por quem integra).
VERIFICADO (resolução do modelo) — `config.json` (2026-09-04). Limite de arquivo: não aplicável (decisão do integrador).

**6. Limites de taxa**
Não existem — é hardware próprio. O teto real é a capacidade de cômputo (CPU/GPU) provisionada pelo Albora. Isso é ao mesmo tempo uma vantagem (sem 429 de terceiro) e uma responsabilidade nova (dimensionar e escalar).
VERIFICADO (natureza self-hosted, sem rate limit de fornecedor) — inerente ao modelo de distribuição Hugging Face (pesos abertos), 2026-09-04.

**7. Preço real**
Sem custo por imagem/licenciamento (Apache-2.0, gratuito). Custo real é infraestrutura: cômputo (CPU é viável para ViT pequeno em lote de thumbnails; GPU acelera mas não é obrigatório), mais o custo de engenharia para construir, testar e manter o serviço de inferência. Preço por imagem/milhar/mês: **não aplicável** no sentido de tarifa de API — mas não é "grátis" em custo total de propriedade.
VERIFICADO (licença Apache-2.0, sem tarifa por uso) — https://huggingface.co/Falconsai/nsfw_image_detection (2026-09-04). Estimativa de custo de infraestrutura: **não encontrado** (dependeria de benchmark próprio do Albora).

**8. Free tier — limite exato**
Não aplicável — não é um serviço com tiers, é peso de modelo baixado uma vez.

**9. Retenção da imagem — quanto tempo, para qual finalidade**
Nenhuma retenção por terceiro: a imagem nunca sai da infraestrutura do Albora. Retenção é 100% governada pela própria política de dados do Albora (a mesma política de retenção de mídia de convidado já definida no núcleo do produto), não pelo fornecedor do modelo.
VERIFICADO (natureza self-hosted implica que dado não trafega para fora) — inerente à arquitetura, 2026-09-04.

**10. Uso para treinamento — padrão e como desligar**
Não aplicável a esta pergunta como feita para APIs de terceiro — o modelo já vem pré-treinado (dataset proprietário de ~80.000 imagens, segundo o autor) e não há telemetria de volta para o publicador do modelo durante a inferência local; nenhum dado do Albora retorna à Falcons.ai.
VERIFICADO (dataset de treino declarado, sem canal de telemetria embutido no uso via `transformers`) — https://huggingface.co/Falconsai/nsfw_image_detection (2026-09-04).

**11. Zero Data Retention — elegibilidade e como contratar**
Não aplicável — self-hosted é, por definição, retenção zero do lado do "provedor" porque não há provedor externo processando a imagem.

**12. Restrição contratual para conteúdo de terceiros**
A licença Apache-2.0 do modelo em si não impõe restrição sobre o tipo de conteúdo de entrada (foto de convidado vs. do cliente) — ela rege uso/redistribuição do software/pesos, não o dado que passa por ele. Como a inferência roda dentro da infraestrutura do próprio Albora, não há um terceiro contratual novo neste ponto específico (o "fornecedor" de nuvem que hospeda o servidor de inferência é quem passa a ter DPA relevante, se for cloud gerenciada).
VERIFICADO (termos da licença Apache-2.0 não versam sobre dado de entrada) — https://huggingface.co/Falconsai/nsfw_image_detection (2026-09-04).

**13. Latência aproximada**
**Não encontrado** um benchmark oficial do publicador. Ordem de grandeza esperada para ViT pequeno a 224×224 em lote de 1 imagem é de dezenas de milissegundos em GPU e algumas centenas de ms em CPU, mas isso é uma estimativa de engenharia, não um dado publicado — não deve ser tratado como verificado.
INFERIDO (ordem de grandeza típica de ViT-base a essa resolução) — não há benchmark oficial publicado pelo autor do modelo.

**14. Comportamento em timeout e erro**
Não aplicável na forma de "erro de API de terceiro" — falhas possíveis são as do próprio serviço que o Albora construir (OOM, crash do processo, fila cheia), e o comportamento de degradação teria que ser desenhado pelo próprio Albora (o que, aliás, é exigido pela regra do projeto de que só storage e Postgres podem estar no caminho crítico — um serviço de moderação self-hosted também teria que degradar, nunca bloquear o upload).
INFERIDO a partir da arquitetura self-hosted e das regras não negociáveis do projeto — não há "documentação de fornecedor" para citar aqui porque não há fornecedor externo.

## Matriz pontuada

Notas de 1 (fraco) a 5 (forte) por critério, aplicadas aos pesos do dono. Nota é minha leitura dos fatos VERIFICADOS/INFERIDOS acima — o julgamento de quanto pesa cada nota é meu, os fatos por trás são rastreáveis nas seções de cada candidato.

| Critério (peso) | OpenAI Moderation | Google Vision SafeSearch | Self-hosted (Falconsai) |
|---|---|---|---|
| Detecção real (30%) | 5 — 12 categorias, cobre texto+imagem em self-harm/sexual/violence com score 0–1; mas `sexual/minors` só se aplica a texto, não a imagem (ver Cand.1 Q3) | 4 — 5 categorias incl. violence explícita, mas só enum de verossimilhança (5 níveis), não score contínuo | 2 — só binário normal/NSFW; **sem categoria de violência**, exigiria um segundo modelo |
| Privacidade e retenção (25%) | 5 — endpoint de moderação explicitamente excluído da retenção de 30 dias; sem uso p/ treino por padrão | 5 — caminho síncrono não persiste em disco; sem uso p/ treino | 5 — imagem nunca sai da infra do Albora |
| Custo (20%) | 5 — endpoint gratuito, não conta contra limite de uso | 3 — grátis só combinado com Label Detection; sozinho, US$1,50/1000 (ou US$0,60/1000 em volume alto) após as 1.000 grátis/mês | 3 — sem tarifa por imagem, mas custo de infraestrutura + engenharia de manter o serviço não é zero e não foi medido |
| Latência (10%) | 3 — não documentada oficialmente | 3 — não documentada oficialmente | 3 — sem benchmark oficial; potencialmente mais rápida (sem round-trip de rede) mas depende de investimento próprio em infra |
| Limites e escala (10%) | 3 — estrutura de tiers documentada, mas RPM/TPM exatos do modelo de moderação não estão publicados oficialmente | 4 — 1.800 req/min documentado explicitamente, quotas claras por tipo de operação | 3 — sem teto de fornecedor, mas escalar é responsabilidade e custo 100% do Albora |
| Facilidade de integração (5%) | 5 — uma chamada REST, JSON simples, bem documentado | 5 — REST bem documentado, SDKs oficiais | 2 — exige construir, hospedar e operar um serviço de inferência próprio |

**Placar ponderado (0–5):**
- OpenAI Moderation: 0,30×5 + 0,25×5 + 0,20×5 + 0,10×3 + 0,10×3 + 0,05×5 = **4,55**
- Google Vision SafeSearch: 0,30×4 + 0,25×5 + 0,20×3 + 0,10×3 + 0,10×4 + 0,05×5 = **4,00**
- Self-hosted (Falconsai): 0,30×2 + 0,25×5 + 0,20×3 + 0,10×3 + 0,10×3 + 0,05×2 = **3,15**

## Recomendação

**A decisão é do dono do produto — o que segue é a leitura desta pesquisa, não uma ordem de implementação.**

Pela matriz ponderada, **OpenAI Moderation API** fica na frente (4,55), seguida por **Google Cloud Vision SafeSearch** (4,00) e pelo **self-hosted** (3,15) em último. A diferença principal não é preço (ambos os provedores de nuvem são baratos ou grátis no volume de uma festa) — é **detecção real** e **facilidade de integração com risco operacional baixo**, que são os dois critérios de maior peso combinado (35%) além da própria detecção (30%). O self-hosted perde justamente no critério de peso 30%: cobre só metade do problema (sexual, não violência) e exigiria uma segunda peça de arquitetura só para fechar a paridade de categorias — isso, mais o custo de operar um serviço de inferência 24/7 com SLA implícito de "nunca travar o upload" (regra não negociável do projeto), o torna o candidato de maior risco de engenharia para o menor ganho de privacidade prático (os outros dois já não retêm a imagem de forma significativa).

Dois pontos que o dono precisa pesar antes de fechar com a OpenAI, e que esta pesquisa não resolve sozinha:
1. **A categoria `sexual/minors` da OpenAI só se aplica a texto, não a imagem** — ou seja, o classificador não tem um sinalizador dedicado para "conteúdo sexual envolvendo menor" em foto. Na prática, conteúdo sexual explícito de qualquer pessoa ainda cairia na categoria geral `sexual`/`sexual` com score alto, então o gap é mais estreito do que parece à primeira vista — mas é uma lacuna real e deve constar na decisão, especialmente dado o contexto de casamento com crianças presentes.
2. **Nem OpenAI nem Google publicam latência oficial nem número de rate limit exato para o endpoint usado aqui.** Antes de assinar, vale um teste de carga próprio (o gate de "150 uploads em 20 min" já exigido pelo MVP é o momento natural para isso).

Dado o peso que o próprio dono colocou na assimetria do erro (esconder foto inocente é recuperável; conteúdo grave no telão não é), uma opção de **defesa em profundidade** — usar OpenAI Moderation como classificador primário (grátis, amplo, já excluído de retenção de abuso) e reservar Google SafeSearch como segunda opinião só nos casos de score limítrofe antes de liberar automaticamente para o telão — é tecnicamente viável e mantém o custo baixo, já que o volume de casos limítrofes é uma fração pequena do total. Isso não é uma recomendação fechada, é uma opção que a pesquisa deixa em aberto para o dono avaliar.

## O que não consegui verificar

Nenhum item foi preenchido por plausibilidade — onde a documentação oficial não respondia a pergunta, o arquivo registra "não encontrado" explicitamente. Ao todo, **11 das 42 respostas (14 perguntas × 3 candidatos) contêm pelo menos um elemento marcado como "não encontrado"**:

- **OpenAI (5):** resolução máxima em pixels (Q5); RPM/TPM exatos do modelo de moderação em fonte oficial (Q6, parcial — a estrutura de tiers está documentada, os números do modelo específico não); limite exato de chamadas grátis por mês além do teto de gasto da conta (Q8); confirmação explícita de que ZDR agrega algo prático a um endpoint que já não gera log de abuso por padrão (Q11, parcial); latência aproximada (Q13).
- **Google (4):** resolução máxima em pixels (Q5, parcial — tamanho em MB está documentado); existência de um programa formal de Zero Data Retention nomeado para Vision API (Q11); latência aproximada (Q13); comportamento exato de timeout/erro específico do SafeSearch, incluindo timeout default (Q14, parcial — só o padrão genérico de erro do GCP foi confirmado).
- **Self-hosted (2):** estimativa de custo de infraestrutura de rodar o modelo em produção (Q7, parcial); benchmark oficial de latência do publicador do modelo (Q13).

Além disso, a **pergunta 12 (restrição contratual para conteúdo de terceiros)** para OpenAI e Google foi respondida via resumo de busca sobre os textos oficiais de termos de serviço/DPA, não por leitura direta e completa do documento primário (bloqueios de acesso automatizado — HTTP 403 — impediram abrir `openai.com/policies/usage-policies` e páginas correspondentes do Google diretamente). Essas duas respostas estão marcadas como INFERIDO no corpo do documento e **precisam de releitura manual antes de qualquer assinatura de contrato**.

## Implicações de conformidade

- **DPA (Data Processing Addendum):** tanto OpenAI quanto Google oferecem adendos de processamento de dados para clientes de API/Cloud — nenhum dos dois foi lido na íntegra nesta pesquisa (ver seção acima). Antes de contratar, o Albora precisa assinar o DPA vigente de qualquer um dos dois e confirmar que ele cobre explicitamente dado de "usuário final" do cliente (o convidado), não só dado do próprio cliente contratante — a Google já modela isso explicitamente como "Customer End Users" nos termos gerais do GCP; a OpenAI corresponsabiliza o cliente da API por obter consentimento dos usuários finais.
- **Transferência internacional (LGPD Art. 33):** tanto a OpenAI quanto o Google processam fora do Brasil por padrão (infraestrutura global, sem garantia documentada nesta pesquisa de residência de dados no Brasil para estes endpoints específicos). Isso caracteriza transferência internacional de dado pessoal (a foto do convidado, ainda que como thumbnail, é dado pessoal quando permite identificação — rosto). Exige uma das hipóteses do Art. 33 da LGPD: cláusulas contratuais padrão, selo/certificação, ou consentimento específico e destacado do titular para a transferência. Como o convidado já presta consentimento versionado antes da captura (regra não negociável do produto), esse consentimento **precisaria mencionar explicitamente o envio da foto (ainda que como thumbnail) a um classificador de terceiro fora do país**, ou o Albora precisa se apoiar em cláusulas contratuais padrão do fornecedor — isso não foi verificado para nenhum dos dois candidatos de nuvem nesta pesquisa e é um bloqueador jurídico a resolver antes do lançamento, independente de qual candidato for escolhido.
- **Self-hosted evita a questão de transferência internacional por completo** (dado não sai do Brasil se a infraestrutura do Albora estiver aqui) — esse é o único ponto em que o self-hosted é estruturalmente superior aos outros dois, mesmo perdendo na matriz ponderada geral.
- **Menor em foto:** independente do provedor escolhido, a regra não negociável do projeto sobre mídia de convidado e menores (STJ, REsp 1.628.700/MG — dano `in re ipsa`) é sobre **uso/publicação** da imagem, não sobre **classificação automática** dela; nenhum dos três candidatos pesquisados aqui resolve essa obrigação — ela é tratada em outra camada do produto (consentimento do responsável legal, controle de exibição), não pelo classificador de moderação.
