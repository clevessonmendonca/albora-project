# Congelamento de features — até o casamento nº 1 medido

> **Status:** vigente
> **Criado:** 2026-08-30
> **Origem:** discovery de agosto/2026
> **Sai de vigor quando:** houver 1 casamento real com participação medida e presença confirmada

---

## Por que existe

O produto web já excede o MVP documentado: convidado, admin, telão, moderação,
álbum, livro PDF, export, app Expo e portal de fornecedor — tudo em código, com
zero eventos reais.

A evidência de mercado torna isso um problema, não um trunfo. Mais de 30 produtos
globais entregam o mesmo conjunto de funcionalidades entre US$ 29 e 99, e a faixa
brasileira está entre R$ 47 e 60. **Nenhuma funcionalidade da categoria sustenta
preço** — a disputa migrou para SEO entre concorrentes. Cada tela nova aqui é
custo de manutenção fixo cobrado sobre uma base de zero usuários.

O gargalo não é o que falta construir. É que a pergunta que decide a empresa
— participação ≥40% — nunca foi medida uma vez.

---

## O que não entra

Até o critério de saída ser atendido, nenhum destes começa:

| Área | Congelado |
|---|---|
| Convidado | Feed vertical de vídeo, notificações push, agrupamento facial, novos tipos de mídia |
| Anfitrião | Novos painéis, novos relatórios, editor de layout, personalização além dos tokens |
| Telão | Novos modelos além dos 4 atuais |
| Livro | Novos formatos, novas diagramações, SKU de impressão |
| Fornecedor | Split de pagamento, portal além do que já existe |
| Verticais | Corporativo, formatura, infantil |
| App | Publicação nas lojas |
| Plataforma | Qualquer integração de terceiro no caminho crítico |

**15 anos é exceção parcial:** o pack existe e a demografia é melhor que a de
casamento, mas depende de fluxo de consentimento para menores. Não abrir antes
disso — é risco jurídico, não escolha de prioridade.

---

## O que continua liberado

Congelamento é de **superfície nova**, não de trabalho:

- Correção de defeito em caminho existente
- Qualquer coisa que reduza fricção no caminho da primeira foto
- Instrumentação e medição
- Execução dos bloqueios operacionais (prova de QR, carga, jurídico)
- Copy, preço e posicionamento
- Robustez: fila, retry, rede, aparelho fraco

Regra prática: **se a mudança aumenta a chance de o convidado enviar a primeira
foto, ou a confiança no número que vamos medir, ela passa.** Se adiciona algo para
o convidado ou o anfitrião fazer, não passa.

---

## Critério de saída

Um casamento real com:

1. Presença confirmada depois da festa (não a estimativa do wizard)
2. Participação medida sobre esse denominador
3. Leitura de intenção separando falha de rede de falta de participação

Com isso em mãos, o veredito já escrito decide:

| Participação | Ação |
|---|---|
| ≥40% | Descongelar por ordem de prioridade do discovery |
| 25–40% | Continua congelado; mexer em fricção e roteiro |
| <25% | Continua congelado; decidir entre parar e pivotar o wedge |

---

## Quem pode levantar

Só o fundador, por escrito, com o motivo registrado aqui. A lista existe para que
"só essa uma" precise de uma decisão consciente em vez de acontecer por inércia.

---

## Changelog

| Data | Mudança |
|---|---|
| 2026-08-30 | Documento criado a partir do discovery de agosto/2026 |

## Exceção: loop viral convidado → anfitrião (2026-09-05)

Decisão do mantenedor em 2026-09-05: construir o loop viral (atribuição inbound, CTAs "crie o seu", compartilhamento do álbum, memórias automáticas) **antes** do casamento #1 ser medido, ciente de que o produto não rodou evento real nem está em produção. Motivo: crescimento/aquisição definido como alavanca primária; cada convidado é um futuro anfitrião. Spec: `docs/superpowers/specs/2026-09-05-loop-viral-convidado-anfitriao-design.md`. O restante do congelamento permanece.
