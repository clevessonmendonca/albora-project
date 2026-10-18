"use client";

import Link from "next/link";
import type { ItemDePreparo } from "@/features/admin/data/load-home-state";
import { marcarPreparo } from "@/features/admin/lib/marcar-preparo";
import { acaoPrimaria, acaoSecundaria, estiloAcento } from "./estilos";

/**
 * Abre o álbum como o convidado vê e registra o marco. Marcar no clique é
 * honesto aqui: a prévia abre de fato numa aba nova — diferente de "visitei a
 * página de QR", que não significa QR preparado.
 */
export function VerComoConvidado({
  eventId,
  slug,
  variante = "secundaria",
  rotulo = "Ver como convidado",
}: {
  eventId: string;
  slug: string;
  variante?: "primaria" | "secundaria";
  rotulo?: string;
}) {
  return (
    <Link
      href={`/e/${slug}?via=link`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => marcarPreparo(eventId, "previaConvidado")}
      className={variante === "primaria" ? acaoPrimaria : acaoSecundaria}
      {...(variante === "primaria" ? { style: estiloAcento } : {})}
    >
      {rotulo}
    </Link>
  );
}

/** Link de um item de preparo; a prévia abre em aba nova e registra o marco. */
export function AcaoDoItem({
  item,
  eventId,
  className,
  style,
}: {
  item: ItemDePreparo;
  eventId: string;
  className: string;
  style?: React.CSSProperties;
}) {
  if (item.chave === "previaConvidado") {
    return (
      <Link
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => marcarPreparo(eventId, "previaConvidado")}
        className={className}
        style={style}
      >
        {item.cta}
      </Link>
    );
  }
  return (
    <Link href={item.href} className={className} style={style}>
      {item.cta}
    </Link>
  );
}
