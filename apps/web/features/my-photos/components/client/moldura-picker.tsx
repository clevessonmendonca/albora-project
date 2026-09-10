"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ModeloDeMoldura } from "@albora/core";
import { BottomSheet, Button } from "@albora/ui-web";
import type { EscolhaDeMoldura } from "../../hooks/use-share";

const ROTULO: Record<ModeloDeMoldura, string> = {
  polaroide: "Polaroide",
  ambiente: "Ambiente",
  cheia: "Cheia",
};

/**
 * Escolha da moldura com prévia real (REFATORACAO §103, ADR 0022 fatia B).
 * O blob da prévia é o MESMO que vai ser compartilhado — nunca dois. Story 9:16
 * por enquanto; Feed 1:1 entra na fatia D. Falha ao gerar tem estado próprio (§3.5).
 */
export function MolduraPicker({
  escolha,
  onPreview,
  onConfirmar,
  onClose,
}: {
  escolha: EscolhaDeMoldura | null;
  onPreview: (modelo: ModeloDeMoldura) => Promise<Blob>;
  onConfirmar: (blob: Blob) => void | Promise<void>;
  onClose: () => void;
}) {
  const aberto = escolha !== null;
  const [modelo, setModelo] = useState<ModeloDeMoldura | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const urlRef = useRef<string | null>(null);

  function soltarUrl() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }

  // Ao abrir, parte do modelo recomendado.
  useEffect(() => {
    setModelo(escolha ? escolha.recomendado : null);
  }, [escolha]);

  // Renderiza a prévia sempre que o modelo muda.
  useEffect(() => {
    if (!aberto || !modelo) return;
    let vivo = true;
    setCarregando(true);
    setFalhou(false);
    onPreview(modelo)
      .then((b) => {
        if (!vivo) return;
        soltarUrl();
        urlRef.current = URL.createObjectURL(b);
        setBlob(b);
        setPreviewUrl(urlRef.current);
      })
      .catch(() => {
        if (vivo) {
          setFalhou(true);
          setBlob(null);
        }
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [aberto, modelo, onPreview]);

  useEffect(() => soltarUrl, []);

  function fechar() {
    soltarUrl();
    setPreviewUrl(null);
    setBlob(null);
    setModelo(null);
    setFalhou(false);
    onClose();
  }

  async function confirmar() {
    if (!blob) return;
    setEnviando(true);
    try {
      await onConfirmar(blob);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <BottomSheet
      title="Compartilhar nas redes"
      open={aberto}
      onClose={fechar}
      footer={
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="md"
            width="full"
            disabled={!blob || carregando || enviando}
            onClick={() => void confirmar()}
          >
            {enviando ? "Abrindo…" : "Compartilhar nas redes"}
          </Button>
          <Button variant="secondary" size="md" width="full" onClick={fechar}>
            Agora não
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="mx-auto grid aspect-[9/16] w-44 place-items-center overflow-hidden rounded-token bg-superficie-alta">
          {falhou ? (
            <p className="px-4 text-center tipo-caption text-ink-2">
              Não deu para montar a imagem. Tente outra moldura.
            </p>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Prévia da sua foto com a identidade da festa"
              className={`size-full object-cover transition-opacity duration-[var(--tempo-rapido)] ${
                carregando ? "opacity-60" : "opacity-100"
              }`}
            />
          ) : (
            <span className="tipo-caption text-ink-3">Montando…</span>
          )}
        </div>

        <div role="group" aria-label="Moldura" className="flex justify-center gap-2">
          {escolha?.modelos.map((m) => {
            const ativo = m === modelo;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={ativo}
                onClick={() => setModelo(m)}
                className={`min-h-11 rounded-pilula px-4 font-medium transition-transform duration-instantaneo ease-mola active:scale-[0.97] ${
                  ativo ? "bg-acento text-sobre-acento" : "bg-superficie-alta text-ink"
                }`}
              >
                {ROTULO[m]}
              </button>
            );
          })}
        </div>

        <p className="m-0 text-center tipo-caption text-ink-3">
          Pode incluir outras pessoas que aparecem na foto.
        </p>
      </div>
    </BottomSheet>
  );
}
