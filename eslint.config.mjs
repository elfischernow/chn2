// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference SPAs/repos kept for porting parity — not part of the
    // current product. Linting them with our config produces thousands
    // of unrelated errors and drowns the real CI signal.
    "legacy/**",
    "legacy-projects/**",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
