//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
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
    // Build output: Nitro writes .output/, and .vercel/output/ on Vercel.
    ignores: ["eslint.config.js", ".prettierrc", ".output/", ".vercel/"],
  },
]
