"use client";

import type { FiltroAplicado, PlanoDoEvento, TextoComposto } from "@albora/core";
import { isVideoBytes } from "@albora/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mensagemCotaVideo, useUpload, type CotaVideo } from "@/features/photo/hooks/use-upload";
import {
  COPY_CTA_PWA,
  deveMostrarCtaPwa,
  usePwaInstall,
} from "@/features/photo/hooks/use-pwa-install";
import { Card, ErrorMessage, SecondaryButton, SkipLink } from "@albora/ui-web";
import { AppOpenCta } from "@/features/pairing/components/client/app-open-cta";
import { MissionCompletionToast } from "@/features/missions/components/ui/mission-completion-toast";
import {
  marcoMissao,
  persistirProgressoMissoes,
  proximaMissao,
  rotuloCtaAposEnvio,
} from "@/features/missions/lib/missions-utils";
import { Details, type Place } from "./details";
import { Editor } from "./editor";
import { QueueHeader } from "./queue-panel";
import { CameraView } from "./camera-view";
import { PwaInstallCta } from "./pwa-install-cta";
import { UploadArc } from "./upload-arc";

/** `capture="environment"` usa a câmera nativa — preview próprio custaria HDR e modo noturno, que às 22h no escuro é onde a foto se ganha (N5.7). */

export type PhotoMission = { id: string; title: string; done: boolean };

export type PhotoCopy = {
  placeQuestion: string;
};

/** `display: none` num input clicado por código já custou `capture` ignorado em Safari — mantido com absolute/opacity. */
const ESCONDIDO = "absolute size-px opacity-0 pointer-events-none";

type Etapa =
  | { nome: "camera" }
  | { nome: "editor"; arquivo: File }
  | { nome: "detalhes"; uploadId: string; arquivo: File }
  | { nome: "pronto"; arquivo: File };

