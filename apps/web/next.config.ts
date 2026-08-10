import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["@albora/core", "@albora/packs", "@albora/tokens", "@albora/ui-web"],
};

export default nextConfig;
