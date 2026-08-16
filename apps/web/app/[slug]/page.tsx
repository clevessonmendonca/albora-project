import { redirect } from "next/navigation";

/**
 * URL impressa na peça: `albora.com.br/{slug}` (N1.4).
 * O parser do QR já entende esse formato; o Next precisa de uma page.
 * Rotas estáticas (`/admin`, `/scan`, `/e`, …) ganham da dinâmica.
 */
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShortSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const via = typeof query.via === "string" ? query.via : "link";
  const target = new URLSearchParams();
  target.set("via", via);
  redirect(`/e/${encodeURIComponent(slug)}?${target.toString()}`);
}
