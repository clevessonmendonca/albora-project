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
  autorHref,
  linkComponent: LinkComponent = "a",
}: {
  author: string;
  meta?: string | null;
  autorHref?: string | undefined;
  linkComponent?: ComponentType<{ href: string; className?: string; children?: ReactNode }> | "a";
}) {
  const avatarNode = autorHref ? (
    <LinkComponent href={autorHref} className="no-underline">
      <PostAuthorAvatar name={author} />
    </LinkComponent>
  ) : (
    <PostAuthorAvatar name={author} />
  );

  const autorNode = autorHref ? (
    <LinkComponent href={autorHref} className="flex-1 text-[0.84375rem] no-underline text-ink hover:underline">
      {author}
    </LinkComponent>
  ) : (
    <span className="flex-1 text-[0.84375rem]">{author}</span>
  );

  return (
    <div className="flex items-center gap-2.5 py-1">
      {avatarNode}
      {autorNode}
      {meta && <span className="text-[0.6875rem] text-ink-3">{meta}</span>}
    </div>
  );
}
