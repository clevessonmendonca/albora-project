"use client";

import type { ItemDaGaleria } from "@albora/core";
import { isVideoMime } from "@albora/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { webQueue } from "@/lib/queue";
import { useShare } from "@/features/my-photos/hooks/use-share";
import { useGallery } from "@/features/my-photos/hooks/use-gallery";
import { Viewer } from "@/features/feed/components/client/viewer";
import { GuestTabBar } from "@/features/guest/components/client/guest-tab-bar";
import {
  BottomSheet,
  ConsentCheckbox,
  PrimaryButton,
  SecondaryButton,
  GuestHeader,
  GuestShell,
  EmptyState,
  GuestMain,
  ErrorMessage,
  Button,
} from "@albora/ui-web";
import { Badge } from "@albora/ui-web";

function rotuloEstado(estado: ItemDaGaleria["estado"]): string {
  if (estado === "subindo") return "Subindo…";
  if (estado === "falhou") return "Não subiu";
  return "";
}

function MiniaturaMinhas({
  isVideo,
  url,
  urlVideo,
  pendente,
}: {
  isVideo: boolean;
  url: string | undefined;
  urlVideo: string | null | undefined;
  pendente: boolean;
}) {
  const cobertura = "block size-full object-cover";

  if (isVideo && pendente && url) {
    return <video src={url} muted playsInline preload="metadata" className={cobertura} />;
  }

  if (isVideo && url) {
    return (
      <>
        <img src={url} alt="" loading="lazy" decoding="async" className={cobertura} />
        <IndicadorVideo />
      </>
    );
  }

  if (isVideo && urlVideo) {
    return <video src={urlVideo} muted playsInline preload="metadata" className={cobertura} />;
  }

  if (url) {
    return <img src={url} alt="" loading="lazy" decoding="async" className={cobertura} />;
  }

  return <div className="size-full bg-linha" />;
}

function IndicadorVideo() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center bg-gradient-video-scrim-forte"
    >
      <span className="grid size-8 place-items-center rounded-full border border-linha bg-bg-vidro text-xs">
        ▶
      </span>
    </span>
  );
}

