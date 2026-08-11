"use client";

import { useEffect, useState } from "react";

/**
 * A foto dentro do quadro 9:16, **sem cortar**.
 *
 * Três de cada quatro fotos de festa são verticais, e a tela do celular é
 * vertical: essas preenchem quase tudo sozinhas. O problema é a minoria
 * horizontal — encaixá-la à força num quadro vertical descartaria as laterais,
 * e é lá que está metade da mesa.
 *
 * A saída é o modelo **Ambiente** do `docs/flows.md` §5.0: a imagem inteira,
 * `contain`, com a própria foto desfocada estendendo o fundo. Nada é
 * descartado, e o quadro não fica com duas tarjas mortas em cima e embaixo.
 * O desfoque aqui é técnica de mídia — o banimento do `DESIGN.md` vale para
 * superfície de interface, onde blur lê como glassmorphism; esticar a própria
 * imagem é outra coisa, e o §5.0 diz isso com todas as letras.
 *
 * A miniatura entra primeiro e o arquivo cheio troca por cima quando chega. Sem
 * isso, cada toque é uma espera em tela preta — e a pessoa sai antes da terceira
 * foto.
 */
export function Quadro({
  urlThumb,
  urlCheia,
  alt,
  movimentoReduzido,
}: {
  urlThumb: string | undefined;
  urlCheia: string | undefined;
  alt: string;
  movimentoReduzido: boolean;
}) {
  const [cheiaPronta, setCheiaPronta] = useState(false);
  const [thumbCaiu, setThumbCaiu] = useState(false);
  const [cheiaCaiu, setCheiaCaiu] = useState(false);

  useEffect(() => setThumbCaiu(false), [urlThumb]);

  useEffect(() => {
    setCheiaPronta(false);
    setCheiaCaiu(false);
  }, [urlCheia]);

  // A URL assinada pode vencer no bolso da pessoa, e o arquivo pode ainda estar
  // subindo. Nos dois casos a tela mostra moldura — o ícone de imagem quebrada
  // diria que a foto de alguém se perdeu, e ela não se perdeu.
  const thumb = thumbCaiu ? undefined : urlThumb;
  const cheia = cheiaCaiu ? undefined : urlCheia;
  const fundo = thumb ?? cheia;

  const inteira: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };

  const transicao = movimentoReduzido ? undefined : "opacity 260ms ease-out";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      {fundo && (
        <img
          src={fundo}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // A escala esconde a borda transparente que o desfoque cria; a
            // dessaturação impede o fundo de brigar com a foto na frente.
            transform: "scale(1.18)",
            filter: "blur(44px) saturate(0.7) brightness(0.42)",
          }}
        />
      )}

      {thumb && (
        <img
          src={thumb}
          alt=""
          aria-hidden
          onError={() => setThumbCaiu(true)}
          style={{ ...inteira, opacity: cheiaPronta ? 0 : 1, transition: transicao }}
        />
      )}

      {cheia && (
        <img
          src={cheia}
          alt={alt}
          decoding="async"
          onLoad={() => setCheiaPronta(true)}
          onError={() => setCheiaCaiu(true)}
          style={{ ...inteira, opacity: cheiaPronta || !thumb ? 1 : 0, transition: transicao }}
        />
      )}

      {!fundo && (
        <div
          style={{
            position: "absolute",
            inset: "12% 8%",
            border: "1px solid var(--linha)",
            borderRadius: "var(--raio)",
          }}
        />
      )}
    </div>
  );
}

/**
 * A miniatura da lista de horas. Mesma regra do quadro: `contain`, porque não
 * existe tamanho a partir do qual cortar rosto passa a ser aceitável, e moldura
 * vazia quando o arquivo não vem.
 */
export function Capa({ url }: { url: string | undefined }) {
  const [caiu, setCaiu] = useState(false);

  useEffect(() => setCaiu(false), [url]);

  return (
    <span
      style={{
        display: "block",
        width: "44px",
        height: "58px",
        borderRadius: "var(--raio)",
        overflow: "hidden",
        background: "var(--superficie)",
        border: "1px solid var(--linha)",
      }}
    >
      {url && !caiu && (
        <img
          src={url}
          alt=""
          onError={() => setCaiu(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}
    </span>
  );
}
