import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { getGlobalStartContext } from "@tanstack/react-start"

import { NotFound } from "@/components/status/not-found"
import { RouteError } from "@/components/status/route-error"
import { RoutePending } from "@/components/status/route-pending"
import { routeTree } from "@/routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    // Hovering or focusing a link loads its page ahead. A preload is kept for
    // the router's default 30 s (a route can keep it longer);
    // 0 is for apps whose data cache is TanStack Query's, not the router's.
    defaultPreload: "intent",
    // One look for every not-found, error and slow page, set once here.
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: RouteError,
    defaultPendingComponent: RoutePending,
    // This response's nonce, from the security headers' middleware
    // (src/start.ts), on every inline script the router writes: its
    // hydration data, the head's and body's scripts, and ScriptOnce's
    // (spec 012, FR-005). In the browser there's none to read, and none is
    // needed: what the page loads later comes from the policy's sources.
    ssr: { nonce: getGlobalStartContext()?.nonce },
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
