# Task 010 — Telão

> **Origem:** [`../flows.md` §5](../flows.md) · [`../architecture.md` §10](../architecture.md)
> **Depende de:** 004.

## Objetivo

Rodar **quatro horas sem ninguém tocar**, sobrevivendo a queda de rede e a reload.

## Escopo

**Entra**

- `GET /telao/[slug]` — fullscreen, sem cromo, sem cursor, resistente a reload
- Stream de mídia recém-publicada, com fallback para polling
- Fila de três faixas
- Cinco modelos de layout, escolhidos pelo casal
- Cache local das últimas 50
- Varredura "a foto amanhece" na mídia nova
- Estado vazio: QR grande, missões e identidade

**Não entra**

- Controle remoto, Chromecast, browser source para OBS

## 🔴 Nunca cortar na vertical

Três de cada quatro fotos de festa são verticais. Encaixar 9:16 em 16:9 com recorte descarta **dois terços da imagem, pelo topo e pela base** — e o topo é onde estão as cabeças. O produto decapitaria os convidados na parede.

| Modelo | Resolve como |
|---|---|
| Polaroide | Uma cópia por vez, crédito assinado na margem |
| Mural | Três verticais lado a lado — preenche 16:9 naturalmente |
| Colagem | Arranjos que alternam, para não virar papel de parede |
| Ambiente | Vertical inteira, com a própria foto desfocada de fundo |
| Cheio | Sangra até a borda — **só foto horizontal**, e a fila filtra |

Vale igual para vídeo.

## A fila

| Faixa | Peso | Por quê |
|---|---|---|
| Nunca exibida | 50% | Quem manda e nunca vê a sua para de mandar — e conta para a mesa |
| Recente | 25% | "Olha, é a minha" é o mecanismo de recrutamento |
| Popular, com decaimento | 25% | Decai por **exibições**, não só por tempo. Senão a foto das 21h fica na parede até as 3h |

## Como se verifica

1. Rodar **4 horas** sem intervenção
2. Cabo de rede arrancado → segue rodando com o cache das últimas 50
3. TV reiniciada → retoma sozinha, sem tela de configuração
4. Stream derrubado → cai para polling sem piscar
5. Foto vertical em cada um dos cinco modelos → **nenhum rosto cortado**
6. Toda foto publicada aparece **pelo menos uma vez**
7. Remoção some da parede em **menos de 5 segundos**
8. Zero marca Albora na tela

## Riscos

| Risco | Plano |
|---|---|
| Navegador da TV sem suporte a stream | Polling é o caminho padrão nesse aparelho, não a exceção |
| Memória crescendo em 4h | Teto duro no cache e liberação explícita das imagens antigas |
