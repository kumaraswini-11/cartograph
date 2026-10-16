import { Link } from "@tanstack/react-router"
import { MapPinOffIcon } from "lucide-react"
import { EmptyState } from "@workspace/ui/components/empty-state"
import { buttonVariants } from "@workspace/ui/components/shadcn-ui/button"

/** Any address no route matches: the router's default not-found page. */
export function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <EmptyState
        icon={<MapPinOffIcon />}
        title={<h1>Page not found</h1>}
        description="There's nothing at this address. It may have moved, or the link may be wrong."
      >
        <Link to="/" className={buttonVariants()}>
          Go home
        </Link>
      </EmptyState>
    </main>
  )
}
