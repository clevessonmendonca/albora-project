"use client";

import React, { useEffect, useState } from "react";
import type { EntryVia } from "@albora/core";
import { CONSENTIMENTO_ENTRADA_VIGENTE, textoDoConsentimento } from "@albora/core";
import {
  BottomSheet,
  PrimaryButton,
  NameField,
  Card,
  ConsentCheckbox,
  ConsentNote,
  TextLink,
  ErrorMessage,
} from "@albora/ui-web";

const CONSENTIMENTO = CONSENTIMENTO_ENTRADA_VIGENTE;
const NOME_SALVO = "albora:nome";
const TEXTO_COMPLETO = textoDoConsentimento("entrada", CONSENTIMENTO_ENTRADA_VIGENTE) ?? "";

/** Identidade tardia (ADR 0021): nome + consentimento pedidos só na 1ª ação que precisa deles —
 *  numa folha, não numa tela cheia antes do feed. Cria a sessão do convidado (mesmo `/api/sessions`
 *  e mesmo consentimento versionado do EntryFlow); depois disso, `isSameEventSession` faz o app
 *  nunca mais pedir. O consentimento continua **antes de qualquer captura** — só a chegada deixou
 *  de exigi-lo. `onEntered` roda a ação original assim que a sessão nasce. */
export function IdentitySheet({
  eventoId,
  via,
  open,
  onClose,
  onEntered,
}: {
  eventoId: string;
  via: EntryVia;
  open: boolean;
  onClose: () => void;
  onEntered: () => void;
}) {
  const [nome, setNome] = useState("");
  const [consentiu, setConsentiu] = useState(true);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dataConsentimento, setDataConsentimento] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataConsentimento(
      new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date()),
    );
    try {
      const salvo = localStorage.getItem(NOME_SALVO);
      if (salvo) setNome(salvo);
    } catch {
      // Navegação privada — segue sem nome pré-preenchido.
    }
  }, [open]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!consentiu || nome.trim().length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventoId, nome, consentimento: CONSENTIMENTO, via }),
      });
      if (!res.ok) {
        const corpo = (await res.json().catch(() => ({}))) as { code?: string };
        setErro(
          corpo.code === "limite.excedido"
            ? "Muita gente entrando ao mesmo tempo. Tente de novo em um minuto."
            : "Não consegui entrar. Tente de novo.",
        );
        return;
      }
      try {
        localStorage.setItem(NOME_SALVO, nome);
      } catch {
        // Navegação privada bloqueia. Não impede a entrada.
      }
      onEntered();
    } catch {
      setErro("Sem conexão. Chegue mais perto do roteador e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <BottomSheet title="Antes da sua primeira foto" open={open} onClose={onClose} titleId="identidade-sheet">
      <form onSubmit={entrar} className="flex flex-col gap-5">
        <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Como você quer aparecer? Só o primeiro nome.
        </p>

        <NameField value={nome} onChange={setNome} placeholder="Tio João" ariaLabel="Seu nome" autoFocus />

        <Card elevation={1} className="grid gap-3">
          <ConsentCheckbox checked={consentiu} onChange={setConsentiu}>
            Suas fotos poderão aparecer no álbum e no telão deste evento.{" "}
            <TextLink onClick={() => setMostrarTexto((v) => !v)}>Ver detalhes</TextLink>
          </ConsentCheckbox>
          <p className="m-0 pl-9 text-[0.6875rem] leading-snug text-ink-3">
            Versão {CONSENTIMENTO}
            {dataConsentimento ? ` · ${dataConsentimento}` : ""}
          </p>
        </Card>

        {mostrarTexto && <ConsentNote>{TEXTO_COMPLETO}</ConsentNote>}

        <PrimaryButton type="submit" disabled={enviando || nome.trim().length === 0 || !consentiu}>
          {enviando ? "Entrando…" : "Continuar"}
        </PrimaryButton>

        {erro && <ErrorMessage>{erro}</ErrorMessage>}
      </form>
    </BottomSheet>
  );
}
