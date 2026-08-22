import type { ConfigContext, ExpoConfig } from "expo/config";

const DEFAULT_LINK_HOST = "albora.app";

function linkHost(): string {
  const raw = process.env.EXPO_PUBLIC_APP_LINK_HOST?.trim();
  if (!raw) return DEFAULT_LINK_HOST;
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

/** Host e EAS project id vêm de env — `eas init` grava EAS_PROJECT_ID. */
export default ({ config }: ConfigContext): ExpoConfig => {
  const host = linkHost();
  const projectId = process.env.EAS_PROJECT_ID?.trim();

  return {
    ...config,
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${host}`],
    },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "https", host, pathPrefix: "/e/" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    extra: {
      ...config.extra,
      eas: {
        ...(typeof config.extra?.eas === "object" && config.extra.eas !== null
          ? (config.extra.eas as Record<string, unknown>)
          : {}),
        projectId: projectId && projectId.length > 0 ? projectId : undefined,
      },
    },
  };
};
