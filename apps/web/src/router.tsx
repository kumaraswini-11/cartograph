import { createRouter as createTanStackRouter } from "@tanstack/react-router"

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
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
