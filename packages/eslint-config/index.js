// @ts-check
// Cartograph's ESLint settings, one source for every package (AGENTS.md:
// one source for each concern), as Turborepo recommends (sharing ESLint
// configuration). A package adds only its own ignores.

import { tanstackConfig } from "@tanstack/eslint-config"

export const config = [
  ...tanstackConfig,
  {
    // Off since the project's template: import order and type-import style
    // are left to authors, and import/no-cycle walks the whole graph.
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "import/consistent-type-specifier-style": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: ["eslint.config.js"],
  },
]
