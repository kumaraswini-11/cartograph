import { Link, useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { TriangleAlertIcon } from "lucide-react"
import { EmptyState } from "@workspace/ui/components/empty-state"
import { Button } from "@workspace/ui/components/shadcn-ui/button"

/**
 * A page that failed to load or render: the router's default error page.
 * Trying again re-runs the page's loaders, which also resets this boundary.
 * The technical message is shown in development only, never to visitors.
 */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const detail =
    import.meta.env.DEV && error instanceof Error ? error.message : undefined

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <EmptyState
        icon={<TriangleAlertIcon />}
        title={<h1>Something went wrong</h1>}
        description={
          detail ?? "This page couldn't be shown. Trying again often works."
        }
      >
        <div className="flex gap-2">
          <Button onClick={() => void router.invalidate()}>Try again</Button>
          <Button variant="outline" render={<Link to="/" />}>
            Go home
          </Button>
        </div>
      </EmptyState>
    </main>
  )
}
