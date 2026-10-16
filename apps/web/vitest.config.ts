import { config } from "@workspace/vitest-config"
import { mergeConfig } from "vitest/config"

// The shared settings, with imports resolved as in the app (`@/`, from
// tsconfig.json's paths). Unit tests run in Node without the app's Vite
// plugins (Start, Nitro, Tailwind), so a test only loads the module it tests.
export default mergeConfig(config, { resolve: { tsconfigPaths: true } })
