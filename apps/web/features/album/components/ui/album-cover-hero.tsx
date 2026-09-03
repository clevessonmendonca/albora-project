"use client";

import Image from "next/image";

export function CoverHero({ src }: { src: string }) {
  return (
    <div className="relative h-52 shrink-0 overflow-hidden">
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="scale-[1.2] object-cover blur-md saturate-[0.7] brightness-[0.45]"
      />
      <Image src={src} alt="" fill sizes="100vw" className="object-contain" />
      <div className="absolute inset-0 bg-gradient-cover-hero" />
    </div>
  );
}
