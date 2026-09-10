/**
 * Structured Logging com PII Masking
 * 
 * Helpers para logging estruturado que nunca logam PII crua.
 * Nome, telefone, email são sempre mascarados.
 */

/**
 * Campos que contém PII e devem ser mascarados
 */
const PII_FIELDS = new Set(["name", "email", "phone", "cpf", "displayName", "firstName", "lastName"]);

/**
 * Mascara valor de PII
 * 
 * @example
 * maskPii("João Silva") => "J***a"
 * maskPii("joao@example.com") => "j***@e***.com"
 * maskPii("11987654321") => "119****4321"
 */
export function maskPii(value: string): string {
  if (!value || value.length < 3) return "***";

  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    const maskedLocal = local && local.length > 0 ? local[0] + "***" : "***";
    const maskedDomain = domain && domain.length > 0 ? domain[0] + "***" : "***";
    return `${maskedLocal}@${maskedDomain}`;
  }

  // Números longos (telefone, CPF) preservam início/fim para conferência sem expor o valor;
  // nomes e outros textos mostram só a primeira e a última letra do valor inteiro.
  const isNumeric = /\d/.test(value) && /^[\d\s()+-]+$/.test(value);
  if (isNumeric && value.length > 8) {
    return value.slice(0, 3) + "****" + value.slice(-4);
  }

  return value[0] + "***" + (value.length > 1 ? value[value.length - 1] : "");
}

/**
 * Mascara objeto recursivamente
 */
export function maskObject(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.has(key) && typeof value === "string") {
      masked[key] = maskPii(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      masked[key] = maskObject(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/** 160 é o limite que a tela de Retenção já praticava — mudar corta ou alonga mensagem em produção, e isso é decisão de produto, não efeito colateral de refactor. */
const MAX_ERRO_CHARS = 160;

/**
 * Padrões de PII dentro de texto livre de exceção, na ordem em que precisam
 * ser aplicados — os estruturados primeiro, senão a máscara de e-mail come
 * parte do valor e o resto da linha escapa.
 */
const MASCARAS_DE_ERRO: ReadonlyArray<readonly [RegExp, string]> = [
  // Guloso até o último `)`: valor com parêntese dentro (`Key (nome)=(Ana
  // (Silva))`) deixava o resto da mensagem cru quando parava no primeiro.
  [/\bKey \(([^)]*)\)=\(.*\)/g, "Key ($1)=([valor])"],
  // Até o fim: o Postgres despeja a linha inteira aqui, com qualquer conteúdo.
  [/\bFailing row contains \([\s\S]*/g, "Failing row contains ([linha])"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]"],
  // As bordas `(?<![\w-])` / `(?![\w-])` são o que preserva UUID e timestamp.
  // Sem elas, `...-a716-446655440000` vira `...-a[telefone]` e o operador
  // perde o `event_id` — mascarar o identificador cega o diagnóstico sem
  // proteger ninguém.
  [/(?<![\w-])(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}(?![\w-])/g, "[telefone]"],
  // URL assinada carrega credencial na query.
  [/\?[^\s"']+/g, "?[query]"],
];

/**
 * Mascara PII em texto livre de exceção.
 *
 * `maskObject` mascara por NOME de campo (`email`, `phone`); isto é para o
 * caso oposto — o campo se chama `erro` e a PII está dentro da mensagem, que
 * é como ela chega de driver de banco e de API externa.
 */
export function sanitizarTextoDeErro(bruto: string | null): string | null {
  if (!bruto) return null;
  let texto = bruto;
  for (const [padrao, troca] of MASCARAS_DE_ERRO) texto = texto.replace(padrao, troca);
  return texto.length > MAX_ERRO_CHARS ? `${texto.slice(0, MAX_ERRO_CHARS)}…` : texto;
}

/** SQLSTATE do pg (`23505`) ou `name` do Error: diagnóstico que sobrevive ao mascaramento do texto. */
function codigoDoErro(e: unknown): string {
  if (typeof e === "object" && e !== null) {
    const { code, name } = e as { code?: unknown; name?: unknown };
    if (typeof code === "string" && /^[A-Za-z0-9_]{1,32}$/.test(code)) return code;
    if (typeof name === "string" && name.length > 0) return name;
  }
  return "desconhecido";
}

/** Forma única de uma exceção virar linha de log: `código: mensagem sanitizada`. */
export function erroParaRegistro(e: unknown): string {
  const bruto = e instanceof Error ? e.message : String(e);
  return `${codigoDoErro(e)}: ${sanitizarTextoDeErro(bruto) ?? ""}`;
}

/**
 * Logger estruturado com PII masking automático
 */
export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    console.log(message, data ? maskObject(data) : undefined);
  },

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(message, data ? maskObject(data) : undefined);
  },

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    console.error(message, {
      erro: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(data ? maskObject(data) : {}),
    });
  },

  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(message, data ? maskObject(data) : undefined);
    }
  },
};

/**
 * Adiciona campo PII customizado para mascarar
 */
export function addPiiField(fieldName: string): void {
  PII_FIELDS.add(fieldName);
}

/**
 * Cria contexto de log estruturado
 */
export function createLogContext(baseContext: Record<string, unknown>) {
  const masked = maskObject(baseContext);

  return {
    info(message: string, data?: Record<string, unknown>) {
      logger.info(message, { ...masked, ...data });
    },
    warn(message: string, data?: Record<string, unknown>) {
      logger.warn(message, { ...masked, ...data });
    },
    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      logger.error(message, error, { ...masked, ...data });
    },
  };
}
