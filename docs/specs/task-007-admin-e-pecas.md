# Task 007 — Admin: evento, missões e geração de peças

> **Origem:** [`../flows.md` §2](../flows.md) · [`../architecture.md` §6](../architecture.md)
> **Depende de:** 003.

## Objetivo

O casal criar o evento e sair com um **PDF pronto para gráfica** cujo QR escaneia depois de impresso.

## Escopo

**Entra**

- Login por magic link, com reautenticação para ação destrutiva
- Criar evento, escolher pack, definir identidade, escolher 8–12 missões
- Geração de peças: placa A4, card de mesa, card de missão
- Pipeline SVG → PDF, com os tokens do evento
- Painel ao vivo: participação sobre `expected_guests`, funil, últimas fotos

**Não entra**

- Livro de fotos, export para Drive, white-label de fornecedor

## Contrato — as regras de peça impressa

| Regra | Porquê |
|---|---|
| **QR sempre em alto contraste**, mesmo com identidade de baixo contraste | A identidade colore a peça, nunca o código. Âmbar sobre noite é lindo no preview e não escaneia em luz baixa |
| **Correção de erro nível H**, zona de silêncio generosa | O papel vai ser dobrado, molhado e fotografado tremido de 40cm |
| **Mínimo ~3 cm** de lado; o gerador recusa abaixo disso | Recusar na geração é barato; descobrir na festa é irreversível |
| **URL legível sob todo QR** | Câmera velha, permissão negada, código riscado |
| Sangria 3 mm, área de segurança 5 mm | Nenhum é difícil isolado; todos derrubam um pedido |
| **Aviso de RGB → CMYK antes do download** | Avisar antes é expectativa; avisar depois é reclamação |

Render **em fila, nunca em request**: 40 páginas a 300 dpi passa de 300 MB.

## Como se verifica

1. **Imprimir de verdade** e escanear com três celulares diferentes, em luz baixa
2. Gerador recusa layout que produza QR abaixo do mínimo
3. Trocar a identidade e regerar → peça sai coerente, com aviso de divergência do já impresso
4. Participação bate com `sessões_com_upload / expected_guests`
5. Magic link é de uso único e validade curta
6. Baixar acervo exige reautenticação

O item 1 não é opcional. QR que funciona na tela e falha no papel é o modo de falha mais caro do produto.

## Riscos

| Risco | Plano |
|---|---|
| Fonte não embutida no PDF | Validar embutimento no CI, com Fraunces e Inter (ambas OFL) |
| E-mail do casal comprometido | Reautenticação em ação destrutiva; magic link não basta sozinho |
