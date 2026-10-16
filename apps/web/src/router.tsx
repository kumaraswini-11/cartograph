import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { NotFound } from "./components/status/not-found"
import { RouteError } from "./components/status/route-error"
import { RoutePending } from "./components/status/route-pending"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
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
