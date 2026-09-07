import React from "react";
import { openGuestGallery } from "@albora/application";
import { ErroTokenDeEntrega } from "@albora/db";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { signGet } from "@/lib/r2";
import { GuestGalleryView } from "@/features/entrega/components/server/guest-gallery-view";

type Props = { params: Promise<{ token: string }> };

/**
 * Pública, sem login: identidade é só o token opaco da URL. Token
 * inválido/expirado/revogado renderiza a mesma tela calma — nunca vaza
 * stack nem se o token um dia existiu.
 */
export default async function PaginaGaleriaDoConvidado({ params }: Props) {
  const { token } = await params;

  try {
    const { fotos } = await openGuestGallery(
      { pool: getPool(), segredo: config().sessionSecret, signGet },
      token,
    );
    return <GuestGalleryView estado="ok" fotos={fotos} />;
  } catch (erro) {
    if (erro instanceof ErroTokenDeEntrega) {
      return <GuestGalleryView estado="expirado" />;
    }
    throw erro;
  }
}
