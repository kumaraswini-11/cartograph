import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { Toaster } from "@workspace/ui/components/shadcn-ui/toast"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { siteMeta } from "@/lib/site"
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
