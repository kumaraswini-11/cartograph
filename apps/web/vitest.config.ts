import { defineConfig } from "vitest/config"

// Unit tests run in Node without the app's Vite plugins (Start, Nitro,
// Tailwind), so a test only loads the module it tests. Imports resolve as
// in the app (`@/`, from tsconfig.json's paths).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
