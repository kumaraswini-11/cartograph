// @ts-check
import { config } from "@workspace/eslint-config"

// The generated table types are the CLI's output, compared as written in CI.
export default [
  ...config,
  { ignores: ["supabase/.temp/", "src/database.types.ts"] },
]
