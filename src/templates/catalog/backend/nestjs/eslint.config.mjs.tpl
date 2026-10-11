import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
);
