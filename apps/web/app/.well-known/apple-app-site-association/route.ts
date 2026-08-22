import { buildAppleAppSiteAssociation, readAppLinksConfig } from "@/lib/app-links";

export const dynamic = "force-dynamic";

export function GET() {
  const body = buildAppleAppSiteAssociation(readAppLinksConfig());
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
