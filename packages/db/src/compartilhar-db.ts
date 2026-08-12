import {
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
  compartilhamentoExternoPadrao,
  type ConsentimentoExterno,
} from "@albora/core";
import type { PoolClient } from "pg";
import { lerModeracaoDoEvento } from "./moderacao-evento";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MidiaCompartilharDb = {
  id: string;
  eventoId: string;
  sessaoDeOrigem: string;
  chaveFull: string;
  legenda: string | null;
  removida: boolean;
  liberadaPeloAnfitriao: boolean;
  denuncias: number;
  classificador: string | null;
};

export type SessaoCompartilharDb = {
  sessaoId: string;
  eventoId: string;
  nome: string;
  consentimentoDeEntrada: { versao: string; em: Date };
  consentimentoExterno: ConsentimentoExterno | null;
};

export type EventoCompartilharDb = {
  slug: string;
  packId: string;
  comecaEm: Date;
  identityTokens: Record<string, unknown>;
  panico: boolean;
  modoEndurecido: boolean;
  haMenores: boolean;
  compartilhamentoExternoLiberado: boolean;
};

export type ContextoCompartilharDb = {
  midia: MidiaCompartilharDb;
  sessao: SessaoCompartilharDb;
  evento: EventoCompartilharDb;
};

function mapConsentimento(l: {
  external_consent_version: string | null;
  external_consented_at: Date | null;
  external_consent_revoked_at: Date | null;
  external_name_on_frame: boolean;
}): ConsentimentoExterno | null {
  if (l.external_consent_version === null || l.external_consented_at === null) return null;
  return {
    versao: l.external_consent_version,
    em: l.external_consented_at,
    revogadoEm: l.external_consent_revoked_at,
    nomeNaMoldura: l.external_name_on_frame,
  };
}

/** Contexto para autorizar e compor a moldura (spec 015). */
export async function buscarContextoCompartilhar(
  cliente: PoolClient,
  sessaoId: string,
  uploadId: string,
): Promise<ContextoCompartilharDb | null> {
  if (!UUID.test(sessaoId) || !UUID.test(uploadId)) return null;

  const { rows } = await cliente.query<{
    upload_id: string;
    event_id: string;
    upload_session_id: string;
    storage_key: string;
    caption: string | null;
    upload_state: string;
    released_by_host: boolean;
    classifier_verdict: string | null;
    display_name: string;
    consent_version: string;
    consented_at: Date;
    external_consent_version: string | null;
    external_consented_at: Date | null;
    external_consent_revoked_at: Date | null;
    external_name_on_frame: boolean;
    slug: string;
    pack_id: string;
    starts_at: Date;
    identity_tokens: Record<string, unknown>;
    has_minors: boolean;
    denuncias: number;
  }>(
    `SELECT u.id AS upload_id, u.event_id, u.session_id AS upload_session_id,
            u.storage_key, u.caption, u.state AS upload_state, u.released_by_host,
            u.classifier_verdict,
            s.display_name, s.consent_version, s.consented_at,
            s.external_consent_version, s.external_consented_at,
            s.external_consent_revoked_at, s.external_name_on_frame,
            e.slug, e.pack_id, e.starts_at, e.identity_tokens, e.has_minors,
            (SELECT count(*)::int FROM reports rp WHERE rp.upload_id = u.id) AS denuncias
       FROM uploads u
       JOIN guest_sessions s ON s.id = $1 AND s.event_id = u.event_id
       JOIN events e ON e.id = u.event_id
      WHERE u.id = $2 AND u.session_id = $1`,
    [sessaoId, uploadId],
  );

  const l = rows[0];
  if (!l) return null;

  const moderacao = await lerModeracaoDoEvento(cliente, l.event_id);

  return {
    midia: {
      id: l.upload_id,
      eventoId: l.event_id,
      sessaoDeOrigem: l.upload_session_id,
      chaveFull: l.storage_key,
      legenda: l.caption,
      removida: l.upload_state !== "published",
      liberadaPeloAnfitriao: l.released_by_host,
      denuncias: l.denuncias,
      classificador: l.classifier_verdict,
    },
    sessao: {
      sessaoId,
      eventoId: l.event_id,
      nome: l.display_name,
      consentimentoDeEntrada: { versao: l.consent_version, em: l.consented_at },
      consentimentoExterno: mapConsentimento(l),
    },
    evento: {
      slug: l.slug,
      packId: l.pack_id,
      comecaEm: l.starts_at,
      identityTokens: l.identity_tokens ?? {},
      panico: moderacao.panico,
      modoEndurecido: moderacao.modoEndurecido,
      haMenores: moderacao.haMenores,
      compartilhamentoExternoLiberado: compartilhamentoExternoPadrao({
        haMenores: moderacao.haMenores,
      }),
    },
  };
}

/** Registra o segundo consentimento antes de compartilhar (spec 015). */
export async function registrarConsentimentoExterno(
  cliente: PoolClient,
  sessaoId: string,
  nomeNaMoldura: boolean,
): Promise<boolean> {
  if (!UUID.test(sessaoId)) return false;

  const { rowCount } = await cliente.query(
    `UPDATE guest_sessions
        SET external_consent_version = $2,
            external_consented_at = now(),
            external_consent_revoked_at = NULL,
            external_name_on_frame = $3
      WHERE id = $1`,
    [sessaoId, VERSAO_DO_CONSENTIMENTO_EXTERNO, nomeNaMoldura],
  );

  return (rowCount ?? 0) > 0;
}
