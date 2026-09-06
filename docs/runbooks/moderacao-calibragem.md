# Runbook — Calibragem da moderação

> **Status:** em aberto — limiar não medido
> **Última revisão:** 2026-09-05
> **Público:** dono do produto, quem opera o classificador antes do 1º evento real
> **Complementa:** [`../adr/0017-provedor-de-moderacao.md`](../adr/0017-provedor-de-moderacao.md) · `packages/core/src/classificador-openai.ts` · `packages/core/src/classificador-calibragem.test.ts`

---

## 1. O que já está garantido, e o que ainda não está

`LIMIAR_SUSPEITO` (hoje `0.5`, em `packages/core/src/classificador-openai.ts`) é um **ponto de partida não medido**. Veio da leitura da documentação do provedor, não de uma medição contra fotos de festa reais.

O que **já** está garantido, e não depende deste runbook:

- `packages/core/src/classificador-calibragem.test.ts` trava que, dado um escore, o código chega no veredicto certo — abaixo do limiar é `limpo`, no limiar e acima é `suspeito`, `flagged` isolado já basta. Isso é lógica determinística e roda em todo `pnpm test`.
- Isso já é estritamente melhor que o estado anterior: antes, todo JPEG válido virava `limpo` e o gate ficava sempre aberto. Agora existe um classificador que de fato avalia conteúdo.

O que **não** está garantido, e é para isso que este runbook existe:

- Ninguém verificou se `0.5` é o número certo para *este* produto — festa, luz baixa, gente se abraçando, dançando, brindando. O teste acima mede a decisão; não mede se a decisão está calibrada contra o caso real.
- Enquanto as duas medições das seções 2 e 3 não rodarem pelo menos uma vez, o produto tem **classificador que funciona** e **limiar que ninguém verificou**. Essas são coisas diferentes. Não confundir "o encanamento está certo" com "o número está certo".

Nenhuma das duas medições é automatizável. A primeira exige foto real de festa (e foto de convidado real não pode virar insumo de desenvolvimento — mesma regra que a proíbe como material de marketing). A segunda exige julgamento humano sobre conteúdo que não pode ser reduzido a fixture sintética sem deixar de medir o que importa.

---

## 2. Medição (a) — falso positivo e orçamento de fila

**Pergunta que essa medição responde:** de cada 100 fotos boas de festa, quantas o classificador manda, sem necessidade, para a fila de revisão do anfitrião?

### Por que o critério não é estatístico

O alvo aqui não vem de significância estatística — vem de operação. **O anfitrião está na própria festa**, não numa mesa de moderação. Uma fila que ele não consegue revisar durante o evento é pior que um limiar frouxo: se a fila afoga, ninguém revisa nada, e o admin ainda mostra "revisão ativa" como se estivesse funcionando. Frouxo-mas-revisado bate apertado-mas-ignorado.

### Material

- **Quantidade:** no mínimo **100 fotos**. Menos que isso não dá nem para expressar "por 100 fotos" com uma casa decimal que signifique algo.
- **Origem:** fotos benignas **reais**, fornecidas pelo **dono do produto**, de eventos sobre os quais ele tem direito de uso — festa própria, casamento de amigo com autorização, banco de fotos com licença. **Nunca** fotos capturadas por convidado através do Albora em produção; essa regra não abre exceção para calibragem.
- **Cobertura deliberada dos casos limítrofes:** luz baixa/ambiente de festa, abraço, dança colada, brinde/taça levantada, foco desalinhado, flash estourado. É exatamente aqui que um classificador ingênuo tende a confundir intimidade com impropriedade — o problema que a versão anterior deste runbook tentava (e falhava) simular com imagem sintética.
- **Onde ficam:** fora do repositório, numa pasta local do executor (ex.: `~/albora-calibragem/fp/`). Não commitar.

### Como rodar

1. Ter uma chave OpenAI válida disponível como `OPENAI_API_KEY` no ambiente de quem executa.
2. Escrever um script ad hoc e descartável (não committed — é ferramenta de medição, não parte do produto) que, para cada arquivo da pasta:
   - carrega os bytes e o mime;
   - chama `provedorOpenAi({ apiKey: process.env.OPENAI_API_KEY }).classificar({ bytes, mime })`, exportado de `packages/core/src/classificador-openai.ts`;
   - imprime o nome do arquivo e o veredicto (`limpo` | `suspeito` | `sem-resposta`).
3. Rodar contra as 100+ fotos.
4. Contar quantas vieram `suspeito`. Tratar `sem-resposta` à parte (ver nota abaixo) — não contam como falso positivo, mas um volume alto de `sem-resposta` é sinal de problema de rede/chave, não de calibragem, e invalida a rodada.
5. Calcular: `(suspeitos / total) × 100` → itens por 100 fotos.

### Alvo declarado

