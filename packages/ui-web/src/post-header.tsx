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

  return (
    <div className="flex items-center gap-2.5 py-1">
      {avatarNode}
      <div className="flex min-w-0 flex-1 flex-col">
        {autorNode}
        {timestamp && <span className="text-[0.6875rem] text-ink-3">{timestamp}</span>}
      </div>
      {meta && <span className="text-[0.6875rem] text-ink-3">{meta}</span>}
    </div>
  );
}
