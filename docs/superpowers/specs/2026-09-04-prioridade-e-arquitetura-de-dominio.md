# Prioridade e arquitetura de domínio — o gargalo mudou

**Data:** 2026-09-04
**Status:** decidido pelo dono
**Supersede:** a ordenação implícita nos documentos anteriores desta data, que tratavam o console interno como centro arquitetural

## 1. A mudança de leitura

Os documentos anteriores foram escritos supondo que faltava produto. A varredura mostrou o contrário: convidado, missões, telão, feed, packs e tokens, música, billing, livro e exportação, portal do fornecedor e app Expo **já existem**.

O gargalo é outro, e é uma frase:

> O produto está funcionalmente avançado, mas a arquitetura operacional nunca foi provada em produção.

Isso reordena tudo. **"Construir mais" passou a valer menos que "provar que o que já foi construído funciona em produção."**

## 2. O que NÃO fazemos

- **Não há refactor big-bang.** A arquitetura atual tem decisões boas — porta de classificador injetável, isolamento por evento com RLS forçada, agregação cross-tenant sancionada, motor de moderação com fail-closed. Nada disso se joga fora.
- **Não abrimos quatro frentes de código porque existem quatro sub-projetos.** Docs compartilham o worktree de planejamento; cada sub-projeto que altera código ganha worktree e superfície de propriedade própria, um de cada vez.
- **Não se acelera reconhecimento facial.** Ver §6.

## 3. Prioridade

| Nível | Trabalho | Bloqueado por |
|---|---|---|
| 🔴 P0 | Produção real | Credencial do dono (12 dos 17 itens) |
| 🔴 P0 | Corrigir moderação | Nada |
| 🔴 P0 | Testes do pipeline de upload | Nada |
| 🔴 P0 | Teste de carga 150 uploads / 20 min | Depende de produção |
| 🔴 P0 | E2E do convidado | Nada |
| 🟠 P1 | Observabilidade | Depende de produção |
| 🟠 P1 | Curadoria do livro | Nada |
| 🟠 P1 | Push | Nada |
| 🟡 P2 | Console interno | — |
| 🟡 P2 | Melhorias secundárias | — |
| 🔵 P3 | Reconhecimento facial | Viabilidade jurídica |

### Sequenciamento, dado que P0 tem cinco itens

Nem todo P0 depende das mesmas coisas, e isso decide a ordem real:

- **Produção** está travada em credencial e decisão de domínio — trabalho do dono, não de agente. Enquanto isso não acontece, ninguém deveria ficar parado esperando.
- **Carga** e **observabilidade** só existem depois de produção. Não adianta puxá-las para a frente.
- **Moderação** e **testes de upload** não dependem de nada e não colidem com nenhum stream ativo.

Logo: **moderação primeiro**, porque é a única entre as desbloqueadas cujo modo de falha é irreversível — conteúdo impróprio projetado na parede na frente da família não se desfaz tirando da parede depois.

## 4. Console interno: para onde vai

O console foi tratado como centro arquitetural nos documentos anteriores. **Não é.** É um subproduto administrativo dentro de uma arquitetura maior.

Estado atual do trabalho: branch `feat/ceo-backoffice`, Onda A tarefa 1 concluída e commitada (migration `0059_staff_identidade.sql`), árvore limpa, plano de 15 tarefas escrito e ADR 0016 registrado. **Parado em ponto limpo** — nada pela metade. Retoma depois do P0.

O que sobrevive integralmente do trabalho já feito: o ADR 0016 (camadas, envelope de comando com auditoria transacional, autorização em duas camadas) continua válido como direção. Ele só deixa de ser urgente.

## 5. Arquitetura alvo — por domínio, incremental

```
                    ALBORA
                       │
      ┌────────────────┼────────────────┐
      │                │                │
    Events           Media           Commerce
      │                ├── Upload       ├── Billing
      ├── Guest        ├── Moderation   ├── Packs
      ├── Missions     ├── Processing   └── Tokens
      ├── Feed         └── Curation
      └── Wall
      ┌─────────────────────────────────┐
      │      Platform / Admin Console    │
      └─────────────────────────────────┘

Application  →  Domain  →  Infrastructure  →  Postgres / R2 / Queue / APIs
```

**Como chegar lá sem parar o produto:** a camada `Application` cresce por onde o trabalho já passa. Quando a moderação for corrigida, o caso de uso de moderação nasce nessa forma. Quando o console voltar, os dele também. Nada é migrado só para ficar simétrico.

Já existe base para isso no repo — `apps/web/lib/application/use-cases/` — o que confirma que a direção não é estranha ao código; é continuação dele.

## 6. Reconhecimento facial — o que precisa acontecer antes de código

Os documentos de produto apontam agrupamento facial ("suas fotos") como item de maior ROI. Ele permanece em P3, e a ordem não é negociável:

```
produto → viabilidade jurídica → modelo de consentimento → retenção
        → processamento → segurança → só então implementação
```

O motivo: é tratamento de dado biométrico, sobre mídia de convidado, com criança em cena. Acelerar isso não entrega feature — cria passivo estrutural.

## 7. Como saber que o P0 acabou

- Existe uma URL de produção servindo o produto, e o deploy que a criou rodou por pipeline, não pela mão de alguém.
- Uma foto claramente imprópria não chega ao telão, e isso está provado contra um conjunto de avaliação, não por impressão.
- A classificação acontece por ter havido upload, não por alguém ter aberto o telão.
- O gate de cobertura está ligado e falha quando a cobertura cai; o pipeline de upload tem teste, incluindo a fila offline.
- O E2E do convidado roda no CI e cobre QR → consentimento → captura → upload → confirmação.
- 150 uploads em 20 minutos passaram contra a infraestrutura real, com o número registrado.