export function MyPhotosPage({
  slug,
  eventoId,
  sessaoId,
  cameraPath,
}: {
  slug: string;
  eventoId: string;
  sessaoId: string;
  cameraPath: string;
}) {
  const galeria = useGallery(eventoId);
  const compartilhar = useShare(eventoId, sessaoId);
  const [locais, setLocais] = useState<Map<string, string>>(new Map());
  const [mimesLocais, setMimesLocais] = useState<Map<string, string>>(new Map());
  const [indiceAberto, setIndiceAberto] = useState<number | null>(null);
  const [nomeNaMoldura, setNomeNaMoldura] = useState(true);
  const movimentoReduzido = usarMovimentoReduzido();

  const consentimentoAberto =
    compartilhar.pedindoConsentimento !== null || compartilhar.pedindoColagem !== null;

  useEffect(() => {
    let cancelado = false;
    const criadas: string[] = [];

    void (async () => {
      const fila = await webQueue.listar();
      const mapa = new Map<string, string>();
      const mimes = new Map<string, string>();
      for (const item of fila) {
        if (item.eventoId !== eventoId) continue;
        if (item.corpo.tipo === "blob") {
          const url = URL.createObjectURL(item.corpo.blob);
          criadas.push(url);
          mapa.set(item.id, url);
          mimes.set(item.id, item.mime);
        }
      }
      if (!cancelado) {
        setLocais(mapa);
        setMimesLocais(mimes);
      }
    })();

    return () => {
      cancelado = true;
      for (const url of criadas) URL.revokeObjectURL(url);
    };
  }, [eventoId, galeria.itens]);

  const resumo = useMemo(() => {
    if (galeria.resumo.subindo > 0) {
      return `${galeria.resumo.enviadas} enviadas · ${galeria.resumo.subindo} subindo`;
    }
    return `${galeria.resumo.total} ${galeria.resumo.total === 1 ? "foto" : "fotos"}`;
  }, [galeria.resumo]);

  const idsFotosEnviadas = useMemo(
    () => galeria.itens.filter((i) => i.estado === "enviada" && !galeria.isVideo(i)).map((i) => i.id),
    [galeria],
  );

  const abrirEnviada = useCallback(
    (id: string) => {
      const indice = galeria.itensVisiveis.findIndex((i) => i.id === id);
      if (indice >= 0) setIndiceAberto(indice);
    },
    [galeria.itensVisiveis],
  );

  const sairViewer = useCallback(() => setIndiceAberto(null), []);

  const irPara = useCallback(
    (i: number) => {
      if (i < 0 || i >= galeria.itensVisiveis.length) return;
      setIndiceAberto(i);
    },
    [galeria.itensVisiveis.length],
  );

  const removerAberta = useCallback(async () => {
    if (indiceAberto === null) return;
    const visivel = galeria.itensVisiveis[indiceAberto];
    if (!visivel) return;
    const item = galeria.itens.find((i) => i.id === visivel.id);
    if (!item) return;
    const ok = await galeria.remover(item);
    if (ok) setIndiceAberto(null);
  }, [indiceAberto, galeria]);

  const compartilharAberta = useCallback(() => {
    if (indiceAberto === null) return;
    const visivel = galeria.itensVisiveis[indiceAberto];
    if (visivel) void compartilhar.compartilhar(visivel.id);
  }, [indiceAberto, galeria.itensVisiveis, compartilhar]);

  const confirmarConsentimento = useCallback(() => {
    if (compartilhar.pedindoColagem) {
      void compartilhar.confirmarConsentimentoColagem(compartilhar.pedindoColagem, nomeNaMoldura);
    } else if (compartilhar.pedindoConsentimento) {
      void compartilhar.confirmarConsentimento(compartilhar.pedindoConsentimento, nomeNaMoldura);
    }
  }, [compartilhar, nomeNaMoldura]);

  useEffect(() => {
    if (indiceAberto === null) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [indiceAberto]);

  useEffect(() => {
    if (indiceAberto !== null && indiceAberto >= galeria.itensVisiveis.length) {
      setIndiceAberto(null);
    }
  }, [indiceAberto, galeria.itensVisiveis.length]);

  const horaAberta =
    indiceAberto !== null && galeria.itensVisiveis[indiceAberto]
      ? new Date(galeria.itensVisiveis[indiceAberto].criadaEm).getHours()
      : 0;

  const uploadAberto =
    indiceAberto !== null ? galeria.itensVisiveis[indiceAberto]?.id : null;

  return (
    <>
      <GuestShell>
        <GuestMain>
          <GuestHeader
            title="Minhas fotos"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={
              !galeria.carregando ? (
                <Badge>{resumo}</Badge>
              ) : (
                <Badge>Carregando…</Badge>
              )
            }
          />

          {galeria.falha && <ErrorMessage>Não deu para carregar agora.</ErrorMessage>}

          {compartilhar.erro && <ErrorMessage>{compartilhar.erro}</ErrorMessage>}

          {!galeria.carregando && galeria.itens.length === 0 && (
            <EmptyState
              title="Suas fotos aparecem aqui"
              lede="Assim que a primeira subir, ela fica nesta grade."
              cameraPath={cameraPath}
            />
          )}

          <ul className="m-0 grid list-none grid-cols-3 gap-0.5 p-0">
            {galeria.itens.map((item) => {
              const url = item.estado === "enviada" ? galeria.urlDe(item) : locais.get(item.id);
              const urlVideo =
                item.estado === "enviada" ? galeria.urlCheia(item) : locais.get(item.id);
              const isVideo =
                item.estado === "enviada"
                  ? galeria.isVideo(item)
                  : isVideoMime(mimesLocais.get(item.id) ?? "");
              const rotulo = rotuloEstado(item.estado);

              return (
                <li key={item.id} className="relative aspect-square">
                  {item.estado !== "enviada" && (
                    <button
                      type="button"
                      aria-label="Remover esta foto"
                      disabled={galeria.removendoId === item.id}
                      onClick={() => void galeria.remover(item)}
                      className="absolute right-1 top-1 z-[1] grid min-h-7 min-w-7 cursor-pointer place-items-center rounded-full border-0 bg-bg-vidro-opaco p-0 text-xs text-ink-2 disabled:cursor-wait"
                    >
                      ×
                    </button>
                  )}
                  {item.estado === "enviada" ? (
                    <button
                      type="button"
                      aria-label={isVideo ? "Abrir este vídeo" : "Abrir esta foto"}
                      onClick={() => abrirEnviada(item.id)}
                      className="size-full cursor-pointer overflow-hidden rounded-token border-0 bg-transparent p-0"
                    >
                      <div className="relative size-full border border-linha bg-superficie">
                        <MiniaturaMinhas
                          isVideo={isVideo}
                          url={url ?? undefined}
                          urlVideo={urlVideo ?? undefined}
                          pendente={false}
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="relative size-full overflow-hidden rounded-token border border-linha bg-superficie">
                      <MiniaturaMinhas
                        isVideo={isVideo}
                        url={url ?? undefined}
                        urlVideo={urlVideo ?? undefined}
                        pendente
                      />
                    </div>
                  )}

                  {rotulo && (
                    <span
                      className={`absolute inset-x-1 bottom-1 rounded-pilula bg-bg-vidro-suave px-[0.35rem] py-[0.2rem] text-center text-[0.625rem] uppercase tracking-[0.06em] ${
                        item.estado === "falhou" ? "text-critico" : "text-ink-2"
                      }`}
                    >
                      {rotulo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {idsFotosEnviadas.length >= 2 && (
            <div className="mt-5">
              <SecondaryButton
                disabled={compartilhar.colagemIds !== null}
                onClick={() => void compartilhar.compartilharColagem(idsFotosEnviadas.slice(0, 4))}
              >
                {compartilhar.colagemIds ? "Montando colagem…" : "Colagem da noite"}
              </SecondaryButton>
            </div>
          )}

          {galeria.resumo.falhou > 0 && (
            <div className="mt-6">
              <PrimaryButton
                disabled={galeria.drenando}
                onClick={() => void galeria.tentarDeNovo()}
              >
                {galeria.drenando ? "Tentando…" : "Tentar de novo"}
              </PrimaryButton>
            </div>
          )}
        </GuestMain>
      </GuestShell>

      {indiceAberto !== null && galeria.itensVisiveis[indiceAberto] && (
        <Viewer
          itens={galeria.itensVisiveis}
          indice={indiceAberto}
          hora={horaAberta}
          urls={galeria.urls}
          interacao={galeria.interacao}
          cameraPath={cameraPath}
          movimentoReduzido={movimentoReduzido}
          onIr={irPara}
          onSair={sairViewer}
          onReacoes={galeria.atualizarReacoes}
          onRemover={() => void removerAberta()}
          removendo={galeria.removendoId === uploadAberto}
          onCompartilhar={compartilharAberta}
          compartilhando={compartilhar.compartilhandoId === uploadAberto}
        />
      )}

      <BottomSheet
        title="Compartilhar para fora"
        titleId="consentimento-externo-titulo"
        open={consentimentoAberto}
        onClose={() => compartilhar.cancelarConsentimento()}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="md" width="full" onClick={() => compartilhar.cancelarConsentimento()}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" width="full" onClick={confirmarConsentimento}>
              Aceitar e compartilhar
            </Button>
          </div>
        }
      >
        <p className="m-0 text-[0.9rem] leading-normal text-ink-2">
          Ao compartilhar, a foto sai do evento com uma moldura. Quem receber pode guardar
          para sempre — não dá para desfazer depois.
        </p>
        <ConsentCheckbox checked={nomeNaMoldura} onChange={setNomeNaMoldura}>
          Incluir meu primeiro nome na moldura
        </ConsentCheckbox>
      </BottomSheet>

      <GuestTabBar slug={slug} active="minhas" />
    </>
  );
}

function usarMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(mq.matches);
    const ouvir = () => setReduzido(mq.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);

  return reduzido;
}
