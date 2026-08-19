"use client";

import { Avatar, initials } from "./avatar";

export const authorInitials = initials;

export function PostAuthorAvatar({ name }: { name: string }) {
  return <Avatar name={name} className="size-[1.875rem] text-[0.75rem]" />;
}

export function PostHeader({ author, meta }: { author: string; meta?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <PostAuthorAvatar name={author} />
      <span className="flex-1 text-[0.84375rem]">{author}</span>
      {meta && <span className="text-[0.6875rem] text-ink-3">{meta}</span>}
    </div>
  );
}
