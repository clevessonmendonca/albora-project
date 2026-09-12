import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { OPS_TO_CONSOLE_REDIRECTS } from "./lib/redirects/ops-to-console";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
  transpilePackages: ["@albora/core", "@albora/packs", "@albora/tokens", "@albora/ui-web", "@albora/integrations"],
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
  typescript: {
    // Só para `pnpm bundle:budget*` — mede First Load JS sem bloquear o gate principal de build.
    ignoreBuildErrors: process.env.BUNDLE_BUDGET_BUILD === "1",
  },
  async headers() {
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
          // HSTS só em produção: em http://localhost o header (includeSubDomains;
          // preload) força HTTPS no host inteiro e o browser cacheia por 2 anos,
          // quebrando o carregamento de CSS/JS de qualquer app em localhost (dev).
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
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
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
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
      ...OPS_TO_CONSOLE_REDIRECTS,
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

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  ...(process.env.SENTRY_ORG && { org: process.env.SENTRY_ORG }),
  ...(process.env.SENTRY_PROJECT && { project: process.env.SENTRY_PROJECT }),
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
  tunnelRoute: "/monitoring",
});
