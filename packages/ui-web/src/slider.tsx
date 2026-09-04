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

/**
 * Thumb de 24px (alvo de toque some com o track de 48px de altura clicável ao
 * redor) e trilho fino, sem depender de `<style>` global. O degradê que marca
 * o preenchimento é uma custom property (`--track-bg`, injetada via `style`)
 * lida direto pelos pseudo-elementos de trilho — herança de custom property
 * chega neles, mas `background` no `<input>` não pinta o track no WebKit.
 */
const TRILHO =
  "[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-token [&::-webkit-slider-runnable-track]:bg-[var(--track-bg)] [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-token [&::-moz-range-track]:bg-[var(--track-bg)]";
const CURSOR =
  "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pilula [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:shadow-suave [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-instantaneo [&::-webkit-slider-thumb]:ease-mola " +
  "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-pilula [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:shadow-suave " +
  "active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 motion-reduce:active:[&::-webkit-slider-thumb]:scale-100 motion-reduce:active:[&::-moz-range-thumb]:scale-100";

/**
 * Slider (range input) estilizado.
 * Suporta bipolares (-n...n) e unipolares (0...n).
 * O preenchimento nasce no neutro para controles bipolares.
 */
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

  // Neutro: em controle bipolar -50...50 é o desvio que interessa
  const neutral = bipolar && min < 0 ? ((0 - min) / (max - min)) * 100 : 0;

  const start = Math.min(neutral, position);
  const end = Math.max(neutral, position);

  return (
    <label className="grid grid-cols-[5rem_1fr_2.75rem] items-center gap-3">
      <span className="tipo-label uppercase text-ink-2">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={normalizedValue}
        onChange={(e) => onChange(Number(e.target.value) / max)}
        aria-label={label}
        className={`min-h-11 cursor-pointer appearance-none bg-transparent ${TRILHO} ${CURSOR}`}
        style={
          {
            "--track-bg": `linear-gradient(to right, var(--linha) 0 ${start}%, var(--acento) ${start}% ${end}%, var(--linha) ${end}% 100%)`,
            background: "var(--track-bg)",
          } as React.CSSProperties
        }
      />
      {showValue && (
        <output className="text-right font-mono text-[0.75rem] tabular-nums text-ink-3">
          {normalizedValue}
        </output>
      )}
    </label>
  );
}
