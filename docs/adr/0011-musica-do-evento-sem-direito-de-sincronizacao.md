# 0011 — Música do evento, sem direito de sincronização

- **Status:** Accepted
- **Data:** 2026-08-11
- **Relaciona-se com:** [0003](./0003-runtime-token-resolution.md), [0007](./0007-ai-policy-luts-not-generation.md), [0009](./0009-app-social-do-convidado.md)

## Contexto

O casal escolhe uma música, ou uma playlist, e ela aparece no produto: tocando no telão se eles quiserem, sugerida a quem for postar, e mencionada quando o convidado compartilha a foto fora.

A ideia chega como uma coisa só. Ela não é. São três, e o que as separa não é esforço de engenharia — é licenciamento.

O documento de produto já listava "Spotify (pedido de música)" no Tier 2 das integrações baratas de alto valor percebido. Este ADR não cria o tema; ele traça o limite que o tema tem.

## Decisão

**Três camadas, com fronteira explícita entre elas.**

### Camada 1 — a música como informação. Entra.

Guardar a faixa ou a playlist escolhida pelo casal e exibi-la: no telão, na tela do convidado, no álbum, na peça impressa. Abrir no Spotify, no YouTube Music ou onde for, por link.

Isto é metadado e hiperlink. Não há áudio nosso, não há obra derivada, não há licença envolvida. É um token do evento como qualquer outro, resolvido pelo mesmo resolvedor do [ADR 0003](./0003-runtime-token-resolution.md).

### Camada 2 — tocar no telão. Entra, com plano de queda.

Reprodução pela conta do próprio casal, via SDK do provedor. Legalmente é o casal tocando a própria música na própria festa; a obrigação de execução pública no espaço é do espaço, não nossa.

Três restrições que vêm junto e não são negociáveis:

- **Exige conta paga do casal.** Sem ela não há reprodução, e a Camada 1 continua valendo sozinha.
- **A música nunca derruba o telão.** O telão fica seis horas sozinho numa parede; token que expira às 2h sem ninguém para reautenticar é falha silenciosa na frente de 150 pessoas. Áudio que cai vira telão sem áudio, nunca telão sem foto.
- **Autoplay exige gesto.** Navegador não toca som sem alguém tocar na tela uma vez. Isso é passo de operação do telão, não defeito a contornar.

### Camada 3 — música embutida na mídia compartilhada. **Não entra.**

Gerar um vídeo com a foto do convidado e a música do casal embutida é **obra derivada com sincronização**, e sincronização exige direito que não temos.

O Instagram faz isso porque a Meta tem acordo direto com gravadoras e editoras. Os termos de desenvolvedor dos provedores de streaming, ao contrário, proíbem sincronizar o catálogo deles com mídia visual. Não é formalidade: é o direito que separa os dois casos.

**O que entra no lugar, e entrega o mesmo efeito:** quando o convidado compartilha, quem oferece adicionar música é a **plataforma de destino** — e ela tem licença para isso. Nós dizemos **qual** música. Texto e link, zero exposição.

## Consequências

**A música do casal viaja com as fotos.** Cada convidado que compartilha leva a mesma trilha, porque a sugestão é a mesma para todos. É coerência de acervo pelo mesmo argumento das LUTs do [ADR 0007](./0007-ai-policy-luts-not-generation.md) — lá o visual idêntico em todas as fotos, aqui a trilha idêntica em todos os compartilhamentos. E ao contrário da Camada 3, não custa licença nenhuma.

**A Camada 1 sozinha já é a maior parte do valor.** Ela não depende de conta paga, de OAuth, nem do telão existir. Pode entrar antes das outras duas e não fecha porta nenhuma.

**O provedor é enriquecimento, nunca dependência.** Vale a regra do `CLAUDE.md`: o caminho crítico depende de object storage e Postgres, e todo o resto degrada. Música fora do ar é evento sem música, não evento quebrado.

**Um catálogo de provedores, não um.** Spotify e YouTube Music têm bases de usuário diferentes no Brasil, e amarrar a um só exclui metade dos casais. A Camada 1 é agnóstica por construção — guarda identificador e link, não sessão.

## Alternativas descartadas

**Hospedar o áudio nós mesmos.** Resolveria a sincronização e criaria um problema maior: distribuição de fonograma sem licença é a infração mais direta que existe neste terreno.

**Áudio livre de royalties como substituto.** Descaracteriza o pedido. O valor está em ser *a música deles* — uma trilha genérica não é uma versão pior disso, é outra coisa.

**Adiar tudo até haver licença.** Perderia a Camada 1, que é grátis, imediata e não depende de nenhuma negociação.

## Pendência declarada

**A leitura jurídica acima precisa de confirmação com quem seja da área.** O que este ADR fixa com segurança é a *forma* do risco — as três camadas são distintas e a terceira é a única que exige direito que não temos. Os limites exatos de cada termo de desenvolvedor, e o enquadramento no direito autoral brasileiro, são pergunta para advogado, não para este documento.

Enquanto essa confirmação não existir, a Camada 3 fica fora, e a fronteira entre 2 e 3 é: **nós nunca produzimos arquivo que contenha áudio de terceiro.**
