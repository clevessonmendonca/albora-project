/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui-native/src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        superficie: "var(--superficie)",
        "superficie-alta": "var(--superficie-alta)",
        linha: "var(--linha)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        acento: "var(--acento)",
        "acento-texto": "var(--acento-texto)",
        "sobre-acento": "var(--sobre-acento)",
        critico: "var(--critico)",
      },
      borderRadius: {
        token: "var(--raio)",
        pilula: "var(--raio-pilula)",
        superficie: "var(--raio-superficie)",
      },
      fontFamily: {
        titulo: ["Georgia"],
        corpo: ["System"],
      },
      letterSpacing: {
        rotulo: "var(--tracking-rotulo)",
      },
    },
  },
};