**≤ 5 itens por 100 fotos.** Racional operacional, não estatístico: num evento de porte médio (~300–500 fotos na noite), isso é 15–25 itens ao longo de várias horas — revisável em lotes curtos entre uma tarefa do anfitrião e outra. Acima de **10 por 100** (30–50 itens numa festa de 500 fotos) começa a competir de verdade com a atenção que o anfitrião tem disponível para os próprios convidados, que é o ponto em que o desenho original identificou que ele para de revisar.

Este número é ponto de partida, não física: se a primeira rodada estourar o alvo, o limiar sobe (menos falsos positivos, mais risco do lado do falso negativo — daí a seção 3 existir) e se roda de novo. Ver §4.

### Registro

| Data | Quem rodou | Nº de fotos | `suspeito` | `sem-resposta` | Itens por 100 | Dentro do alvo (≤5)? |
|---|---|---|---|---|---|---|
| *(preencher na primeira rodada)* | | | | | | |

---

## 3. Medição (b) — falso negativo na classe adversa

**Pergunta que essa medição responde:** de um conjunto de conteúdo que deveria ser barrado, quanto o classificador deixa passar como `limpo`?

Este é o lado caro do erro: falso negativo aqui é conteúdo impróprio indo para o telão, na frente da família, de forma irreversível na experiência (tirar depois não desfaz quem viu).

### Escopo do conjunto adverso — e o que fica de fora

O conjunto cobre as categorias que o classificador de fato avalia em imagem, segundo a pesquisa de provedores: sexual, violência, automutilação (ver `docs/superpowers/specs/2026-09-04-pesquisa-provedores-moderacao.md` §Candidato 1 Q3). Conteúdo adulto, dentro do que é legal possuir e testar.

**Fora do escopo, sempre:** qualquer material envolvendo menor. Isso não é uma categoria de teste de calibragem — é [`docs/legal/procedimento-conteudo-ilegal-menores.md`](../legal/procedimento-conteudo-ilegal-menores.md), um procedimento jurídico separado, e não se resolve criando ou adquirindo material para testar detecção. Não montar, não buscar, não incluir.

### Por que fora do repositório, e não versionado

Duas razões, não uma:

1. **A mesma regra de sempre:** material real de teste, mesmo que não seja de convidado do Albora, não entra no histórico do git. Git é permanente por natureza — um `git rm` não apaga de clones já feitos, de forks, de CI que já buildou aquele commit. Conteúdo adverso não pertence a um artefato que não pode ser apagado de verdade.
2. **Responsabilidade de posse:** manter esse material em um repositório de código, acessível a qualquer pessoa com acesso ao repo (incluindo CI, backups, espelhos), amplia quem "possui" o conteúdo sem necessidade. Fora do repo, com acesso restrito, o raio de exposição fica do tamanho de quem precisa mesmo.

### Procedimento

- **Quem executa:** uma única pessoa nomeada — o dono do produto, ou quem ele designar explicitamente por escrito antes da rodada. Não é tarefa de equipe, e não é automatizado.
- **Onde o conjunto mora:** armazenamento local ou nuvem privada de acesso restrito ao executor (ex.: pasta cifrada, drive pessoal com permissão individual) — nunca uma pasta do projeto, nunca um bucket compartilhado com a equipe de desenvolvimento.
- **Como roda:** mesmo mecanismo da medição (a) — `provedorOpenAi(...).classificar(...)` contra cada item do conjunto, chave real, execução manual, único run (não pipeline recorrente).
- **O que se registra:** **apenas o agregado** — quantidade total, quantos vieram `limpo` (falso negativo), quantos `suspeito`, quantos `sem-resposta`, e a taxa resultante. Nunca nome de arquivo, nunca categoria específica por item, nunca o conteúdo em si, nem aqui nem em qualquer issue/PR/mensagem.
- **Onde o número fica registrado:** na tabela abaixo, neste runbook, que é público dentro da equipe — porque o número (uma taxa) não é sensível; o material que o gerou é.

### Registro

| Data | Quem executou | Nº de itens | Falso negativo (`limpo`) | Taxa de falso negativo | Observações |
|---|---|---|---|---|---|
| *(preencher na primeira rodada)* | | | | | |

---

## 4. Depois de medir — o que fazer com o número

- **(a) estourou o alvo (>5, e sobretudo >10 por 100):** o limiar está apertado demais para o caso de uso. Considerar subir `LIMIAR_SUSPEITO`, ciente de que isso frouxa o lado de (b) — as duas medições existem porque puxam em direções opostas, e a decisão final pondera as duas, não uma isolada.
- **(b) mostrou falso negativo alto:** o limiar está frouxo demais. Considerar descer `LIMIAR_SUSPEITO`, ciente de que isso aperta o lado de (a).
- **Qualquer mudança em `LIMIAR_SUSPEITO`** exige atualizar o teste "escore exatamente no limiar" em `classificador-calibragem.test.ts` — ele existe para que essa mudança seja **deliberada**, nunca um efeito colateral silencioso de mexer no número.
- **Este runbook não decide o número novo.** Ele só garante que, quando alguém decidir, a decisão é registrada aqui com data e com os dois números que a motivaram — não no ar, não só na cabeça de quem mexeu.
