export function Violador() {
  return <div style={{ color: "#E8873A" }} className="bg-slate-800 text-[#fff]" />;
}

export function RaioLiteral() {
  return <div style={{ borderRadius: "12px" }} />;
}

export function MeioRaioNaoEhZero() {
  return <div style={{ borderRadius: "0.5rem" }} />;
}

export function CurvaLiteral() {
  return <div style={{ transition: "opacity 0.3s ease-out" }} />;
}

export function CurvaPorFuncao() {
  return <div style={{ transition: "all .35s cubic-bezier(0.2, 0, 0, 1)" }} />;
}

/* ── daqui para baixo, as formas CERTAS: nada disto pode ser reprovado ── */

export function ComToken() {
  return <div style={{ borderRadius: "var(--raio-pilula)", color: "var(--ink)" }} />;
}

export function CirculoEhGeometria() {
  return <div style={{ borderRadius: "50%" }} />;
}

export function ZeroEhReset() {
  return <div style={{ borderRadius: 0 }} />;
}

export function TransicaoComToken() {
  return <div style={{ transition: "opacity var(--tempo) var(--curva)" }} />;
}

export function GradienteNaoEhCurva() {
  return <div style={{ background: "linear-gradient(var(--ink), var(--bg))" }} />;
}
