import { config } from "@workspace/vitest-config"
import { mergeConfig } from "vitest/config"

// The shared settings, with imports resolved as in the app (`@/`, from
// tsconfig.json's paths). Unit tests run in Node without the app's Vite
// plugins (Start, Nitro, Tailwind), so a test only loads the module it tests.
// The release is the one value the app's build defines that code reads.
export default mergeConfig(config, {
  resolve: { tsconfigPaths: true },
  define: { "import.meta.env.VITE_RELEASE": JSON.stringify("test") },
})
