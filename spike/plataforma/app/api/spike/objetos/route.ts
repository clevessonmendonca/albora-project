import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

/**
 * Lista o bucket para que a prova 5 seja verificável do próprio celular,
 * sem abrir o painel da Cloudflare. Existe só no spike.
 */
export async function GET() {
  const contaId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!contaId || !accessKeyId || !secretAccessKey || !bucket) {
    return Response.json({ code: "config.missing", objetos: [] }, { status: 503 });
  }

  const cliente = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const url = new URL(`https://${contaId}.r2.cloudflarestorage.com/${bucket}`);
  url.searchParams.set("list-type", "2");
  url.searchParams.set("max-keys", "40");

  const res = await cliente.fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    console.error("objetos.falha", { status: res.status });
    return Response.json({ code: "list.failed", status: res.status, objetos: [] }, { status: 502 });
  }

  const xml = await res.text();
  const objetos = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((m) => {
      const bloco = m[1];
      const chave = /<Key>([\s\S]*?)<\/Key>/.exec(bloco)?.[1] ?? "";
      const tamanho = Number(/<Size>(\d+)<\/Size>/.exec(bloco)?.[1] ?? 0);
      const quando = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(bloco)?.[1] ?? "";
      return { chave, tamanho, quando };
    })
    .sort((a, b) => b.quando.localeCompare(a.quando));

  return Response.json({ objetos }, { headers: { "cache-control": "no-store" } });
}
