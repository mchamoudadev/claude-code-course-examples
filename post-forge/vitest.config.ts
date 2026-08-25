import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for PostForge. Node environment (no DOM needed for the backend
 * unit tests) and the `@/*` → `src/*` path alias mirrored from tsconfig so tests
 * can import project modules the same way app code does.
 */
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
