import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Há um package-lock.json no home do usuário; sem isto o Next elege
  // /Users/<user> como raiz do workspace e o tracing sai errado.
  outputFileTracingRoot: process.cwd(),
};

// Popula process.env com as bindings do Worker durante `next dev`,
// para que o presign leia as mesmas variáveis em dev e em produção.
initOpenNextCloudflareForDev();

export default nextConfig;
