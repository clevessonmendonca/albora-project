export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // O CLAUDE.md pede escopo — `feat(upload):`, `fix(telao):`, `docs(adr):`.
    // Sem escopo, o histórico não diz onde a mudança caiu.
    "scope-empty": [2, "never"],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [0],
  },
};
