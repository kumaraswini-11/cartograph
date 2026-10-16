import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

import { MAX_RUN_SECONDS } from "./src/lib/platform.ts"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // The generated route tree (src/routeTree.gen.ts) is committed, so it is
    // written in the repo's own quote style: an unchanged route tree then
    // stays byte-identical across builds. The plugin's default is "single".
    tanstackStart({ router: { quoteStyle: "double" } }),
    // Builds the server for the host (docs/adr/0002): the vercel preset on
    // Vercel, a Node.js server elsewhere.
    nitro({ vercel: { functions: { maxDuration: MAX_RUN_SECONDS } } }),
    viteReact(),
  ],
})

export default config
