"use client";

import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { MissionBanner, Switch } from "@albora/ui-web";
import { useMemo, useState } from "react";
import {
  identityPreviewClassName,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import {
  moveMissionKey,
  reorderMissionKeys,
  toggleMissionKey,
} from "@/features/admin/lib/mission-selection";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

type Props = {
  eventId: string;
  packId: string;
  identityTokens: Record<string, unknown>;
  initialTitleKeys: string[];
};

export function MissionsEditor({
  eventId,
  packId,
  identityTokens,
  initialTitleKeys,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;
  const packKeys = pack?.missoes.map((m) => m.chaveTitulo) ?? [];
  const [selected, setSelected] = useState<string[]>(() =>
    initialTitleKeys.filter((k) => packKeys.includes(k)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const previewVars = useMemo(() => {
    if (!pack) return {};
    return resolveIdentityPreviewVars(pack, identityTokens);
  }, [pack, identityTokens]);

  if (!pack) {
    return (
      <AdminSection>
        <p className="m-0 text-critico">Pack do evento não encontrado.</p>
      </AdminSection>
    );
  }

  const inactive = pack.missoes.filter((m) => !selected.includes(m.chaveTitulo));
  const first = selected[0];
  const firstTitle = first ? resolvePackText(pack, first) : null;

  const markDirty = (next: string[]) => {
    setSelected(next);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(false);
    setSaved(false);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/challenges`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titleKeys: selected }),
      });
      if (!r.ok) throw new Error("falhou");
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          Liga e ordena as missões do pack. O convidado vê esta lista na aba Missões — sem texto
          livre, para o vocabulário do evento continuar no pack.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_minmax(14rem,18rem)]">
          <div className="flex flex-col gap-2">
            {selected.length === 0 && (
              <p className="m-0 rounded-token border border-linha bg-bg px-3 py-3 text-sm text-ink-2">
                Modo livre — o convidado fotografa o que quiser.
              </p>
            )}

            {selected.map((key, i) => (
              <MissionRow
                key={key}
                title={resolvePackText(pack, key)}
                checked
                onToggle={() => markDirty(toggleMissionKey(selected, key, packKeys))}
                onMove={(dir) => markDirty(moveMissionKey(selected, key, dir))}
                canUp={i > 0}
                canDown={i < selected.length - 1}
                onDrop={(fromKey) => markDirty(reorderMissionKeys(selected, fromKey, key))}
                dragKey={key}
              />
            ))}

            {inactive.length > 0 && (
              <>
                <p className="mb-0 mt-3 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                  Do pack, desligadas
                </p>
                {inactive.map((m) => (
                  <MissionRow
                    key={m.chaveTitulo}
                    title={resolvePackText(pack, m.chaveTitulo)}
                    checked={false}
                    onToggle={() => markDirty(toggleMissionKey(selected, m.chaveTitulo, packKeys))}
                  />
                ))}
              </>
            )}
          </div>

          <div className={identityPreviewClassName} style={previewVars}>
            <p className="mb-3 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
              Na câmera
            </p>
            <div className="relative min-h-[11rem] overflow-hidden rounded-superficie bg-superficie">
              <div className="absolute inset-x-3 top-3">
                {firstTitle ? (
                  <MissionBanner index={1} total={selected.length} title={firstTitle} />
                ) : (
                  <p className="m-0 text-sm text-ink-2">Sem faixa de missão — modo livre.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className={`${adminClasses.primaryButton} ${saving ? "opacity-60" : ""}`}
          >
            {saving ? "Salvando…" : "Salvar missões"}
          </button>
          {saved && <span className="text-sm text-ink-3">Salvo.</span>}
          {error && <span className="text-sm text-critico">Não foi possível salvar.</span>}
        </div>
      </AdminSection>
    </div>
  );
}

function MissionRow({
  title,
  checked,
  onToggle,
  onMove,
  canUp,
  canDown,
  onDrop,
  dragKey,
}: {
  title: string;
  checked: boolean;
  onToggle: () => void;
  onMove?: (direction: -1 | 1) => void;
  canUp?: boolean;
  canDown?: boolean;
  onDrop?: (fromKey: string) => void;
  dragKey?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-token border border-linha bg-bg p-3"
      draggable={Boolean(dragKey)}
      onDragStart={(e) => {
        if (!dragKey) return;
        e.dataTransfer.setData("text/plain", dragKey);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!onDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        if (!onDrop) return;
        e.preventDefault();
        onDrop(e.dataTransfer.getData("text/plain"));
      }}
    >
      <Switch checked={checked} onChange={() => onToggle()} label={title} />
      <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">{title}</span>
      {onMove && (
        <span className="flex shrink-0 gap-1">
          <OrderButton
            label={`Subir ${title}`}
            disabled={!canUp}
            onClick={() => onMove(-1)}
          >
            ↑
          </OrderButton>
          <OrderButton
            label={`Descer ${title}`}
            disabled={!canDown}
            onClick={() => onMove(1)}
          >
            ↓
          </OrderButton>
        </span>
      )}
    </div>
  );
}

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 cursor-pointer place-items-center rounded-token border border-linha bg-superficie font-titulo text-sm text-ink disabled:cursor-default disabled:opacity-30"
    >
      {children}
    </button>
  );
}
