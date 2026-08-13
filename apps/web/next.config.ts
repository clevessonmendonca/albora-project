import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["@albora/core", "@albora/packs", "@albora/tokens", "@albora/ui-web"],
  async redirects() {
    const rootPtToEn = [
      ["escanear", "scan"],
      ["telao", "wall-display"],
      ["parear", "wall-pair"],
    ] as const;

    const guestPtToEn = [
      ["capa", "cover"],
      ["foto", "photo"],
      ["minhas", "my-photos"],
      ["musica", "music"],
      ["missoes", "missions"],
      ["parear", "pair"],
    ] as const;

    const adminPtToEn = [
      ["entrar", "sign-in"],
      ["novo", "new"],
    ] as const;

    const adminEventSectionsPtToEn = [
      ["convidados", "guests"],
      ["identidade", "identity"],
      ["moderacao", "moderation"],
    ] as const;

    return [
      { source: "/album", destination: "/scan", permanent: true },
      ...rootPtToEn.map(([pt, en]) => ({
        source: `/${pt}`,
        destination: `/${en}`,
        permanent: true,
      })),
      ...guestPtToEn.map(([pt, en]) => ({
        source: `/e/:slug/${pt}`,
        destination: `/e/:slug/${en}`,
        permanent: true,
      })),
      ...adminPtToEn.map(([pt, en]) => ({
        source: `/admin/${pt}`,
        destination: `/admin/${en}`,
        permanent: true,
      })),
      ...adminEventSectionsPtToEn.map(([pt, en]) => ({
        source: `/admin/e/:eventId/${pt}`,
        destination: `/admin/e/:eventId/${en}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
