import { defineCloudflareConfig, type OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  ...defineCloudflareConfig(),
  buildCommand: "pnpm build && node scripts/podar-manifests-de-rotas.mjs",
};

export default config;
