"use client";

export function CoverHero({ src }: { src: string }) {
  return (
    <div className="relative h-52 shrink-0 overflow-hidden">
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-[1.2] object-cover blur-md saturate-[0.7] brightness-[0.45]"
      />
      <img src={src} alt="" className="absolute inset-0 size-full object-contain" />
      <div className="absolute inset-0 bg-gradient-cover-hero" />
    </div>
  );
}
