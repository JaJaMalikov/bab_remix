import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "src-tauri/target"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      prettier,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: {
      react-hooks: reactHooks,
    },
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      complexity: ["warn", 15],
      "max-lines-per-function": ["warn", { "max": 100, "skipComments": true, "skipBlankLines": true }],
      "max-depth": ["warn", 4],
    },
  }
);
