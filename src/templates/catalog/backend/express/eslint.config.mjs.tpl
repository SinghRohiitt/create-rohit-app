import js from "@eslint/js";
import globals from "globals";

const config = [js.configs.recommended, {
  files: ["src/**/*.js", "tests/**/*.js"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.node, ...globals.vitest } },
  rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }] },
}];

export default config;
