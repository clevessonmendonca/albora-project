import { Avatar } from "./avatar";
import { CommentIcon, ShareIcon } from "./icons";
import { cn } from "./variants";

export type PhotoCardProps = {
  autor: string;
  quando: string;
  fotoUrl?: string;
  curtidas: number;
  curtido: boolean;
  comentarios: number;
  onCurtir?: () => void;
  onComentar?: () => void;
  onCompartilhar?: () => void;
  onSalvar?: () => void;
};

const ACAO_CLASSE =
  "inline-flex min-h-[3.375rem] min-w-[3.375rem] cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-inherit text-inherit disabled:cursor-default";

function HeartIcon({ size = 22, filled }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.2c-.28 0-.55-.1-.76-.28-1.32-1.16-2.78-2.36-4.06-3.55C4.6 14.03 3 12.02 3 9.55 3 6.98 5.02 5 7.5 5c1.62 0 2.99.79 3.86 2.01a.78.78 0 0 0 1.28 0C13.51 5.79 14.88 5 16.5 5 18.98 5 21 6.98 21 9.55c0 2.47-1.6 4.48-4.18 6.82-1.28 1.19-2.74 2.4-4.06 3.55-.21.18-.48.28-.76.28Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5v16l-6-4.2-6 4.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Card de foto do feed social do convidado — cabeçalho, mídia e barra de ações. */
export function PhotoCard({
  autor,
  quando,
  fotoUrl,
  curtidas,
  curtido,
  comentarios,
  onCurtir,
  onComentar,
  onCompartilhar,
  onSalvar,
}: PhotoCardProps) {
  return (
    <article className="flex flex-col gap-3">
      <header className="flex items-center gap-2.5">
        <Avatar name={autor} className="size-[1.875rem] text-[0.75rem]" />
        <span className="flex-1 font-titulo text-[0.9375rem] tracking-titulo text-ink">{autor}</span>
        <span className="text-[0.6875rem] text-ink-3">{quando}</span>
      </header>

      <div className="overflow-hidden rounded-[1.25rem] bg-superficie-alta">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={`Foto de ${autor}`}
            className="block aspect-4/5 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="aspect-4/5" />
        )}
      </div>

      <div className="flex items-center gap-5 text-ink">
        <button
          type="button"
          aria-pressed={curtido}
          aria-label="Curtir"
          onClick={onCurtir}
          className={cn(ACAO_CLASSE, curtido && "text-acento")}
        >
          <HeartIcon filled={curtido} />
          <span className="font-titulo text-[0.8125rem] tracking-rotulo">{curtidas}</span>
        </button>

        <button type="button" aria-label="Comentar" onClick={onComentar} className={ACAO_CLASSE}>
          <CommentIcon size={22} />
          <span className="font-titulo text-[0.8125rem] tracking-rotulo">{comentarios}</span>
        </button>

        <button type="button" aria-label="Compartilhar" onClick={onCompartilhar} className={ACAO_CLASSE}>
          <ShareIcon size={21} />
        </button>

        <button
          type="button"
          aria-label="Salvar"
          onClick={onSalvar}
          className={cn(ACAO_CLASSE, "ml-auto justify-end")}
        >
          <BookmarkIcon />
        </button>
      </div>
    </article>
  );
}
