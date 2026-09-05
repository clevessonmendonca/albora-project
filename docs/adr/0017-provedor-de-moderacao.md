# 0017 — Provedor de moderação de imagem: OpenAI Moderation, sozinha

- **Status:** Accepted
- **Data:** 2026-09-04
- **Relaciona-se com:** [0007](./0007-ai-policy-luts-not-generation.md)
- **Nota de numeração:** este ADR é 0017, não 0016 — o 0016 existe na branch `feat/ceo-backoffice`, ainda não mergeada em `main`.

## Contexto

O gate de moderação do Albora (§9 da arquitetura) já existia: fila, claim, estados `limpo`/`suspeito`/`sem-resposta`, e a regra de que silêncio nunca vira `limpo`. O que faltava era o classificador em si — até aqui, `provedorHeuristico` só verificava se o arquivo era um JPEG/PNG/WEBP legível pela assinatura de bytes. Todo JPEG passava. Esta tarefa entrega o primeiro classificador que de fato olha o conteúdo da foto, atrás da mesma porta (`ProvedorDeClassificadorDeImagem`).

A pesquisa completa, com cada fato marcado VERIFICADO (com link e data de leitura) ou INFERIDO, está em [`docs/superpowers/specs/2026-09-04-pesquisa-provedores-moderacao.md`](../superpowers/specs/2026-09-04-pesquisa-provedores-moderacao.md). Este ADR resume a decisão; a pesquisa é a fonte dos fatos.

## Decisão

**Provedor: OpenAI Moderation API (`omni-moderation-latest`), sozinha.** Sem segundo provedor nesta entrega.

### Placar da matriz pontuada

Notas de 1 a 5 por critério, pesos entre parênteses, calculados na pesquisa:

| Critério (peso) | OpenAI Moderation | Google Vision SafeSearch | Self-hosted (Falconsai) |
|---|---|---|---|
| Detecção real (30%) | 5 | 4 | 2 |
| Privacidade e retenção (25%) | 5 | 5 | 5 |
| Custo (20%) | 5 | 3 | 3 |
| Latência (10%) | 3 | 3 | 3 |
| Limites e escala (10%) | 3 | 4 | 3 |
| Facilidade de integração (5%) | 5 | 5 | 2 |
| **Placar ponderado** | **4,55** | **4,00** | **3,15** |

A OpenAI vence por **detecção real** e **facilidade de integração com risco operacional baixo** — os dois critérios de maior peso combinado (35%), além do próprio peso da detecção (30%). O self-hosted perde justamente aí: cobre só metade do problema (só `sexual`/`nsfw` binário, **sem categoria de violência** — exigiria um segundo modelo só para fechar paridade), e mesmo assim empataria em privacidade com os outros dois, que já não retêm a imagem de forma significativa. Não é uma vitória por custo: o endpoint de moderação da OpenAI é gratuito, mas os outros dois candidatos também são baratos ou gratuitos no volume de uma festa.

### Segunda opinião — deliberadamente adiada, não descartada

A pesquisa deixou em aberto uma opção de defesa em profundidade: usar OpenAI como classificador primário e reservar Google SafeSearch como segunda opinião só na faixa de score limítrofe, antes de liberar automaticamente para o telão. **Esta tarefa não implementa isso.** Adicionar um segundo provedor dobraria o trabalho de conformidade (um segundo DPA, uma segunda análise de transferência internacional, um segundo contrato) contra um ganho que ainda não foi medido — não se sabe, com o classificador único em produção, qual fração dos casos realmente cai na faixa limítrofe nem se o Google divergiria da OpenAI nesses casos de um jeito que compense o custo de operar dois provedores. A Task 5 (avaliação/medição do classificador em produção) é quem deve produzir esse número; se ele justificar a segunda opinião, vira uma tarefa nova, não uma extensão silenciosa desta.

## Política de retenção e de treino — texto explícito

Isto não pode ficar implícito: a mídia enviada ao classificador **não fica "privada para sempre"** por definição — cada provedor tem uma política própria, e o texto abaixo é o que se aplica ao provedor escolhido.

- **Retenção:** a regra geral da API da OpenAI retém logs de abuso por até 30 dias. **O endpoint `/v1/moderations` é uma exceção explícita a essa regra** — a documentação de controle de dados da OpenAI lista `/v1/moderations` (junto com `/v1/audio/transcriptions`) como **excluído** da retenção de log de abuso de 30 dias. VERIFICADO — https://developers.openai.com/api/docs/guides/your-data (lido em 2026-09-04). Isto é uma característica **deste endpoint específico**, não uma propriedade geral da API da OpenAI — outros endpoints (ex.: Chat Completions com `store: true`) retêm por padrão, e generalizar "a API da OpenAI não retém nada" seria falso.
- **Treino:** desde 1º de março de 2023, dados enviados à API não são usados para treinar ou melhorar modelos da OpenAI, a menos que o cliente opte explicitamente por compartilhar (opt-in). Não existe um botão de "opt-out" porque o padrão já é não usar. VERIFICADO — mesma fonte, 2026-09-04.
- **Zero Data Retention (ZDR):** existe como programa formal da OpenAI, mas exige aprovação prévia via time de vendas (não é self-service), e não está confirmado se agrega algo prático a um endpoint que já não gera log de abuso por padrão. Não contratado nesta entrega.

