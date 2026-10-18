import { useEffect } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { TriangleAlertIcon } from "lucide-react"
import { EmptyState } from "@workspace/ui/components/empty-state"
import {
  Button,
  buttonVariants,
} from "@workspace/ui/components/shadcn-ui/button"

import { reportBrowserError } from "@/lib/telemetry.browser"

/**
 * A page that failed to load or render: the router's default error page.
 * Trying again re-runs the page's loaders, which also resets this boundary.
 * The technical message is shown in development only, never to visitors;
 * the error is reported, as the router caught it before the browser could
 * (spec 012, FR-001).
 */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  useEffect(() => reportBrowserError(error), [error])
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
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Go home
          </Link>
        </div>
      </EmptyState>
    </main>
  )
}
