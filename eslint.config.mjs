import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "prisma/migrations/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // Tool-managed skill assets (installed by `skills add`). They are markdown
    // templates with placeholder syntax like `revalidate[Collection]Cache()`
    // that is deliberately not valid TypeScript, so linting them fails on a
    // parse error. TypeScript already skips this tree because globs do not
    // match dot-directories; ESLint needs to be told explicitly.
    ".hermes/**",
    ".agents/**",
    "skills/**",
  ]),
  {
    rules: {
      // Relax some rules for the demo application
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["error", "warn", "log"] }],
    },
  },
]);

export default eslintConfig;
