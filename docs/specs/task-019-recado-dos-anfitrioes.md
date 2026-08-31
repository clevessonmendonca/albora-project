# Task 019 — O recado dos anfitriões

## Objetivo

O anfitrião grava um recado — em áudio, em texto ou nos dois — e cada convidado
o recebe **uma vez**, dentro do app, no momento que o anfitrião escolher.

## Contexto

Ideia trazida na conversa de 11/08/2026, ainda **não agendada**. Registrada
aqui em vez de virar folclore.

De onde ela puxa:

- [ADR 0009](../adr/0009-app-social-do-convidado.md) — a interação abre por
  gate, e quem define é o casal. O recado é a mesma mecânica: conteúdo que o
  anfitrião solta na hora que quiser.
- [Task 018](./task-018-musica-do-casal.md) — adjacente e **não é a mesma
  coisa**. Ver o parágrafo abaixo, porque a confusão é fácil e cara.

### Isto não é o que o ADR 0011 proíbe

O [ADR 0011](../adr/0011-musica-do-evento-sem-direito-de-sincronizacao.md)
recusa **áudio embutido** porque música comercial sincronizada a vídeo exige
direito de sincronização, e ninguém no fluxo tem esse direito.

O recado é outro objeto jurídico: é a **voz do próprio anfitrião**, gravada
por ele, sobre a qual ele detém tudo. Não há obra de terceiro, não há
sincronização e não há licença a obter. O ADR 0011 continua valendo integral
para música; ele não alcança isto.

O risco real é o oposto e mora na moderação: se alguém puser música de fundo
na gravação, o arquivo passa a conter obra de terceiro. O escopo abaixo trata
disso.

## Escopo

### Entra

- Gravação pelo admin, no navegador. Áudio curto, teto de **60 s**.
- Campo de texto, sempre. Ver "o salão é barulhento", abaixo.
- Agendamento: o recado aparece a partir de um horário que o anfitrião define,
  igual ao gate da interação.
- Entrega **uma vez por sessão de convidado**, com estado de lido.
- Um recado por evento no primeiro corte. Vários é fase seguinte.

### Não entra, e por quê

- **Áudio gravado por convidado.** Superfície de moderação inteiramente nova —
  áudio não é varrido pelo classificador que a [011](./task-011-moderacao.md)
  usa para imagem, e transcrever para moderar é custo e latência no dia da
  festa. Fica fora até existir decisão própria.
- **Resposta em áudio.** Mesma razão, mais o risco de virar caixa de mensagens
  paralela — que o projeto das telas já recusou.
- **Notificação push avisando do recado.** Notificação está desligada até ter
  decisão própria (ADR 0009). O recado espera o convidado abrir o app.
- **Música de fundo mixada pela Albora.** Aí sim cai no ADR 0011.

## Contrato

- Tabela `recado`, com `event_id` NOT NULL e RLS forçado, como toda tabela de
  dado de evento.
- Leitura por convidado em `recado_lido (event_id, sessao_id, recado_id)`.
- **O servidor não toca nos bytes do áudio.** PUT presigned direto no object
  storage, chave derivada no servidor em `events/{event_id}/recado/...`, igual
  à mídia do convidado. O cliente nunca informa a chave.
- O token do convidado autoriza **ler** o recado do evento dele. Nada além — em
  particular, não autoriza gravar.
- Retenção segue a do evento: exportação no dia 330, delete no 365.

### O caminho crítico não muda

O upload depende de object storage e Postgres, e só. O recado é **enriquecimento**:
se o áudio não carregar, a tela mostra o texto; se nada carregar, o app segue
para a câmera sem barrar ninguém. Um recado que impede fotografar inverteria a
prioridade do produto inteiro.

### O salão é barulhento

Este é o ponto de projeto que decide se a funcionalidade presta.

Às 23h, num salão com música alta, **um recado só em áudio é inaudível**. Não é
detalhe de acessibilidade: é o caso comum. Por isso o texto não é alternativa,
é o corpo — o áudio é a camada que emociona quem tem fone, ou quem abre no dia
seguinte no sofá.

A tela mostra o texto sempre, com o player acima. Legenda do áudio entra quando
houver transcrição; até lá, o campo de texto é obrigatório no admin.

## Como se verifica

1. Anfitrião grava 20 s, escreve o texto, agenda para daqui a 2 min. Antes da
   hora, nenhum convidado vê nada; depois, todos veem.
2. Convidado abre, o recado aparece uma vez, marca como lido e não volta.
3. Com o áudio bloqueado no DevTools, a tela mostra o texto e o caminho até a
   câmera continua funcionando.
4. Sessão do evento A não lê o recado do evento B, com `event_id` mal
   configurado no payload — teste contra banco real, como a
   [003](./task-003-schema-rls-isolamento.md).
5. A chave de storage é rejeitada quando o cliente tenta informá-la.

## Riscos

- **Ninguém grava.** É o risco de produto, não o técnico: se o anfitrião não
  souber o que dizer, o campo fica vazio e a funcionalidade não existe. Mitigação
  a testar: um exemplo curto pronto no admin.
- **Obra de terceiro na gravação.** Vale a mesma regra da moderação de imagem:
  quem publica responde, e o anfitrião aceita isso ao gravar. Registrar o aceite,
  versionado e datado.
- **Virar canal de recado recorrente.** Um recado por evento é fronteira, não
  limitação técnica. Vários recados começam a pedir notificação, e notificação
  tem ADR próprio a escrever antes.
