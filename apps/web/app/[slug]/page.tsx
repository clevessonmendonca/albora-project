import { redirect } from "next/navigation";

/** URL curta da peça impressa (N1.4) — redireciona para `/e/{slug}`; rotas estáticas ganham da dinâmica. */
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
