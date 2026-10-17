import { useState, useTransition } from "react"
import { useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { Spinner } from "@workspace/ui/components/shadcn-ui/spinner"

import { rerunAnalysis } from "@/lib/analyses.functions"

/**
 * Re-runs an analysis (spec 008, FR-003): a new run of the same analysis,
 * never a second analysis. While a run is under way the button is
 * disabled, and the server starts no second run either way (FR-004).
 * Afterwards the page asks storage again, so what it shows is storage's.
 */
export function RerunButton({
  analysisId,
  running,
}: {
  analysisId: string
  /** A run is under way and not stale. */
  running: boolean
}) {
  const router = useRouter()
  const rerun = useServerFn(rerunAnalysis)
  const [pending, startTransition] = useTransition()
  const [failed, setFailed] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={running || pending}
        onClick={() =>
          startTransition(async () => {
            setFailed(false)
            try {
              await rerun({ data: { analysisId } })
              await router.invalidate({ sync: true })
            } catch {
              setFailed(true)
            }
          })
        }
      >
        {pending && <Spinner />}
        Re-run
      </Button>
      <p role="status" className="text-sm text-destructive empty:hidden">
        {failed ? "The run didn't start. Try again." : ""}
      </p>
    </div>
  )
}
