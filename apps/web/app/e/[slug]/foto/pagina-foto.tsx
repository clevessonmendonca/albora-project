"use client";

import type { FiltroAplicado, PlanoDoEvento } from "@albora/core";
import { ehVideo } from "@albora/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CotaVideo, mensagemCotaVideo, usarEnvio } from "@/lib/usar-envio";
import { usarInstalacaoPwa } from "@/lib/usar-instalacao-pwa";
import { RecadoErro, BotaoSecundario } from "../../../telas/shell-convidado";
import { Detalhes, type Lugar } from "./detalhes";
import { Editor } from "./editor";
import { CabecalhoFila } from "./painel-fila";
import { VisaoCamera } from "./visao-camera";

/**
 * O caminho crítico inteiro, em cinco toques: consentir, nome, missão, câmera,
 * enviar. Legenda e lugar vêm depois e não contam — a subida já começou (§3.1).
 *
 * Não monta preview de câmera: `capture="environment"` abre a câmera nativa do
 * aparelho, que é a que o convidado já sabe usar e a única que funciona igual
 * em iPhone velho e Android novo. Preview próprio custaria HDR e modo noturno,
 * e às 22h no escuro é aí que a foto se ganha (N5.7).
 */

export type Missao = { id: string; titulo: string; feito: boolean };

export type Textos = {
  lugarPergunta: string;
};

/**
 * Escondido do olho, presente no layout. `display: none` num input de arquivo
 * clicado por código já custou `capture` ignorado em Safari.
 */
const ESCONDIDO: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  opacity: 0,
  pointerEvents: "none",
};

type Etapa =
  | { nome: "camera" }
  | { nome: "editor"; arquivo: File }
  | { nome: "detalhes"; uploadId: string; arquivo: File }
  | { nome: "pronto"; arquivo: File };

