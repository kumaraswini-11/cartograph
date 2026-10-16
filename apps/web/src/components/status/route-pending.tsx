import { Spinner } from "@workspace/ui/components/shadcn-ui/spinner"

/**
 * Shown while a page's data takes longer than the router's pending delay:
 * the router's default pending page. It doesn't spin when the system asks
 * for reduced motion.
 */
export function RoutePending() {
  return (
    <main className="flex min-h-svh items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
      <Spinner className="motion-reduce:animate-none" />
      Loading...
    </main>
  )
}
