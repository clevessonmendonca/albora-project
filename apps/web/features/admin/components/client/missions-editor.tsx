"use client";

import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { MissionBanner } from "@albora/ui-web";
import { useMemo, useRef, useState } from "react";
import {
  identityPreviewClassName,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import {
  moveMissionKey,
  reorderMissionKeys,
} from "@/features/admin/lib/mission-keys";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

const CUSTOM_MAX = 120;

type CustomMission = { id?: string; titulo: string; posicao: number; emoji?: string | null };

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
  const [draftEmoji, setDraftEmoji] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
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

  const add = (key: string) => {
    if (selected.includes(key)) return;
    markDirty([...selected, key]);
  };

  const remove = (key: string) => {
    markDirty(selected.filter((k) => k !== key));
  };

  const addCustom = () => {
    const titulo = draft.trim();
    if (!titulo || titulo.length > CUSTOM_MAX) return;
    const posicao = (custom[custom.length - 1]?.posicao ?? 0) + 1;
    const emoji = draftEmoji.trim() || null;
    setCustom((prev) => [...prev, { titulo, posicao, emoji }]);
    setDraft("");
    setDraftEmoji("");
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
    setEditEmoji(custom[idx]!.emoji ?? "");
  };

  const commitEdit = (idx: number) => {
    const titulo = editText.trim();
    if (titulo && titulo.length <= CUSTOM_MAX) {
      const emoji = editEmoji.trim() || null;
      setCustom((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, titulo, emoji } : m)),
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
            emoji: m.emoji ?? null,
          })),
        }),
      });
      if (!r.ok) throw new Error("falhou");
      const data = (await r.json()) as {
        challenges: { id: string; titleKey: string | null; customTitle: string | null; emoji: string | null; position: number }[];
      };
      const updatedCustom = data.challenges
        .filter((c) => c.customTitle !== null)
        .map((c) => ({ id: c.id, titulo: c.customTitle!, posicao: c.position, emoji: c.emoji }));
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
          <div className="flex flex-col gap-4">
            <div>
              {selected.length === 0 && custom.length === 0 ? (
                <p className="m-0 rounded-token border border-linha bg-bg px-3 py-3 text-sm text-ink-2">
                  Modo livre — o convidado fotografa o que quiser.
                </p>
              ) : (
                <ol className="m-0 list-none p-0 flex flex-col gap-2">
                  {selected.map((key, i) => (
                    <ActiveMissionRow
                      key={key}
                      index={i + 1}
                      title={resolvePackText(pack, key)}
                      canUp={i > 0}
                      canDown={i < selected.length - 1}
                      onMoveUp={() => markDirty(moveMissionKey(selected, key, -1))}
                      onMoveDown={() => markDirty(moveMissionKey(selected, key, 1))}
                      onRemove={() => remove(key)}
                      onDrop={(fromKey) => markDirty(reorderMissionKeys(selected, fromKey, key))}
                      dragKey={key}
                    />
                  ))}
                </ol>
              )}
            </div>

            {/* ── Missões disponíveis do pack ───────────────── */}
            {inactive.length > 0 && (
              <div>
                <p className="mb-2 mt-1 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                  Disponíveis no pack
                </p>
                <ul className="m-0 list-none p-0 flex flex-col gap-2">
                  {inactive.map((m) => (
                    <InactiveMissionRow
                      key={m.chaveTitulo}
                      title={resolvePackText(pack, m.chaveTitulo)}
                      onAdd={() => add(m.chaveTitulo)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Prévia da faixa na câmera ─────────────────── */}
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
                <>
                  <input
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    placeholder="🎉"
                    maxLength={4}
                    aria-label="Emoji da missão"
                    className="w-14 shrink-0 rounded-token border border-acento-borda bg-bg px-2 py-1 text-center font-corpo text-sm text-ink outline-none"
                  />
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
                </>
              ) : (
                <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">
                  {m.emoji ? `${m.emoji} ` : ""}{m.titulo}
                </span>
              )}

              <span className="flex shrink-0 gap-1">
                <IconButton label={`Subir ${m.titulo}`} disabled={i === 0} onClick={() => moveCustom(i, -1)}>
                  ↑
                </IconButton>
                <IconButton label={`Descer ${m.titulo}`} disabled={i === custom.length - 1} onClick={() => moveCustom(i, 1)}>
                  ↓
                </IconButton>
                <IconButton label={`Editar ${m.titulo}`} onClick={() => startEdit(i)}>
                  ✎
                </IconButton>
                <IconButton label={`Remover ${m.titulo}`} onClick={() => removeCustom(i)}>
                  ×
                </IconButton>
              </span>
            </div>
          ))}

          <div className="mt-2 flex gap-2">
            <input
              value={draftEmoji}
              onChange={(e) => setDraftEmoji(e.target.value)}
              placeholder="🎉"
              maxLength={4}
              aria-label="Emoji opcional"
              className="w-14 shrink-0 rounded-token border border-linha bg-bg px-2 py-[0.65rem] text-center font-corpo text-sm text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
            />
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

function ActiveMissionRow({
  index,
  title,
  canUp,
  canDown,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDrop,
  dragKey,
}: {
  index: number;
  title: string;
  canUp: boolean;
  canDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDrop: (fromKey: string) => void;
  dragKey: string;
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-token border border-linha bg-bg p-3"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", dragKey);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.getData("text/plain"));
      }}
    >
      {/* Drag handle + index */}
      <span
        className="grid size-8 shrink-0 place-items-center rounded-token border border-linha bg-superficie text-[0.75rem] font-titulo text-ink-3 cursor-grab"
        aria-hidden
        title="Arraste para reordenar"
      >
        {index}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">{title}</span>

      {/* Order arrows */}
      <span className="flex shrink-0 gap-1">
        <IconButton label={`Subir "${title}"`} disabled={!canUp} onClick={onMoveUp}>
          ↑
        </IconButton>
        <IconButton label={`Descer "${title}"`} disabled={!canDown} onClick={onMoveDown}>
          ↓
        </IconButton>
      </span>

      {/* Remove */}
      <IconButton label={`Remover "${title}"`} onClick={onRemove}>
        ×
      </IconButton>
    </li>
  );
}

function InactiveMissionRow({
  title,
  onAdd,
}: {
  title: string;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-token border border-linha bg-superficie p-3 opacity-60">
      <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug text-ink-2">
        {title}
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 cursor-pointer rounded-token border border-linha bg-bg px-3 py-1.5 font-titulo text-[0.8125rem] text-ink hover:bg-superficie-alta"
      >
        + Adicionar
      </button>
    </li>
  );
}

function IconButton({
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
