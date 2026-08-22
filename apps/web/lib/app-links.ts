export type AppLinksConfig = {
  iosTeamId: string | null;
  androidSha256: string[];
  appLinkHost: string;
  iosBundleId: string;
  androidPackage: string;
};

const PLACEHOLDER_TEAM = "SUBSTITUA_TEAM_ID";
const PLACEHOLDER_SHA256 = "SUBSTITUA_SHA256_DO_CERTIFICADO_DE_ASSINATURA";

/** Lê credenciais de universal/App Links — opcionais em dev local. */
export function readAppLinksConfig(env: NodeJS.ProcessEnv = process.env): AppLinksConfig {
  const iosTeamId = env.IOS_APP_TEAM_ID?.trim() || null;
  const androidRaw = env.ANDROID_APP_SHA256?.trim() || "";
  const androidSha256 = androidRaw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const appLinkHost = (env.APP_LINK_HOST ?? "albora.app")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return {
    iosTeamId,
    androidSha256,
    appLinkHost,
    iosBundleId: env.IOS_APP_BUNDLE_ID?.trim() || "app.albora.guest",
    androidPackage: env.ANDROID_APP_PACKAGE?.trim() || "app.albora.guest",
  };
}

export function appLinksReady(cfg: AppLinksConfig): boolean {
  return cfg.iosTeamId !== null && cfg.androidSha256.length > 0;
}

export function buildAppleAppSiteAssociation(cfg: AppLinksConfig) {
  const team = cfg.iosTeamId ?? PLACEHOLDER_TEAM;
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${team}.${cfg.iosBundleId}`,
          paths: ["/e/*/pair", "/app/parear"],
        },
      ],
    },
  };
}

export function buildAssetLinks(cfg: AppLinksConfig) {
  const fingerprints = cfg.androidSha256.length > 0 ? cfg.androidSha256 : [PLACEHOLDER_SHA256];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: cfg.androidPackage,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
