import React, { useCallback, useEffect, useRef, useState } from "react";
import { Badge, buttonVariants } from "@albora/ui-web";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

export type MidiaEmRevisao = {
  id: string;
  autor: string;
  denuncias: number;
  pedidosDeRemocao?: number;
  motivo: string;
  criadaEm: string;
  thumb?: string;
};

type Decisao = "liberar" | "ocultar";

type Props = {
  midias: MidiaEmRevisao[];
  onDecidir: (id: string, acao: Decisao) => Promise<boolean>;
  onSair: () => void;
};

const ALVO = "min-h-12 px-6";
const PERIGO = buttonVariants({ variant: "danger", size: "md" });

function ehCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName);
}

export function ReviewFocus({ midias, onDecidir, onSair }: Props) {
  const [indice, setIndice] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const raiz = useRef<HTMLDivElement>(null);

  const total = midias.length;
  const atual = midias[Math.min(indice, total - 1)];

  useEffect(() => {
    raiz.current?.focus();
  }, []);

  useEffect(() => {
    if (indice > total - 1) setIndice(Math.max(0, total - 1));
  }, [indice, total]);

  const decidir = useCallback(
    async (acao: Decisao) => {
      if (!atual || ocupado) return;
      setOcupado(true);
      const ok = await onDecidir(atual.id, acao);
      setOcupado(false);
      setAviso(
        ok
          ? `${acao === "liberar" ? "Foto aprovada" : "Foto ocultada"}. ${
              total - 1 === 0 ? "Fila limpa." : `${total - 1} ${total - 1 === 1 ? "restante" : "restantes"}.`
            }`
          : "Não foi possível concluir. Tente de novo.",
      );
    },
    [atual, ocupado, onDecidir, total],
  );

  const ir = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndice((i) => (i + delta + total) % total);
      setAviso("");
    },
    [total],
  );

  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ehCampoDeTexto(ev.target)) return;
      const tecla = ev.key.toLowerCase();
      if (tecla === "escape") {
        ev.preventDefault();
        onSair();
      } else if (tecla === "a") {
        ev.preventDefault();
        void decidir("liberar");
      } else if (tecla === "r") {
        ev.preventDefault();
        void decidir("ocultar");
      } else if (tecla === "arrowright" || tecla === "j") {
        ev.preventDefault();
        ir(1);
      } else if (tecla === "arrowleft" || tecla === "k") {
        ev.preventDefault();
        ir(-1);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [decidir, ir, onSair]);

  if (!atual) {
    return (
      <div ref={raiz} tabIndex={-1} className="flex flex-col items-center gap-4 py-10 text-center outline-none">
        <p className="m-0 font-titulo text-lg text-ink">Fila limpa</p>
        <p role="status" aria-live="polite" className="tipo-caption m-0 text-ink-2">
          {aviso}
        </p>
        <button type="button" className={`${adminClasses.secondaryButton} ${ALVO}`} onClick={onSair}>
          Voltar à lista
        </button>
      </div>
    );
  }

  const posicao = Math.min(indice, total - 1) + 1;

  return (
    <div
      ref={raiz}
      role="group"
      aria-label="Revisão foto a foto"
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tipo-label m-0 text-ink-2" aria-live="off">
          Foto {posicao} de {total}
        </p>
        <button type="button" className={`${adminClasses.secondaryButton} min-h-11 px-5`} onClick={onSair}>
          Sair da revisão <span className="sr-only">(Esc)</span>
        </button>
      </div>

      <div className="grid min-h-[16rem] place-items-center overflow-hidden rounded-media bg-superficie-alta">
        {atual.thumb ? (
          <img
            src={atual.thumb}
            alt={`Foto de ${atual.autor} para revisar`}
            className="max-h-[min(70dvh,40rem)] w-full object-contain"
          />
        ) : (
          <p className="tipo-caption m-0 p-6 text-ink-3">Prévia indisponível</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-titulo text-base text-ink">{atual.autor}</span>
        <div className="flex flex-wrap gap-1">
          {atual.denuncias > 0 && (
            <Badge tone="critico">
              {`${atual.denuncias} ${atual.denuncias === 1 ? "denúncia" : "denúncias"}`}
            </Badge>
          )}
          {(atual.pedidosDeRemocao ?? 0) > 0 && <Badge tone="critico">remoção pedida</Badge>}
          {atual.motivo === "endurecido" && <Badge tone="outline">aguardando</Badge>}
          {atual.motivo === "classificador" && <Badge tone="outline">filtro auto</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          aria-keyshortcuts="A"
          onClick={() => void decidir("liberar")}
          className={`${adminClasses.primaryButton} ${ALVO}`}
        >
          Aprovar <kbd className="ml-2 text-xs opacity-80">A</kbd>
        </button>
        <button
          type="button"
          disabled={ocupado}
          aria-keyshortcuts="R"
          onClick={() => void decidir("ocultar")}
          className={`${PERIGO} ${ALVO}`}
        >
          Ocultar <kbd className="ml-2 text-xs opacity-80">R</kbd>
        </button>
        <button
          type="button"
          disabled={total < 2}
          aria-keyshortcuts="ArrowLeft K"
          onClick={() => ir(-1)}
          className={`${adminClasses.secondaryButton} ${ALVO}`}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={total < 2}
          aria-keyshortcuts="ArrowRight J"
          onClick={() => ir(1)}
          className={`${adminClasses.secondaryButton} ${ALVO}`}
        >
          Próxima
        </button>
      </div>

      <p className="tipo-caption m-0 text-ink-3">
        Teclado: A aprova, R oculta, setas ou J e K navegam, Esc sai.
      </p>
      <p role="status" aria-live="polite" className="tipo-caption m-0 min-h-4 text-ink-2">
        {aviso}
      </p>
    </div>
  );
}
