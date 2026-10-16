// Cartograph's Vitest settings, one source for every package's tests
// (AGENTS.md: one source for each concern; Turborepo: sharing Vitest
// configuration). Tests run in Node, beside the code they test.
import { defineConfig } from "vitest/config"

export const config = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