export function PaginaFoto({
  slug,
  eventoId,
  plano,
  cotaVideo,
  tituloEvento,
  missoes: missoesIniciais,
  lugares,
  textos,
  filtroRecomendado,
  missaoInicial = null,
  interacaoAberta,
}: {
  slug: string;
  eventoId: string;
  plano: PlanoDoEvento;
  cotaVideo: CotaVideo;
  tituloEvento: string;
  missoes: Missao[];
  lugares: Lugar[];
  textos: Textos;
  filtroRecomendado: string | null;
  missaoInicial?: string | null;
  interacaoAberta: boolean;
}) {
  const router = useRouter();
  const { estado, enfileirarFoto, anotar, drenarAgora } = usarEnvio(eventoId, { plano, cotaVideo });
  const [drenando, setDrenando] = useState(false);
  const entradaCamera = useRef<HTMLInputElement>(null);
  const entradaVideo = useRef<HTMLInputElement>(null);
  const entradaRolo = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>({ nome: "camera" });
  const [missoes, setMissoes] = useState(missoesIniciais);
  const [escolhida, setEscolhida] = useState<string | null>(() => {
    if (missaoInicial && missoesIniciais.some((m) => m.id === missaoInicial && !m.feito)) {
      return missaoInicial;
    }
    if (missoesIniciais.length === 0) return null;
    return missoesIniciais.find((m) => !m.feito)?.id ?? null;
  });
  const [lugarPre, setLugarPre] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<string[]>([]);
  const [enviadas, setEnviadas] = useState(0);

  useEffect(() => {
    return () => {
      for (const url of recentes) URL.revokeObjectURL(url);
    };
  }, [recentes]);

  function irParaCamera(missaoId: string | null) {
    setEscolhida(missaoId);
    setEtapa({ nome: "camera" });
  }

  function dispararCamera() {
    entradaCamera.current?.click();
  }

  function dispararRolo() {
    entradaRolo.current?.click();
  }

  function registrarRecente(arquivo: File) {
    const url = URL.createObjectURL(arquivo);
    setRecentes((antes) => [url, ...antes.filter((u) => u !== url)].slice(0, 3));
  }

  function abrirVideo(missaoId: string | null) {
    irParaCamera(missaoId);
    queueMicrotask(() => entradaVideo.current?.click());
  }

  const avisoVideo = mensagemCotaVideo(cotaVideo);

  async function escolheu(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(ev.target.files ?? [])];
    // Zera antes de seguir: sem isso, fotografar a mesma coisa duas vezes
    // seguidas não dispara o evento na segunda.
    ev.target.value = "";

    const primeiro = arquivos[0];
    if (!primeiro) return;

    // Uma foto passa pelo editor. Um lote não: quem sobe dez do rolo no
    // domingo de manhã não quer escolher filtro dez vezes, e uma entrada de
    // fila por arquivo é o que a N5.6 pede.
    if (arquivos.length === 1) {
      const inicio = new Uint8Array(await primeiro.slice(0, 16).arrayBuffer());
      if (ehVideo(inicio)) {
        const r = await enfileirarFoto({ arquivo: primeiro, desafioId: escolhida });
        if (r.ok) {
          setEnviadas((n) => n + 1);
          if (escolhida) {
            setMissoes((m) => m.map((x) => (x.id === escolhida ? { ...x, feito: true } : x)));
          }
          setEtapa({ nome: "pronto", arquivo: primeiro });
          registrarRecente(primeiro);
        }
        return;
      }
      setEtapa({ nome: "editor", arquivo: primeiro });
      registrarRecente(primeiro);
      return;
    }

    for (const arquivo of arquivos) {
      const r = await enfileirarFoto({ arquivo, desafioId: escolhida });
      if (r.ok) setEnviadas((n) => n + 1);
    }
    setEtapa({ nome: "pronto", arquivo: primeiro });
    registrarRecente(primeiro);
  }

  async function enviar(arquivo: File, filtro: FiltroAplicado | undefined) {
    const r = await enfileirarFoto({ arquivo, filtro, desafioId: escolhida });
    if (!r.ok) return;

    setEnviadas((n) => n + 1);

    if (escolhida) {
      setMissoes((m) => m.map((x) => (x.id === escolhida ? { ...x, feito: true } : x)));
    }

    setEtapa({ nome: "detalhes", uploadId: r.id, arquivo });
  }

  if (etapa.nome === "editor") {
    const missaoEscolhida = escolhida ? missoes.find((m) => m.id === escolhida) : undefined;
    const indiceMissao = missaoEscolhida ? missoes.findIndex((m) => m.id === escolhida) + 1 : 0;

    return (
      <Editor
        arquivo={etapa.arquivo}
        recomendadoId={filtroRecomendado}
        onEnviar={(filtro) => void enviar(etapa.arquivo, filtro)}
        onDescartar={() => setEtapa({ nome: "camera" })}
        missao={
          missaoEscolhida
            ? { indice: indiceMissao, total: missoes.length, titulo: missaoEscolhida.titulo }
            : null
        }
      />
    );
  }

  if (etapa.nome === "detalhes") {
    return (
      <Detalhes
        lugares={lugares}
        perguntaDoLugar={textos.lugarPergunta}
        lugarInicial={lugarPre}
        onPronto={(detalhes) => {
          void anotar(etapa.uploadId, detalhes);
          setEtapa({ nome: "pronto", arquivo: etapa.arquivo });
        }}
      />
    );
  }

  if (etapa.nome === "pronto") {
    return (
      <Confirmacao
        slug={slug}
        arquivo={etapa.arquivo}
        numero={enviadas}
        pendentes={estado.pendentes}
        online={estado.online}
        interacaoAberta={interacaoAberta}
        onOutra={() => setEtapa({ nome: "camera" })}
      />
    );
  }

  if (etapa.nome === "camera") {
    const missaoEscolhida = escolhida ? missoes.find((m) => m.id === escolhida) : undefined;
    const indiceMissao = missaoEscolhida ? missoes.findIndex((m) => m.id === escolhida) + 1 : 0;
    const acaoCabecalho = (
      <CabecalhoFila
        eventoId={eventoId}
        pendentes={estado.pendentes}
        bytesPendentes={estado.bytesPendentes}
        online={estado.online}
        drenando={drenando}
        onDrenar={async () => {
          setDrenando(true);
          try {
            await drenarAgora();
          } finally {
            setDrenando(false);
          }
        }}
      />
    );

    return (
      <>
        <style>{ESTILO}</style>
        <VisaoCamera
          tituloEvento={tituloEvento}
          acaoCabecalho={acaoCabecalho}
          missao={
            missaoEscolhida
              ? { indice: indiceMissao, total: missoes.length, titulo: missaoEscolhida.titulo }
              : null
          }
          lugares={lugares}
          lugarAtivo={lugarPre}
          onLugar={setLugarPre}
          recentes={recentes}
          processando={estado.processando}
          onDisparar={dispararCamera}
          onRolo={dispararRolo}
          {...(missoes.length > 0
            ? { onVoltar: () => router.push(`/e/${encodeURIComponent(slug)}/missoes`) }
            : {})}
          rodape={
            <>
              {estado.ultimoErro && <RecadoErro>{estado.ultimoErro}</RecadoErro>}
              {avisoVideo && (
                <p
                  style={{
                    margin: avisoVideo ? "0.75rem 0 0" : 0,
                    fontSize: "0.8rem",
                    lineHeight: 1.6,
                    textAlign: "center",
                    color: "var(--ink-3)",
                  }}
                >
                  {avisoVideo}
                </p>
              )}
              <button
                type="button"
                className="foto-botao"
                onClick={() => abrirVideo(escolhida)}
                disabled={
                  estado.processando ||
                  (cotaVideo.limite !== null && cotaVideo.enviados >= cotaVideo.limite)
                }
                style={{
                  marginTop: "0.75rem",
                  width: "100%",
                  fontSize: "0.9rem",
                  fontWeight: 400,
                  minHeight: "48px",
                  border: "1px solid var(--linha)",
                  background: "transparent",
                  color: "var(--ink-2)",
                  opacity:
                    cotaVideo.limite !== null && cotaVideo.enviados >= cotaVideo.limite ? 0.45 : 1,
                }}
              >
                Gravar vídeo
              </button>
            </>
          }
        />

        <input
          ref={entradaCamera}
          type="file"
          accept="image/*"
          capture="environment"
          style={ESCONDIDO}
          onChange={escolheu}
        />
        <input
          ref={entradaRolo}
          type="file"
          accept="image/*"
          multiple
          style={ESCONDIDO}
          onChange={escolheu}
        />
        <input
          ref={entradaVideo}
          type="file"
          accept="video/*"
          capture="environment"
          style={ESCONDIDO}
          onChange={escolheu}
        />
      </>
    );
  }

  return null;
}

