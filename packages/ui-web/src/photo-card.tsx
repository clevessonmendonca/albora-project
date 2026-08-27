import type { ElementType } from "react";
import { BookmarkIcon, CommentIcon, HeartIcon, ShareIcon } from "./icons";
import { PostAuthorAvatar } from "./post-header";
import { cn } from "./variants";

export type PhotoCardProps = {
  autor: string;
  /**
   * Link para o perfil de quem tirou a foto. Opcional e retrocompatível: só
   * existe quando o servidor manda o id do autor (`sessaoAutor`), que é
   * depois do gate — antes disso o nome fica só texto, nunca clicável.
   */
  autorHref?: string;
  /**
   * Componente de link a usar quando `autorHref` existe. Padrão `"a"` — o
   * pacote não depende de Next, então quem tem `next/link` disponível injeta
   * (mesmo padrão de `FloatingNavProps.linkComponent`), e sem isso o toque no
   * autor recarrega a página inteira em vez de navegar client-side.
   */
  linkComponent?: ElementType;
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
  "inline-flex min-h-[3.375rem] min-w-[3.375rem] cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-inherit text-inherit disabled:cursor-default transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70";

/** Card de foto do feed social do convidado — cabeçalho, mídia e barra de ações. */
export function PhotoCard({
  autor,
  autorHref,
  linkComponent,
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
  const L = linkComponent ?? "a";

  return (
    <article className="flex flex-col gap-3">
      <header className="flex items-center gap-2.5">
        {autorHref ? (
          <L
            href={autorHref}
            className="flex flex-1 items-center gap-2.5 text-inherit no-underline"
          >
            <PostAuthorAvatar name={autor} />
            <span className="font-titulo text-[0.9375rem] tracking-titulo text-ink">{autor}</span>
          </L>
        ) : (
          <>
            <PostAuthorAvatar name={autor} />
            <span className="flex-1 font-titulo text-[0.9375rem] tracking-titulo text-ink">
              {autor}
            </span>
          </>
        )}
        <span className="text-[0.6875rem] text-ink-3">{quando}</span>
      </header>

      <div className="overflow-hidden rounded-media bg-superficie-alta">
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
