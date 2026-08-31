"use client";

import { isVideoMime } from "@albora/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { webQueue } from "@/lib/queue";
import { useShare } from "@/features/my-photos/hooks/use-share";
import { useGallery } from "@/features/my-photos/hooks/use-gallery";
import { useRecap } from "@/features/my-photos/hooks/use-recap";
import { useRecapCard } from "@/features/my-photos/hooks/use-recap-card";
import { useReducedMotion } from "@/features/feed/hooks/use-reduced-motion";
import { Viewer } from "@/features/feed/components/client/viewer";
import {
  FloatingNav,
  GuestHeader,
  GuestShell,
  EmptyState,
  GuestMain,
  ErrorMessage,
  Badge,
} from "@albora/ui-web";
import { ShareConsentSheet } from "@/features/my-photos/components/client/share-consent-sheet";
import { RecapSheet } from "@/features/my-photos/components/client/recap-sheet";
import { RecapCard } from "@/features/my-photos/components/client/recap-card";
import { ThemeSetting } from "@/features/guest/components/client/theme-setting";
import {
  GalleryItem,
  RecapSection,
  ColagemSection,
  RetrySection,
} from "../ui";
import { rotuloEstado } from "../../lib/utils";

type MyPhotosPageProps = {
  slug: string;
  eventoId: string;
  sessaoId: string;
  cameraPath: string;
  refToken?: string | null;
};

