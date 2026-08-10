import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.open-next/**",
      "spike/**",
      "tools/guards/fixtures/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } },
  },
);
