import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright E2E test automation is not React/Next app code; the
    // react-hooks rules misfire on it (e.g. Playwright's `use` fixture
    // parameter looks like a React Hook name).
    "e2e/**",
    "playwright.config.ts",
  ]),
]);

export default eslintConfig;
