"use client";

import type { ModoInteracao } from "@albora/core";
import { isVideoMime } from "@albora/core";
import { cn } from "@albora/ui-web";
import { useEffect, useRef, useState } from "react";
import { hourLabel } from "@/features/feed/lib/group-by-hour";
import type { MediaUrl } from "@/lib/media";
import type { ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { PhotoInteraction } from "@/features/feed/components/client/photo-interaction";
import { Frame } from "./frame";

/** Avanço por toque (quem está de pé com um copo toca, não desliza). Ao acabar devolve ao feed — o social existe para disparar a próxima foto, não para prender (ADR 0009). */

const DURACAO_MS = 5_000;
/** Acima disto o dedo está segurando, não tocando. */
const LIMIAR_LONGO_MS = 220;
/** Abaixo disto é tremida de dedo, não deslize. */
const DESLIZE_MIN_PX = 44;
/** Deslize e toque longo abafam o clique que vem logo atrás — só ele. */
const SUPRESSAO_MS = 600;

const CLASSE_SOMBRA_TEXTO = "[text-shadow:0_1px_4px_var(--bg)]";

/** Chave vazia fica de fora — item sem arquivo cheio não vira pedido de assinatura para string vazia. */
export function viewerKeys(itens: readonly ItemVisivel[], indice: number): string[] {
  const chaves: string[] = [];
  const atual = itens[indice];

  if (atual) {
    if (isVideoMime(atual.mime)) chaves.push(atual.chaveFull);
    else chaves.push(atual.chaveThumb, atual.chaveFull);
  }

  for (const passo of [1, 2]) {
    const proximo = itens[indice + passo];
    if (!proximo) continue;
    if (isVideoMime(proximo.mime)) chaves.push(proximo.chaveFull);
    else chaves.push(proximo.chaveThumb, proximo.chaveFull);
  }

  for (const passo of [-1, 3, 4]) {
    const vizinho = itens[indice + passo];
    if (!vizinho) continue;
    if (isVideoMime(vizinho.mime)) chaves.push(vizinho.chaveFull);
    else chaves.push(vizinho.chaveThumb);
  }

  return [...new Set(chaves.filter(Boolean))];
}

export function Viewer({
  itens,
  indice,
  hora,
  urls,
  interacao,
  cameraPath,
  movimentoReduzido,
  onIr,
  onSair,
  onReacoes,
  onBloqueado,
  onRemover,
  removendo,
  onCompartilhar,
  compartilhando,
  onVerAutor,
}: {
  itens: ItemVisivel[];
  indice: number;
  hora: number;
  urls: Map<string, MediaUrl>;
  interacao: ModoInteracao;
  cameraPath: string;
  movimentoReduzido: boolean;
  onIr: (indice: number) => void;
  onSair: () => void;
  onReacoes?: (uploadId: string, resultado: ResultadoReacao) => void;
  onBloqueado?: () => void;
  onRemover?: () => void;
  removendo?: boolean;
  onCompartilhar?: () => void;
  compartilhando?: boolean;
  onVerAutor?: ((sessaoId: string) => void) | undefined;
}) {
  const [segurando, setSegurando] = useState(false);

  const gesto = useRef({ x: 0, y: 0, longo: false });
  const cronometroLongo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suprimirAte = useRef(0);
  const precarregadas = useRef<HTMLImageElement[]>([]);

  const atual = itens[indice];
  const isVideo = atual ? isVideoMime(atual.mime) : false;
  const urlThumb = atual && !isVideo ? urls.get(atual.chaveThumb)?.url : undefined;
  const urlCheia = atual ? urls.get(atual.chaveFull)?.url : undefined;
  const temMidia = Boolean(isVideo ? urlCheia : urlThumb ?? urlCheia);

  function avancar() {
    if (indice + 1 < itens.length) onIr(indice + 1);
    else onSair();
  }

  function voltar() {
    if (indice > 0) onIr(indice - 1);
  }

  // Pré-carrega as próximas — sem isso cada avanço começa uma conexão nova e a foto aparece depois do gesto.
  useEffect(() => {
    const alvos: string[] = [];
    for (const passo of [1, 2]) {
      const proximo = itens[indice + passo];
      if (!proximo) continue;
      if (isVideoMime(proximo.mime)) {
        const url = urls.get(proximo.chaveFull)?.url;
        if (url) alvos.push(url);
        continue;
      }
      const url = urls.get(proximo.chaveFull)?.url ?? urls.get(proximo.chaveThumb)?.url;
      if (url) alvos.push(url);
    }

    if (alvos.length === 0) return;

    precarregadas.current = alvos.map((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      return img;
    });
  }, [indice, itens, urls]);

  // Não conta enquanto não há mídia na tela — cinco segundos de preto não é ritmo, é foto perdida.
  useEffect(() => {
    if (movimentoReduzido || segurando || !temMidia || isVideo) return;

    const id = setTimeout(() => {
      if (indice + 1 < itens.length) onIr(indice + 1);
      else onSair();
    }, DURACAO_MS);

    return () => clearTimeout(id);
  }, [movimentoReduzido, segurando, temMidia, isVideo, indice, itens.length, onIr, onSair]);

  useEffect(() => {
    return () => {
      if (cronometroLongo.current) clearTimeout(cronometroLongo.current);
    };
  }, []);

  function soltar() {
    if (cronometroLongo.current) {
      clearTimeout(cronometroLongo.current);
      cronometroLongo.current = null;
    }
    setSegurando(false);
  }

  function pressionou(ev: React.PointerEvent) {
    gesto.current = { x: ev.clientX, y: ev.clientY, longo: false };
    if (cronometroLongo.current) clearTimeout(cronometroLongo.current);
    cronometroLongo.current = setTimeout(() => {
      gesto.current.longo = true;
      setSegurando(true);
    }, LIMIAR_LONGO_MS);
  }

  function largou(ev: React.PointerEvent) {
    const { x, y, longo } = gesto.current;
    soltar();

    const dx = ev.clientX - x;
    const dy = ev.clientY - y;

    if (longo) {
      suprimirAte.current = Date.now() + SUPRESSAO_MS;
      return;
    }

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > DESLIZE_MIN_PX) {
      suprimirAte.current = Date.now() + SUPRESSAO_MS;
      // Para baixo fecha. É o gesto que a pessoa já traz de outros aplicativos,
      // e ele não substitui o botão de sair — só chega antes dele.
      if (dy > 0) onSair();
      return;
    }

    if (Math.abs(dx) > DESLIZE_MIN_PX) {
      suprimirAte.current = Date.now() + SUPRESSAO_MS;
      if (dx < 0) avancar();
      else voltar();
    }
  }

  // O toque em si é o clique do botão da zona — é ele que o teclado também aciona.
  function tocou(acao: () => void) {
    return () => {
      if (Date.now() < suprimirAte.current) return;
      acao();
    };
  }

  // Listener no documento, não no elemento — após um toque o foco vai para o body e onKeyDown de elemento nunca recebe Escape.
  useEffect(() => {
    function tecla(ev: KeyboardEvent) {
      if (ev.key === "ArrowRight") {
        if (indice + 1 < itens.length) onIr(indice + 1);
        else onSair();
      } else if (ev.key === "ArrowLeft") {
        if (indice > 0) onIr(indice - 1);
      } else if (ev.key === "Home") {
        if (indice > 0) onIr(0);
      } else if (ev.key === "End") {
        if (indice < itens.length - 1) onIr(itens.length - 1);
      } else if (ev.key === "Escape") {
        onSair();
      } else {
        return;
      }
      ev.preventDefault();
    }

    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [indice, itens.length, onIr, onSair]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos das ${hourLabel(hora)}`}
      onPointerDown={pressionou}
      onPointerUp={largou}
      onPointerCancel={soltar}
      className="fixed inset-0 z-10 grid grid-rows-[auto_1fr_auto] overflow-hidden bg-bg font-corpo text-ink touch-manipulation select-none viewer-entra"
    >
      <style>{`
        .st-zona { appearance: none; background: transparent; border: none; padding: 0; cursor: pointer; }
        .st-zona:focus-visible { outline: 1px solid var(--acento); outline-offset: -8px; }
        @keyframes st-correr { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes viewer-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .viewer-entra { animation: viewer-fade-in var(--tempo-rapido) var(--curva) both; }
        @media (prefers-reduced-motion: reduce) {
          .st-corrida { animation: none !important; transform: scaleX(1); }
          .viewer-entra { animation: none !important; }
        }
      `}</style>

      {atual && (
        <Frame
          urlThumb={urlThumb}
          urlCheia={urlCheia}
          alt={isVideo ? `Vídeo de ${atual.autor}` : `Foto de ${atual.autor}`}
          movimentoReduzido={movimentoReduzido}
          isVideo={isVideo}
          {...(isVideo && !movimentoReduzido && !segurando ? { onFim: avancar } : {})}
        />
      )}

      <header className="relative z-2 grid gap-3 bg-veu-feed-topo px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Filete, não barra: 1,5px, sem raio, um segmento por foto da hora. */}
        <div className="flex h-[1.5px] gap-0.75" aria-hidden>
          {itens.map((item, i) => (
            <div key={item.id} className="flex-1 overflow-hidden bg-linha">
              <div
                className={cn("h-full origin-left bg-acento", i === indice && "st-corrida")}
                style={{
                  transform:
                    i < indice || (i === indice && (movimentoReduzido || !temMidia))
                      ? "scaleX(1)"
                      : "scaleX(0)",
                  animation:
                    i === indice && !movimentoReduzido && temMidia && !isVideo
                      ? `st-correr ${DURACAO_MS}ms linear forwards`
                      : undefined,
                  animationPlayState: segurando ? "paused" : "running",
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <p
            className={cn(
              "m-0 font-titulo text-[0.7rem] font-normal uppercase tracking-[0.24em] text-ink-2",
              CLASSE_SOMBRA_TEXTO,
            )}
          >
            {hourLabel(hora)}
          </p>

          <div className="flex items-center gap-2">
            {onRemover && (
              <button
                type="button"
                aria-label="Remover esta foto"
                disabled={removendo}
                onClick={onRemover}
                className={cn(
                  "grid size-12 place-items-center rounded-full border border-linha bg-transparent font-inherit text-[1.1rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento hover:text-acento",
                  CLASSE_SOMBRA_TEXTO,
                  removendo ? "cursor-wait" : "cursor-pointer",
                )}
              >
                ×
              </button>
            )}
            <button
              type="button"
              onClick={onSair}
              className={cn(
                "min-h-12 min-w-12 cursor-pointer rounded-pilula border border-linha bg-transparent px-[1.1rem] font-inherit text-[0.9rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto",
                CLASSE_SOMBRA_TEXTO,
              )}
            >
              Fechar
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-1 flex">
        <button
          type="button"
          className="st-zona basis-[34%]"
          aria-label="Foto anterior"
          onClick={tocou(voltar)}
        />
        <button
          type="button"
          className="st-zona flex-1"
          aria-label="Próxima foto"
          onClick={tocou(avancar)}
        />
      </div>

      <footer className="relative z-2 grid gap-4 bg-veu-feed-base px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
        {/* Região viva: anuncia o autor da foto atual para leitores de tela. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {atual ? `${indice + 1} de ${itens.length}: foto de ${atual.autor}` : ""}
        </p>

        {atual && (
          <div className={cn("grid gap-[0.3rem]", CLASSE_SOMBRA_TEXTO)}>
            <p className="m-0 font-titulo text-[0.66rem] font-normal uppercase tracking-[0.2em] text-ink">
              {atual.sessaoAutor && onVerAutor ? (
                <button
                  type="button"
                  onClick={() => onVerAutor(atual.sessaoAutor!)}
                  className="cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
                >
                  {atual.autor}
                </button>
              ) : (
                atual.autor
              )}
              {atual.lugar ? ` · ${atual.lugar}` : ""}
            </p>
            {atual.legenda && (
              <p className="m-0 text-[0.95rem] leading-normal text-ink-2">{atual.legenda}</p>
            )}
            <PhotoInteraction
              uploadId={atual.id}
              interacao={interacao}
              autor={atual.autor}
              {...(atual.reacoes !== undefined ? { reacoesInicial: atual.reacoes } : {})}
              {...(atual.minhaReacao !== undefined ? { minhaInicial: atual.minhaReacao } : {})}
              {...(atual.sessaoAutor ? { sessaoAutor: atual.sessaoAutor } : {})}
              {...(atual.minha !== undefined ? { minha: atual.minha } : {})}
              {...(onReacoes ? { onReacoes: (r) => onReacoes(atual.id, r) } : {})}
              {...(onBloqueado ? { onBloqueado } : {})}
              {...(onCompartilhar ? { onCompartilhar } : {})}
              {...(compartilhando !== undefined ? { compartilhando } : {})}
              {...(onVerAutor ? { onVerAutor } : {})}
            />
          </div>
        )}

        {/* Fixo e sempre visível — é o plano de risco da própria task 007: esta
            tela não otimiza tempo de tela, ela devolve a pessoa para a câmera. */}
        <a
          href={cameraPath}
          className="grid min-h-13.5 place-items-center rounded-pilula bg-acento px-[2.1rem] text-[1.02rem] font-medium tracking-rotulo text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80"
        >
          Tirar foto
        </a>
      </footer>
    </div>
  );
}
