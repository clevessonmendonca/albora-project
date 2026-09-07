import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://albora.com.br";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/privacidade`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/15-anos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