## Lacuna registrada: `sexual/minors` não se aplica a imagem

Fato verificado na pesquisa (Candidato 1, Q3): das 12 categorias que a OpenAI Moderation retorna, **`sexual/minors` só é aplicada a entrada de texto — não há sinalizador dedicado para conteúdo sexual envolvendo menor em foto**. Uma imagem com esse conteúdo cairia na categoria geral `sexual`, junto com qualquer outro conteúdo sexual explícito, sem a granularidade de idade.

Isto importa de forma concreta para o Albora: o produto fotografa casamentos, e crianças estão presentes no salão. A regra não negociável do projeto sobre mídia de convidado e menores (CLAUDE.md, citando o STJ — REsp 1.628.700/MG — que classifica dano à imagem de menor publicada sem autorização do responsável legal como `in re ipsa`, **sem exigir finalidade comercial**) é sobre **uso e publicação** da imagem, não sobre classificação automática — mas a classificação automática é a primeira linha de defesa antes da publicação no telão, e essa linha tem um buraco específico aqui. O gap é mais estreito do que parece à primeira vista (conteúdo sexual explícito de qualquer pessoa, incluindo menor, ainda cairia em `sexual` com score alto), mas não é zero: não há como o classificador, sozinho, diferenciar "conteúdo sexual com adulto" de "conteúdo sexual com menor" numa foto. Isto não é resolvido por esta tarefa — fica registrado aqui para não virar nota de rodapé, e permanece coberto por outras camadas do produto (moderação humana do anfitrião, denúncia por convidados, gate de aprovação em modo endurecido).

## Bloqueadores não resolvidos — não são de código, precedem o primeiro evento real

Nenhum dos dois itens abaixo é resolvido pelo merge deste código. Ambos precisam ser fechados antes do primeiro evento real usando o provedor `openai`.

**(a) Leitura manual dos termos de uso e do DPA.** As páginas de política da OpenAI (`openai.com/policies/row-terms-of-use`, `openai.com/policies/api-data-usage-policies`) bloqueiam acesso automatizado com HTTP 403 — a pesquisa não conseguiu ler o texto integral e marcou a resposta sobre restrição contratual para conteúdo de terceiros como **INFERIDA** a partir de resumo de busca, não de leitura direta. Antes de assinar ou de operar isto em produção com dado real de convidado, alguém precisa abrir essas páginas manualmente (navegador comum, não fetch automatizado) e confirmar: (1) que a obrigação de consentimento de usuário final recai sobre o Albora, como o resumo indica; (2) os termos exatos do DPA (Data Processing Addendum) da OpenAI, ainda não lido nesta pesquisa.

**(b) Base legal para transferência internacional sob LGPD Art. 33.** A OpenAI processa fora do Brasil por padrão. O thumbnail da foto do convidado é dado pessoal (permite identificação por rosto), e enviá-lo a um classificador fora do país caracteriza transferência internacional de dado pessoal — o que exige uma das hipóteses do Art. 33 da LGPD: cláusulas contratuais padrão, selo/certificação, ou consentimento específico e destacado do titular. **O consentimento versionado que o convidado já presta antes da captura (regra não negociável do produto) hoje não menciona envio do thumb a um classificador de terceiro fora do país.** Isso precisa de uma das duas saídas antes do primeiro evento real: (1) atualizar o texto do consentimento versionado para mencionar explicitamente esse envio, o que exige nova versão do consentimento e trilha de auditoria de quem aceitou o quê; ou (2) apoiar-se em cláusulas contratuais padrão do fornecedor (se o contrato/DPA da OpenAI as oferecer — depende do item (a) acima). Nenhuma das duas foi executada nesta tarefa.

## Consequências

**Positivas** — o gate de moderação passa a olhar o conteúdo de fato, não só a validade do arquivo. O custo marginal é zero (endpoint gratuito). Sem SDK novo em `packages/core` — `fetch` injetado, testável sem rede e sem chave.

**Aceitas** — a categoria `sexual/minors` não cobre imagem (ver seção acima); os dois bloqueadores de conformidade (a) e (b) ficam abertos e são pré-requisito operacional, não técnico, para o primeiro evento real; nem OpenAI nem Google publicam latência oficial ou rate limit exato para este endpoint — o teste de carga de 150 uploads em 20 min (gate obrigatório do MVP) é o momento natural para medir isso na prática.

**Reavaliar quando** — a Task 5 medir a taxa de falsos positivos/negativos do classificador único em produção. Se a faixa de score limítrofe for grande o suficiente para justificar o custo de conformidade de um segundo provedor, a opção de defesa em profundidade (OpenAI + Google SafeSearch como segunda opinião) volta à mesa como uma tarefa nova.
