import type { ImageLoaderProps } from "next/image";

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

export function alboraImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith("/")) return src;
  const q = quality ?? 75;
  return `${R2_PUBLIC}/cdn-cgi/image/width=${width},quality=${q},format=auto/${src}`;
}