/**
 * A confirmação. A foto **amanhece**: entra escura e clareia até a cor cheia.
 *
 * Não é enfeite — é o retorno visual de que aquele arquivo virou uma foto no
 * álbum, no único instante em que o convidado está olhando para saber isso.
 */
function Confirmacao({
  slug,
  arquivo,
  numero,
  pendentes,
  online,
  interacaoAberta,
  onOutra,
}: {
  slug: string;
  arquivo: File;
  numero: number;
  pendentes: number;
  online: boolean;
  interacaoAberta: boolean;
  onOutra: () => void;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const { disponivel: podeInstalar, instalar } = usarInstalacaoPwa();
  const [url, setUrl] = useState<string | null>(null);
  const [musica, setMusica] = useState<{ rotulo: string; url: string; provedor: string } | null>(
    null,
  );

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/musica", { credentials: "same-origin" });
        if (!r.ok) return;
        const corpo = (await r.json()) as {
          musica: { rotulo: string; url: string; provedor: string } | null;
        };
        setMusica(corpo.musica);
      } catch {
        /* degrada: confirmação funciona sem música */
      }
    })();
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "2.5rem 2rem 2.25rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <style>{ESTILO}</style>

      {url && (
        <img
          className="amanhece"
          src={url}
          alt=""
          style={{
            flex: "none",
            width: "min(62vw, 16rem)",
            aspectRatio: "3 / 4",
            objectFit: "cover",
            borderRadius: "var(--raio-superficie)",
            marginBottom: "1.75rem",
          }}
        />
      )}

      <p className="foto-titulo" style={{ margin: 0 }}>
        {!online ? (
          <>
            Sem sinal.
            <br />
            <em>Suas fotos sobem sozinhas.</em>
          </>
        ) : pendentes > 0 ? (
          <>
            Foto {numero}.
            <br />
            <em>Já está subindo.</em>
          </>
        ) : (
          <>
            Foto {numero}.
            <br />
            <em>Já tá no telão.</em>
          </>
        )}
      </p>

      {!online && <p className="foto-lede">Pode fechar. A gente cuida.</p>}

      {musica && (
        <p
          style={{
            margin: "0 0 1rem",
            maxWidth: "34ch",
            fontSize: "0.88rem",
            lineHeight: 1.68,
            color: "var(--ink-2)",
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "0.25rem",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.68rem",
              fontWeight: 400,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            Trilha
          </span>
          {musica.rotulo}
          {" · "}
          <a href={musica.url} style={{ color: "var(--acento)" }}>
            Abrir no {musica.provedor}
          </a>
        </p>
      )}

      <span style={{ flex: "1 1 auto", minHeight: "1.5rem" }} />

      {pendentes === 0 && numero === 1 && (
        <div
          style={{
            margin: "0 0 1.25rem",
            maxWidth: "34ch",
          }}
        >
          <p
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.75rem",
              margin: "0 0 0.75rem",
              fontSize: "0.88rem",
              lineHeight: 1.68,
              color: "var(--ink-2)",
            }}
          >
            <span
              style={{
                flex: "none",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "0.68rem",
                fontWeight: 400,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--acento-texto)",
              }}
            >
              App
            </span>
            Instale e receba suas fotos depois da festa
          </p>
          {podeInstalar && (
            <BotaoSecundario onClick={() => void instalar()}>Instalar na tela inicial</BotaoSecundario>
          )}
        </div>
      )}

      <button
        className="foto-botao"
        onClick={onOutra}
        style={{
          flex: "none",
          fontSize: "0.97rem",
          fontWeight: 500,
          minHeight: "56px",
          border: "none",
          background: "var(--ink)",
          color: "var(--bg)",
        }}
      >
        Continuar tirando
      </button>

      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          marginTop: "0.875rem",
        }}
      >
        {numero === 1 && (
          <BotaoSecundario onClick={() => router.push(`${base}/minhas`)}>
            Ver minha foto
          </BotaoSecundario>
        )}
        {interacaoAberta && (
          <BotaoSecundario onClick={() => router.push(`${base}/feed`)}>
            Ver o feed
          </BotaoSecundario>
        )}
        <BotaoSecundario onClick={() => router.push(`${base}/capa`)}>
          Voltar à capa
        </BotaoSecundario>
      </div>
    </main>
  );
}

