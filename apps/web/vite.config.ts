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

// The release every error report carries (spec 012, FR-001): the commit
// Vercel builds, a system variable like the one above; "development" for a
// build anywhere else.
const release = process.env.VERCEL_GIT_COMMIT_SHA ?? "development"

const config = defineConfig(({ command }) => {
  // A Vercel build is published, so it must not fall back to localhost: stop
  // it instead. Vercel is detected as Nitro detects it (std-env), so this
  // holds whenever the build is for Vercel. Only a build stops: `vite dev`
  // under Vercel's variables still starts. Local and CI builds keep the
  // fallback.
  if (command === "build" && provider === "vercel" && !productionDomain) {
    throw new Error(
      "VERCEL_PROJECT_PRODUCTION_URL is missing: enable access to System Environment Variables in the Vercel project's settings."
    )
  }
  return {
    resolve: { tsconfigPaths: true },
    // The Chat tab loads lazily (spec 010, plan D-09), so the dev server's
    // first scan never reaches its dependencies. Found on first use, they
    // were bundled again against a second copy of React, and its hooks
    // failed ("Invalid hook call"). Listed here, they're bundled at start,
    // with the page's React. Dev only: a build has no optimizer.
    optimizeDeps: {
      include: [
        "@ai-sdk/react",
        "ai",
        // The scroller's package belongs to the UI package, so it's
        // reached through it.
        "@workspace/ui > @shadcn/react/message-scroller",
      ],
    },
    // The parser's oxc packages load a native binary for the platform they
    // run on, which a bundle can't hold: the server build leaves them as
    // imports, and Nitro copies them into its output (traceDeps, below).
    environments: {
      ssr: { resolve: { external: ["oxc-parser", "oxc-resolver"] } },
    },
    define: {
      "import.meta.env.VITE_RELEASE": JSON.stringify(release),
      // Speed Insights' script and reports are served by Vercel alone
      // (/_vercel/speed-insights): a build for anywhere else leaves it out.
      "import.meta.env.VITE_SPEED_INSIGHTS": JSON.stringify(
        provider === "vercel"
      ),
      ...(productionDomain && {
        "import.meta.env.VITE_SITE_URL": JSON.stringify(
          `https://${productionDomain}`
        ),
      }),
    },
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
        // "Cannot find module 'react'". The parser's oxc packages stay
        // external too: they load a native binary for the platform they run
        // on, which a bundle can't hold (spec 008, plan D-05).
        traceDeps: ["react", "react-dom", "oxc-parser", "oxc-resolver"],
        vercel: { functions: { maxDuration: MAX_RUN_SECONDS } },
      }),
      viteReact(),
    ],
  }
})

export default config
