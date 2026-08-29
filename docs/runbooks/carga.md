# Runbook — teste de carga do pipeline de upload

O `CLAUDE.md` fixa um portão de MVP: **150 uploads em 20 minutos, antes do primeiro evento real**. Este runbook diz como rodar e como ler o resultado.

O arnês mira **só o pipeline de upload**: `POST /api/sessions` → `POST /api/uploads/presign` → `PUT` direto no object storage → `POST /api/uploads/confirm`. Ele não exercita telão, feed, moderação nem admin.

---

## 1. Antes de rodar

| | |
|---|---|
| Banco de pé | `pnpm db:up` |
| Evento semeado | `pnpm db:semear` — cria `festa-demo` |
| Servidor | `pnpm dev`, ou um deploy |
| Credenciais de R2 | no ambiente, se quiser que o `PUT` seja real |

Sem `R2_*` no ambiente, o `presign` falha e **isso é um resultado legítimo**: significa que o ambiente não está configurado, não que o pipeline está quebrado. Relate como tal.

---

## 2. Rodar

```bash
# padrão: 150 uploads em 20 min contra localhost:3000
pnpm carga

# execução pequena, para provar que o arnês funciona
CARGA_TOTAL=6 CARGA_DURACAO_MIN=1 CARGA_CONVIDADOS=3 CARGA_PICOS=1 pnpm carga
```

### Alvo que não é localhost

Exige confirmação, e a confirmação é **o hostname exato** — não um "sim":

```bash
ALVO=https://albora-stable.exemplo.workers.dev \
CARGA_CONFIRMO_ALVO=albora-stable.exemplo.workers.dev \
CARGA_EVENTO=<slug> pnpm carga
```

Falha fechado de propósito. Um `ALVO` digitado errado não roda contra o lugar errado por descuido.

### Botões que importam

| Variável | Padrão | O que é |
|---|---|---|
| `CARGA_PERFIL` | — | `fumaca` \| `gate` \| `pico` \| `normal` \| `stress` \| `soak` — defaults; `CARGA_*` explícito ganha |
| `CARGA_TOTAL` | 150 | Uploads no total |
| `CARGA_DURACAO_MIN` | 20 | Janela |
| `CARGA_CONVIDADOS` | 50 | Sessões distintas |
| `CARGA_PICOS` | 4 | Rajadas na janela |
| `CARGA_FRACAO_PICO` | 0.7 | Fração dos uploads que cai dentro de rajada |
| `CARGA_SESSOES_POR_MINUTO` | 9 | Teto de criação de sessão |
| `CARGA_SAIDA` | — | Caminho do JSON de saída |

```bash
CARGA_PERFIL=fumaca pnpm carga
CARGA_PERFIL=gate pnpm carga
CARGA_PERFIL=soak pnpm carga   # 4 h; só local
```

Tabela e o que cada perfil prova: `docs/infra/PERFORMANCE.md`. Não há k6 neste repositório.

**Por que rajada e não taxa constante.** 150 uploads em 20 minutos não é um a cada 8 segundos: é ninguém por três minutos e quarenta de uma vez quando o bolo é cortado. Taxa constante mede um sistema que não existe.

**Por que 9 sessões por minuto.** O limite de `/api/sessions` é por IP, e num salão os 200 convidados estão atrás de um NAT só. Criar sessão mais rápido mede o rate limit, não o pipeline. Use `CARGA_IP_POR_CONVIDADO=1` para medir o pipeline sem esse teto.

---

## 3. Ler o resultado

A saída traz **p50, p95 e p99 por etapa** — presign, PUT, confirm — separados. Média engana: é o p99 que decide se o convidado desiste.

Erros vêm separados por código, e a distinção é a que importa:

- **429** é o rate limit funcionando. Não é defeito.
- **5xx** é defeito.
- **status 0** é a rede do próprio arnês, não do servidor.

Somar os três num total esconde exatamente o que se quer saber.

### A prova de idempotência

O arnês manda o **mesmo `uploadId` duas vezes em paralelo** e confere que sai uma linha só. Não é enfeite: retry concorrente é o caminho normal num salão com sinal ruim.

Foi ela que pegou o defeito corrigido em `packages/db/src/uploads.ts` — o segundo confirm devolvia 403, o transporte tratava como definitivo, e a foto era **descartada da fila**. Nenhuma revisão de código tinha visto.

Com `DATABASE_URL` no ambiente, a contagem é conferida no banco. Sem ela, a prova vale só pelo HTTP e a saída diz isso.

---

## 4. Limpar

O arnês cria sessões e uploads de verdade.

```bash
node tools/carga/limpar.mjs tools/carga/execucoes/<arquivo>.json
```

Precisa de `DATABASE_URL` e `R2_*` **exportados no shell** — o script não lê `.env`. Sem eles a limpeza é pulada e diz que foi, mas **os objetos continuam no bucket**. Confira a saída; ela não mente, mas é fácil não ler.

---

## 5. O que este arnês NÃO prova

Lacuna dita vale mais que checklist verde.

- **Rede degradada.** O `CLAUDE.md` pede carga "com rede degradada" e o arnês roda na rede que tiver. Latência e perda de pacote não são simuladas.
- **O cliente.** Ele fala HTTP direto: não exercita fila em IndexedDB, Service Worker, processamento de imagem no aparelho, nem a bateria. O caminho do convidado de verdade passa por tudo isso.
- **Concorrência de leitura.** Telão e feed lendo enquanto 150 uploads sobem não é medido.
- **A execução completa de 150.** Até esta data só houve execução pequena (6 uploads) contra o dev local. **O portão de MVP continua aberto** até alguém rodar o padrão contra um ambiente parecido com produção e anexar o JSON aqui.