export function MyPhotosPage({
  slug,
  eventoId,
  sessaoId,
  cameraPath,
  refToken,
}: MyPhotosPageProps) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const router = useRouter();

  // Core hooks
  const galeria = useGallery(eventoId);
  const compartilhar = useShare(eventoId, sessaoId);
  const recap = useRecap({
    eventoId,
    sessaoId,
    slug,
    itens: galeria.itensVisiveis,
  });
  const recapPessoal = useRecapCard();
  const movimentoReduzido = useReducedMotion();

  // Local state
  const [locais, setLocais] = useState<Map<string, string>>(new Map());
  const [mimesLocais, setMimesLocais] = useState<Map<string, string>>(
    new Map()
  );
  const [indiceAberto, setIndiceAberto] = useState<number | null>(null);

  const consentimentoAberto =
    compartilhar.pedindoConsentimento !== null ||
    compartilhar.pedindoColagem !== null ||
    recap.pedindoConsentimento;

  // Setup local preview URLs
  useEffect(() => {
    let cancelado = false;
    const criadas: string[] = [];

    void (async () => {
      const fila = await webQueue.list();
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

  // Derived state
  const resumo = useMemo(() => {
    if (galeria.resumo.subindo > 0) {
      return `${galeria.resumo.enviadas} enviadas · ${galeria.resumo.subindo} subindo`;
    }
    return `${galeria.resumo.total} ${galeria.resumo.total === 1 ? "foto" : "fotos"}`;
  }, [galeria.resumo]);

  const idsFotosEnviadas = useMemo(
    () =>
      galeria.itens
        .filter((i) => i.estado === "enviada" && !galeria.isVideo(i))
        .map((i) => i.id),
    [galeria]
  );

  // Viewer handlers
  const abrirEnviada = useCallback(
    (id: string) => {
      const indice = galeria.itensVisiveis.findIndex((i) => i.id === id);
      if (indice >= 0) setIndiceAberto(indice);
    },
    [galeria.itensVisiveis]
  );

  const sairViewer = useCallback(() => setIndiceAberto(null), []);

  const irPara = useCallback(
    (i: number) => {
      if (i < 0 || i >= galeria.itensVisiveis.length) return;
      setIndiceAberto(i);
    },
    [galeria.itensVisiveis.length]
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

  const confirmarConsentimento = useCallback(
    (nomeNaMoldura: boolean) => {
      if (recap.pedindoConsentimento) {
        void recap.confirmarConsentimento(nomeNaMoldura);
      } else if (compartilhar.pedindoColagem) {
        void compartilhar.confirmarConsentimentoColagem(
          compartilhar.pedindoColagem,
          nomeNaMoldura
        );
      } else if (compartilhar.pedindoConsentimento) {
        void compartilhar.confirmarConsentimento(
          compartilhar.pedindoConsentimento,
          nomeNaMoldura
        );
      }
    },
    [compartilhar, recap]
  );

  // Body overflow management
  useEffect(() => {
    if (indiceAberto === null) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [indiceAberto]);

  // Auto-close viewer if out of bounds
  useEffect(() => {
    if (
      indiceAberto !== null &&
      indiceAberto >= galeria.itensVisiveis.length
    ) {
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

          <RecapCard recap={recapPessoal} />

          {galeria.falha && (
            <ErrorMessage>Não deu para carregar agora.</ErrorMessage>
          )}

          {compartilhar.erro && <ErrorMessage>{compartilhar.erro}</ErrorMessage>}

          {recap.erro && !recap.aberto && (
            <ErrorMessage>{recap.erro}</ErrorMessage>
          )}

          {!galeria.carregando && galeria.itens.length === 0 && (
            <EmptyState
              title="Suas fotos vão aparecer aqui"
              lede="Quando você tirar a primeira, ela sobe sozinha e já aparece nesta grade."
              cameraPath={cameraPath}
            />
          )}

          {/* Gallery Grid */}
          <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
            {galeria.itens.map((item) => {
              const url =
                item.estado === "enviada"
                  ? galeria.urlDe(item)
                  : locais.get(item.id);
              const urlVideo =
                item.estado === "enviada"
                  ? galeria.urlCheia(item)
                  : locais.get(item.id);
              const isVideo =
                item.estado === "enviada"
                  ? galeria.isVideo(item)
                  : isVideoMime(mimesLocais.get(item.id) ?? "");
              const rotulo = rotuloEstado(item.estado);

              return (
                <GalleryItem
                  key={item.id}
                  item={item}
                  url={url ?? undefined}
                  urlVideo={urlVideo ?? undefined}
                  isVideo={isVideo}
                  rotulo={rotulo}
                  removendoId={galeria.removendoId}
                  onRemover={galeria.remover}
                  onAbrir={abrirEnviada}
                />
              );
            })}
          </ul>

          {/* Sections */}
          <RecapSection
            disponivel={recap.disponivel}
            quantidade={recap.quantidade}
            montando={recap.montando}
            onAbrir={() => void recap.abrir()}
          />

          <ColagemSection
            visible={idsFotosEnviadas.length >= 2}
            montando={compartilhar.colagemIds !== null}
            onCriar={() =>
              void compartilhar.compartilharColagem(
                idsFotosEnviadas.slice(0, 4)
              )
            }
          />

          <RetrySection
            count={galeria.resumo.falhou}
            drenando={galeria.drenando}
            onRetry={() => void galeria.tentarDeNovo()}
          />

          <ThemeSetting />
        </GuestMain>
      </GuestShell>

      {/* Viewer */}
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
          onVerAutor={(id) => router.push(`${base}/g/${encodeURIComponent(id)}`)}
        />
      )}

      {/* Sheets */}
      <RecapSheet
        aberto={recap.aberto}
        quadros={recap.quadros}
        indiceAtivo={recap.indiceAtivo}
        erro={recap.aberto ? recap.erro : null}
        compartilhando={recap.compartilhando}
        refToken={refToken ?? null}
        onIr={recap.irPara}
        onFechar={recap.fechar}
        onCompartilhar={() => void recap.compartilhar()}
      />

      <ShareConsentSheet
        open={consentimentoAberto}
        onClose={() => {
          compartilhar.cancelarConsentimento();
          recap.cancelarConsentimento();
        }}
        onConfirm={confirmarConsentimento}
      />

      <FloatingNav active="minhas" base={base} linkComponent={Link} />
    </>
  );
}
