import type { PoolClient } from "pg";

export type AceiteDeConsentimento = {
  versao: string;
  aceites: number;
  primeiroEm: Date;
  ultimoEm: Date;
};

export type AceiteDeConsentimentoExterno = AceiteDeConsentimento & {
  revogados: number;
};

/** Aceites do consentimento de entrada (`guest_sessions.consent_version`), por versão — para auditoria LGPD. Nenhum nome de convidado sai daqui, só contagem agregada. */
export async function aceitesDeEntradaPorVersao(
  cliente: PoolClient,
  eventoId: string,
): Promise<AceiteDeConsentimento[]> {
  const { rows } = await cliente.query<{
    consent_version: string;
    aceites: number;
    primeiro_em: Date;
    ultimo_em: Date;
  }>(
    `SELECT consent_version,
            count(*)::int AS aceites,
            min(consented_at) AS primeiro_em,
            max(consented_at) AS ultimo_em
       FROM guest_sessions
      WHERE event_id = $1
      GROUP BY consent_version
      ORDER BY aceites DESC, consent_version`,
    [eventoId],
  );

  return rows.map((r) => ({
    versao: r.consent_version,
    aceites: r.aceites,
    primeiroEm: r.primeiro_em,
    ultimoEm: r.ultimo_em,
  }));
}

/** Aceites do segundo consentimento — saída do perímetro (migration 0017, ADR 0009) — por versão. */
export async function aceitesExternosPorVersao(
  cliente: PoolClient,
  eventoId: string,
): Promise<AceiteDeConsentimentoExterno[]> {
  const { rows } = await cliente.query<{
    external_consent_version: string;
    aceites: number;
    revogados: number;
    primeiro_em: Date;
    ultimo_em: Date;
  }>(
    `SELECT external_consent_version,
            count(*)::int AS aceites,
            count(*) FILTER (WHERE external_consent_revoked_at IS NOT NULL)::int AS revogados,
            min(external_consented_at) AS primeiro_em,
            max(external_consented_at) AS ultimo_em
       FROM guest_sessions
      WHERE event_id = $1 AND external_consent_version IS NOT NULL
      GROUP BY external_consent_version
      ORDER BY aceites DESC, external_consent_version`,
    [eventoId],
  );

  return rows.map((r) => ({
    versao: r.external_consent_version,
    aceites: r.aceites,
    revogados: r.revogados,
    primeiroEm: r.primeiro_em,
    ultimoEm: r.ultimo_em,
  }));
}
