import { defineConfig } from "vitest/config"

// Unit tests run in Node without the app's Vite plugins (Start, Nitro,
// Tailwind), so a test only loads the module it tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
