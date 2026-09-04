"use client";

import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { Badge, MissionBanner, Switch } from "@albora/ui-web";
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

/**
 * ≥44px de alvo de toque para reordenar/alternar — override local do IconButton,
 * mesmo padrão de review-queue.tsx/host-album.tsx (T8-T10): `size-11` = 2.75rem = 44px.
 */
const ALVO_TOQUE_ICONE = "size-11";

type CustomMission = {
  id?: string;
  titulo: string;
  posicao: number;
  emoji?: string | null;
  deadline?: string | null;
};

/** ISO 8601 → valor aceito por `<input type="datetime-local">`, em horário local. */
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [draftDeadline, setDraftDeadline] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
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
        <p className="tipo-body m-0 text-critico">Pack do evento não encontrado.</p>
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
    const deadline = draftDeadline ? new Date(draftDeadline).toISOString() : null;
    setCustom((prev) => [...prev, { titulo, posicao, emoji, deadline }]);
    setDraft("");
    setDraftEmoji("");
    setDraftDeadline("");
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
    setEditDeadline(toDatetimeLocalValue(custom[idx]!.deadline));
  };

  const commitEdit = (idx: number) => {
    const titulo = editText.trim();
    if (titulo && titulo.length <= CUSTOM_MAX) {
      const emoji = editEmoji.trim() || null;
      const deadline = editDeadline ? new Date(editDeadline).toISOString() : null;
      setCustom((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, titulo, emoji, deadline } : m)),
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
            deadline: m.deadline ?? null,
          })),
        }),
      });
      if (!r.ok) throw new Error("falhou");
      const data = (await r.json()) as {
        challenges: {
          id: string;
          titleKey: string | null;
          customTitle: string | null;
          emoji: string | null;
          deadline: string | null;
          position: number;
        }[];
      };
      const updatedCustom = data.challenges
        .filter((c) => c.customTitle !== null)
        .map((c) => ({
          id: c.id,
          titulo: c.customTitle!,
          posicao: c.position,
          emoji: c.emoji,
          deadline: c.deadline,
        }));
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
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Missões do pack</h2>
        <p className="tipo-body mb-5 mt-0 text-ink-2">
          Liga e ordena as missões do pack. O convidado vê esta lista na aba Missões.
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_minmax(14rem,18rem)]">
          <div className="flex flex-col gap-4">
            <div>
              {selected.length === 0 && custom.length === 0 ? (
                <p className="tipo-body m-0 rounded-token border border-linha bg-bg px-3 py-3 text-ink-2">
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
                      onToggleOff={() => remove(key)}
                      onDrop={(fromKey) => markDirty(reorderMissionKeys(selected, fromKey, key))}
                      dragKey={key}
                    />
                  ))}
                </ol>
              )}
            </div>

            {inactive.length > 0 && (
              <div>
                <p className="tipo-label mb-2 mt-1 text-ink-3">Disponíveis no pack</p>
                <ul className="m-0 list-none p-0 flex flex-col gap-2">
                  {inactive.map((m) => (
                    <InactiveMissionRow
                      key={m.chaveTitulo}
                      title={resolvePackText(pack, m.chaveTitulo)}
                      onToggleOn={() => add(m.chaveTitulo)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={identityPreviewClassName} style={previewVars}>
            <p className="tipo-label mb-3 mt-0 text-ink-3">Na câmera</p>
            <div className="relative min-h-[11rem] overflow-hidden rounded-superficie bg-superficie">
              <div className="absolute inset-x-3 top-3">
                {previewTitle ? (
                  <MissionBanner index={1} total={previewTotal} title={previewTitle} />
                ) : (
                  <p className="tipo-body m-0 text-ink-2">Sem faixa de missão — modo livre.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Missões personalizadas</h2>
        <p className="tipo-body mb-5 mt-0 text-ink-2">
          Adicione missões com o texto exato que você quer — ideal para momentos únicos do evento.
        </p>

        <div className="flex flex-col gap-2">
          {custom.map((m, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-token border border-linha bg-bg p-3"
            >
              <div className="flex items-center gap-2">
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(i);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      maxLength={CUSTOM_MAX}
                      aria-label="Título da missão"
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
                    <IcoUp />
                  </IconButton>
                  <IconButton label={`Descer ${m.titulo}`} disabled={i === custom.length - 1} onClick={() => moveCustom(i, 1)}>
                    <IcoDown />
                  </IconButton>
                  {editingId === String(i) ? (
                    <IconButton label={`Confirmar ${m.titulo}`} onClick={() => commitEdit(i)}>
                      <IcoCheck />
                    </IconButton>
                  ) : (
                    <IconButton label={`Editar ${m.titulo}`} onClick={() => startEdit(i)}>
                      <IcoPencil />
                    </IconButton>
                  )}
                  <IconButton label={`Remover ${m.titulo}`} onClick={() => removeCustom(i)}>
                    <IcoX />
                  </IconButton>
                </span>
              </div>

              {editingId === String(i) ? (
                <div className="flex items-center gap-2">
                  <label htmlFor={`prazo-edit-${i}`} className="tipo-label shrink-0 text-ink-3">
                    Prazo opcional
                  </label>
                  <input
                    id={`prazo-edit-${i}`}
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="rounded-token border border-acento-borda bg-bg px-2 py-1 font-corpo text-sm text-ink outline-none"
                  />
                  {editDeadline && (
                    <button
                      type="button"
                      onClick={() => setEditDeadline("")}
                      className="cursor-pointer bg-transparent p-0 font-corpo text-[0.8125rem] text-ink-3 underline hover:text-ink"
                    >
                      Remover prazo
                    </button>
                  )}
                </div>
              ) : (
                m.deadline && (
                  <span className="tipo-caption text-ink-3">
                    Até {formatDeadline(m.deadline)}
                  </span>
                )
              )}
            </div>
          ))}

          <div className="mt-2 flex flex-col gap-3 rounded-token border border-dashed border-linha bg-superficie p-4">
            <p className="tipo-label m-0 text-ink-3">Nova missão personalizada</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="emoji-nova-missao" className="tipo-label text-ink-3">
                  Emoji
                </label>
                <input
                  id="emoji-nova-missao"
                  value={draftEmoji}
                  onChange={(e) => setDraftEmoji(e.target.value)}
                  placeholder="🎉"
                  maxLength={4}
                  className="w-14 shrink-0 rounded-token border border-linha bg-bg px-2 py-[0.65rem] text-center font-corpo text-sm text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
                />
              </div>
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
                <label htmlFor="titulo-nova-missao" className="tipo-label text-ink-3">
                  Título
                </label>
                <input
                  id="titulo-nova-missao"
                  ref={draftRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
                  placeholder="Nova missão personalizada…"
                  maxLength={CUSTOM_MAX}
                  className="min-w-0 flex-1 rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-sm text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:text-ink-3 focus:border-acento"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="prazo-nova-missao" className="tipo-label text-ink-3">
                  Prazo opcional
                </label>
                <input
                  id="prazo-nova-missao"
                  type="datetime-local"
                  value={draftDeadline}
                  onChange={(e) => setDraftDeadline(e.target.value)}
                  className="rounded-token border border-linha bg-bg px-2 py-1 font-corpo text-sm text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addCustom}
                disabled={!draft.trim() || draft.trim().length > CUSTOM_MAX}
                className={`${adminClasses.secondaryButton} shrink-0 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Adicionar
              </button>
              {draft.trim().length > CUSTOM_MAX && (
                <p role="alert" className="tipo-caption m-0 text-critico">
                  Máximo {CUSTOM_MAX} caracteres.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className={`${adminClasses.primaryButton} ${saving ? "opacity-60" : ""}`}
          >
            {saving ? "Salvando…" : "Salvar missões"}
          </button>
          {saved && (
            <span role="status">
              <Badge tone="accent" className="gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Salvo
              </Badge>
            </span>
          )}
          {error && (
            <span role="alert" className="tipo-body text-critico">
              Não foi possível salvar.
            </span>
          )}
        </div>
      </AdminSection>
    </div>
  );
}

function ActiveMissionRow({
  index, title, canUp, canDown, onMoveUp, onMoveDown, onToggleOff, onDrop, dragKey,
}: {
  index: number;
  title: string;
  canUp: boolean;
  canDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleOff: () => void;
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
      <span
        className={`grid ${ALVO_TOQUE_ICONE} shrink-0 place-items-center rounded-token border border-linha bg-superficie text-[0.8125rem] font-titulo text-ink-3 cursor-grab`}
        aria-hidden
        title="Arraste para reordenar"
      >
        {index}
      </span>

      <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug">{title}</span>

      <span className="flex shrink-0 gap-1">
        <IconButton label={`Subir "${title}"`} disabled={!canUp} onClick={onMoveUp}>
          <IcoUp />
        </IconButton>
        <IconButton label={`Descer "${title}"`} disabled={!canDown} onClick={onMoveDown}>
          <IcoDown />
        </IconButton>
      </span>

      <Switch checked label={`Desativar "${title}"`} onChange={onToggleOff} />
    </li>
  );
}

function InactiveMissionRow({ title, onToggleOn }: { title: string; onToggleOn: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-token border border-linha bg-superficie p-3">
      <span className="min-w-0 flex-1 font-titulo text-[0.95rem] leading-snug text-ink-2">
        {title}
      </span>
      <Switch checked={false} label={`Ativar "${title}"`} onChange={onToggleOn} />
    </li>
  );
}

function IconButton({
  label, disabled, onClick, children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid ${ALVO_TOQUE_ICONE} cursor-pointer place-items-center rounded-token border border-linha bg-superficie text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta disabled:cursor-default disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function IcoUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 9V3M3.5 5.5L6 3l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 3v6M3.5 6.5L6 9l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoPencil() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M8.5 2l1.5 1.5L3.5 10H2V8.5L8.5 2z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoX() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IcoCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
