import { describe, expect, it } from "vitest";
import {
  appLinksReady,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  readAppLinksConfig,
} from "./app-links";

describe("app-links", () => {
  it("usa placeholders quando env ausente", () => {
    const cfg = readAppLinksConfig({});
    expect(appLinksReady(cfg)).toBe(false);
    expect(buildAppleAppSiteAssociation(cfg).applinks.details[0]?.appID).toBe(
      "SUBSTITUA_TEAM_ID.app.albora.guest",
    );
    expect(buildAssetLinks(cfg)[0]?.target.sha256_cert_fingerprints).toEqual([
      "SUBSTITUA_SHA256_DO_CERTIFICADO_DE_ASSINATURA",
    ]);
  });

  it("monta AASA e assetlinks com credenciais reais", () => {
    const cfg = readAppLinksConfig({
      IOS_APP_TEAM_ID: "AB12CD34EF",
      ANDROID_APP_SHA256: "AA:BB:CC, DD:EE:FF",
      APP_LINK_HOST: "https://albora.app",
    });
    expect(appLinksReady(cfg)).toBe(true);
    expect(buildAppleAppSiteAssociation(cfg).applinks.details[0]?.appID).toBe(
      "AB12CD34EF.app.albora.guest",
    );
    expect(buildAssetLinks(cfg)[0]?.target.sha256_cert_fingerprints).toEqual(["AA:BB:CC", "DD:EE:FF"]);
  });
});
