export function WizardField({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.8125rem] text-ink-2">
      {label}
      <span className="rounded-token bg-superficie-alta px-3.5 py-3 text-[0.9375rem] text-ink">
        {value}
      </span>
    </label>
  );
}

export function WizardSelect({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.8125rem] text-ink-2">
      {label}
      <span className="flex items-center justify-between rounded-token border border-linha bg-bg px-3.5 py-3 text-[0.9375rem] text-ink">
        {value}
        <span className="text-ink-3" aria-hidden>
          ▾
        </span>
      </span>
    </label>
  );
}
