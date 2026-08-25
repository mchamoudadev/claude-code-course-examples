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
  ]),
  {
    rules: {
      // eslint-plugin-react-hooks@7 (React Compiler era) flags idiomatic
      // patterns we use throughout the UI — SSR mount guards (setMounted(true)),
      // media-query subscriptions that sync initial state, and fetch effects
      // that reset loading/error before a request. These are intentional and
      // correct, so keep the rule as a visible warning rather than a hard CI
      // failure. Genuine hook bugs (rules-of-hooks, exhaustive-deps) stay errors.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