export function PhotoPage({
  slug,
  eventoId,
  plan,
  videoQuota,
  eventTitle,
  missions: initialMissions,
  places,
  copy,
  recommendedFilter,
  initialMission = null,
  interactionOpen,
  promptKey = null,
  promptLabel = null,
  forceVideo = false,
}: {
  slug: string;
  eventoId: string;
  plan: PlanoDoEvento;
  videoQuota: CotaVideo;
  eventTitle: string;
  missions: PhotoMission[];
  places: Place[];
  copy: PhotoCopy;
  recommendedFilter: string | null;
  initialMission?: string | null;
  interactionOpen: boolean;
  promptKey?: string | null;
  promptLabel?: string | null;
  forceVideo?: boolean;
}) {
  const router = useRouter();
  const { estado, enfileirarFoto, anotar, drenarAgora } = useUpload(eventoId, { plano: plan, cotaVideo: videoQuota });
  const {
    disponivel: podeInstalar,
    jaInstalado,
    precisaInstrucaoIos,
    dispensado,
    pronto: pwaPronto,
    instalar,
    dispensar,
    avisarPromptIos,
  } = usePwaInstall();
  const [drenando, setDrenando] = useState(false);
  const entradaCamera = useRef<HTMLInputElement>(null);
  const entradaVideo = useRef<HTMLInputElement>(null);
  const entradaRolo = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>({ nome: "camera" });
  const [missions, setMissions] = useState(initialMissions);
  const [escolhida, setEscolhida] = useState<string | null>(() => {
    if (initialMission && initialMissions.some((m) => m.id === initialMission && !m.done)) {
      return initialMission;
    }
    if (initialMissions.length === 0) return null;
    return initialMissions.find((m) => !m.done)?.id ?? null;
  });
  const [recemCompleta, setRecemCompleta] = useState<PhotoMission | null>(null);
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
    setRecemCompleta(null);
    setEtapa({ nome: "camera" });
  }

  function completarMissaoAtual() {
    if (!escolhida) {
      setRecemCompleta(null);
      return;
    }
    const atual = missions.find((m) => m.id === escolhida) ?? null;
    setMissions((m) => m.map((x) => (x.id === escolhida ? { ...x, done: true } : x)));
    setRecemCompleta(atual ? { ...atual, done: true } : null);
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

  const avisoVideo = mensagemCotaVideo(videoQuota);

  async function escolheu(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(ev.target.files ?? [])];
    // Zera antes de seguir: sem isso, fotografar a mesma coisa duas vezes
    // seguidas não dispara o evento na segunda.
    ev.target.value = "";

    const primeiro = arquivos[0];
    if (!primeiro) return;

    // Uma foto passa pelo editor; um lote não — quem sobe dez do rolo não quer escolher filtro dez vezes, uma entrada de fila por arquivo é o que N5.6 pede.
    if (arquivos.length === 1) {
      const inicio = new Uint8Array(await primeiro.slice(0, 16).arrayBuffer());
      if (isVideoBytes(inicio)) {
        const r = await enfileirarFoto({
          arquivo: primeiro,
          desafioId: escolhida,
          promptKey,
        });
        if (r.ok) {
          setEnviadas((n) => n + 1);
          completarMissaoAtual();
          setEtapa({ nome: "pronto", arquivo: primeiro });
          registrarRecente(primeiro);
        }
        return;
      }
      setEtapa({ nome: "editor", arquivo: primeiro });
      registrarRecente(primeiro);
      return;
    }

    let algumOk = false;
    for (const arquivo of arquivos) {
      const r = await enfileirarFoto({ arquivo, desafioId: escolhida, promptKey });
      if (r.ok) {
        algumOk = true;
        setEnviadas((n) => n + 1);
      }
    }
    if (!algumOk) return;
    completarMissaoAtual();
    setEtapa({ nome: "pronto", arquivo: primeiro });
    registrarRecente(primeiro);
  }

  async function enviar(
    arquivo: File,
    filtro: FiltroAplicado | undefined,
    texto: TextoComposto | undefined,
    musicTrackId: string | undefined,
  ) {
    // Composer marca a foto como story quando o convidado escreve algo ou anexa faixa pelo sticker de música (spec 020, sub-etapas a e b) — até a sub-etapa c chegar.
    const r = await enfileirarFoto({
      arquivo,
      filtro,
      texto,
      story: !!texto || !!musicTrackId,
      musicTrackId,
      desafioId: escolhida,
      promptKey,
    });
    if (!r.ok) return;

    setEnviadas((n) => n + 1);
    completarMissaoAtual();

    setEtapa({ nome: "detalhes", uploadId: r.id, arquivo });
  }

  if (etapa.nome === "editor") {
    const chosenMission = escolhida ? missions.find((m) => m.id === escolhida) : undefined;
    const missionIndex = chosenMission ? missions.findIndex((m) => m.id === escolhida) + 1 : 0;

    return (
      <Editor
        arquivo={etapa.arquivo}
        recomendadoId={recommendedFilter}
        onEnviar={(filtro, texto, musicTrackId) =>
          void enviar(etapa.arquivo, filtro, texto, musicTrackId)
        }
        onDescartar={() => setEtapa({ nome: "camera" })}
        missao={
          chosenMission
            ? { indice: missionIndex, total: missions.length, title: chosenMission.title }
            : null
        }
      />
    );
  }

  if (etapa.nome === "detalhes") {
    return (
      <Details
        places={places}
        perguntaDoLugar={copy.placeQuestion}
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
        bytesPendentes={estado.bytesPendentes}
        online={estado.online}
        interactionOpen={interactionOpen}
        podeInstalar={podeInstalar}
        jaInstalado={jaInstalado}
        precisaInstrucaoIos={precisaInstrucaoIos}
        dispensado={dispensado}
        pwaPronto={pwaPronto}
        instalar={instalar}
        dispensar={dispensar}
        avisarPromptIos={avisarPromptIos}
        onOutra={() => irParaCamera(escolhida)}
        onProxima={() => {
          const next = proximaMissao(missions);
          irParaCamera(next?.id ?? null);
        }}
        missions={missions}
        recemCompleta={recemCompleta}
      />
    );
  }

  if (etapa.nome === "camera") {
    const chosenMission = escolhida ? missions.find((m) => m.id === escolhida) : undefined;
    const missionIndex = chosenMission ? missions.findIndex((m) => m.id === escolhida) + 1 : 0;
    const headerAction = (
      <QueueHeader
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

    const base = `/e/${encodeURIComponent(slug)}`;
    const onBack = promptKey
      ? () => router.push(`${base}/confessional`)
      : missions.length > 0
        ? () => router.push(`${base}/missions`)
        : () => router.push(`${base}/cover`);

    return (
      <>
        <style>{ESTILO}</style>
        <CameraView
          eventTitle={eventTitle}
          headerAction={headerAction}
          mission={
            promptLabel
              ? { index: 1, total: 1, title: promptLabel }
              : chosenMission
                ? { index: missionIndex, total: missions.length, title: chosenMission.title }
                : null
          }
          places={places}
          activePlaceId={lugarPre}
          onPlace={setLugarPre}
          recentThumbs={recentes}
          processing={estado.processando}
          onShutter={forceVideo || promptKey ? abrirVideo.bind(null, escolhida) : dispararCamera}
          onRoll={forceVideo || promptKey ? () => undefined : dispararRolo}
          onBack={onBack}
          footer={
            <>
              {estado.ultimoErro && (
                <div className="px-4">
                  <ErrorMessage>{estado.ultimoErro}</ErrorMessage>
                </div>
              )}
              {avisoVideo && (
                <p className="mt-3 text-center text-[0.82rem] leading-[1.6] text-ink-3">
                  {avisoVideo}
                </p>
              )}
              <button
                type="button"
                className={`foto-botao mt-3 w-full min-h-12 border border-linha bg-transparent text-[0.9rem] font-normal text-ink-2${
                  videoQuota.limite !== null && videoQuota.enviados >= videoQuota.limite ? " opacity-45" : ""
                }`}
                onClick={() => abrirVideo(escolhida)}
                disabled={
                  estado.processando ||
                  (videoQuota.limite !== null && videoQuota.enviados >= videoQuota.limite)
                }
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
          className={ESCONDIDO}
          onChange={escolheu}
        />
        <input
          ref={entradaRolo}
          type="file"
          accept="image/*"
          multiple
          className={ESCONDIDO}
          onChange={escolheu}
        />
        <input
          ref={entradaVideo}
          type="file"
          accept="video/*"
          capture="environment"
          className={ESCONDIDO}
          onChange={escolheu}
        />
      </>
    );
  }

  return null;
}

function Confirmacao({
  slug,
  arquivo,
  numero,
  pendentes,
  bytesPendentes,
  online,
  interactionOpen,
  podeInstalar,
  jaInstalado,
  precisaInstrucaoIos,
  dispensado,
  pwaPronto,
  instalar,
  dispensar,
  avisarPromptIos,
  onOutra,
  onProxima,
  missions,
  recemCompleta,
}: {
  slug: string;
  arquivo: File;
  numero: number;
  pendentes: number;
  bytesPendentes: number;
  online: boolean;
  interactionOpen: boolean;
  podeInstalar: boolean;
  jaInstalado: boolean;
  precisaInstrucaoIos: boolean;
  dispensado: boolean;
  pwaPronto: boolean;
  instalar: () => Promise<boolean>;
  dispensar: () => void;
  avisarPromptIos: () => void;
  onOutra: () => void;
  onProxima: () => void;
  missions: PhotoMission[];
  recemCompleta: PhotoMission | null;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const [url, setUrl] = useState<string | null>(null);
  const [musica, setMusica] = useState<{ rotulo: string; url: string; provedor: string } | null>(
    null,
  );
  const [toastAberto, setToastAberto] = useState(recemCompleta !== null);
  const proxima = proximaMissao(missions);
  const ctaPrimario = rotuloCtaAposEnvio(proxima);
  const feitas = missions.filter((m) => m.done).length;

  useEffect(() => {
    persistirProgressoMissoes(missions);
  }, [missions]);

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/music", { credentials: "same-origin" });
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
    <>
      <SkipLink />
      <main id="main-content" className="flex min-h-dvh flex-col bg-bg px-8 pb-9 pt-10 font-corpo text-ink">
      <style>{ESTILO}</style>

      {url && (
        <span className="amanhece-moldura mb-7 block aspect-[3/4] w-[min(62vw,16rem)] shrink-0 rounded-superficie">
          <img
            className="amanhece block size-full rounded-superficie object-cover"
            src={url}
            alt="Foto enviada"
          />
        </span>
      )}

      <p className="foto-titulo tipo-display tipo-balance m-0">
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

      {(pendentes > 0 || !online) && (
        <div className="mt-2 mb-1">
          <UploadArc
            pendentes={pendentes}
            bytesPendentes={bytesPendentes}
            online={online}
            lado={32}
          />
        </div>
      )}

      {!online && (
        <p className="foto-lede">
          Pode fechar o app — suas fotos sobem sozinhas quando voltar o sinal.
        </p>
      )}

      {musica && (
        <div className="mb-5 max-w-[34ch]">
          <span className="mb-1.5 block font-titulo text-[0.68rem] font-normal uppercase tracking-[0.28em] text-acento-texto">
            Trilha
          </span>
          <p className="m-0 text-[0.88rem] leading-[1.68] text-ink-2">
            {musica.rotulo}
            {" · "}
            <a href={musica.url} className="text-acento underline decoration-1 underline-offset-2">
              Abrir no {musica.provedor}
            </a>
          </p>
        </div>
      )}

      <span className="min-h-6 flex-[1_1_auto]" />

      {pendentes === 0 && numero === 1 && (
        <Card elevation={1} className="mb-5 grid max-w-[34ch] gap-3.5">
          <p className="m-0 flex items-baseline gap-3 text-[0.88rem] leading-[1.68] text-ink-2">
            <span className="shrink-0 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.28em] text-acento-texto">
              App
            </span>
            {COPY_CTA_PWA}
          </p>
          <PwaInstallCta
            mostrar={
              pwaPronto &&
              deveMostrarCtaPwa({
                enviadas: numero,
                pendentes,
                jaInstalado,
                dispensado,
                promptNativo: podeInstalar,
                precisaInstrucaoIos,
              })
            }
            promptNativo={podeInstalar}
            precisaInstrucaoIos={precisaInstrucaoIos}
            onInstalar={() => void instalar()}
            onDispensar={dispensar}
            onPromptIos={avisarPromptIos}
          />
          <AppOpenCta pairPath={`${base}/pair`} />
          <SecondaryButton onClick={() => router.push(`${base}/pair`)}>
            Ver código de 4 dígitos
          </SecondaryButton>
        </Card>
      )}

      <button
        className="foto-botao min-h-14 shrink-0 border-0 bg-ink text-[0.97rem] font-medium text-bg"
        onClick={proxima ? onProxima : onOutra}
      >
        {ctaPrimario}
      </button>

      <div className="mt-4 flex shrink-0 flex-col gap-2.5">
        {proxima && (
          <SecondaryButton onClick={onOutra}>Continuar tirando</SecondaryButton>
        )}
        {numero === 1 && (
          <SecondaryButton onClick={() => router.push(`${base}/my-photos`)}>
            Ver minha foto
          </SecondaryButton>
        )}
        {interactionOpen && (
          <SecondaryButton onClick={() => router.push(`${base}/feed`)}>
            Ir pro feed
          </SecondaryButton>
        )}
        <SecondaryButton onClick={() => router.push(`${base}/cover`)}>
          Voltar
        </SecondaryButton>
      </div>

      {toastAberto && recemCompleta && (
        <MissionCompletionToast
          missionTitle={recemCompleta.title}
          milestone={marcoMissao(feitas, missions.length)}
          slug={slug}
          onDismiss={() => setToastAberto(false)}
          acimaDaNav={false}
        />
      )}
    </main>
    </>
  );
}

const ESTILO = `
/* Tamanho, entrelinha e tracking vêm de .tipo-display — o pico emocional usa
   a mesma escala do nome do evento na capa. Aqui só a hierarquia de peso: o
   fato ("Foto 1.") mais firme, o sentimento ("Já tá no telão.") mais leve. */
.foto-titulo { font-weight: 500; margin: 0 0 0.4rem; }
.foto-titulo em { font-weight: 400; font-style: normal; }

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
  /* Toque físico (mola) na pressão; o hover é só um aceno (curva-base). */
  transition: transform var(--instantaneo) var(--mola), opacity var(--tempo-rapido) var(--curva);
}
.foto-botao:disabled { cursor: default; }
.foto-botao:hover:not(:disabled) { opacity: 0.9; }
.foto-botao:active:not(:disabled) { transform: scale(0.97); }

.foto-botao:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 5px;
}

@keyframes amanhecer {
  from { opacity: 0; filter: brightness(0.35) saturate(0.5); transform: scale(1.03); }
  to   { opacity: 1; filter: none; transform: none; }
}
.amanhece { animation: amanhecer calc(var(--tempo-lento) * 2) var(--curva) both; }

/*
 * A moldura acompanha a foto com o próprio "sol nascendo": a sombra parte de
 * nada, passa pelo âmbar do evento (--shadow-acento, nunca hex) no auge do
 * clareamento da imagem, e assenta na sombra alta de repouso — luz, não
 * brilho decorativo. Único lugar do convidado onde o acento aparece livre
 * (docs/product: "usado em exatamente dois lugares").
 */
@keyframes amanhecer-moldura {
  0%   { box-shadow: 0 0 0 0 transparent; }
  55%  { box-shadow: var(--shadow-acento); }
  100% { box-shadow: var(--shadow-alta); }
}
.amanhece-moldura {
  animation: amanhecer-moldura calc(var(--tempo-lento) * 2.4) var(--curva) both;
}

@media (prefers-reduced-motion: reduce) {
  .amanhece { animation: none; }
  .amanhece-moldura { animation: none; box-shadow: var(--shadow-alta); }
  .foto-botao { transition: none; }
  .foto-botao:hover:not(:disabled) { opacity: 1; }
  .foto-botao:active:not(:disabled) { transform: none; }
}
`;