const ESTILO = `
.foto-titulo {
  font-family: var(--fonte-titulo);
  font-size: clamp(1.6rem, 7.6vw, 1.9375rem);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: var(--tracking-titulo);
  margin: 0 0 0.4rem;
  text-wrap: balance;
}
.foto-titulo em { font-weight: 400; }

.foto-lede {
  margin: 0 0 1.1rem;
  max-width: 34ch;
  font-size: 0.94rem;
  line-height: 1.68;
  color: var(--ink-2);
}

.foto-recado {
  margin: 0.9rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--critico);
}

.foto-botao {
  font: inherit;
  letter-spacing: var(--tracking-rotulo);
  border-radius: var(--raio-pilula);
  padding: 0 1.5rem;
  cursor: pointer;
  transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
}
.foto-botao:disabled { cursor: default; }
.foto-botao:active:not(:disabled) { transform: scale(0.972); }

.foto-botao:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 5px;
}

@keyframes amanhecer {
  from { opacity: 0; filter: brightness(0.35) saturate(0.5); transform: scale(1.03); }
  to   { opacity: 1; filter: none; transform: none; }
}
.amanhece { animation: amanhecer calc(var(--tempo-lento) * 2) var(--curva) both; }

@media (prefers-reduced-motion: reduce) {
  .amanhece { animation: none; }
  .foto-botao { transition: none; }
  .foto-botao:active:not(:disabled) { transform: none; }
}
`;
