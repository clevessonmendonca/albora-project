"use client";

import type { ComponentType, ReactNode } from "react";
import { Avatar, initials } from "./avatar";

export const authorInitials = initials;

export function PostAuthorAvatar({ name }: { name: string }) {
  return <Avatar name={name} className="size-[1.875rem] text-[0.75rem]" />;
}

export function PostHeader({
  author,
  meta,
  timestamp,
  autorHref,
  linkComponent: LinkComponent = "a",
}: {
  author: string;
  meta?: string | null;
  timestamp?: string | null;
  autorHref?: string | undefined;
  linkComponent?: ComponentType<{ href: string; className?: string; children?: ReactNode }> | "a";
}) {
  const avatarNode = autorHref ? (
    <LinkComponent href={autorHref} className="no-underline" aria-label={`Ver fotos de ${author}`}>
      <PostAuthorAvatar name={author} />
    </LinkComponent>
  ) : (
    <PostAuthorAvatar name={author} />
  );

  const autorNode = autorHref ? (
    <LinkComponent
      href={autorHref}
      className="font-medium text-[0.875rem] text-ink no-underline truncate transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75"
    >
      {author}
    </LinkComponent>
  ) : (
    <span className="font-medium text-[0.875rem] text-ink truncate">{author}</span>
  );

  const hasTimestamp = Boolean(timestamp);

  return (
    <div className="flex items-center gap-2.5">
      {avatarNode}
      {hasTimestamp ? (
        <div className="flex-1 min-w-0">
          {autorNode}
          <p className="m-0 font-titulo text-[0.6875rem] uppercase tracking-[0.2em] text-ink-3">
            {timestamp}
            {meta && ` · ${meta}`}
          </p>
        </div>
      ) : (
        <>
          {autorNode}
          {meta && <span className="text-[0.6875rem] text-ink-3">{meta}</span>}
        </>
      )}
    </div>
  );
}
