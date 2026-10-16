import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"
import { provider } from "std-env"

import { MAX_RUN_SECONDS } from "./src/lib/platform.ts"

// Production's address for share and search tags (src/lib/site.ts). Vercel sets
// it on every build, previews included, "to reliably generate links that point
// to production such as OG-image URLs" (Vercel: system environment variables).
const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL

// A Vercel build is published, so it must not fall back to localhost: stop
// it instead. Vercel is detected as Nitro detects it (std-env), so this holds
// whenever the build is for Vercel. Local and CI builds keep the fallback.
if (provider === "vercel" && !productionDomain) {
  throw new Error(
    "VERCEL_PROJECT_PRODUCTION_URL is missing: enable access to System Environment Variables in the Vercel project's settings."
  )
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: productionDomain
    ? {
        "import.meta.env.VITE_SITE_URL": JSON.stringify(
          `https://${productionDomain}`
        ),
      }
    : {},
  plugins: [
    devtools(),
    tailwindcss(),
    // The generated route tree (src/routeTree.gen.ts) is committed, so it is
    // written in the repo's own quote style: an unchanged route tree then
    // stays byte-identical across builds. The plugin's default is "single".
    tanstackStart({ router: { quoteStyle: "double" } }),
    // Builds the server for the host (docs/adr/0002): the vercel preset on
    // Vercel, a Node.js server elsewhere.
    nitro({
      // React stays external and is copied into the server output, so one
      // copy serves everything. Bundled, React is duplicated: the CommonJS
      // use-sync-external-store shim (from Base UI and TanStack Router) still
      // calls require("react") at runtime, which fails on Vercel with
      // "Cannot find module 'react'".
      traceDeps: ["react", "react-dom"],
      vercel: { functions: { maxDuration: MAX_RUN_SECONDS } },
    }),
    viteReact(),
  ],
})

export default config
