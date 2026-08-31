# Runbook — Conversão CMYK com Ghostscript

**Escopo:** impressão profissional do livro PDF gerado por `GET /api/admin/events/{id}/book/pdf`.

---

## Contexto

O endpoint padrão gera um PDF em **perfil sRGB prepress** com sangria de 3 mm (`BOOK_CUT_MM = 216 × 303 mm`). A saída é adequada para gráficas que aceitam sRGB e fazem a conversão internamente, ou para prova digital (envio por e-mail, Canva, etc.).

Para gráficas que exigem CMYK FOGRA39 ou ISO Coated v2, é necessária uma conversão offline — o Ghostscript (GS) **nunca é executado no Worker ou no request path**.

---

## Perfil ICC alvo

| Finalidade | Perfil |
|---|---|
| Europa / papel couchê | ISO Coated v2 300% (ECI) — `ISOcoated_v2_300_eci.icc` |
| Brasil / offset comum | FOGRA39 (Gracol 2006 Coated 1v2 é aceito como equivalente) |
| Prova digital (SWOP) | SWOP2006_Coated3v2.icc |

Baixe os perfis em [ECI.org](https://www.eci.org/en/downloads) ou do repositório da ICC.

---

## Pré-requisitos

```bash
# macOS
brew install ghostscript

# Ubuntu / Debian
apt-get install ghostscript

# Verificar versão (9.54+ recomendado)
gs --version
```

---

## Exemplo de comando GS

```bash
gs \
  -dBATCH -dNOPAUSE -dNOSAFER \
  -sDEVICE=pdfwrite \
  -dPDFSETTINGS=/prepress \
  -dCompatibilityLevel=1.5 \
  -sColorConversionStrategy=CMYK \
  -dProcessColorModel=/DeviceCMYK \
  -sOutputICCProfile=/path/to/ISOcoated_v2_300_eci.icc \
  -sICCProfilesDir=/usr/share/ghostscript/icc/ \
  -sOutputFile="livro-cmyk.pdf" \
  "livro-slug.pdf"
```

Substitua `/path/to/ISOcoated_v2_300_eci.icc` pelo caminho local do perfil.

---

## Posição no pipeline

```
Worker / Next.js request
  └─ generateBookPdf() → PDF sRGB prepress (padrão e automático)

Job offline (fora do Worker, sob demanda ops)
  └─ gs [comando acima] → PDF CMYK → entrega manual para a gráfica
```

O GS é um passo de pós-processamento **manual e offline**, executado pela equipe de operações antes de enviar para uma gráfica específica. Não é automático e não deve entrar no request path — o binário não precisa estar presente em CI, Workers ou contêineres da aplicação.

---

## Validação do resultado

Após a conversão, abra o PDF em Acrobat Pro (ou Inkscape com plugin) e confirme:

- **Output intent:** ISO Coated v2 (ou o perfil escolhido)
- **Modelo de cor:** CMYK em todos os objetos
- **Prova impressa:** 1 folha em papel couchê 150 g/m², conferir se o acento corresponde à expectativa do casal

Se a prova impressa mostrar desvio inaceitável no acento, ajuste `identity_tokens.cores.acento` para uma cor que resiste melhor à conversão (geralmente ciano ou magenta puro se saem bem; tons de laranja-amarelo perdem saturação).

---

## ?perfil=cmyk na API

Adicionar `?perfil=cmyk` à URL do endpoint devolve **422** com mensagem explicativa — esse comportamento é intencional e documenta que a conversão não está disponível no runtime do Worker. Use o fluxo offline descrito acima.
