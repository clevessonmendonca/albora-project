#!/usr/bin/env node
/**
 * Confere se universal/App Links estão prontos para produção.
 * Uso: node tools/dev/check-app-links.mjs
 */

const team = process.env.IOS_APP_TEAM_ID?.trim();
const sha = process.env.ANDROID_APP_SHA256?.trim();
const host = process.env.APP_LINK_HOST?.trim() ?? "albora.app";

let ok = true;

if (!team) {
  console.warn("⚠️  IOS_APP_TEAM_ID ausente — AASA usa placeholder");
  ok = false;
}
if (!sha) {
  console.warn("⚠️  ANDROID_APP_SHA256 ausente — assetlinks usa placeholder");
  ok = false;
}

console.log(`Host de App Link: ${host}`);
console.log(`Bundle iOS: ${process.env.IOS_APP_BUNDLE_ID ?? "app.albora.guest"}`);
console.log(`Package Android: ${process.env.ANDROID_APP_PACKAGE ?? "app.albora.guest"}`);

if (ok) {
  console.log("✅ Credenciais de App Link configuradas");
  process.exit(0);
}

console.log("\nVeja docs/runbooks/universal-links.md");
process.exit(1);
