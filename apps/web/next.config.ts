import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
  transpilePackages: ["@albora/core", "@albora/packs", "@albora/tokens", "@albora/ui-web"],
  typescript: {
    // Só para `pnpm bundle:budget*` — mede First Load JS sem bloquear o gate principal de build.
    ignoreBuildErrors: process.env.BUNDLE_BUDGET_BUILD === "1",
  },
  async headers() {
    // `next dev` roda o bundle client via eval (Fast Refresh) mesmo fora do
    // admin — sem 'unsafe-eval' em dev, o CSP quebra a hidratação inteira
    // das rotas do convidado (nenhum handler liga, todo botão fica preso
    // "disabled"). Produção nunca precisa de eval, então fica de fora ali.
    const scriptSrcEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${scriptSrcEval}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/e/:slug/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${scriptSrcEval}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "media-src 'self' blob: https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
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
      ["missoes", "missions"],
      ["recado", "guestbook"],
    ] as const;

    return [
      { source: "/album", destination: "/scan", permanent: true },
      { source: "/privacy", destination: "/privacidade", permanent: true },
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
