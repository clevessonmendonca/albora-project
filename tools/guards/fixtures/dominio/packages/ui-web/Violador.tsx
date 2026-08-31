export function Violador() {
  fetch("/api/midia");
  const agora = new Date();
  return <div>{String(agora)}</div>;
}
