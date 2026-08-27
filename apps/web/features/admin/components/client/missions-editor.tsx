"use client";

import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { MissionBanner, Switch } from "@albora/ui-web";
import { useMemo, useRef, useState } from "react";
import {
  identityPreviewClassName,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import {
  moveMissionKey,
  reorderMissionKeys,
  toggleMissionKey,
} from "@/features/admin/lib/mission-keys";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

const CUSTOM_MAX = 120;

type CustomMission = { id?: string; titulo: string; posicao: number };

type Props = {
  eventId: string;
  packId: string;
  identityTokens: Record<string, unknown>;
  initialTitleKeys: string[];
  initialCustomMissions: CustomMission[];
};

export function MissionsEditor({
  eventId,
  packId,
  identityTokens,
  initialTitleKeys,
  initialCustomMissions,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;
  const packKeys = pack?.missoes.map((m) => m.chaveTitulo) ?? [];

  const [selected, setSelected] = useState<string[]>(() =>
    initialTitleKeys.filter((k) => packKeys.includes(k)),
  );
  const [custom, setCustom] = useState<CustomMission[]>(initialCustomMissions);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const draftRef = useRef<HTMLInputElement>(null);

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
  const firstCustom = custom[0];
  const previewTitle =
    first ? resolvePackText(pack, first) : firstCustom?.titulo ?? null;
  const previewTotal = selected.length + custom.length;

  const markDirty = (next: string[]) => {
    setSelected(next);
    setSaved(false);
  };

  const addCustom = () => {
    const titulo = draft.trim();
    if (!titulo || titulo.length > CUSTOM_MAX) return;
    const posicao = (custom[custom.length - 1]?.posicao ?? 0) + 1;
    setCustom((prev) => [...prev, { titulo, posicao }]);
    setDraft("");
    setSaved(false);
    draftRef.current?.focus();
  };

  const removeCustom = (idx: number) => {
    setCustom((prev) => prev.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const startEdit = (idx: number) => {
    setEditingId(String(idx));
    setEditText(custom[idx]!.titulo);
  };

  const commitEdit = (idx: number) => {
    const titulo = editText.trim();
    if (titulo && titulo.length <= CUSTOM_MAX) {
      setCustom((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, titulo } : m)),
      );
      setSaved(false);
    }
    setEditingId(null);
  };

  const moveCustom = (idx: number, dir: -1 | 1) => {
    const next = [...custom];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    const reindexed = next.map((m, i) => ({ ...m, posicao: i + 1 }));
    setCustom(reindexed);
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
        body: JSON.stringify({
          titleKeys: selected,
          customMissions: custom.map((m, i) => ({
            ...(m.id ? { id: m.id } : {}),
            titulo: m.titulo,
            posicao: i + 1,
          })),
        }),
      });
      if (!r.ok) throw new Error("falhou");
      const data = (await r.json()) as {
        challenges: { id: string; titleKey: string | null; customTitle: string | null; position: number }[];
      };
      const updatedCustom = data.challenges
        .filter((c) => c.customTitle !== null)
        .map((c) => ({ id: c.id, titulo: c.customTitle!, posicao: c.position }));
      setCustom(updatedCustom);
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
        <h2 className="mb-3 mt-0 font-titulo text-lg">Missões do pack</h2>
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          Liga e ordena as missões do pack. O convidado vê esta lista na aba Missões.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_minmax(14rem,18rem)]">
          <div className="flex flex-col gap-2">
            {selected.length === 0 && custom.length === 0 && (
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
                {previewTitle ? (
                  <MissionBanner index={1} total={previewTotal} title={previewTitle} />
                ) : (
                  <p className="m-0 text-sm text-ink-2">Sem faixa de missão — modo livre.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Missões personalizadas</h2>
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          Adicione missões com o texto exato que você quer — ideal para momentos únicos do evento.
        </p>

        <div className="flex flex-col gap-2">
          {custom.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-token border border-linha bg-bg p-3"
            >
              {editingId === String(i) ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => commitEdit(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(i);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  maxLength={CUSTOM_MAX}
                  className="min-w-0 flex-1 rounded-token border border-acento-borda bg-bg px-2 py-1 font-corpo text-sm text-ink outline-none"
                />
              ) : (
                <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">
                  {m.titulo}
                </span>
              )}

              <span className="flex shrink-0 gap-1">
                <OrderButton label={`Subir ${m.titulo}`} disabled={i === 0} onClick={() => moveCustom(i, -1)}>
                  ↑
                </OrderButton>
                <OrderButton label={`Descer ${m.titulo}`} disabled={i === custom.length - 1} onClick={() => moveCustom(i, 1)}>
                  ↓
                </OrderButton>
                <OrderButton label={`Editar ${m.titulo}`} onClick={() => startEdit(i)}>
                  ✎
                </OrderButton>
                <OrderButton label={`Remover ${m.titulo}`} onClick={() => removeCustom(i)}>
                  ×
                </OrderButton>
              </span>
            </div>
          ))}

          <div className="mt-2 flex gap-2">
            <input
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
              placeholder="Nova missão personalizada…"
              maxLength={CUSTOM_MAX}
              className="min-w-0 flex-1 rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-sm text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:text-ink-3 focus:border-acento"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!draft.trim() || draft.trim().length > CUSTOM_MAX}
              className={`${adminClasses.primaryButton} shrink-0 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Adicionar
            </button>
          </div>
          {draft.trim().length > CUSTOM_MAX && (
            <p className="m-0 text-sm text-critico">
              Máximo {CUSTOM_MAX} caracteres.
            </p>
          )}
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
      className="grid size-8 cursor-pointer place-items-center rounded-token border border-linha bg-superficie font-titulo text-sm text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta disabled:cursor-default disabled:opacity-30"
    >
      {children}
    </button>
  );
}
