"use client";

type DeslizanteProps = {
  rotulo: string;
  min: number;
  max: number;
  valor: number;
  onMudar: (valor: number) => void;
};

/**
 * Controle deslizante para ajustes.
 * Suporta bipolares (-n...n) e unipolares (0...n).
 * O preenchimento nasce no neutro, não na ponta esquerda.
 */
export function Deslizante({
  rotulo,
  min,
  max,
  valor,
  onMudar,
}: DeslizanteProps) {
  const bruto = Math.round(valor * max);
  const posicao = ((bruto - min) / (max - min)) * 100;
  
  // Neutro: num controle -50...50 é o desvio que interessa
  const neutro = min < 0 ? ((0 - min) / (max - min)) * 100 : 0;

  const de = Math.min(neutro, posicao);
  const ate = Math.max(neutro, posicao);

  return (
    <label className="ed-linha">
      <span className="ed-rotulo">{rotulo}</span>
      <input
        className="ed-faixa"
        type="range"
        min={min}
        max={max}
        value={bruto}
        onChange={(e) => onMudar(Number(e.target.value) / max)}
        style={
          {
            "--trilho": `linear-gradient(to right, var(--linha) 0 ${de}%, var(--acento) ${de}% ${ate}%, var(--linha) ${ate}% 100%)`,
          } as React.CSSProperties
        }
      />
      <output className="ed-valor">{bruto}</output>
    </label>
  );
}
