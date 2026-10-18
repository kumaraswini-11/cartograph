import { useEffect } from "react"
import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { SpeedInsights } from "@vercel/speed-insights/react"

import { Toaster } from "@workspace/ui/components/shadcn-ui/toast"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { siteMeta } from "@/lib/site"
import { startErrorReports } from "@/lib/telemetry.browser"
import appCss from "@/styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      // The site-wide search and share tags; each page adds its own.
      ...siteMeta(),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // The .ico serves browsers without SVG favicon support; the rest prefer
      // the SVG. iOS reads only apple-touch-icon, and installs read the manifest.
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Error reports start in the browser, once (spec 012, FR-001).
  useEffect(() => startErrorReports(), [])
  // The page's route, not its address, so every analysis's map is one page
  // in Speed Insights (spec 012, FR-009).
  const route = useRouterState({
    select: (state) => state.matches[state.matches.length - 1]?.fullPath,
  })

  return (
    // The theme script sets the class on <html> before React hydrates, so the
    // attribute differs from the server render on purpose.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          {/* Identity is provided only where it's used: routes/_identity.tsx. */}
          {children}
        </ThemeProvider>
        {/* One toast region for the whole app: call toast.add() from
            @workspace/ui/components/shadcn-ui/toast anywhere to show a toast. */}
        <Toaster />
        {/* Real page loads' Core Web Vitals (spec 012, FR-009, D-08), from
            this origin; nothing kept on the device (FR-012). In a build for
            Vercel only: elsewhere its script isn't served. */}
        {import.meta.env.VITE_SPEED_INSIGHTS && (
          <SpeedInsights route={route ?? null} />
        )}
        {/* Development only: the devtools Vite plugin strips this from
            production builds (removeDevtoolsOnBuild defaults to true). */}
        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
