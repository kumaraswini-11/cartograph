import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // The generated route tree (src/routeTree.gen.ts) is committed, so it is
    // written in the repo's own quote style: an unchanged route tree then
    // stays byte-identical across builds. The plugin's default is "single".
    tanstackStart({ router: { quoteStyle: "double" } }),
    viteReact(),
  ],
})

export default config
