import fs from "node:fs";
import { execSync } from "node:child_process";

const MAP = [
  ["comEvento", "withEvent"],
  ["comConta", "withAccount"],
  ["comAgregacao", "withAggregation"],
  ["listarFeed", "listFeed"],
  ["gateDoEvento", "eventGate"],
  ["packDoEvento", "eventPack"],
  ["fusoDoEvento", "eventTimeZone"],
  ["criarStory", "createStory"],
  ["confirmarUpload", "confirmUpload"],
  ["anotarUpload", "annotateUpload"],
  ["desafioDoEvento", "challengeBelongsToEvent"],
  ["listarDesafios", "listChallenges"],
  ["perfilDoConvidado", "guestProfile"],
  ["listarMinhasDoEvento", "listMyMedia"],
  ["storiesAtivasDoEvento", "activeStoriesForEvent"],
  ["resolverSessao", "resolveSession"],
  ["criarSessao", "createSession"],
  ["recadoDoEvento", "eventGuestbook"],
  ["ErroUploadDeOutroEvento", "UploadConflictError"],
  ["ErroSessaoInvalida", "InvalidSessionError"],
  ["listarReacoesDaMidia", "listReactionsForMedia"],
];

const root = "apps/web";
const files = execSync(`rg -l 'from "@albora/db"' ${root} --glob '*.ts' --glob '*.tsx'`, {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

let touched = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const antes = src;
  for (const [pt, en] of MAP) {
    src = src.replace(new RegExp(`\\b${pt}\\b`, "g"), en);
  }
  if (src !== antes) {
    fs.writeFileSync(file, src);
    touched++;
  }
}
console.log(`migrated ${touched}/${files.length} files in ${root}`);
