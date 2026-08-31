# Task 018 — A música do casal

> **Origem:** [ADR 0011](../adr/0011-musica-do-evento-sem-direito-de-sincronizacao.md) · [`../product/albora-produto-arquitetura.md`](../product/albora-produto-arquitetura.md) Tier 2
> **Depende de:** 009 (admin, para o casal escolher). A camada 2 depende também da 010; a 015 consome a sugestão de compartilhamento.

## Objetivo

A música do casal aparece no produto e **viaja com as fotos**.

## Escopo

O [ADR 0011](../adr/0011-musica-do-evento-sem-direito-de-sincronizacao.md) separa isto em três camadas. Esta task entrega a **1** inteira e prepara a **3**; a **2** tem condição de entrada própria.

**Entra**

- Campo no admin para o casal informar faixa ou playlist, por **link colado** — Spotify, YouTube Music, ou outro
- Resolução do link em metadado exibível: título, artista, capa, e a URL de volta
- Exibição no telão, na confirmação de envio do convidado e no álbum
- **Sugestão de música no compartilhamento**: ao compartilhar, o convidado vê qual é a música do casal, com o link para abrir na plataforma
- Degradação completa: sem música configurada, sem link resolvível, ou provedor fora do ar, tudo continua funcionando

**Não entra**

- **Qualquer arquivo produzido por nós que contenha áudio de terceiro.** É a fronteira do ADR 0011 e ela não se cruza nesta task nem em nenhuma outra sem parecer jurídico
- Reprodução no telão — é a camada 2, com condição de entrada abaixo
- Pedido de música por convidado, fila de pedidos, votação
- Login do convidado em qualquer provedor de streaming

## Contrato

**Link colado, não OAuth.** O casal cola a URL da faixa ou da playlist. Isso evita OAuth inteiro na camada 1, funciona para qualquer provedor, e não exige conta paga. OAuth só aparece se a camada 2 entrar.

**O link é dado de usuário, e é validado contra conjunto fechado de hosts.** Aceitar URL arbitrária aqui é abrir redirecionamento a partir de uma página que o casal controla e 200 convidados abrem. Host fora da lista é recusado com motivo, nunca "salvo e quebrado depois".

**A resolução do metadado é enriquecimento e roda fora do caminho crítico.** Se a capa e o título não vierem, exibe-se o link cru. Provedor fora do ar não pode segurar salvamento no admin nem carregamento do telão.

**Um catálogo, não um provedor.** Spotify e YouTube Music têm bases diferentes no Brasil, e amarrar a um exclui metade dos casais. A camada 1 guarda identificador e link — nada de sessão.

**A sugestão de compartilhamento é texto e link.** Quem oferece adicionar música é a plataforma de destino, que tem licença para isso. Nós dizemos qual.

**A música é token do evento**, resolvida pelo mesmo resolvedor do [ADR 0003](../adr/0003-runtime-token-resolution.md) — web, telão e peça impressa leem a mesma fonte.

### Condição de entrada da camada 2 — reprodução no telão

Só começa quando **todas** forem verdade:

1. A task 010 (telão) estiver entregue e rodando em evento real
2. Existir plano escrito de renovação de token para seis horas sem operador
3. A queda do áudio estiver provada como não derrubando o telão — teste, não intenção

## Como se verifica

1. Casal cola link de faixa do Spotify → título, artista e capa aparecem no telão e na confirmação do convidado
2. Casal cola link de playlist do YouTube Music → mesmo resultado
3. Link de host fora da lista → recusado no admin, com motivo legível
4. Provedor fora do ar no momento do salvamento → salva o link, exibe cru, **não** bloqueia
5. Evento sem música configurada → todas as telas funcionam sem buraco de layout
6. Compartilhamento → convidado vê a música sugerida e o link abre na plataforma
7. **Nenhum arquivo gerado pelo produto contém áudio.** Verificação por inspeção do que sai do compartilhamento

## Riscos

| Risco | Plano |
|---|---|
| Alguém implementar "vídeo com a música" por parecer o passo óbvio | O ADR 0011 é explícito e este item está em "não entra". A verificação 7 existe para pegar |
| Provedor mudar o formato do link ou fechar o endpoint de metadado | A exibição degrada para link cru. A lista de hosts é conjunto fechado num lugar só |
| Casal colar link de faixa privada, ou de conta pessoal | Resolve para o que der; se não resolver, link cru. Não tentar autenticar para ler |
| A leitura jurídica do ADR 0011 estar errada em algum detalhe | Pendência declarada no próprio ADR. A camada 1 não depende dessa leitura — ela é link e texto |

---

## Decisões de produto — 11/08/2026

**Teto de três sugestões por convidado.** A lista é objeto compartilhado: sem
teto, um entusiasta sozinho é dono dela e os outros param de sugerir porque não
adianta. Três é o bastante para alguém se sentir ouvido e baixo o bastante para
cem convidados renderem uma lista que o casal consegue olhar.

**Voto não conta contra o teto** — só a faixa que o convidado introduziu.
Contar voto puniria quem concorda, e é a concordância que faz a lista convergir
em vez de virar cem faixas de uma vez cada.

**Sem aprovação prévia do casal.** A sugestão entra na lista direto, ordenada
por voto. Exigir aprovação antes de aparecer criaria a fila que a spec 011 já
recusa em moderação: no dia da festa ninguém vai trabalhar fila, e um controle
que fica desligado não é controle. O controle do casal está no ponto de **uso**
— o que de fato toca — e não no ponto de sugestão.
