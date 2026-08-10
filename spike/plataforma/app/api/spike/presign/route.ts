import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

const VALIDADE_SEGUNDOS = 600;

const TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp", "application/octet-stream"]);

type Config = {
  contaId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function lerConfig(): Config {
  const contaId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  const obrigatorias: Array<[string, string | undefined]> = [
    ["R2_ACCOUNT_ID", contaId],
    ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["R2_BUCKET", bucket],
  ];
  const faltando = obrigatorias.filter(([, v]) => !v).map(([k]) => k);

  if (faltando.length) {
    throw new ErroConfig(faltando);
  }

  return {
    contaId: contaId!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
  };
}

class ErroConfig extends Error {
  constructor(readonly faltando: string[]) {
    super(`config ausente: ${faltando.join(", ")}`);
  }
}

/**
 * A chave é derivada aqui e só aqui. O cliente não a envia e não a escolhe —
 * invariante de ADR 0002 e ADR 0004. Vale já no spike porque é justamente
 * assim que ela vaza para o produto: aceitando "só desta vez" no descartável.
 */
function derivarChave(eventoId: string): string {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, "0");
  return `events/${eventoId}/${ano}/${mes}/${crypto.randomUUID()}`;
}

async function assinar(cfg: Config, chave: string, tipo: string): Promise<string> {
  const cliente = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const url = new URL(`https://${cfg.contaId}.r2.cloudflarestorage.com/${cfg.bucket}/${chave}`);
  url.searchParams.set("X-Amz-Expires", String(VALIDADE_SEGUNDOS));

  const assinada = await cliente.sign(
    new Request(url, { method: "PUT", headers: { "content-type": tipo } }),
    { aws: { signQuery: true, allHeaders: false } }
  );

  return assinada.url;
}

export async function POST(req: Request) {
  let cfg: Config;
  try {
    cfg = lerConfig();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("presign.config_ausente", { faltando: e.faltando });
      return Response.json(
        { code: "config.missing", message: "Storage não configurado", details: { faltando: e.faltando } },
        { status: 503 }
      );
    }
    throw e;
  }

  let tipo = "application/octet-stream";
  try {
    const corpo = (await req.json()) as { tipo?: unknown };
    if (typeof corpo?.tipo === "string" && TIPOS_ACEITOS.has(corpo.tipo)) {
      tipo = corpo.tipo;
    }
  } catch {
    // corpo ausente ou inválido cai no default; o tipo não é privilégio
  }

  const eventoId = "spike";
  const chave = derivarChave(eventoId);

  try {
    const [full, thumb] = await Promise.all([
      assinar(cfg, `${chave}/full`, tipo),
      assinar(cfg, `${chave}/thumb`, tipo),
    ]);

    // Prova 6: o servidor emite duas URLs e nada mais. O único corpo que
    // chegou aqui foi o JSON de metadados acima.
    console.log("presign.emitido", { chave, tipo, validadeSegundos: VALIDADE_SEGUNDOS });

    return Response.json(
      { full, thumb, key: chave },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    console.error("presign.falha_assinatura", { erro: String(e) });
    return Response.json(
      { code: "presign.failed", message: "Não foi possível assinar a URL" },
      { status: 502 }
    );
  }
}
