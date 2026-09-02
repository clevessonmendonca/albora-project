type SliderProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  step?: number;
  bipolar?: boolean;
};

export function Slider({
  label,
  min,
  max,
  value,
  onChange,
  showValue = true,
  step = 1,
  bipolar = false,
}: SliderProps) {
  const normalizedValue = Math.round(value * max);
  const position = ((normalizedValue - min) / (max - min)) * 100;

  const neutral = bipolar && min < 0 ? ((0 - min) / (max - min)) * 100 : 0;

  const start = Math.min(neutral, position);
  const end = Math.max(neutral, position);

  return (
    <label className="flex items-center gap-3">
      <span className="min-w-[5rem] text-[0.8125rem] text-ink-2">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={normalizedValue}
        onChange={(e) => onChange(Number(e.target.value) / max)}
        className="flex-1 cursor-pointer appearance-none bg-transparent"
        style={
          {
            "--track-bg": `linear-gradient(to right, var(--linha) 0 ${start}%, var(--acento) ${start}% ${end}%, var(--linha) ${end}% 100%)`,
            background: "var(--track-bg)",
            height: "0.25rem",
            borderRadius: "var(--raio-xs)",
          } as React.CSSProperties
        }
      />
      {showValue && (
        <output className="min-w-[2.5rem] text-right text-[0.8125rem] tabular-nums text-ink">
          {normalizedValue}
        </output>
      )}
    </label>
  );
}
