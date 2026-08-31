export function AdminField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <label className="block">
      <span className="text-[0.6875rem] uppercase tracking-rotulo text-ink-3">{label}</span>
      <div className="mt-1.5 rounded-token border-b-2 border-acento bg-superficie px-4 py-3 font-titulo text-[1.125rem]">
        {value}
      </div>
      {note && <span className="mt-1 block text-[0.6875rem] text-ink-3">{note}</span>}
    </label>
  );
}
